"""
Pydantic models cho Feedback module
"""

from pydantic import BaseModel, Field
from typing import Optional, List

class StudentFeedbackRequest(BaseModel):
    student_name: str = Field(..., description="Tên học sinh")
    score: float = Field(..., ge=0, le=10, description="Điểm số (0-10)")
    top_subjects: List[str] = Field(default=[], description="Top 3 môn điểm cao nhất")
    weak_subjects: List[str] = Field(default=[], description="Top 3 môn điểm thấp nhất (< 8.0)")
    attendance_rate: int = Field(..., ge=0, le=100, description="Tỷ lệ chuyên cần (%)")
    subject: Optional[str] = Field(default=None, description="Môn học (nếu có)")
    notes: Optional[str] = Field(default="", description="Ghi chú thêm")

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
