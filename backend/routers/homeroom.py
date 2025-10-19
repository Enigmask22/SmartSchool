"""
API Router cho Homeroom Teachers (Giáo viên chủ nhiệm)
Các chức năng: Quản lý học sinh, điểm danh, face recognition của lớp chủ nhiệm
"""

from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status, Query
from pydantic import BaseModel

from database.connection import get_db
from routers.auth import get_current_user
from utils.logger import setup_logger

logger = setup_logger()
router = APIRouter()

# ===============================================
# PYDANTIC MODELS
# ===============================================

class HomeroomInfo(BaseModel):
    teacher_id: int
    teacher_code: str
    teacher_name: str
    teacher_email: str
    class_id: int
    class_name: str
    grade: str
    room_number: Optional[str]
    total_students: int
    academic_year: str
    is_subject_teacher: bool
    subject_count: int

class HomeroomStudent(BaseModel):
    student_id: int
    student_code: str
    student_name: str
    student_email: Optional[str]
    student_phone: Optional[str]
    date_of_birth: Optional[date]
    parent_name: Optional[str]
    parent_phone: Optional[str]
    profile_image: Optional[str]
    student_active: bool
    recognition_enabled: bool
    face_samples_count: int
    encoding_type: str

class AttendanceStats(BaseModel):
    total_students: int
    present_count: int
    absent_count: int
    late_count: int
    auto_checkin_count: int
    attendance_rate: float

class AttendanceRecord(BaseModel):
    student_id: int
    student_name: str
    student_code: str
    status: str
    check_in_time: Optional[datetime]
    check_out_time: Optional[datetime]
    method: str
    confidence_score: Optional[float]
    notes: Optional[str]

class ResponseModel(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

# ===============================================
# UTILITY FUNCTIONS
# ===============================================

def verify_homeroom_teacher(current_user: dict) -> bool:
    """Kiểm tra user có phải homeroom teacher không"""
    return current_user.get("role") in ["homeroom_teacher", "admin"]

async def get_homeroom_teacher_id(user_id: int, db) -> Optional[int]:
    """Lấy teacher_id từ user_id"""
    try:
        response = db.table("teachers").select("id").eq("user_id", user_id).execute()
        if response.data and len(response.data) > 0:
            teacher_data = response.data[0]
            if isinstance(teacher_data, dict) and "id" in teacher_data:
                return teacher_data["id"]
        return None
    except Exception as e:
        logger.error(f"ERROR: Error getting teacher_id for user_id {user_id}: {str(e)}")
        return None

# ===============================================
# HOMEROOM TEACHER INFO ENDPOINTS
# ===============================================

@router.get("/classes", response_model=dict)
async def get_homeroom_classes(
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Lấy danh sách lớp mà giáo viên chủ nhiệm quản lý"""
    try:
        if not verify_homeroom_teacher(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ giáo viên chủ nhiệm mới có quyền truy cập"
            )

        # Lấy teacher_id từ user_id
        teacher_id = await get_homeroom_teacher_id(current_user["id"], db)
        if not teacher_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thông tin giáo viên"
            )

        # Lấy danh sách lớp chủ nhiệm
        response = db.table("homeroom_teacher_classes").select(
            "classes(id, class_name, grade)"
        ).eq("teacher_id", teacher_id).execute()
        
        logger.info(f"Homeroom classes response for teacher_id {teacher_id}: {response.data}")
        
        classes = []
        if response.data:
            for item in response.data:
                logger.info(f"Processing item: {item}")
                try:
                    if isinstance(item, dict) and item.get("classes"):
                        classes_data = item["classes"]
                        if isinstance(classes_data, list):
                            # classes là array - xử lý từng item trong array
                            for class_info in classes_data:
                                if isinstance(class_info, dict):
                                    classes.append({
                                        "id": class_info.get("id"),
                                        "class_name": class_info.get("class_name"),
                                        "grade": class_info.get("grade")
                                    })
                        elif isinstance(classes_data, dict):
                            # classes là object - xử lý trực tiếp
                            classes.append({
                                "id": classes_data.get("id"),
                                "class_name": classes_data.get("class_name"),
                                "grade": classes_data.get("grade")
                            })
                    elif isinstance(item, dict) and "class_name" in item:
                        # Trường hợp dữ liệu flat (không nested)
                        classes.append({
                            "id": item.get("id"),
                            "class_name": item.get("class_name"),
                            "grade": item.get("grade")
                        })
                except Exception as e:
                    logger.error(f"ERROR: Error processing class item {item}: {str(e)}")
                    continue

        logger.info(f"Final classes to return: {classes}")
        
        return {
            "success": True,
            "message": "Lấy danh sách lớp chủ nhiệm thành công",
            "data": classes
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error getting homeroom classes: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

@router.get("/info", response_model=dict)
async def get_homeroom_info(
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Lấy thông tin lớp chủ nhiệm của giáo viên"""
    try:
        if not verify_homeroom_teacher(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ giáo viên chủ nhiệm mới có quyền truy cập"
            )

        # Sử dụng RPC function để lấy thông tin
        response = db.rpc("get_homeroom_teacher_info", {"p_user_id": current_user["id"]}).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thông tin lớp chủ nhiệm"
            )

        homeroom_info = response.data[0]
        
        return {
            "success": True,
            "message": "Lấy thông tin lớp chủ nhiệm thành công",
            "data": homeroom_info
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error getting homeroom info: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

# ===============================================
# STUDENT MANAGEMENT ENDPOINTS
# ===============================================

@router.get("/students", response_model=dict)
async def get_homeroom_students(
    class_name: Optional[str] = Query(default=None, description="Lớp cụ thể (chỉ lấy học sinh của lớp này)"),
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Lấy danh sách học sinh của lớp chủ nhiệm"""
    try:
        if not verify_homeroom_teacher(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ giáo viên chủ nhiệm mới có quyền truy cập"
            )

        # Lấy teacher_id từ user_id
        teacher_id = await get_homeroom_teacher_id(current_user["id"], db)
        if not teacher_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thông tin giáo viên"
            )

        # Lấy danh sách lớp mà giáo viên chủ nhiệm quản lý
        homeroom_classes_response = db.table("homeroom_teacher_classes").select(
            "classes(class_name, grade)"
        ).eq("teacher_id", teacher_id).execute()
        
        if not homeroom_classes_response.data:
            return {
                "success": True,
                "message": "Không có lớp chủ nhiệm nào",
                "data": []
            }
        
        # Lấy class_name từ response
        managed_classes = []
        for item in homeroom_classes_response.data:
            if item.get("classes"):
                classes_data = item["classes"]
                if isinstance(classes_data, list):
                    for class_info in classes_data:
                        if isinstance(class_info, dict):
                            managed_classes.append(class_info.get("class_name"))
                elif isinstance(classes_data, dict):
                    managed_classes.append(classes_data.get("class_name"))
        
        if not managed_classes:
            return {
                "success": True,
                "message": "Không có lớp chủ nhiệm nào",
                "data": []
            }
        
        # Query để lấy học sinh từ bảng students
        query = db.table("students").select("""
            id,
            student_id,
            full_name,
            email,
            phone,
            date_of_birth,
            parent_name,
            parent_phone,
            profile_image,
            is_active,
            class_name,
            grade,
            gender,
            insightface_encoding,
            face_samples_count,
            encoding_version,
            recognition_enabled,
            subject_selected
        """).in_("class_name", managed_classes)

        # Nếu có filter theo lớp cụ thể
        if class_name:
            query = query.eq("class_name", class_name)

        response = query.execute()
        
        # Xử lý dữ liệu trả về
        students = []
        if response.data:
            for student in response.data:
                students.append({
                    "id": student["id"],
                    "student_id": student["student_id"],
                    "full_name": student["full_name"],
                    "email": student["email"],
                    "phone": student["phone"],
                    "date_of_birth": student["date_of_birth"],
                    "parent_name": student["parent_name"],
                    "parent_phone": student["parent_phone"],
                    "profile_image": student["profile_image"],
                    "is_active": student["is_active"],
                    "class_name": student["class_name"],
                    "grade": student["grade"],
                    "gender": student["gender"],
                    "insightface_encoding": student["insightface_encoding"],
                    "face_samples_count": student["face_samples_count"],
                    "encoding_version": student["encoding_version"],
                    "recognition_enabled": student["recognition_enabled"],
                    "subject_selected": student["subject_selected"]
                })

        return {
            "success": True,
            "message": "Lấy danh sách học sinh thành công",
            "data": students
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error getting homeroom students: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

@router.put("/students/{student_id}/face-encoding", response_model=dict)
async def update_student_face_encoding(
    student_id: int,
    encoding_data: dict,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Cập nhật face encoding cho học sinh trong lớp chủ nhiệm"""
    try:
        if not verify_homeroom_teacher(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ giáo viên chủ nhiệm mới có quyền truy cập"
            )

        # Kiểm tra học sinh có thuộc lớp chủ nhiệm không
        homeroom_students = db.rpc("get_homeroom_students", {"p_user_id": current_user["id"]}).execute()
        student_ids = [s["student_id"] for s in homeroom_students.data or []]
        
        if student_id not in student_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Học sinh không thuộc lớp chủ nhiệm của bạn"
            )

        # Cập nhật encoding
        update_data = {
            "updated_at": datetime.now().isoformat(),
            "updated_by": current_user["id"]
        }
        
        if "insightface_encoding" in encoding_data:
            update_data["insightface_encoding"] = encoding_data["insightface_encoding"]
        if "face_samples_count" in encoding_data:
            update_data["face_samples_count"] = encoding_data["face_samples_count"]

        response = db.table("students").update(update_data).eq("id", student_id).execute()
        
        return {
            "success": True,
            "message": "Cập nhật face encoding thành công",
            "data": response.data[0] if response.data else None
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error updating face encoding: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

# ===============================================
# ATTENDANCE MANAGEMENT ENDPOINTS
# ===============================================

@router.get("/attendance/stats", response_model=dict)
async def get_homeroom_attendance_stats(
    target_date: Optional[date] = Query(default=None, description="Ngày cần xem thống kê (YYYY-MM-DD)"),
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Lấy thống kê điểm danh của lớp chủ nhiệm"""
    try:
        if not verify_homeroom_teacher(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ giáo viên chủ nhiệm mới có quyền truy cập"
            )

        if target_date is None:
            target_date = date.today()

        # Sử dụng RPC function để lấy thống kê
        response = db.rpc("get_homeroom_attendance_stats", {
            "p_user_id": current_user["id"],
            "p_date": target_date.isoformat()
        }).execute()
        
        stats = response.data[0] if response.data else {
            "total_students": 0,
            "present_count": 0,
            "absent_count": 0,
            "late_count": 0,
            "auto_checkin_count": 0,
            "attendance_rate": 0.0
        }

        return {
            "success": True,
            "message": "Lấy thống kê điểm danh thành công",
            "data": {
                "date": target_date.isoformat(),
                "stats": stats
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error getting attendance stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

@router.get("/attendance/records", response_model=dict)
async def get_homeroom_attendance_records(
    target_date: Optional[date] = Query(default=None, description="Ngày cần xem điểm danh (YYYY-MM-DD)"),
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Lấy chi tiết điểm danh của lớp chủ nhiệm"""
    try:
        if not verify_homeroom_teacher(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ giáo viên chủ nhiệm mới có quyền truy cập"
            )

        if target_date is None:
            target_date = date.today()

        # Lấy danh sách học sinh của lớp
        students_response = db.rpc("get_homeroom_students", {"p_user_id": current_user["id"]}).execute()
        students = students_response.data or []

        # Lấy attendance records cho ngày đó
        attendance_records = []
        for student in students:
            attendance_response = db.table("attendance").select("""
                *
            """).eq("student_id", student["student_id"]).eq("date", target_date.isoformat()).execute()
            
            attendance = attendance_response.data[0] if attendance_response.data else None
            
            record = {
                "student_id": student["student_id"],
                "student_name": student["student_name"],
                "student_code": student["student_code"],
                "status": attendance["status"] if attendance else "absent",
                "check_in_time": attendance["check_in_time"] if attendance else None,
                "check_out_time": attendance["check_out_time"] if attendance else None,
                "method": attendance["method"] if attendance else "manual",
                "confidence_score": attendance["confidence_score"] if attendance else None,
                "notes": attendance["notes"] if attendance else None
            }
            attendance_records.append(record)

        return {
            "success": True,
            "message": "Lấy chi tiết điểm danh thành công",
            "data": {
                "date": target_date.isoformat(),
                "records": attendance_records
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error getting attendance records: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )

@router.post("/attendance/manual", response_model=dict)
async def create_manual_attendance(
    student_id: int,
    status: str,  # present, absent, late, excused
    notes: Optional[str] = None,
    target_date: Optional[date] = None,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Tạo/cập nhật điểm danh thủ công cho học sinh"""
    try:
        if not verify_homeroom_teacher(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ giáo viên chủ nhiệm mới có quyền truy cập"
            )

        if target_date is None:
            target_date = date.today()

        # Kiểm tra học sinh có thuộc lớp chủ nhiệm không
        homeroom_students = db.rpc("get_homeroom_students", {"p_user_id": current_user["id"]}).execute()
        student_ids = [s["student_id"] for s in homeroom_students.data or []]
        
        if student_id not in student_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Học sinh không thuộc lớp chủ nhiệm của bạn"
            )

        # Kiểm tra status hợp lệ
        valid_statuses = ["present", "absent", "late", "excused"]
        if status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Status không hợp lệ. Phải là một trong: {valid_statuses}"
            )

        # Kiểm tra xem đã có attendance record chưa
        existing = db.table("attendance").select("id").eq("student_id", student_id).eq("date", target_date.isoformat()).execute()
        
        attendance_data = {
            "status": status,
            "method": "manual",
            "notes": notes,
            "created_by": current_user["id"],
            "updated_at": datetime.now().isoformat()
        }

        if existing.data:
            # Update existing record
            response = db.table("attendance").update(attendance_data).eq("id", existing.data[0]["id"]).execute()
            message = "Cập nhật điểm danh thành công"
        else:
            # Create new record
            attendance_data.update({
                "student_id": student_id,
                "date": target_date.isoformat(),
                "created_at": datetime.now().isoformat()
            })
            response = db.table("attendance").insert(attendance_data).execute()
            message = "Tạo điểm danh thành công"

        return {
            "success": True,
            "message": message,
            "data": response.data[0] if response.data else None
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error creating manual attendance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi server: {str(e)}"
        )
