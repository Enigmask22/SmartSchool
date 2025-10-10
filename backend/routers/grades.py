"""
API Router cho quản lý điểm số học sinh
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import io
import xlsxwriter

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

class BulkGradeImport(BaseModel):
    class_subject_id: int
    academic_year: str
    semester: str
    grades: List[dict]  # List of {student_id, diem_thuong_xuyen, diem_thi_giua_ki, diem_thi_cuoi_ki}

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

# ===============================================
# TEACHER DASHBOARD ANALYTICS ENDPOINTS
# ===============================================

@router.get("/teacher/dashboard/analytics", response_model=ResponseModel)
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
            return ResponseModel(
                success=True,
                message="Chưa có lớp-môn được phân công",
                data={
                    "total_classes": 0,
                    "total_students": 0,
                    "overview": {},
                    "performance_groups": {},
                    "class_comparison": [],
                    "students_need_attention": [],
                    "top_students": []
                }
            )
        
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
                "color": "#059669"  # Emerald-600 - Professional green
            },
            "good": {
                "count": len(good),
                "percentage": round(len(good) * 100 / total_students_with_grades, 2) if total_students_with_grades > 0 else 0,
                "label": "Khá (6.5 - 7.9)",
                "color": "#2563EB"  # Blue-600 - Match theme
            },
            "average": {
                "count": len(average),
                "percentage": round(len(average) * 100 / total_students_with_grades, 2) if total_students_with_grades > 0 else 0,
                "label": "Trung bình (5.0 - 6.4)",
                "color": "#D97706"  # Amber-600 - Softer yellow
            },
            "weak": {
                "count": len(weak),
                "percentage": round(len(weak) * 100 / total_students_with_grades, 2) if total_students_with_grades > 0 else 0,
                "label": "Yếu (3.5 - 4.9)",
                "color": "#EA580C"  # Orange-600 - Warning color
            },
            "poor": {
                "count": len(poor),
                "percentage": round(len(poor) * 100 / total_students_with_grades, 2) if total_students_with_grades > 0 else 0,
                "label": "Kém (< 3.5)",
                "color": "#DC2626"  # Red-600 - Not too dark
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
            "subjects": list(set([cs["subjects"]["subject_name"] for cs in class_subjects.data]))
        }
        
        return ResponseModel(
            success=True,
            message="Lấy dữ liệu phân tích thành công",
            data=analytics_data
        )
        
    except Exception as e:
        logger.error(f"ERROR: Error getting teacher dashboard analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

# ===============================================
# BULK IMPORT & EXPORT ENDPOINTS
# ===============================================

@router.get("/template/download/{class_subject_id}")
async def download_grade_template(
    class_subject_id: int,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Download template Excel để nhập điểm hàng loạt"""
    try:
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
        
        # Lấy danh sách học sinh
        students = db.table("students").select("*").eq("class_name", class_info["class_name"]).eq("grade", class_info["grade"]).eq("is_active", True).order("student_id").execute()
        
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
        
        # Dữ liệu học sinh
        for row, student in enumerate(students.data, start=1):
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
        filename = f"Template_Diem_{class_info['class_name']}_{class_subject_info['subjects']['subject_name']}.xlsx"
        
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

@router.post("/bulk-import", response_model=ResponseModel)
async def bulk_import_grades(
    import_data: BulkGradeImport,
    current_teacher=Depends(get_current_teacher),
    db=Depends(get_db)
):
    """Nhập điểm hàng loạt từ file Excel/CSV"""
    try:
        # Kiểm tra quyền truy cập
        class_subject = db.table("class_subjects").select("*").eq("id", import_data.class_subject_id).eq("teacher_id", current_teacher["id"]).execute()
        
        if not class_subject.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền nhập điểm cho lớp này"
            )
        
        subject_id = class_subject.data[0]["subject_id"]
        
        # Lấy cấu hình điểm
        config = db.table("grade_configs").select("*").eq("teacher_id", current_teacher["id"]).eq("subject_id", subject_id).eq("academic_year", import_data.academic_year).eq("semester", import_data.semester).execute()
        
        grade_config = config.data[0]["grade_column_config"] if config.data else None
        
        if not grade_config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chưa có cấu hình cột điểm cho môn này"
            )
        
        # Xử lý từng bản ghi điểm
        success_count = 0
        error_count = 0
        errors = []
        
        for grade_record in import_data.grades:
            try:
                student_id = grade_record.get('student_id')
                
                # Kiểm tra học sinh tồn tại
                student = db.table("students").select("*").eq("student_id", student_id).execute()
                
                if not student.data:
                    errors.append(f"Không tìm thấy học sinh với ID: {student_id}")
                    error_count += 1
                    continue
                
                student_db_id = student.data[0]['id']
                
                # Tạo grade_data từ config và điểm nhập vào
                grade_data = {}
                
                # Map các cột từ import vào grade_config
                column_mapping = {
                    'diem_thuong_xuyen': 'Diem_thuong_xuyen',
                    'diem_thi_giua_ki': 'Diem_thi_giua_ki',
                    'diem_thi_cuoi_ki': 'Diem_thi_cuoi_ki'
                }
                
                for import_col, config_col in column_mapping.items():
                    if config_col in grade_config:
                        score = grade_record.get(import_col)
                        if score is not None and score != '':
                            grade_data[config_col] = {
                                'He_so': grade_config[config_col]['he_so'],
                                'Diem': float(score)
                            }
                
                # Tính điểm trung bình
                final_grade = calculate_final_grade(grade_data, grade_config)
                
                # Kiểm tra xem đã có điểm chưa
                existing = db.table("grades").select("*").eq("student_id", student_db_id).eq("class_subject_id", import_data.class_subject_id).eq("academic_year", import_data.academic_year).eq("semester", import_data.semester).execute()
                
                if existing.data:
                    # Update
                    update_payload = {
                        "grade_data": grade_data,
                        "final_grade": final_grade,
                        "updated_at": datetime.now().isoformat()
                    }
                    db.table("grades").update(update_payload).eq("id", existing.data[0]["id"]).execute()
                else:
                    # Insert
                    insert_payload = {
                        "student_id": student_db_id,
                        "class_subject_id": import_data.class_subject_id,
                        "academic_year": import_data.academic_year,
                        "semester": import_data.semester,
                        "grade_data": grade_data,
                        "final_grade": final_grade,
                        "created_by": current_teacher["user_id"],
                        "created_at": datetime.now().isoformat(),
                        "updated_at": datetime.now().isoformat()
                    }
                    db.table("grades").insert(insert_payload).execute()
                
                success_count += 1
                
            except Exception as e:
                error_count += 1
                errors.append(f"Lỗi khi xử lý học sinh {grade_record.get('student_id', 'N/A')}: {str(e)}")
                logger.error(f"ERROR: Error processing grade for student {grade_record.get('student_id')}: {str(e)}")
        
        return ResponseModel(
            success=True,
            message=f"Nhập điểm thành công: {success_count} bản ghi, {error_count} lỗi",
            data={
                "success_count": success_count,
                "error_count": error_count,
                "errors": errors
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error in bulk import: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        ) 