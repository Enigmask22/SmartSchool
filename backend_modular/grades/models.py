"""
Pydantic models cho Grades module
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class GradeCreate(BaseModel):
    student_id: int
    class_subject_id: int
    academic_year: str
    semester: str
    grade_data: dict

class GradeUpdate(BaseModel):
    grade_data: Optional[dict] = None
    final_grade: Optional[float] = None

class GradeConfigCreate(BaseModel):
    subject_id: int
    academic_year: str
    semester: str
    grade_column_config: dict

class GradeConfigUpdate(BaseModel):
    grade_column_config: dict

class ResponseModel(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None
