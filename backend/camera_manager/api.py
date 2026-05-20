"""
API Router cho Camera Manager
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from typing import List, Optional
import uuid
import cv2
import numpy as np
import io
import threading
import time

from camera_manager.services import camera_manager
from camera_manager.db_service import CameraDBService
from camera_manager.models import (
    CameraConfig,
    CameraInfo,
    CameraCreateRequest,
    CameraUpdateRequest,
    CameraResponse,
    CameraListResponse,
    CameraStatus
)
from core.logger import setup_logger
from core.database import get_db

logger = setup_logger("camera_api")
router = APIRouter()


@router.post("/", response_model=CameraResponse)
async def create_camera(request: CameraCreateRequest, db=Depends(get_db)):
    """Tạo camera mới"""
    try:
        # Tạo camera_id tự động
        camera_id = str(uuid.uuid4())
        
        config = CameraConfig(
            camera_id=camera_id,
            name=request.name,
            source=request.source,
            location=request.location,
            description=request.description,
            enabled=request.enabled,
            fps=request.fps,
            width=request.width,
            height=request.height,
            username=request.username,
            password=request.password,
            metadata=request.metadata
        )
        
        # Lưu vào database trước
        await CameraDBService.create_camera(db, config)
        
        # Thêm vào camera manager
        success = camera_manager.add_camera(config)
        
        if not success:
            # Rollback: xóa khỏi database nếu không thêm được vào manager
            await CameraDBService.delete_camera(db, camera_id)
            raise HTTPException(status_code=400, detail="Không thể tạo camera (có thể camera_id đã tồn tại)")
        
        camera_info = camera_manager.get_camera_info(camera_id)
        
        return CameraResponse(
            success=True,
            message=f"Đã tạo camera {request.name} thành công",
            data=camera_info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating camera: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi tạo camera: {str(e)}")


@router.get("/", response_model=CameraListResponse)
async def list_cameras(enabled_only: bool = Query(False), db=Depends(get_db)):
    """Lấy danh sách tất cả camera"""
    try:
        #logger.info(f"📹 LIST CAMERAS requested (enabled_only={enabled_only})")
        
        # Load từ database nếu chưa có trong manager
        db_cameras = await CameraDBService.get_all_cameras(db, enabled_only=enabled_only)
        #logger.info(f"   DB returned {len(db_cameras)} cameras (enabled_only={enabled_only})")
        #for db_cam in db_cameras:
            #logger.info(f"     - {db_cam['camera_id']}: enabled={db_cam.get('enabled')}, name={db_cam.get('name')}")
        
        # Sync cameras từ DB vào manager. Không auto-start trong list endpoint:
        # camera hỏng có thể block cv2 connect/read và làm freeze backend.
        for db_camera in db_cameras:
            camera_id = db_camera["camera_id"]
            existing_camera = camera_manager.get_camera(camera_id)
            config = CameraDBService.dict_to_config(db_camera)
            
            if existing_camera is None:
                logger.info(f"   Adding {camera_id} to manager from DB")
                # Load vào manager
                camera_manager.add_camera(config, frame_callback=None, auto_start=False)
            else:
                if existing_camera.config != config:
                    #logger.info(f"   Updating {camera_id} from DB")
                    camera_manager.update_camera(camera_id, config, auto_start=existing_camera.running)
        
        # Lấy từ manager (đã có status real-time + fresh enabled status)
        cameras = camera_manager.list_cameras()
        # logger.info(f"   Manager has {len(cameras)} cameras total")
        
        # Nếu enabled_only, filter
        if enabled_only:
            filtered = [c for c in cameras if c.enabled]
            logger.info(f"   After filtering enabled_only=True: {len(filtered)} cameras")
            cameras = filtered
        
        #logger.info(f"   📤 Returning {len(cameras)} cameras")
        
        return CameraListResponse(
            success=True,
            message=f"Lấy danh sách {len(cameras)} camera thành công",
            data=cameras,
            total=len(cameras)
        )
        
    except Exception as e:
        logger.error(f"Error listing cameras: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi lấy danh sách camera: {str(e)}")


@router.get("/{camera_id}", response_model=CameraResponse)
async def get_camera(camera_id: str):
    """Lấy thông tin camera"""
    try:
        camera_info = camera_manager.get_camera_info(camera_id)
        
        if not camera_info:
            raise HTTPException(status_code=404, detail="Không tìm thấy camera")
        
        return CameraResponse(
            success=True,
            message="Lấy thông tin camera thành công",
            data=camera_info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting camera {camera_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi lấy thông tin camera: {str(e)}")


@router.put("/{camera_id}", response_model=CameraResponse)
async def update_camera(camera_id: str, request: CameraUpdateRequest, db=Depends(get_db)):
    """Cập nhật camera"""
    try:
        logger.info(f"🔄 Updating camera {camera_id}")
        logger.info(f"   Request data: {request.dict()}")
        
        # Lấy config hiện tại từ database
        db_camera = await CameraDBService.get_camera(db, camera_id)
        if not db_camera:
            raise HTTPException(status_code=404, detail="Không tìm thấy camera trong database")
        
        logger.info(f"   Current DB state: enabled={db_camera.get('enabled')}")
        
        current_config = CameraDBService.dict_to_config(db_camera)
        
        # Merge với request
        updates = {}
        if request.name is not None:
            updates["name"] = request.name
        if request.source is not None:
            updates["source"] = request.source
        if request.location is not None:
            updates["location"] = request.location
        if request.description is not None:
            updates["description"] = request.description
        if request.enabled is not None:
            updates["enabled"] = request.enabled
            logger.info(f"   ✅ Updating enabled: {current_config.enabled} → {request.enabled}")
        if request.fps is not None:
            updates["fps"] = request.fps
        if request.width is not None:
            updates["width"] = request.width
        if request.height is not None:
            updates["height"] = request.height
        if request.username is not None:
            updates["username"] = request.username
        if request.password is not None:
            updates["password"] = request.password
        if request.metadata is not None:
            updates["metadata"] = request.metadata
        
        logger.info(f"   Updates to apply: {updates}")
        
        # Cập nhật database
        result = await CameraDBService.update_camera(db, camera_id, updates)
        logger.info(f"   ✅ DB updated. New enabled state from DB: {result.get('enabled') if result else 'None'}")
        
        # Cập nhật trong manager
        updated_config = CameraConfig(
            camera_id=camera_id,
            name=updates.get("name", current_config.name),
            source=updates.get("source", current_config.source),
            location=updates.get("location", current_config.location),
            description=updates.get("description", current_config.description),
            enabled=updates.get("enabled", current_config.enabled),
            fps=updates.get("fps", current_config.fps),
            width=updates.get("width", current_config.width),
            height=updates.get("height", current_config.height),
            username=updates.get("username", current_config.username),
            password=updates.get("password", current_config.password),
            metadata=updates.get("metadata", current_config.metadata)
        )
        
        success = camera_manager.update_camera(camera_id, updated_config)
        
        if not success:
            raise HTTPException(status_code=400, detail="Không thể cập nhật camera trong manager")
        
        camera_info = camera_manager.get_camera_info(camera_id)
        
        return CameraResponse(
            success=True,
            message="Cập nhật camera thành công",
            data=camera_info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating camera {camera_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật camera: {str(e)}")


@router.delete("/{camera_id}", response_model=CameraResponse)
async def delete_camera(camera_id: str, db=Depends(get_db)):
    """Xóa camera"""
    try:
        # Xóa khỏi manager trước
        manager_success = camera_manager.remove_camera(camera_id)
        
        # Xóa khỏi database
        db_success = await CameraDBService.delete_camera(db, camera_id)
        
        if not manager_success and not db_success:
            raise HTTPException(status_code=404, detail="Không tìm thấy camera")
        
        return CameraResponse(
            success=True,
            message="Xóa camera thành công",
            data=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting camera {camera_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi xóa camera: {str(e)}")


@router.post("/{camera_id}/start", response_model=CameraResponse)
async def start_camera(camera_id: str, db=Depends(get_db)):
    """Bắt đầu camera"""
    try:
        logger.info(f"🟢 START camera {camera_id}")
        success = camera_manager.start_camera(camera_id)
        
        if not success:
            raise HTTPException(status_code=400, detail="Không thể bắt đầu camera (kiểm tra kết nối)")
        
        # Update database: set enabled=True
        logger.info(f"   📝 Saving enabled=True to database")
        result = await CameraDBService.update_camera(db, camera_id, {"enabled": True})
        logger.info(f"   ✅ Database updated: enabled={result.get('enabled') if result else 'unknown'}")
        
        camera_info = camera_manager.get_camera_info(camera_id)
        
        return CameraResponse(
            success=True,
            message="Đã bắt đầu camera thành công",
            data=camera_info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting camera {camera_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi bắt đầu camera: {str(e)}")


@router.post("/{camera_id}/stop", response_model=CameraResponse)
async def stop_camera(camera_id: str, db=Depends(get_db)):
    """Dừng camera"""
    try:
        logger.info(f"🔴 STOP camera {camera_id}")
        success = camera_manager.stop_camera(camera_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Không tìm thấy camera")
        
        # Update database: set enabled=False
        logger.info(f"   📝 Saving enabled=False to database")
        result = await CameraDBService.update_camera(db, camera_id, {"enabled": False})
        logger.info(f"   ✅ Database updated: enabled={result.get('enabled') if result else 'unknown'}")
        
        camera_info = camera_manager.get_camera_info(camera_id)
        
        return CameraResponse(
            success=True,
            message="Đã dừng camera thành công",
            data=camera_info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error stopping camera {camera_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi dừng camera: {str(e)}")


@router.get("/{camera_id}/frame")
async def get_camera_frame(camera_id: str, format: str = Query("base64", regex="^(base64|info)$")):
    """Lấy frame từ camera"""
    try:
        if format == "base64":
            frame_base64 = camera_manager.get_camera_frame_base64(camera_id)
            
            if frame_base64 is None:
                raise HTTPException(status_code=404, detail="Không có frame từ camera hoặc camera chưa kết nối")
            
            return {
                "success": True,
                "message": "Lấy frame thành công",
                "data": {
                    "camera_id": camera_id,
                    "frame": frame_base64,
                    "format": "jpeg",
                    "encoding": "base64"
                }
            }
        else:
            # Format info
            camera_info = camera_manager.get_camera_info(camera_id)
            if not camera_info:
                raise HTTPException(status_code=404, detail="Không tìm thấy camera")
            
            return {
                "success": True,
                "message": "Lấy thông tin frame thành công",
                "data": {
                    "camera_id": camera_id,
                    "has_frame": camera_info.is_connected and camera_info.last_frame_time is not None,
                    "last_frame_time": camera_info.last_frame_time.isoformat() if camera_info.last_frame_time else None,
                    "frame_count": camera_info.frame_count,
                    "width": camera_info.width,
                    "height": camera_info.height
                }
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting frame from camera {camera_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi lấy frame: {str(e)}")


@router.get("/{camera_id}/stream")
async def stream_camera_mjpeg(camera_id: str):
    """
    Stream MJPEG từ camera qua backend proxy
    Giúp tránh CORS và tối ưu performance
    """
    try:
        camera = camera_manager.get_camera(camera_id)
        if not camera:
            raise HTTPException(status_code=404, detail="Không tìm thấy camera")
        
        if not camera.running or not camera.cap or not camera.cap.isOpened():
            raise HTTPException(status_code=400, detail="Camera chưa được bật")
        
        def generate_mjpeg():
            """Generator để stream MJPEG frames - tối ưu cho độ mượt tối đa"""
            # Tăng FPS target: ưu tiên config camera, tối thiểu 20 FPS (tăng từ 15)
            config_fps = camera.config.fps or 30
            target_fps = max(config_fps, 20)  # Tối thiểu 20 FPS, ưu tiên config (thường 30)
            frame_interval = 1.0 / target_fps
            
            last_frame_time = time.time()
            frame_skip_threshold = frame_interval * 1.5  # Skip frame nếu quá chậm
            
            while camera.running:
                try:
                    loop_start = time.time()
                    
                    # Lấy frame ngay lập tức (không sleep trước)
                    frame = camera.get_frame()
                    
                    if frame is None:
                        # Không có frame, đợi ngắn hơn
                        time.sleep(0.02)  # Giảm từ 0.05 xuống 0.02
                        continue
                    
                    # Encode frame với quality thấp hơn để tăng tốc (giảm từ 80 xuống 75)
                    success, buffer = cv2.imencode('.jpg', frame, [
                        cv2.IMWRITE_JPEG_QUALITY, 75  # Giảm quality để encode nhanh hơn
                    ])
                    
                    if not success or buffer is None:
                        time.sleep(0.02)
                        continue
                    
                    # Kiểm tra nếu frame quá cũ thì skip để không lag
                    elapsed = loop_start - last_frame_time
                    if elapsed > frame_skip_threshold:
                        # Frame quá cũ, skip và lấy frame mới tiếp theo
                        continue
                    
                    # MJPEG boundary format
                    boundary = b'\r\n--FRAME\r\n'
                    header = f'Content-Type: image/jpeg\r\nContent-Length: {len(buffer)}\r\n\r\n'
                    
                    yield boundary
                    yield header.encode()
                    yield buffer.tobytes()
                    
                    # Điều chỉnh timing sau khi encode
                    encode_time = time.time() - loop_start
                    sleep_time = frame_interval - encode_time
                    
                    if sleep_time > 0.001:  # Chỉ sleep nếu còn thời gian (> 1ms)
                        time.sleep(sleep_time)
                    # Nếu encode quá lâu, tiếp tục ngay không sleep
                    
                    last_frame_time = time.time()
                    
                except StopIteration:
                    break
                except Exception as e:
                    logger.error(f"Error in MJPEG stream for camera {camera_id}: {e}")
                    time.sleep(0.05)  # Giảm sleep khi lỗi
                    continue
        
        return StreamingResponse(
            generate_mjpeg(),
            media_type="multipart/x-mixed-replace; boundary=FRAME",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error streaming camera {camera_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi stream camera: {str(e)}")

