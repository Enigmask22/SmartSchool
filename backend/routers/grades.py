"""
API Router cho quản lý điểm số học sinh
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel

from database.connection import get_db
from routers.auth import get_current_user
from models.schemas import ResponseModel
from utils.logger import setup_logger

logger = setup_logger()
router = APIRouter()

# ===============================================
# PYDANTIC MODELS
# ===============================================

class GradeConfigCreate(BaseModel):
    subject_id: int
    academic_year: str
    semester: str
    grade_column_config: dict

class GradeConfigUpdate(BaseModel):
    grade_column_config: dict

class GradeCreate(BaseModel):
    student_id: int
    class_subject_id: int
    academic_year: str
    semester: str
    grade_data: dict

class GradeUpdate(BaseModel):
    grade_data: dict
    final_grade: Optional[float] = None

class TeacherSubjectInfo(BaseModel):
    teacher_id: int
    teacher_name: str
    subject_id: int
    subject_name: str
    class_id: int
    class_name: str
    academic_year: str
    semester: str

# ===============================================
# HELPER FUNCTIONS
# ===============================================

async def get_current_teacher(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Lấy thông tin giáo viên hiện tại"""
    teacher_response = db.table("teachers").select("*").eq("user_id", current_user["id"]).execute()
    
    if not teacher_response.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không phải là giáo viên bộ môn"
        )
    
    return teacher_response.data[0]

def calculate_final_grade(grade_data: dict, grade_config: dict) -> float:
    """Tính điểm tổng kết dựa trên grade_data và config"""
    try:
        total_score = 0
        total_weight = 0
        
        for column_name, column_config in grade_config.items():
            if column_name in grade_data and "Diem" in grade_data[column_name]:
                score = float(grade_data[column_name]["Diem"])
                weight = float(column_config.get("he_so", 1))
                
                total_score += score * weight
                total_weight += weight
        
        if total_weight > 0:
            return round(total_score / total_weight, 2)
        return 0.0
        
    except Exception as e:
        logger.error(f"Error calculating final grade: {str(e)}")
        return 0.0

# ===============================================
# TEACHER INFORMATION ENDPOINTS
# ===============================================

@router.get("/teacher/info", response_model=ResponseModel)
async def get_teacher_info(
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Lấy thông tin giáo viên và các lớp/môn được phân công"""
    try:
        # Lấy các lớp-môn mà giáo viên được phân công
        class_subjects = db.table("class_subjects").select("""
            *,
            classes:class_id(id, class_name, grade),
            subjects:subject_id(id, subject_code, subject_name)
        """).eq("teacher_id", current_teacher["id"]).eq("is_active", True).execute()
        
        teacher_info = {
            "teacher": current_teacher,
            "assigned_classes": class_subjects.data
        }
        
        return ResponseModel(
            success=True,
            message="Lấy thông tin giáo viên thành công",
            data=teacher_info
        )
        
    except Exception as e:
        logger.error(f"ERROR: Error getting teacher info: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

@router.get("/teacher/students/{class_subject_id}", response_model=ResponseModel)
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
        
        # Lấy danh sách học sinh trong lớp theo class_name và grade
        students = db.table("students").select("*").eq("class_name", class_info["class_name"]).eq("grade", class_info["grade"]).eq("is_active", True).execute()
        
        # Lấy điểm của các học sinh cho môn này
        student_ids = [s["id"] for s in students.data]
        grades = db.table("grades").select("*").in_("student_id", student_ids).eq("class_subject_id", class_subject_id).eq("academic_year", academic_year).eq("semester", semester).execute()
        
        # Tạo dictionary để map điểm với học sinh
        grades_dict = {g["student_id"]: g for g in grades.data}
        
        # Combine student info with grades
        student_grades = []
        for student in students.data:
            student_grade = {
                "student": student,
                "grade": grades_dict.get(student["id"], None)
            }
            student_grades.append(student_grade)
        
        return ResponseModel(
            success=True,
            message="Lấy danh sách học sinh thành công",
            data={
                "class_subject": {
                    "id": class_subject_info["id"],
                    "academic_year": class_subject_info["academic_year"],
                    "semester": class_subject_info["semester"],
                    "class": class_info,
                    "subject": subject_info
                },
                "students": student_grades
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error getting students: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

# ===============================================
# GRADE CONFIG ENDPOINTS
# ===============================================

@router.post("/config/upsert", response_model=ResponseModel)
async def upsert_grade_config(
    config: GradeConfigCreate,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Tạo mới hoặc cập nhật cấu hình cột điểm"""
    try:
        # Kiểm tra xem đã có config chưa
        existing = db.table("grade_configs").select("*").eq("teacher_id", current_teacher["id"]).eq("subject_id", config.subject_id).eq("academic_year", config.academic_year).eq("semester", config.semester).execute()
        
        if existing.data:
            # Update existing config
            update_data = {
                "grade_column_config": config.grade_column_config,
                "updated_at": datetime.now().isoformat()
            }
            
            response = db.table("grade_configs").update(update_data).eq("id", existing.data[0]["id"]).execute()
            message = "Cập nhật cấu hình điểm thành công"
        else:
            # Create new config
            config_data = {
                "teacher_id": current_teacher["id"],
                "subject_id": config.subject_id,
                "academic_year": config.academic_year,
                "semester": config.semester,
                "grade_column_config": config.grade_column_config,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            response = db.table("grade_configs").insert(config_data).execute()
            message = "Tạo cấu hình điểm thành công"
        
        return ResponseModel(
            success=True,
            message=message,
            data=response.data[0]
        )
        
    except Exception as e:
        logger.error(f"ERROR: Error upserting grade config: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

@router.post("/config", response_model=ResponseModel)
async def create_grade_config(
    config: GradeConfigCreate,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Tạo cấu hình cột điểm cho môn học"""
    try:
        # Kiểm tra xem đã có config chưa
        existing = db.table("grade_configs").select("*").eq("teacher_id", current_teacher["id"]).eq("subject_id", config.subject_id).eq("academic_year", config.academic_year).eq("semester", config.semester).execute()
        
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cấu hình điểm cho môn này đã tồn tại"
            )
        
        config_data = {
            "teacher_id": current_teacher["id"],
            "subject_id": config.subject_id,
            "academic_year": config.academic_year,
            "semester": config.semester,
            "grade_column_config": config.grade_column_config,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.table("grade_configs").insert(config_data).execute()
        
        return ResponseModel(
            success=True,
            message="Tạo cấu hình điểm thành công",
            data=response.data[0]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error creating grade config: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

@router.get("/config/{subject_id}", response_model=ResponseModel)
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
            
            return ResponseModel(
                success=True,
                message="Sử dụng cấu hình mặc định",
                data=default_config
            )
        
        return ResponseModel(
            success=True,
            message="Lấy cấu hình điểm thành công",
            data=config.data[0]
        )
        
    except Exception as e:
        logger.error(f"ERROR: Error getting grade config: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

@router.put("/config/{config_id}", response_model=ResponseModel)
async def update_grade_config(
    config_id: int,
    config: GradeConfigUpdate,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Cập nhật cấu hình cột điểm"""
    try:
        # Kiểm tra quyền sở hữu
        existing = db.table("grade_configs").select("*").eq("id", config_id).eq("teacher_id", current_teacher["id"]).execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy cấu hình điểm"
            )
        
        update_data = {
            "grade_column_config": config.grade_column_config,
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.table("grade_configs").update(update_data).eq("id", config_id).execute()
        
        return ResponseModel(
            success=True,
            message="Cập nhật cấu hình điểm thành công",
            data=response.data[0]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error updating grade config: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

# ===============================================
# GRADE MANAGEMENT ENDPOINTS
# ===============================================

@router.post("/grade", response_model=ResponseModel)
async def create_or_update_grade(
    grade: GradeCreate,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Tạo hoặc cập nhật điểm học sinh"""
    try:
        # Kiểm tra quyền truy cập class_subject
        class_subject = db.table("class_subjects").select("*").eq("id", grade.class_subject_id).eq("teacher_id", current_teacher["id"]).execute()
        
        if not class_subject.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền nhập điểm cho lớp này"
            )
        
        # Lấy cấu hình điểm để tính final_grade
        subject_id = class_subject.data[0]["subject_id"]
        config = db.table("grade_configs").select("*").eq("teacher_id", current_teacher["id"]).eq("subject_id", subject_id).eq("academic_year", grade.academic_year).eq("semester", grade.semester).execute()
        
        if config.data:
            grade_config = config.data[0]["grade_column_config"]
            final_grade = calculate_final_grade(grade.grade_data, grade_config)
        else:
            final_grade = 0.0
        
        # Kiểm tra xem đã có điểm chưa
        existing = db.table("grades").select("*").eq("student_id", grade.student_id).eq("class_subject_id", grade.class_subject_id).eq("academic_year", grade.academic_year).eq("semester", grade.semester).execute()
        
        if existing.data:
            # Update existing grade
            update_data = {
                "grade_data": grade.grade_data,
                "final_grade": final_grade,
                "updated_at": datetime.now().isoformat()
            }
            
            response = db.table("grades").update(update_data).eq("id", existing.data[0]["id"]).execute()
            message = "Cập nhật điểm thành công"
        else:
            # Create new grade
            grade_data = {
                "student_id": grade.student_id,
                "class_subject_id": grade.class_subject_id,
                "academic_year": grade.academic_year,
                "semester": grade.semester,
                "grade_data": grade.grade_data,
                "final_grade": final_grade,
                "created_by": current_teacher["user_id"],
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            response = db.table("grades").insert(grade_data).execute()
            message = "Tạo điểm thành công"
        
        return ResponseModel(
            success=True,
            message=message,
            data=response.data[0]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error creating/updating grade: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

@router.get("/grade/{student_id}/{class_subject_id}", response_model=ResponseModel)
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
            return ResponseModel(
                success=True,
                message="Chưa có điểm",
                data=None
            )
        
        return ResponseModel(
            success=True,
            message="Lấy điểm thành công",
            data=grade.data[0]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error getting grade: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

@router.delete("/grade/{grade_id}", response_model=ResponseModel)
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
        
        return ResponseModel(
            success=True,
            message="Xóa điểm thành công",
            data=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error deleting grade: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

# ===============================================
# SUBJECTS ENDPOINTS
# ===============================================

@router.get("/subjects", response_model=ResponseModel)
async def get_all_subjects(db=Depends(get_db)):
    """Lấy danh sách tất cả môn học"""
    try:
        subjects = db.table("subjects").select("*").eq("is_active", True).order("subject_code").execute()
        
        return ResponseModel(
            success=True,
            message="Lấy danh sách môn học thành công",
            data=subjects.data
        )
        
    except Exception as e:
        logger.error(f"ERROR: Error getting subjects: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

@router.get("/student/{student_id}", response_model=ResponseModel)
async def get_student_grades(
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
                status_code=status.HTTP_404_NOT_FOUND,
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
                    "subject_name": subject.get("subject_name", "N/A"),
                    "class_name": class_info.get("class_name", "N/A"),
                    "teacher_name": teacher.get("full_name", "N/A"),
                    "academic_year": grade_record["academic_year"],
                    "semester": grade_record["semester"],
                    "grade_data": grade_record["grade_data"],
                    "final_grade": grade_record["final_grade"]
                })
        
        return ResponseModel(
            success=True,
            message="Lấy điểm học sinh thành công",
            data={
                "student": student_info,
                "grades": student_grades,
                "academic_year": academic_year,
                "semester": semester
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error getting student grades: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        ) 