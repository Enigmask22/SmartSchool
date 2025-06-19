"""
Pydantic models cho API request/response schemas
"""

from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

# Authentication Schemas
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "teacher"

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# Student Schemas
class StudentBase(BaseModel):
    student_id: str = Field(..., description="Mã số học sinh")
    full_name: str = Field(..., description="Họ và tên")
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    class_name: str = Field(..., description="Lớp học")
    grade: str = Field(..., description="Khối")
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    class_name: Optional[str] = None
    grade: Optional[str] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    is_active: Optional[bool] = None

class Student(StudentBase):
    id: int
    face_encoding: Optional[str] = None
    profile_image: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

# Attendance Schemas
class AttendanceCreate(BaseModel):
    student_id: int
    status: str = Field(..., description="present, absent, late")
    notes: Optional[str] = None
    confidence_score: Optional[float] = None

class AttendanceUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    check_out_time: Optional[datetime] = None

class Attendance(BaseModel):
    id: int
    student_id: int
    date: date
    check_in_time: Optional[datetime]
    check_out_time: Optional[datetime]
    status: str
    notes: Optional[str]
    confidence_score: Optional[float]
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime
    
    # Relations
    student: Optional[Student] = None

# AI Recognition Schemas
class FaceRecognitionRequest(BaseModel):
    image_base64: str
    confidence_threshold: float = 0.6

class FaceRecognitionResponse(BaseModel):
    recognized: bool
    student: Optional[Student] = None
    confidence: Optional[float] = None
    message: str

class FaceEncodingResponse(BaseModel):
    success: bool
    encoding_id: Optional[str] = None
    message: str

# Dashboard Schemas
class AttendanceStats(BaseModel):
    total_students: int
    present_today: int
    absent_today: int
    late_today: int
    attendance_rate: float

class ClassAttendanceStats(BaseModel):
    class_name: str
    total_students: int
    present: int
    absent: int
    late: int
    attendance_rate: float

class DashboardData(BaseModel):
    stats: AttendanceStats
    class_stats: List[ClassAttendanceStats]
    recent_attendance: List[Attendance]

# Response Schemas
class ResponseModel(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

class ListResponse(BaseModel):
    success: bool
    data: List[dict]
    total: int
    page: int
    page_size: int

# AI Feedback Schemas
class StudentFeedbackRequest(BaseModel):
    student_name: str = Field(..., description="Tên học sinh")
    score: float = Field(..., ge=0, le=10, description="Điểm số (0-10)")
    score_trend: str = Field(..., description="Xu hướng điểm: 'tăng', 'giảm', 'ổn định'")
    attendance_rate: int = Field(..., ge=0, le=100, description="Tỷ lệ chuyên cần (%)")
    notes: Optional[str] = Field(default="", description="Ghi chú thêm từ giáo viên")

class StudentFeedbackResponse(BaseModel):
    success: bool
    student_name: str
    feedback: Optional[str] = None
    error: Optional[str] = None

class BatchFeedbackRequest(BaseModel):
    students: List[StudentFeedbackRequest]

class BatchFeedbackResponse(BaseModel):
    success: bool
    success_count: int
    failed_count: int
    failed_students: List[str]
    feedbacks: dict  # {student_name: feedback} 