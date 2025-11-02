"""
API Router cho AI Services
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, WebSocket, WebSocketDisconnect
from typing import List
import base64
import json
import time
from ai_services.models import (
    FaceRecognitionRequest,
    FaceRecognitionResponse,
    FaceEncodingResponse,
    ResponseModel
)
from ai_services.services import ai_service, ACTIVE_SERVICE
from core.database import get_db
from core.logger import setup_logger

logger = setup_logger("ai_api")
router = APIRouter()

# Global state cho continuous recognition
continuous_recognition_state = {
    "is_running": False,
    "last_recognition": {},
    "cooldown_period": 30,
    "active_connections": set(),
    "service_name": "Not Available",
    "accuracy": "0%"
}

def update_continuous_state():
    """Cập nhật continuous_recognition_state với thông tin từ AI service"""
    try:
        continuous_recognition_state["service_name"] = ai_service.service_name
        continuous_recognition_state["accuracy"] = ai_service.accuracy
    except Exception as e:
        logger.error(f"Error updating continuous state: {e}")

# Gọi ngay khi import
update_continuous_state()

@router.get("/recognition/status")
async def get_recognition_status():
    """Lấy trạng thái continuous recognition"""
    try:
        import time
        current_time = time.time()
        active_cooldowns = {}
        
        for student_id, last_time in continuous_recognition_state["last_recognition"].items():
            remaining = continuous_recognition_state["cooldown_period"] - (current_time - last_time)
            if remaining > 0:
                active_cooldowns[student_id] = round(remaining)
        
        # Xác định service status - luôn trả về "active" như backend cũ
        service_status = "active"
        
        return {
            "success": True,
            "message": "Recognition status retrieved",
            "data": {
                "is_running": continuous_recognition_state["is_running"],
                "active_connections": len(continuous_recognition_state["active_connections"]),
                "cooldown_period": continuous_recognition_state["cooldown_period"],
                "active_cooldowns": active_cooldowns,
                "total_recognized_today": len(continuous_recognition_state["last_recognition"]),
                "service_name": continuous_recognition_state["service_name"],
                "accuracy": continuous_recognition_state["accuracy"],
                "service_status": service_status,  # Thêm field này cho frontend
                "is_available": ai_service.is_available
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting recognition status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/recognition/settings")
async def update_recognition_settings(settings: dict):
    """Cập nhật settings cho continuous recognition"""
    try:
        cooldown_period = settings.get("cooldown_period", 30)
        
        if cooldown_period < 5 or cooldown_period > 300:
            raise HTTPException(status_code=400, detail="Cooldown period must be between 5-300 seconds")
        
        continuous_recognition_state["cooldown_period"] = cooldown_period
        
        logger.info(f"Updated cooldown period to {cooldown_period} seconds")
        
        return {
            "success": True,
            "message": f"Đã cập nhật thời gian chờ thành {cooldown_period} giây",
            "data": {"cooldown_period": cooldown_period}
        }
        
    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/recognition/control")
async def control_recognition(control: dict):
    """Bật/tắt continuous recognition"""
    try:
        action = control.get("action", "stop")
        
        if action == "start":
            continuous_recognition_state["is_running"] = True
            message = "Đã bật chế độ nhận dạng liên tục"
        else:
            continuous_recognition_state["is_running"] = False
            message = "Đã tắt chế độ nhận dạng liên tục"
        
        return {
            "success": True,
            "message": message,
            "data": {"is_running": continuous_recognition_state["is_running"]}
        }
        
    except Exception as e:
        logger.error(f"Error controlling recognition: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_ai_status(db=Depends(get_db)):
    """Lấy trạng thái AI service"""
    try:
        # Thống kê database - Only check InsightFace encoding
        db_response = db.table("students").select("id, full_name, insightface_encoding").not_.is_("insightface_encoding", "null").execute()
        database_count = len(db_response.data) if db_response.data else 0
        local_count = len(ai_service.face_database) if ai_service.is_available else 0
        
        # Kiểm tra sync status
        sync_status = "synced" if local_count == database_count else "out_of_sync"
        if database_count > 0 and local_count == 0:
            sync_status = "database_only"
        elif local_count > 0 and database_count == 0:
            sync_status = "local_only"
        
        # Xác định service status
        service_status = "active" if ai_service.is_available else "disconnected"
        
        return {
            "success": True,
            "message": f"AI Service: {local_count} local, {database_count} database ({sync_status})",
            "data": {
                "is_available": ai_service.is_available,
                "service_name": ai_service.service_name,
                "accuracy": ai_service.accuracy,
                "service_status": service_status,  # Thêm field này cho frontend
                "local_ai_encodings": local_count,
                "database_encodings": database_count,
                "sync_status": sync_status,
                "registered_students": list(ai_service.face_database.keys()) if local_count > 0 else []
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting AI status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.websocket("/recognition/stream")
async def continuous_recognition_stream(websocket: WebSocket):
    """WebSocket endpoint cho continuous face recognition"""
    await websocket.accept()
    continuous_recognition_state["active_connections"].add(websocket)
    
    try:
        logger.info(f"Client connected to {ai_service.service_name} recognition stream")
        
        while True:
            try:
                # Nhận frame từ client
                data = await websocket.receive_text()
                frame_data = json.loads(data)
                
                if frame_data.get("type") == "frame":
                    image_base64 = frame_data.get("image")
                    camera_id = frame_data.get("camera_id")  # Lấy camera_id từ frontend
                    
                    if continuous_recognition_state["is_running"] and image_base64:
                        # Process recognition với active service
                        result = await process_continuous_recognition(image_base64, websocket)
                        
                        # Thêm camera_id vào result
                        result["camera_id"] = camera_id
                        
                        # Send result back
                        await websocket.send_text(json.dumps({
                            "type": "recognition_result",
                            "data": result,
                            "service": ai_service.service_name,
                            "accuracy": ai_service.accuracy,
                            "camera_id": camera_id  # Trả về camera_id để frontend biết
                        }))
                
                elif frame_data.get("type") == "control":
                    # Handle control commands
                    command = frame_data.get("command")
                    if command == "start":
                        continuous_recognition_state["is_running"] = True
                        await websocket.send_text(json.dumps({
                            "type": "status",
                            "message": f"Recognition started with {ai_service.service_name}",
                            "is_running": True,
                            "service": ai_service.service_name,
                            "accuracy": ai_service.accuracy
                        }))
                    elif command == "stop":
                        continuous_recognition_state["is_running"] = False
                        await websocket.send_text(json.dumps({
                            "type": "status", 
                            "message": f"⏹️ {ai_service.service_name} recognition stopped",
                            "is_running": False,
                            "service": ai_service.service_name
                        }))
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": f"Error: {str(e)}"
                }))
                
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        continuous_recognition_state["active_connections"].discard(websocket)

@router.post("/recognize")
async def recognize_face_upload(
    file: UploadFile = File(...),
    confidence_threshold: float = 0.6,
    db=Depends(get_db)
):
    """Nhận dạng khuôn mặt từ ảnh upload"""
    try:
        contents = await file.read()
        image_base64 = base64.b64encode(contents).decode('utf-8')
        
        result = await ai_service.recognize_face(image_base64, db, confidence_threshold)
        
        logger.info(f"Recognition result: {result.get('message')}")
        
        if result.get('success') and result.get('faces'):
            faces = result['faces']
            best_face = max((face for face in faces if face.get('student_id') != 'unknown'), 
                            key=lambda f: f.get('confidence', 0), 
                            default=None)
            
            if best_face:
                student_id = best_face['student_id']
                try:
                    student_id_int = int(student_id)
                    student_response = db.table("students").select("*").eq("id", student_id_int).execute()
                    
                    if student_response.data:
                        student_data = student_response.data[0]
                        return FaceRecognitionResponse(
                            recognized=True,
                            student=student_data,
                            confidence=round(best_face['confidence'] * 100, 1),
                            message="Nhận diện thành công"
                        )
                except Exception as e:
                    logger.error(f"Error processing student {student_id}: {e}")
        
        return FaceRecognitionResponse(
            recognized=False,
            student=None,
            confidence=None,
            message=result.get("message", "Không tìm thấy khuôn mặt đã đăng ký")
        )
        
    except Exception as e:
        logger.error(f"Error in face recognition: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi nhận dạng: {e}")

@router.post("/recognize-base64")
async def recognize_face_base64(
    request: FaceRecognitionRequest,
    db=Depends(get_db)
):
    """Nhận dạng khuôn mặt từ base64 (cho mobile app)"""
    try:
        result = await ai_service.recognize_face(
            request.image_base64,
            db,
            request.confidence_threshold
        )
        
        if result.get('success') and result.get('faces'):
            faces = result['faces']
            best_face = max((face for face in faces if face.get('student_id') != 'unknown'), 
                            key=lambda f: f.get('confidence', 0), 
                            default=None)
            
            if best_face:
                student_id = best_face['student_id']
                try:
                    student_id_int = int(student_id)
                    student_response = db.table("students").select("*").eq("id", student_id_int).execute()
                    
                    if student_response.data:
                        student_data = student_response.data[0]
                        return FaceRecognitionResponse(
                            recognized=True,
                            student=student_data,
                            confidence=round(best_face['confidence'] * 100, 1),
                            message="Nhận diện thành công"
                        )
                except Exception as e:
                    logger.error(f"Error processing student {student_id}: {e}")
        
        return FaceRecognitionResponse(
            recognized=False,
            student=None,
            confidence=None,
            message=result.get("message", "Không tìm thấy khuôn mặt đã đăng ký")
        )
        
    except Exception as e:
        logger.error(f"Error in face recognition: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi nhận dạng: {e}")

@router.post("/register/{student_id}")
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
        
        result = await ai_service.register_student_face(student_id, image_base64)
        
        # Đồng bộ lên database
        if result.get('success'):
            await sync_face_encoding_to_db(student_id, result, db)
        
        return FaceEncodingResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering face for student {student_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi đăng ký khuôn mặt: {e}")

@router.post("/register-base64/{student_id}")
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
        
        result = await ai_service.register_student_face(student_id, request.image_base64)
        
        # Đồng bộ lên database
        if result.get('success'):
            await sync_face_encoding_to_db(student_id, result, db)
        
        return FaceEncodingResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering face for student {student_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi đăng ký khuôn mặt: {e}")

@router.post("/count-faces")
async def count_faces(request: FaceRecognitionRequest):
    """Đếm số khuôn mặt trong ảnh"""
    try:
        count = await ai_service.get_face_count(request.image_base64)
        
        return {
            "success": True,
            "message": f"Phát hiện {count} khuôn mặt",
            "data": {"face_count": count}
        }
        
    except Exception as e:
        logger.error(f"Error counting faces: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi đếm khuôn mặt: {e}")

@router.post("/reload-models")
async def reload_models(db=Depends(get_db)):
    """Reload AI models từ database (admin function)"""
    try:
        # Force reload từ database
        if ai_service.service:
            ai_service.service.face_database = {}
            if hasattr(ai_service.service, 'face_labels'):
                ai_service.service.face_labels = {}
            if hasattr(ai_service.service, 'face_metadata'):
                ai_service.service.face_metadata = {}
        
        await ai_service.load_known_faces(db)
        
        # Cập nhật continuous state sau khi reload
        update_continuous_state()
        
        face_count = len(ai_service.face_database)
        total_samples = sum(len(samples) if isinstance(samples, list) else 1 
                           for samples in ai_service.face_database.values())
        
        return {
            "success": True,
            "message": f"Đã reload {face_count} khuôn mặt từ database với {total_samples} mẫu dữ liệu",
            "data": {
                "face_count": face_count,
                "total_samples": total_samples,
                "loaded_from": "database"
            }
        }
        
    except Exception as e:
        logger.error(f"Error reloading models: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi reload models: {e}")

@router.delete("/student/{student_id}/encoding")
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
        
        # Xóa từ AI service
        ai_result = await ai_service.delete_student_face(student_id)
        
        # Xóa từ database
        db_response = db.table("students").update({
            "insightface_encoding": None,
            "face_samples_count": 0,
            "updated_at": "now()"
        }).eq("id", student_id).execute()
        
        if db_response.data:
            logger.info(f"Face encoding deleted for student {student_id}")
            
            return {
                "success": True,
                "message": "Xóa face encoding thành công"
            }
        else:
            raise HTTPException(status_code=500, detail="Lỗi xóa face encoding từ database")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting encoding for student {student_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi xóa encoding: {e}")

@router.post("/register-multiple/{student_id}")
async def register_multiple_student_faces(
    student_id: int,
    files: List[UploadFile] = File(...),
    db=Depends(get_db)
):
    """Đăng ký nhiều khuôn mặt cho học sinh (multiple angles/expressions)"""
    try:
        # Kiểm tra student tồn tại
        student_response = db.table("students").select("*").eq("id", student_id).execute()
        
        if not student_response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
        
        if len(files) > 10:
            raise HTTPException(status_code=400, detail="Tối đa 10 ảnh mỗi lần")
        
        results = []
        successful_registrations = 0
        
        for i, file in enumerate(files):
            try:
                # Đọc file và convert sang base64
                contents = await file.read()
                image_base64 = base64.b64encode(contents).decode('utf-8')
                
                result = await ai_service.register_student_face(student_id, image_base64)
                
                if result.get('success'):
                    successful_registrations += 1
                    results.append({
                        "image_index": i + 1,
                        "success": True,
                        "detection_score": result.get('detection_score', 0),
                        "message": f"Ảnh {i+1}: Thành công"
                    })
                else:
                    results.append({
                        "image_index": i + 1,
                        "success": False,
                        "message": f"Ảnh {i+1}: {result.get('message', 'Lỗi không xác định')}"
                    })
                    
            except Exception as e:
                results.append({
                    "image_index": i + 1,
                    "success": False,
                    "message": f"Ảnh {i+1}: Lỗi xử lý - {str(e)}"
                })
        
        # Đồng bộ lên database một lần cuối
        if successful_registrations > 0:
            sync_result = {"success": True}
            await sync_face_encoding_to_db(student_id, sync_result, db)
        
        return {
            "success": successful_registrations > 0,
            "message": f"Đăng ký thành công {successful_registrations}/{len(files)} ảnh",
            "data": {
                "total_images": len(files),
                "successful_registrations": successful_registrations,
                "results": results,
                "current_samples": len(ai_service.face_database.get(str(student_id), []))
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering multiple faces for student {student_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi đăng ký nhiều khuôn mặt: {e}")

@router.get("/debug-info")
async def get_debug_info():
    """Debug endpoint để kiểm tra thông tin face database"""
    try:
        info = {
            "service_name": ai_service.service_name,
            "accuracy": ai_service.accuracy,
            "is_available": ai_service.is_available,
            "face_database_count": len(ai_service.face_database),
            "students_in_database": list(ai_service.face_database.keys()),
            "is_trained": len(ai_service.face_database) > 0
        }
        
        # Add service-specific info
        if ai_service.service and hasattr(ai_service.service, 'similarity_threshold'):
            info["similarity_threshold"] = ai_service.service.similarity_threshold
        if ai_service.service and hasattr(ai_service.service, 'det_size'):
            info["detection_size"] = ai_service.service.det_size
        
        return {"success": True, "data": info}
    except Exception as e:
        logger.error(f"Error getting debug info: {e}")
        return {"success": False, "message": str(e)}

async def sync_face_encoding_to_db(student_id: int, result: dict, db):
    """Helper function để đồng bộ face encoding lên database"""
    if not result.get('success') or not ACTIVE_SERVICE:
        return
        
    logger.info(f"Syncing face encoding for student {student_id}")
    try:
        student_id_str = str(student_id)
        face_features = ACTIVE_SERVICE.face_database.get(student_id_str)
        
        face_data = {}
        if face_features and isinstance(face_features, list):
            # InsightFace embeddings are numpy arrays
            embeddings = [emb.tolist() for emb in face_features]
            face_data = {
                "student_id": student_id,
                "service": "InsightFace",
                "embeddings": embeddings,
                "embedding_size": 512,
                "sample_count": len(face_features),
                "registered_at": "now()"
            }
            
            logger.info(f"Prepared insightface_encoding with {len(face_features)} samples")
        else:
            logger.warning(f"No face features found for student {student_id}")
            face_data = {"student_id": student_id, "service": "InsightFace", "registered_at": "now()"}

        # Update database
        import json
        db_response = db.table("students").update({
            "insightface_encoding": json.dumps(face_data),
            "face_samples_count": len(face_features) if face_features else 0,
            "updated_at": "now()"
        }).eq("id", student_id).execute()
        
        if db_response.data:
            logger.info(f"Successfully synced face encoding for student {student_id}")
        else:
            logger.warning(f"DB update returned no data for student {student_id}")
            
    except Exception as sync_error:
        logger.error(f"Error syncing face encoding: {sync_error}")
        import traceback
        logger.error(traceback.format_exc())

async def process_continuous_recognition(image_base64: str, websocket: WebSocket):
    """Xử lý continuous recognition với Ultra-High Accuracy InsightFace"""
    try:
        if not ai_service.service:
            return {"success": False, "message": "No AI service available"}
        
        from core.database import get_db
        db = get_db()
        
        # Ultra-High Accuracy thresholds cho InsightFace
        if ai_service.service_name == "InsightFace (ArcFace)":
            threshold = 0.20  # Giảm từ 0.25 xuống 0.20 cho flexible hơn
            min_confidence = 0.20  # Matching với similarity_threshold mới
        else:
            threshold = 0.65  # MediaPipe fallback
            min_confidence = 0.75
        
        result = await ai_service.recognize_face(image_base64, db, threshold)
        
        if result.get("success") and result.get("faces"):
            current_time = time.time()
            recognized_students = []
            
            logger.info(f"🔍 {ai_service.service_name} Ultra-High Accuracy result: {len(result['faces'])} faces detected")
            
            # Chỉ xử lý nếu detect đúng 1 face để tránh confusion
            if len(result["faces"]) != 1:
                logger.warning(f"⚠️ Detected {len(result['faces'])} faces, skipping to avoid confusion")
                return {
                    "success": True,
                    "recognized_students": [],
                    "total_faces": len(result["faces"]),
                    "timestamp": current_time,
                    "message": f"Detected {len(result['faces'])} faces - requires exactly 1 face for ultra-high accuracy",
                    "service": ai_service.service_name,
                    "accuracy_mode": "ULTRA-HIGH"
                }
            
            for i, face in enumerate(result["faces"]):
                student_id = face.get("student_id")
                confidence = face.get("confidence", 0)
                
                logger.info(f"   Face {i+1}: student_id={student_id}, confidence={confidence:.3f} (threshold: {min_confidence})")
                
                if student_id != "unknown" and confidence > min_confidence:
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
                                attendance_result = await create_auto_attendance(student_data, db, confidence)
                                
                                # Determine accuracy level based on confidence - Adjusted for realistic InsightFace scores
                                if confidence >= 0.45:
                                    accuracy_level = "EXCELLENT (95%+)"
                                elif confidence >= 0.35:
                                    accuracy_level = "VERY HIGH (90%+)"
                                elif confidence >= 0.25:
                                    accuracy_level = "HIGH (85%+)"
                                elif confidence >= 0.20:
                                    accuracy_level = "GOOD (80%+)"
                                else:
                                    accuracy_level = "ACCEPTABLE (75%+)"
                                
                                recognized_students.append({
                                    "student": student_data,
                                    "confidence": round(confidence * 100, 1),
                                    "attendance": attendance_result,
                                    "cooldown_remaining": 0,
                                    "service": ai_service.service_name,
                                    "accuracy": accuracy_level,
                                    "accuracy_mode": "ULTRA-HIGH"
                                })
                                
                                logger.info(f"✅ Ultra-High Accuracy Recognition: {student_data.get('full_name', 'Unknown')} ({confidence:.3f})")
                            else:
                                logger.warning(f"⚠️ Student {student_id} not found in database")
                        except Exception as e:
                            logger.error(f"❌ Error getting student {student_id}: {e}")
                    else:
                        remaining_cooldown = continuous_recognition_state["cooldown_period"] - time_diff
                        logger.info(f"⏳ Student {student_id} in cooldown: {remaining_cooldown:.1f}s remaining")
        
        return {
            "success": True,
            "recognized_students": recognized_students,
            "total_faces": len(result.get("faces", [])),
            "timestamp": time.time(),
            "message": f"Processed {len(result.get('faces', []))} faces with {ai_service.service_name}",
            "service": ai_service.service_name,
            "accuracy_mode": "ULTRA-HIGH"
        }
        
    except Exception as e:
        logger.error(f"❌ Error in continuous recognition: {str(e)}")
        return {
            "success": False,
            "message": f"Recognition error: {str(e)}",
            "recognized_students": [],
            "total_faces": 0,
            "timestamp": time.time()
        }

async def create_auto_attendance(student_data: dict, db, confidence: float = 0.85):
    """Tạo attendance record tự động cho học sinh
    
    Note: Stored procedure process_attendance_checkin tự động đọc attendance_cutoff_time 
    từ system_settings để xác định status (Dung gio/Tre). Không cần pass cutoff_time 
    vào stored procedure.
    """
    try:
        student_id = student_data["id"]
        student_name = student_data["full_name"]
        
        # Sử dụng database function để xử lý attendance
        from datetime import datetime, timezone, timedelta
        
        # Get Vietnam timezone
        vietnam_tz = timezone(timedelta(hours=7))
        current_vietnam_time = datetime.now(vietnam_tz).isoformat()
        current_vietnam_date = datetime.now(vietnam_tz).date().isoformat()
        
        # Try to use database function if available
        # Stored procedure sẽ tự động đọc attendance_cutoff_time từ system_settings
        try:
            function_result = db.rpc('process_attendance_checkin', {
                'p_student_id': student_id,
                'p_date': current_vietnam_date,
                'p_checkin_time': current_vietnam_time,
                'p_confidence_score': confidence,
                'p_recognition_model': 'insightface',
                'p_device_info': {
                    'source': 'ai_auto_checkin',
                    'confidence': confidence,
                    'timestamp': current_vietnam_time
                }
            }).execute()
            
            if function_result.data and len(function_result.data) > 0:
                result = function_result.data[0]
                attendance_id = result.get('attendance_id')
                is_first_checkin = result.get('is_first_checkin')
                final_status = result.get('final_status')
                check_in_time = result.get('check_in_time')
                check_out_time = result.get('check_out_time')
                
                if is_first_checkin:
                    logger.info(f"✅ Created attendance record for {student_name} - Check-in: {check_in_time}")
                    return {
                        "type": "created",
                        "message": f"Điểm danh thành công cho {student_name} - {final_status}",
                        "data": {
                            "id": attendance_id,
                            "student_id": student_id,
                            "check_in_time": check_in_time,
                            "status": final_status,
                            "confidence_score": confidence
                        },
                        "is_first_checkin": True
                    }
                else:
                    logger.info(f"✅ Updated check-out time for {student_name} - Check-out: {check_out_time}")
                    return {
                        "type": "updated",
                        "message": f"Cập nhật giờ ra cho {student_name}",
                        "data": {
                            "id": attendance_id,
                            "student_id": student_id,
                            "check_in_time": check_in_time,
                            "check_out_time": check_out_time,
                            "status": final_status,
                            "confidence_score": confidence
                        },
                        "is_first_checkin": False
                    }
        except Exception as rpc_error:
            logger.warning(f"Database function not available, using manual insert: {rpc_error}")
            
            # Fallback: Manual insert
            attendance_data = {
                "student_id": student_id,
                "date": current_vietnam_date,
                "status": "present",
                "check_in_time": current_vietnam_time,
                "confidence_score": confidence,
                "method": "auto",
                "created_at": current_vietnam_time,
                "updated_at": current_vietnam_time
            }
            
            response = db.table("attendance").insert(attendance_data).execute()
            
            if response.data:
                attendance_id = response.data[0]["id"]
                logger.info(f"✅ Created manual attendance record for {student_name}")
                return {
                    "type": "created",
                    "message": f"Điểm danh thành công cho {student_name}",
                    "data": {
                        "id": attendance_id,
                        "student_id": student_id,
                        "check_in_time": current_vietnam_time,
                        "status": "present",
                        "confidence_score": confidence
                    },
                    "is_first_checkin": True
                }
        
        return {
            "type": "error",
            "message": f"Không thể tạo điểm danh cho {student_name}",
            "data": None,
            "is_first_checkin": False
        }
        
    except Exception as e:
        logger.error(f"❌ Error creating auto attendance: {str(e)}")
        return {
            "type": "error",
            "message": f"Lỗi tạo điểm danh: {str(e)}",
            "data": None,
            "is_first_checkin": False
        }
