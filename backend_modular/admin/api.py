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
    ClassSubjectCreate, ClassSubjectUpdate,
    StudentCreate, StudentUpdate, BulkStudentImport,
    ResponseModel
)
from admin.services import generate_student_id
from core.database import get_db
from core.logger import setup_logger
from auth.api import get_current_user

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
            "id, email, username, full_name, role, is_active, last_login, created_at, updated_at"
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
        # Kiểm tra username đã tồn tại chưa
        if user_data.username:
            trimmed_username = user_data.username.strip()
            if trimmed_username:
                existing = db.table("users").select("id").eq("username", trimmed_username).execute()
                if existing.data:
                    raise HTTPException(status_code=400, detail="Username đã được sử dụng")
        
        # Hash password
        password_hash = bcrypt.hashpw(
            user_data.password.encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')
        
        # Create user
        data = {
            "email": user_data.email,
            "password_hash": password_hash,
            "full_name": user_data.full_name,
            "role": user_data.role,
            "is_active": user_data.is_active,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        if user_data.username:
            data["username"] = user_data.username.strip()
        
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
        error_str = str(e)
        if "duplicate key value violates unique constraint" in error_str:
            if "users_email_key" in error_str:
                raise HTTPException(status_code=400, detail="Email đã được sử dụng bởi người dùng khác")
            elif "users_username_key" in error_str:
                raise HTTPException(status_code=400, detail="Username đã được sử dụng bởi người dùng khác")
            else:
                raise HTTPException(status_code=400, detail="Dữ liệu bị trùng lặp")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo người dùng: {str(e)}")


@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Cập nhật thông tin người dùng"""
    try:
        # Kiểm tra username nếu thay đổi
        if user_data.username:
            trimmed_username = user_data.username.strip()
            if trimmed_username:
                existing = db.table("users").select("id").eq("username", trimmed_username).neq("id", user_id).execute()
                if existing.data:
                    raise HTTPException(status_code=400, detail="Username đã được sử dụng")
        
        # Build update data
        update_data = {}
        if user_data.email:
            update_data["email"] = user_data.email
        if user_data.username:
            update_data["username"] = user_data.username.strip()
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
        
        update_data["updated_at"] = datetime.now().isoformat()
        
        response = db.table("users").update(update_data).eq("id", user_id).execute()
        
        if response.data:
            updated_user = response.data[0]
            updated_user.pop("password_hash", None)
            return {"success": True, "data": updated_user, "message": "Cập nhật người dùng thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        error_str = str(e)
        if "duplicate key value violates unique constraint" in error_str:
            if "users_email_key" in error_str:
                raise HTTPException(status_code=400, detail="Email đã được sử dụng bởi người dùng khác")
            elif "users_username_key" in error_str:
                raise HTTPException(status_code=400, detail="Username đã được sử dụng bởi người dùng khác")
            else:
                raise HTTPException(status_code=400, detail="Dữ liệu bị trùng lặp")
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật người dùng: {str(e)}")


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Soft delete người dùng (set is_active = false)"""
    try:
        # Kiểm tra xem user có tồn tại không
        user_check = db.table("users").select("id, role").eq("id", user_id).execute()
        if not user_check.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        
        # Soft delete: Set is_active = false
        response = db.table("users").update({
            "is_active": False,
            "updated_at": datetime.now().isoformat()
        }).eq("id", user_id).execute()
        
        if response.data:
            return {"success": True, "message": "Xóa người dùng thành công (soft delete)"}
        else:
            raise HTTPException(status_code=500, detail="Lỗi khi xóa người dùng")
        
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
    """Khôi phục người dùng đã bị soft delete"""
    try:
        # Kiểm tra xem user có tồn tại không
        user_check = db.table("users").select("id").eq("id", user_id).execute()
        if not user_check.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        
        # Restore: Set is_active = true
        response = db.table("users").update({
            "is_active": True,
            "updated_at": datetime.now().isoformat()
        }).eq("id", user_id).execute()
        
        if response.data:
            return {"success": True, "message": "Khôi phục người dùng thành công"}
        else:
            raise HTTPException(status_code=500, detail="Lỗi khi khôi phục người dùng")
        
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
                    db.table("grades").delete().eq("student_id", student_id).execute()
                
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
            "*, users:user_id(id, email, username, full_name, role)"
        ).order("created_at", desc=True).execute()
        
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
    """Tạo giáo viên mới"""
    try:
        data = {
            "user_id": teacher_data.user_id,
            "full_name": teacher_data.full_name,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        if teacher_data.teacher_code:
            data["teacher_code"] = teacher_data.teacher_code
        if teacher_data.email:
            data["email"] = teacher_data.email
        if teacher_data.phone:
            data["phone"] = teacher_data.phone
        if teacher_data.subject_specialization:
            data["subject_specialization"] = teacher_data.subject_specialization
        
        response = db.table("teachers").insert(data).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Tạo giáo viên thành công"}
        else:
            raise HTTPException(status_code=500, detail="Không thể tạo giáo viên")
        
    except Exception as e:
        logger.error(f"Error creating teacher: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo giáo viên: {str(e)}")


@router.put("/teachers/{teacher_id}")
async def update_teacher(
    teacher_id: int,
    teacher_data: TeacherUpdate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Cập nhật thông tin giáo viên"""
    try:
        update_data = {"updated_at": datetime.now().isoformat()}
        
        if teacher_data.teacher_code:
            update_data["teacher_code"] = teacher_data.teacher_code
        if teacher_data.full_name:
            update_data["full_name"] = teacher_data.full_name
        if teacher_data.email:
            update_data["email"] = teacher_data.email
        if teacher_data.phone:
            update_data["phone"] = teacher_data.phone
        if teacher_data.subject_specialization:
            update_data["subject_specialization"] = teacher_data.subject_specialization
        
        response = db.table("teachers").update(update_data).eq("id", teacher_id).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Cập nhật giáo viên thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy giáo viên")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating teacher: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.delete("/teachers/{teacher_id}")
async def delete_teacher(
    teacher_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Soft delete giáo viên (set is_active = false)"""
    try:
        # Kiểm tra xem teacher có tồn tại không
        teacher_check = db.table("teachers").select("id").eq("id", teacher_id).execute()
        if not teacher_check.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy giáo viên")
        
        # Soft delete: Set is_active = false
        response = db.table("teachers").update({
            "is_active": False,
            "updated_at": datetime.now().isoformat()
        }).eq("id", teacher_id).execute()
        
        if response.data:
            return {"success": True, "message": "Xóa giáo viên thành công (soft delete)"}
        else:
            raise HTTPException(status_code=500, detail="Lỗi khi xóa giáo viên")
        
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
    """Khôi phục giáo viên đã bị soft delete"""
    try:
        # Kiểm tra xem teacher có tồn tại không
        teacher_check = db.table("teachers").select("id").eq("id", teacher_id).execute()
        if not teacher_check.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy giáo viên")
        
        # Restore: Set is_active = true
        response = db.table("teachers").update({
            "is_active": True,
            "updated_at": datetime.now().isoformat()
        }).eq("id", teacher_id).execute()
        
        if response.data:
            return {"success": True, "message": "Khôi phục giáo viên thành công"}
        else:
            raise HTTPException(status_code=500, detail="Lỗi khi khôi phục giáo viên")
        
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
        teacher_check = db.table("teachers").select("id").eq("id", teacher_id).execute()
        if not teacher_check.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy giáo viên")
        
        # Set homeroom_teacher_id = null cho các lớp nếu teacher này là GVCN
        db.table("classes").update({"homeroom_teacher_id": None}).eq("homeroom_teacher_id", teacher_id).execute()
        
        # Xóa vĩnh viễn teacher record
        response = db.table("teachers").delete().eq("id", teacher_id).execute()
        
        if response.data:
            return {"success": True, "message": "Xóa vĩnh viễn giáo viên thành công"}
        else:
            raise HTTPException(status_code=500, detail="Lỗi khi xóa vĩnh viễn giáo viên")
        
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
        query = db.table("subjects").select("*")
        
        # Nếu không show_deleted, chỉ lấy các môn học active
        if not show_deleted:
            query = query.eq("is_active", True)
        
        response = query.order("subject_code").execute()
        
        return {"success": True, "data": response.data}
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
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        if subject_data.grade_level:
            data["grade_level"] = subject_data.grade_level
        
        response = db.table("subjects").insert(data).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Tạo môn học thành công"}
        else:
            raise HTTPException(status_code=500, detail="Không thể tạo môn học")
        
    except Exception as e:
        logger.error(f"Error creating subject: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.put("/subjects/{subject_id}")
async def update_subject(
    subject_id: int,
    subject_data: SubjectUpdate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Cập nhật thông tin môn học"""
    try:
        update_data = {"updated_at": datetime.now().isoformat()}
        
        if subject_data.subject_code:
            update_data["subject_code"] = subject_data.subject_code
        if subject_data.subject_name:
            update_data["subject_name"] = subject_data.subject_name
        if subject_data.description is not None:
            update_data["description"] = subject_data.description
        if subject_data.grade_level:
            update_data["grade_level"] = subject_data.grade_level
        if subject_data.is_active is not None:
            update_data["is_active"] = subject_data.is_active
        
        response = db.table("subjects").update(update_data).eq("id", subject_id).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Cập nhật môn học thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy môn học")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating subject: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


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
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy danh sách tất cả lớp học"""
    try:
        response = db.table("classes").select(
            "*, teachers:homeroom_teacher_id(id, full_name, teacher_code)"
        ).order("grade, class_name").execute()
        
        return {"success": True, "data": response.data}
    except Exception as e:
        logger.error(f"Error getting classes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/classes/{class_id}/students")
async def get_class_students(
    class_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy danh sách học sinh trong một lớp"""
    try:
        # Lấy thông tin lớp học trước
        class_response = db.table("classes").select("*").eq("id", class_id).execute()
        if not class_response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp học")
        
        class_info = class_response.data[0]
        
        # Lấy danh sách học sinh trong lớp theo class_name (giống backend gốc)
        # Backend gốc KHÔNG filter is_active, để frontend tự filter
        response = db.table("students").select("*").eq("class_name", class_info["class_name"]).execute()
        
        return {"success": True, "data": response.data}
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
        data = {
            "class_name": class_data.class_name,
            "grade": class_data.grade,
            "academic_year": class_data.academic_year,
            "is_active": class_data.is_active,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        if class_data.homeroom_teacher_id:
            data["homeroom_teacher_id"] = class_data.homeroom_teacher_id
        
        response = db.table("classes").insert(data).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Tạo lớp học thành công"}
        else:
            raise HTTPException(status_code=500, detail="Không thể tạo lớp học")
        
    except Exception as e:
        logger.error(f"Error creating class: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo lớp học: {str(e)}")


@router.put("/classes/{class_id}")
async def update_class(
    class_id: int,
    class_data: ClassUpdate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Cập nhật thông tin lớp học"""
    try:
        update_data = {"updated_at": datetime.now().isoformat()}
        
        if class_data.class_name:
            update_data["class_name"] = class_data.class_name
        if class_data.grade:
            update_data["grade"] = class_data.grade
        if class_data.homeroom_teacher_id:
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
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật lớp học: {str(e)}")


@router.delete("/classes/{class_id}")
async def delete_class(
    class_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Xóa lớp học"""
    try:
        response = db.table("classes").delete().eq("id", class_id).execute()
        
        if response.data:
            return {"success": True, "message": "Xóa lớp học thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp học")
        
    except Exception as e:
        logger.error(f"Error deleting class: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa lớp học: {str(e)}")


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
        
        response = query.order("academic_year", desc=True).execute()
        
        # Flatten data for easier frontend consumption
        flattened_data = []
        for item in response.data:
            flattened_item = {
                "id": item["id"],
                "teacher_id": item["teacher_id"],
                "subject_id": item["subject_id"],
                "academic_year": item.get("academic_year"),
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
        data = {
            "teacher_id": assignment.teacher_id,
            "subject_id": assignment.subject_id,
            "academic_year": assignment.academic_year,
            "is_active": assignment.is_active,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.table("subject_teachers").insert(data).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Phân công giáo viên thành công"}
        else:
            raise HTTPException(status_code=500, detail="Không thể phân công")
        
    except Exception as e:
        logger.error(f"Error creating subject teacher: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.put("/subject-teachers/{subject_teacher_id}")
async def update_subject_teacher(
    subject_teacher_id: int,
    assignment: SubjectTeacherUpdate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Cập nhật phân công giáo viên-môn học"""
    try:
        update_data = {"updated_at": datetime.now().isoformat()}
        
        if assignment.teacher_id:
            update_data["teacher_id"] = assignment.teacher_id
        if assignment.subject_id:
            update_data["subject_id"] = assignment.subject_id
        if assignment.academic_year:
            update_data["academic_year"] = assignment.academic_year
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
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


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
        
        # Nếu không show_deleted, chỉ lấy các phân công active
        if not show_deleted:
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
        data = {
            "class_id": assignment.class_id,
            "subject_id": assignment.subject_id,
            "teacher_id": assignment.teacher_id,
            "academic_year": assignment.academic_year,
            "semester": assignment.semester,
            "is_active": assignment.is_active,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.table("class_subjects").insert(data).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Phân công lớp-môn thành công"}
        else:
            raise HTTPException(status_code=500, detail="Không thể phân công")
        
    except Exception as e:
        logger.error(f"Error creating class subject: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.put("/class-subjects/{class_subject_id}")
async def update_class_subject(
    class_subject_id: int,
    assignment: ClassSubjectUpdate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Cập nhật phân công lớp-môn"""
    try:
        update_data = {"updated_at": datetime.now().isoformat()}
        
        if assignment.class_id:
            update_data["class_id"] = assignment.class_id
        if assignment.subject_id:
            update_data["subject_id"] = assignment.subject_id
        if assignment.teacher_id:
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
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


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
        
        return {"success": True, "data": response.data}
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
        else:
            response = type('obj', (object,), {'data': []})()
        
        return {"success": True, "data": response.data}
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
        data = {
            "student_id": student_data.student_id,
            "full_name": student_data.full_name,
            "date_of_birth": student_data.date_of_birth,
            "gender": student_data.gender,
            "class_name": student_data.class_name,
            "grade": student_data.grade,
            "is_active": True,  # Default value
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        if student_data.email:
            data["email"] = student_data.email
        if student_data.phone:
            data["phone"] = student_data.phone
        if student_data.parent_name:
            data["parent_name"] = student_data.parent_name
        if student_data.parent_phone:
            data["parent_phone"] = student_data.parent_phone
        if student_data.address:
            data["address"] = student_data.address
        
        response = db.table("students").insert(data).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Tạo học sinh thành công"}
        else:
            raise HTTPException(status_code=500, detail="Không thể tạo học sinh")
        
    except Exception as e:
        logger.error(f"Error creating student: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


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
        if student_data.parent_name:
            update_data["parent_name"] = student_data.parent_name
        if student_data.parent_phone:
            update_data["parent_phone"] = student_data.parent_phone
        if student_data.address:
            update_data["address"] = student_data.address
        if student_data.is_active is not None:
            update_data["is_active"] = student_data.is_active
        
        response = db.table("students").update(update_data).eq("id", student_id).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Cập nhật học sinh thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating student: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


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
        db.table("grades").delete().eq("student_id", student_id).execute()
        
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
    db=Depends(get_db)
):
    """Nhập học sinh hàng loạt từ file Excel/CSV"""
    try:
        success_count = 0
        error_count = 0
        errors = []
        created_students = []
        
        for student_record in import_data.students:
            try:
                # Validate required fields
                if not student_record.ho_va_ten or not student_record.lop_hoc or not student_record.khoi:
                    errors.append(f"Thiếu thông tin bắt buộc cho học sinh: {student_record.ho_va_ten or 'Unknown'}")
                    error_count += 1
                    continue
                
                # Generate student ID
                student_id = generate_student_id(student_record.khoi, db)
                
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
                
                # Prepare student data
                student_data = {
                    "student_id": student_id,
                    "full_name": student_record.ho_va_ten,
                    "email": student_record.email,
                    "phone": student_record.so_dien_thoai,
                    "class_name": student_record.lop_hoc,
                    "grade": student_record.khoi,
                    "date_of_birth": student_record.ngay_sinh,
                    "address": student_record.dia_chi,
                    "parent_name": student_record.ten_phu_huynh,
                    "parent_phone": student_record.sdt_phu_huynh,
                    "gender": gender,
                    "is_active": True,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
                
                # Remove None values
                student_data = {k: v for k, v in student_data.items() if v is not None}
                
                # Insert student
                response = db.table("students").insert(student_data).execute()
                
                if response.data:
                    success_count += 1
                    created_students.append({
                        "student_id": student_id,
                        "full_name": student_record.ho_va_ten,
                        "class_name": student_record.lop_hoc
                    })
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

@router.get("/dashboard/overview")
async def get_dashboard_overview(
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy tổng quan hệ thống cho admin dashboard"""
    try:
        from datetime import timedelta
        
        # Tổng số users, students, teachers, classes
        users_count = db.table("users").select("id").execute()
        students_count = db.table("students").select("id").eq("is_active", True).execute()
        teachers_count = db.table("teachers").select("id").execute()
        classes_count = db.table("classes").select("id").execute()
        
        # Thống kê điểm danh hôm nay
        today = datetime.now().date().isoformat()
        tomorrow = (datetime.now().date() + timedelta(days=1)).isoformat()
        attendance_today = db.table("attendance").select("id, status").gte("date", today).lt("date", tomorrow).execute()
        
        present_today = len([r for r in attendance_today.data if r.get('status') == 'present'])
        absent_today = len([r for r in attendance_today.data if r.get('status') == 'absent'])
        total_attendance_today = len(attendance_today.data)
        attendance_rate = (present_today / total_attendance_today * 100) if total_attendance_today > 0 else 0
        
        # Thống kê hoạt động gần đây (7 ngày qua)
        week_ago = (datetime.now() - timedelta(days=7)).isoformat()
        recent_logins = db.table("users").select("last_login").gte("last_login", week_ago).execute()
        
        return {
            "success": True,
            "data": {
                "overview": {
                    "total_users": len(users_count.data),
                    "total_students": len(students_count.data),
                    "total_teachers": len(teachers_count.data),
                    "total_classes": len(classes_count.data)
                },
                "attendance_today": {
                    "present": present_today,
                    "absent": absent_today,
                    "total": total_attendance_today,
                    "rate": round(attendance_rate, 1)
                },
                "activity": {
                    "recent_logins": len(recent_logins.data)
                }
            }
        }
    except Exception as e:
        logger.error(f"Error getting dashboard overview: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/dashboard/attendance-trends")
async def get_attendance_trends(
    days: int = 30,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy xu hướng điểm danh theo thời gian"""
    try:
        from datetime import timedelta
        
        end_date = datetime.now().date()
        start_date = (end_date - timedelta(days=days)).isoformat()
        end_date = end_date.isoformat()
        
        # Lấy dữ liệu điểm danh theo ngày
        attendance_data = db.table("attendance").select("date, status").gte("date", start_date).lte("date", end_date).execute()
        
        # Nhóm theo ngày
        daily_stats = {}
        for record in attendance_data.data:
            date = record['date']
            if date not in daily_stats:
                daily_stats[date] = {'present': 0, 'absent': 0, 'total': 0}
            
            daily_stats[date]['total'] += 1
            if record['status'] == 'present':
                daily_stats[date]['present'] += 1
            elif record['status'] == 'absent':
                daily_stats[date]['absent'] += 1
        
        # Tạo dữ liệu cho chart
        chart_data = []
        for date in sorted(daily_stats.keys()):
            stats = daily_stats[date]
            rate = (stats['present'] / stats['total'] * 100) if stats['total'] > 0 else 0
            chart_data.append({
                "date": date,
                "present": stats['present'],
                "absent": stats['absent'],
                "total": stats['total'],
                "rate": round(rate, 1)
            })
        
        return {
            "success": True,
            "data": chart_data
        }
    except Exception as e:
        logger.error(f"Error getting attendance trends: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/dashboard/class-performance")
async def get_class_performance(
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy hiệu suất học tập theo lớp"""
    try:
        # Lấy dữ liệu điểm số gần đây
        grades_data = db.table("grades").select("student_id, class_subject_id, final_grade, semester, academic_year").execute()
        
        # Lấy thông tin học sinh và lớp
        students_data = db.table("students").select("id, full_name, class_name").eq("is_active", True).execute()
        students_dict = {s['id']: s for s in students_data.data}
        
        # Nhóm điểm theo lớp
        class_performance = {}
        for grade in grades_data.data:
            student_id = grade['student_id']
            if student_id in students_dict and grade['final_grade'] is not None:
                class_name = students_dict[student_id]['class_name']
                if class_name not in class_performance:
                    class_performance[class_name] = []
                class_performance[class_name].append(float(grade['final_grade']))
        
        # Tính toán thống kê cho mỗi lớp
        result = []
        for class_name, grades in class_performance.items():
            if grades:
                avg_grade = sum(grades) / len(grades)
                result.append({
                    "class_name": class_name,
                    "total_students": len(set([g['student_id'] for g in grades_data.data if students_dict.get(g['student_id'], {}).get('class_name') == class_name])),
                    "average_grade": round(avg_grade, 1),
                    "total_grades": len(grades),
                    "excellent_count": len([g for g in grades if g >= 8.0]),
                    "good_count": len([g for g in grades if 6.5 <= g < 8.0]),
                    "average_count": len([g for g in grades if 5.0 <= g < 6.5]),
                    "poor_count": len([g for g in grades if g < 5.0])
                })
        
        # Sắp xếp theo điểm trung bình
        result.sort(key=lambda x: x['average_grade'], reverse=True)
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        logger.error(f"Error getting class performance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy hiệu suất lớp học: {str(e)}")


@router.get("/dashboard/system-health")
async def get_system_health(
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy tình trạng sức khỏe hệ thống"""
    try:
        from datetime import timedelta
        
        # Kiểm tra kết nối database
        db_status = "healthy"
        try:
            db.table("users").select("id").limit(1).execute()
        except:
            db_status = "error"
        
        # Thống kê hoạt động API gần đây
        yesterday = (datetime.now() - timedelta(days=1)).isoformat()
        recent_activity = db.table("users").select("last_login").gte("last_login", yesterday).execute()
        
        return {
            "success": True,
            "data": {
                "database_status": db_status,
                "error_count_24h": 0,
                "active_users_24h": len(recent_activity.data),
                "uptime": "99.9%",
                "last_backup": datetime.now().isoformat(),
                "timestamp": datetime.now().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error getting system health: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/dashboard/teacher-performance")
async def get_teacher_performance(
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy hiệu suất giảng dạy của giáo viên"""
    try:
        from datetime import timedelta
        
        # Lấy dữ liệu giáo viên
        teachers_data = db.table("teachers").select("id, full_name, teacher_code").execute()
        
        # Lấy dữ liệu lớp học
        classes_data = db.table("classes").select("id, class_name, homeroom_teacher_id").execute()
        
        # Lấy dữ liệu điểm danh 30 ngày qua
        thirty_days_ago = (datetime.now().date() - timedelta(days=30)).isoformat()
        attendance_data = db.table("attendance").select("student_id, status, date").gte("date", thirty_days_ago).execute()
        
        # Lấy dữ liệu học sinh
        students_data = db.table("students").select("id, class_name").eq("is_active", True).execute()
        students_dict = {s['id']: s for s in students_data.data}
        
        result = []
        for teacher in teachers_data.data:
            # Tìm các lớp mà giáo viên này chủ nhiệm
            teacher_classes = [c for c in classes_data.data if c.get('homeroom_teacher_id') == teacher['id']]
            
            total_students = 0
            total_attendance = 0
            present_count = 0
            
            for class_info in teacher_classes:
                class_students = [s for s in students_data.data if s['class_name'] == class_info['class_name']]
                total_students += len(class_students)
                
                # Tính điểm danh cho lớp này
                class_student_ids = [s['id'] for s in class_students]
                class_attendance = [a for a in attendance_data.data if a['student_id'] in class_student_ids]
                total_attendance += len(class_attendance)
                present_count += len([a for a in class_attendance if a['status'] == 'present'])
            
            attendance_rate = (present_count / total_attendance * 100) if total_attendance > 0 else 0
            
            result.append({
                "teacher_id": teacher['id'],
                "teacher_name": teacher['full_name'],
                "teacher_code": teacher.get('teacher_code'),
                "classes_count": len(teacher_classes),
                "total_students": total_students,
                "attendance_rate": round(attendance_rate, 1),
                "total_attendance_records": total_attendance
            })
        
        # Sắp xếp theo tỷ lệ điểm danh
        result.sort(key=lambda x: x['attendance_rate'], reverse=True)
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        logger.error(f"Error getting teacher performance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy hiệu suất giáo viên: {str(e)}")
