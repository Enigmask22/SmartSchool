"""
Pydantic models cho Students module
"""

from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field

class StudentBase(BaseModel):
    student_id: str = Field(..., description="Mã số học sinh")
    full_name: str = Field(..., description="Họ và tên")
    email: Optional[str] = None
    phone: Optional[str] = None
    class_name: str = Field(..., description="Lớp học")
    grade: str = Field(..., description="Khối")
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    gender: str = Field(default="Nam", description="Giới tính: Nam, Nữ, hoặc Khác")

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    class_name: Optional[str] = None
    grade: Optional[str] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    gender: Optional[str] = None
    is_active: Optional[bool] = None
    subject_selected: Optional[dict] = None

class Student(StudentBase):
    id: int
    insightface_encoding: Optional[str] = None
    profile_image: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

class ResponseModel(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

class ListResponse(BaseModel):
    success: bool
    data: list
    total: int
    page: int
    page_size: int
