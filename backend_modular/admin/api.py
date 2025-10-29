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
from core.system_settings import get_current_academic_year

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
    """Tạo giáo viên mới"""
    try:
        
        data = {
            "full_name": teacher_data.full_name,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        if teacher_data.user_id:
            data["user_id"] = teacher_data.user_id
        if teacher_data.teacher_code:
            data["teacher_code"] = teacher_data.teacher_code
        if teacher_data.email:
            data["email"] = teacher_data.email
        if teacher_data.phone:
            data["phone"] = teacher_data.phone
        if teacher_data.date_of_birth:
            data["date_of_birth"] = str(teacher_data.date_of_birth)
        if teacher_data.gender:
            data["gender"] = teacher_data.gender
        
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
        if teacher_data.date_of_birth:
            update_data["date_of_birth"] = str(teacher_data.date_of_birth)
        if teacher_data.gender:
            update_data["gender"] = teacher_data.gender
        
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
        # Join nhẹ với grade_settings để lấy cấu hình cột điểm đang active (nếu có)
        query = db.table("subjects").select(
            "*, grade_settings:grade_settings(id, grade_column_config, is_active)"
        )
        
        # Nếu không show_deleted, chỉ lấy các môn học active
        if not show_deleted:
            query = query.eq("is_active", True)
        
        response = query.order("subject_code").execute()

        # Flatten: gắn trực tiếp grade_column_config vào mỗi subject
        subjects = []
        for subj in (response.data or []):
            subj_copy = dict(subj)
            if isinstance(subj.get("grade_settings"), dict):
                if subj["grade_settings"].get("is_active"):
                    subj_copy["grade_column_config"] = subj["grade_settings"].get("grade_column_config")
            elif isinstance(subj.get("grade_settings"), list) and subj["grade_settings"]:
                # Nếu trả về list, lấy bản ghi active đầu tiên
                active = next((g for g in subj["grade_settings"] if g.get("is_active")), None)
                if active:
                    subj_copy["grade_column_config"] = active.get("grade_column_config")
            subjects.append(subj_copy)
        
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
        if subject_data.is_mandatory is not None:
            update_data["is_mandatory"] = subject_data.is_mandatory
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
        return {"success": True, "data": students_resp.data}
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
        if class_data.room_number:
            data["room_number"] = class_data.room_number
        
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
        # Nếu có class_id, lấy thông tin lớp để đảm bảo tính nhất quán class_name/grade
        class_info = None
        if getattr(student_data, "class_id", None):
            class_resp = db.table("classes").select("id, class_name, grade, homeroom_teacher_id").eq("id", student_data.class_id).execute()
            if not class_resp.data:
                raise HTTPException(status_code=400, detail="class_id không hợp lệ")
            class_info = class_resp.data[0]

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
        if student_data.parent_name:
            data["parent_name"] = student_data.parent_name
        if student_data.parent_phone:
            data["parent_phone"] = student_data.parent_phone
        if student_data.address:
            data["address"] = student_data.address
        
        response = db.table("students").insert(data).execute()

        # Nếu tạo thành công và có class_id -> ghi lịch sử vào homeroom_students_history
        if response.data:
            created_student = response.data[0]
            if class_info:
                db.table("homeroom_students_history").insert({
                    "teacher_id": class_info.get("homeroom_teacher_id"),
                    "class_id": class_info["id"],
                    "student_id": created_student["id"]
                }).execute()
            return {"success": True, "data": created_student, "message": "Tạo học sinh thành công"}
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

# Dashboard analytics endpoints removed as per requirements


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
# CONFIG HOLIDAYS (Ngày nghỉ theo khối)
# ===============================================

@router.get("/holidays")
async def list_holidays(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    grade: Optional[int] = Query(None, description="10/11/12"),
    admin_user=Depends(get_admin_user),
    db=Depends(get_db),
):
    """Liệt kê cấu hình ngày nghỉ. Có thể lọc theo year, month, grade."""
    try:
        query = db.table("config_holidays").select("*")
        if year is not None:
            query = query.eq("year", year)
        if month is not None:
            query = query.eq("month", month)
        if grade is not None:
            query = query.eq("grade", grade)
        resp = query.order("year, month, grade").execute()
        return {"success": True, "data": resp.data or []}
    except Exception as e:
        logger.error(f"Error list holidays: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy cấu hình ngày nghỉ: {str(e)}")


@router.post("/holidays")
async def create_holiday_config(
    payload: dict,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db),
):
    """Tạo cấu hình ngày nghỉ: body {year, month, grade, holidays_list: [int,...]}"""
    try:
        required = ["year", "month", "grade", "holidays_list"]
        for k in required:
            if k not in payload:
                raise HTTPException(status_code=400, detail=f"Thiếu trường {k}")
        data = {
            "year": int(payload["year"]),
            "month": int(payload["month"]),
            "grade": int(payload["grade"]),
            "holidays_list": payload.get("holidays_list") or [],
            "updated_at": datetime.now().isoformat(),
        }
        # nếu đã tồn tại thì cập nhật thay vì tạo mới
        existing = (
            db.table("config_holidays")
            .select("id")
            .eq("year", data["year"]).eq("month", data["month"]).eq("grade", data["grade"])  
            .execute()
        )
        if existing.data:
            resp = db.table("config_holidays").update(data).eq("id", existing.data[0]["id"]).execute()
        else:
            resp = db.table("config_holidays").insert(data).execute()
        return {"success": True, "data": resp.data[0] if resp.data else None}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error create holiday config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo cấu hình ngày nghỉ: {str(e)}")


@router.put("/holidays/{config_id}")
async def update_holiday_config(
    config_id: int,
    payload: dict,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db),
):
    try:
        update_data = {"updated_at": datetime.now().isoformat()}
        for f in ["year", "month", "grade", "holidays_list"]:
            if f in payload:
                update_data[f] = payload[f]
        resp = db.table("config_holidays").update(update_data).eq("id", config_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi cấu hình")
        return {"success": True, "data": resp.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error update holiday config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật cấu hình ngày nghỉ: {str(e)}")


@router.delete("/holidays/{config_id}")
async def delete_holiday_config(
    config_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db),
):
    try:
        resp = db.table("config_holidays").delete().eq("id", config_id).execute()
        return {"success": True, "data": None}
    except Exception as e:
        logger.error(f"Error delete holiday config: {str(e)}")
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

    Body: { "student_ids": [int], "target_class_id": int }
    """
    try:
        student_ids = payload.get("student_ids") or []
        target_class_id = payload.get("target_class_id")

        if not isinstance(student_ids, list) or len(student_ids) == 0:
            raise HTTPException(status_code=400, detail="Danh sách student_ids không hợp lệ")
        if not target_class_id:
            raise HTTPException(status_code=400, detail="Thiếu target_class_id")

        # Lấy thông tin lớp đích
        class_resp = db.table("classes").select("id, class_name, grade, homeroom_teacher_id").eq("id", target_class_id).execute()
        if not class_resp.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp đích")
        target_class = class_resp.data[0]

        # Cập nhật students
        db.table("students").update({
            "class_name": target_class["class_name"],
            "grade": str(target_class["grade"]),
            "updated_at": datetime.now().isoformat()
        }).in_("id", student_ids).execute()

        # Ghi lịch sử
        history_rows = [{
            "teacher_id": target_class.get("homeroom_teacher_id"),
            "class_id": target_class["id"],
            "student_id": sid
        } for sid in student_ids]
        if history_rows:
            db.table("homeroom_students_history").insert(history_rows).execute()

        return {"success": True, "message": "Chuyển lớp thành công", "data": {"updated_count": len(student_ids)}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error moving students class: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi chuyển lớp: {str(e)}")
