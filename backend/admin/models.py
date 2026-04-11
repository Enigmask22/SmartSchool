"""
Pydantic models cho Admin module
"""

from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    username: Optional[str] = None
    full_name: str
    password: Optional[str] = "defaultpassword"
    role: str
    is_active: Optional[bool] = True

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class TeacherCreate(BaseModel):
    user_id: Optional[int] = None
    teacher_code: Optional[str] = None
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None

class TeacherUpdate(BaseModel):
    teacher_code: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None

class SubjectCreate(BaseModel):
    subject_code: str
    subject_name: str
    description: Optional[str] = None
    is_mandatory: Optional[bool] = False
    is_active: Optional[bool] = True

class SubjectUpdate(BaseModel):
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    description: Optional[str] = None
    is_mandatory: Optional[bool] = None
    is_active: Optional[bool] = None

class ClassCreate(BaseModel):
    class_name: str
    grade: int
    homeroom_teacher_id: Optional[int] = None
    room_number: Optional[str] = None
    academic_year: str
    is_active: Optional[bool] = True

class ClassUpdate(BaseModel):
    class_name: Optional[str] = None
    grade: Optional[int] = None
    homeroom_teacher_id: Optional[int] = None
    room_number: Optional[str] = None
    academic_year: Optional[str] = None
    is_active: Optional[bool] = None

class SubjectTeacherCreate(BaseModel):
    teacher_id: int
    subject_id: int
    is_active: Optional[bool] = True

class SubjectTeacherUpdate(BaseModel):
    teacher_id: Optional[int] = None
    subject_id: Optional[int] = None
    is_active: Optional[bool] = None

class ClassSubjectCreate(BaseModel):
    class_id: int
    subject_id: int
    teacher_id: Optional[int] = None
    academic_year: str
    semester: str
    is_active: Optional[bool] = True

class ClassSubjectBulkCreate(BaseModel):
    """Bulk create class-subject assignments for multiple classes at once"""
    class_ids: List[int]  # Multiple classes
    subject_id: int
    teacher_id: Optional[int] = None
    academic_year: str
    semester: str
    is_active: Optional[bool] = True

class ClassSubjectUpdate(BaseModel):
    class_id: Optional[int] = None
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None
    academic_year: Optional[str] = None
    semester: Optional[str] = None
    is_active: Optional[bool] = None

class ClassSubjectBulkUpdate(BaseModel):
    """Bulk update for class assignments - allows changing which classes are assigned"""
    record_ids: List[int]  # Array of class_subject record IDs in the group
    teacher_id: int
    subject_id: int
    academic_year: str
    semester: str
    selected_class_ids: List[int]  # New set of class IDs to assign

class StudentCreate(BaseModel):
    student_id: str
    full_name: str
    date_of_birth: str
    gender: str
    class_name: str
    grade: str
    class_id: Optional[int] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    parent_contacts: Optional[list] = None
    address: Optional[str] = None
    is_active: Optional[bool] = True

class StudentUpdate(BaseModel):
    student_id: Optional[str] = None
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    class_name: Optional[str] = None
    grade: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    parent_contacts: Optional[list] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

class StudentImportRecord(BaseModel):
    ho_va_ten: str
    email: Optional[str] = None
    so_dien_thoai: Optional[str] = None
    lop_hoc: str
    khoi: str
    ngay_sinh: Optional[str] = None
    ten_phu_huynh: Optional[str] = None
    sdt_phu_huynh: Optional[str] = None
    ten_bo: Optional[str] = None
    sdt_bo: Optional[str] = None
    ten_me: Optional[str] = None
    sdt_me: Optional[str] = None
    parent_contacts: Optional[list] = None
    dia_chi: Optional[str] = None
    gioi_tinh: str = "Nam"

class BulkStudentImport(BaseModel):
    students: List[StudentImportRecord]
    academic_year: Optional[str] = None
    class_id: Optional[int] = None

class ResponseModel(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None
