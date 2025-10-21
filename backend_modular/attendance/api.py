"""
API Router cho Attendance management
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, date

from attendance.models import AttendanceCreate, AttendanceUpdate, AttendanceStats, ResponseModel, ListResponse
from attendance.services import get_vietnam_time_string, get_vietnam_date_string
from core.database import get_db
from core.logger import setup_logger
from auth.api import get_current_user

logger = setup_logger("attendance_api")
router = APIRouter()

@router.post("/check-in")
@router.post("/")
async def check_in_attendance(
    attendance: AttendanceCreate,
    db=Depends(get_db)
):
    """Điểm danh vào cho học sinh"""
    try:
        current_vietnam_time = get_vietnam_time_string()
        
        function_result = db.rpc('process_attendance_checkin', {
            'p_student_id': attendance.student_id,
            'p_date': get_vietnam_date_string(),
            'p_checkin_time': current_vietnam_time,
            'p_confidence_score': attendance.confidence_score,
            'p_recognition_model': 'manual',
            'p_device_info': {
                'source': 'manual_checkin',
                'notes': attendance.notes,
                'status': attendance.status,
                'timestamp': current_vietnam_time
            }
        }).execute()
        
        if function_result.data and len(function_result.data) > 0:
            result = function_result.data[0]
            attendance_id = result.get('attendance_id')
            is_first_checkin = result.get('is_first_checkin')
            final_status = result.get('final_status')
            
            if attendance.status and attendance.status != final_status:
                db.table("attendance").update({
                    "status": attendance.status,
                    "notes": attendance.notes,
                    "method": "manual"
                }).eq("id", attendance_id).execute()
            
            if is_first_checkin:
                return {
                    "success": True,
                    "message": "Điểm danh thành công",
                    "data": {
                        "id": attendance_id,
                        "student_id": attendance.student_id,
                        "status": attendance.status or final_status,
                        "method": "manual"
                    }
                }
            else:
                return {
                    "success": True,
                    "message": "Cập nhật giờ ra thành công",
                    "data": {
                        "id": attendance_id,
                        "student_id": attendance.student_id
                    }
                }
        else:
            raise HTTPException(status_code=500, detail="Lỗi gọi database function")
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in check-in: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/")
async def get_attendance_records(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    student_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db=Depends(get_db)
):
    """Lấy danh sách điểm danh với filter"""
    try:
        query = db.table("attendance").select("*")
        
        if date_from:
            query = query.gte("date", date_from.isoformat())
        
        if date_to:
            query = query.lte("date", date_to.isoformat())
        
        if student_id:
            query = query.eq("student_id", student_id)
        
        if status:
            query = query.eq("status", status)
        
        count_response = query.execute()
        total = len(count_response.data) if count_response.data else 0
        
        offset = (page - 1) * page_size
        response = query.order("date", desc=True).order("check_in_time", desc=True).range(offset, offset + page_size - 1).execute()
        
        attendance_data = response.data or []
        
        if attendance_data:
            student_ids = list(set([record["student_id"] for record in attendance_data if record.get("student_id")]))
            
            if student_ids:
                students_response = db.table("students").select("id, student_id, full_name, class_name, grade").in_("id", student_ids).execute()
                students_data = students_response.data or []
                students_lookup = {student["id"]: student for student in students_data}
                
                for record in attendance_data:
                    record["students"] = students_lookup.get(record["student_id"])
        
        return ListResponse(
            success=True,
            data=attendance_data,
            total=total,
            page=page,
            page_size=page_size
        )
        
    except Exception as e:
        logger.error(f"Error getting attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/stats/today")
async def get_today_stats(db=Depends(get_db)):
    """Lấy thống kê điểm danh hôm nay"""
    try:
        today = get_vietnam_date_string()
        
        attendance_response = db.table("attendance").select("status").eq("date", today).execute()
        
        total_students_response = db.table("students").select("id", count="exact").eq("is_active", True).execute()
        total_students = total_students_response.count if hasattr(total_students_response, 'count') else 0
        
        present = sum(1 for a in attendance_response.data if a.get("status") == "present")
        absent = sum(1 for a in attendance_response.data if a.get("status") == "absent")
        late = sum(1 for a in attendance_response.data if a.get("status") == "late")
        
        attendance_rate = (present / total_students * 100) if total_students > 0 else 0
        
        stats = AttendanceStats(
            total_students=total_students,
            present_today=present,
            absent_today=absent,
            late_today=late,
            attendance_rate=round(attendance_rate, 2)
        )
        
        return {
            "success": True,
            "message": "Lấy thống kê thành công",
            "data": stats.dict()
        }
        
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.put("/{attendance_id}")
async def update_attendance(
    attendance_id: int,
    attendance: AttendanceUpdate,
    db=Depends(get_db)
):
    """Cập nhật bản ghi điểm danh"""
    try:
        update_data = attendance.dict(exclude_unset=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="Không có dữ liệu để cập nhật")
        
        update_data["updated_at"] = datetime.now().isoformat()
        
        response = db.table("attendance").update(update_data).eq("id", attendance_id).execute()
        
        if response.data:
            return {
                "success": True,
                "message": "Cập nhật điểm danh thành công",
                "data": response.data[0]
            }
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.delete("/{attendance_id}")
async def delete_attendance(attendance_id: int, db=Depends(get_db)):
    """Xóa bản ghi điểm danh"""
    try:
        response = db.table("attendance").delete().eq("id", attendance_id).execute()
        
        if response.data:
            return {
                "success": True,
                "message": "Xóa bản ghi điểm danh thành công"
            }
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi")
            
    except Exception as e:
        logger.error(f"Error deleting attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")


@router.get("/today")
async def get_today_attendance(
    class_name: Optional[str] = Query(None),
    db=Depends(get_db)
):
    """Lấy điểm danh hôm nay"""
    try:
        today = date.today()
        
        # Build query
        query = db.table("attendance").select("*").eq("date", today.isoformat())
        
        response = query.order("check_in_time", desc=False).execute()
        attendance_data = response.data or []
        
        # Manually join with students data
        if attendance_data:
            # Get all student_ids from attendance records
            student_ids = list(set([record["student_id"] for record in attendance_data if record.get("student_id")]))
            
            if student_ids:
                # Get students data
                students_response = db.table("students").select("id, student_id, full_name, class_name, grade, profile_image").in_("id", student_ids).execute()
                students_data = students_response.data or []
                
                # Create lookup dict
                students_lookup = {student["id"]: student for student in students_data}
                
                # Add students data to attendance records
                for record in attendance_data:
                    record["students"] = students_lookup.get(record["student_id"])
        
        # Filter by class_name if specified
        if class_name and attendance_data:
            attendance_data = [record for record in attendance_data 
                             if record.get("students") and record["students"].get("class_name") == class_name]
        
        return ListResponse(
            success=True,
            data=attendance_data,
            total=len(attendance_data),
            page=1,
            page_size=len(attendance_data)
        )
        
    except Exception as e:
        logger.error(f"Error getting today attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")


@router.get("/student/{student_id}")
async def get_student_attendance(
    student_id: int,
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db=Depends(get_db)
):
    """Lấy lịch sử điểm danh của học sinh"""
    try:
        query = db.table("attendance").select("*").eq("student_id", student_id)
        
        if date_from:
            query = query.gte("date", date_from.isoformat())
        
        if date_to:
            query = query.lte("date", date_to.isoformat())
        
        response = query.order("date", desc=True).execute()
        
        return ListResponse(
            success=True,
            data=response.data or [],
            total=len(response.data) if response.data else 0,
            page=1,
            page_size=len(response.data) if response.data else 0
        )
        
    except Exception as e:
        logger.error(f"Error getting student attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")


@router.get("/stats")
async def get_stats(
    target_date: Optional[date] = Query(None, description="Ngày thống kê, mặc định là hôm nay"),
    db=Depends(get_db)
):
    """Lấy thống kê điểm danh cho ngày cụ thể"""
    try:
        if target_date is None:
            target_date = date.today()
        
        # Total students
        total_students_response = db.table("students").select("count", count="exact").eq("is_active", True).execute()
        total_students = total_students_response.count if total_students_response.count else 0
        
        # Attendance today by status
        present_response = db.table("attendance").select("count", count="exact").eq("date", target_date.isoformat()).eq("status", "present").execute()
        present_count = present_response.count if present_response.count else 0
        
        absent_response = db.table("attendance").select("count", count="exact").eq("date", target_date.isoformat()).eq("status", "absent").execute()
        absent_count = absent_response.count if absent_response.count else 0
        
        late_response = db.table("attendance").select("count", count="exact").eq("date", target_date.isoformat()).eq("status", "late").execute()
        late_count = late_response.count if late_response.count else 0
        
        # Calculate attendance rate
        attendance_rate = round((present_count / total_students * 100) if total_students > 0 else 0, 1)
        
        stats = {
            "total_students": total_students,
            "present_count": present_count,
            "absent_count": absent_count,
            "late_count": late_count,
            "attendance_rate": attendance_rate
        }
        
        return {
            "success": True,
            "message": "Lấy thống kê thành công",
            "data": stats
        }
        
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")


@router.get("/stats/range")
async def get_attendance_stats_range(
    date_from: date = Query(...),
    date_to: date = Query(...),
    db=Depends(get_db)
):
    """Lấy thống kê điểm danh theo khoảng thời gian"""
    try:
        # Attendance records in range
        response = db.table("attendance").select("date, status").gte("date", date_from.isoformat()).lte("date", date_to.isoformat()).execute()
        
        # Group by date and status
        stats_by_date = {}
        
        for record in response.data or []:
            record_date = record["date"]
            status = record["status"]
            
            if record_date not in stats_by_date:
                stats_by_date[record_date] = {
                    "date": record_date,
                    "present": 0,
                    "absent": 0,
                    "late": 0,
                    "total": 0
                }
            
            stats_by_date[record_date][status] = stats_by_date[record_date].get(status, 0) + 1
            stats_by_date[record_date]["total"] += 1
        
        # Convert to list and sort by date
        result = list(stats_by_date.values())
        result.sort(key=lambda x: x["date"])
        
        return {
            "success": True,
            "message": "Lấy thống kê theo khoảng thời gian thành công",
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Error getting attendance stats range: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")


@router.post("/recalculate/{attendance_id}")
async def recalculate_attendance_status(
    attendance_id: int,
    db=Depends(get_db)
):
    """Tính lại status của attendance record dựa trên check_in_time"""
    try:
        # Gọi database function để recalculate
        result = db.rpc('recalculate_single_attendance', {
            'p_attendance_id': attendance_id
        }).execute()
        
        if result.data and len(result.data) > 0:
            recalc_result = result.data[0]
            
            return {
                "success": recalc_result.get('success', True),
                "message": recalc_result.get('message', 'Tính lại status thành công'),
                "data": {
                    "attendance_id": attendance_id,
                    "old_status": recalc_result.get('old_status'),
                    "new_status": recalc_result.get('new_status'),
                    "changed": recalc_result.get('old_status') != recalc_result.get('new_status')
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Lỗi gọi database function")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recalculating attendance {attendance_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")


@router.post("/recalculate/daily")
async def recalculate_daily_attendance(
    target_date: Optional[date] = Query(None, description="Ngày cần tính lại, mặc định là hôm nay"),
    db=Depends(get_db)
):
    """Tính lại status cho tất cả attendance records trong ngày"""
    try:
        if target_date is None:
            target_date = date.today()
        
        # Gọi database function để recalculate toàn bộ ngày
        result = db.rpc('recalculate_daily_attendance', {
            'p_date': target_date.isoformat()
        }).execute()
        
        if result.data and len(result.data) > 0:
            daily_result = result.data[0]
            
            return {
                "success": True,
                "message": daily_result.get('message', 'Tính lại status hàng ngày thành công'),
                "data": {
                    "date": target_date.isoformat(),
                    "total_checked": daily_result.get('total_checked', 0),
                    "updated_count": daily_result.get('updated_count', 0),
                    "no_changes": daily_result.get('updated_count', 0) == 0
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Lỗi gọi database function")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recalculating daily attendance for {target_date}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")


@router.patch("/{attendance_id}/status")
async def update_attendance_status_and_notes(
    attendance_id: int,
    status: str = Query(..., description="Trạng thái mới: present, absent, late"),
    notes: Optional[str] = Query(None, description="Ghi chú"),
    db=Depends(get_db)
):
    """Cập nhật trạng thái và ghi chú cho attendance record"""
    try:
        # Validate status
        valid_statuses = ["present", "absent", "late"]
        if status not in valid_statuses:
            raise HTTPException(
                status_code=400, 
                detail=f"Trạng thái không hợp lệ. Chỉ chấp nhận: {', '.join(valid_statuses)}"
            )
        
        # Kiểm tra attendance tồn tại
        existing = db.table("attendance").select("*").eq("id", attendance_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi điểm danh")
        
        # Prepare update data
        update_data = {
            "status": status,
            "updated_at": get_vietnam_time_string()
        }
        
        if notes is not None:
            update_data["notes"] = notes
        
        # Update database
        response = db.table("attendance").update(update_data).eq("id", attendance_id).execute()
        
        if response.data:
            return {
                "success": True,
                "message": "Cập nhật trạng thái điểm danh thành công",
                "data": response.data[0]
            }
        else:
            raise HTTPException(status_code=500, detail="Lỗi cập nhật điểm danh")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating attendance status {attendance_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")


@router.get("/full-list")
async def get_full_attendance_list(
    target_date: Optional[date] = Query(None, description="Ngày cần xem, mặc định là hôm nay"),
    class_name: Optional[str] = Query(None, description="Lớp cần xem"),
    db=Depends(get_db)
):
    """Lấy danh sách điểm danh đầy đủ tất cả học sinh trong lớp - ai chưa điểm danh sẽ hiển thị là vắng"""
    try:
        if target_date is None:
            target_date = date.today()
        
        # Lấy tất cả học sinh active
        students_query = db.table("students").select(
            "id, student_id, full_name, class_name, grade, profile_image"
        ).eq("is_active", True)
        
        # Filter theo class nếu có
        if class_name:
            students_query = students_query.eq("class_name", class_name)
        
        students_response = students_query.order("class_name, student_id").execute()
        all_students = students_response.data or []
        
        if not all_students:
            return ListResponse(
                success=True,
                data=[],
                total=0,
                page=1,
                page_size=0,
                message="Không tìm thấy học sinh nào"
            )
        
        # Lấy attendance records cho ngày này
        student_ids = [student["id"] for student in all_students]
        attendance_response = db.table("attendance").select("*").eq("date", target_date.isoformat()).in_("student_id", student_ids).execute()
        attendance_records = attendance_response.data or []
        
        # Tạo lookup dict cho attendance
        attendance_lookup = {record["student_id"]: record for record in attendance_records}
        
        # Kết hợp students với attendance data
        full_list = []
        for student in all_students:
            student_id = student["id"]
            attendance = attendance_lookup.get(student_id)
            
            if attendance:
                # Có attendance record
                record = {
                    "id": attendance["id"],
                    "student_id": student_id,
                    "date": target_date.isoformat(),
                    "check_in_time": attendance.get("check_in_time"),
                    "check_out_time": attendance.get("check_out_time"),
                    "status": attendance.get("status", "absent"),
                    "method": attendance.get("method", "manual"),
                    "confidence_score": attendance.get("confidence_score"),
                    "recognition_model": attendance.get("recognition_model"),
                    "recognition_time": attendance.get("recognition_time"),
                    "notes": attendance.get("notes"),
                    "device_info": attendance.get("device_info"),
                    "location_info": attendance.get("location_info"),
                    "created_by": attendance.get("created_by"),
                    "created_at": attendance.get("created_at"),
                    "updated_at": attendance.get("updated_at"),
                    "students": student
                }
            else:
                # Chưa có attendance record - tạo virtual record với status absent
                record = {
                    "id": None,  # Không có record thật
                    "student_id": student_id,
                    "date": target_date.isoformat(),
                    "check_in_time": None,
                    "check_out_time": None,
                    "status": "absent",
                    "method": None,
                    "confidence_score": None,
                    "recognition_model": None,
                    "recognition_time": None,
                    "notes": None,
                    "device_info": None,
                    "location_info": None,
                    "created_by": None,
                    "created_at": None,
                    "updated_at": None,
                    "students": student
                }
            
            full_list.append(record)
        
        return ListResponse(
            success=True,
            data=full_list,
            total=len(full_list),
            page=1,
            page_size=len(full_list),
            message=f"Danh sách điểm danh đầy đủ cho ngày {target_date.strftime('%d/%m/%Y')}"
        )
        
    except Exception as e:
        logger.error(f"Error getting full attendance list: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")


@router.post("/check-out/{attendance_id}")
async def check_out_attendance(
    attendance_id: int,
    db=Depends(get_db)
):
    """Check out cho attendance record"""
    try:
        # Kiểm tra attendance tồn tại
        existing = db.table("attendance").select("*").eq("id", attendance_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi điểm danh")
        
        current_time = get_vietnam_time_string()
        
        # Update check-out time
        response = db.table("attendance").update({
            "check_out_time": current_time,
            "updated_at": current_time
        }).eq("id", attendance_id).execute()
        
        if response.data:
            return {
                "success": True,
                "message": "Check-out thành công",
                "data": response.data[0]
            }
        else:
            raise HTTPException(status_code=500, detail="Lỗi cập nhật check-out")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking out: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")
