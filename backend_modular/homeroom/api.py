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

@router.get("/bootstrap")
async def homeroom_bootstrap(
    academic_year: Optional[str] = Query(default=None),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Gộp các dữ liệu khởi tạo: academic_years, default_year, classes theo năm, 
    auto-chọn lớp đầu tiên và trả về luôn danh sách học sinh của lớp đó.

    Mục tiêu: 1 lần gọi API thay cho 4-6 lần gọi rời rạc ở FE.
    """
    try:
        # Teacher id
        teacher_resp = (
            db.table("teachers").select("id").eq("user_id", current_user["id"]).execute()
        )
        teacher_id = teacher_resp.data[0]["id"] if teacher_resp.data else None
        if not teacher_id:
            return {"success": True, "data": {
                "academic_years": [],
                "default_year": None,
                "classes": [],
                "selected_class": None,
                "students": []
            }}

        # Years GV có lớp
        hsh = db.table("homeroom_students_history").select("class_id").eq("teacher_id", teacher_id).execute()
        class_ids = list({r.get("class_id") for r in (hsh.data or []) if r.get("class_id") is not None})
        years: List[str] = []
        if class_ids:
            cls = db.table("classes").select("academic_year").in_("id", class_ids).execute()
            years = sorted(list({c.get("academic_year") for c in (cls.data or []) if c.get("academic_year")}))

        # Default year nếu chưa chọn
        default_year_resp = (
            db.table("system_settings").select("setting_value").eq("setting_key", "academic_year").limit(1).execute()
        )
        default_year = default_year_resp.data[0]["setting_value"] if default_year_resp.data else None
        year = academic_year or default_year or (years[0] if years else None)

        # Lớp theo năm học
        classes = []
        selected_class_name = None
        selected_class_id = None
        if class_ids:
            q = db.table("classes").select("id, class_name, grade, academic_year").in_("id", class_ids)
            if year:
                q = q.eq("academic_year", year)
            cls2 = q.order("class_name").execute()
            classes = [
                {"id": r.get("id"), "class_name": r.get("class_name"), "grade": r.get("grade"), "academic_year": r.get("academic_year")}
                for r in (cls2.data or [])
            ]
            if classes:
                selected_class_id = classes[0]["id"]
                selected_class_name = classes[0]["class_name"]

        # Học sinh của lớp được chọn
        students = []
        if selected_class_id:
            hsh2 = db.table("homeroom_students_history").select("student_id").eq("class_id", selected_class_id).execute()
            sids = [r["student_id"] for r in (hsh2.data or []) if r.get("student_id") is not None]
            if sids:
                sresp = db.table("students").select("id, student_id, full_name, email, phone, class_name, grade, is_active").in_("id", sids).execute()
                students = sresp.data or []

        return {
            "success": True,
            "data": {
                "academic_years": years,
                "default_year": default_year,
                "year": year,
                "classes": classes,
                "selected_class": {"id": selected_class_id, "class_name": selected_class_name} if selected_class_id else None,
                "students": students,
            },
        }
    except Exception as e:
        logger.error(f"Error bootstrap homeroom: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/attendance/bootstrap")
async def homeroom_attendance_bootstrap(
    target_date: Optional[date] = Query(default=None),
    academic_year: Optional[str] = Query(default=None),
    class_name: Optional[str] = Query(default=None),
    class_id: Optional[int] = Query(default=None),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Bootstrap chuyên cho màn Điểm danh lớp: trả về năm học, lớp (lọc theo năm),
    lớp được chọn, cùng bảng điểm danh và thống kê cho ngày target_date.
    """
    try:
        if target_date is None:
            target_date = date.today()

        # Teacher id
        teacher_resp = db.table("teachers").select("id").eq("user_id", current_user["id"]).execute()
        teacher_id = teacher_resp.data[0]["id"] if teacher_resp.data else None
        if not teacher_id:
            return {"success": True, "data": {"academic_years": [], "classes": [], "selected_class": None, "records": [], "stats": {"total_students": 0, "present_count": 0, "absent_count": 0, "late_count": 0}}}

        # Years by teacher
        hsh = db.table("homeroom_students_history").select("class_id").eq("teacher_id", teacher_id).execute()
        class_ids = list({r.get("class_id") for r in (hsh.data or []) if r.get("class_id") is not None})
        years: List[str] = []
        if class_ids:
            cls = db.table("classes").select("academic_year").in_("id", class_ids).execute()
            years = sorted(list({c.get("academic_year") for c in (cls.data or []) if c.get("academic_year")}))

        default_year_resp = db.table("system_settings").select("setting_value").eq("setting_key", "academic_year").limit(1).execute()
        default_year = default_year_resp.data[0]["setting_value"] if default_year_resp.data else None
        year = academic_year or default_year or (years[0] if years else None)

        # Classes list filtered by year
        classes = []
        if class_ids:
            q = db.table("classes").select("id, class_name, grade, academic_year").in_("id", class_ids)
            if year:
                q = q.eq("academic_year", year)
            c2 = q.order("class_name").execute()
            classes = c2.data or []

        # resolve selected class
        resolved_class_id = class_id
        resolved_class_name = None
        if not resolved_class_id and class_name:
            # find by name in filtered classes
            for c in classes:
                if c.get("class_name") == class_name:
                    resolved_class_id = c.get("id")
                    break
        if not resolved_class_id and classes:
            resolved_class_id = classes[0].get("id")
        if resolved_class_id:
            for c in classes:
                if c.get("id") == resolved_class_id:
                    resolved_class_name = c.get("class_name")
                    break

        # Collect records and stats for the resolved class
        records: List[dict] = []
        stats = {"total_students": 0, "present_count": 0, "absent_count": 0, "late_count": 0}
        if resolved_class_id:
            h2 = db.table("homeroom_students_history").select("student_id").eq("class_id", resolved_class_id).execute()
            student_ids = [r["student_id"] for r in (h2.data or []) if r.get("student_id") is not None]
            stats["total_students"] = len(set(student_ids))
            if student_ids:
                # students map
                sresp = db.table("students").select("id, student_id, full_name, class_name").in_("id", student_ids).execute()
                smap = {s["id"]: s for s in (sresp.data or [])}
                # attendance map
                att = db.table("attendance").select("student_id, status, check_in_time, check_out_time, method, confidence_score, notes").eq("date", target_date.isoformat()).in_("student_id", student_ids).execute()
                amap = {a["student_id"]: a for a in (att.data or [])}
                present = late = 0
                for sid in student_ids:
                    info = smap.get(sid, {})
                    a = amap.get(sid)
                    status = a["status"] if a else "absent"
                    if status == "present":
                        present += 1
                    elif status == "late":
                        late += 1
                    records.append({
                        "student_id": sid,
                        "students": {
                            "student_id": info.get("student_id"),
                            "full_name": info.get("full_name"),
                            "class_name": info.get("class_name"),
                        },
                        "status": status,
                        "check_in_time": a.get("check_in_time") if a else None,
                        "check_out_time": a.get("check_out_time") if a else None,
                        "confidence_score": a.get("confidence_score") if a else None,
                        "notes": a.get("notes") if a else None,
                    })
                stats["present_count"] = present
                stats["late_count"] = late
                stats["absent_count"] = max(stats["total_students"] - present - late, 0)

        return {"success": True, "data": {
            "academic_years": years,
            "default_year": default_year,
            "year": year,
            "classes": classes,
            "selected_class": {"id": resolved_class_id, "class_name": resolved_class_name} if resolved_class_id else None,
            "date": target_date.isoformat(),
            "records": records,
            "stats": stats,
        }}
    except Exception as e:
        logger.error(f"Error attendance bootstrap: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/face/bootstrap")
async def homeroom_face_bootstrap(
    academic_year: Optional[str] = Query(default=None),
    class_name: Optional[str] = Query(default=None),
    class_id: Optional[int] = Query(default=None),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Bootstrap cho màn Quản lý khuôn mặt.

    Trả về: academic_years, year, classes (lọc theo năm), selected_class, students list
    (các trường tối thiểu phục vụ UI khuôn mặt).
    """
    try:
        # Teacher id
        teacher_resp = db.table("teachers").select("id").eq("user_id", current_user["id"]).execute()
        teacher_id = teacher_resp.data[0]["id"] if teacher_resp.data else None
        if not teacher_id:
            return {"success": True, "data": {"academic_years": [], "classes": [], "selected_class": None, "students": []}}

        # Years list of teacher
        hsh = db.table("homeroom_students_history").select("class_id").eq("teacher_id", teacher_id).execute()
        class_ids = list({r.get("class_id") for r in (hsh.data or []) if r.get("class_id") is not None})
        years: List[str] = []
        if class_ids:
            cls_years = db.table("classes").select("academic_year").in_("id", class_ids).execute()
            years = sorted(list({c.get("academic_year") for c in (cls_years.data or []) if c.get("academic_year")}))

        default_year_resp = db.table("system_settings").select("setting_value").eq("setting_key", "academic_year").limit(1).execute()
        default_year = default_year_resp.data[0]["setting_value"] if default_year_resp.data else None
        year = academic_year or default_year or (years[0] if years else None)

        # Classes by year
        classes = []
        if class_ids:
            q = db.table("classes").select("id, class_name, grade, academic_year").in_("id", class_ids)
            if year:
                q = q.eq("academic_year", year)
            c2 = q.order("class_name").execute()
            classes = c2.data or []

        # resolve selected class
        resolved_class_id = class_id
        resolved_class_name = None
        if not resolved_class_id and class_name:
            for c in classes:
                if c.get("class_name") == class_name:
                    resolved_class_id = c.get("id")
                    break
        if not resolved_class_id and classes:
            resolved_class_id = classes[0].get("id")
        if resolved_class_id:
            for c in classes:
                if c.get("id") == resolved_class_id:
                    resolved_class_name = c.get("class_name")
                    break

        # Students list for face management
        students = []
        if resolved_class_id:
            h2 = db.table("homeroom_students_history").select("student_id").eq("class_id", resolved_class_id).execute()
            sids = [r["student_id"] for r in (h2.data or []) if r.get("student_id") is not None]
            if sids:
                sresp = (
                    db.table("students")
                    .select("id, student_id, full_name, email, phone, class_name, grade, is_active, insightface_encoding, face_samples_count, recognition_enabled, encoding_version")
                    .in_("id", sids)
                    .execute()
                )
                # sort by student_code asc
                def sort_key(s):
                    try:
                        return (0, int(s.get("student_id")))
                    except Exception:
                        return (1, str(s.get("student_id")))
                students = sorted((sresp.data or []), key=sort_key)

        return {"success": True, "data": {
            "academic_years": years,
            "default_year": default_year,
            "year": year,
            "classes": classes,
            "selected_class": {"id": resolved_class_id, "class_name": resolved_class_name} if resolved_class_id else None,
            "students": students,
        }}
    except Exception as e:
        logger.error(f"Error face bootstrap: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

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


@router.get("/dashboard/monthly")
async def get_homeroom_dashboard_monthly(
    class_name: Optional[str] = Query(default=None, description="Tên lớp (tương thích cũ)"),
    class_id: Optional[int] = Query(default=None, description="ID lớp để lọc chính xác"),
    year: int = Query(..., description="Năm, ví dụ 2025"),
    month: int = Query(..., description="Tháng 1-12"),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Tổng hợp vắng/muộn/sớm theo tháng cho lớp chủ nhiệm.

    Truy vấn duy nhất attendance theo (student_ids, month range), aggregate ở backend (một lớp ~50 HS ⇒ đủ nhanh).
    """
    try:
        # Resolve class_id
        resolved_class_id = class_id
        if not resolved_class_id and class_name:
            c_q = db.table("classes").select("id").eq("class_name", class_name)
            c_resp = c_q.limit(1).execute()
            if c_resp.data:
                resolved_class_id = c_resp.data[0]["id"]

        # Get student list from history (hiển thị theo danh sách hiện tại)
        if not resolved_class_id:
            # Fallback: theo user → lấy lớp chủ nhiệm đầu tiên
            info = db.rpc("get_homeroom_teacher_info", {"p_user_id": current_user["id"]}).execute()
            if not info.data:
                return {"success": True, "data": {"students": [], "top_absent": [], "top_late": []}}
            resolved_class_id = info.data[0].get("class_id") or None

        hsh = (
            db.table("homeroom_students_history")
            .select("student_id")
            .eq("class_id", resolved_class_id)
            .execute()
        )
        student_ids = [r["student_id"] for r in (hsh.data or []) if r.get("student_id") is not None]
        if not student_ids:
            return {"success": True, "data": {"students": [], "top_absent": [], "top_late": []}}

        # Fetch attendance for the whole month in one query
        from datetime import date, timedelta
        start_date = date(year, month, 1)
        if month == 12:
            next_month = date(year + 1, 1, 1)
        else:
            next_month = date(year, month + 1, 1)

        att = (
            db.table("attendance")
            .select("student_id, status")
            .in_("student_id", student_ids)
            .gte("date", start_date.isoformat())
            .lt("date", next_month.isoformat())
            .execute()
        )
        # Aggregate counts per student
        counters = {sid: {"absent": 0, "late": 0, "early": 0} for sid in student_ids}
        for row in (att.data or []):
            sid = row.get("student_id")
            status = row.get("status")
            if sid in counters:
                if status == "absent":
                    counters[sid]["absent"] += 1
                elif status == "late":
                    counters[sid]["late"] += 1
                elif status == "early":
                    counters[sid]["early"] += 1

        # Join students info
        students_resp = db.table("students").select("id, student_id, full_name, class_name").in_("id", student_ids).execute()
        result_rows = []
        for s in (students_resp.data or []):
            c = counters.get(s["id"], {"absent": 0, "late": 0, "early": 0})
            result_rows.append({
                "student_id": s["id"],
                "student_code": s.get("student_id"),
                "student_name": s.get("full_name"),
                "class_name": s.get("class_name"),
                "absent_count": c["absent"],
                "late_count": c["late"],
                "early_count": c["early"],
            })

        # Top lists
        top_absent = sorted(result_rows, key=lambda x: x["absent_count"], reverse=True)[:10]
        top_late = sorted(result_rows, key=lambda x: x["late_count"], reverse=True)[:10]

        return {
            "success": True,
            "data": {
                "year": year,
                "month": month,
                "students": result_rows,
                "top_absent": top_absent,
                "top_late": top_late,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error get monthly dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/dashboard/bootstrap")
async def homeroom_dashboard_bootstrap(
    academic_year: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    month: Optional[int] = Query(default=None),
    class_name: Optional[str] = Query(default=None),
    class_id: Optional[int] = Query(default=None),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Bootstrap tổng hợp cho Dashboard chủ nhiệm: trả về năm học, lớp, lớp chọn,
    thông tin lớp, dữ liệu monthly (students + top lists) trong một lần gọi.
    """
    try:
        # defaults for month/year
        from datetime import date
        today = date.today()
        y = year or today.year
        m = month or today.month

        # teacher id
        t_resp = db.table("teachers").select("id").eq("user_id", current_user["id"]).execute()
        teacher_id = t_resp.data[0]["id"] if t_resp.data else None
        if not teacher_id:
            return {"success": True, "data": {"academic_years": [], "classes": [], "selected_class": None, "students": [], "top_absent": [], "top_late": [], "homeroom_info": None}}

        # academic years list
        h = db.table("homeroom_students_history").select("class_id").eq("teacher_id", teacher_id).execute()
        class_ids = list({r.get("class_id") for r in (h.data or []) if r.get("class_id") is not None})
        years: List[str] = []
        if class_ids:
            yrs = db.table("classes").select("academic_year").in_("id", class_ids).execute()
            years = sorted(list({c.get("academic_year") for c in (yrs.data or []) if c.get("academic_year")}))
        def_year_resp = db.table("system_settings").select("setting_value").eq("setting_key", "academic_year").limit(1).execute()
        def_year = def_year_resp.data[0]["setting_value"] if def_year_resp.data else None
        ay = academic_year or def_year or (years[0] if years else None)

        # classes in academic year
        classes = []
        if class_ids:
            q = db.table("classes").select("id, class_name, grade, academic_year").in_("id", class_ids)
            if ay:
                q = q.eq("academic_year", ay)
            c = q.order("class_name").execute()
            classes = c.data or []

        # resolve selected class
        sel_id = class_id
        sel_name = None
        if not sel_id and class_name:
            for c in classes:
                if c.get("class_name") == class_name:
                    sel_id = c.get("id")
                    break
        if not sel_id and classes:
            sel_id = classes[0].get("id")
        if sel_id:
            for c in classes:
                if c.get("id") == sel_id:
                    sel_name = c.get("class_name")
                    break

        # homeroom info via RPC (nếu có)
        info = db.rpc("get_homeroom_teacher_info", {"p_user_id": current_user["id"]}).execute()
        homeroom_info = info.data[0] if info.data else None

        # monthly data using existing function logic
        top_absent = []
        top_late = []
        students_rows = []
        if sel_id:
            # reuse monthly endpoint logic
            hsh = db.table("homeroom_students_history").select("student_id").eq("class_id", sel_id).execute()
            student_ids = [r["student_id"] for r in (hsh.data or []) if r.get("student_id") is not None]
            if student_ids:
                from datetime import date
                start_date = date(y, m, 1)
                next_month = date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)
                att = db.table("attendance").select("student_id, status").in_("student_id", student_ids).gte("date", start_date.isoformat()).lt("date", next_month.isoformat()).execute()
                counters = {sid: {"absent": 0, "late": 0, "early": 0} for sid in student_ids}
                for row in (att.data or []):
                    sid = row.get("student_id")
                    st = row.get("status")
                    if sid in counters:
                        if st == "absent": counters[sid]["absent"] += 1
                        elif st == "late": counters[sid]["late"] += 1
                        elif st == "early": counters[sid]["early"] += 1
                sresp = db.table("students").select("id, student_id, full_name, class_name").in_("id", student_ids).execute()
                for s in (sresp.data or []):
                    c = counters.get(s["id"], {"absent": 0, "late": 0, "early": 0})
                    students_rows.append({
                        "student_id": s["id"],
                        "student_code": s.get("student_id"),
                        "student_name": s.get("full_name"),
                        "class_name": s.get("class_name"),
                        "absent_count": c["absent"],
                        "late_count": c["late"],
                        "early_count": c["early"],
                    })
                top_absent = sorted(students_rows, key=lambda x: x["absent_count"], reverse=True)[:10]
                top_late = sorted(students_rows, key=lambda x: x["late_count"], reverse=True)[:10]

        return {"success": True, "data": {
            "academic_years": years,
            "year": y,
            "month": m,
            "default_year": def_year,
            "classes": classes,
            "selected_class": {"id": sel_id, "class_name": sel_name} if sel_id else None,
            "students": students_rows,
            "top_absent": top_absent,
            "top_late": top_late,
            "homeroom_info": homeroom_info,
        }}
    except Exception as e:
        logger.error(f"Error dashboard bootstrap: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")
