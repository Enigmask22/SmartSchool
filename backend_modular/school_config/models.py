"""
Pydantic models cho School Config module
"""

from pydantic import BaseModel, Field
from typing import Optional

class SchoolDaysConfigCreate(BaseModel):
    grade: str = Field(..., description="Khối học (10, 11, 12)")
    default_days_per_week: int = Field(..., ge=1, le=7, description="Số ngày học mặc định")
    temporary_days_per_week: Optional[int] = Field(None, ge=1, le=7)

class SchoolDaysConfigUpdate(BaseModel):
    default_days_per_week: Optional[int] = Field(None, ge=1, le=7)
    temporary_days_per_week: Optional[int] = Field(None, ge=1, le=7)

class ResponseModel(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None
