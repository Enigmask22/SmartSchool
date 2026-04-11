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
    parent_contacts: Optional[list] = None
    gender: str = Field(default="Nam", description="Giới tính: Nam, Nữ, hoặc Khác")

class StudentCreate(BaseModel):
    student_id: str
    full_name: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    class_name: str
    grade: str
    class_id: Optional[int] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    parent_contacts: Optional[list] = None
    address: Optional[str] = None
    received_email: Optional[str] = None  # Email phụ huynh để nhận phiếu điểm
    is_active: Optional[bool] = True

class StudentUpdate(BaseModel):
    student_id: Optional[str] = None
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    class_name: Optional[str] = None
    grade: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    parent_contacts: Optional[list] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None
    subject_selected: Optional[dict] = None
    received_email: Optional[str] = None  # Email phụ huynh để nhận phiếu điểm

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
