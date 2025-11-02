"""
Models cho Camera Manager
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class CameraStatus(str, Enum):
    """Trạng thái camera"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    CONNECTING = "connecting"
    ERROR = "error"
    DISCONNECTED = "disconnected"


class CameraConfig(BaseModel):
    """Cấu hình camera"""
    camera_id: str = Field(..., description="ID duy nhất của camera")
    name: str = Field(..., description="Tên camera (ví dụ: Camera 1, Camera 2)")
    source: str = Field(..., description="URL hoặc IP của camera (ví dụ: http://192.168.1.100:8080/video, 0, 1)")
    location: Optional[str] = Field(None, description="Vị trí đặt camera (ví dụ: Cổng vào, Phòng học A101)")
    description: Optional[str] = Field(None, description="Mô tả camera")
    enabled: bool = Field(True, description="Bật/tắt camera")
    fps: int = Field(30, description="FPS mong muốn", ge=1, le=60)
    width: Optional[int] = Field(None, description="Độ rộng frame")
    height: Optional[int] = Field(None, description="Độ cao frame")
    
    # Settings cho IP camera
    username: Optional[str] = Field(None, description="Username cho IP camera (nếu cần)")
    password: Optional[str] = Field(None, description="Password cho IP camera (nếu cần)")
    
    # Metadata
    metadata: Optional[Dict[str, Any]] = Field(None, description="Metadata bổ sung")


class CameraInfo(BaseModel):
    """Thông tin camera đang chạy"""
    camera_id: str
    name: str
    source: str
    location: Optional[str]
    status: CameraStatus
    enabled: bool
    fps: int
    is_connected: bool
    last_frame_time: Optional[datetime] = None
    frame_count: int = 0
    error_message: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None


class CameraCreateRequest(BaseModel):
    """Request để tạo camera mới"""
    name: str
    source: str
    location: Optional[str] = None
    description: Optional[str] = None
    enabled: bool = True
    fps: int = 30
    width: Optional[int] = None
    height: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class CameraUpdateRequest(BaseModel):
    """Request để cập nhật camera"""
    name: Optional[str] = None
    source: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None
    fps: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class CameraResponse(BaseModel):
    """Response cho camera operations"""
    success: bool
    message: str
    data: Optional[CameraInfo] = None


class CameraListResponse(BaseModel):
    """Response cho danh sách camera"""
    success: bool
    message: str
    data: list[CameraInfo]
    total: int

