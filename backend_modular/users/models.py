"""
Pydantic models cho Users module
"""

from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field

class UserBase(BaseModel):
    email: str
    username: Optional[str] = None
    full_name: str
    role: str = "teacher"
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class User(UserBase):
    id: int
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class TeacherBase(BaseModel):
    teacher_code: str = Field(..., description="Mã giáo viên")
    full_name: str = Field(..., description="Họ tên giáo viên")
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = Field(None, description="Ngày sinh")
    gender: Optional[str] = Field("Nam", description="Giới tính: Nam, Nữ, Khác")
    user_id: Optional[int] = None

class TeacherCreate(TeacherBase):
    pass

class TeacherUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    user_id: Optional[int] = None
    is_active: Optional[bool] = None

class Teacher(TeacherBase):
    id: int
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
