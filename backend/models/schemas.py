"""
Pydantic models cho API request/response schemas
"""

from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field

# Authentication Schemas
class UserLogin(BaseModel):
    username: str = Field(..., description="Username")
    password: str

class UserCreate(BaseModel):
    email: str
    username: Optional[str] = Field(None, description="Username tùy chọn")
    password: str
    full_name: str
    role: str = "teacher"

# Forgot Password Schemas
class ForgotPasswordRequest(BaseModel):
    username: str = Field(..., description="Username")
    otp_email: str = Field(..., description="Email nhận OTP")

class VerifyOTPRequest(BaseModel):
    username: str = Field(..., description="Username")
    otp: str = Field(..., min_length=6, max_length=6, description="Mã OTP 6 số")

class ResetPasswordRequest(BaseModel):
    username: str = Field(..., description="Username")
    otp: str = Field(..., min_length=6, max_length=6, description="Mã OTP 6 số")
    new_password: str = Field(..., min_length=6, description="Mật khẩu mới")
    confirm_password: str = Field(..., min_length=6, description="Xác nhận mật khẩu mới")

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# Student Schemas
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

# School Days Configuration Schemas
class SchoolDaysConfigCreate(BaseModel):
    grade: str = Field(..., description="Khối học (10, 11, 12)")
    default_days_per_week: int = Field(..., ge=1, le=7, description="Số ngày học mặc định trong tuần")
    temporary_days_per_week: Optional[int] = Field(None, ge=1, le=7, description="Số ngày học tạm thời cho tuần tiếp theo")

class SchoolDaysConfigUpdate(BaseModel):
    default_days_per_week: Optional[int] = Field(None, ge=1, le=7, description="Số ngày học mặc định trong tuần")
    temporary_days_per_week: Optional[int] = Field(None, ge=1, le=7, description="Số ngày học tạm thời cho tuần tiếp theo")

class SchoolDaysConfig(BaseModel):
    id: int
    grade: str
    default_days_per_week: int
    temporary_days_per_week: Optional[int]
    current_week_days: int
    created_at: datetime
    updated_at: datetime

class WeeklyAttendanceSummaryCreate(BaseModel):
    week_start_date: date = Field(..., description="Ngày bắt đầu tuần (thứ 2)")
    grade: str = Field(..., description="Khối học")
    total_school_days_per_week: int = Field(..., description="Tổng số ngày học trong tuần")

class WeeklyAttendanceSummary(BaseModel):
    id: int
    week_start_date: date
    grade: str
    total_school_days_per_week: int
    total_students: int
    total_present: int
    total_absent: int
    total_late: int
    attendance_rate: float
    created_at: datetime
    updated_at: datetime

# Grades Management Schemas
class SubjectBase(BaseModel):
    subject_code: str = Field(..., description="Mã môn học")
    subject_name: str = Field(..., description="Tên môn học")
    description: Optional[str] = None

class Subject(SubjectBase):
    id: int
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

class TeacherBase(BaseModel):
    teacher_code: str = Field(..., description="Mã giáo viên")
    full_name: str = Field(..., description="Họ tên giáo viên")
    email: Optional[str] = None
    phone: Optional[str] = None
    user_id: Optional[int] = None

class Teacher(TeacherBase):
    id: int
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

class GradeConfigBase(BaseModel):
    subject_id: int
    academic_year: str = Field(..., description="Năm học (2024-2025)")
    semester: str = Field(..., description="Học kỳ (HK1, HK2, HK3)")
    grade_column_config: dict = Field(..., description="Cấu hình cột điểm JSON")

class GradeConfig(GradeConfigBase):
    id: int
    teacher_id: int
    created_at: datetime
    updated_at: datetime

class GradeBase(BaseModel):
    student_id: int
    class_subject_id: int
    academic_year: str = Field(..., description="Năm học")
    semester: str = Field(..., description="Học kỳ")
    grade_data: dict = Field(..., description="Dữ liệu điểm JSON")

class Grade(GradeBase):
    id: int
    final_grade: Optional[float] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

class SchoolDaysConfigBatch(BaseModel):
    configs: List[SchoolDaysConfigCreate] = Field(..., description="Cấu hình cho tất cả các khối")

# Bulk Student Import Schemas
class StudentImportRecord(BaseModel):
    ho_va_ten: str = Field(..., description="Họ và tên học sinh")
    email: Optional[str] = None
    so_dien_thoai: Optional[str] = None
    lop_hoc: str = Field(..., description="Lớp học")
    khoi: str = Field(..., description="Khối học")
    ngay_sinh: Optional[str] = None
    ten_phu_huynh: Optional[str] = None
    sdt_phu_huynh: Optional[str] = None
    dia_chi: Optional[str] = None
    gioi_tinh: str = Field(default="Nam", description="Giới tính: Nam, Nữ, hoặc Khác")

class BulkStudentImport(BaseModel):
    students: List[StudentImportRecord] = Field(..., description="Danh sách học sinh để import") 