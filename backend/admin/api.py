"""
API Router cho Admin management
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Optional, List
from datetime import datetime
import bcrypt

from admin.models import (
    UserCreate, UserUpdate, TeacherCreate, TeacherUpdate,
    SubjectCreate, SubjectUpdate, ClassCreate, ClassUpdate,
    SubjectTeacherCreate, SubjectTeacherUpdate,
    ClassSubjectCreate, ClassSubjectBulkCreate, ClassSubjectUpdate, ClassSubjectBulkUpdate,
    StudentCreate, StudentUpdate, BulkStudentImport,
    ResponseModel
)
from admin.services import generate_student_id
from admin.validators import (
    validate_teacher_code, validate_full_name, validate_email,
    validate_phone, validate_date_of_birth, validate_gender,
    validate_subject_code, validate_subject_name, validate_score_column_config,
    validate_username, validate_password, validate_role, validate_academic_year,
    validate_class_name, validate_grade, validate_semester
)
from core.database import get_db
from core.logger import setup_logger
from core.dependencies import get_current_user
from core.system_settings import get_current_academic_year, clear_settings_cache
from core.errors import handle_database_error
from core.error_codes import (
    TeacherErrorCode, SubjectErrorCode, UserErrorCode, ClassErrorCode,
    ClassSubjectErrorCode, SubjectTeacherErrorCode, raise_validation_error
)

logger = setup_logger("admin_api")
router = APIRouter()


def get_admin_user(current_user=Depends(get_current_user)):
    """Verify current user is admin"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ admin mới có quyền truy cập"
        )
    return current_user


# ===============================================
# USERS CRUD ENDPOINTS
# ===============================================

@router.get("/users")
async def get_all_users(
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy danh sách tất cả người dùng"""
    try:
        response = db.table("users").select(
            "id, email, username, full_name, role, is_active, can_edit_grade, can_edit_attendance, last_login, created_at, updated_at"
        ).order("created_at", desc=True).execute()
        
        return {"success": True, "data": response.data}
    except Exception as e:
        logger.error(f"Error getting users: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách người dùng: {str(e)}")


@router.post("/users")
async def create_user(
    user_data: UserCreate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Tạo người dùng mới"""
    try:
        # Validate required fields
        email = validate_email(user_data.email)
        password = validate_password(user_data.password, strict=False)
        full_name = validate_full_name(user_data.full_name)
        role = validate_role(user_data.role)
        
        # Check email uniqueness
        existing_email = db.table("users").select("id").eq("email", email).execute()
        if existing_email.data:
            raise_validation_error(
                UserErrorCode.USER_EMAIL_DUPLICATE,
                f"Email '{email}' này đã được sử dụng",
                field="email"
            )
        
        # Validate and check username uniqueness if provided
        if user_data.username:
            username = validate_username(user_data.username)
            existing_username = db.table("users").select("id").eq("username", username).execute()
            if existing_username.data:
                raise_validation_error(
                    UserErrorCode.USER_USERNAME_DUPLICATE,
                    f"Tên đăng nhập '{username}' này đã tồn tại",
                    field="username"
                )
        else:
            username = None
        
        # Hash password
        password_hash = bcrypt.hashpw(
            password.encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')
        
        # Create user
        data = {
            "email": email,
            "password_hash": password_hash,
            "full_name": full_name,
            "role": role,
            "is_active": user_data.is_active,
            "can_edit_grade": bool(user_data.can_edit_grade) if user_data.can_edit_grade is not None else False,
            "can_edit_attendance": bool(user_data.can_edit_attendance) if user_data.can_edit_attendance is not None else False,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        if username:
            data["username"] = username
        
        response = db.table("users").insert(data).execute()
        
        if response.data:
            new_user = response.data[0]
            new_user.pop("password_hash", None)
            return {"success": True, "data": new_user, "message": "Tạo người dùng thành công"}
        else:
            raise HTTPException(status_code=500, detail="Không thể tạo người dùng")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise handle_database_error(e)


@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Cập nhật thông tin người dùng (với sync tự động sang teachers table)"""
    try:
        # Check if user exists
        user_check = db.table("users").select("id").eq("id", user_id).execute()
        if not user_check.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        
        # Validate optional fields if provided
        if user_data.email:
            user_data.email = validate_email(user_data.email)
            # Check email uniqueness - exclude this user
            existing_email = db.table("users").select("id").eq("email", user_data.email).neq("id", user_id).execute()
            if existing_email.data:
                raise_validation_error(
                    UserErrorCode.USER_EMAIL_DUPLICATE,
                    f"Email '{user_data.email}' này đã được sử dụng",
                    field="email"
                )
        
        if user_data.username:
            user_data.username = validate_username(user_data.username)
            # Check username uniqueness - exclude this user
            existing_username = db.table("users").select("id").eq("username", user_data.username).neq("id", user_id).execute()
            if existing_username.data:
                raise_validation_error(
                    UserErrorCode.USER_USERNAME_DUPLICATE,
                    f"Tên đăng nhập '{user_data.username}' này đã tồn tại",
                    field="username"
                )
        
        if user_data.password:
            user_data.password = validate_password(user_data.password, strict=False)
        
        if user_data.role:
            user_data.role = validate_role(user_data.role)
        
        # Build update data
        update_data = {}
        if user_data.email:
            update_data["email"] = user_data.email
        if user_data.username:
            update_data["username"] = user_data.username
        if user_data.full_name:
            update_data["full_name"] = user_data.full_name
        if user_data.role:
            update_data["role"] = user_data.role
        if user_data.is_active is not None:
            update_data["is_active"] = user_data.is_active
        if user_data.password:
            update_data["password_hash"] = bcrypt.hashpw(
                user_data.password.encode('utf-8'),
                bcrypt.gensalt()
            ).decode('utf-8')
        if user_data.can_edit_grade is not None:
            update_data["can_edit_grade"] = user_data.can_edit_grade
        if user_data.can_edit_attendance is not None:
            update_data["can_edit_attendance"] = user_data.can_edit_attendance
        
        update_data["updated_at"] = datetime.now().isoformat()
        
        # Update users table
        response = db.table("users").update(update_data).eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        
        # Sync full_name and email to teachers table if this user is a teacher
        # Find if there's a teacher record with this user_id
        teacher_check = db.table("teachers").select("id").eq("user_id", user_id).execute()
        if teacher_check.data:
            teacher_id = teacher_check.data[0]["id"]
            teacher_sync_data = {"updated_at": datetime.now().isoformat()}
            
            if user_data.full_name:
                teacher_sync_data["full_name"] = user_data.full_name
            if user_data.email:
                teacher_sync_data["email"] = user_data.email
            
            if teacher_sync_data:  # Only sync if there's data to update
                db.table("teachers").update(teacher_sync_data).eq("id", teacher_id).execute()
                logger.info(f"✅ Synced user update ({user_id}) to teacher ({teacher_id}): {teacher_sync_data}")
        
        updated_user = response.data[0]
        updated_user.pop("password_hash", None)
        return {"success": True, "data": updated_user, "message": "Cập nhật người dùng thành công"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        raise handle_database_error(e)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Soft delete người dùng (set is_active = false) and cascade to related records"""
    try:
        # Kiểm tra xem user có tồn tại không
        user_check = db.table("users").select("id, role").eq("id", user_id).execute()
        if not user_check.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        
        user = user_check.data[0]
        
        # Soft delete user
        response = db.table("users").update({
            "is_active": False,
            "updated_at": datetime.now().isoformat()
        }).eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Lỗi khi xóa người dùng")
        
        # If user is a teacher, also soft delete the teacher record
        if user.get("role") in ["teacher", "homeroom_teacher"]:
            teacher_record = db.table("teachers").select("id").eq("user_id", user_id).execute()
            if teacher_record.data:
                db.table("teachers").update({
                    "is_active": False,
                    "updated_at": datetime.now().isoformat()
                }).eq("user_id", user_id).execute()
        
        return {"success": True, "message": "Xóa người dùng thành công (soft delete)"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error soft deleting user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa người dùng: {str(e)}")


@router.post("/users/{user_id}/restore")
async def restore_user(
    user_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Khôi phục người dùng đã bị soft delete và cascade to related records"""
    try:
        # Kiểm tra xem user có tồn tại không
        user_check = db.table("users").select("id, role").eq("id", user_id).execute()
        if not user_check.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        
        user = user_check.data[0]
        
        # Restore user
        response = db.table("users").update({
            "is_active": True,
            "updated_at": datetime.now().isoformat()
        }).eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Lỗi khi khôi phục người dùng")
        
        # If user is a teacher, also restore the teacher record
        if user.get("role") in ["teacher", "homeroom_teacher"]:
            teacher_record = db.table("teachers").select("id").eq("user_id", user_id).execute()
            if teacher_record.data:
                db.table("teachers").update({
                    "is_active": True,
                    "updated_at": datetime.now().isoformat()
                }).eq("user_id", user_id).execute()
        
        return {"success": True, "message": "Khôi phục người dùng thành công"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error restoring user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi khôi phục người dùng: {str(e)}")


@router.delete("/users/{user_id}/permanent")
async def permanent_delete_user(
    user_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Xóa vĩnh viễn người dùng (hard delete với cascade)"""
    try:
        # Kiểm tra xem user có tồn tại không
        user_check = db.table("users").select("id, role").eq("id", user_id).execute()
        if not user_check.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        
        user = user_check.data[0]
        
        # Nếu là teacher, xóa teacher record trước
        if user.get("role") in ["teacher", "homeroom_teacher"]:
            # Check xem teacher có phải homeroom teacher không
            teacher_record = db.table("teachers").select("id").eq("user_id", user_id).execute()
            if teacher_record.data:
                teacher_id = teacher_record.data[0]["id"]
                
                # Set homeroom_teacher_id = null cho các lớp
                db.table("classes").update({"homeroom_teacher_id": None}).eq("homeroom_teacher_id", teacher_id).execute()
                
                # Xóa teacher record
                db.table("teachers").delete().eq("user_id", user_id).execute()
        
        # Nếu là student, xóa student record và related data
        elif user.get("role") == "student":
            # Lấy student records
            student_records = db.table("students").select("id").eq("user_id", user_id).execute()
            if student_records.data:
                for student in student_records.data:
                    student_id = student["id"]
                    # Xóa các bản ghi liên quan
                    db.table("attendance").delete().eq("student_id", student_id).execute()
                    db.table("scores").delete().eq("student_id", student_id).execute()
                
                # Xóa student record
                db.table("students").delete().eq("user_id", user_id).execute()
        
        # Cuối cùng xóa user
        response = db.table("users").delete().eq("id", user_id).execute()
        
        if response.data:
            return {"success": True, "message": "Xóa vĩnh viễn người dùng thành công"}
        else:
            raise HTTPException(status_code=500, detail="Lỗi khi xóa vĩnh viễn người dùng")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error permanently deleting user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa vĩnh viễn người dùng: {str(e)}")


# ===============================================
# TEACHERS CRUD ENDPOINTS
# ===============================================

@router.get("/teachers")
async def get_all_teachers(
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy danh sách tất cả giáo viên"""
    try:
        response = db.table("teachers").select(
            "id, teacher_code, full_name, email, phone, date_of_birth, gender, "
            "is_active, created_at, updated_at, user_id, "
            "users:user_id(id, email, username, full_name, role)"
        ).order("created_at", desc=True).execute()
        
        # Return raw data - let frontend handle display formatting
        return {"success": True, "data": response.data}
    except Exception as e:
        logger.error(f"Error getting teachers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách giáo viên: {str(e)}")


@router.post("/teachers")
async def create_teacher(
    teacher_data: TeacherCreate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Tạo giáo viên mới với validation"""
    try:
        # Validate required fields
        full_name = validate_full_name(teacher_data.full_name)
        
        # Validate optional fields if provided
        if teacher_data.teacher_code:
            teacher_code = validate_teacher_code(teacher_data.teacher_code)
        
        if teacher_data.email:
            email = validate_email(teacher_data.email)
        
        if teacher_data.phone:
            phone = validate_phone(teacher_data.phone)
        
        if teacher_data.date_of_birth:
            dob = validate_date_of_birth(teacher_data.date_of_birth)
        
        if teacher_data.gender:
            gender = validate_gender(teacher_data.gender)
        
        # Validate user_id if provided
        if teacher_data.user_id:
            # Check if user exists
            user_response = db.table("users").select("id, is_active").eq("id", teacher_data.user_id).execute()
            if not user_response.data:
                raise_validation_error(
                    TeacherErrorCode.TEACHER_USER_NOT_FOUND,
                    f"Người dùng với ID {teacher_data.user_id} không tồn tại",
                    field="user_id"
                )
            
            # Check if user is already linked to another teacher
            existing_teacher = db.table("teachers").select("id").eq("user_id", teacher_data.user_id).execute()
            if existing_teacher.data:
                raise_validation_error(
                    TeacherErrorCode.TEACHER_USER_ALREADY_LINKED,
                    f"Người dùng này đã được liên kết với giáo viên khác",
                    field="user_id"
                )
        
        data = {
            "full_name": full_name,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        if teacher_data.user_id:
            data["user_id"] = teacher_data.user_id
        if teacher_data.teacher_code:
            data["teacher_code"] = teacher_code
        if teacher_data.email:
            data["email"] = email
        if teacher_data.phone:
            data["phone"] = phone
        if teacher_data.date_of_birth:
            data["date_of_birth"] = dob
        if teacher_data.gender:
            data["gender"] = gender
        
        response = db.table("teachers").insert(data).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Tạo giáo viên thành công"}
        else:
            raise HTTPException(status_code=500, detail="Không thể tạo giáo viên")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating teacher: {str(e)}")
        raise handle_database_error(e)


@router.put("/teachers/{teacher_id}")
async def update_teacher(
    teacher_id: int,
    teacher_data: TeacherUpdate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Cập nhật thông tin giáo viên (với sync tự động sang users table)"""
    try:
        # Lấy thông tin giáo viên hiện tại (đặc biệt là user_id)
        teacher_current = db.table("teachers").select("id, user_id").eq("id", teacher_id).execute()
        if not teacher_current.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy giáo viên")
        
        teacher = teacher_current.data[0]
        current_user_id = teacher.get("user_id")
        
        # Validate optional fields if provided
        if teacher_data.full_name:
            teacher_data.full_name = validate_full_name(teacher_data.full_name)
        
        if teacher_data.teacher_code:
            teacher_data.teacher_code = validate_teacher_code(teacher_data.teacher_code)
        
        if teacher_data.email:
            teacher_data.email = validate_email(teacher_data.email)
        
        if teacher_data.phone:
            teacher_data.phone = validate_phone(teacher_data.phone)
        
        if teacher_data.date_of_birth:
            teacher_data.date_of_birth = validate_date_of_birth(teacher_data.date_of_birth)
        
        if teacher_data.gender:
            teacher_data.gender = validate_gender(teacher_data.gender)
        
        # Validate user_id if being changed
        if teacher_data.user_id and teacher_data.user_id != current_user_id:
            # Check if new user exists
            user_response = db.table("users").select("id, is_active").eq("id", teacher_data.user_id).execute()
            if not user_response.data:
                raise_validation_error(
                    TeacherErrorCode.TEACHER_USER_NOT_FOUND,
                    f"Người dùng với ID {teacher_data.user_id} không tồn tại",
                    field="user_id"
                )
            
            # Check if new user is already linked to another teacher (exclude this teacher)
            existing_teacher = db.table("teachers").select("id").eq("user_id", teacher_data.user_id).neq("id", teacher_id).execute()
            if existing_teacher.data:
                raise_validation_error(
                    TeacherErrorCode.TEACHER_USER_ALREADY_LINKED,
                    f"Người dùng này đã được liên kết với giáo viên khác",
                    field="user_id"
                )
        
        update_data = {"updated_at": datetime.now().isoformat()}
        
        if teacher_data.teacher_code:
            update_data["teacher_code"] = teacher_data.teacher_code
        if teacher_data.full_name:
            update_data["full_name"] = teacher_data.full_name
        if teacher_data.email:
            update_data["email"] = teacher_data.email
        if teacher_data.phone:
            update_data["phone"] = teacher_data.phone
        if teacher_data.date_of_birth:
            update_data["date_of_birth"] = str(teacher_data.date_of_birth)
        if teacher_data.gender:
            update_data["gender"] = teacher_data.gender
        if teacher_data.user_id:
            update_data["user_id"] = teacher_data.user_id
        
        # Update teachers table
        response = db.table("teachers").update(update_data).eq("id", teacher_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy giáo viên")
        
        # Sync full_name and email to users table if teacher has user_id
        user_id = teacher_data.user_id or current_user_id
        if user_id:
            user_sync_data = {"updated_at": datetime.now().isoformat()}
            if teacher_data.full_name:
                user_sync_data["full_name"] = teacher_data.full_name
            if teacher_data.email:
                user_sync_data["email"] = teacher_data.email
            
            if user_sync_data:  # Only sync if there's data to update
                db.table("users").update(user_sync_data).eq("id", user_id).execute()
                logger.info(f"✅ Synced teacher update ({teacher_id}) to user ({user_id}): {user_sync_data}")
        
        return {"success": True, "data": response.data[0], "message": "Cập nhật giáo viên thành công"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating teacher: {str(e)}")
        raise handle_database_error(e)


@router.delete("/teachers/{teacher_id}")
async def delete_teacher(
    teacher_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Soft delete giáo viên (set is_active = false) and cascade to user record"""
    try:
        # Kiểm tra xem teacher có tồn tại không
        teacher_check = db.table("teachers").select("id, user_id").eq("id", teacher_id).execute()
        if not teacher_check.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy giáo viên")
        
        teacher = teacher_check.data[0]
        
        # Soft delete teacher
        response = db.table("teachers").update({
            "is_active": False,
            "updated_at": datetime.now().isoformat()
        }).eq("id", teacher_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Lỗi khi xóa giáo viên")
        
        # Also soft delete the corresponding user record
        if teacher.get("user_id"):
            db.table("users").update({
                "is_active": False,
                "updated_at": datetime.now().isoformat()
            }).eq("id", teacher.get("user_id")).execute()
        
        return {"success": True, "message": "Xóa giáo viên thành công (soft delete)"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error soft deleting teacher: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa giáo viên: {str(e)}")


@router.post("/teachers/{teacher_id}/restore")
async def restore_teacher(
    teacher_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Khôi phục giáo viên đã bị soft delete và cascade to user record"""
    try:
        # Kiểm tra xem teacher có tồn tại không
        teacher_check = db.table("teachers").select("id, user_id").eq("id", teacher_id).execute()
        if not teacher_check.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy giáo viên")
        
        teacher = teacher_check.data[0]
        
        # Restore teacher
        response = db.table("teachers").update({
            "is_active": True,
            "updated_at": datetime.now().isoformat()
        }).eq("id", teacher_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Lỗi khi khôi phục giáo viên")
        
        # Also restore the corresponding user record
        if teacher.get("user_id"):
            db.table("users").update({
                "is_active": True,
                "updated_at": datetime.now().isoformat()
            }).eq("id", teacher.get("user_id")).execute()
        
        return {"success": True, "message": "Khôi phục giáo viên thành công"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error restoring teacher: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi khôi phục giáo viên: {str(e)}")


@router.delete("/teachers/{teacher_id}/permanent")
async def permanent_delete_teacher(
    teacher_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Xóa vĩnh viễn giáo viên (hard delete với cascade)"""
    try:
        # Kiểm tra xem teacher có tồn tại không
        teacher_check = db.table("teachers").select("id, user_id").eq("id", teacher_id).execute()
        if not teacher_check.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy giáo viên")
        
        teacher = teacher_check.data[0]
        
        # Set homeroom_teacher_id = null cho các lớp nếu teacher này là GVCN
        db.table("classes").update({"homeroom_teacher_id": None}).eq("homeroom_teacher_id", teacher_id).execute()
        
        # Xóa vĩnh viễn teacher record
        response = db.table("teachers").delete().eq("id", teacher_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Lỗi khi xóa vĩnh viễn giáo viên")
        
        # CASCADE: Also delete the corresponding user record
        if teacher.get("user_id"):
            db.table("users").delete().eq("id", teacher.get("user_id")).execute()
        
        return {"success": True, "message": "Xóa vĩnh viễn giáo viên thành công"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error permanently deleting teacher: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa vĩnh viễn giáo viên: {str(e)}")


@router.get("/users/teachers")
async def get_users_who_are_teachers(
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy danh sách users có role teacher hoặc homeroom_teacher chưa được tạo teacher"""
    try:
        # Lấy danh sách users có role teacher hoặc homeroom_teacher
        users_response = db.table("users").select("id, email, username, full_name, role, is_active").in_("role", ["teacher", "homeroom_teacher"]).eq("is_active", True).execute()
        
        # Lấy danh sách user_ids đã có trong bảng teachers
        teachers_response = db.table("teachers").select("user_id").execute()
        existing_user_ids = [teacher["user_id"] for teacher in teachers_response.data if teacher["user_id"]]
        
        # Lọc ra những user chưa được tạo teacher
        available_users = [user for user in users_response.data if user["id"] not in existing_user_ids]
        
        return {"success": True, "data": available_users}
        
    except Exception as e:
        logger.error(f"Error getting teacher users: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách users giáo viên: {str(e)}")


@router.get("/teachers/next-code")
async def get_next_teacher_code(
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy mã giáo viên tiếp theo (GV001, GV002, ...)"""
    try:
        # Get latest teacher code
        teachers = db.table("teachers").select("teacher_code").order("teacher_code", desc=True).limit(1).execute()
        
        if teachers.data and teachers.data[0].get("teacher_code"):
            last_code = teachers.data[0]["teacher_code"]
            # Extract number from code (e.g., "GV001" -> 1)
            if last_code.startswith("GV"):
                try:
                    num = int(last_code[2:])
                    next_code = f"GV{num + 1:03d}"
                except:
                    next_code = "GV001"
            else:
                next_code = "GV001"
        else:
            next_code = "GV001"
        
        return {"success": True, "data": {"next_code": next_code}}
        
    except Exception as e:
        logger.error(f"Error getting next teacher code: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy mã giáo viên tiếp theo: {str(e)}")


@router.post("/teachers/import-from-users")
async def import_teachers_from_users(
    user_ids: List[int],
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Import giáo viên từ danh sách users"""
    try:
        if not user_ids:
            raise HTTPException(status_code=400, detail="Danh sách user_ids không được trống")
        
        created_teachers = []
        errors = []
        
        # Lấy thông tin users
        users_response = db.table("users").select("id, email, username, full_name, role").in_("id", user_ids).execute()
        
        if len(users_response.data) != len(user_ids):
            raise HTTPException(status_code=400, detail="Một số user không tồn tại")
        
        # Lấy teacher_code tiếp theo
        next_code_response = await get_next_teacher_code(admin_user, db)
        next_code = next_code_response["data"]["next_code"]
        
        # Tạo teachers
        for i, user in enumerate(users_response.data):
            try:
                # Check if already exists
                existing = db.table("teachers").select("id").eq("user_id", user["id"]).execute()
                if existing.data:
                    errors.append({"user_id": user["id"], "error": "Teacher already exists"})
                    continue
                
                # Create teacher với auto-generated teacher_code
                teacher_data = {
                    "teacher_code": f"GV{int(next_code[2:]) + i:03d}",  # Tăng dần mã giáo viên
                    "full_name": user["full_name"],
                    "email": user.get("email"),
                    "phone": None,
                    "user_id": user["id"],
                    "is_active": True,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
                
                response = db.table("teachers").insert(teacher_data).execute()
                if response.data:
                    created_teachers.append(response.data[0])
                    
            except Exception as e:
                errors.append({"user_id": user["id"], "error": str(e)})
        
        return {
            "success": True,
            "data": created_teachers,
            "message": f"Đã tạo thành công {len(created_teachers)} giáo viên",
            "errors": errors if errors else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing teachers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo giáo viên từ users: {str(e)}")


@router.get("/teachers/homeroom")
async def get_homeroom_teachers(
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy danh sách giáo viên có role homeroom_teacher"""
    try:
        # Lấy tất cả teachers với thông tin users (giống backend gốc)
        response = db.table("teachers").select("*, users:user_id(role)").eq("is_active", True).order("teacher_code").execute()
        
        # Lọc ra những teacher có role homeroom_teacher
        homeroom_teachers = []
        for teacher in response.data:
            if teacher.get("users") and teacher["users"]["role"] == "homeroom_teacher":
                homeroom_teachers.append(teacher)
        
        return {"success": True, "data": homeroom_teachers}
        
    except Exception as e:
        logger.error(f"Error getting homeroom teachers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách giáo viên chủ nhiệm: {str(e)}")


# ===============================================
# SUBJECTS CRUD ENDPOINTS
# ===============================================

@router.get("/subjects")
async def get_all_subjects(
    show_deleted: bool = Query(False, description="Hiển thị cả môn học đã xóa"),
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy danh sách tất cả môn học"""
    try:
        # Lấy subjects với score_column_config (không cần join vì đã merge vào subjects table)
        query = db.table("subjects").select("*")
        
        # NOTE: Removed server-side is_active filtering to match frontend Option 2 approach
        # All data (active + deleted) is returned, frontend filters based on showDeleted flag
        # if not show_deleted:
        #     query = query.eq("is_active", True)
        
        response = query.order("subject_code").execute()

        # Map score_column_config (giữ nguyên tên để nhất quán)
        subjects = []
        for subj in (response.data or []):
            subjects.append(dict(subj))
        
        return {"success": True, "data": subjects}
    except Exception as e:
        logger.error(f"Error getting subjects: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách môn học: {str(e)}")


@router.post("/subjects")
async def create_subject(
    subject_data: SubjectCreate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Tạo môn học mới"""
    try:
        data = {
            "subject_code": subject_data.subject_code,
            "subject_name": subject_data.subject_name,
            "is_active": subject_data.is_active,
            "is_mandatory": subject_data.is_mandatory if subject_data.is_mandatory is not None else False,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        if subject_data.description:
            data["description"] = subject_data.description
        
        response = db.table("subjects").insert(data).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Tạo môn học thành công"}
        else:
            raise HTTPException(status_code=500, detail="Không thể tạo môn học")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating subject: {str(e)}")
        raise handle_database_error(e)


@router.put("/subjects/{subject_id}")
async def update_subject(
    subject_id: int,
    subject_data: SubjectUpdate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Cập nhật thông tin môn học"""
    try:
        # Check if subject exists
        subject_check = db.table("subjects").select("id").eq("id", subject_id).execute()
        if not subject_check.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy môn học")
        
        # Validate optional fields if provided
        if subject_data.subject_code:
            subject_data.subject_code = validate_subject_code(subject_data.subject_code)
        
        if subject_data.subject_name:
            subject_data.subject_name = validate_subject_name(subject_data.subject_name)
        
        # Validate score_column_config if provided
        if subject_data.score_column_config:
            subject_data.score_column_config = validate_score_column_config(subject_data.score_column_config)
        
        update_data = {"updated_at": datetime.now().isoformat()}
        
        if subject_data.subject_code:
            update_data["subject_code"] = subject_data.subject_code
        if subject_data.subject_name:
            update_data["subject_name"] = subject_data.subject_name
        if subject_data.description is not None:
            update_data["description"] = subject_data.description
        if subject_data.is_mandatory is not None:
            update_data["is_mandatory"] = subject_data.is_mandatory
        if subject_data.is_active is not None:
            update_data["is_active"] = subject_data.is_active
        if subject_data.score_column_config is not None:
            update_data["score_column_config"] = subject_data.score_column_config
        
        response = db.table("subjects").update(update_data).eq("id", subject_id).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Cập nhật môn học thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy môn học")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating subject: {str(e)}")
        raise handle_database_error(e)


@router.delete("/subjects/{subject_id}")
async def soft_delete_subject(
    subject_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Soft delete môn học (đánh dấu is_active = false)"""
    try:
        # Kiểm tra môn học có tồn tại không
        check_response = db.table("subjects").select("*").eq("id", subject_id).execute()
        if not check_response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy môn học")
        
        # Soft delete: set is_active = false
        response = db.table("subjects").update({
            "is_active": False
        }).eq("id", subject_id).execute()
        
        return {
            "success": True, 
            "message": "Xóa môn học thành công (soft delete)",
            "data": response.data[0] if response.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error soft deleting subject: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.post("/subjects/{subject_id}/restore")
async def restore_subject(
    subject_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Khôi phục môn học đã xóa (soft delete)"""
    try:
        # Kiểm tra môn học có tồn tại không
        check_response = db.table("subjects").select("*").eq("id", subject_id).execute()
        if not check_response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy môn học")
        
        subject = check_response.data[0]
        if subject.get("is_active"):
            raise HTTPException(status_code=400, detail="Môn học này chưa bị xóa")
        
        # Restore: set is_active = true
        response = db.table("subjects").update({
            "is_active": True
        }).eq("id", subject_id).execute()
        
        return {
            "success": True,
            "message": "Khôi phục môn học thành công",
            "data": response.data[0] if response.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error restoring subject: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.delete("/subjects/{subject_id}/permanent")
async def permanent_delete_subject(
    subject_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Xóa vĩnh viễn môn học khỏi database"""
    try:
        # Kiểm tra môn học có tồn tại không
        check_response = db.table("subjects").select("*").eq("id", subject_id).execute()
        if not check_response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy môn học")
        
        subject = check_response.data[0]
        if subject.get("is_active"):
            raise HTTPException(
                status_code=400, 
                detail="Vui lòng soft delete môn học trước khi xóa vĩnh viễn"
            )
        
        # Permanent delete: xóa hoàn toàn khỏi database
        response = db.table("subjects").delete().eq("id", subject_id).execute()
        
        return {
            "success": True,
            "message": "Xóa vĩnh viễn môn học thành công",
            "data": None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error permanently deleting subject: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


# ===============================================
# CLASSES CRUD ENDPOINTS
# ===============================================

@router.get("/classes")
async def get_all_classes(
    academic_year: str | None = Query(None, description="Lọc theo năm học, ví dụ 2024-2025"),
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy danh sách lớp học, có thể lọc theo năm học.

    Ghi chú: Danh sách lớp vẫn lấy từ bảng classes (để kiểm soát metadata như academic_year),
    còn danh sách học sinh sẽ dựa trên bảng homeroom_students_history ở endpoint khác.
    """
    try:
        query = db.table("classes").select(
            "*, teachers:homeroom_teacher_id(id, full_name, teacher_code)"
        )
        if academic_year:
            query = query.eq("academic_year", academic_year)

        response = query.order("grade, class_name").execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        logger.error(f"Error getting classes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/classes/academic-years")
async def get_class_academic_years(
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy danh sách năm học khả dụng từ bảng classes (phục vụ filter)."""
    try:
        response = db.table("classes").select("academic_year").execute()
        years = sorted(list({item.get("academic_year") for item in (response.data or []) if item.get("academic_year")}))
        return {"success": True, "data": years}
    except Exception as e:
        logger.error(f"Error getting academic years: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/classes/{class_id}/students")
async def get_class_students(
    class_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy danh sách học sinh trong một lớp dựa vào bảng homeroom_students_history"""
    try:
        # Đảm bảo lớp tồn tại (và lấy metadata nếu cần)
        class_response = db.table("classes").select("id, class_name").eq("id", class_id).execute()
        if not class_response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp học")

        # Lấy danh sách student_id từ bảng lịch sử
        history_resp = db.table("homeroom_students_history").select("student_id").eq("class_id", class_id).execute()
        student_ids = [row["student_id"] for row in (history_resp.data or []) if row.get("student_id")]

        if not student_ids:
            return {"success": True, "data": []}

        # Lấy thông tin học sinh theo danh sách id
        students_resp = db.table("students").select("*").in_("id", student_ids).execute()
        students_data = students_resp.data or []
        
        # Fetch ALL parent_info in ONE query (performance optimization)
        if students_data:
            all_student_ids = [s["id"] for s in students_data]
            parent_info_resp = db.table("parent_info").select("*").in_("student_id", all_student_ids).execute()
            parent_info_map = {}
            for pi in (parent_info_resp.data or []):
                sid = pi["student_id"]
                if sid not in parent_info_map:
                    parent_info_map[sid] = []
                parent_info_map[sid].append(pi)
            
            for student in students_data:
                student["parent_contacts"] = parent_info_map.get(student["id"], [])
        
        return {"success": True, "data": students_data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting class students: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.post("/classes")
async def create_class(
    class_data: ClassCreate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Tạo lớp học mới"""
    try:
        # Validate required fields
        class_name = validate_class_name(class_data.class_name)
        grade = validate_grade(class_data.grade)
        academic_year = validate_academic_year(class_data.academic_year)
        
        # Check class_name uniqueness within same academic year
        existing_class_name = db.table("classes").select("id").eq(
            "class_name", class_name
        ).eq("academic_year", academic_year).execute()
        if existing_class_name.data:
            raise_validation_error(
                ClassErrorCode.CLASS_NAME_DUPLICATE,
                f"Lớp '{class_name}' đã tồn tại trong năm học {academic_year}",
                field="class_name"
            )
        
        # Validate homeroom_teacher_id if provided
        if class_data.homeroom_teacher_id:
            # Check teacher exists
            teacher_check = db.table("teachers").select("id, is_active").eq(
                "id", class_data.homeroom_teacher_id
            ).execute()
            if not teacher_check.data:
                raise_validation_error(
                    ClassErrorCode.CLASS_HOMEROOM_TEACHER_NOT_FOUND,
                    f"Giáo viên với ID {class_data.homeroom_teacher_id} không tồn tại",
                    field="homeroom_teacher_id"
                )
            
            # Check teacher is active
            if not teacher_check.data[0].get("is_active", True):
                raise_validation_error(
                    ClassErrorCode.CLASS_HOMEROOM_TEACHER_INACTIVE,
                    "Giáo viên phải hoạt động để trở thành chủ nhiệm",
                    field="homeroom_teacher_id"
                )
            
            # Check teacher not already homeroom for another class in same year
            existing_homeroom = db.table("classes").select(
                "id, class_name, academic_year, teachers:homeroom_teacher_id(teacher_code, full_name)"
            ).eq("homeroom_teacher_id", class_data.homeroom_teacher_id).eq(
                "academic_year", academic_year
            ).eq("is_active", True).execute()
            
            if existing_homeroom.data:
                teacher_info = existing_homeroom.data[0].get("teachers", {})
                teacher_code = teacher_info.get("teacher_code", "")
                teacher_name = teacher_info.get("full_name", "")
                existing_class_name = existing_homeroom.data[0].get("class_name", "")
                
                raise_validation_error(
                    ClassErrorCode.CLASS_HOMEROOM_TEACHER_DUPLICATE,
                    f"Giáo viên {teacher_code} {teacher_name} đang chủ nhiệm lớp {existing_class_name}. Mỗi giáo viên chỉ được chủ nhiệm 1 lớp trong 1 năm học.",
                    field="homeroom_teacher_id"
                )
        
        data = {
            "class_name": class_name,
            "grade": grade,
            "academic_year": academic_year,
            "is_active": class_data.is_active,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        if class_data.homeroom_teacher_id:
            data["homeroom_teacher_id"] = class_data.homeroom_teacher_id
        if class_data.room_number:
            data["room_number"] = class_data.room_number
        
        response = db.table("classes").insert(data).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Tạo lớp học thành công"}
        else:
            raise HTTPException(status_code=500, detail="Không thể tạo lớp học")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating class: {str(e)}")
        raise handle_database_error(e)


@router.put("/classes/{class_id}")
async def update_class(
    class_id: int,
    class_data: ClassUpdate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Cập nhật thông tin lớp học"""
    try:
        # Lấy thông tin lớp hiện tại
        current_class = db.table("classes").select("*").eq("id", class_id).execute()
        if not current_class.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp học")
        
        current_class_data = current_class.data[0]
        
        # Validate optional fields if provided
        if class_data.class_name:
            class_data.class_name = validate_class_name(class_data.class_name)
        
        if class_data.grade:
            class_data.grade = validate_grade(class_data.grade)
        
        if class_data.academic_year:
            class_data.academic_year = validate_academic_year(class_data.academic_year)
        
        # Xác định năm học sẽ dùng để kiểm tra (nếu có cập nhật năm học thì dùng năm mới, không thì dùng năm cũ)
        academic_year_to_check = class_data.academic_year if class_data.academic_year else current_class_data.get("academic_year")
        
        # Check class_name uniqueness per academic year - exclude self
        if class_data.class_name:
            existing_class_name = db.table("classes").select("id").eq(
                "class_name", class_data.class_name
            ).eq("academic_year", academic_year_to_check).neq("id", class_id).execute()
            
            if existing_class_name.data:
                raise_validation_error(
                    ClassErrorCode.CLASS_NAME_DUPLICATE,
                    f"Tên lớp '{class_data.class_name}' này đã tồn tại trong năm học {academic_year_to_check}",
                    field="class_name"
                )
        
        # Kiểm tra giáo viên chủ nhiệm nếu có thay đổi
        if class_data.homeroom_teacher_id is not None:
            # Chỉ kiểm tra nếu giáo viên mới khác với giáo viên hiện tại
            current_teacher_id = current_class_data.get("homeroom_teacher_id")
            
            if class_data.homeroom_teacher_id != current_teacher_id:
                # Check if teacher exists
                teacher_check = db.table("teachers").select("id, is_active").eq("id", class_data.homeroom_teacher_id).execute()
                if not teacher_check.data:
                    raise_validation_error(
                        ClassErrorCode.CLASS_HOMEROOM_TEACHER_NOT_FOUND,
                        f"Giáo viên với ID {class_data.homeroom_teacher_id} không tồn tại",
                        field="homeroom_teacher_id"
                    )
                
                # Check if teacher is active
                if not teacher_check.data[0].get("is_active", True):
                    raise_validation_error(
                        ClassErrorCode.CLASS_HOMEROOM_TEACHER_INACTIVE,
                        "Giáo viên chủ nhiệm phải hoạt động",
                        field="homeroom_teacher_id"
                    )
                
                # Tìm lớp mà giáo viên đang chủ nhiệm trong cùng năm học (exclude self)
                existing_class = db.table("classes").select(
                    "id, class_name, academic_year, teachers:homeroom_teacher_id(teacher_code, full_name)"
                ).eq("homeroom_teacher_id", class_data.homeroom_teacher_id).eq(
                    "academic_year", academic_year_to_check
                ).eq("is_active", True).neq("id", class_id).execute()
                
                if existing_class.data:
                    teacher_info = existing_class.data[0].get("teachers", {})
                    teacher_code = teacher_info.get("teacher_code", "")
                    teacher_name = teacher_info.get("full_name", "")
                    existing_class_name = existing_class.data[0].get("class_name", "")
                    year = existing_class.data[0].get("academic_year", "")
                    
                    raise_validation_error(
                        ClassErrorCode.CLASS_HOMEROOM_TEACHER_DUPLICATE,
                        f"Giáo viên {teacher_code} {teacher_name} đang chủ nhiệm lớp {existing_class_name} ({year}). Mỗi giáo viên chỉ được chủ nhiệm 1 lớp trong 1 năm học.",
                        field="homeroom_teacher_id"
                    )
        
        update_data = {"updated_at": datetime.now().isoformat()}
        
        if class_data.class_name:
            update_data["class_name"] = class_data.class_name
        if class_data.grade:
            update_data["grade"] = class_data.grade
        if class_data.homeroom_teacher_id is not None:
            update_data["homeroom_teacher_id"] = class_data.homeroom_teacher_id
        if class_data.room_number:
            update_data["room_number"] = class_data.room_number
        if class_data.academic_year:
            update_data["academic_year"] = class_data.academic_year
        if class_data.is_active is not None:
            update_data["is_active"] = class_data.is_active
        
        response = db.table("classes").update(update_data).eq("id", class_id).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Cập nhật lớp học thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp học")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating class: {str(e)}")
        raise handle_database_error(e)


@router.delete("/classes/{class_id}")
async def delete_class(
    class_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Soft delete lớp học (set is_active = false)"""
    try:
        # Kiểm tra tồn tại
        existing = db.table("classes").select("id, is_active").eq("id", class_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp học")

        # Soft delete
        response = db.table("classes").update({
            "is_active": False,
            "updated_at": datetime.now().isoformat()
        }).eq("id", class_id).execute()

        return {
            "success": True,
            "message": "Xóa lớp học thành công (soft delete)",
            "data": response.data[0] if response.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error soft deleting class: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa lớp học: {str(e)}")

@router.post("/classes/{class_id}/restore")
async def restore_class(
    class_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Khôi phục lớp học đã soft delete"""
    try:
        check = db.table("classes").select("id, is_active").eq("id", class_id).execute()
        if not check.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp học")
        if check.data[0].get("is_active"):
            raise HTTPException(status_code=400, detail="Lớp học chưa bị xóa")

        response = db.table("classes").update({
            "is_active": True,
            "updated_at": datetime.now().isoformat()
        }).eq("id", class_id).execute()

        return {
            "success": True,
            "message": "Khôi phục lớp học thành công",
            "data": response.data[0] if response.data else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error restoring class: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi khôi phục lớp học: {str(e)}")

@router.delete("/classes/{class_id}/permanent")
async def permanent_delete_class(
    class_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Xóa vĩnh viễn lớp học (hard delete)"""
    try:
        # Tồn tại và đã soft delete
        check = db.table("classes").select("id, is_active").eq("id", class_id).execute()
        if not check.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp học")
        if check.data[0].get("is_active"):
            raise HTTPException(status_code=400, detail="Vui lòng soft delete trước khi xóa vĩnh viễn")

        # Cân nhắc xóa dữ liệu phụ thuộc nếu có: class_subjects, homeroom_teacher_classes
        db.table("class_subjects").delete().eq("class_id", class_id).execute()
        db.table("homeroom_teacher_classes").delete().eq("class_id", class_id).execute()

        response = db.table("classes").delete().eq("id", class_id).execute()

        return {"success": True, "message": "Xóa vĩnh viễn lớp học thành công"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error permanently deleting class: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa vĩnh viễn lớp học: {str(e)}")


# ===============================================
# SUBJECT-TEACHERS (Phân công giáo viên dạy môn)
# ===============================================

@router.get("/subject-teachers")
async def get_subject_teachers(
    show_deleted: bool = Query(False, description="Hiển thị cả phân công đã xóa"),
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy danh sách phân công giáo viên-môn học"""
    try:
        query = db.table("subject_teachers").select(
            "*, teachers:teacher_id(id, full_name, teacher_code), subjects:subject_id(id, subject_code, subject_name)"
        )
        
        # Nếu không show_deleted, chỉ lấy các phân công active
        if not show_deleted:
            query = query.eq("is_active", True)
        
        response = query.order("id", desc=True).execute()
        
        # Flatten data for easier frontend consumption
        flattened_data = []
        for item in response.data:
            flattened_item = {
                "id": item["id"],
                "teacher_id": item["teacher_id"],
                "subject_id": item["subject_id"],
                "is_active": item.get("is_active"),
                "teacher_name": item["teachers"]["full_name"] if item.get("teachers") else None,
                "teacher_code": item["teachers"]["teacher_code"] if item.get("teachers") else None,
                "subject_name": item["subjects"]["subject_name"] if item.get("subjects") else None,
                "subject_code": item["subjects"]["subject_code"] if item.get("subjects") else None
            }
            flattened_data.append(flattened_item)
        
        return {"success": True, "data": flattened_data}
    except Exception as e:
        logger.error(f"Error getting subject teachers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách giáo viên - môn học: {str(e)}")


@router.post("/subject-teachers")
async def create_subject_teacher(
    assignment: SubjectTeacherCreate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Phân công giáo viên dạy môn học"""
    try:
        # Validate teacher exists
        teacher_check = db.table("teachers").select("id, is_active").eq("id", assignment.teacher_id).execute()
        if not teacher_check.data:
            raise_validation_error(
                SubjectTeacherErrorCode.SUBJECT_TEACHER_TEACHER_NOT_FOUND,
                f"Giáo viên với ID {assignment.teacher_id} không tồn tại",
                field="teacher_id"
            )
        if not teacher_check.data[0].get("is_active", True):
            raise_validation_error(
                SubjectTeacherErrorCode.SUBJECT_TEACHER_TEACHER_NOT_FOUND,
                "Giáo viên phải hoạt động",
                field="teacher_id"
            )
        
        # Validate subject exists
        subject_check = db.table("subjects").select("id, is_active").eq("id", assignment.subject_id).execute()
        if not subject_check.data:
            raise_validation_error(
                SubjectTeacherErrorCode.SUBJECT_TEACHER_SUBJECT_NOT_FOUND,
                f"Môn học với ID {assignment.subject_id} không tồn tại",
                field="subject_id"
            )
        if not subject_check.data[0].get("is_active", True):
            raise_validation_error(
                SubjectTeacherErrorCode.SUBJECT_TEACHER_SUBJECT_NOT_FOUND,
                "Môn học phải hoạt động",
                field="subject_id"
            )
        
        # Kiểm tra xem phân công này đã tồn tại chưa (kể cả inactive)
        existing = db.table("subject_teachers").select("*").eq("teacher_id", assignment.teacher_id).eq("subject_id", assignment.subject_id).execute()
        
        if existing.data:
            # Nếu đã tồn tại, check xem có active không
            existing_record = existing.data[0]
            if existing_record.get("is_active"):
                # Đã active rồi, không cần tạo lại
                return {"success": True, "data": existing_record, "message": "Phân công đã tồn tại"}
            else:
                # Inactive, reactivate nó
                response = db.table("subject_teachers").update({
                    "is_active": True,
                    "updated_at": datetime.now().isoformat()
                }).eq("id", existing_record["id"]).execute()
                
                if response.data:
                    return {"success": True, "data": response.data[0], "message": "Khôi phục phân công giáo viên thành công"}
                else:
                    raise HTTPException(status_code=500, detail="Không thể khôi phục phân công")
        else:
            # Không tồn tại, tạo bản ghi mới
            data = {
                "teacher_id": assignment.teacher_id,
                "subject_id": assignment.subject_id,
                "is_active": assignment.is_active,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            response = db.table("subject_teachers").insert(data).execute()
            
            if response.data:
                return {"success": True, "data": response.data[0], "message": "Phân công giáo viên thành công"}
            else:
                raise HTTPException(status_code=500, detail="Không thể phân công")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating subject teacher: {str(e)}")
        raise handle_database_error(e)


@router.put("/subject-teachers/{subject_teacher_id}")
async def update_subject_teacher(
    subject_teacher_id: int,
    assignment: SubjectTeacherUpdate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Cập nhật phân công giáo viên-môn học"""
    try:
        # Check if subject_teacher exists
        existing = db.table("subject_teachers").select("*").eq("id", subject_teacher_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy phân công")
        
        current_assignment = existing.data[0]
        
        # Validate teacher_id if provided and different from current
        if assignment.teacher_id and assignment.teacher_id != current_assignment.get("teacher_id"):
            teacher_check = db.table("teachers").select("id, is_active").eq("id", assignment.teacher_id).execute()
            if not teacher_check.data:
                raise_validation_error(
                    SubjectTeacherErrorCode.SUBJECT_TEACHER_TEACHER_NOT_FOUND,
                    f"Giáo viên với ID {assignment.teacher_id} không tồn tại",
                    field="teacher_id"
                )
            if not teacher_check.data[0].get("is_active", True):
                raise_validation_error(
                    SubjectTeacherErrorCode.SUBJECT_TEACHER_TEACHER_NOT_FOUND,
                    "Giáo viên phải hoạt động",
                    field="teacher_id"
                )
        
        # Validate subject_id if provided and different from current
        if assignment.subject_id and assignment.subject_id != current_assignment.get("subject_id"):
            subject_check = db.table("subjects").select("id, is_active").eq("id", assignment.subject_id).execute()
            if not subject_check.data:
                raise_validation_error(
                    SubjectTeacherErrorCode.SUBJECT_TEACHER_SUBJECT_NOT_FOUND,
                    f"Môn học với ID {assignment.subject_id} không tồn tại",
                    field="subject_id"
                )
            if not subject_check.data[0].get("is_active", True):
                raise_validation_error(
                    SubjectTeacherErrorCode.SUBJECT_TEACHER_SUBJECT_NOT_FOUND,
                    "Môn học phải hoạt động",
                    field="subject_id"
                )
        
        # Check for duplicate (teacher+subject) - exclude self
        teacher_id = assignment.teacher_id or current_assignment.get("teacher_id")
        subject_id = assignment.subject_id or current_assignment.get("subject_id")
        
        if teacher_id and subject_id:
            duplicate_check = db.table("subject_teachers").select("id").eq(
                "teacher_id", teacher_id
            ).eq("subject_id", subject_id).neq("id", subject_teacher_id).execute()
            
            if duplicate_check.data:
                raise_validation_error(
                    SubjectTeacherErrorCode.SUBJECT_TEACHER_DUPLICATE,
                    "Giáo viên này đã dạy môn học này rồi",
                    field="subject_id"
                )
        
        update_data = {"updated_at": datetime.now().isoformat()}
        
        if assignment.teacher_id:
            update_data["teacher_id"] = assignment.teacher_id
        if assignment.subject_id:
            update_data["subject_id"] = assignment.subject_id
        if assignment.is_active is not None:
            update_data["is_active"] = assignment.is_active
        
        response = db.table("subject_teachers").update(update_data).eq("id", subject_teacher_id).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Cập nhật phân công thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy phân công")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating subject teacher: {str(e)}")
        raise handle_database_error(e)


@router.delete("/subject-teachers/{subject_teacher_id}")
async def soft_delete_subject_teacher(
    subject_teacher_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Soft delete phân công giáo viên-môn học"""
    try:
        # Kiểm tra phân công có tồn tại không
        check_response = db.table("subject_teachers").select("*").eq("id", subject_teacher_id).execute()
        if not check_response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy phân công")
        
        # Soft delete: set is_active = false
        response = db.table("subject_teachers").update({
            "is_active": False
        }).eq("id", subject_teacher_id).execute()
        
        return {
            "success": True,
            "message": "Xóa phân công thành công (soft delete)",
            "data": response.data[0] if response.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error soft deleting subject teacher: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.post("/subject-teachers/{subject_teacher_id}/restore")
async def restore_subject_teacher(
    subject_teacher_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Khôi phục phân công giáo viên-môn học đã xóa"""
    try:
        # Kiểm tra phân công có tồn tại không
        check_response = db.table("subject_teachers").select("*").eq("id", subject_teacher_id).execute()
        if not check_response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy phân công")
        
        assignment = check_response.data[0]
        if assignment.get("is_active"):
            raise HTTPException(status_code=400, detail="Phân công này chưa bị xóa")
        
        # Restore: set is_active = true
        response = db.table("subject_teachers").update({
            "is_active": True
        }).eq("id", subject_teacher_id).execute()
        
        return {
            "success": True,
            "message": "Khôi phục phân công thành công",
            "data": response.data[0] if response.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error restoring subject teacher: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.delete("/subject-teachers/{subject_teacher_id}/permanent")
async def permanent_delete_subject_teacher(
    subject_teacher_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Xóa vĩnh viễn phân công giáo viên-môn học"""
    try:
        # Kiểm tra phân công có tồn tại không
        check_response = db.table("subject_teachers").select("*").eq("id", subject_teacher_id).execute()
        if not check_response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy phân công")
        
        assignment = check_response.data[0]
        if assignment.get("is_active"):
            raise HTTPException(
                status_code=400,
                detail="Vui lòng soft delete phân công trước khi xóa vĩnh viễn"
            )
        
        # Permanent delete
        response = db.table("subject_teachers").delete().eq("id", subject_teacher_id).execute()
        
        return {
            "success": True,
            "message": "Xóa vĩnh viễn phân công thành công",
            "data": None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error permanently deleting subject teacher: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


# ===============================================
# CLASS-SUBJECTS (Phân công giáo viên dạy lớp-môn)
# ===============================================

@router.get("/class-subjects")
async def get_class_subjects(
    show_deleted: bool = Query(False, description="Hiển thị cả phân công đã xóa"),
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy danh sách phân công lớp-môn"""
    try:
        query = db.table("class_subjects").select("""
            *,
            classes:class_id(id, class_name, grade),
            subjects:subject_id(id, subject_code, subject_name),
            teachers:teacher_id(id, full_name, teacher_code)
        """)
        
        # Filter by is_active status
        if show_deleted:
            # Show only deleted records (is_active = false)
            query = query.eq("is_active", False)
        else:
            # Show only active records (is_active = true) by default
            query = query.eq("is_active", True)
        
        response = query.order("academic_year", desc=True).execute()
        
        # Flatten data for easier frontend consumption
        flattened_data = []
        for item in response.data:
            flattened_item = {
                "id": item["id"],
                "class_id": item["class_id"],
                "subject_id": item["subject_id"],
                "teacher_id": item["teacher_id"],
                "academic_year": item.get("academic_year"),
                "semester": item.get("semester"),
                "is_active": item.get("is_active"),
                "class_name": item["classes"]["class_name"] if item.get("classes") else None,
                "grade": item["classes"]["grade"] if item.get("classes") else None,
                "subject_name": item["subjects"]["subject_name"] if item.get("subjects") else None,
                "subject_code": item["subjects"]["subject_code"] if item.get("subjects") else None,
                "teacher_name": item["teachers"]["full_name"] if item.get("teachers") else None,
                "teacher_code": item["teachers"]["teacher_code"] if item.get("teachers") else None
            }
            flattened_data.append(flattened_item)
        
        return {"success": True, "data": flattened_data}
    except Exception as e:
        logger.error(f"Error getting class subjects: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách lớp - môn học: {str(e)}")


@router.post("/class-subjects")
async def create_class_subject(
    assignment: ClassSubjectCreate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Phân công giáo viên dạy lớp-môn"""
    try:
        # Validate academic_year and semester
        academic_year = validate_academic_year(assignment.academic_year)
        semester = validate_semester(assignment.semester)
        
        # Validate class exists
        class_check = db.table("classes").select("id, is_active").eq("id", assignment.class_id).execute()
        if not class_check.data:
            raise_validation_error(
                ClassSubjectErrorCode.CLASS_SUBJECT_CLASS_NOT_FOUND,
                f"Lớp với ID {assignment.class_id} không tồn tại",
                field="class_id"
            )
        if not class_check.data[0].get("is_active", True):
            raise_validation_error(
                ClassSubjectErrorCode.CLASS_SUBJECT_CLASS_NOT_FOUND,
                "Lớp phải hoạt động",
                field="class_id"
            )
        
        # Validate subject exists
        subject_check = db.table("subjects").select("id, is_active").eq("id", assignment.subject_id).execute()
        if not subject_check.data:
            raise_validation_error(
                ClassSubjectErrorCode.CLASS_SUBJECT_SUBJECT_NOT_FOUND,
                f"Môn học với ID {assignment.subject_id} không tồn tại",
                field="subject_id"
            )
        if not subject_check.data[0].get("is_active", True):
            raise_validation_error(
                ClassSubjectErrorCode.CLASS_SUBJECT_SUBJECT_NOT_FOUND,
                "Môn học phải hoạt động",
                field="subject_id"
            )
        
        # Validate teacher exists
        if assignment.teacher_id:
            teacher_check = db.table("teachers").select("id, is_active").eq("id", assignment.teacher_id).execute()
            if not teacher_check.data:
                raise_validation_error(
                    ClassSubjectErrorCode.CLASS_SUBJECT_TEACHER_NOT_FOUND,
                    f"Giáo viên với ID {assignment.teacher_id} không tồn tại",
                    field="teacher_id"
                )
            if not teacher_check.data[0].get("is_active", True):
                raise_validation_error(
                    ClassSubjectErrorCode.CLASS_SUBJECT_TEACHER_NOT_FOUND,
                    "Giáo viên phải hoạt động",
                    field="teacher_id"
                )
            
            # Check if teacher teaches the subject
            teaches_check = db.table("subject_teachers").select("id").eq(
                "teacher_id", assignment.teacher_id
            ).eq("subject_id", assignment.subject_id).execute()
            if not teaches_check.data:
                raise_validation_error(
                    ClassSubjectErrorCode.CLASS_SUBJECT_TEACHER_NOT_TEACH_SUBJECT,
                    "Giáo viên này không dạy môn học này",
                    field="teacher_id"
                )
        
        # Check for duplicate assignment
        duplicate_check = db.table("class_subjects").select("id").eq(
            "class_id", assignment.class_id
        ).eq("subject_id", assignment.subject_id).eq(
            "academic_year", academic_year
        ).eq("semester", semester).execute()
        
        if duplicate_check.data:
            raise_validation_error(
                ClassSubjectErrorCode.CLASS_SUBJECT_DUPLICATE,
                "Môn học này đã được phân công cho lớp này trong học kỳ này",
                field="subject_id"
            )
        
        data = {
            "class_id": assignment.class_id,
            "subject_id": assignment.subject_id,
            "teacher_id": assignment.teacher_id,
            "academic_year": academic_year,
            "semester": semester,
            "is_active": assignment.is_active,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.table("class_subjects").insert(data).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Phân công lớp-môn thành công"}
        else:
            raise HTTPException(status_code=500, detail="Không thể phân công")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating class subject: {str(e)}")
        raise handle_database_error(e)


@router.post("/class-subjects/bulk")
async def create_class_subjects_bulk(
    assignment: ClassSubjectBulkCreate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Phân công giáo viên dạy nhiều lớp-môn (bulk assignment)
    
    Tạo phân công giáo viên cho một môn học ở nhiều lớp học khác nhau
    trong cùng năm học và kỳ học
    """
    try:
        if not assignment.class_ids or len(assignment.class_ids) == 0:
            raise HTTPException(status_code=400, detail="Phải chọn ít nhất một lớp học")
        
        # Verify all classes exist and belong to the same academic year
        class_ids_str = ','.join(map(str, assignment.class_ids))
        classes_response = db.table("classes").select("id, class_name, academic_year").in_("id", assignment.class_ids).execute()
        
        if not classes_response.data or len(classes_response.data) != len(assignment.class_ids):
            raise HTTPException(status_code=400, detail="Một số lớp học không tồn tại")
        
        # Verify all classes have the same academic year as specified
        for cls in classes_response.data:
            if cls.get("academic_year") != assignment.academic_year:
                raise HTTPException(
                    status_code=400,
                    detail=f"Lớp {cls.get('class_name')} không thuộc năm học {assignment.academic_year}"
                )
        
        # Create assignment for each class
        created_records = []
        for class_id in assignment.class_ids:
            data = {
                "class_id": class_id,
                "subject_id": assignment.subject_id,
                "teacher_id": assignment.teacher_id,
                "academic_year": assignment.academic_year,
                "semester": assignment.semester,
                "is_active": assignment.is_active,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            try:
                response = db.table("class_subjects").insert(data).execute()
                if response.data:
                    created_records.append(response.data[0])
            except Exception as e:
                # Log but continue - don't fail entire operation if one class fails
                logger.warning(f"Failed to create assignment for class {class_id}: {str(e)}")
                continue
        
        if len(created_records) == 0:
            raise HTTPException(status_code=500, detail="Không thể tạo phân công cho bất kỳ lớp nào")
        
        success_count = len(created_records)
        total_count = len(assignment.class_ids)
        message = f"Phân công thành công cho {success_count}/{total_count} lớp học"
        if success_count < total_count:
            message += f" ({total_count - success_count} lớp không thành công)"
        
        return {
            "success": True,
            "data": created_records,
            "message": message,
            "stats": {
                "total": total_count,
                "success": success_count,
                "failed": total_count - success_count
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error bulk creating class subjects: {str(e)}")
        raise handle_database_error(e)


@router.put("/class-subjects/bulk-update")
async def bulk_update_class_subjects(
    bulk_update: ClassSubjectBulkUpdate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """
    Bulk update class assignments for a teacher-subject combo.
    Handles adding/removing classes from an existing grouped assignment.
    
    Logic:
    1. Get current class_ids for all records in record_ids
    2. Determine which classes to add, remove, and keep
    3. Soft delete records for removed classes
    4. Create new records for added classes
    5. Re-enable records for kept classes (in case they were disabled)
    """
    try:
        # Validate required fields
        if not bulk_update.record_ids:
            raise_validation_error(
                ClassSubjectErrorCode.CLASS_SUBJECT_REQUIRED_FIELD_MISSING,
                "record_ids không được trống"
            )
        
        if not bulk_update.selected_class_ids:
            raise_validation_error(
                ClassSubjectErrorCode.CLASS_SUBJECT_NO_CLASSES_SELECTED,
                "Phải chọn ít nhất một lớp"
            )
        
        # Validate academic_year and semester
        if bulk_update.academic_year:
            bulk_update.academic_year = validate_academic_year(bulk_update.academic_year)
        
        if bulk_update.semester:
            bulk_update.semester = validate_semester(bulk_update.semester)
        
        # Validate all classes exist and belong to the academic year
        classes_response = db.table("classes").select("id, class_name, academic_year").eq(
            "academic_year", bulk_update.academic_year
        ).execute()
        valid_class_ids = [c["id"] for c in (classes_response.data or [])]
        
        for class_id in bulk_update.selected_class_ids:
            if class_id not in valid_class_ids:
                raise_validation_error(
                    ClassSubjectErrorCode.CLASS_SUBJECT_CLASS_NOT_FOUND,
                    f"Lớp với ID {class_id} không tồn tại hoặc không thuộc năm học {bulk_update.academic_year}",
                    field="selected_class_ids"
                )
        
        logger.debug(f"Bulk update request received")
        logger.debug(f"  record_ids: {bulk_update.record_ids} (type: {type(bulk_update.record_ids)})")
        logger.debug(f"  teacher_id: {bulk_update.teacher_id} (type: {type(bulk_update.teacher_id)})")
        logger.debug(f"  subject_id: {bulk_update.subject_id} (type: {type(bulk_update.subject_id)})")
        logger.debug(f"  academic_year: {bulk_update.academic_year}")
        logger.debug(f"  semester: {bulk_update.semester}")
        logger.debug(f"  selected_class_ids: {bulk_update.selected_class_ids}")
        
        # Get current assignments
        current_records = db.table("class_subjects").select("*").in_(
            "id", bulk_update.record_ids
        ).execute().data or []
        
        # Extract current class IDs
        current_class_ids = [r.get("class_id") for r in current_records]
        new_class_ids = bulk_update.selected_class_ids
        
        # Determine operations
        classes_to_remove = [cid for cid in current_class_ids if cid not in new_class_ids]
        classes_to_add = [cid for cid in new_class_ids if cid not in current_class_ids]
        classes_to_keep = [cid for cid in current_class_ids if cid in new_class_ids]
        
        # 1. Soft delete records for removed classes
        if classes_to_remove:
            for class_id in classes_to_remove:
                record_to_delete = next(
                    (r for r in current_records if r.get("class_id") == class_id),
                    None
                )
                if record_to_delete:
                    db.table("class_subjects").update({
                        "is_active": False
                    }).eq("id", record_to_delete["id"]).execute()
        
        # 2. Re-enable records for kept classes (in case they were disabled)
        if classes_to_keep:
            for class_id in classes_to_keep:
                record_to_keep = next(
                    (r for r in current_records if r.get("class_id") == class_id),
                    None
                )
                if record_to_keep and not record_to_keep.get("is_active", True):
                    db.table("class_subjects").update({
                        "is_active": True
                    }).eq("id", record_to_keep["id"]).execute()
        
        # 3. Create new records for added classes (or restore soft-deleted ones)
        new_records = []
        for class_id in classes_to_add:
            # First, check if a soft-deleted record exists for this combination
            existing_deleted = db.table("class_subjects").select("*").match({
                "teacher_id": bulk_update.teacher_id,
                "subject_id": bulk_update.subject_id,
                "class_id": class_id,
                "academic_year": bulk_update.academic_year,
                "semester": bulk_update.semester,
            }).eq("is_active", False).execute().data or []
            
            if existing_deleted:
                # Restore the soft-deleted record
                response = db.table("class_subjects").update({
                    "is_active": True,
                    "updated_at": datetime.now().isoformat(),
                }).eq("id", existing_deleted[0]["id"]).execute()
                if response.data:
                    new_records.extend(response.data)
                logger.debug(f"Restored soft-deleted record for class_id {class_id}")
            else:
                # Create a new record if no soft-deleted record exists
                new_data = {
                    "teacher_id": bulk_update.teacher_id,
                    "subject_id": bulk_update.subject_id,
                    "class_id": class_id,
                    "academic_year": bulk_update.academic_year,
                    "semester": bulk_update.semester,
                    "is_active": True,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                }
                response = db.table("class_subjects").insert(new_data).execute()
                if response.data:
                    new_records.extend(response.data)
                logger.debug(f"Created new record for class_id {class_id}")
        
        return {
            "success": True,
            "data": {
                "removed_count": len(classes_to_remove),
                "added_count": len(classes_to_add),
                "kept_count": len(classes_to_keep),
                "new_records": new_records,
            },
            "message": f"Cập nhật phân công thành công (thêm {len(classes_to_add)}, xóa {len(classes_to_remove)})"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error bulk updating class subjects: {str(e)}")
        raise handle_database_error(e)


@router.put("/class-subjects/{class_subject_id}")
async def update_class_subject(
    class_subject_id: int,
    assignment: ClassSubjectUpdate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Cập nhật phân công lớp-môn"""
    try:
        # Check if class_subject exists
        existing = db.table("class_subjects").select("*").eq("id", class_subject_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy phân công")
        
        current_assignment = existing.data[0]
        
        # Validate fields if provided
        if assignment.academic_year:
            assignment.academic_year = validate_academic_year(assignment.academic_year)
        
        if assignment.semester:
            assignment.semester = validate_semester(assignment.semester)
        
        # Validate class_id if provided and different from current
        if assignment.class_id and assignment.class_id != current_assignment.get("class_id"):
            class_check = db.table("classes").select("id, is_active").eq("id", assignment.class_id).execute()
            if not class_check.data:
                raise_validation_error(
                    ClassSubjectErrorCode.CLASS_SUBJECT_CLASS_NOT_FOUND,
                    f"Lớp với ID {assignment.class_id} không tồn tại",
                    field="class_id"
                )
            if not class_check.data[0].get("is_active", True):
                raise_validation_error(
                    ClassSubjectErrorCode.CLASS_SUBJECT_CLASS_NOT_FOUND,
                    "Lớp phải hoạt động",
                    field="class_id"
                )
        
        # Validate subject_id if provided and different from current
        if assignment.subject_id and assignment.subject_id != current_assignment.get("subject_id"):
            subject_check = db.table("subjects").select("id, is_active").eq("id", assignment.subject_id).execute()
            if not subject_check.data:
                raise_validation_error(
                    ClassSubjectErrorCode.CLASS_SUBJECT_SUBJECT_NOT_FOUND,
                    f"Môn học với ID {assignment.subject_id} không tồn tại",
                    field="subject_id"
                )
            if not subject_check.data[0].get("is_active", True):
                raise_validation_error(
                    ClassSubjectErrorCode.CLASS_SUBJECT_SUBJECT_NOT_FOUND,
                    "Môn học phải hoạt động",
                    field="subject_id"
                )
        
        # Validate teacher_id if provided and different from current
        if assignment.teacher_id is not None and assignment.teacher_id != current_assignment.get("teacher_id"):
            if assignment.teacher_id:  # Only validate if not None/0
                teacher_check = db.table("teachers").select("id, is_active").eq("id", assignment.teacher_id).execute()
                if not teacher_check.data:
                    raise_validation_error(
                        ClassSubjectErrorCode.CLASS_SUBJECT_TEACHER_NOT_FOUND,
                        f"Giáo viên với ID {assignment.teacher_id} không tồn tại",
                        field="teacher_id"
                    )
                if not teacher_check.data[0].get("is_active", True):
                    raise_validation_error(
                        ClassSubjectErrorCode.CLASS_SUBJECT_TEACHER_NOT_FOUND,
                        "Giáo viên phải hoạt động",
                        field="teacher_id"
                    )
                
                # Check if teacher teaches the subject
                if assignment.subject_id:
                    teaches_check = db.table("subject_teachers").select("id").eq(
                        "teacher_id", assignment.teacher_id
                    ).eq("subject_id", assignment.subject_id).execute()
                    if not teaches_check.data:
                        raise_validation_error(
                            ClassSubjectErrorCode.CLASS_SUBJECT_TEACHER_NOT_TEACH_SUBJECT,
                            f"Giáo viên này không dạy môn học này",
                            field="teacher_id"
                        )
        
        # Check for duplicate assignment - exclude self
        class_id = assignment.class_id or current_assignment.get("class_id")
        subject_id = assignment.subject_id or current_assignment.get("subject_id")
        teacher_id = assignment.teacher_id if assignment.teacher_id is not None else current_assignment.get("teacher_id")
        academic_year = assignment.academic_year or current_assignment.get("academic_year")
        semester = assignment.semester or current_assignment.get("semester")
        
        if class_id and subject_id:
            duplicate_check = db.table("class_subjects").select("id").eq(
                "class_id", class_id
            ).eq("subject_id", subject_id).eq(
                "academic_year", academic_year
            ).eq("semester", semester).neq("id", class_subject_id).execute()
            
            if duplicate_check.data:
                raise_validation_error(
                    ClassSubjectErrorCode.CLASS_SUBJECT_DUPLICATE,
                    f"Môn học này đã được phân công cho lớp này trong học kỳ này",
                    field="subject_id"
                )
        
        update_data = {"updated_at": datetime.now().isoformat()}
        
        if assignment.class_id:
            update_data["class_id"] = assignment.class_id
        if assignment.subject_id:
            update_data["subject_id"] = assignment.subject_id
        if assignment.teacher_id is not None:
            update_data["teacher_id"] = assignment.teacher_id
        if assignment.academic_year:
            update_data["academic_year"] = assignment.academic_year
        if assignment.semester:
            update_data["semester"] = assignment.semester
        if assignment.is_active is not None:
            update_data["is_active"] = assignment.is_active
        
        response = db.table("class_subjects").update(update_data).eq("id", class_subject_id).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Cập nhật phân công thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy phân công")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating class subject: {str(e)}")
        raise handle_database_error(e)


@router.delete("/class-subjects/{class_subject_id}")
async def soft_delete_class_subject(
    class_subject_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Soft delete phân công lớp-môn"""
    try:
        # Kiểm tra phân công có tồn tại không
        check_response = db.table("class_subjects").select("*").eq("id", class_subject_id).execute()
        if not check_response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy phân công")
        
        # Soft delete: set is_active = false
        response = db.table("class_subjects").update({
            "is_active": False
        }).eq("id", class_subject_id).execute()
        
        return {
            "success": True,
            "message": "Xóa phân công thành công (soft delete)",
            "data": response.data[0] if response.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error soft deleting class subject: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.post("/class-subjects/{class_subject_id}/restore")
async def restore_class_subject(
    class_subject_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Khôi phục phân công lớp-môn đã xóa"""
    try:
        # Kiểm tra phân công có tồn tại không
        check_response = db.table("class_subjects").select("*").eq("id", class_subject_id).execute()
        if not check_response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy phân công")
        
        assignment = check_response.data[0]
        if assignment.get("is_active"):
            raise HTTPException(status_code=400, detail="Phân công này chưa bị xóa")
        
        # Restore: set is_active = true
        response = db.table("class_subjects").update({
            "is_active": True
        }).eq("id", class_subject_id).execute()
        
        return {
            "success": True,
            "message": "Khôi phục phân công thành công",
            "data": response.data[0] if response.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error restoring class subject: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.delete("/class-subjects/{class_subject_id}/permanent")
async def permanent_delete_class_subject(
    class_subject_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Xóa vĩnh viễn phân công lớp-môn"""
    try:
        # Kiểm tra phân công có tồn tại không
        check_response = db.table("class_subjects").select("*").eq("id", class_subject_id).execute()
        if not check_response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy phân công")
        
        assignment = check_response.data[0]
        if assignment.get("is_active"):
            raise HTTPException(
                status_code=400,
                detail="Vui lòng soft delete phân công trước khi xóa vĩnh viễn"
            )
        
        # Permanent delete
        response = db.table("class_subjects").delete().eq("id", class_subject_id).execute()
        
        return {
            "success": True,
            "message": "Xóa vĩnh viễn phân công thành công",
            "data": None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error permanently deleting class subject: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


# ===============================================
# STUDENTS MANAGEMENT (Admin perspective)
# ===============================================

@router.get("/students")
async def get_all_students_admin(
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy danh sách tất cả học sinh"""
    try:
        # Backend gốc KHÔNG filter is_active, để frontend tự filter
        response = db.table("students").select("*").order("created_at", desc=True).execute()
        students_data = response.data or []
        
        # Fetch ALL parent_info in ONE query (performance optimization)
        if students_data:
            student_ids = [s["id"] for s in students_data]
            parent_info_resp = db.table("parent_info").select("*").in_("student_id", student_ids).execute()
            parent_info_map = {}
            for pi in (parent_info_resp.data or []):
                sid = pi["student_id"]
                if sid not in parent_info_map:
                    parent_info_map[sid] = []
                parent_info_map[sid].append(pi)
            
            for student in students_data:
                student["parent_contacts"] = parent_info_map.get(student["id"], [])
        
        return {"success": True, "data": students_data}
    except Exception as e:
        logger.error(f"Error getting students: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách học sinh: {str(e)}")


@router.get("/students/by-grade")
async def get_students_by_grade(
    grade: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy danh sách học sinh theo khối"""
    try:
        classes_response = db.table("classes").select("class_name").eq("grade", grade).execute()
        class_names = [c["class_name"] for c in classes_response.data] if classes_response.data else []
        
        if class_names:
            # Backend gốc KHÔNG filter is_active, để frontend tự filter
            response = db.table("students").select("*").in_("class_name", class_names).order("full_name").execute()
            students_data = response.data or []
            
            # Fetch ALL parent_info in ONE query (performance optimization)
            if students_data:
                student_ids = [s["id"] for s in students_data]
                parent_info_resp = db.table("parent_info").select("*").in_("student_id", student_ids).execute()
                parent_info_map = {}
                for pi in (parent_info_resp.data or []):
                    sid = pi["student_id"]
                    if sid not in parent_info_map:
                        parent_info_map[sid] = []
                    parent_info_map[sid].append(pi)
                
                for student in students_data:
                    student["parent_contacts"] = parent_info_map.get(student["id"], [])
        else:
            students_data = []
            
        return {"success": True, "data": students_data}
    except Exception as e:
        logger.error(f"Error getting students by grade: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách học sinh theo khối: {str(e)}")


@router.post("/students")
async def create_student_admin(
    student_data: StudentCreate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Tạo học sinh mới"""
    try:
        # Nếu có class_id, lấy thông tin lớp để đảm bảo tính nhất quán class_name/grade
        class_info = None
        if getattr(student_data, "class_id", None):
            class_resp = db.table("classes").select("id, class_name, grade, homeroom_teacher_id").eq("id", student_data.class_id).execute()
            if not class_resp.data:
                raise HTTPException(status_code=400, detail="class_id không hợp lệ")
            class_info = class_resp.data[0]

        # Extract parent_contacts trước khi insert student
        parent_contacts = student_data.parent_contacts

        data = {
            "student_id": student_data.student_id,
            "full_name": student_data.full_name,
            "date_of_birth": student_data.date_of_birth,
            "gender": student_data.gender,
            "class_name": class_info["class_name"] if class_info else student_data.class_name,
            "grade": str(class_info["grade"]) if class_info else student_data.grade,
            "is_active": True,  # Default value
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        if student_data.email:
            data["email"] = student_data.email
        if student_data.phone:
            data["phone"] = student_data.phone
        if student_data.address:
            data["address"] = student_data.address
        
        # Sanitize: đảm bảo không có class_id trong payload insert
        if "class_id" in data:
            data.pop("class_id", None)
        logger.debug(f"📝 Create student inserting keys: {list(data.keys())}")
        response = db.table("students").insert(data).execute()

        # Nếu tạo thành công
        if response.data:
            created_student = response.data[0]
            student_id = created_student["id"]
            
            # Insert parent_contacts vào bảng parent_info
            if parent_contacts and isinstance(parent_contacts, list):
                parent_records = []
                for contact in parent_contacts:
                    if isinstance(contact, dict) and (contact.get("name") or contact.get("phone")):
                        parent_records.append({
                            "student_id": student_id,
                            "relation": contact.get("relation", "parent"),
                            "name": contact.get("name"),
                            "phone": contact.get("phone")
                        })
                
                if parent_records:
                    db.table("parent_info").insert(parent_records).execute()
            
            # Insert vào homeroom_students_history nếu có class_id
            if class_info:
                db.table("homeroom_students_history").insert({
                    "teacher_id": class_info.get("homeroom_teacher_id"),
                    "class_id": class_info["id"],
                    "student_id": student_id
                }).execute()
            
            # Fetch lại student với parent_info để trả về
            parent_info = db.table("parent_info").select("*").eq("student_id", student_id).execute()
            created_student["parent_contacts"] = parent_info.data if parent_info.data else []
            
            return {"success": True, "data": created_student, "message": "Tạo học sinh thành công"}
        else:
            raise HTTPException(status_code=500, detail="Không thể tạo học sinh")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating student: {str(e)}")
        raise handle_database_error(e)


@router.put("/students/{student_id}")
async def update_student_admin(
    student_id: int,
    student_data: StudentUpdate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Cập nhật thông tin học sinh"""
    try:
        update_data = {"updated_at": datetime.now().isoformat()}
        parent_contacts = None
        
        if student_data.student_id:
            update_data["student_id"] = student_data.student_id
        if student_data.full_name:
            update_data["full_name"] = student_data.full_name
        if student_data.date_of_birth:
            update_data["date_of_birth"] = student_data.date_of_birth
        if student_data.gender:
            update_data["gender"] = student_data.gender
        if student_data.class_name:
            update_data["class_name"] = student_data.class_name
        if student_data.grade:
            update_data["grade"] = student_data.grade
        if student_data.email:
            update_data["email"] = student_data.email
        if student_data.phone:
            update_data["phone"] = student_data.phone
        if student_data.address:
            update_data["address"] = student_data.address
        if student_data.parent_contacts is not None:
            parent_contacts = student_data.parent_contacts
        if student_data.is_active is not None:
            update_data["is_active"] = student_data.is_active
        
        # Update student data
        response = db.table("students").update(update_data).eq("id", student_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
        
        # Update parent_info nếu có
        if parent_contacts is not None:
            # Xóa parent_info cũ
            db.table("parent_info").delete().eq("student_id", student_id).execute()
            
            # Insert parent_info mới
            if isinstance(parent_contacts, list) and parent_contacts:
                parent_records = []
                for contact in parent_contacts:
                    if isinstance(contact, dict) and (contact.get("name") or contact.get("phone")):
                        parent_records.append({
                            "student_id": student_id,
                            "relation": contact.get("relation", "parent"),
                            "name": contact.get("name"),
                            "phone": contact.get("phone")
                        })
                
                if parent_records:
                    db.table("parent_info").insert(parent_records).execute()
        
        # Fetch lại student với parent_info để trả về
        student_response = db.table("students").select("*").eq("id", student_id).execute()
        if student_response.data:
            student_result = student_response.data[0]
            parent_info = db.table("parent_info").select("*").eq("student_id", student_id).execute()
            student_result["parent_contacts"] = parent_info.data if parent_info.data else []
            
            return {"success": True, "data": student_result, "message": "Cập nhật học sinh thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating student: {str(e)}")
        raise handle_database_error(e)


@router.delete("/students/{student_id}")
async def delete_student_admin(
    student_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Soft delete học sinh (set is_active = false)"""
    try:
        # Kiểm tra xem student có tồn tại không
        student_check = db.table("students").select("id").eq("id", student_id).execute()
        if not student_check.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
        
        # Soft delete: Set is_active = false
        response = db.table("students").update({
            "is_active": False,
            "updated_at": datetime.now().isoformat()
        }).eq("id", student_id).execute()
        
        if response.data:
            return {"success": True, "message": "Xóa học sinh thành công (soft delete)"}
        else:
            raise HTTPException(status_code=500, detail="Lỗi khi xóa học sinh")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error soft deleting student: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa học sinh: {str(e)}")


@router.post("/students/{student_id}/restore")
async def restore_student_admin(
    student_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Khôi phục học sinh đã bị soft delete"""
    try:
        # Kiểm tra xem student có tồn tại không
        student_check = db.table("students").select("id").eq("id", student_id).execute()
        if not student_check.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
        
        # Restore: Set is_active = true
        response = db.table("students").update({
            "is_active": True,
            "updated_at": datetime.now().isoformat()
        }).eq("id", student_id).execute()
        
        if response.data:
            return {"success": True, "message": "Khôi phục học sinh thành công"}
        else:
            raise HTTPException(status_code=500, detail="Lỗi khi khôi phục học sinh")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error restoring student: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi khôi phục học sinh: {str(e)}")


@router.delete("/students/{student_id}/permanent")
async def permanent_delete_student_admin(
    student_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Xóa vĩnh viễn học sinh (hard delete với cascade)"""
    try:
        # Kiểm tra xem student có tồn tại không
        student_check = db.table("students").select("id").eq("id", student_id).execute()
        if not student_check.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
        
        # Xóa các bản ghi liên quan
        db.table("attendance").delete().eq("student_id", student_id).execute()
        db.table("scores").delete().eq("student_id", student_id).execute()
        
        # Xóa vĩnh viễn student record
        response = db.table("students").delete().eq("id", student_id).execute()
        
        if response.data:
            return {"success": True, "message": "Xóa vĩnh viễn học sinh thành công"}
        else:
            raise HTTPException(status_code=500, detail="Lỗi khi xóa vĩnh viễn học sinh")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error permanently deleting student: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa vĩnh viễn học sinh: {str(e)}")


@router.post("/students/bulk-import")
async def bulk_import_students(
    import_data: BulkStudentImport,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Nhập học sinh hàng loạt từ file Excel/CSV"""
    try:
        # Lấy class_info từ class_id filter nếu có (giống create_student_admin)
        class_info = None
        if import_data.class_id:
            class_resp = db.table("classes").select("id, class_name, grade, homeroom_teacher_id").eq("id", import_data.class_id).execute()
            if class_resp.data:
                class_info = class_resp.data[0]
                logger.debug(f"✅ Sử dụng class_id filter: {class_info['class_name']} (grade {class_info['grade']})")
            else:
                logger.warn(f"⚠️ class_id {import_data.class_id} không tồn tại trong database")
        
        success_count = 0
        error_count = 0
        errors = []
        created_students = []
        
        for student_record in import_data.students:
            try:
                # Validate required fields
                # Nếu có class_info từ filter, không cần lop_hoc và khoi từ file
                if not student_record.ho_va_ten:
                    errors.append(f"Thiếu thông tin bắt buộc (Họ tên) cho học sinh")
                    error_count += 1
                    continue
                
                # Xác định class_name và grade (ưu tiên từ class_info nếu có, giống create_student_admin)
                if class_info:
                    # Dùng class_name và grade từ class_info (bỏ qua giá trị từ file)
                    final_class_name = class_info["class_name"]
                    final_grade = str(class_info["grade"])
                else:
                    # Không có filter, yêu cầu lop_hoc và khoi từ file
                    if not student_record.lop_hoc or not student_record.khoi:
                        errors.append(f"Thiếu thông tin lớp/khối cho học sinh: {student_record.ho_va_ten}")
                        error_count += 1
                        continue
                    final_class_name = student_record.lop_hoc
                    final_grade = student_record.khoi
                
                # Generate student ID (dùng final_grade và academic_year)
                student_id = generate_student_id(final_grade, db, import_data.academic_year)
                
                # Check if student ID already exists
                existing = db.table("students").select("student_id").eq("student_id", student_id).execute()
                if existing.data:
                    # Generate new ID if exists
                    counter = 1
                    while existing.data:
                        new_id = student_id[:-4] + str(int(student_id[-4:]) + counter).zfill(4)
                        existing = db.table("students").select("student_id").eq("student_id", new_id).execute()
                        if not existing.data:
                            student_id = new_id
                            break
                        counter += 1
                
                # Validate gender field
                gender = student_record.gioi_tinh or "Nam"
                if gender not in ['Nam', 'Nữ', 'Khác']:
                    errors.append(f"Giới tính không hợp lệ cho học sinh {student_record.ho_va_ten}: {gender}")
                    error_count += 1
                    continue
                
                # Prepare student data (dùng final_class_name và final_grade, giống create_student_admin)
                student_data = {
                    "student_id": student_id,
                    "full_name": student_record.ho_va_ten,
                    "class_name": final_class_name,
                    "grade": final_grade,
                    "gender": gender,
                    "is_active": True,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
                
                # Optional fields
                if student_record.email:
                    student_data["email"] = student_record.email
                if student_record.so_dien_thoai:
                    student_data["phone"] = student_record.so_dien_thoai
                if student_record.ngay_sinh:
                    student_data["date_of_birth"] = student_record.ngay_sinh
                if student_record.dia_chi:
                    student_data["address"] = student_record.dia_chi

                # Build parent_contacts
                contacts: list = []
                # JSON list provided
                if isinstance(student_record.parent_contacts, list):
                    for c in student_record.parent_contacts:
                        if isinstance(c, dict):
                            name = (c.get("name") or "").strip()
                            phone = (c.get("phone") or "").strip()
                            relation = (c.get("relation") or "parent").strip() or "parent"
                            if name or phone:
                                contacts.append({"relation": relation, "name": name or None, "phone": phone or None})
                # Legacy single columns
                if student_record.ten_phu_huynh or student_record.sdt_phu_huynh:
                    contacts.append({
                        "relation": "parent",
                        "name": (student_record.ten_phu_huynh or '').strip() or None,
                        "phone": (student_record.sdt_phu_huynh or '').strip() or None,
                    })
                # Father/Mother columns
                if student_record.ten_bo or student_record.sdt_bo:
                    contacts.append({
                        "relation": "father",
                        "name": (student_record.ten_bo or '').strip() or None,
                        "phone": (student_record.sdt_bo or '').strip() or None,
                    })
                if student_record.ten_me or student_record.sdt_me:
                    contacts.append({
                        "relation": "mother",
                        "name": (student_record.ten_me or '').strip() or None,
                        "phone": (student_record.sdt_me or '').strip() or None,
                    })

                # Deduplicate by (relation,name,phone) and remove empty
                norm = []
                for c in contacts:
                    if not (c.get("name") or c.get("phone")):
                        continue
                    key = (c.get("relation"), c.get("name"), c.get("phone"))
                    if key not in norm:
                        norm.append(key)
                parent_contacts_clean = [
                    {"relation": r, "name": n, "phone": p} for (r, n, p) in norm
                ]

                # Insert student (whitelist) - KHÔNG insert parent_contacts vào students table
                allowed_fields = [
                    "student_id", "full_name", "class_name", "grade", "gender",
                    "email", "phone", "date_of_birth", "address",
                    "is_active", "created_at", "updated_at"
                ]
                student_row = {k: student_data.get(k) for k in allowed_fields if student_data.get(k) is not None}
                logger.debug(f"📝 Bulk import inserting student with keys: {list(student_row.keys())}")
                response = db.table("students").insert(student_row).execute()
                
                if response.data:
                    created_student = response.data[0]
                    created_student_id = created_student["id"]
                    
                    # Insert parent_contacts vào bảng parent_info
                    if parent_contacts_clean:
                        parent_records = []
                        for contact in parent_contacts_clean:
                            parent_records.append({
                                "student_id": created_student_id,
                                "relation": contact["relation"],
                                "name": contact["name"],
                                "phone": contact["phone"]
                            })
                        
                        if parent_records:
                            db.table("parent_info").insert(parent_records).execute()
                    
                    success_count += 1
                    created_students.append({
                        "student_id": student_id,
                        "full_name": student_record.ho_va_ten,
                        "class_name": final_class_name
                    })
                    
                    # Nếu có class_info, insert vào homeroom_students_history (giống create_student_admin)
                    # If no class_info filter but student has class_name, look up the class for homeroom_students_history
                    student_class_info = class_info
                    
                    if not student_class_info and final_class_name:
                        # Look up class by final_class_name + academic_year (for Profile tab bulk import)
                        lookup_resp = db.table("classes").select("id, homeroom_teacher_id").eq("class_name", final_class_name).eq("academic_year", import_data.academic_year).execute()
                        if lookup_resp.data:
                            student_class_info = lookup_resp.data[0]
                            logger.debug(f"📍 Found class for student {student_record.ho_va_ten}: {final_class_name} (class_id={student_class_info['id']})")
                    
                    if student_class_info:
                        try:
                            # Validate homeroom_teacher_id exists (same as single student creation)
                            homeroom_teacher_id = student_class_info.get("homeroom_teacher_id")
                            if homeroom_teacher_id:
                                db.table("homeroom_students_history").insert({
                                    "teacher_id": homeroom_teacher_id,
                                    "class_id": student_class_info.get("id"),
                                    "student_id": created_student["id"]
                                }).execute()
                                logger.debug(f"✅ Đã ghi vào homeroom_students_history cho học sinh {created_student['id']} (class_id={student_class_info.get('id')}, teacher_id={homeroom_teacher_id})")
                            else:
                                logger.warn(f"⚠️ Lớp {final_class_name} không có giáo viên chủ nhiệm. Không ghi vào homeroom_students_history cho học sinh {student_record.ho_va_ten}")
                        except Exception as hist_err:
                            logger.error(f"❌ Lỗi khi ghi vào homeroom_students_history cho học sinh {student_record.ho_va_ten}: {str(hist_err)}")
                else:
                    errors.append(f"Không thể tạo học sinh: {student_record.ho_va_ten}")
                    error_count += 1
                    
            except Exception as e:
                error_msg = f"Lỗi khi tạo học sinh {student_record.ho_va_ten}: {str(e)}"
                errors.append(error_msg)
                error_count += 1
                logger.error(error_msg)
        
        return {
            "success": True,
            "message": f"Nhập học sinh hoàn thành. Thành công: {success_count}, Lỗi: {error_count}",
            "data": {
                "success_count": success_count,
                "error_count": error_count,
                "errors": errors,
                "created_students": created_students
            }
        }
    except Exception as e:
        logger.error(f"Error in bulk import students: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )


# ===============================================
# DASHBOARD ANALYTICS ENDPOINTS
# ===============================================

@router.get("/dashboard/bootstrap")
async def get_dashboard_bootstrap(
    academic_year: str = Query(...),
    period_days: int = Query(30),
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """
    Bootstrap endpoint — returns all dashboard data in a single call:
    overview stats, attendance trends, class performance, system health.
    """
    from datetime import datetime, timedelta
    from collections import defaultdict

    result = {
        "overview": None,
        "attendance_trends": [],
        "class_performance": [],
        "infra_stats": None,
    }

    # Resolve the academic year's full date window
    # Academic year format: "2024-2025"
    try:
        year_start_int = int(academic_year.split("-")[0])
    except (ValueError, IndexError):
        year_start_int = datetime.now().year

    year_start_date = f"{year_start_int}-09-01"   # School year starts ~Sep 1
    year_end_date = f"{year_start_int + 1}-06-30"  # School year ends ~Jun 30
    today_str = datetime.now().date().isoformat()

    # Full-year window: capped at today if this is the current or future year
    full_year_end = min(year_end_date, today_str)
    full_year_start = year_start_date

    # Period window for attendance trends:
    # period_days == 0  → use the full academic year span
    # period_days  > 0  → use last N calendar days (only meaningful for current year)
    if period_days == 0:
        trend_start = full_year_start
        trend_end = full_year_end
    else:
        trend_start = (datetime.now() - timedelta(days=period_days)).date().isoformat()
        trend_end = today_str

    # ── 1. Overview ──────────────────────────────────────────────────────────
    try:
        students_count = len(db.table("students").select("id").eq("is_active", True).execute().data or [])
        classes_count = len(db.table("classes").select("id").eq("is_active", True).eq("academic_year", academic_year).execute().data or [])
        teachers_count = len(db.table("teachers").select("id").eq("is_active", True).execute().data or [])

        # Attendance rate = full academic year rate (not period-based)
        att_resp = (
            db.table("attendance")
            .select("id, status")
            .gte("date", full_year_start)
            .lte("date", full_year_end)
            .execute()
        )
        att_data = att_resp.data or []
        present_count = sum(1 for a in att_data if a.get("status") == "present")
        total_att = len(att_data)
        attendance_rate = round(present_count / total_att * 100, 1) if total_att > 0 else 0

        result["overview"] = {
            "total_students": students_count,
            "total_classes": classes_count,
            "total_teachers": teachers_count,
            "attendance_rate": attendance_rate,
            "academic_year": academic_year,
        }
    except Exception as e:
        logger.error(f"Bootstrap overview error: {e}", exc_info=True)

    # ── 2. Attendance Trends ─────────────────────────────────────────────────
    try:
        att_resp2 = (
            db.table("attendance")
            .select("date, status")
            .gte("date", trend_start)
            .lte("date", trend_end)
            .order("date", desc=False)
            .execute()
        )
        daily_stats: dict = defaultdict(lambda: {"present": 0, "absent": 0})
        for record in (att_resp2.data or []):
            d = record.get("date", "")
            s = record.get("status", "")
            if s == "present":
                daily_stats[d]["present"] += 1
            else:
                daily_stats[d]["absent"] += 1

        trends = []
        for d in sorted(daily_stats.keys()):
            stats = daily_stats[d]
            total_on_day = stats["present"] + stats["absent"]
            rate = round(stats["present"] / total_on_day * 100, 1) if total_on_day > 0 else 0
            trends.append({"date": d, "present": stats["present"], "absent": stats["absent"], "rate": rate})
        result["attendance_trends"] = trends
    except Exception as e:
        logger.error(f"Bootstrap attendance trends error: {e}", exc_info=True)

    # ── 3. Class Performance ─────────────────────────────────────────────────
    try:
        classes_resp = db.table("classes").select("id, class_name").eq("academic_year", academic_year).eq("is_active", True).execute()
        performance = []
        for cls in (classes_resp.data or []):
            class_id = cls["id"]
            class_name = cls["class_name"]

            # Student count via students.class_name match
            stu_resp = db.table("students").select("id").eq("class_name", class_name).eq("is_active", True).execute()
            total_students_cls = len(stu_resp.data or [])

            # Scores via class_subjects → scores
            cs_resp = db.table("class_subjects").select("id").eq("class_id", class_id).eq("academic_year", academic_year).execute()
            cs_ids = [cs["id"] for cs in (cs_resp.data or [])]

            numeric_scores = []
            if cs_ids:
                scores_resp = db.table("scores").select("final_score").in_("class_subject_id", cs_ids).eq("academic_year", academic_year).execute()
                for s in (scores_resp.data or []):
                    fs = s.get("final_score")
                    if fs:
                        try:
                            numeric_scores.append(float(fs))
                        except (ValueError, TypeError):
                            pass

            if numeric_scores:
                avg_score = round(sum(numeric_scores) / len(numeric_scores), 1)
                excellent = sum(1 for v in numeric_scores if v >= 8.5)
                good = sum(1 for v in numeric_scores if 7.0 <= v < 8.5)
                average = sum(1 for v in numeric_scores if 5.5 <= v < 7.0)
                poor = sum(1 for v in numeric_scores if v < 5.5)
            else:
                avg_score = excellent = good = average = poor = 0

            performance.append({
                "class_name": class_name,
                "total_students": total_students_cls,
                "average_score": avg_score,
                "excellent_count": excellent,
                "good_count": good,
                "average_count": average,
                "poor_count": poor,
            })

        performance.sort(key=lambda x: x["average_score"], reverse=True)
        result["class_performance"] = performance
    except Exception as e:
        logger.error(f"Bootstrap class performance error: {e}", exc_info=True)

    # ── 4. Infra Stats ───────────────────────────────────────────────────────
    try:
        subjects_count = len(db.table("subjects").select("id").eq("is_active", True).execute().data or [])
        cameras_count = len(db.table("cameras").select("id").eq("enabled", True).execute().data or [])
        students_with_face_resp = db.table("students").select("id").eq("is_active", True).gt("face_samples_count", 0).execute()
        students_with_face = len(students_with_face_resp.data or [])

        result["infra_stats"] = {
            "total_subjects": subjects_count,
            "total_cameras": cameras_count,
            "students_with_face": students_with_face,
        }
    except Exception as e:
        logger.error(f"Bootstrap infra stats error: {e}", exc_info=True)

    logger.info(f"Dashboard bootstrap retrieved for academic_year={academic_year}, period_days={period_days}")
    return {"success": True, "data": result}


@router.get("/dashboard/overview")
async def get_dashboard_overview(
    academic_year: str = Query(...),
    period_days: int = Query(30),
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """
    Get dashboard overview stats
    - Total users, students, classes, teachers
    - Attendance rate for selected period/year
    """
    logger.debug(f"Dashboard overview request - academic_year: {academic_year}, period_days: {period_days}")
    logger.debug(f"Academic year type: {type(academic_year)}, Period days type: {type(period_days)}")
    
    try:
        from datetime import datetime, timedelta
        
        # Get total counts
        users_count = len(db.table("users").select("id").eq("is_active", True).execute().data or [])
        students_count = len(db.table("students").select("id").eq("is_active", True).execute().data or [])
        classes_count = len(db.table("classes").select("id").eq("is_active", True).eq("academic_year", academic_year).execute().data or [])
        teachers_count = len(db.table("teachers").select("id").eq("is_active", True).execute().data or [])
        
        # Get current settings to determine current academic year
        settings_response = db.table("settings").select("academic_year").execute()
        current_academic_year = settings_response.data[0].get("academic_year") if settings_response.data else academic_year
        
        # Calculate attendance rate
        if academic_year == current_academic_year:
            # Current year: use period_days window
            start_date = (datetime.now() - timedelta(days=period_days)).date().isoformat()
            attendance_response = db.table("attendance").select("id, status").gte("date", start_date).execute()
        else:
            # Past year: use full academic year
            attendance_response = db.table("attendance").select("id, status").execute()
            # Filter by academic year (if attendance table has academic_year field)
        
        attendance_data = attendance_response.data or []
        present_count = len([a for a in attendance_data if a.get("status") == "present"])
        total_attendance = len(attendance_data)
        attendance_rate = (present_count / total_attendance * 100) if total_attendance > 0 else 0
        
        logger.info(f"Dashboard overview retrieved successfully for {academic_year}")
        return {
            "success": True,
            "data": {
                "total_users": users_count,
                "total_students": students_count,
                "total_classes": classes_count,
                "total_teachers": teachers_count,
                "attendance_rate": round(attendance_rate, 1),
                "period_days": period_days
            }
        }
    except Exception as e:
        logger.error(f"Error getting dashboard overview: {str(e)}", exc_info=True)
        logger.error(f"Failed parameters - academic_year: {academic_year} (type: {type(academic_year)}), period_days: {period_days} (type: {type(period_days)})")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/dashboard/attendance-trends")
async def get_attendance_trends(
    academic_year: str = Query(...),
    period_days: int = Query(30),
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """
    Get attendance trends for selected period/year
    Groups by date and returns present/absent/rate
    """
    logger.debug(f"Dashboard attendance trends request - academic_year: {academic_year}, period_days: {period_days}")
    logger.debug(f"Academic year type: {type(academic_year)}, Period days type: {type(period_days)}")
    
    try:
        from datetime import datetime, timedelta
        from collections import defaultdict
        
        # Get current settings
        settings_response = db.table("settings").select("academic_year").execute()
        current_academic_year = settings_response.data[0].get("academic_year") if settings_response.data else academic_year
        
        # Fetch attendance data
        if academic_year == current_academic_year:
            start_date = (datetime.now() - timedelta(days=period_days)).date().isoformat()
            attendance_response = db.table("attendance").select("id, date, status").gte("date", start_date).order("date", desc=False).execute()
        else:
            attendance_response = db.table("attendance").select("id, date, status").order("date", desc=False).execute()
        
        attendance_data = attendance_response.data or []
        
        # Group by date
        daily_stats = defaultdict(lambda: {"present": 0, "absent": 0})
        for record in attendance_data:
            date = record.get("date", "")
            status = record.get("status", "")
            if status == "present":
                daily_stats[date]["present"] += 1
            else:
                daily_stats[date]["absent"] += 1
        
        # Get total students
        students_response = db.table("students").select("id").eq("is_active", True).execute()
        total_students = len(students_response.data or [])
        
        # Build response
        trends = []
        for date in sorted(daily_stats.keys()):
            stats = daily_stats[date]
            rate = ((stats["present"] / total_students) * 100) if total_students > 0 else 0
            trends.append({
                "date": date,
                "present": stats["present"],
                "absent": stats["absent"],
                "rate": round(rate, 1)
            })
        
        logger.info(f"Dashboard attendance trends retrieved successfully for {academic_year}")
        return {
            "success": True,
            "data": trends
        }
    except Exception as e:
        logger.error(f"Error getting attendance trends: {str(e)}", exc_info=True)
        logger.error(f"Failed parameters - academic_year: {academic_year} (type: {type(academic_year)}), period_days: {period_days} (type: {type(period_days)})")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/dashboard/class-performance")
async def get_class_performance(
    academic_year: str = Query(...),
    period_days: int = Query(30),
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """
    Get class performance by average score
    Shows average score and score distribution per class
    """
    logger.debug(f"Dashboard class performance request - academic_year: {academic_year}, period_days: {period_days}")
    logger.debug(f"Academic year type: {type(academic_year)}, Period days type: {type(period_days)}")
    
    try:
        from datetime import datetime, timedelta
        
        # Get current settings
        settings_response = db.table("settings").select("academic_year").execute()
        current_academic_year = settings_response.data[0].get("academic_year") if settings_response.data else academic_year
        
        # Fetch classes for this academic year
        classes_response = db.table("classes").select("id, class_name, academic_year").eq("academic_year", academic_year).eq("is_active", True).execute()
        classes_data = classes_response.data or []
        
        performance = []
        for class_record in classes_data:
            class_id = class_record.get("id")
            class_name = class_record.get("class_name")
            
            # Get students in this class
            students_response = db.table("homeroom_students_history").select("student_id").eq("class_id", class_id).eq("academic_year", academic_year).execute()
            student_ids = [s.get("student_id") for s in (students_response.data or [])]
            total_students = len(student_ids)
            
            if total_students == 0:
                continue
            
            # Get scores for students in this class
            scores_response = db.table("scores").select("id, value").in_("student_id", student_ids).eq("class_id", class_id).execute()
            scores_data = scores_response.data or []
            
            if not scores_data:
                performance.append({
                    "class_name": class_name,
                    "total_students": total_students,
                    "average_score": 0,
                    "excellent_count": 0,
                    "good_count": 0,
                    "average_count": 0,
                    "poor_count": 0
                })
                continue
            
            # Calculate stats
            values = [float(s.get("value", 0)) for s in scores_data]
            avg_score = sum(values) / len(values) if values else 0
            
            excellent = len([v for v in values if v >= 8.5])
            good = len([v for v in values if 7.0 <= v < 8.5])
            average = len([v for v in values if 5.5 <= v < 7.0])
            poor = len([v for v in values if v < 5.5])
            
            performance.append({
                "class_name": class_name,
                "total_students": total_students,
                "average_score": round(avg_score, 1),
                "excellent_count": excellent,
                "good_count": good,
                "average_count": average,
                "poor_count": poor
            })
        
        logger.info(f"Dashboard class performance retrieved successfully for {academic_year}")
        return {
            "success": True,
            "data": performance
        }
    except Exception as e:
        logger.error(f"Error getting class performance: {str(e)}", exc_info=True)
        logger.error(f"Failed parameters - academic_year: {academic_year} (type: {type(academic_year)}), period_days: {period_days} (type: {type(period_days)})")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/dashboard/academic-years")
async def get_dashboard_academic_years(
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """
    Get list of available academic years from classes/settings
    """
    try:
        # Get distinct academic years from classes
        classes_response = db.table("classes").select("academic_year").execute()
        academic_years = list(set([c.get("academic_year") for c in (classes_response.data or []) if c.get("academic_year")]))
        academic_years.sort(reverse=True)
        
        return {
            "success": True,
            "data": academic_years
        }
    except Exception as e:
        logger.error(f"Error getting academic years: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/dashboard/system-health")
async def get_system_health(
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """
    Get system health status
    Returns database connection status, error count in last 24h, and uptime
    """
    try:
        # Check database connectivity
        try:
            health_check = db.table("settings").select("count").limit(1).execute()
            db_status = "healthy" if health_check.data is not None else "unhealthy"
        except:
            db_status = "unhealthy"
        
        # Get error count from logs (simplified - assumes logs table exists)
        error_count = 0
        try:
            from datetime import datetime, timedelta
            start_time = (datetime.now() - timedelta(hours=24)).isoformat()
            errors_response = db.table("logs").select("id").gte("timestamp", start_time).eq("level", "error").execute()
            error_count = len(errors_response.data or [])
        except:
            error_count = 0
        
        # Calculate uptime (for now, return a placeholder)
        # In production, this would come from application startup time
        uptime = "--"
        
        return {
            "success": True,
            "data": {
                "database_status": db_status,
                "error_count_24h": error_count,
                "uptime": uptime
            }
        }
    except Exception as e:
        logger.error(f"Error getting system health: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ===============================================
# SYSTEM SETTINGS ENDPOINTS
# ===============================================

@router.get("/system-settings")
async def get_system_settings(
    current_user=Depends(get_current_user),  # Cho phép tất cả user đã login
    db=Depends(get_db)
):
    """Lấy danh sách tất cả cấu hình hệ thống (public cho mọi user)"""
    try:
        response = db.table("system_settings").select("*").order("setting_key").execute()
        
        return {"success": True, "data": response.data}
    except Exception as e:
        logger.error(f"Error getting system settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy cấu hình hệ thống: {str(e)}")


@router.get("/system-settings/{setting_key}")
async def get_system_setting(
    setting_key: str,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy một cấu hình hệ thống cụ thể"""
    try:
        response = db.table("system_settings").select("*").eq("setting_key", setting_key).execute()
        
        if response.data and len(response.data) > 0:
            return {"success": True, "data": response.data[0]}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy cấu hình")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting system setting: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy cấu hình: {str(e)}")


@router.put("/system-settings/{setting_key}")
async def update_system_setting(
    setting_key: str,
    setting_data: dict,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Cập nhật cấu hình hệ thống"""
    try:
        # Kiểm tra xem setting có tồn tại không
        check_response = db.table("system_settings").select("*").eq("setting_key", setting_key).execute()
        
        if not check_response.data or len(check_response.data) == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy cấu hình")
        
        # Cập nhật
        update_data = {
            "setting_value": setting_data.get('setting_value'),
            "updated_at": datetime.now().isoformat()
        }
        
        if 'description' in setting_data:
            update_data['description'] = setting_data['description']
        
        response = db.table("system_settings").update(update_data).eq("setting_key", setting_key).execute()
        
        if response.data:
            clear_settings_cache()
            return {"success": True, "data": response.data[0], "message": "Cập nhật cấu hình thành công"}
        else:
            raise HTTPException(status_code=500, detail="Không thể cập nhật cấu hình")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating system setting: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật cấu hình: {str(e)}")

@router.get("/classes/default-academic-year")
async def get_default_academic_year(admin_user=Depends(get_admin_user)):
    """Lấy năm học mặc định từ system_settings."""
    return {"success": True, "data": get_current_academic_year()}


# ===============================================
# CONFIG DAYOFFS (Ngày nghỉ theo khối)
# ===============================================

@router.get("/dayoffs")
async def list_dayoffs(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    grade: Optional[int] = Query(None, description="10/11/12"),
    admin_user=Depends(get_admin_user),
    db=Depends(get_db),
):
    """Liệt kê cấu hình ngày nghỉ. Có thể lọc theo year, month, grade."""
    try:
        query = db.table("dayoff").select("*")
        if year is not None:
            query = query.eq("year", year)
        if month is not None:
            query = query.eq("month", month)
        if grade is not None:
            query = query.eq("grade", grade)
        resp = query.order("year, month, grade").execute()
        return {"success": True, "data": resp.data or []}
    except Exception as e:
        logger.error(f"Error list dayoffs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy cấu hình ngày nghỉ: {str(e)}")


@router.post("/dayoffs")
async def create_dayoff_config(
    payload: dict,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db),
):
    """Tạo cấu hình ngày nghỉ: body {year, month, grade, dayoffs_list: [int,...]}"""
    try:
        required = ["year", "month", "grade", "dayoffs_list"]
        for k in required:
            if k not in payload:
                raise HTTPException(status_code=400, detail=f"Thiếu trường {k}")
        data = {
            "year": int(payload["year"]),
            "month": int(payload["month"]),
            "grade": int(payload["grade"]),
            "dayoffs_list": payload.get("dayoffs_list") or [],
            "updated_at": datetime.now().isoformat(),
        }
        # nếu đã tồn tại thì cập nhật thay vì tạo mới
        existing = (
            db.table("dayoff")
            .select("id")
            .eq("year", data["year"]).eq("month", data["month"]).eq("grade", data["grade"])  
            .execute()
        )
        if existing.data:
            resp = db.table("dayoff").update(data).eq("id", existing.data[0]["id"]).execute()
        else:
            resp = db.table("dayoff").insert(data).execute()
        return {"success": True, "data": resp.data[0] if resp.data else None}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error create dayoff config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo cấu hình ngày nghỉ: {str(e)}")


@router.put("/dayoffs/{config_id}")
async def update_dayoff_config(
    config_id: int,
    payload: dict,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db),
):
    try:
        update_data = {"updated_at": datetime.now().isoformat()}
        for f in ["year", "month", "grade", "dayoffs_list"]:
            if f in payload:
                update_data[f] = payload[f]
        resp = db.table("dayoff").update(update_data).eq("id", config_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi cấu hình")
        return {"success": True, "data": resp.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error update dayoff config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật cấu hình ngày nghỉ: {str(e)}")


@router.delete("/dayoffs/{config_id}")
async def delete_dayoff_config(
    config_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db),
):
    try:
        resp = db.table("dayoff").delete().eq("id", config_id).execute()
        return {"success": True, "data": None}
    except Exception as e:
        logger.error(f"Error delete dayoff config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa cấu hình ngày nghỉ: {str(e)}")


# ===============================================
# BULK MOVE STUDENTS BETWEEN CLASSES
# ===============================================
@router.post("/students/move-class")
async def move_students_class(
    payload: dict,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Chuyển lớp cho nhiều học sinh và ghi lịch sử vào homeroom_students_history.

    Body: { 
        "student_ids": [int], 
        "current_class_id": int,
        "target_class_id": int 
    }
    
    Logic:
    - If same academic year: UPDATE the existing homeroom_students_history record
    - If different academic year: KEEP old record, CREATE new record
    - Constraint: In same academic year, cannot move student if already in a different class
    """
    try:
        student_ids = payload.get("student_ids") or []
        current_class_id = payload.get("current_class_id")
        target_class_id = payload.get("target_class_id")

        if not isinstance(student_ids, list) or len(student_ids) == 0:
            raise HTTPException(status_code=400, detail="Danh sách student_ids không hợp lệ")
        if not current_class_id:
            raise HTTPException(status_code=400, detail="Thiếu current_class_id")
        if not target_class_id:
            raise HTTPException(status_code=400, detail="Thiếu target_class_id")
        if current_class_id == target_class_id:
            raise HTTPException(status_code=400, detail="Lớp đích phải khác lớp hiện tại")

        # Lấy thông tin lớp hiện tại và lớp đích
        current_class_resp = db.table("classes").select("id, class_name, grade, academic_year, homeroom_teacher_id").eq("id", current_class_id).execute()
        if not current_class_resp.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp hiện tại")
        current_class = current_class_resp.data[0]

        target_class_resp = db.table("classes").select("id, class_name, grade, academic_year, homeroom_teacher_id").eq("id", target_class_id).execute()
        if not target_class_resp.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp đích")
        target_class = target_class_resp.data[0]

        current_academic_year = current_class.get("academic_year")
        target_academic_year = target_class.get("academic_year")
        same_academic_year = current_academic_year == target_academic_year

        # === CONSTRAINT CHECK for same academic year ===
        if same_academic_year:
            # Kiểm tra xem có học sinh nào đã ở trong class khác trong cùng năm học được chọn
            for student_id in student_ids:
                existing = db.table("homeroom_students_history").select("id, class_id").eq("student_id", student_id).execute()
                if existing.data:
                    for record in existing.data:
                        # Lấy thông tin class của record đó
                        existing_class_resp = db.table("classes").select("id, academic_year").eq("id", record["class_id"]).execute()
                        if existing_class_resp.data:
                            existing_class_academic_year = existing_class_resp.data[0].get("academic_year")
                            # Nếu class đó cùng năm học nhưng khác lớp → lỗi
                            if (existing_class_academic_year == target_academic_year and 
                                record["class_id"] != current_class_id):
                                raise HTTPException(
                                    status_code=400, 
                                    detail=f"Học sinh ID {student_id} đã có trong một lớp khác trong năm học {target_academic_year}. Vui lòng kiểm tra lại."
                                )

        # Cập nhật students table
        db.table("students").update({
            "class_name": target_class["class_name"],
            "grade": str(target_class["grade"]),
            "updated_at": datetime.now().isoformat()
        }).in_("id", student_ids).execute()

        # Xử lý homeroom_students_history
        if same_academic_year:
            # Cùng năm học: UPDATE record cũ
            db.table("homeroom_students_history").update({
                "teacher_id": target_class.get("homeroom_teacher_id"),
                "class_id": target_class["id"]
            }).eq("class_id", current_class_id).in_("student_id", student_ids).execute()
        else:
            # Năm học khác: GIỮ record cũ, TẠO record mới
            new_history_rows = [{
                "teacher_id": target_class.get("homeroom_teacher_id"),
                "class_id": target_class["id"],
                "student_id": sid
            } for sid in student_ids]
            if new_history_rows:
                db.table("homeroom_students_history").insert(new_history_rows).execute()

        return {
            "success": True, 
            "message": f"Chuyển lớp thành công ({len(student_ids)} học sinh)",
            "data": {
                "updated_count": len(student_ids),
                "same_academic_year": same_academic_year
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error moving students class: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi chuyển lớp: {str(e)}")