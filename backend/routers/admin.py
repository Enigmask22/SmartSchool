from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime
import bcrypt

from database.connection import get_db
from utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter(tags=["admin"])

# ===============================================
# USERS CRUD ENDPOINTS
# ===============================================

@router.get("/users")
async def get_all_users(db=Depends(get_db)):
    """Lấy danh sách tất cả người dùng"""
    try:
        response = db.table("users").select("id, email, full_name, role, is_active, last_login, created_at, updated_at").order("created_at", desc=True).execute()
        
        return {"success": True, "data": response.data}
    except Exception as e:
        logger.error(f"Error getting users: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách người dùng: {str(e)}")

@router.post("/users")
async def create_user(user_data: dict, db=Depends(get_db)):
    """Tạo người dùng mới"""
    try:
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
        # Build update data
        update_data = {}
        for field in ['email', 'full_name', 'role', 'is_active']:
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