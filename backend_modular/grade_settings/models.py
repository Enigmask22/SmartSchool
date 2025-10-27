"""
Pydantic models cho Grade Settings
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class GradeSettingsCreate(BaseModel):
    """Model để tạo mới grade settings"""
    subject_id: int = Field(..., description="ID của môn học")
    grade_column_config: dict = Field(..., description="Cấu hình cột điểm dạng JSON nested")
    is_active: Optional[bool] = Field(True, description="Trạng thái active")

class GradeSettingsUpdate(BaseModel):
    """Model để cập nhật grade settings"""
    grade_column_config: Optional[dict] = Field(None, description="Cấu hình cột điểm dạng JSON nested")
    is_active: Optional[bool] = Field(None, description="Trạng thái active")

class GradeSettingsResponse(BaseModel):
    """Model response cho grade settings"""
    id: int
    subject_id: int
    grade_column_config: dict
    is_active: bool
    created_at: str
    updated_at: str

class ResponseModel(BaseModel):
    """Generic response model"""
    success: bool
    message: str
    data: Optional[Any] = None

