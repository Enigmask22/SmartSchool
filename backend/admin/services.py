"""
Admin services - Business logic cho admin module
"""

from datetime import datetime
from core.logger import setup_logger

logger = setup_logger("admin_services")


def generate_student_id(grade: str, db, academic_year: str = None) -> str:
    """Tạo mã học sinh tự động dựa trên năm học và khối
    
    Args:
        grade: Khối học (10, 11, 12)
        db: Database connection
        academic_year: Năm học (ví dụ: "2024-2025"). REQUIRED - sẽ error nếu None
    
    Returns:
        Student ID dạng "250001", "250002", ... (different prefix per grade)
        Grade 10: prefix = year, e.g., "25"
        Grade 11: prefix = year - 1, e.g., "24"
        Grade 12: prefix = year - 2, e.g., "23"
    """
    try:
        # Validate academic_year is provided
        if not academic_year or '-' not in academic_year:
            raise ValueError('academic_year bắt buộc phải có và có định dạng "XXXX-YYYY"')
        
        # Extract end year: "2024-2025" → "2025" → 2025
        end_year = academic_year.split('-')[1]
        end_year_int = int(end_year)
        
        # Calculate year_prefix based on grade
        if grade == '10':
            year_for_prefix = end_year_int  # Grade 10: use current year as-is
        elif grade == '11':
            year_for_prefix = end_year_int - 1  # Grade 11: previous year
        elif grade == '12':
            year_for_prefix = end_year_int - 2  # Grade 12: 2 years ago
        else:
            raise ValueError('Khối học không hợp lệ (phải là 10, 11, hoặc 12)')
        
        year_prefix = str(year_for_prefix)[-2:]  # Get last 2 digits: 2025 → "25"
        
        logger.debug(f"📊 Searching for student IDs with prefix '{year_prefix}' (grade={grade}, academic_year={academic_year})")

        # Query tất cả học sinh
        response = db.table("students").select("student_id").execute()
        
        if response.data:
            students = response.data
            
            # Lọc các học sinh có mã bắt đầu bằng year_prefix (cho grade cụ thể này)
            filtered_students = [
                int(student['student_id']) for student in students 
                if student['student_id'] and student['student_id'].startswith(year_prefix)
            ]
            filtered_students = [id for id in filtered_students if not isinstance(id, str)]
            filtered_students.sort()
            
            # Tìm mã tiếp theo
            next_id = int(year_prefix + '0001')
            if filtered_students:
                max_id = max(filtered_students)
                next_id = max_id + 1
            
            logger.debug(f"✅ Generated student ID: {next_id}")
            return str(next_id)
        else:
            default_id = year_prefix + '0001'
            logger.debug(f"✅ Generated first student ID: {default_id}")
            return default_id
            
    except ValueError as ve:
        logger.error(f"Validation error: {str(ve)}")
        raise  # Re-raise validation errors (academic_year missing, invalid grade, etc.)
    except Exception as e:
        logger.error(f"Error generating student ID: {str(e)}")
        raise  # Re-raise any other errors instead of falling back
