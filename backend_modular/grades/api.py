"""
API Router cho Grades management
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks, status
from typing import Optional
from pathlib import Path
from datetime import datetime
import uuid
import os

from grades.models import GradeCreate, GradeUpdate, ResponseModel
from grades.services import calculate_final_grade
from core.database import get_db
from core.logger import setup_logger
from auth.api import get_current_user

logger = setup_logger("grades_api")
router = APIRouter()

# Global dict to store OCR results (in production, use Redis or database)
ocr_results = {}


# Dependency: Get current teacher (supports both admin and teacher)
async def get_current_teacher(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Lấy thông tin giáo viên hiện tại (hỗ trợ cả admin và teacher)"""
    teacher_response = db.table("teachers").select("*").eq("user_id", current_user["id"]).execute()
    
    if not teacher_response.data:
        # Nếu không có record trong teachers table, tạo một mock teacher object cho admin
        if current_user.get("role") == "admin":
            return {
                "id": None,  # Admin không có teacher ID
                "user_id": current_user["id"],
                "full_name": current_user.get("full_name", ""),
                "email": current_user.get("email", ""),
                "phone": None,
                "teacher_code": None,
                "is_admin": True  # Flag để biết đây là admin
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không phải là giáo viên bộ môn"
            )
    
    teacher_data = teacher_response.data[0]
    teacher_data["is_admin"] = False  # Flag để biết đây là teacher thật
    return teacher_data


@router.get("/subjects")
async def get_subjects(db=Depends(get_db)):
    """Lấy danh sách môn học"""
    try:
        response = db.table("subjects").select("*").order("subject_code").execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        logger.error(f"Error getting subjects: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.get("/students/{student_id}/grades")
async def get_student_grades(
    student_id: int,
    academic_year: Optional[str] = None,
    semester: Optional[str] = None,
    db=Depends(get_db)
):
    """Lấy điểm của học sinh"""
    try:
        query = db.table("grades").select("*").eq("student_id", student_id)
        
        if academic_year:
            query = query.eq("academic_year", academic_year)
        if semester:
            query = query.eq("semester", semester)
        
        response = query.execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        logger.error(f"Error getting grades: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.get("/student/{student_id}")
async def get_student_all_grades(
    student_id: int,
    academic_year: str = "2024-2025",
    semester: str = "HK1",
    db=Depends(get_db)
):
    """Lấy tất cả điểm của một học sinh (admin có thể xem)"""
    try:
        # Lấy thông tin học sinh
        student = db.table("students").select("*").eq("id", student_id).execute()
        
        if not student.data:
            raise HTTPException(
                status_code=404,
                detail="Không tìm thấy học sinh"
            )
        
        student_info = student.data[0]
        
        # Lấy tất cả điểm của học sinh với JOIN
        grades = db.table("grades").select("""
            *,
            class_subjects!inner(
                id,
                subjects!inner(subject_name),
                classes!inner(class_name),
                teachers!inner(full_name)
            )
        """).eq("student_id", student_id).eq("academic_year", academic_year).eq("semester", semester).execute()
        
        student_grades = []
        
        if grades.data:
            for grade_record in grades.data:
                class_subject = grade_record.get("class_subjects", {})
                subject = class_subject.get("subjects", {})
                class_info = class_subject.get("classes", {})
                teacher = class_subject.get("teachers", {})
                
                student_grades.append({
                    "id": grade_record["id"],
                    "class_subject_id": class_subject.get("id"),
                    "subject_name": subject.get("subject_name", "N/A"),
                    "class_name": class_info.get("class_name", "N/A"),
                    "teacher_name": teacher.get("full_name", "N/A"),
                    "academic_year": grade_record["academic_year"],
                    "semester": grade_record["semester"],
                    "grade_data": grade_record["grade_data"],
                    "final_grade": grade_record["final_grade"]
                })
        
        return {
            "success": True,
            "message": "Lấy điểm học sinh thành công",
            "data": {
                "student": student_info,
                "grades": student_grades,
                "academic_year": academic_year,
                "semester": semester
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting student grades: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi server: {str(e)}"
        )

@router.post("/")
async def create_grade(grade: GradeCreate, db=Depends(get_db)):
    """Tạo điểm mới"""
    try:
        grade_data = grade.dict()
        final_grade = calculate_final_grade(grade_data["grade_data"])
        grade_data["final_grade"] = final_grade
        
        response = db.table("grades").insert(grade_data).execute()
        
        if response.data:
            return {
                "success": True,
                "message": "Tạo điểm thành công",
                "data": response.data[0]
            }
        else:
            raise HTTPException(status_code=500, detail="Lỗi tạo điểm")
    except Exception as e:
        logger.error(f"Error creating grade: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.put("/{grade_id}")
async def update_grade(
    grade_id: int,
    grade: GradeUpdate,
    db=Depends(get_db)
):
    """Cập nhật điểm"""
    try:
        update_data = grade.dict(exclude_unset=True)
        
        if "grade_data" in update_data:
            update_data["final_grade"] = calculate_final_grade(update_data["grade_data"])
        
        response = db.table("grades").update(update_data).eq("id", grade_id).execute()
        
        if response.data:
            return {
                "success": True,
                "message": "Cập nhật điểm thành công",
                "data": response.data[0]
            }
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy điểm")
    except Exception as e:
        logger.error(f"Error updating grade: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.get("/teacher/info")
async def get_teacher_info(
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Lấy thông tin giáo viên và các lớp/môn được phân công"""
    try:
        teacher_response = db.table("teachers").select("*").eq("user_id", current_user["id"]).execute()
        
        if not teacher_response.data:
            return {
                "success": False,
                "message": "Bạn không phải là giáo viên bộ môn",
                "data": None
            }
        
        current_teacher = teacher_response.data[0]
        
        # Lấy các lớp-môn mà giáo viên được phân công
        class_subjects = db.table("class_subjects").select("""
            *,
            classes:class_id(id, class_name, grade),
            subjects:subject_id(id, subject_code, subject_name)
        """).eq("teacher_id", current_teacher["id"]).eq("is_active", True).execute()
        
        teacher_info = {
            "teacher": current_teacher,
            "assigned_classes": class_subjects.data if class_subjects.data else []
        }
        
        return {
            "success": True,
            "message": "Lấy thông tin giáo viên thành công",
            "data": teacher_info
        }
        
    except Exception as e:
        logger.error(f"Error getting teacher info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.get("/teacher/personal-info")
async def get_personal_info(
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Lấy thông tin cá nhân đầy đủ của giáo viên (hỗ trợ cả admin)"""
    try:
        # Lấy thông tin user
        user_info = {
            "id": current_user["id"],
            "email": current_user.get("email"),
            "username": current_user.get("username"),
            "full_name": current_user.get("full_name"),
            "role": current_user.get("role")
        }
        
        # Lấy thông tin teacher
        teacher_response = db.table("teachers").select("*").eq("user_id", current_user["id"]).execute()
        
        teacher_info = None
        if teacher_response.data:
            teacher_info = teacher_response.data[0]
        elif current_user.get("role") == "admin":
            # Tạo mock teacher info cho admin
            teacher_info = {
                "id": None,
                "user_id": current_user["id"],
                "full_name": current_user.get("full_name", ""),
                "email": current_user.get("email", ""),
                "phone": None,
                "teacher_code": None,
                "is_admin": True
            }
        
        # Lấy lớp chủ nhiệm nếu có
        homeroom_classes = []
        if teacher_info and teacher_info.get("id"):
            homeroom_response = db.table("classes").select("*").eq("homeroom_teacher_id", teacher_info["id"]).eq("is_active", True).execute()
            homeroom_classes = homeroom_response.data if homeroom_response.data else []
        
        # Lấy lớp-môn dạy nếu có
        subject_classes = []
        if teacher_info and teacher_info.get("id"):
            subject_response = db.table("class_subjects").select("""
                *,
                classes:class_id(id, class_name, grade),
                subjects:subject_id(id, subject_code, subject_name)
            """).eq("teacher_id", teacher_info["id"]).eq("is_active", True).execute()
            subject_classes = subject_response.data if subject_response.data else []
        
        personal_info = {
            "user": user_info,
            "teacher": teacher_info,
            "homeroom_classes": homeroom_classes,
            "subject_classes": subject_classes
        }
        
        return {
            "success": True,
            "message": "Lấy thông tin cá nhân thành công",
            "data": personal_info
        }
        
    except Exception as e:
        logger.error(f"Error getting personal info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.put("/teacher/profile")
async def update_teacher_profile(
    profile_data: dict,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Cập nhật thông tin cá nhân của giáo viên (hỗ trợ cả admin)"""
    try:
        # Validate input data
        allowed_fields = ['full_name', 'email', 'phone']
        update_data = {}
        
        for field in allowed_fields:
            if field in profile_data:
                update_data[field] = profile_data[field]
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không có trường nào để cập nhật"
            )
        
        # Add updated_at timestamp
        update_data['updated_at'] = datetime.now().isoformat()
        
        # Xử lý khác nhau cho admin và teacher
        if current_teacher.get("is_admin"):
            # Admin: cập nhật trong bảng users (chỉ các cột có tồn tại)
            user_update_data = {}
            for field in allowed_fields:
                if field in profile_data and field != "phone":  # Bỏ phone vì không có trong users table
                    user_update_data[field] = profile_data[field]
            
            if user_update_data:
                user_update_data['updated_at'] = datetime.now().isoformat()
                response = db.table("users").update(user_update_data).eq("id", current_teacher["user_id"]).execute()
                
                if response.data:
                    return {
                        "success": True,
                        "message": "Cập nhật thông tin cá nhân thành công",
                        "data": response.data[0]
                    }
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Không tìm thấy thông tin người dùng"
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Không có trường nào hợp lệ để cập nhật"
                )
        else:
            # Teacher: cập nhật trong bảng teachers
            response = db.table("teachers").update(update_data).eq("id", current_teacher["id"]).execute()
            
            if response.data:
                return {
                    "success": True,
                    "message": "Cập nhật thông tin cá nhân thành công",
                    "data": response.data[0]
                }
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Không tìm thấy thông tin giáo viên"
                )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating teacher profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/teacher/homeroom-classes")
async def get_homeroom_classes(
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Lấy danh sách lớp chủ nhiệm của giáo viên"""
    try:
        # Lấy thông tin giáo viên
        teacher_response = db.table("teachers").select("*").eq("user_id", current_user["id"]).execute()
        
        if not teacher_response.data:
            return {
                "success": True,
                "message": "Không phải là giáo viên",
                "data": []
            }
        
        teacher = teacher_response.data[0]
        
        # Lấy các lớp chủ nhiệm
        homeroom_classes = db.table("classes").select("*").eq("homeroom_teacher_id", teacher["id"]).eq("is_active", True).execute()
        
        return {
            "success": True,
            "message": "Lấy danh sách lớp chủ nhiệm thành công",
            "data": homeroom_classes.data
        }
        
    except Exception as e:
        logger.error(f"Error getting homeroom classes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/teacher/subject-classes")
async def get_subject_classes(
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Lấy danh sách lớp và môn học mà giáo viên đang dạy"""
    try:
        # Lấy các lớp-môn mà giáo viên được phân công
        class_subjects = db.table("class_subjects").select("""
            *,
            classes:class_id(id, class_name, grade),
            subjects:subject_id(id, subject_code, subject_name)
        """).eq("teacher_id", current_teacher["id"]).eq("is_active", True).execute()
        
        return {
            "success": True,
            "message": "Lấy danh sách lớp-môn dạy thành công",
            "data": class_subjects.data
        }
        
    except Exception as e:
        logger.error(f"Error getting subject classes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/teacher/students/{class_subject_id}")
async def get_students_by_class_subject(
    class_subject_id: int,
    academic_year: str,
    semester: str,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Lấy danh sách học sinh của một lớp-môn cụ thể"""
    try:
        # Kiểm tra xem giáo viên có quyền truy cập lớp này không
        class_subject = db.table("class_subjects").select("*").eq("id", class_subject_id).eq("teacher_id", current_teacher["id"]).execute()
        
        if not class_subject.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền truy cập lớp này"
            )
        
        class_subject_info = class_subject.data[0]
        
        # Lấy thông tin lớp học từ class_id
        class_data = db.table("classes").select("*").eq("id", class_subject_info["class_id"]).execute()
        
        if not class_data.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thông tin lớp học"
            )
        
        class_info = class_data.data[0]
        
        # Lấy thông tin môn học
        subject_data = db.table("subjects").select("*").eq("id", class_subject_info["subject_id"]).execute()
        subject_info = subject_data.data[0] if subject_data.data else None
        
        # Lấy danh sách học sinh trong lớp theo class_name và grade (bao gồm subject_selected)
        students = db.table("students").select("*").eq("class_name", class_info["class_name"]).eq("grade", class_info["grade"]).eq("is_active", True).execute()
        
        # Filter học sinh theo subject_selected (core_subjects hoặc elective_subjects)
        filtered_students = []
        if students.data and subject_info:
            subject_code = subject_info.get("subject_code")
            logger.info(f"Filtering students for subject: {subject_code}")
            logger.info(f"Total students in class: {len(students.data)}")
            
            for student in students.data:
                subject_selected = student.get("subject_selected")
                if subject_selected and isinstance(subject_selected, dict):
                    core_subjects = subject_selected.get("core_subjects", [])
                    elective_subjects = subject_selected.get("elective_subjects", [])
                    
                    # Kiểm tra xem học sinh có học môn này không
                    if subject_code in core_subjects or subject_code in elective_subjects:
                        filtered_students.append(student)
                        logger.info(f"Student {student.get('full_name')} ({student.get('student_id')}) studies {subject_code}")
                else:
                    # Nếu không có subject_selected, KHÔNG bao gồm học sinh
                    # Chỉ bao gồm học sinh có dữ liệu subject_selected rõ ràng
                    logger.info(f"Student {student.get('full_name')} ({student.get('student_id')}) has no subject_selected data - EXCLUDED")
        else:
            # Nếu không có dữ liệu, giữ nguyên danh sách
            filtered_students = students.data or []
        
        logger.info(f"Filtered students count: {len(filtered_students)}")
        
        # Lấy điểm của các học sinh cho môn này
        student_ids = [s["id"] for s in filtered_students]
        grades = db.table("grades").select("*").in_("student_id", student_ids).eq("class_subject_id", class_subject_id).eq("academic_year", academic_year).eq("semester", semester).execute()
        
        # Tạo dictionary để map điểm với học sinh
        grades_dict = {g["student_id"]: g for g in grades.data}
        
        # Combine student info with grades
        student_grades = []
        for student in filtered_students:
            student_grade = {
                "student": student,
                "grade": grades_dict.get(student["id"], None)
            }
            student_grades.append(student_grade)
        
        return {
            "success": True,
            "message": "Lấy danh sách học sinh thành công",
            "data": {
                "class_subject": {
                    "id": class_subject_info["id"],
                    "academic_year": class_subject_info["academic_year"],
                    "semester": class_subject_info["semester"],
                    "class": class_info,
                    "subject": subject_info
                },
                "students": student_grades
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting students: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


# ===============================================
# GRADE CONFIG ENDPOINTS
# ===============================================

@router.post("/config/upsert")
async def upsert_grade_config(
    config: dict,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Tạo mới hoặc cập nhật cấu hình cột điểm"""
    try:
        from grades.models import GradeConfigCreate
        
        config_obj = GradeConfigCreate(**config)
        
        # Kiểm tra xem đã có config chưa
        existing = db.table("grade_configs").select("*").eq("teacher_id", current_teacher["id"]).eq("subject_id", config_obj.subject_id).eq("academic_year", config_obj.academic_year).eq("semester", config_obj.semester).execute()
        
        if existing.data:
            # Update existing config
            update_data = {
                "grade_column_config": config_obj.grade_column_config,
                "updated_at": datetime.now().isoformat()
            }
            
            response = db.table("grade_configs").update(update_data).eq("id", existing.data[0]["id"]).execute()
            message = "Cập nhật cấu hình điểm thành công"
        else:
            # Create new config
            config_data = {
                "teacher_id": current_teacher["id"],
                "subject_id": config_obj.subject_id,
                "academic_year": config_obj.academic_year,
                "semester": config_obj.semester,
                "grade_column_config": config_obj.grade_column_config,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            response = db.table("grade_configs").insert(config_data).execute()
            message = "Tạo cấu hình điểm thành công"
        
        return {
            "success": True,
            "message": message,
            "data": response.data[0] if response.data else None
        }
        
    except Exception as e:
        logger.error(f"Error upserting grade config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.post("/config")
async def create_grade_config(
    config: dict,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Tạo cấu hình cột điểm cho môn học"""
    try:
        from grades.models import GradeConfigCreate
        
        config_obj = GradeConfigCreate(**config)
        
        # Kiểm tra xem đã có config chưa
        existing = db.table("grade_configs").select("*").eq("teacher_id", current_teacher["id"]).eq("subject_id", config_obj.subject_id).eq("academic_year", config_obj.academic_year).eq("semester", config_obj.semester).execute()
        
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cấu hình điểm cho môn này đã tồn tại"
            )
        
        config_data = {
            "teacher_id": current_teacher["id"],
            "subject_id": config_obj.subject_id,
            "academic_year": config_obj.academic_year,
            "semester": config_obj.semester,
            "grade_column_config": config_obj.grade_column_config,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.table("grade_configs").insert(config_data).execute()
        
        return {
            "success": True,
            "message": "Tạo cấu hình điểm thành công",
            "data": response.data[0] if response.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating grade config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/config/{subject_id}")
async def get_grade_config(
    subject_id: int,
    academic_year: str,
    semester: str,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Lấy cấu hình cột điểm cho môn học"""
    try:
        config = db.table("grade_configs").select("*").eq("teacher_id", current_teacher["id"]).eq("subject_id", subject_id).eq("academic_year", academic_year).eq("semester", semester).execute()
        
        if not config.data:
            # Trả về config mặc định
            default_config = {
                "teacher_id": current_teacher["id"],
                "subject_id": subject_id,
                "academic_year": academic_year,
                "semester": semester,
                "grade_column_config": {
                    "Diem_thuong_xuyen": {"he_so": 1, "label": "Điểm thường xuyên"},
                    "Diem_thi_giua_ki": {"he_so": 2, "label": "Điểm thi giữa kì"},
                    "Diem_thi_cuoi_ki": {"he_so": 3, "label": "Điểm thi cuối kì"}
                }
            }
            
            return {
                "success": True,
                "message": "Sử dụng cấu hình mặc định",
                "data": default_config
            }
        
        return {
            "success": True,
            "message": "Lấy cấu hình điểm thành công",
            "data": config.data[0]
        }
        
    except Exception as e:
        logger.error(f"Error getting grade config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.put("/config/{config_id}")
async def update_grade_config(
    config_id: int,
    config: dict,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Cập nhật cấu hình cột điểm"""
    try:
        from grades.models import GradeConfigUpdate
        
        config_obj = GradeConfigUpdate(**config)
        
        # Kiểm tra quyền sở hữu
        existing = db.table("grade_configs").select("*").eq("id", config_id).eq("teacher_id", current_teacher["id"]).execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy cấu hình điểm"
            )
        
        update_data = {
            "grade_column_config": config_obj.grade_column_config,
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.table("grade_configs").update(update_data).eq("id", config_id).execute()
        
        return {
            "success": True,
            "message": "Cập nhật cấu hình điểm thành công",
            "data": response.data[0] if response.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating grade config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


# ===============================================
# GRADE MANAGEMENT ENDPOINTS
# ===============================================

@router.post("/grade")
async def create_or_update_grade(
    grade: dict,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Tạo hoặc cập nhật điểm học sinh"""
    try:
        from grades.models import GradeCreate
        
        grade_obj = GradeCreate(**grade)
        
        # Kiểm tra quyền truy cập class_subject
        class_subject = db.table("class_subjects").select("*").eq("id", grade_obj.class_subject_id).eq("teacher_id", current_teacher["id"]).execute()
        
        if not class_subject.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền nhập điểm cho lớp này"
            )
        
        # Lấy cấu hình điểm để tính final_grade
        subject_id = class_subject.data[0]["subject_id"]
        config = db.table("grade_configs").select("*").eq("teacher_id", current_teacher["id"]).eq("subject_id", subject_id).eq("academic_year", grade_obj.academic_year).eq("semester", grade_obj.semester).execute()
        
        if config.data:
            grade_config = config.data[0]["grade_column_config"]
            final_grade = calculate_final_grade(grade_obj.grade_data, grade_config)
        else:
            final_grade = 0.0
        
        # Kiểm tra xem đã có điểm chưa
        existing = db.table("grades").select("*").eq("student_id", grade_obj.student_id).eq("class_subject_id", grade_obj.class_subject_id).eq("academic_year", grade_obj.academic_year).eq("semester", grade_obj.semester).execute()
        
        if existing.data:
            # Update existing grade
            update_data = {
                "grade_data": grade_obj.grade_data,
                "final_grade": final_grade,
                "updated_at": datetime.now().isoformat()
            }
            
            response = db.table("grades").update(update_data).eq("id", existing.data[0]["id"]).execute()
            message = "Cập nhật điểm thành công"
        else:
            # Create new grade
            grade_data = {
                "student_id": grade_obj.student_id,
                "class_subject_id": grade_obj.class_subject_id,
                "academic_year": grade_obj.academic_year,
                "semester": grade_obj.semester,
                "grade_data": grade_obj.grade_data,
                "final_grade": final_grade,
                "created_by": current_teacher["user_id"],
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            response = db.table("grades").insert(grade_data).execute()
            message = "Tạo điểm thành công"
        
        return {
            "success": True,
            "message": message,
            "data": response.data[0] if response.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating/updating grade: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/grade/{student_id}/{class_subject_id}")
async def get_student_grade(
    student_id: int,
    class_subject_id: int,
    academic_year: str,
    semester: str,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Lấy điểm của một học sinh cho môn học cụ thể"""
    try:
        # Kiểm tra quyền truy cập
        class_subject = db.table("class_subjects").select("*").eq("id", class_subject_id).eq("teacher_id", current_teacher["id"]).execute()
        
        if not class_subject.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xem điểm của lớp này"
            )
        
        grade = db.table("grades").select("*").eq("student_id", student_id).eq("class_subject_id", class_subject_id).eq("academic_year", academic_year).eq("semester", semester).execute()
        
        if not grade.data:
            return {
                "success": True,
                "message": "Chưa có điểm",
                "data": None
            }
        
        return {
            "success": True,
            "message": "Lấy điểm thành công",
            "data": grade.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting grade: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.delete("/grade/{grade_id}")
async def delete_grade(
    grade_id: int,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Xóa điểm"""
    try:
        # Kiểm tra quyền sở hữu
        grade = db.table("grades").select("*, class_subjects!inner(teacher_id)").eq("id", grade_id).execute()
        
        if not grade.data or grade.data[0]["class_subjects"]["teacher_id"] != current_teacher["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xóa điểm này"
            )
        
        response = db.table("grades").delete().eq("id", grade_id).execute()
        
        return {
            "success": True,
            "message": "Xóa điểm thành công",
            "data": None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting grade: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.post("/ocr/parse-grade-sheet")
async def parse_grade_sheet_from_image(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Upload và phân tích ảnh bảng điểm viết tay sử dụng OCR với Queue Manager
    
    Returns: Request ID để track progress
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File phải là ảnh (jpg, png, etc.)"
            )
        
        # Tạo thư mục uploads nếu chưa có
        upload_dir = Path("uploads/grade_sheets")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Lưu file tạm thời
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        temp_filename = f"grade_sheet_{current_teacher['id']}_{timestamp}_{file.filename}"
        temp_path = upload_dir / temp_filename
        
        # Save uploaded file
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        logger.info(f"Saved uploaded grade sheet to {temp_path}")
        
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        
        # Import OCR services (local)
        from .ocr_services import QwenQueueManager
        
        # Get queue manager (singleton pattern)
        queue_manager = QwenQueueManager.get_instance(max_concurrent=3, max_queue_size=50)
        
        # Get queue stats
        stats = queue_manager.get_stats()
        
        # Check if queue is full
        if stats['in_queue'] >= 50:
            # Cleanup uploaded file
            try:
                os.remove(temp_path)
            except:
                pass
            
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Hệ thống đang quá tải. Queue đã đầy ({stats['in_queue']}/50). Vui lòng thử lại sau."
            )
        
        # Add to queue (background processing)
        ocr_results[request_id] = {
            'status': 'queued',
            'message': 'Request đã được thêm vào hàng chờ',
            'progress': 0,
            'position_in_queue': stats['in_queue'] + 1,
            'timestamp': datetime.now().isoformat()
        }
        
        # Start background task
        async def process_ocr():
            try:
                from .ocr_services import OCRFactory
                
                ocr_results[request_id]['status'] = 'processing'
                ocr_results[request_id]['progress'] = 10
                ocr_results[request_id]['message'] = 'Đang xử lý ảnh...'
                
                # Get OCR service
                ocr_service = OCRFactory.get_ocr_service()
                
                # Add to queue and wait
                result = await queue_manager.add_request(
                    request_id=request_id,
                    image_path=str(temp_path),
                    ocr_service=ocr_service
                )
                
                # Update results
                if result['success']:
                    ocr_results[request_id] = {
                        'status': 'completed',
                        'progress': 100,
                        'message': 'Hoàn thành phân tích',
                        'data': result,
                        'timestamp': datetime.now().isoformat()
                    }
                else:
                    ocr_results[request_id] = {
                        'status': 'failed',
                        'progress': 0,
                        'message': result.get('error', 'Lỗi không xác định'),
                        'timestamp': datetime.now().isoformat()
                    }
                
                # Cleanup uploaded file after processing
                try:
                    os.remove(temp_path)
                    logger.info(f"Cleaned up temporary file: {temp_path}")
                except Exception as e:
                    logger.warning(f"Failed to cleanup file {temp_path}: {e}")
                    
            except Exception as e:
                logger.error(f"OCR processing error: {str(e)}")
                ocr_results[request_id] = {
                    'status': 'failed',
                    'progress': 0,
                    'message': f'Lỗi xử lý: {str(e)}',
                    'timestamp': datetime.now().isoformat()
                }
                # Cleanup on error
                try:
                    os.remove(temp_path)
                except:
                    pass
        
        # Add to background tasks
        background_tasks.add_task(process_ocr)
        
        return {
            "success": True,
            "message": "File đã được upload. Đang xử lý trong background.",
            "data": {
                'request_id': request_id,
                'status': 'queued',
                'position_in_queue': stats['in_queue'] + 1,
                'queue_info': stats
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading grade sheet: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/ocr/status/{request_id}")
async def get_ocr_status(
    request_id: str,
    current_teacher=Depends(get_current_teacher)
):
    """
    Kiểm tra status của OCR request
    
    Args:
        request_id: Unique request ID từ endpoint upload
        
    Returns:
        Status và data nếu đã hoàn thành
    """
    try:
        # Check if request exists
        if request_id not in ocr_results:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy request {request_id}"
            )
        
        result = ocr_results[request_id]
        status_value = result['status']
        
        # Import OCR services
        from .ocr_services import QwenQueueManager
        
        # Get queue manager for stats
        queue_manager = QwenQueueManager.get_instance(max_concurrent=3, max_queue_size=50)
        stats = queue_manager.get_stats()
        
        if status_value == 'queued':
            return {
                "success": True,
                "message": "Request đang trong hàng chờ",
                "data": {
                    'request_id': request_id,
                    'status': status_value,
                    'progress': result.get('progress', 0),
                    'message': result.get('message', ''),
                    'position_in_queue': result.get('position_in_queue', 0),
                    'queue_info': {
                        'in_queue': stats['in_queue'],
                        'processing': stats['processing']
                    },
                    'timestamp': result.get('timestamp')
                }
            }
        
        elif status_value == 'processing':
            return {
                "success": True,
                "message": "Đang xử lý OCR",
                "data": {
                    'request_id': request_id,
                    'status': status_value,
                    'progress': result.get('progress', 0),
                    'message': result.get('message', ''),
                    'queue_info': stats,
                    'timestamp': result.get('timestamp')
                }
            }
        
        elif status_value == 'completed':
            return {
                "success": True,
                "message": "OCR hoàn thành",
                "data": {
                    'request_id': request_id,
                    'status': status_value,
                    'progress': 100,
                    'result': result.get('data'),
                    'timestamp': result.get('timestamp')
                }
            }
        
        elif status_value == 'failed':
            return {
                "success": False,
                "message": "OCR thất bại",
                "data": {
                    'request_id': request_id,
                    'status': status_value,
                    'error': result.get('message', 'Unknown error'),
                    'timestamp': result.get('timestamp')
                }
            }
        
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unknown status: {status_value}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting OCR status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


# ===============================================
# ANALYTICS & TREND ENDPOINTS
# ===============================================

@router.get("/grade-trend/{student_id}/{class_subject_id}")
async def get_student_grade_trend(
    student_id: int,
    class_subject_id: int,
    academic_year: str,
    semester: str,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Phân tích xu hướng điểm cho một học sinh trong một môn.

    Dựa trên dữ liệu `grade_data` và `grade_config` của môn để ước lượng
    xu hướng tăng/giảm/ổn định, trả về cả mô tả ngắn gọn cho UI.
    """
    try:
        from grades.services import analyze_grade_trend
        
        # Quyền truy cập
        class_subject = db.table("class_subjects").select("*").eq("id", class_subject_id).eq("teacher_id", current_teacher["id"]).execute()
        if not class_subject.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xem điểm của lớp này"
            )

        # Lấy điểm và cấu hình cột điểm
        grade_resp = db.table("grades").select("*").eq("student_id", student_id).eq("class_subject_id", class_subject_id).eq("academic_year", academic_year).eq("semester", semester).execute()
        if not grade_resp.data:
            return {
                "success": True,
                "message": "Chưa có điểm",
                "data": {
                    "direction": "stable",
                    "slope": 0,
                    "confidence": 0,
                    "reason": "Chưa có dữ liệu điểm"
                }
            }

        subject_id = class_subject.data[0]["subject_id"]
        config_resp = db.table("grade_configs").select("*").eq("teacher_id", current_teacher["id"]).eq("subject_id", subject_id).eq("academic_year", academic_year).eq("semester", semester).execute()
        grade_config = config_resp.data[0]["grade_column_config"] if config_resp.data else None

        grade_record = grade_resp.data[0]
        trend = analyze_grade_trend(grade_record.get("grade_data", {}), grade_config)

        # Chuẩn hóa payload cho UI
        color = "#16A34A" if trend["direction"] == "up" else ("#DC2626" if trend["direction"] == "down" else "#6B7280")
        label = "Tăng" if trend["direction"] == "up" else ("Giảm" if trend["direction"] == "down" else "Ổn định")

        return {
            "success": True,
            "message": "Phân tích xu hướng thành công",
            "data": {
                "direction": trend["direction"],
                "label": label,
                "color": color,
                "slope": trend["slope"],
                "confidence": trend["confidence"],
                "reason": trend["reason"],
                "ordered_points": trend["ordered_points"],
                "final_grade": grade_record.get("final_grade")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing grade trend: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/teacher/dashboard/analytics")
async def get_teacher_dashboard_analytics(
    academic_year: str = "2024-2025",
    semester: str = "HK1",
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Lấy dữ liệu phân tích tổng hợp cho dashboard giáo viên bộ môn
    Bao gồm: tổng quan, phân nhóm học lực, xu hướng, top students, etc.
    """
    try:
        # Lấy các lớp-môn mà giáo viên dạy
        class_subjects = db.table("class_subjects").select("""
            *,
            classes:class_id(id, class_name, grade),
            subjects:subject_id(id, subject_code, subject_name)
        """).eq("teacher_id", current_teacher["id"]).eq("is_active", True).eq("academic_year", academic_year).eq("semester", semester).execute()
        
        if not class_subjects.data:
            return {
                "success": True,
                "message": "Chưa có lớp-môn được phân công",
                "data": {
                    "total_classes": 0,
                    "total_students": 0,
                    "overview": {},
                    "performance_groups": {},
                    "class_comparison": [],
                    "students_need_attention": [],
                    "top_students": []
                }
            }
        
        # Thu thập tất cả điểm số
        class_subject_ids = [cs["id"] for cs in class_subjects.data]
        
        all_grades = db.table("grades").select("""
            *,
            students:student_id(id, student_id, full_name, class_name, grade),
            class_subjects!inner(
                id,
                classes:class_id(class_name, grade),
                subjects:subject_id(subject_name)
            )
        """).in_("class_subject_id", class_subject_ids).eq("academic_year", academic_year).eq("semester", semester).execute()
        
        grades_data = all_grades.data if all_grades.data else []
        
        # === TỔNG QUAN ===
        total_students_with_grades = len(grades_data)
        average_score = sum([g["final_grade"] for g in grades_data if g.get("final_grade")]) / total_students_with_grades if total_students_with_grades > 0 else 0
        
        # Lấy tổng số học sinh trong các lớp dạy
        total_students_count = 0
        for cs in class_subjects.data:
            if cs.get("classes"):
                students_in_class = db.table("students").select("id").eq("class_name", cs["classes"]["class_name"]).eq("grade", cs["classes"]["grade"]).eq("is_active", True).execute()
                total_students_count += len(students_in_class.data) if students_in_class.data else 0
        
        # === PHÂN NHÓM HỌC LỰC (theo tiêu chuẩn giáo dục VN) ===
        excellent = []  # Giỏi: 8.0 - 10
        good = []       # Khá: 6.5 - 7.9
        average = []    # Trung bình: 5.0 - 6.4
        weak = []       # Yếu: 3.5 - 4.9
        poor = []       # Kém: < 3.5
        
        for grade in grades_data:
            final_grade = grade.get("final_grade", 0)
            if final_grade >= 8.0:
                excellent.append(grade)
            elif final_grade >= 6.5:
                good.append(grade)
            elif final_grade >= 5.0:
                average.append(grade)
            elif final_grade >= 3.5:
                weak.append(grade)
            else:
                poor.append(grade)
        
        performance_groups = {
            "excellent": {
                "count": len(excellent),
                "percentage": round(len(excellent) * 100 / total_students_with_grades, 2) if total_students_with_grades > 0 else 0,
                "label": "Giỏi (8.0 - 10)",
                "color": "#059669"
            },
            "good": {
                "count": len(good),
                "percentage": round(len(good) * 100 / total_students_with_grades, 2) if total_students_with_grades > 0 else 0,
                "label": "Khá (6.5 - 7.9)",
                "color": "#2563EB"
            },
            "average": {
                "count": len(average),
                "percentage": round(len(average) * 100 / total_students_with_grades, 2) if total_students_with_grades > 0 else 0,
                "label": "Trung bình (5.0 - 6.4)",
                "color": "#D97706"
            },
            "weak": {
                "count": len(weak),
                "percentage": round(len(weak) * 100 / total_students_with_grades, 2) if total_students_with_grades > 0 else 0,
                "label": "Yếu (3.5 - 4.9)",
                "color": "#EA580C"
            },
            "poor": {
                "count": len(poor),
                "percentage": round(len(poor) * 100 / total_students_with_grades, 2) if total_students_with_grades > 0 else 0,
                "label": "Kém (< 3.5)",
                "color": "#DC2626"
            }
        }
        
        # === SO SÁNH GIỮA CÁC LỚP ===
        class_comparison = []
        class_grades_map = {}
        
        for grade in grades_data:
            class_name = grade["class_subjects"]["classes"]["class_name"]
            if class_name not in class_grades_map:
                class_grades_map[class_name] = []
            class_grades_map[class_name].append(grade["final_grade"])
        
        for class_name, grades_list in class_grades_map.items():
            valid_grades = [g for g in grades_list if g is not None]
            if valid_grades:
                avg = sum(valid_grades) / len(valid_grades)
                highest = max(valid_grades)
                lowest = min(valid_grades)
                
                class_comparison.append({
                    "class_name": class_name,
                    "student_count": len(valid_grades),
                    "average_score": round(avg, 2),
                    "highest_score": round(highest, 2),
                    "lowest_score": round(lowest, 2),
                    "pass_rate": round(sum(1 for g in valid_grades if g >= 5.0) * 100 / len(valid_grades), 2)
                })
        
        # Sắp xếp theo điểm trung bình giảm dần
        class_comparison.sort(key=lambda x: x["average_score"], reverse=True)
        
        # === HỌC SINH CẦN QUAN TÂM (điểm yếu và kém) ===
        students_need_attention = []
        for grade in weak + poor:
            student_info = grade.get("students", {})
            class_info = grade.get("class_subjects", {}).get("classes", {})
            
            students_need_attention.append({
                "student_id": student_info.get("student_id"),
                "student_name": student_info.get("full_name"),
                "class_name": class_info.get("class_name"),
                "final_grade": grade.get("final_grade"),
                "category": "Kém" if grade.get("final_grade", 0) < 3.5 else "Yếu",
                "grade_data": grade.get("grade_data", {})
            })
        
        # Sắp xếp theo điểm tăng dần (yếu nhất lên đầu)
        students_need_attention.sort(key=lambda x: x["final_grade"] if x["final_grade"] else 0)
        
        # === TOP HỌC SINH XUẤT SẮC ===
        top_students = []
        for grade in sorted(excellent, key=lambda x: x.get("final_grade", 0), reverse=True)[:10]:
            student_info = grade.get("students", {})
            class_info = grade.get("class_subjects", {}).get("classes", {})
            
            top_students.append({
                "student_id": student_info.get("student_id"),
                "student_name": student_info.get("full_name"),
                "class_name": class_info.get("class_name"),
                "final_grade": grade.get("final_grade"),
                "grade_data": grade.get("grade_data", {})
            })
        
        # === PHÂN BỐ ĐIỂM SỐ (Distribution) ===
        score_distribution = {
            "9-10": len([g for g in grades_data if g.get("final_grade", 0) >= 9]),
            "8-9": len([g for g in grades_data if 8 <= g.get("final_grade", 0) < 9]),
            "7-8": len([g for g in grades_data if 7 <= g.get("final_grade", 0) < 8]),
            "6-7": len([g for g in grades_data if 6 <= g.get("final_grade", 0) < 7]),
            "5-6": len([g for g in grades_data if 5 <= g.get("final_grade", 0) < 6]),
            "4-5": len([g for g in grades_data if 4 <= g.get("final_grade", 0) < 5]),
            "0-4": len([g for g in grades_data if g.get("final_grade", 0) < 4])
        }
        
        # === THỐNG KÊ ĐẠT/KHÔNG ĐẠT ===
        pass_count = len([g for g in grades_data if g.get("final_grade", 0) >= 5.0])
        fail_count = total_students_with_grades - pass_count
        
        analytics_data = {
            "academic_year": academic_year,
            "semester": semester,
            "total_classes": len(class_subjects.data),
            "total_students": total_students_count,
            "students_with_grades": total_students_with_grades,
            "students_without_grades": total_students_count - total_students_with_grades,
            "overview": {
                "average_score": round(average_score, 2),
                "highest_score": round(max([g.get("final_grade", 0) for g in grades_data]), 2) if grades_data else 0,
                "lowest_score": round(min([g.get("final_grade", 0) for g in grades_data if g.get("final_grade", 0) > 0]), 2) if grades_data else 0,
                "pass_count": pass_count,
                "fail_count": fail_count,
                "pass_rate": round(pass_count * 100 / total_students_with_grades, 2) if total_students_with_grades > 0 else 0
            },
            "performance_groups": performance_groups,
            "score_distribution": score_distribution,
            "class_comparison": class_comparison,
            "students_need_attention": students_need_attention[:20],  # Top 20
            "top_students": top_students,
            "subjects": list(set([cs["subjects"]["subject_name"] for cs in class_subjects.data if cs.get("subjects")]))
        }
        
        return {
            "success": True,
            "message": "Lấy dữ liệu phân tích thành công",
            "data": analytics_data
        }
        
    except Exception as e:
        logger.error(f"Error getting dashboard analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/template/download/{class_subject_id}")
async def download_grade_template(
    class_subject_id: int,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Download template Excel để nhập điểm hàng loạt"""
    try:
        import xlsxwriter
        import io
        from fastapi.responses import StreamingResponse
        
        # Kiểm tra quyền truy cập
        class_subject = db.table("class_subjects").select("""
            *,
            classes:class_id(id, class_name, grade),
            subjects:subject_id(id, subject_code, subject_name)
        """).eq("id", class_subject_id).eq("teacher_id", current_teacher["id"]).execute()
        
        if not class_subject.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền truy cập lớp này"
            )
        
        class_subject_info = class_subject.data[0]
        class_info = class_subject_info["classes"]
        
        # Lấy danh sách học sinh (bao gồm subject_selected)
        students = db.table("students").select("*").eq("class_name", class_info["class_name"]).eq("grade", class_info["grade"]).eq("is_active", True).order("student_id").execute()
        
        # Filter học sinh theo subject_selected (giống như endpoint get_students_by_class_subject)
        subject_info = class_subject_info["subjects"]
        filtered_students = []
        if students.data and subject_info:
            subject_code = subject_info.get("subject_code")
            logger.info(f"Template filtering students for subject: {subject_code}")
            logger.info(f"Total students in class: {len(students.data)}")
            
            for student in students.data:
                subject_selected = student.get("subject_selected")
                if subject_selected and isinstance(subject_selected, dict):
                    core_subjects = subject_selected.get("core_subjects", [])
                    elective_subjects = subject_selected.get("elective_subjects", [])
                    
                    # Kiểm tra xem học sinh có học môn này không
                    if subject_code in core_subjects or subject_code in elective_subjects:
                        filtered_students.append(student)
                        logger.info(f"Template: Student {student.get('full_name')} ({student.get('student_id')}) studies {subject_code}")
                else:
                    # Nếu không có subject_selected, KHÔNG bao gồm học sinh
                    logger.info(f"Template: Student {student.get('full_name')} ({student.get('student_id')}) has no subject_selected data - EXCLUDED")
        else:
            # Nếu không có dữ liệu, giữ nguyên danh sách
            filtered_students = students.data or []
        
        logger.info(f"Template filtered students count: {len(filtered_students)}")
        
        # Tạo file Excel
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        worksheet = workbook.add_worksheet('Bảng điểm')
        
        # Định dạng
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#4472C4',
            'font_color': 'white',
            'border': 1,
            'align': 'center',
            'valign': 'vcenter'
        })
        
        cell_format = workbook.add_format({
            'border': 1,
            'align': 'center',
            'valign': 'vcenter'
        })
        
        # Header
        headers = ['id', 'ho_va_ten', 'diem_thuong_xuyen', 'diem_thi_giua_ki', 'diem_thi_cuoi_ki']
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        # Dữ liệu học sinh (chỉ những học sinh có học môn này)
        for row, student in enumerate(filtered_students, start=1):
            worksheet.write(row, 0, student['student_id'], cell_format)
            worksheet.write(row, 1, student['full_name'], cell_format)
            worksheet.write(row, 2, '', cell_format)  # Điểm thường xuyên
            worksheet.write(row, 3, '', cell_format)  # Điểm giữa kỳ
            worksheet.write(row, 4, '', cell_format)  # Điểm cuối kỳ
        
        # Điều chỉnh độ rộng cột
        worksheet.set_column('A:A', 12)  # id
        worksheet.set_column('B:B', 25)  # họ và tên
        worksheet.set_column('C:E', 20)  # các cột điểm
        
        workbook.close()
        output.seek(0)
        
        # Tên file
        filename = f"Template_Diem_{class_info['class_name']}_{class_subject_info['subjects']['subject_name']}_{len(filtered_students)}HS.xlsx"
        
        return StreamingResponse(
            output,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error generating template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )


@router.post("/bulk-import")
async def bulk_import_grades(
    import_data: dict,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Nhập điểm hàng loạt từ file Excel/CSV"""
    try:
        class_subject_id = import_data.get("class_subject_id")
        grades_data = import_data.get("grades", [])
        
        # Kiểm tra quyền truy cập
        class_subject = db.table("class_subjects").select("*").eq("id", class_subject_id).eq("teacher_id", current_teacher["id"]).execute()
        
        if not class_subject.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền nhập điểm cho lớp này"
            )
        
        subject_id = class_subject.data[0]["subject_id"]
        
        # Lấy grade config
        config = db.table("grade_configs").select("*").eq("subject_id", subject_id).eq("academic_year", import_data.get("academic_year", "2024-2025")).eq("semester", import_data.get("semester", "HK1")).execute()
        
        grade_config = config.data[0] if config.data else None
        
        imported_count = 0
        errors = []
        
        for grade_data in grades_data:
            try:
                student_id = grade_data.get("student_id")
                if not student_id:
                    continue
                
                # Tính final grade
                final_grade = calculate_final_grade(grade_data, grade_config)
                
                # Upsert grade
                existing = db.table("grades").select("id").eq("student_id", student_id).eq("class_subject_id", class_subject_id).execute()
                
                if existing.data:
                    # Update existing
                    db.table("grades").update({
                        "grade_data": grade_data,
                        "final_grade": final_grade,
                        "updated_at": datetime.now().isoformat()
                    }).eq("id", existing.data[0]["id"]).execute()
                else:
                    # Create new
                    db.table("grades").insert({
                        "student_id": student_id,
                        "class_subject_id": class_subject_id,
                        "academic_year": import_data.get("academic_year", "2024-2025"),
                        "semester": import_data.get("semester", "HK1"),
                        "grade_data": grade_data,
                        "final_grade": final_grade,
                        "created_at": datetime.now().isoformat(),
                        "updated_at": datetime.now().isoformat()
                    }).execute()
                
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Lỗi nhập điểm cho học sinh {grade_data.get('student_id', 'N/A')}: {str(e)}")
        
        return {
            "success": True,
            "message": f"Nhập điểm thành công {imported_count}/{len(grades_data)} học sinh",
            "data": {
                "imported_count": imported_count,
                "total_count": len(grades_data),
                "errors": errors
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error bulk importing grades: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )


@router.get("/ocr/queue-stats")
async def get_queue_stats(
    current_teacher=Depends(get_current_teacher)
):
    """Lấy thống kê queue OCR"""
    try:
        # Mock queue stats (có thể integrate với queue manager thực tế)
        stats = {
            "queue_size": 0,
            "active_workers": 0,
            "completed_today": 0,
            "average_processing_time": 0,
            "max_queue_size": 50,
            "max_concurrent": 3
        }
        
        return {
            "success": True,
            "message": "Lấy thống kê queue thành công",
            "data": {
                'queue_stats': stats,
                'config': {
                    'max_concurrent': 3,
                    'max_queue_size': 50
                }
            }
        }
        
    except Exception as e:
        logger.error(f"ERROR: Error getting queue stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )


@router.post("/ocr/import-from-parsed")
async def import_grades_from_parsed_ocr(
    import_data: dict,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Import điểm từ dữ liệu đã parse bởi OCR (sau khi review)
    Tái sử dụng logic bulk_import_grades
    """
    # Sử dụng lại hàm bulk_import_grades đã có
    return await bulk_import_grades(import_data, current_teacher, db)


@router.post("/ocr/export-parsed-to-excel")
async def export_parsed_ocr_to_excel(
    data: dict,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """
    Export dữ liệu đã parse từ OCR ra file Excel để người dùng tải về
    """
    try:
        import xlsxwriter
        import io
        from fastapi.responses import StreamingResponse
        
        parsed_rows = data.get('parsed_rows', [])
        
        if not parsed_rows:
            raise HTTPException(
                status_code=400,
                detail="Không có dữ liệu để export"
            )
        
        # Tạo file Excel
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        worksheet = workbook.add_worksheet('Bảng điểm OCR')
        
        # Định dạng
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#4472C4',
            'font_color': 'white',
            'border': 1,
            'align': 'center',
            'valign': 'vcenter'
        })
        
        cell_format = workbook.add_format({
            'border': 1,
            'align': 'center',
            'valign': 'vcenter'
        })
        
        # Header
        headers = ['id', 'ho_va_ten', 'lop', 'diem_thuong_xuyen', 'diem_thi_giua_ki', 'diem_thi_cuoi_ki']
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        # Dữ liệu
        for row_idx, row in enumerate(parsed_rows, start=1):
            worksheet.write(row_idx, 0, row.get('student_id', ''), cell_format)
            worksheet.write(row_idx, 1, row.get('full_name', ''), cell_format)
            worksheet.write(row_idx, 2, row.get('class_name', ''), cell_format)
            worksheet.write(row_idx, 3, row.get('diem_thuong_xuyen', ''), cell_format)
            worksheet.write(row_idx, 4, row.get('diem_thi_giua_ki', ''), cell_format)
            worksheet.write(row_idx, 5, row.get('diem_thi_cuoi_ki', ''), cell_format)
        
        # Điều chỉnh độ rộng cột
        worksheet.set_column('A:A', 12)
        worksheet.set_column('B:B', 25)
        worksheet.set_column('C:C', 15)
        worksheet.set_column('D:F', 20)
        
        workbook.close()
        output.seek(0)
        
        # Tên file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"Bang_diem_OCR_{timestamp}.xlsx"
        
        return StreamingResponse(
            output,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error exporting parsed OCR data: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi export file: {str(e)}"
        )