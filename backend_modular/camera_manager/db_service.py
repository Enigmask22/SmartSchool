"""
Database Service cho Camera Manager
Xử lý CRUD operations với database
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
from core.database import get_db
from camera_manager.models import CameraConfig, CameraStatus
from core.logger import setup_logger

logger = setup_logger("camera_db_service")


class CameraDBService:
    """Service để tương tác với database cho cameras"""
    
    @staticmethod
    async def create_camera(db, config: CameraConfig) -> Dict[str, Any]:
        """Tạo camera mới trong database"""
        try:
            camera_data = {
                "camera_id": config.camera_id,
                "name": config.name,
                "source": config.source,
                "location": config.location,
                "description": config.description,
                "enabled": config.enabled,
                "fps": config.fps,
                "width": config.width,
                "height": config.height,
                "username": config.username,
                "password": config.password,  # Lưu plaintext (cần mã hóa nếu cần)
                "metadata": config.metadata,
                "status": CameraStatus.INACTIVE.value,
                "frame_count": 0,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            response = db.table("cameras").insert(camera_data).execute()
            
            if response.data and len(response.data) > 0:
                logger.info(f"✅ Đã tạo camera trong DB: {config.camera_id}")
                return response.data[0]
            else:
                raise Exception("Không có data trả về từ database")
                
        except Exception as e:
            logger.error(f"❌ Lỗi tạo camera trong DB: {e}")
            raise
    
    @staticmethod
    async def get_camera(db, camera_id: str) -> Optional[Dict[str, Any]]:
        """Lấy camera từ database"""
        try:
            response = db.table("cameras").select("*").eq("camera_id", camera_id).execute()
            
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
            
        except Exception as e:
            logger.error(f"❌ Lỗi lấy camera từ DB: {e}")
            return None
    
    @staticmethod
    async def get_all_cameras(db, enabled_only: bool = False) -> List[Dict[str, Any]]:
        """Lấy tất cả cameras từ database"""
        try:
            query = db.table("cameras").select("*")
            
            if enabled_only:
                query = query.eq("enabled", True)
            
            response = query.order("created_at", desc=False).execute()
            
            return response.data or []
            
        except Exception as e:
            logger.error(f"❌ Lỗi lấy danh sách cameras từ DB: {e}")
            return []
    
    @staticmethod
    async def update_camera(db, camera_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Cập nhật camera trong database"""
        try:
            # Thêm updated_at
            updates["updated_at"] = datetime.now().isoformat()
            
            response = db.table("cameras").update(updates).eq("camera_id", camera_id).execute()
            
            if response.data and len(response.data) > 0:
                logger.info(f"✅ Đã cập nhật camera trong DB: {camera_id}")
                return response.data[0]
            return None
            
        except Exception as e:
            logger.error(f"❌ Lỗi cập nhật camera trong DB: {e}")
            return None
    
    @staticmethod
    async def delete_camera(db, camera_id: str) -> bool:
        """Xóa camera từ database"""
        try:
            response = db.table("cameras").delete().eq("camera_id", camera_id).execute()
            
            # Với Supabase, delete trả về data nếu thành công
            success = response.data is not None and len(response.data) > 0
            
            if success:
                logger.info(f"✅ Đã xóa camera từ DB: {camera_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ Lỗi xóa camera từ DB: {e}")
            return False
    
    @staticmethod
    async def update_camera_status(db, camera_id: str, status: CameraStatus, error_message: Optional[str] = None, frame_count: Optional[int] = None):
        """Cập nhật status và thông tin runtime của camera"""
        try:
            updates = {
                "status": status.value,
                "updated_at": datetime.now().isoformat()
            }
            
            if status == CameraStatus.ACTIVE:
                updates["last_connected_at"] = datetime.now().isoformat()
                if error_message:
                    updates["error_message"] = None  # Clear error khi active
            elif status in [CameraStatus.ERROR, CameraStatus.DISCONNECTED]:
                updates["last_disconnected_at"] = datetime.now().isoformat()
                if error_message:
                    updates["error_message"] = error_message
            
            if frame_count is not None:
                updates["frame_count"] = frame_count
            
            db.table("cameras").update(updates).eq("camera_id", camera_id).execute()
            
        except Exception as e:
            logger.error(f"❌ Lỗi cập nhật camera status: {e}")
    
    @staticmethod
    def dict_to_config(camera_dict: Dict[str, Any]) -> CameraConfig:
        """Convert database dict thành CameraConfig"""
        return CameraConfig(
            camera_id=camera_dict["camera_id"],
            name=camera_dict["name"],
            source=camera_dict["source"],
            location=camera_dict.get("location"),
            description=camera_dict.get("description"),
            enabled=camera_dict.get("enabled", True),
            fps=camera_dict.get("fps", 30),
            width=camera_dict.get("width"),
            height=camera_dict.get("height"),
            username=camera_dict.get("username"),
            password=camera_dict.get("password"),
            metadata=camera_dict.get("metadata")
        )

