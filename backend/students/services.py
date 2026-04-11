"""
Students Services - Business logic
"""

from typing import Optional
from core.logger import setup_logger

logger = setup_logger("students_service")

def validate_student_data(student_data: dict) -> bool:
    """Validate student data"""
    required_fields = ['student_id', 'full_name', 'class_name', 'grade']
    for field in required_fields:
        if field not in student_data or not student_data[field]:
            return False
    return True
