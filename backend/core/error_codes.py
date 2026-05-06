"""
Structured Error Codes for SmartSchool API
Provides consistent error codes and messages across all endpoints
"""

from enum import Enum
from typing import Dict, Any, Optional
from dataclasses import dataclass
from fastapi import HTTPException, status


# ============================================================================
# ERROR CODE ENUMS
# ============================================================================

class AuthErrorCode(str, Enum):
    """Authentication-related error codes"""
    LOGIN_INVALID_CREDENTIALS = "AUTH_001"
    LOGIN_ACCOUNT_INACTIVE = "AUTH_002"
    LOGIN_ACCOUNT_LOCKED = "AUTH_003"
    TOKEN_INVALID = "AUTH_004"
    TOKEN_EXPIRED = "AUTH_005"
    UNAUTHORIZED = "AUTH_006"


class UserErrorCode(str, Enum):
    """User management error codes"""
    USER_NOT_FOUND = "USER_001"
    USER_EMAIL_DUPLICATE = "USER_002"
    USER_USERNAME_DUPLICATE = "USER_003"
    USER_INVALID_EMAIL = "USER_004"
    USER_INVALID_PASSWORD = "USER_005"
    USER_PASSWORD_TOO_WEAK = "USER_006"
    USER_INVALID_USERNAME = "USER_007"
    USER_ROLE_INVALID = "USER_008"
    USER_REQUIRED_FIELD_MISSING = "USER_009"
    USER_CANNOT_DELETE_ADMIN = "USER_010"
    USER_EMAIL_REQUIRED = "USER_011"
    USER_USERNAME_REQUIRED = "USER_012"


class TeacherErrorCode(str, Enum):
    """Teacher management error codes"""
    TEACHER_NOT_FOUND = "TEACHER_001"
    TEACHER_CODE_DUPLICATE = "TEACHER_002"
    TEACHER_EMAIL_DUPLICATE = "TEACHER_003"
    TEACHER_USER_NOT_FOUND = "TEACHER_004"
    TEACHER_USER_ALREADY_LINKED = "TEACHER_005"
    TEACHER_INVALID_DATE_OF_BIRTH = "TEACHER_006"
    TEACHER_INVALID_PHONE = "TEACHER_007"
    TEACHER_INVALID_CODE_FORMAT = "TEACHER_008"
    TEACHER_REQUIRED_FIELD_MISSING = "TEACHER_009"
    TEACHER_INVALID_GENDER = "TEACHER_010"
    TEACHER_CODE_REQUIRED = "TEACHER_011"
    TEACHER_FULL_NAME_REQUIRED = "TEACHER_012"


class SubjectErrorCode(str, Enum):
    """Subject management error codes"""
    SUBJECT_NOT_FOUND = "SUBJECT_001"
    SUBJECT_CODE_DUPLICATE = "SUBJECT_002"
    SUBJECT_INVALID_CODE_FORMAT = "SUBJECT_003"
    SUBJECT_NAME_REQUIRED = "SUBJECT_004"
    SUBJECT_CODE_REQUIRED = "SUBJECT_005"
    SUBJECT_SCORE_CONFIG_INVALID = "SUBJECT_006"
    SUBJECT_COLUMN_KEY_DUPLICATE = "SUBJECT_007"
    SUBJECT_COLUMN_HE_SO_INVALID = "SUBJECT_008"
    SUBJECT_COLUMN_NESTING_TOO_DEEP = "SUBJECT_009"
    SUBJECT_CANNOT_DELETE_WITH_SCORES = "SUBJECT_010"


class ClassErrorCode(str, Enum):
    """Class management error codes"""
    CLASS_NOT_FOUND = "CLASS_001"
    CLASS_NAME_DUPLICATE = "CLASS_002"
    CLASS_INVALID_GRADE = "CLASS_003"
    CLASS_INVALID_ACADEMIC_YEAR = "CLASS_004"
    CLASS_HOMEROOM_TEACHER_NOT_FOUND = "CLASS_005"
    CLASS_HOMEROOM_TEACHER_DUPLICATE = "CLASS_006"
    CLASS_HOMEROOM_TEACHER_INACTIVE = "CLASS_007"
    CLASS_NAME_REQUIRED = "CLASS_008"
    CLASS_GRADE_REQUIRED = "CLASS_009"
    CLASS_ACADEMIC_YEAR_REQUIRED = "CLASS_010"


class ClassSubjectErrorCode(str, Enum):
    """Class-Subject assignment error codes"""
    CLASS_SUBJECT_NOT_FOUND = "CLASSSUBJ_001"
    CLASS_SUBJECT_DUPLICATE = "CLASSSUBJ_002"
    CLASS_SUBJECT_CLASS_NOT_FOUND = "CLASSSUBJ_003"
    CLASS_SUBJECT_SUBJECT_NOT_FOUND = "CLASSSUBJ_004"
    CLASS_SUBJECT_TEACHER_NOT_FOUND = "CLASSSUBJ_005"
    CLASS_SUBJECT_TEACHER_NOT_TEACH_SUBJECT = "CLASSSUBJ_006"
    CLASS_SUBJECT_INVALID_SEMESTER = "CLASSSUBJ_007"
    CLASS_SUBJECT_INVALID_ACADEMIC_YEAR = "CLASSSUBJ_008"
    CLASS_SUBJECT_CANNOT_DELETE_WITH_SCORES = "CLASSSUBJ_009"
    CLASS_SUBJECT_NO_CLASSES_SELECTED = "CLASSSUBJ_010"
    CLASS_SUBJECT_REQUIRED_FIELD_MISSING = "CLASSSUBJ_011"


class SubjectTeacherErrorCode(str, Enum):
    """Subject-Teacher relationship error codes"""
    SUBJECT_TEACHER_NOT_FOUND = "SUBJTEACHER_001"
    SUBJECT_TEACHER_DUPLICATE = "SUBJTEACHER_002"
    SUBJECT_TEACHER_SUBJECT_NOT_FOUND = "SUBJTEACHER_003"
    SUBJECT_TEACHER_TEACHER_NOT_FOUND = "SUBJTEACHER_004"
    SUBJECT_TEACHER_REQUIRED_FIELD_MISSING = "SUBJTEACHER_005"


# ============================================================================
# ERROR MESSAGE TEMPLATES
# ============================================================================

ERROR_MESSAGES = {
    # Auth errors
    AuthErrorCode.LOGIN_INVALID_CREDENTIALS: "Tên đăng nhập/email hoặc mật khẩu không chính xác",
    AuthErrorCode.LOGIN_ACCOUNT_INACTIVE: "Tài khoản này không hoạt động",
    AuthErrorCode.LOGIN_ACCOUNT_LOCKED: "Tài khoản này bị khóa",
    AuthErrorCode.TOKEN_INVALID: "Token không hợp lệ",
    AuthErrorCode.TOKEN_EXPIRED: "Token đã hết hạn",
    AuthErrorCode.UNAUTHORIZED: "Không có quyền thực hiện hành động này",

    # User errors
    UserErrorCode.USER_NOT_FOUND: "Không tìm thấy người dùng",
    UserErrorCode.USER_EMAIL_DUPLICATE: "Email này đã được sử dụng",
    UserErrorCode.USER_USERNAME_DUPLICATE: "Tên đăng nhập này đã tồn tại",
    UserErrorCode.USER_INVALID_EMAIL: "Định dạng email không hợp lệ",
    UserErrorCode.USER_INVALID_PASSWORD: "Mật khẩu không hợp lệ",
    UserErrorCode.USER_PASSWORD_TOO_WEAK: "Mật khẩu quá yếu. Yêu cầu: ít nhất 8 ký tự, 1 hoa, 1 thường, 1 số, 1 ký tự đặc biệt",
    UserErrorCode.USER_INVALID_USERNAME: "Tên đăng nhập chỉ được chứa chữ cái, số, gạch dưới, và phải từ 3-20 ký tự",
    UserErrorCode.USER_ROLE_INVALID: "Vai trò không hợp lệ",
    UserErrorCode.USER_REQUIRED_FIELD_MISSING: "Trường bắt buộc không được để trống",
    UserErrorCode.USER_CANNOT_DELETE_ADMIN: "Không thể xóa tài khoản admin cuối cùng",
    UserErrorCode.USER_EMAIL_REQUIRED: "Email là bắt buộc",
    UserErrorCode.USER_USERNAME_REQUIRED: "Tên đăng nhập là bắt buộc",

    # Teacher errors
    TeacherErrorCode.TEACHER_NOT_FOUND: "Không tìm thấy giáo viên",
    TeacherErrorCode.TEACHER_CODE_DUPLICATE: "Mã giáo viên này đã tồn tại",
    TeacherErrorCode.TEACHER_EMAIL_DUPLICATE: "Email này đã được sử dụng bởi giáo viên khác",
    TeacherErrorCode.TEACHER_USER_NOT_FOUND: "Người dùng được chỉ định không tồn tại",
    TeacherErrorCode.TEACHER_USER_ALREADY_LINKED: "Người dùng này đã được liên kết với giáo viên khác",
    TeacherErrorCode.TEACHER_INVALID_DATE_OF_BIRTH: "Ngày sinh không hợp lệ",
    TeacherErrorCode.TEACHER_INVALID_PHONE: "Số điện thoại không hợp lệ. Yêu cầu: 10-11 chữ số",
    TeacherErrorCode.TEACHER_INVALID_CODE_FORMAT: "Mã giáo viên không hợp lệ. Yêu cầu: 5-20 ký tự alphanumeric",
    TeacherErrorCode.TEACHER_REQUIRED_FIELD_MISSING: "Trường bắt buộc không được để trống",
    TeacherErrorCode.TEACHER_INVALID_GENDER: "Giới tính không hợp lệ. Giá trị: M, F, Other",
    TeacherErrorCode.TEACHER_CODE_REQUIRED: "Mã giáo viên là bắt buộc",
    TeacherErrorCode.TEACHER_FULL_NAME_REQUIRED: "Họ tên giáo viên là bắt buộc",

    # Subject errors
    SubjectErrorCode.SUBJECT_NOT_FOUND: "Không tìm thấy môn học",
    SubjectErrorCode.SUBJECT_CODE_DUPLICATE: "Mã môn học này đã tồn tại",
    SubjectErrorCode.SUBJECT_INVALID_CODE_FORMAT: "Mã môn học không hợp lệ. Yêu cầu: 2-10 ký tự alphanumeric",
    SubjectErrorCode.SUBJECT_NAME_REQUIRED: "Tên môn học là bắt buộc",
    SubjectErrorCode.SUBJECT_CODE_REQUIRED: "Mã môn học là bắt buộc",
    SubjectErrorCode.SUBJECT_SCORE_CONFIG_INVALID: "Cấu hình cột điểm không hợp lệ",
    SubjectErrorCode.SUBJECT_COLUMN_KEY_DUPLICATE: "Khóa cột điểm bị trùng lặp",
    SubjectErrorCode.SUBJECT_COLUMN_HE_SO_INVALID: "Hệ số phải là số dương từ 0.5 đến 10",
    SubjectErrorCode.SUBJECT_COLUMN_NESTING_TOO_DEEP: "Cấu trúc cột điểm quá sâu (tối đa 2 cấp)",
    SubjectErrorCode.SUBJECT_CANNOT_DELETE_WITH_SCORES: "Không thể xóa môn học này vì đã có điểm",

    # Class errors
    ClassErrorCode.CLASS_NOT_FOUND: "Không tìm thấy lớp học",
    ClassErrorCode.CLASS_NAME_DUPLICATE: "Tên lớp này đã tồn tại trong năm học này",
    ClassErrorCode.CLASS_INVALID_GRADE: "Khối lớp không hợp lệ. Giá trị: 10-12",
    ClassErrorCode.CLASS_INVALID_ACADEMIC_YEAR: "Năm học không hợp lệ. Định dạng: YYYY-YYYY (vd: 2024-2025)",
    ClassErrorCode.CLASS_HOMEROOM_TEACHER_NOT_FOUND: "Giáo viên chủ nhiệm không tồn tại",
    ClassErrorCode.CLASS_HOMEROOM_TEACHER_DUPLICATE: "Giáo viên này đã là chủ nhiệm của lớp khác trong năm học này",
    ClassErrorCode.CLASS_HOMEROOM_TEACHER_INACTIVE: "Giáo viên chủ nhiệm không hoạt động",
    ClassErrorCode.CLASS_NAME_REQUIRED: "Tên lớp là bắt buộc",
    ClassErrorCode.CLASS_GRADE_REQUIRED: "Khối lớp là bắt buộc",
    ClassErrorCode.CLASS_ACADEMIC_YEAR_REQUIRED: "Năm học là bắt buộc",

    # Class-Subject errors
    ClassSubjectErrorCode.CLASS_SUBJECT_NOT_FOUND: "Không tìm thấy phân công môn học cho lớp",
    ClassSubjectErrorCode.CLASS_SUBJECT_DUPLICATE: "Môn học này đã được phân công cho lớp này",
    ClassSubjectErrorCode.CLASS_SUBJECT_CLASS_NOT_FOUND: "Lớp không tồn tại",
    ClassSubjectErrorCode.CLASS_SUBJECT_SUBJECT_NOT_FOUND: "Môn học không tồn tại",
    ClassSubjectErrorCode.CLASS_SUBJECT_TEACHER_NOT_FOUND: "Giáo viên không tồn tại",
    ClassSubjectErrorCode.CLASS_SUBJECT_TEACHER_NOT_TEACH_SUBJECT: "Giáo viên này không dạy môn học này",
    ClassSubjectErrorCode.CLASS_SUBJECT_INVALID_SEMESTER: "Học kỳ không hợp lệ. Giá trị: 1, 2",
    ClassSubjectErrorCode.CLASS_SUBJECT_INVALID_ACADEMIC_YEAR: "Năm học không hợp lệ",
    ClassSubjectErrorCode.CLASS_SUBJECT_CANNOT_DELETE_WITH_SCORES: "Không thể xóa phân công này vì đã có điểm",
    ClassSubjectErrorCode.CLASS_SUBJECT_NO_CLASSES_SELECTED: "Phải chọn ít nhất một lớp",
    ClassSubjectErrorCode.CLASS_SUBJECT_REQUIRED_FIELD_MISSING: "Trường bắt buộc không được để trống",

    # Subject-Teacher errors
    SubjectTeacherErrorCode.SUBJECT_TEACHER_NOT_FOUND: "Không tìm thấy mối quan hệ giáo viên-môn học",
    SubjectTeacherErrorCode.SUBJECT_TEACHER_DUPLICATE: "Giáo viên này đã dạy môn học này rồi",
    SubjectTeacherErrorCode.SUBJECT_TEACHER_SUBJECT_NOT_FOUND: "Môn học không tồn tại",
    SubjectTeacherErrorCode.SUBJECT_TEACHER_TEACHER_NOT_FOUND: "Giáo viên không tồn tại",
    SubjectTeacherErrorCode.SUBJECT_TEACHER_REQUIRED_FIELD_MISSING: "Trường bắt buộc không được để trống",
}

# ============================================================================
# HTTP STATUS CODE MAPPING
# ============================================================================

ERROR_STATUS_CODES = {
    # Auth errors
    AuthErrorCode.LOGIN_INVALID_CREDENTIALS: status.HTTP_401_UNAUTHORIZED,
    AuthErrorCode.LOGIN_ACCOUNT_INACTIVE: status.HTTP_401_UNAUTHORIZED,
    AuthErrorCode.LOGIN_ACCOUNT_LOCKED: status.HTTP_401_UNAUTHORIZED,
    AuthErrorCode.TOKEN_INVALID: status.HTTP_401_UNAUTHORIZED,
    AuthErrorCode.TOKEN_EXPIRED: status.HTTP_401_UNAUTHORIZED,
    AuthErrorCode.UNAUTHORIZED: status.HTTP_403_FORBIDDEN,

    # User errors
    UserErrorCode.USER_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    UserErrorCode.USER_EMAIL_DUPLICATE: status.HTTP_409_CONFLICT,
    UserErrorCode.USER_USERNAME_DUPLICATE: status.HTTP_409_CONFLICT,
    UserErrorCode.USER_INVALID_EMAIL: status.HTTP_400_BAD_REQUEST,
    UserErrorCode.USER_INVALID_PASSWORD: status.HTTP_400_BAD_REQUEST,
    UserErrorCode.USER_PASSWORD_TOO_WEAK: status.HTTP_400_BAD_REQUEST,
    UserErrorCode.USER_INVALID_USERNAME: status.HTTP_400_BAD_REQUEST,
    UserErrorCode.USER_ROLE_INVALID: status.HTTP_400_BAD_REQUEST,
    UserErrorCode.USER_REQUIRED_FIELD_MISSING: status.HTTP_400_BAD_REQUEST,
    UserErrorCode.USER_CANNOT_DELETE_ADMIN: status.HTTP_409_CONFLICT,
    UserErrorCode.USER_EMAIL_REQUIRED: status.HTTP_400_BAD_REQUEST,
    UserErrorCode.USER_USERNAME_REQUIRED: status.HTTP_400_BAD_REQUEST,

    # Teacher errors
    TeacherErrorCode.TEACHER_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    TeacherErrorCode.TEACHER_CODE_DUPLICATE: status.HTTP_409_CONFLICT,
    TeacherErrorCode.TEACHER_EMAIL_DUPLICATE: status.HTTP_409_CONFLICT,
    TeacherErrorCode.TEACHER_USER_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    TeacherErrorCode.TEACHER_USER_ALREADY_LINKED: status.HTTP_409_CONFLICT,
    TeacherErrorCode.TEACHER_INVALID_DATE_OF_BIRTH: status.HTTP_400_BAD_REQUEST,
    TeacherErrorCode.TEACHER_INVALID_PHONE: status.HTTP_400_BAD_REQUEST,
    TeacherErrorCode.TEACHER_INVALID_CODE_FORMAT: status.HTTP_400_BAD_REQUEST,
    TeacherErrorCode.TEACHER_REQUIRED_FIELD_MISSING: status.HTTP_400_BAD_REQUEST,
    TeacherErrorCode.TEACHER_INVALID_GENDER: status.HTTP_400_BAD_REQUEST,
    TeacherErrorCode.TEACHER_CODE_REQUIRED: status.HTTP_400_BAD_REQUEST,
    TeacherErrorCode.TEACHER_FULL_NAME_REQUIRED: status.HTTP_400_BAD_REQUEST,

    # Subject errors
    SubjectErrorCode.SUBJECT_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    SubjectErrorCode.SUBJECT_CODE_DUPLICATE: status.HTTP_409_CONFLICT,
    SubjectErrorCode.SUBJECT_INVALID_CODE_FORMAT: status.HTTP_400_BAD_REQUEST,
    SubjectErrorCode.SUBJECT_NAME_REQUIRED: status.HTTP_400_BAD_REQUEST,
    SubjectErrorCode.SUBJECT_CODE_REQUIRED: status.HTTP_400_BAD_REQUEST,
    SubjectErrorCode.SUBJECT_SCORE_CONFIG_INVALID: status.HTTP_400_BAD_REQUEST,
    SubjectErrorCode.SUBJECT_COLUMN_KEY_DUPLICATE: status.HTTP_400_BAD_REQUEST,
    SubjectErrorCode.SUBJECT_COLUMN_HE_SO_INVALID: status.HTTP_400_BAD_REQUEST,
    SubjectErrorCode.SUBJECT_COLUMN_NESTING_TOO_DEEP: status.HTTP_400_BAD_REQUEST,
    SubjectErrorCode.SUBJECT_CANNOT_DELETE_WITH_SCORES: status.HTTP_409_CONFLICT,

    # Class errors
    ClassErrorCode.CLASS_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    ClassErrorCode.CLASS_NAME_DUPLICATE: status.HTTP_409_CONFLICT,
    ClassErrorCode.CLASS_INVALID_GRADE: status.HTTP_400_BAD_REQUEST,
    ClassErrorCode.CLASS_INVALID_ACADEMIC_YEAR: status.HTTP_400_BAD_REQUEST,
    ClassErrorCode.CLASS_HOMEROOM_TEACHER_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    ClassErrorCode.CLASS_HOMEROOM_TEACHER_DUPLICATE: status.HTTP_409_CONFLICT,
    ClassErrorCode.CLASS_HOMEROOM_TEACHER_INACTIVE: status.HTTP_400_BAD_REQUEST,
    ClassErrorCode.CLASS_NAME_REQUIRED: status.HTTP_400_BAD_REQUEST,
    ClassErrorCode.CLASS_GRADE_REQUIRED: status.HTTP_400_BAD_REQUEST,
    ClassErrorCode.CLASS_ACADEMIC_YEAR_REQUIRED: status.HTTP_400_BAD_REQUEST,

    # Class-Subject errors
    ClassSubjectErrorCode.CLASS_SUBJECT_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    ClassSubjectErrorCode.CLASS_SUBJECT_DUPLICATE: status.HTTP_409_CONFLICT,
    ClassSubjectErrorCode.CLASS_SUBJECT_CLASS_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    ClassSubjectErrorCode.CLASS_SUBJECT_SUBJECT_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    ClassSubjectErrorCode.CLASS_SUBJECT_TEACHER_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    ClassSubjectErrorCode.CLASS_SUBJECT_TEACHER_NOT_TEACH_SUBJECT: status.HTTP_400_BAD_REQUEST,
    ClassSubjectErrorCode.CLASS_SUBJECT_INVALID_SEMESTER: status.HTTP_400_BAD_REQUEST,
    ClassSubjectErrorCode.CLASS_SUBJECT_INVALID_ACADEMIC_YEAR: status.HTTP_400_BAD_REQUEST,
    ClassSubjectErrorCode.CLASS_SUBJECT_CANNOT_DELETE_WITH_SCORES: status.HTTP_409_CONFLICT,
    ClassSubjectErrorCode.CLASS_SUBJECT_NO_CLASSES_SELECTED: status.HTTP_400_BAD_REQUEST,
    ClassSubjectErrorCode.CLASS_SUBJECT_REQUIRED_FIELD_MISSING: status.HTTP_400_BAD_REQUEST,

    # Subject-Teacher errors
    SubjectTeacherErrorCode.SUBJECT_TEACHER_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    SubjectTeacherErrorCode.SUBJECT_TEACHER_DUPLICATE: status.HTTP_409_CONFLICT,
    SubjectTeacherErrorCode.SUBJECT_TEACHER_SUBJECT_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    SubjectTeacherErrorCode.SUBJECT_TEACHER_TEACHER_NOT_FOUND: status.HTTP_404_NOT_FOUND,
    SubjectTeacherErrorCode.SUBJECT_TEACHER_REQUIRED_FIELD_MISSING: status.HTTP_400_BAD_REQUEST,
}

# ============================================================================
# STRUCTURED ERROR RESPONSE
# ============================================================================

@dataclass
class ErrorResponse:
    """Structured error response"""
    success: bool = False
    code: str = ""
    message: str = ""
    detail: Optional[str] = None
    field: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON response"""
        result = {
            "success": self.success,
            "code": self.code,
            "message": self.message,
        }
        if self.detail:
            result["detail"] = self.detail
        if self.field:
            result["field"] = self.field
        return result

    def to_http_exception(self) -> HTTPException:
        """Convert to HTTPException"""
        status_code = ERROR_STATUS_CODES.get(
            self.code,
            status.HTTP_400_BAD_REQUEST
        )
        return HTTPException(
            status_code=status_code,
            detail=self.to_dict()
        )


def create_error_response(
    error_code: str,
    detail: Optional[str] = None,
    field: Optional[str] = None
) -> ErrorResponse:
    """
    Create a structured error response
    
    Args:
        error_code: Error code from one of the Enum classes
        detail: Additional detail message
        field: Field name that caused the error
    
    Returns:
        ErrorResponse object
    """
    message = ERROR_MESSAGES.get(error_code, "Lỗi không xác định")
    return ErrorResponse(
        success=False,
        code=error_code,
        message=message,
        detail=detail,
        field=field
    )


def raise_validation_error(
    error_code: str,
    detail: Optional[str] = None,
    field: Optional[str] = None
) -> None:
    """
    Raise a validation error with proper error code
    
    Args:
        error_code: Error code from one of the Enum classes
        detail: Additional detail message
        field: Field name that caused the error
    
    Raises:
        HTTPException with error response
    """
    error_response = create_error_response(error_code, detail, field)
    raise error_response.to_http_exception()
