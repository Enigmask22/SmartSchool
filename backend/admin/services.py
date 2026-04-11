"""
Admin services - Business logic cho admin module
"""

from datetime import datetime
from core.logger import setup_logger

logger = setup_logger("admin_services")


def generate_student_id(grade: str, db) -> str:
    """Tạo mã học sinh tự động dựa trên khối"""
    try:
        # Xác định năm học dựa trên khối
        current_year = datetime.now().year
        year_prefix = None
        
        if grade == '10':
            year_prefix = str(current_year)[-2:]  # 2025 -> 25
        elif grade == '11':
            year_prefix = str(current_year - 1)[-2:]  # 2024 -> 24
        elif grade == '12':
            year_prefix = str(current_year - 2)[-2:]  # 2023 -> 23
        else:
            raise ValueError('Khối học không hợp lệ')

        # Query tất cả học sinh có mã bắt đầu bằng yearPrefix
        response = db.table("students").select("student_id").eq("grade", grade).execute()
        
        if response.data:
            students = response.data
            
            # Lọc các học sinh có mã bắt đầu bằng yearPrefix và sắp xếp
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
            
            return str(next_id)
        else:
            return year_prefix + '0001'
            
    except Exception as e:
        logger.error(f"Error generating student ID: {str(e)}")
        # Fallback: tạo mã dựa trên thời gian hiện tại
        current_year = datetime.now().year
        year_prefix = str(current_year)[-2:] if grade == '10' else str(current_year - 1)[-2:] if grade == '11' else str(current_year - 2)[-2:]
        return year_prefix + str(int(datetime.now().timestamp()))[-4:]
