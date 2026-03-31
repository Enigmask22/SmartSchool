"""
Pydantic models cho Scores module
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class ScoreCreate(BaseModel):
    student_id: int
    class_subject_id: int
    academic_year: str
    semester: str
    score_data: dict

class ScoreUpdate(BaseModel):
    score_data: Optional[dict] = None
    final_score: Optional[float] = None

# Backward compatibility aliases
GradeCreate = ScoreCreate
GradeUpdate = ScoreUpdate

class ResponseModel(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None
