"""
API Router cho Homeroom Teachers
"""

from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query
from homeroom.models import ResponseModel
from core.database import get_db
from core.logger import setup_logger
from auth.api import get_current_user

logger = setup_logger("homeroom_api")
router = APIRouter()

@router.get("/default-academic-year")
async def get_default_academic_year(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Trả về năm học mặc định từ bảng system_settings cho GV chủ nhiệm."""
    try:
        resp = (
            db.table("system_settings")
            .select("setting_value")
            .eq("setting_key", "academic_year")
            .limit(1)
            .execute()
        )
        return {
            "success": True,
            "data": resp.data[0]["setting_value"] if resp.data else None,
        }
    except Exception as e:
        logger.error(f"Error getting default academic year: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/academic-years")
async def get_homeroom_academic_years(
    current_user=Depends(get_current_user), db=Depends(get_db)
):
    """Danh sách năm học mà GV có dữ liệu trên homeroom_students_history."""
    try:
        teacher = (
            db.table("teachers").select("id").eq("user_id", current_user["id"]).execute()
        )
        if not teacher.data:
            return {"success": True, "data": []}
        teacher_id = teacher.data[0]["id"]

        hsh = (
            db.table("homeroom_students_history").select("class_id").eq("teacher_id", teacher_id).execute()
        )
        class_ids: List[int] = sorted(
            list({row.get("class_id") for row in (hsh.data or []) if row.get("class_id") is not None})
        )
        if not class_ids:
            return {"success": True, "data": []}

        classes_resp = db.table("classes").select("academic_year").in_("id", class_ids).execute()
        years = sorted(
            list({row.get("academic_year") for row in (classes_resp.data or []) if row.get("academic_year")}))
        return {"success": True, "data": years}
    except Exception as e:
        logger.error(f"Error getting academic years: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.get("/classes")
async def get_homeroom_classes(
    academic_year: Optional[str] = Query(default=None),
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Lấy danh sách lớp GV chủ nhiệm, lọc theo năm học từ homeroom_students_history"""
    try:
        # Lấy teacher_id từ user_id
        teacher_response = db.table("teachers").select("id").eq("user_id", current_user["id"]).execute()
        
        if not teacher_response.data:
            return {
                "success": True,
                "message": "Không tìm thấy thông tin giáo viên",
                "data": []
            }
        
        teacher_id = teacher_response.data[0]["id"]

        # Lấy class_id từ lịch sử theo giáo viên
        hsh_resp = (
            db.table("homeroom_students_history").select("class_id").eq("teacher_id", teacher_id).execute()
        )
        class_ids = list({row.get("class_id") for row in (hsh_resp.data or []) if row.get("class_id") is not None})
        if not class_ids:
            return {"success": True, "message": "Không có lớp chủ nhiệm nào", "data": []}

        classes_q = db.table("classes").select("id, class_name, grade, academic_year").in_("id", class_ids)
        if academic_year:
            classes_q = classes_q.eq("academic_year", academic_year)
        response = classes_q.order("class_name").execute()

        classes = [
            {
                "id": item.get("id"),
                "class_name": item.get("class_name"),
                "grade": item.get("grade"),
                "academic_year": item.get("academic_year"),
            }
            for item in (response.data or [])
        ]

        return {
            "success": True,
            "message": "Lấy danh sách lớp chủ nhiệm thành công",
            "data": classes
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting homeroom classes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.get("/students")
async def get_homeroom_students(
    class_name: Optional[str] = Query(default=None, description="Tên lớp (tương thích cũ)"),
    class_id: Optional[int] = Query(default=None, description="ID lớp để lọc chính xác"),
    academic_year: Optional[str] = Query(default=None, description="Năm học để phân giải class_name nếu cần"),
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Lấy danh sách học sinh của lớp chủ nhiệm (theo homeroom_students_history)"""
    try:
        # Lấy teacher_id từ user_id
        teacher_response = db.table("teachers").select("id").eq("user_id", current_user["id"]).execute()
        
        if not teacher_response.data:
            raise HTTPException(
                status_code=404,
                detail="Không tìm thấy thông tin giáo viên"
            )

        teacher_id = teacher_response.data[0]["id"]

        # Xác định class_id nếu truyền class_name
        target_class_id: Optional[int] = class_id
        if not target_class_id and class_name:
            q = db.table("classes").select("id").eq("class_name", class_name)
            if academic_year:
                q = q.eq("academic_year", academic_year)
            cls = q.limit(1).execute()
            if cls.data:
                target_class_id = cls.data[0]["id"]

        # Lấy danh sách học sinh từ bảng lịch sử theo teacher và (tùy chọn) class
        hsh_q = db.table("homeroom_students_history").select("student_id, class_id").eq("teacher_id", teacher_id)
        if target_class_id:
            hsh_q = hsh_q.eq("class_id", target_class_id)
        hsh = hsh_q.execute()
        student_ids = [r["student_id"] for r in (hsh.data or []) if r.get("student_id") is not None]

        if not student_ids:
            return {"success": True, "message": "Không có học sinh", "data": []}

        response = (
            db.table("students")
            .select(
                """
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
            """
            )
            .in_("id", student_ids)
            .execute()
        )
        
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
        logger.error(f"Error getting homeroom students: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")


@router.get("/info")
async def get_homeroom_info(
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Lấy thông tin lớp chủ nhiệm của giáo viên"""
    try:
        # Sử dụng RPC function để lấy thông tin
        response = db.rpc("get_homeroom_teacher_info", {"p_user_id": current_user["id"]}).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy thông tin lớp chủ nhiệm")

        homeroom_info = response.data[0]
        
        return {
            "success": True,
            "message": "Lấy thông tin lớp chủ nhiệm thành công",
            "data": homeroom_info
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting homeroom info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")


@router.put("/students/{student_id}/face-encoding")
async def update_student_face_encoding(
    student_id: int,
    encoding_data: dict,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Cập nhật face encoding cho học sinh trong lớp chủ nhiệm"""
    try:
        # Kiểm tra học sinh có thuộc lớp chủ nhiệm không
        homeroom_students = db.rpc("get_homeroom_students", {"p_user_id": current_user["id"]}).execute()
        student_ids = [s["student_id"] for s in homeroom_students.data or []]
        
        if student_id not in student_ids:
            raise HTTPException(status_code=403, detail="Học sinh không thuộc lớp chủ nhiệm của bạn")

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
        logger.error(f"Error updating face encoding: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")


@router.get("/attendance/stats")
async def get_homeroom_attendance_stats(
    target_date: Optional[date] = Query(default=None, description="Ngày cần xem thống kê (YYYY-MM-DD)"),
    class_name: Optional[str] = Query(default=None, description="Tên lớp (tương thích cũ)"),
    class_id: Optional[int] = Query(default=None, description="ID lớp để lọc chính xác"),
    academic_year: Optional[str] = Query(default=None, description="Năm học để phân giải class_name nếu cần"),
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Lấy thống kê điểm danh của lớp chủ nhiệm"""
    try:
        if target_date is None:
            target_date = date.today()

        # Nếu có chỉ định lớp, tính theo danh sách học sinh từ lịch sử
        resolved_class_id = class_id
        if not resolved_class_id and class_name:
            c_q = db.from_("classes").select("id").eq("class_name", class_name)
            if academic_year:
                c_q = c_q.eq("academic_year", academic_year)
            class_response = c_q.execute()
            if class_response.data:
                resolved_class_id = class_response.data[0]["id"]

        if resolved_class_id:
            hsh_resp = db.from_("homeroom_students_history").select("student_id").eq("class_id", resolved_class_id).execute()
            student_ids = [r["student_id"] for r in (hsh_resp.data or [])]

            total_students = len(set(student_ids))

            attendance_response = db.from_("attendance")\
                .select("status")\
                .eq("date", target_date.isoformat())\
                .in_("student_id", student_ids if student_ids else [])\
                .execute()
            
            # Tính toán thống kê
            present_count = sum(1 for a in attendance_response.data if a["status"] == "present")
            absent_count = sum(1 for a in attendance_response.data if a["status"] == "absent")
            late_count = sum(1 for a in attendance_response.data if a["status"] == "late")
            auto_checkin_count = 0  # TODO: Add auto_checkin logic if needed
            
            attendance_rate = (present_count / total_students * 100) if total_students > 0 else 0.0
            
            stats = {
                "total_students": total_students,
                "present_count": present_count,
                "absent_count": absent_count,
                "late_count": late_count,
                "auto_checkin_count": auto_checkin_count,
                "attendance_rate": round(attendance_rate, 2)
            }
        else:
            # Không có class_name, dùng RPC function (trả về tổng hợp tất cả lớp)
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
        logger.error(f"Error getting attendance stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")


@router.get("/attendance/records")
async def get_homeroom_attendance_records(
    target_date: Optional[date] = Query(default=None, description="Ngày cần xem điểm danh (YYYY-MM-DD)"),
    class_id: Optional[int] = Query(default=None, description="ID lớp để lọc chính xác"),
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Lấy chi tiết điểm danh của lớp chủ nhiệm"""
    try:
        if target_date is None:
            target_date = date.today()

        # Lấy danh sách học sinh theo lịch sử
        if class_id:
            hsh_resp = db.table("homeroom_students_history").select("student_id").eq("class_id", class_id).execute()
        else:
            teacher_resp = db.table("teachers").select("id").eq("user_id", current_user["id"]).execute()
            teacher_id = teacher_resp.data[0]["id"] if teacher_resp.data else None
            hsh_resp = db.table("homeroom_students_history").select("student_id").eq("teacher_id", teacher_id).execute()
        students = hsh_resp.data or []

        # Lấy thông tin chi tiết học sinh để hiển thị đầy đủ cột trong bảng
        student_ids = [row["student_id"] for row in students]
        details_map = {}
        ordered_ids: List[int] = []
        if student_ids:
            details_resp = (
                db.table("students")
                .select("id, student_id, full_name, class_name, grade")
                .in_("id", student_ids)
                .execute()
            )
            for s in (details_resp.data or []):
                details_map[s["id"]] = s
            # Sắp xếp ID theo mã HS tăng dần (ưu tiên số, fallback chuỗi)
            def sort_key(student_id: int):
                info = details_map.get(student_id, {})
                code = info.get("student_id")
                try:
                    return (0, int(code)) if code is not None else (1, 0)
                except Exception:
                    return (1, str(code) if code is not None else "")
            ordered_ids = sorted(student_ids, key=sort_key)
        else:
            ordered_ids = []

        # Lấy attendance theo batch thay vì query từng học sinh
        attendance_map = {}
        if student_ids:
            att_resp = (
                db.table("attendance")
                .select("*")
                .eq("date", target_date.isoformat())
                .in_("student_id", student_ids)
                .execute()
            )
            for a in (att_resp.data or []):
                attendance_map[a["student_id"]] = a

        # Lấy attendance records cho ngày đó
        attendance_records = []
        for sid in ordered_ids:
            attendance = attendance_map.get(sid)
            info = details_map.get(sid, {})
            
            record = {
                "student_id": sid,
                "student_name": info.get("full_name", "Không xác định"),
                "student_code": info.get("student_id", "N/A"),
                "class_name": info.get("class_name", "N/A"),
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
        logger.error(f"Error getting attendance records: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")


@router.post("/attendance/manual")
async def create_manual_attendance(
    student_id: int,
    status: str,
    notes: Optional[str] = None,
    target_date: Optional[date] = None,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Tạo/cập nhật điểm danh thủ công cho học sinh"""
    try:
        if target_date is None:
            target_date = date.today()

        # Kiểm tra học sinh có thuộc lớp chủ nhiệm không
        homeroom_students = db.rpc("get_homeroom_students", {"p_user_id": current_user["id"]}).execute()
        student_ids = [s["student_id"] for s in homeroom_students.data or []]
        
        if student_id not in student_ids:
            raise HTTPException(status_code=403, detail="Học sinh không thuộc lớp chủ nhiệm của bạn")

        # Kiểm tra status hợp lệ
        valid_statuses = ["present", "absent", "late", "excused"]
        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Status không hợp lệ. Phải là một trong: {valid_statuses}")

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
        logger.error(f"Error creating manual attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")


@router.get("/dashboard/data")
async def get_homeroom_dashboard_data(
    target_date: Optional[date] = Query(default=None, description="Ngày cần xem (YYYY-MM-DD)"),
    class_name: Optional[str] = Query(default=None, description="Tên lớp (tương thích cũ)"),
    class_id: Optional[int] = Query(default=None, description="ID lớp để lọc chính xác"),
    academic_year: Optional[str] = Query(default=None, description="Năm học để phân giải class_name nếu cần"),
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """API tổng hợp cho Dashboard chủ nhiệm: trả về students + status trong ngày và stats."""
    try:
        if target_date is None:
            target_date = date.today()

        # Resolve class_id
        resolved_class_id = class_id
        if not resolved_class_id and class_name:
            c_q = db.from_("classes").select("id").eq("class_name", class_name)
            if academic_year:
                c_q = c_q.eq("academic_year", academic_year)
            class_response = c_q.execute()
            if class_response.data:
                resolved_class_id = class_response.data[0]["id"]

        # Get students of the class from history
        if resolved_class_id:
            hsh_resp = db.table("homeroom_students_history").select("student_id").eq("class_id", resolved_class_id).execute()
        else:
            teacher_resp = db.table("teachers").select("id").eq("user_id", current_user["id"]).execute()
            teacher_id = teacher_resp.data[0]["id"] if teacher_resp.data else None
            hsh_resp = db.table("homeroom_students_history").select("student_id").eq("teacher_id", teacher_id).execute()

        student_ids = [r["student_id"] for r in (hsh_resp.data or [])]
        if not student_ids:
            return {
                "success": True,
                "data": {
                    "date": target_date.isoformat(),
                    "students": [],
                    "stats": {
                        "total_students": 0,
                        "present_count": 0,
                        "absent_count": 0,
                        "late_count": 0,
                        "attendance_rate": 0.0,
                    },
                },
            }

        # Fetch student details
        students_resp = (
            db.table("students")
            .select("id, student_id, full_name, class_name, grade")
            .in_("id", student_ids)
            .execute()
        )
        details_map = {s["id"]: s for s in (students_resp.data or [])}

        # Fetch attendance for the day in batch
        att_resp = (
            db.table("attendance")
            .select("student_id, status, check_in_time, check_out_time, method, confidence_score, notes")
            .eq("date", target_date.isoformat())
            .in_("student_id", student_ids)
            .execute()
        )
        att_map = {a["student_id"]: a for a in (att_resp.data or [])}

        # Build rows and stats
        present = late = 0
        rows = []
        # sort by student code asc
        def sort_key(sid: int):
            info = details_map.get(sid, {})
            code = info.get("student_id")
            try:
                return (0, int(code)) if code is not None else (1, 0)
            except Exception:
                return (1, str(code) if code is not None else "")

        for sid in sorted(student_ids, key=sort_key):
            info = details_map.get(sid, {})
            att = att_map.get(sid)
            status = att["status"] if att else "absent"
            if status == "present":
                present += 1
            elif status == "late":
                late += 1

            rows.append(
                {
                    "student_id": sid,
                    "student_code": info.get("student_id", "N/A"),
                    "student_name": info.get("full_name", "Không xác định"),
                    "class_name": info.get("class_name", "N/A"),
                    "status": status,
                    "check_in_time": att.get("check_in_time") if att else None,
                    "check_out_time": att.get("check_out_time") if att else None,
                    "method": att.get("method") if att else "manual",
                    "confidence_score": att.get("confidence_score") if att else None,
                    "notes": att.get("notes") if att else None,
                }
            )

        total = len(set(student_ids))
        absent = total - present - late
        rate = round((present / total * 100) if total else 0.0, 2)

        return {
            "success": True,
            "data": {
                "date": target_date.isoformat(),
                "students": rows,
                "stats": {
                    "total_students": total,
                    "present_count": present,
                    "absent_count": absent,
                    "late_count": late,
                    "attendance_rate": rate,
                },
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting dashboard data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")
