"""
Pydantic models cho Attendance module
"""

from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field

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

class AttendanceStats(BaseModel):
    total_students: int
    present_today: int
    absent_today: int
    late_today: int
    attendance_rate: float

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
