"""
Pydantic models cho Feedback module
"""

from pydantic import BaseModel, Field
from typing import Optional, List

class StudentFeedbackRequest(BaseModel):
    student_name: str = Field(..., description="Tên học sinh")
    score: float = Field(default=0, ge=0, le=10, description="Điểm số (0-10)")
    top_subjects: List[str] = Field(default=[], description="Top 3 môn điểm cao nhất")
    weak_subjects: List[str] = Field(default=[], description="Top 3 môn điểm thấp nhất (< 8.0)")
    attendance_rate: int = Field(default=100, ge=0, le=100, description="Tỷ lệ chuyên cần (%)")
    subject: Optional[str] = Field(default=None, description="Môn học (nếu có)")
    notes: Optional[str] = Field(default="", description="Ghi chú thêm")
    type: Optional[str] = Field(default="CK", description="Loại nhận xét: GK (giữa kỳ), CK (cuối kỳ)")
    low_score_details: Optional[List[dict]] = Field(default=[], description="Chi tiết cột TX/GK dưới 8 hoặc KĐ (chỉ dùng cho GK)")

class StudentFeedbackResponse(BaseModel):
    success: bool
    student_name: str
    feedback: Optional[str] = None
    error: Optional[str] = None

class BatchFeedbackRequest(BaseModel):
    students: List[StudentFeedbackRequest] = Field(..., description="Danh sách học sinh")

class FeedbackResult(BaseModel):
    student_name: str
    feedback: str
    success: bool
    error: Optional[str] = None

class BatchFeedbackResponse(BaseModel):
    success: bool
    success_count: int
    failed_count: int
    failed_students: List[str]
    feedbacks: List[FeedbackResult]

class SMSFeedbackRequest(BaseModel):
    student_id: int = Field(..., description="ID học sinh")
    feedback: str = Field(..., description="Nội dung nhận xét")
    parent_phone: str = Field(..., description="Số điện thoại phụ huynh")

class ResponseModel(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

class CommentCreateRequest(BaseModel):
    student_id: int = Field(..., description="ID học sinh")
    description: str = Field(..., description="Nội dung nhận xét")
    semester: str = Field(default="HK1", description="Học kỳ: HK1, HK2, CN")
    type: str = Field(default="CK", description="Loại nhận xét: GK (giữa kỳ), CK (cuối kỳ)")
    ket_qua_ren_luyen: Optional[str] = Field(default=None, description="Kết quả rèn luyện: Tốt, Khá, Đạt, Chưa Đạt")

class CommentResponse(BaseModel):
    id: int
    student_id: int
    class_id: Optional[int]
    description: str
    semester: str
    type: str
    ket_qua_ren_luyen: Optional[str] = None
    created_at: str
    updated_at: str

class CommentResponseModel(BaseModel):
    success: bool
    message: str
    data: Optional[CommentResponse] = None


class EmailReportCardRequest(BaseModel):
    """Request model cho gửi phiếu điểm qua email"""
    student_id: int = Field(..., description="ID học sinh (internal)")
    student_code: str = Field(..., description="Mã số học sinh (vd: 250001)")
    student_name: str = Field(..., description="Họ và tên học sinh")
    class_name: str = Field(default="", description="Lớp học")
    grade: str = Field(default="", description="Khối")
    teacher_name: str = Field(default="", description="Tên giáo viên chủ nhiệm")
    academic_year: str = Field(default="", description="Năm học")
    semester: str = Field(default="HK1", description="Học kỳ")
    feedback: str = Field(default="", description="Nhận xét của giáo viên")
    scores: list = Field(default=[], description="Danh sách điểm [{subject_name, final_score, score_data}]")
    overall_average: Optional[float] = Field(default=None, description="Điểm trung bình tổng kết")
    received_email: Optional[str] = Field(default=None, description="Email phụ huynh (override từ DB)")