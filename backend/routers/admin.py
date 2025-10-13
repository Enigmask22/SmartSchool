from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime
import bcrypt

from database.connection import get_db
from utils.logger import setup_logger
from models.schemas import BulkStudentImport, StudentImportRecord, ResponseModel

logger = setup_logger(__name__)
router = APIRouter(tags=["admin"])

# ===============================================
# USERS CRUD ENDPOINTS
# ===============================================

@router.get("/users")
async def get_all_users(db=Depends(get_db)):
    """Lấy danh sách tất cả người dùng"""
    try:
        response = db.table("users").select("id, email, username, full_name, role, is_active, last_login, created_at, updated_at").order("created_at", desc=True).execute()
        
        return {"success": True, "data": response.data}
    except Exception as e:
        logger.error(f"Error getting users: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách người dùng: {str(e)}")

@router.post("/users")
async def create_user(user_data: dict, db=Depends(get_db)):
    """Tạo người dùng mới"""
    try:
        # Kiểm tra email đã tồn tại chưa
        existing_email = db.table("users").select("id").eq("email", user_data['email']).execute()
        if existing_email.data:
            raise HTTPException(status_code=400, detail="Email đã được sử dụng")
        
        # Kiểm tra username đã tồn tại chưa (nếu có)
        if user_data.get('username'):
            existing_username = db.table("users").select("id").eq("username", user_data['username']).execute()
            if existing_username.data:
                raise HTTPException(status_code=400, detail="Username đã được sử dụng")
        
        # Hash password
        password = user_data.get('password', 'defaultpassword')
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create user data
        data = {
            "email": user_data['email'],
            "password_hash": password_hash,
            "full_name": user_data['full_name'],
            "role": user_data['role'],
            "is_active": user_data.get('is_active', True),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        # Thêm username nếu có
        if user_data.get('username'):
            data["username"] = user_data['username']
        
        response = db.table("users").insert(data).execute()
        
        if response.data:
            new_user = response.data[0]
            # Remove password hash from response
            new_user.pop("password_hash", None)
            return {"success": True, "data": new_user, "message": "Tạo người dùng thành công"}
        else:
            raise HTTPException(status_code=500, detail="Không thể tạo người dùng")
        
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo người dùng: {str(e)}")

@router.put("/users/{user_id}")
async def update_user(user_id: int, user_data: dict, db=Depends(get_db)):
    """Cập nhật thông tin người dùng"""
    try:
        # Kiểm tra email đã tồn tại chưa (nếu thay đổi email)
        if 'email' in user_data:
            existing_email = db.table("users").select("id").eq("email", user_data['email']).neq("id", user_id).execute()
            if existing_email.data:
                raise HTTPException(status_code=400, detail="Email đã được sử dụng")
        
        # Kiểm tra username đã tồn tại chưa (nếu thay đổi username)
        if 'username' in user_data and user_data['username']:
            existing_username = db.table("users").select("id").eq("username", user_data['username']).neq("id", user_id).execute()
            if existing_username.data:
                raise HTTPException(status_code=400, detail="Username đã được sử dụng")
        
        # Build update data
        update_data = {}
        for field in ['email', 'username', 'full_name', 'role', 'is_active']:
            if field in user_data:
                update_data[field] = user_data[field]
        
        if not update_data:
            raise HTTPException(status_code=400, detail="Không có trường nào để cập nhật")
        
        update_data['updated_at'] = datetime.now().isoformat()
        
        response = db.table("users").update(update_data).eq("id", user_id).execute()
        
        if response.data:
            updated_user = response.data[0]
            # Remove password hash from response
            updated_user.pop("password_hash", None)
            return {"success": True, "data": updated_user, "message": "Cập nhật người dùng thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật người dùng: {str(e)}")

@router.delete("/users/{user_id}")
async def delete_user(user_id: int, db=Depends(get_db)):
    """Xóa người dùng"""
    try:
        response = db.table("users").delete().eq("id", user_id).execute()
        
        if response.data:
            return {"success": True, "message": "Xóa người dùng thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa người dùng: {str(e)}")

# ===============================================
# TEACHERS CRUD ENDPOINTS
# ===============================================

@router.get("/teachers")
async def get_all_teachers(db=Depends(get_db)):
    """Lấy danh sách tất cả giáo viên"""
    try:
        response = db.table("teachers").select("*, users(email, role)").order("created_at", desc=True).execute()
        
        return {"success": True, "data": response.data}
    except Exception as e:
        logger.error(f"Error getting teachers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách giáo viên: {str(e)}")

@router.post("/teachers")
async def create_teacher(teacher_data: dict, db=Depends(get_db)):
    """Tạo giáo viên mới"""
    try:
        data = {
            "teacher_code": teacher_data['teacher_code'],
            "full_name": teacher_data['full_name'],
            "email": teacher_data.get('email'),
            "phone": teacher_data.get('phone'),
            "user_id": teacher_data.get('user_id'),
            "is_active": teacher_data.get('is_active', True),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.table("teachers").insert(data).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Tạo giáo viên thành công"}
        else:
            raise HTTPException(status_code=500, detail="Không thể tạo giáo viên")
        
    except Exception as e:
        logger.error(f"Error creating teacher: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo giáo viên: {str(e)}")

@router.put("/teachers/{teacher_id}")
async def update_teacher(teacher_id: int, teacher_data: dict, db=Depends(get_db)):
    """Cập nhật thông tin giáo viên"""
    try:
        update_data = {}
        for field in ['teacher_code', 'full_name', 'email', 'phone', 'user_id', 'is_active']:
            if field in teacher_data:
                update_data[field] = teacher_data[field]
        
        if not update_data:
            raise HTTPException(status_code=400, detail="Không có trường nào để cập nhật")
        
        update_data['updated_at'] = datetime.now().isoformat()
        
        response = db.table("teachers").update(update_data).eq("id", teacher_id).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Cập nhật giáo viên thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy giáo viên")
        
    except Exception as e:
        logger.error(f"Error updating teacher: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật giáo viên: {str(e)}")

@router.delete("/teachers/{teacher_id}")
async def delete_teacher(teacher_id: int, db=Depends(get_db)):
    """Xóa giáo viên"""
    try:
        response = db.table("teachers").delete().eq("id", teacher_id).execute()
        
        if response.data:
            return {"success": True, "message": "Xóa giáo viên thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy giáo viên")
        
    except Exception as e:
        logger.error(f"Error deleting teacher: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa giáo viên: {str(e)}")

# ===============================================
# SUBJECTS CRUD ENDPOINTS
# ===============================================

@router.get("/subjects")
async def get_all_subjects(db=Depends(get_db)):
    """Lấy danh sách tất cả môn học"""
    try:
        response = db.table("subjects").select("*").order("subject_code").execute()
        
        return {"success": True, "data": response.data}
    except Exception as e:
        logger.error(f"Error getting subjects: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách môn học: {str(e)}")

@router.post("/subjects")
async def create_subject(subject_data: dict, db=Depends(get_db)):
    """Tạo môn học mới"""
    try:
        data = {
            "subject_code": subject_data['subject_code'],
            "subject_name": subject_data['subject_name'],
            "description": subject_data.get('description'),
            "is_active": subject_data.get('is_active', True),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.table("subjects").insert(data).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Tạo môn học thành công"}
        else:
            raise HTTPException(status_code=500, detail="Không thể tạo môn học")
        
    except Exception as e:
        logger.error(f"Error creating subject: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo môn học: {str(e)}")

@router.put("/subjects/{subject_id}")
async def update_subject(subject_id: int, subject_data: dict, db=Depends(get_db)):
    """Cập nhật thông tin môn học"""
    try:
        update_data = {}
        for field in ['subject_code', 'subject_name', 'description', 'is_active']:
            if field in subject_data:
                update_data[field] = subject_data[field]
        
        if not update_data:
            raise HTTPException(status_code=400, detail="Không có trường nào để cập nhật")
        
        update_data['updated_at'] = datetime.now().isoformat()
        
        response = db.table("subjects").update(update_data).eq("id", subject_id).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Cập nhật môn học thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy môn học")
        
    except Exception as e:
        logger.error(f"Error updating subject: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật môn học: {str(e)}")

@router.delete("/subjects/{subject_id}")
async def delete_subject(subject_id: int, db=Depends(get_db)):
    """Xóa môn học"""
    try:
        response = db.table("subjects").delete().eq("id", subject_id).execute()
        
        if response.data:
            return {"success": True, "message": "Xóa môn học thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy môn học")
        
    except Exception as e:
        logger.error(f"Error deleting subject: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa môn học: {str(e)}")

# ===============================================
# CLASSES CRUD ENDPOINTS
# ===============================================

@router.get("/classes")
async def get_all_classes(db=Depends(get_db)):
    """Lấy danh sách tất cả lớp học với số lượng học sinh"""
    try:
        response = db.table("classes").select("*, teachers(teacher_code, full_name)").order("grade, class_name").execute()
        
        # Thêm số lượng học sinh cho mỗi lớp
        classes_with_student_count = []
        for class_item in response.data:
            # Đếm số học sinh trong lớp này
            student_count_response = db.table("students").select("id", count="exact").eq("class_name", class_item["class_name"]).eq("is_active", True).execute()
            total_students = student_count_response.count if student_count_response.count else 0
            
            # Thêm thông tin số học sinh vào class item
            class_item["total_students"] = total_students
            classes_with_student_count.append(class_item)
        
        return {"success": True, "data": classes_with_student_count}
    except Exception as e:
        logger.error(f"Error getting classes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách lớp học: {str(e)}")

@router.get("/classes/{class_id}/students")
async def get_class_students(class_id: int, db=Depends(get_db)):
    """Lấy danh sách học sinh của một lớp cụ thể"""
    try:
        # Lấy thông tin lớp học
        class_response = db.table("classes").select("*").eq("id", class_id).execute()
        if not class_response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp học")
        
        class_info = class_response.data[0]
        
        # Lấy danh sách học sinh trong lớp
        students_response = db.table("students").select("*").eq("class_name", class_info["class_name"]).execute()
        
        return {"success": True, "data": students_response.data}
    except Exception as e:
        logger.error(f"Error getting class students: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách học sinh: {str(e)}")

@router.post("/classes")
async def create_class(class_data: dict, db=Depends(get_db)):
    """Tạo lớp học mới"""
    try:
        data = {
            "class_name": class_data['class_name'],
            "grade": class_data['grade'],
            "homeroom_teacher": class_data.get('homeroom_teacher'),
            "homeroom_teacher_id": class_data.get('homeroom_teacher_id'),
            "room_number": class_data.get('room_number'),
            "academic_year": class_data.get('academic_year', '2024-2025'),
            "is_active": class_data.get('is_active', True),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.table("classes").insert(data).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Tạo lớp học thành công"}
        else:
            raise HTTPException(status_code=500, detail="Không thể tạo lớp học")
        
    except Exception as e:
        logger.error(f"Error creating class: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo lớp học: {str(e)}")

@router.put("/classes/{class_id}")
async def update_class(class_id: int, class_data: dict, db=Depends(get_db)):
    """Cập nhật thông tin lớp học"""
    try:
        update_data = {}
        for field in ['class_name', 'grade', 'homeroom_teacher', 'homeroom_teacher_id', 
                     'room_number', 'academic_year', 'is_active']:
            if field in class_data:
                update_data[field] = class_data[field]
        
        if not update_data:
            raise HTTPException(status_code=400, detail="Không có trường nào để cập nhật")
        
        update_data['updated_at'] = datetime.now().isoformat()
        
        response = db.table("classes").update(update_data).eq("id", class_id).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Cập nhật lớp học thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp học")
        
    except Exception as e:
        logger.error(f"Error updating class: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật lớp học: {str(e)}")

@router.delete("/classes/{class_id}")
async def delete_class(class_id: int, db=Depends(get_db)):
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
# SUBJECT_TEACHERS CRUD ENDPOINTS
# ===============================================

@router.get("/subject-teachers")
async def get_all_subject_teachers(db=Depends(get_db)):
    """Lấy danh sách tất cả quan hệ giáo viên - môn học"""
    try:
        response = db.table("subject_teachers").select("*, teachers(teacher_code, full_name), subjects(subject_code, subject_name)").order("academic_year", desc=True).execute()
        
        # Flatten data for easier frontend consumption
        flattened_data = []
        for item in response.data:
            flattened_item = {
                "id": item["id"],
                "teacher_id": item["teacher_id"],
                "subject_id": item["subject_id"],
                "academic_year": item["academic_year"],
                "is_active": item["is_active"],
                "teacher_name": item["teachers"]["full_name"] if item["teachers"] else None,
                "teacher_code": item["teachers"]["teacher_code"] if item["teachers"] else None,
                "subject_name": item["subjects"]["subject_name"] if item["subjects"] else None,
                "subject_code": item["subjects"]["subject_code"] if item["subjects"] else None
            }
            flattened_data.append(flattened_item)
        
        return {"success": True, "data": flattened_data}
    except Exception as e:
        logger.error(f"Error getting subject teachers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách giáo viên - môn học: {str(e)}")

@router.post("/subject-teachers")
async def create_subject_teacher(subject_teacher_data: dict, db=Depends(get_db)):
    """Tạo quan hệ giáo viên - môn học mới"""
    try:
        data = {
            "teacher_id": subject_teacher_data['teacher_id'],
            "subject_id": subject_teacher_data['subject_id'],
            "academic_year": subject_teacher_data.get('academic_year', '2024-2025'),
            "is_active": subject_teacher_data.get('is_active', True),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.table("subject_teachers").insert(data).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Tạo quan hệ giáo viên - môn học thành công"}
        else:
            raise HTTPException(status_code=500, detail="Không thể tạo quan hệ giáo viên - môn học")
        
    except Exception as e:
        logger.error(f"Error creating subject teacher: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo quan hệ giáo viên - môn học: {str(e)}")

@router.put("/subject-teachers/{subject_teacher_id}")
async def update_subject_teacher(subject_teacher_id: int, subject_teacher_data: dict, db=Depends(get_db)):
    """Cập nhật quan hệ giáo viên - môn học"""
    try:
        update_data = {}
        for field in ['teacher_id', 'subject_id', 'academic_year', 'is_active']:
            if field in subject_teacher_data:
                update_data[field] = subject_teacher_data[field]
        
        if not update_data:
            raise HTTPException(status_code=400, detail="Không có trường nào để cập nhật")
        
        update_data['updated_at'] = datetime.now().isoformat()
        
        response = db.table("subject_teachers").update(update_data).eq("id", subject_teacher_id).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Cập nhật quan hệ giáo viên - môn học thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy quan hệ giáo viên - môn học")
        
    except Exception as e:
        logger.error(f"Error updating subject teacher: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật quan hệ giáo viên - môn học: {str(e)}")

@router.delete("/subject-teachers/{subject_teacher_id}")
async def delete_subject_teacher(subject_teacher_id: int, db=Depends(get_db)):
    """Xóa quan hệ giáo viên - môn học"""
    try:
        response = db.table("subject_teachers").delete().eq("id", subject_teacher_id).execute()
        
        if response.data:
            return {"success": True, "message": "Xóa quan hệ giáo viên - môn học thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy quan hệ giáo viên - môn học")
        
    except Exception as e:
        logger.error(f"Error deleting subject teacher: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa quan hệ giáo viên - môn học: {str(e)}")

# ===============================================
# CLASS_SUBJECTS CRUD ENDPOINTS
# ===============================================

@router.get("/class-subjects")
async def get_all_class_subjects(db=Depends(get_db)):
    """Lấy danh sách tất cả quan hệ lớp - môn học"""
    try:
        response = db.table("class_subjects").select("*, classes(class_name, grade), subjects(subject_code, subject_name), teachers(teacher_code, full_name)").order("academic_year", desc=True).execute()
        
        # Flatten data for easier frontend consumption
        flattened_data = []
        for item in response.data:
            flattened_item = {
                "id": item["id"],
                "class_id": item["class_id"],
                "subject_id": item["subject_id"],
                "teacher_id": item["teacher_id"],
                "academic_year": item["academic_year"],
                "semester": item["semester"],
                "is_active": item["is_active"],
                "class_name": item["classes"]["class_name"] if item["classes"] else None,
                "grade": item["classes"]["grade"] if item["classes"] else None,
                "subject_name": item["subjects"]["subject_name"] if item["subjects"] else None,
                "subject_code": item["subjects"]["subject_code"] if item["subjects"] else None,
                "teacher_name": item["teachers"]["full_name"] if item["teachers"] else None,
                "teacher_code": item["teachers"]["teacher_code"] if item["teachers"] else None
            }
            flattened_data.append(flattened_item)
        
        return {"success": True, "data": flattened_data}
    except Exception as e:
        logger.error(f"Error getting class subjects: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách lớp - môn học: {str(e)}")

@router.post("/class-subjects")
async def create_class_subject(class_subject_data: dict, db=Depends(get_db)):
    """Tạo quan hệ lớp - môn học mới"""
    try:
        data = {
            "class_id": class_subject_data['class_id'],
            "subject_id": class_subject_data['subject_id'],
            "teacher_id": class_subject_data['teacher_id'],
            "academic_year": class_subject_data.get('academic_year', '2024-2025'),
            "semester": class_subject_data.get('semester', 'HK1'),
            "is_active": class_subject_data.get('is_active', True),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.table("class_subjects").insert(data).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Tạo quan hệ lớp - môn học thành công"}
        else:
            raise HTTPException(status_code=500, detail="Không thể tạo quan hệ lớp - môn học")
        
    except Exception as e:
        logger.error(f"Error creating class subject: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo quan hệ lớp - môn học: {str(e)}")

@router.put("/class-subjects/{class_subject_id}")
async def update_class_subject(class_subject_id: int, class_subject_data: dict, db=Depends(get_db)):
    """Cập nhật quan hệ lớp - môn học"""
    try:
        update_data = {}
        for field in ['class_id', 'subject_id', 'teacher_id', 'academic_year', 'semester', 'is_active']:
            if field in class_subject_data:
                update_data[field] = class_subject_data[field]
        
        if not update_data:
            raise HTTPException(status_code=400, detail="Không có trường nào để cập nhật")
        
        update_data['updated_at'] = datetime.now().isoformat()
        
        response = db.table("class_subjects").update(update_data).eq("id", class_subject_id).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Cập nhật quan hệ lớp - môn học thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy quan hệ lớp - môn học")
        
    except Exception as e:
        logger.error(f"Error updating class subject: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật quan hệ lớp - môn học: {str(e)}")

@router.delete("/class-subjects/{class_subject_id}")
async def delete_class_subject(class_subject_id: int, db=Depends(get_db)):
    """Xóa quan hệ lớp - môn học"""
    try:
        response = db.table("class_subjects").delete().eq("id", class_subject_id).execute()
        
        if response.data:
            return {"success": True, "message": "Xóa quan hệ lớp - môn học thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy quan hệ lớp - môn học")
        
    except Exception as e:
        logger.error(f"Error deleting class subject: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa quan hệ lớp - môn học: {str(e)}")

# ===============================================
# STUDENTS CRUD ENDPOINTS
# ===============================================

@router.get("/students")
async def get_all_students(db=Depends(get_db)):
    """Lấy danh sách tất cả học sinh"""
    try:
        response = db.table("students").select("*").order("student_id").execute()
        
        return {"success": True, "data": response.data}
    except Exception as e:
        logger.error(f"Error getting students: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách học sinh: {str(e)}")

@router.get("/students/by-grade")
async def get_students_by_grade(grade: str, db=Depends(get_db)):
    """Lấy danh sách học sinh theo khối"""
    try:
        response = db.table("students").select("*").eq("grade", grade).execute()
        
        return {"success": True, "data": response.data}
    except Exception as e:
        logger.error(f"Error getting students by grade: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách học sinh theo khối: {str(e)}")

@router.post("/students")
async def create_student(student_data: dict, db=Depends(get_db)):
    """Tạo học sinh mới"""
    try:
        data = {
            "student_id": student_data['student_id'],
            "full_name": student_data['full_name'],
            "email": student_data.get('email'),
            "phone": student_data.get('phone'),
            "class_name": student_data.get('class_name'),
            "grade": student_data.get('grade'),
            "date_of_birth": student_data.get('date_of_birth'),
            "address": student_data.get('address'),
            "parent_name": student_data.get('parent_name'),
            "parent_phone": student_data.get('parent_phone'),
            "is_active": student_data.get('is_active', True),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.table("students").insert(data).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Tạo học sinh thành công"}
        else:
            raise HTTPException(status_code=500, detail="Không thể tạo học sinh")
        
    except Exception as e:
        logger.error(f"Error creating student: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo học sinh: {str(e)}")

@router.put("/students/{student_id}")
async def update_student(student_id: str, student_data: dict, db=Depends(get_db)):
    """Cập nhật thông tin học sinh"""
    try:
        update_data = {}
        for field in ['full_name', 'email', 'phone', 'class_name', 'grade', 'date_of_birth', 
                     'address', 'parent_name', 'parent_phone', 'is_active']:
            if field in student_data:
                update_data[field] = student_data[field]
        
        if not update_data:
            raise HTTPException(status_code=400, detail="Không có trường nào để cập nhật")
        
        update_data['updated_at'] = datetime.now().isoformat()
        
        response = db.table("students").update(update_data).eq("student_id", student_id).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Cập nhật học sinh thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
        
    except Exception as e:
        logger.error(f"Error updating student: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật học sinh: {str(e)}")

@router.delete("/students/{student_id}")
async def delete_student(student_id: str, db=Depends(get_db)):
    """Xóa học sinh"""
    try:
        response = db.table("students").delete().eq("student_id", student_id).execute()
        
        if response.data:
            return {"success": True, "message": "Xóa học sinh thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
        
    except Exception as e:
        logger.error(f"Error deleting student: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa học sinh: {str(e)}")

# ===============================================
# BULK STUDENT IMPORT ENDPOINTS
# ===============================================

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

@router.post("/students/bulk-import", response_model=ResponseModel)
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
        
        return ResponseModel(
            success=True,
            message=f"Nhập học sinh hoàn thành. Thành công: {success_count}, Lỗi: {error_count}",
            data={
                "success_count": success_count,
                "error_count": error_count,
                "errors": errors,
                "created_students": created_students
            }
        )
        
    except Exception as e:
        logger.error(f"Error in bulk import students: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        ) 