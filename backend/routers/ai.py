"""
API Router cho AI Computer Vision
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
import base64
import os
import shutil
import asyncio
import time
from typing import Dict, Set
import json

from models.schemas import (
    FaceRecognitionRequest, FaceRecognitionResponse, 
    FaceEncodingResponse, ResponseModel
)
from database.connection import get_db
from ai.face_recognition_service import face_recognition_service
from utils.logger import setup_logger

logger = setup_logger()
router = APIRouter()

# Global state cho continuous recognition
continuous_recognition_state = {
    "is_running": False,
    "last_recognition": {},  # {student_id: timestamp}
    "cooldown_period": 10,   # Tăng từ 30s lên 60s để tránh spam
    "active_connections": set()
}

async def sync_face_encoding_to_db(student_id: int, result: dict, db):
    """Helper function để đồng bộ face encoding lên database với logging chi tiết"""
    if not result.get('success'):
        return
        
    logger.info(f"[DB Sync] Preparing to sync face data for student {student_id}")
    try:
        student_id_str = str(student_id)
        face_features = face_recognition_service.face_database.get(student_id_str)
        
        face_data = {}
        if face_features and isinstance(face_features, list):
            all_features = [sample.flatten().tolist() for sample in face_features]
            shapes = [list(sample.shape) for sample in face_features]
            
            face_data = {
                "student_id": student_id,
                "encoding_id": result.get('encoding_id'),
                "face_features": all_features,
                "features_shapes": shapes,
                "sample_count": len(face_features),
                "registered_at": "now()"
            }
            logger.info(f"[DB Sync] Prepared face_data with {len(face_features)} samples.")
        else:
            logger.warning(f"[DB Sync] No face features found in service for student {student_id}, syncing metadata only.")
            face_data = { "student_id": student_id, "encoding_id": "metadata_only", "registered_at": "now()" }

        
        logger.info(f"[DB Sync] Executing update for student {student_id}...")
        db_response = db.table("students").update({
            "face_encoding": face_data,
            "updated_at": "now()"
        }).eq("id", student_id).execute()
        
        if db_response.data:
            logger.info(f"[DB Sync] Successfully synced data for student {student_id}.")
        else:
            logger.warning(f"[DB Sync] DB update for student {student_id} returned no data. Response: {db_response}")
            
    except Exception as sync_error:
        logger.error(f"[DB Sync] Error syncing to database for student {student_id}: {sync_error}")
        import traceback
        logger.error(traceback.format_exc())

@router.websocket("/recognition/stream")
async def continuous_recognition_stream(websocket: WebSocket):
    """WebSocket endpoint cho continuous face recognition"""
    await websocket.accept()
    continuous_recognition_state["active_connections"].add(websocket)
    
    try:
        logger.info("🔗 Client connected to continuous recognition stream")
        
        while True:
            try:
                # Nhận frame từ client
                data = await websocket.receive_text()
                frame_data = json.loads(data)
                
                if frame_data.get("type") == "frame":
                    image_base64 = frame_data.get("image")
                    
                    if continuous_recognition_state["is_running"] and image_base64:
                        # Process recognition
                        result = await process_continuous_recognition(image_base64, websocket)
                        
                        # Send result back
                        await websocket.send_text(json.dumps({
                            "type": "recognition_result",
                            "data": result
                        }))
                
                elif frame_data.get("type") == "control":
                    # Handle control commands
                    command = frame_data.get("command")
                    if command == "start":
                        continuous_recognition_state["is_running"] = True
                        await websocket.send_text(json.dumps({
                            "type": "status",
                            "message": "🎥 Continuous recognition started",
                            "is_running": True
                        }))
                    elif command == "stop":
                        continuous_recognition_state["is_running"] = False
                        await websocket.send_text(json.dumps({
                            "type": "status", 
                            "message": "⏹️ Continuous recognition stopped",
                            "is_running": False
                        }))
                        
            except asyncio.TimeoutError:
                continue
                
    except WebSocketDisconnect:
        logger.info("🔌 Client disconnected from continuous recognition stream")
    except Exception as e:
        logger.error(f"❌ Error in continuous recognition stream: {e}")
    finally:
        continuous_recognition_state["active_connections"].discard(websocket)

async def process_continuous_recognition(image_base64: str, websocket: WebSocket):
    """Xử lý continuous recognition với cooldown logic"""
    try:
        # Fix import error - sử dụng get_db thay vì get_db_instance
        from database.connection import get_db
        db = get_db()
        
        # Perform recognition với threshold cao hơn cho continuous mode
        result = await face_recognition_service.recognize_face(image_base64, db, 0.75)  # Tăng từ 0.65 lên 0.75
        
        if result.get("success") and result.get("faces"):
            current_time = time.time()
            recognized_students = []
            
            logger.info(f"🔍 Recognition result: {len(result['faces'])} faces detected")
            
            # Chỉ xử lý nếu detect đúng 1 face để tránh confusion
            if len(result["faces"]) != 1:
                logger.warning(f"⚠️ Detected {len(result['faces'])} faces, skipping to avoid confusion")
                return {
                    "success": True,
                    "recognized_students": [],
                    "total_faces": len(result["faces"]),
                    "timestamp": current_time,
                    "message": f"Detected {len(result['faces'])} faces - requires exactly 1 face"
                }
            
            for i, face in enumerate(result["faces"]):
                student_id = face.get("student_id")
                confidence = face.get("confidence", 0)
                
                logger.info(f"   Face {i+1}: student_id={student_id}, confidence={confidence:.3f}")
                
                # Chỉ accept confidence > 75% để tránh false positives
                if student_id != "unknown" and confidence > 0.75:
                    # Check cooldown
                    last_time = continuous_recognition_state["last_recognition"].get(student_id, 0)
                    time_diff = current_time - last_time
                    
                    if time_diff >= continuous_recognition_state["cooldown_period"]:
                        # Update last recognition time
                        continuous_recognition_state["last_recognition"][student_id] = current_time
                        
                        # Get student info from database
                        try:
                            student_response = db.table("students").select("*").eq("id", int(student_id)).execute()
                            if student_response.data:
                                student_data = student_response.data[0]
                                
                                # Auto-create attendance record
                                attendance_result = await create_auto_attendance(student_data, db)
                                
                                recognized_students.append({
                                    "student": student_data,
                                    "confidence": round(confidence * 100, 1),
                                    "attendance": attendance_result,
                                    "cooldown_remaining": 0
                                })
                                
                                logger.info(f"✅ Auto-recognized: {student_data.get('full_name')} ({confidence*100:.1f}%)")
                        except Exception as e:
                            logger.error(f"❌ Error processing student {student_id}: {e}")
                    else:
                        # Still in cooldown
                        remaining = continuous_recognition_state["cooldown_period"] - time_diff
                        logger.info(f"⏱️ Student {student_id} in cooldown: {remaining:.0f}s remaining")
                else:
                    logger.info(f"❌ Rejected: student_id={student_id}, confidence={confidence:.3f} < 0.75")
            
            return {
                "success": True,
                "recognized_students": recognized_students,
                "total_faces": len(result["faces"]),
                "timestamp": current_time
            }
        
        return {
            "success": True,
            "recognized_students": [],
            "total_faces": len(result.get("faces", [])),
            "timestamp": time.time()
        }
        
    except Exception as e:
        logger.error(f"❌ Error in continuous recognition: {e}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": time.time()
        }

async def create_auto_attendance(student_data: dict, db):
    """Tự động tạo attendance record"""
    try:
        from datetime import datetime, date
        
        today = date.today().isoformat()
        now = datetime.now().isoformat()
        
        # Check if attendance already exists today
        existing = db.table("attendance").select("*").eq("student_id", student_data["id"]).eq("date", today).execute()
        
        if existing.data:
            # Update existing attendance
            attendance_id = existing.data[0]["id"]
            update_data = {
                "status": "present",
                "check_in_time": now,
                "updated_at": now,
                "recognition_confidence": 85.0  # Default confidence for auto-recognition
            }
            
            response = db.table("attendance").update(update_data).eq("id", attendance_id).execute()
            
            return {
                "type": "updated",
                "message": f"Cập nhật điểm danh cho {student_data['full_name']}",
                "data": response.data[0] if response.data else None
            }
        else:
            # Create new attendance
            attendance_data = {
                "student_id": student_data["id"],
                "date": today,
                "status": "present",
                "check_in_time": now,
                "recognition_confidence": 85.0,
                "created_at": now,
                "updated_at": now
            }
            
            response = db.table("attendance").insert(attendance_data).execute()
            
            return {
                "type": "created",
                "message": f"Điểm danh thành công cho {student_data['full_name']}",
                "data": response.data[0] if response.data else None
            }
            
    except Exception as e:
        logger.error(f"❌ Error creating auto-attendance: {e}")
        return {
            "type": "error",
            "message": f"Lỗi tạo điểm danh: {str(e)}"
        }

@router.post("/recognition/control", response_model=ResponseModel)
async def control_continuous_recognition(action: str):
    """Control continuous recognition (start/stop)"""
    try:
        if action == "start":
            continuous_recognition_state["is_running"] = True
            continuous_recognition_state["last_recognition"] = {}  # Reset cooldowns
            message = "🎥 Continuous recognition started"
        elif action == "stop":
            continuous_recognition_state["is_running"] = False
            message = "⏹️ Continuous recognition stopped"
        elif action == "reset":
            continuous_recognition_state["last_recognition"] = {}  # Reset cooldowns
            message = "🔄 Recognition cooldowns reset"
        else:
            raise HTTPException(status_code=400, detail="Invalid action. Use: start, stop, reset")
        
        # Notify all connected clients
        for websocket in continuous_recognition_state["active_connections"]:
            try:
                await websocket.send_text(json.dumps({
                    "type": "control_update",
                    "is_running": continuous_recognition_state["is_running"],
                    "message": message
                }))
            except:
                pass  # Ignore disconnected clients
        
        return ResponseModel(
            success=True,
            message=message,
            data={
                "is_running": continuous_recognition_state["is_running"],
                "active_connections": len(continuous_recognition_state["active_connections"]),
                "cooldown_period": continuous_recognition_state["cooldown_period"]
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Error controlling recognition: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recognition/status", response_model=ResponseModel)
async def get_recognition_status():
    """Lấy trạng thái continuous recognition"""
    try:
        current_time = time.time()
        active_cooldowns = {}
        
        for student_id, last_time in continuous_recognition_state["last_recognition"].items():
            remaining = continuous_recognition_state["cooldown_period"] - (current_time - last_time)
            if remaining > 0:
                active_cooldowns[student_id] = round(remaining)
        
        return ResponseModel(
            success=True,
            message="Recognition status retrieved",
            data={
                "is_running": continuous_recognition_state["is_running"],
                "active_connections": len(continuous_recognition_state["active_connections"]),
                "cooldown_period": continuous_recognition_state["cooldown_period"],
                "active_cooldowns": active_cooldowns,
                "total_recognized_today": len(continuous_recognition_state["last_recognition"])
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Error getting recognition status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/recognition/settings", response_model=ResponseModel)
async def update_recognition_settings(settings: dict):
    """Cập nhật settings cho continuous recognition"""
    try:
        cooldown_period = settings.get("cooldown_period", 30)
        
        if cooldown_period < 5 or cooldown_period > 300:
            raise HTTPException(status_code=400, detail="Cooldown period must be between 5-300 seconds")
        
        continuous_recognition_state["cooldown_period"] = cooldown_period
        
        logger.info(f"🔧 Updated cooldown period to {cooldown_period} seconds")
        
        return ResponseModel(
            success=True,
            message=f"Đã cập nhật thời gian chờ thành {cooldown_period} giây",
            data={
                "cooldown_period": cooldown_period
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Error updating settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/recognize", response_model=FaceRecognitionResponse)
async def recognize_face_upload(
    file: UploadFile = File(...),
    confidence_threshold: float = 0.6,  # Nâng lên 0.6 cho deep learning model
    db=Depends(get_db)
):
    """Nhận dạng khuôn mặt từ ảnh upload"""
    try:
        contents = await file.read()
        image_base64 = base64.b64encode(contents).decode('utf-8')
        
        result = await face_recognition_service.recognize_face(image_base64, db, confidence_threshold)
        
        logger.info(f"[AI Result] {result.get('message')}")
        if result.get('success') and result.get('faces'):
            faces = result['faces']
            logger.info(f"[AI Result] Found {len(faces)} faces: {faces}")
            
            best_face = max((face for face in faces if face.get('student_id') != 'unknown'), 
                            key=lambda f: f.get('confidence', 0), 
                            default=None)

            logger.info(f"[AI Result] Final best face: {best_face}")
            
            if best_face:
                student_id = best_face['student_id']
                try:
                    student_id_int = int(student_id)
                    student_response = db.table("students").select("*").eq("id", student_id_int).execute()
                    
                    if student_response.data:
                        student_data = student_response.data[0]
                        logger.info(f"[DB Query] Found student: {student_data.get('full_name')}")
                        return FaceRecognitionResponse(
                            recognized=True,
                            student=student_data,
                            confidence=round(best_face['confidence'] * 100, 1),
                            message="Nhận diện thành công"
                        )
                except Exception as e:
                    logger.error(f"[DB Query] Error processing student {student_id}: {e}")
        
        logger.warning(f"[AI Result] Recognition failed, returning negative response.")
        return FaceRecognitionResponse(
            recognized=False,
            student=None,
            confidence=None,
            message=result.get("message", "Không tìm thấy khuôn mặt đã đăng ký trong hệ thống")
        )
        
    except Exception as e:
        logger.error(f"[AI] Error in face recognition endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi nhận dạng: {e}")

@router.get("/debug-info")
async def get_debug_info():
    """Debug endpoint để kiểm tra thông tin face database"""
    try:
        info = {
            "face_database_count": len(face_recognition_service.face_database),
            "students_in_database": list(face_recognition_service.face_database.keys()),
            "face_labels": face_recognition_service.face_labels,
            "tolerance": face_recognition_service.tolerance,
            "lbph_threshold": face_recognition_service.lbph_threshold,
            "is_trained": len(face_recognition_service.face_database) > 0
        }
        return {"success": True, "data": info}
    except Exception as e:
        logger.error(f"[Debug] Error getting debug info: {e}")
        return {"success": False, "message": str(e)}

@router.post("/recognize-base64", response_model=FaceRecognitionResponse)
async def recognize_face_base64(
    request: FaceRecognitionRequest,
    db=Depends(get_db)
):
    """Nhận dạng khuôn mặt từ base64 (cho mobile app)"""
    try:
        result = await face_recognition_service.recognize_face(
            request.image_base64,
            db, # Pass DB connection
            request.confidence_threshold
        )
        
        return FaceRecognitionResponse(**result)
        
    except Exception as e:
        logger.error(f"❌ Error in face recognition: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi nhận dạng: {str(e)}")

@router.post("/register/{student_id}", response_model=FaceEncodingResponse)
async def register_student_face_upload(
    student_id: int,
    file: UploadFile = File(...),
    db=Depends(get_db)
):
    """Đăng ký khuôn mặt cho học sinh (file upload)"""
    try:
        # Kiểm tra student tồn tại
        student_response = db.table("students").select("*").eq("id", student_id).execute()
        
        if not student_response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
        
        # Đọc file và convert sang base64
        contents = await file.read()
        image_base64 = base64.b64encode(contents).decode('utf-8')
        
        result = await face_recognition_service.register_student_face(
            student_id,
            image_base64
        )
        
        # Đồng bộ lên Supabase với face features
        await sync_face_encoding_to_db(student_id, result, db)
        
        return FaceEncodingResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error registering face for student {student_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi đăng ký khuôn mặt: {str(e)}")

@router.post("/register-base64/{student_id}", response_model=FaceEncodingResponse)
async def register_student_face_base64(
    student_id: int,
    request: FaceRecognitionRequest,
    db=Depends(get_db)
):
    """Đăng ký khuôn mặt cho học sinh (base64)"""
    try:
        # Kiểm tra student tồn tại
        student_response = db.table("students").select("*").eq("id", student_id).execute()
        
        if not student_response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
        
        result = await face_recognition_service.register_student_face(
            student_id,
            request.image_base64
        )
        
        # Đồng bộ lên Supabase với face features
        await sync_face_encoding_to_db(student_id, result, db)
        
        return FaceEncodingResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error registering face for student {student_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi đăng ký khuôn mặt: {str(e)}")

@router.post("/count-faces", response_model=ResponseModel)
async def count_faces(
    request: FaceRecognitionRequest
):
    """Đếm số khuôn mặt trong ảnh"""
    try:
        count = await face_recognition_service.get_face_count(request.image_base64)
        
        return ResponseModel(
            success=True,
            message=f"Phát hiện {count} khuôn mặt",
            data={"face_count": count}
        )
        
    except Exception as e:
        logger.error(f"❌ Error counting faces: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi đếm khuôn mặt: {str(e)}")

@router.post("/reload-models", response_model=ResponseModel)
async def reload_models(db=Depends(get_db)):
    """Reload AI models từ database và xóa cache local (admin function)"""
    try:
        # Xóa local files để force reload từ database
        model_path = "./ai_models"
        
        if os.path.exists(model_path):
            try:
                shutil.rmtree(model_path)
                logger.info("🗑️ Deleted old local model files")
            except Exception as delete_error:
                logger.warning(f"⚠️ Could not delete old files: {delete_error}")
        
        # Recreate directory
        os.makedirs(model_path, exist_ok=True)
        
        # Force reload từ database (không fallback về file)
        face_recognition_service.face_database = {}
        face_recognition_service.face_labels = {}
        
        await face_recognition_service.load_known_faces(db)
        
        face_count = len(face_recognition_service.face_database)
        total_samples = sum(len(samples) if isinstance(samples, list) else 1 
                           for samples in face_recognition_service.face_database.values())
        
        return ResponseModel(
            success=True,
            message=f"Đã reload {face_count} khuôn mặt từ database với {total_samples} mẫu dữ liệu",
            data={
                "face_count": face_count,
                "total_samples": total_samples,
                "loaded_from": "database"
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Error reloading models: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi reload models: {str(e)}")

@router.get("/status", response_model=ResponseModel)
async def get_ai_status(db=Depends(get_db)):
    """Kiểm tra trạng thái AI service"""
    try:
        # Thống kê AI service
        local_count = len(face_recognition_service.face_database)
        
        # Thống kê database  
        db_response = db.table("students").select("id, full_name, face_encoding").not_.is_("face_encoding", "null").execute()
        database_count = len(db_response.data) if db_response.data else 0
        
        # Chi tiết
        details = {
            "service_status": "active",
            "local_ai_encodings": local_count,
            "database_encodings": database_count,
            "tolerance": face_recognition_service.tolerance,
            "min_face_size": face_recognition_service.min_face_size,
            "model_path": face_recognition_service.model_path,
            "face_cascade_loaded": face_recognition_service.face_cascade is not None,
            "registered_students": list(face_recognition_service.face_database.keys()) if local_count > 0 else []
        }
        
        # Kiểm tra đồng bộ
        sync_status = "synced" if local_count == database_count else "out_of_sync"
        if database_count > 0 and local_count == 0:
            sync_status = "database_only"
        elif local_count > 0 and database_count == 0:
            sync_status = "local_only"
            
        details["sync_status"] = sync_status
        
        return ResponseModel(
            success=True,
            message=f"AI Service: {local_count} local, {database_count} database ({sync_status})",
            data=details
        )
        
    except Exception as e:
        logger.error(f"❌ Error getting AI status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi kiểm tra trạng thái: {str(e)}")

@router.delete("/student/{student_id}/encoding", response_model=ResponseModel)
async def delete_student_encoding(
    student_id: int,
    db=Depends(get_db)
):
    """Xóa face encoding của học sinh"""
    try:
        # Kiểm tra student tồn tại
        student_response = db.table("students").select("*").eq("id", student_id).execute()
        
        if not student_response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
        
        # Xóa từ AI service trước
        ai_result = await face_recognition_service.delete_student_face(student_id)
        
        # Xóa face encoding từ database
        db_response = db.table("students").update({
            "face_encoding": None,
            "updated_at": "now()"
        }).eq("id", student_id).execute()
        
        if db_response.data:
            logger.info(f"✅ Face encoding deleted for student {student_id}")
            
            return ResponseModel(
                success=True,
                message="Xóa face encoding thành công"
            )
        else:
            raise HTTPException(status_code=500, detail="Lỗi xóa face encoding từ database")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting encoding for student {student_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi xóa encoding: {str(e)}") 