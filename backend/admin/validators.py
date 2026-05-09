"""
Validation Helper Functions for SmartSchool API
Reusable validators for all data types across endpoints
"""

import re
from datetime import datetime, date
from typing import Optional, Dict, Any, List
from core.error_codes import raise_validation_error
from core.error_codes import (
    UserErrorCode, TeacherErrorCode, SubjectErrorCode, 
    ClassErrorCode, ClassSubjectErrorCode, SubjectTeacherErrorCode
)


# ============================================================================
# EMAIL VALIDATION
# ============================================================================

def validate_email(email: Optional[str]) -> str:
    """
    Validate email format
    
    Args:
        email: Email to validate
    
    Returns:
        Validated email (lowercased)
    
    Raises:
        ValidationError if invalid
    """
    if not email:
        raise_validation_error(
            UserErrorCode.USER_EMAIL_REQUIRED,
            "Email là bắt buộc"
        )
    
    email = email.strip().lower()
    
    # Simple email regex pattern
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        raise_validation_error(
            UserErrorCode.USER_INVALID_EMAIL,
            f"Email '{email}' không hợp lệ",
            field="email"
        )
    
    return email


# ============================================================================
# USERNAME VALIDATION
# ============================================================================

def validate_username(username: Optional[str]) -> str:
    """
    Validate username format
    Allowed: letters, numbers, underscores, 3-20 characters
    
    Args:
        username: Username to validate
    
    Returns:
        Validated username
    
    Raises:
        ValidationError if invalid
    """
    if not username:
        raise_validation_error(
            UserErrorCode.USER_USERNAME_REQUIRED,
            "Tên đăng nhập là bắt buộc"
        )
    
    username = username.strip()
    
    # Username pattern: only alphanumeric and underscore, 3-20 chars
    username_pattern = r'^[a-zA-Z0-9_]{3,20}$'
    if not re.match(username_pattern, username):
        raise_validation_error(
            UserErrorCode.USER_INVALID_USERNAME,
            "Tên đăng nhập chỉ được chứa chữ cái, số, gạch dưới, từ 3-20 ký tự",
            field="username"
        )
    
    return username


# ============================================================================
# PASSWORD VALIDATION
# ============================================================================

def validate_password(password: Optional[str], strict: bool = False) -> str:
    """
    Validate password strength
    
    Args:
        password: Password to validate
        strict: If True, require strong password (1 uppercase, 1 lowercase, 1 number, 1 special char, min 8)
               If False, only check length >= 6
    
    Returns:
        Validated password
    
    Raises:
        ValidationError if invalid
    """
    if not password:
        raise_validation_error(
            UserErrorCode.USER_INVALID_PASSWORD,
            "Mật khẩu không được để trống"
        )
    
    if len(password) < 6:
        raise_validation_error(
            UserErrorCode.USER_INVALID_PASSWORD,
            "Mật khẩu phải có ít nhất 6 ký tự",
            field="password"
        )
    
    if strict:
        # Strong password validation
        if len(password) < 8:
            raise_validation_error(
                UserErrorCode.USER_PASSWORD_TOO_WEAK,
                "Mật khẩu phải có ít nhất 8 ký tự",
                field="password"
            )
        
        # Check for uppercase
        if not re.search(r'[A-Z]', password):
            raise_validation_error(
                UserErrorCode.USER_PASSWORD_TOO_WEAK,
                "Mật khẩu phải chứa ít nhất một chữ hoa",
                field="password"
            )
        
        # Check for lowercase
        if not re.search(r'[a-z]', password):
            raise_validation_error(
                UserErrorCode.USER_PASSWORD_TOO_WEAK,
                "Mật khẩu phải chứa ít nhất một chữ thường",
                field="password"
            )
        
        # Check for number
        if not re.search(r'\d', password):
            raise_validation_error(
                UserErrorCode.USER_PASSWORD_TOO_WEAK,
                "Mật khẩu phải chứa ít nhất một số",
                field="password"
            )
        
        # Check for special character
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise_validation_error(
                UserErrorCode.USER_PASSWORD_TOO_WEAK,
                "Mật khẩu phải chứa ít nhất một ký tự đặc biệt (!@#$%^&*...)",
                field="password"
            )
    
    return password


# ============================================================================
# PHONE VALIDATION
# ============================================================================

def validate_phone(phone: Optional[str]) -> str:
    """
    Validate phone number format (Vietnam)
    Accepted: 10-11 digits, optionally with spaces or hyphens
    
    Args:
        phone: Phone number to validate
    
    Returns:
        Validated phone number (digits only)
    
    Raises:
        ValidationError if invalid
    """
    if not phone:
        return ""  # Phone is optional
    
    phone = phone.strip()
    
    # Remove common separators
    cleaned = re.sub(r'[\s\-\(\)\.]+', '', phone)
    
    # Check if only digits and 10-11 characters
    if not re.match(r'^\d{10,11}$', cleaned):
        raise_validation_error(
            TeacherErrorCode.TEACHER_INVALID_PHONE,
            f"Số điện thoại '{phone}' không hợp lệ (yêu cầu 10-11 chữ số)",
            field="phone"
        )
    
    return cleaned


# ============================================================================
# DATE VALIDATION
# ============================================================================

def validate_date_of_birth(dob: Optional[str]) -> str:
    """
    Validate date of birth
    Must be in YYYY-MM-DD format and in the past
    
    Args:
        dob: Date of birth string
    
    Returns:
        Validated date string (YYYY-MM-DD)
    
    Raises:
        ValidationError if invalid
    """
    if not dob:
        return ""  # Optional field
    
    try:
        dob_date = datetime.strptime(dob, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        raise_validation_error(
            TeacherErrorCode.TEACHER_INVALID_DATE_OF_BIRTH,
            "Ngày sinh phải có định dạng YYYY-MM-DD",
            field="date_of_birth"
        )
    
    # Check if date is in the past
    if dob_date >= date.today():
        raise_validation_error(
            TeacherErrorCode.TEACHER_INVALID_DATE_OF_BIRTH,
            "Ngày sinh phải trước ngày hôm nay",
            field="date_of_birth"
        )
    
    # Check if person is at least 18 years old
    from datetime import timedelta
    min_age_date = date.today() - timedelta(days=365*18)
    if dob_date > min_age_date:
        raise_validation_error(
            TeacherErrorCode.TEACHER_INVALID_DATE_OF_BIRTH,
            "Giáo viên phải ít nhất 18 tuổi",
            field="date_of_birth"
        )
    
    return dob_date.isoformat()


# ============================================================================
# TEACHER CODE VALIDATION
# ============================================================================

def validate_teacher_code(code: Optional[str]) -> str:
    """
    Validate teacher code format
    Alphanumeric, 5-20 characters
    
    Args:
        code: Teacher code to validate
    
    Returns:
        Validated teacher code (uppercase)
    
    Raises:
        ValidationError if invalid
    """
    if not code:
        raise_validation_error(
            TeacherErrorCode.TEACHER_CODE_REQUIRED,
            "Mã giáo viên là bắt buộc"
        )
    
    code = code.strip().upper()
    
    if not re.match(r'^[A-Z0-9]{5,20}$', code):
        raise_validation_error(
            TeacherErrorCode.TEACHER_INVALID_CODE_FORMAT,
            "Mã giáo viên phải từ 5-20 ký tự alphanumeric",
            field="teacher_code"
        )
    
    return code


# ============================================================================
# SUBJECT CODE VALIDATION
# ============================================================================

def validate_subject_code(code: Optional[str]) -> str:
    """
    Validate subject code format
    Alphanumeric, 2-10 characters
    
    Args:
        code: Subject code to validate
    
    Returns:
        Validated subject code (uppercase)
    
    Raises:
        ValidationError if invalid
    """
    if not code:
        raise_validation_error(
            SubjectErrorCode.SUBJECT_CODE_REQUIRED,
            "Mã môn học là bắt buộc"
        )
    
    code = code.strip().upper()
    
    if not re.match(r'^[A-Z0-9]{2,10}$', code):
        raise_validation_error(
            SubjectErrorCode.SUBJECT_INVALID_CODE_FORMAT,
            "Mã môn học phải từ 2-10 ký tự alphanumeric",
            field="subject_code"
        )
    
    return code


# ============================================================================
# SUBJECT NAME VALIDATION
# ============================================================================

def validate_subject_name(name: Optional[str]) -> str:
    """
    Validate subject name
    Non-empty string, max 255 characters
    
    Args:
        name: Subject name to validate
    
    Returns:
        Validated subject name
    
    Raises:
        ValidationError if invalid
    """
    if not name:
        raise_validation_error(
            SubjectErrorCode.SUBJECT_NAME_REQUIRED,
            "Tên môn học là bắt buộc"
        )
    
    name = name.strip()
    
    if len(name) > 255:
        raise_validation_error(
            SubjectErrorCode.SUBJECT_NAME_REQUIRED,
            "Tên môn học không vượt quá 255 ký tự",
            field="subject_name"
        )
    
    return name


# ============================================================================
# TEACHER FULL NAME VALIDATION
# ============================================================================

def validate_full_name(name: Optional[str]) -> str:
    """
    Validate full name
    Non-empty string, max 255 characters
    
    Args:
        name: Full name to validate
    
    Returns:
        Validated full name
    
    Raises:
        ValidationError if invalid
    """
    if not name:
        raise_validation_error(
            TeacherErrorCode.TEACHER_FULL_NAME_REQUIRED,
            "Họ tên là bắt buộc"
        )
    
    name = name.strip()
    
    if len(name) > 255:
        raise_validation_error(
            TeacherErrorCode.TEACHER_FULL_NAME_REQUIRED,
            "Họ tên không vượt quá 255 ký tự",
            field="full_name"
        )
    
    return name


# ============================================================================
# GENDER VALIDATION
# ============================================================================

def validate_gender(gender: Optional[str]) -> Optional[str]:
    """
    Validate gender
    Allowed: Nam (Male), Nữ (Female), Khác (Other)
    
    Args:
        gender: Gender value
    
    Returns:
        Validated gender or None
    
    Raises:
        ValidationError if invalid
    """
    if not gender:
        return None
    
    gender = gender.strip()
    
    if gender not in ['Nam', 'Nữ', 'Khác']:
        raise_validation_error(
            TeacherErrorCode.TEACHER_INVALID_GENDER,
            "Giới tính phải là Nam, Nữ, hoặc Khác",
            field="gender"
        )
    
    return gender


# ============================================================================
# GRADE VALIDATION
# ============================================================================

def validate_grade(grade: Optional[int]) -> int:
    """
    Validate grade level (10-12)
    
    Args:
        grade: Grade level
    
    Returns:
        Validated grade
    
    Raises:
        ValidationError if invalid
    """
    if grade is None:
        raise_validation_error(
            ClassErrorCode.CLASS_GRADE_REQUIRED,
            "Khối lớp là bắt buộc"
        )
    
    if grade not in [10, 11, 12]:
        raise_validation_error(
            ClassErrorCode.CLASS_INVALID_GRADE,
            "Khối lớp phải là 10, 11, hoặc 12",
            field="grade"
        )
    
    return grade


# ============================================================================
# ACADEMIC YEAR VALIDATION
# ============================================================================

def validate_academic_year(year: Optional[str]) -> str:
    """
    Validate academic year format
    Format: YYYY-YYYY (e.g., 2024-2025)
    
    Args:
        year: Academic year string
    
    Returns:
        Validated academic year
    
    Raises:
        ValidationError if invalid
    """
    if not year:
        raise_validation_error(
            ClassErrorCode.CLASS_ACADEMIC_YEAR_REQUIRED,
            "Năm học là bắt buộc"
        )
    
    year = year.strip()
    
    # Check format YYYY-YYYY
    if not re.match(r'^\d{4}-\d{4}$', year):
        raise_validation_error(
            ClassErrorCode.CLASS_INVALID_ACADEMIC_YEAR,
            "Năm học phải có định dạng YYYY-YYYY (vd: 2024-2025)",
            field="academic_year"
        )
    
    # Check that years are consecutive
    try:
        start_year = int(year[:4])
        end_year = int(year[5:])
        if end_year != start_year + 1:
            raise_validation_error(
                ClassErrorCode.CLASS_INVALID_ACADEMIC_YEAR,
                "Năm kết thúc phải bằng năm bắt đầu + 1 (vd: 2024-2025)",
                field="academic_year"
            )
    except ValueError:
        raise_validation_error(
            ClassErrorCode.CLASS_INVALID_ACADEMIC_YEAR,
            "Năm học không hợp lệ",
            field="academic_year"
        )
    
    return year


# ============================================================================
# SEMESTER VALIDATION
# ============================================================================

def validate_semester(semester: Optional[int]) -> int:
    """
    Validate semester (1 or 2)
    
    Args:
        semester: Semester number
    
    Returns:
        Validated semester
    
    Raises:
        ValidationError if invalid
    """
    if semester is None:
        raise_validation_error(
            ClassSubjectErrorCode.CLASS_SUBJECT_INVALID_SEMESTER,
            "Học kỳ là bắt buộc"
        )
    
    if semester not in [1, 2]:
        raise_validation_error(
            ClassSubjectErrorCode.CLASS_SUBJECT_INVALID_SEMESTER,
            "Học kỳ phải là 1 hoặc 2",
            field="semester"
        )
    
    return semester


# ============================================================================
# SCORE COLUMN CONFIG VALIDATION
# ============================================================================

def validate_score_column_config(config: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Validate score column configuration structure
    
    Args:
        config: Score column config dictionary
    
    Returns:
        Validated config
    
    Raises:
        ValidationError if invalid
    """
    if not config:
        return None
    
    # Check for duplicate keys
    keys = set()
    for key in config.keys():
        if key in keys:
            raise_validation_error(
                SubjectErrorCode.SUBJECT_COLUMN_KEY_DUPLICATE,
                f"Khóa cột điểm '{key}' bị trùng lặp",
                field="score_column_config"
            )
        keys.add(key)
    
    # Validate each column
    max_depth = 0
    
    def check_depth(obj: Any, current_depth: int = 0):
        nonlocal max_depth
        max_depth = max(max_depth, current_depth)
        
        if isinstance(obj, dict):
            for key, value in obj.items():
                # Validate he_so if present
                if key == "he_so":
                    if not isinstance(value, (int, float)):
                        raise_validation_error(
                            SubjectErrorCode.SUBJECT_COLUMN_HE_SO_INVALID,
                            f"Hệ số phải là số",
                            field="score_column_config"
                        )
                    if value <= 0 or value > 10:
                        raise_validation_error(
                            SubjectErrorCode.SUBJECT_COLUMN_HE_SO_INVALID,
                            f"Hệ số phải từ 0.5 đến 10",
                            field="score_column_config"
                        )
                else:
                    check_depth(value, current_depth + 1)
    
    check_depth(config)
    
    if max_depth > 2:
        raise_validation_error(
            SubjectErrorCode.SUBJECT_COLUMN_NESTING_TOO_DEEP,
            "Cấu trúc cột điểm quá sâu (tối đa 2 cấp)",
            field="score_column_config"
        )
    
    return config


# ============================================================================
# ROLE VALIDATION
# ============================================================================

def validate_role(role: Optional[str]) -> str:
    """
    Validate user role
    Allowed: admin, teacher, student
    
    Args:
        role: Role to validate
    
    Returns:
        Validated role
    
    Raises:
        ValidationError if invalid
    """
    if not role:
        role = "teacher"  # Default role
    
    role = role.strip().lower()
    
    valid_roles = ["admin", "teacher", "homeroom_teacher"]
    if role not in valid_roles:
        raise_validation_error(
            UserErrorCode.USER_ROLE_INVALID,
            f"Vai trò phải là: {', '.join(valid_roles)}",
            field="role"
        )
    
    return role


# ============================================================================
# CLASS NAME VALIDATION
# ============================================================================

def validate_class_name(name: Optional[str]) -> str:
    """
    Validate class name
    Non-empty string, max 100 characters
    
    Args:
        name: Class name to validate
    
    Returns:
        Validated class name
    
    Raises:
        ValidationError if invalid
    """
    if not name:
        raise_validation_error(
            ClassErrorCode.CLASS_NAME_REQUIRED,
            "Tên lớp là bắt buộc"
        )
    
    name = name.strip()
    
    if len(name) > 100:
        raise_validation_error(
            ClassErrorCode.CLASS_NAME_REQUIRED,
            "Tên lớp không vượt quá 100 ký tự",
            field="class_name"
        )
    
    return name
