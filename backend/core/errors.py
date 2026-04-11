"""
Database error handling utilities
Converts database errors to appropriate HTTP responses
"""

from fastapi import HTTPException, status
from typing import Tuple, Optional
import re
from core.logger import setup_logger

logger = setup_logger("database_errors")

# PostgreSQL error codes mapping
POSTGRES_ERROR_MAP = {
    '23505': {  # Unique violation
        'status_code': status.HTTP_409_CONFLICT,
        'message_pattern': r'duplicate key value violates unique constraint "(\w+)".*Key \((\w+)\)=',
        'user_message_template': 'Giá trị {field} này đã tồn tại trong hệ thống'
    },
    '23502': {  # Not null violation
        'status_code': status.HTTP_400_BAD_REQUEST,
        'message_pattern': r'null value in column "(\w+)" violates not-null constraint',
        'user_message_template': 'Trường {field} không được để trống'
    },
    '23503': {  # Foreign key violation
        'status_code': status.HTTP_400_BAD_REQUEST,
        'message_pattern': r'insert or update on table "(\w+)" violates foreign key constraint',
        'user_message_template': 'Không thể tạo bản ghi này do ràng buộc khóa ngoại'
    },
    '23506': {  # Foreign key violation (different variant)
        'status_code': status.HTTP_400_BAD_REQUEST,
        'message_pattern': r'update or delete on table "(\w+)" violates foreign key constraint',
        'user_message_template': 'Không thể xóa/cập nhật bản ghi này vì có bản ghi khác tham chiếu'
    },
}

# Field name translations for user-friendly messages
FIELD_TRANSLATIONS = {
    'subject_code': 'Mã môn học',
    'subject_name': 'Tên môn học',
    'teacher_code': 'Mã giáo viên',
    'class_name': 'Tên lớp',
    'username': 'Tên đăng nhập',
    'email': 'Email',
    'user_id': 'ID người dùng',
    'class_id': 'ID lớp học',
    'teacher_id': 'ID giáo viên',
    'subject_id': 'ID môn học',
}


def parse_database_error(error_message: str, error_code: Optional[str] = None) -> Tuple[int, str]:
    """
    Parse database error and return (status_code, user_friendly_message)
    
    Args:
        error_message: Full error message from database
        error_code: PostgreSQL error code (e.g., '23505')
    
    Returns:
        Tuple of (HTTP status code, user-friendly message)
    """
    # Try to extract error code from message if not provided
    if not error_code:
        # Look for 'code': '23505' pattern or similar
        code_match = re.search(r"'code':\s*'(\d+)'", error_message)
        if code_match:
            error_code = code_match.group(1)
    
    logger.debug(f"Parsing DB error | code={error_code} | message={error_message[:100]}")
    
    # Check if this is a known error type
    if error_code in POSTGRES_ERROR_MAP:
        error_info = POSTGRES_ERROR_MAP[error_code]
        status_code = error_info['status_code']
        
        # Try to extract field name from error message
        pattern = error_info['message_pattern']
        match = re.search(pattern, error_message)
        
        if match:
            # For unique constraint, extract field name (it's in group 2)
            if error_code == '23505' and len(match.groups()) >= 2:
                field_name = match.group(2)
                field_display = FIELD_TRANSLATIONS.get(field_name, field_name)
                user_message = f"{field_display} này đã tồn tại trong hệ thống"
                return status_code, user_message
            # For other errors, use templated message
            elif error_code in ['23502', '23503', '23506']:
                return status_code, error_info['user_message_template']
        
        # Fallback to default message for this error code
        return status_code, f"Lỗi dữ liệu: {error_info['user_message_template']}"
    
    # Unknown error type - return generic message
    logger.warning(f"Unknown database error code: {error_code}")
    return status.HTTP_500_INTERNAL_SERVER_ERROR, "Lỗi khi xử lý dữ liệu"


def handle_database_error(exception: Exception) -> HTTPException:
    """
    Convert a database exception to an appropriate HTTPException
    
    Args:
        exception: The exception from database operation
    
    Returns:
        HTTPException with appropriate status code and message
    """
    error_msg = str(exception)
    logger.debug(f"Database error caught: {error_msg[:200]}")
    
    # Parse and get appropriate status code and message
    status_code, user_message = parse_database_error(error_msg)
    
    # Log the error details
    logger.error(f"Database operation failed | status={status_code} | user_msg={user_message}")
    
    return HTTPException(status_code=status_code, detail=user_message)


def create_error_handler(field_context: Optional[str] = None):
    """
    Create a reusable error handler for specific operations
    
    Args:
        field_context: Additional context about which field/operation failed
    
    Returns:
        Function that handles exceptions and returns HTTPException
    """
    def _handler(exception: Exception) -> HTTPException:
        error_msg = str(exception)
        status_code, user_message = parse_database_error(error_msg)
        
        if field_context:
            logger.error(f"Error in {field_context}: {user_message}")
        
        return HTTPException(status_code=status_code, detail=user_message)
    
    return _handler
