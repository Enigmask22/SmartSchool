"""
Pydantic models cho Score Settings
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class ScoreSettingsCreate(BaseModel):
    """Model để tạo mới score settings"""
    subject_id: int = Field(..., description="ID của môn học")
    score_column_config: dict = Field(..., description="Cấu hình cột điểm dạng JSON nested")
    is_active: Optional[bool] = Field(True, description="Trạng thái active")

class ScoreSettingsUpdate(BaseModel):
    """Model để cập nhật score settings"""
    score_column_config: Optional[dict] = Field(None, description="Cấu hình cột điểm dạng JSON nested")
    is_active: Optional[bool] = Field(None, description="Trạng thái active")

class ScoreSettingsResponse(BaseModel):
    """Model response cho score settings"""
    id: int
    subject_id: int
    score_column_config: dict
    is_active: bool
    created_at: str
    updated_at: str

class ResponseModel(BaseModel):
    """Generic response model"""
    success: bool
    message: str
    data: Optional[Any] = None



