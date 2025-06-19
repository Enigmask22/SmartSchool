"""
API Router cho quản lý điểm danh
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, date, timezone, timedelta

from models.schemas import (
    Attendance, AttendanceCreate, AttendanceUpdate,
    ResponseModel, ListResponse, AttendanceStats, DashboardData
)
from database.connection import get_db
from utils.logger import setup_logger
from utils.timezone_helper import get_vietnam_time_string, get_vietnam_date_string, prepare_attendance_data, update_attendance_checkout, fix_database_response_timestamps

logger = setup_logger()
router = APIRouter()

@router.post("/check-in", response_model=ResponseModel)
@router.post("/", response_model=ResponseModel)  # Alias for markAttendance
async def check_in_attendance(
    attendance: AttendanceCreate,
    db=Depends(get_db)
):
    """Điểm danh vào cho học sinh với Vietnam timezone - SỬ DỤNG DATABASE FUNCTION"""
    try:
        # SỬ DỤNG DATABASE FUNCTION THAY VÀ MANUAL INSERT/UPDATE
        # Function này tự động xử lý timezone và logic check-in/check-out
        # Sử dụng actual manual checkin time thay vì NULL để đảm bảo cutoff logic đúng
        current_vietnam_time = get_vietnam_time_string()
        
        function_result = db.rpc('process_attendance_checkin', {
            'p_student_id': attendance.student_id,
            'p_date': get_vietnam_date_string(),
            'p_checkin_time': current_vietnam_time,  # ACTUAL checkin time để check cutoff
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
            result = fix_database_response_timestamps(function_result.data[0])
            attendance_id = result.get('attendance_id')
            is_first_checkin = result.get('is_first_checkin')
            final_status = result.get('final_status')
            check_in_time = result.get('check_in_time')
            check_out_time = result.get('check_out_time')
            
            # Update status if provided
            if attendance.status and attendance.status != final_status:
                update_response = db.table("attendance").update({
                    "status": attendance.status,
                    "notes": attendance.notes,
                    "method": "manual"
                }).eq("id", attendance_id).execute()
                final_status = attendance.status
            
            if is_first_checkin:
                logger.info(f"✅ Manual check-in for student {attendance.student_id} - {check_in_time}")
                return ResponseModel(
                    success=True,
                    message="Điểm danh thành công",
                    data={
                        "id": attendance_id,
                        "student_id": attendance.student_id,
                        "check_in_time": check_in_time,
                        "status": final_status,
                        "method": "manual",
                        "notes": attendance.notes
                    }
                )
            else:
                logger.info(f"✅ Manual check-out for student {attendance.student_id} - {check_out_time}")
                return ResponseModel(
                    success=True,
                    message="Cập nhật giờ ra thành công",
                    data={
                        "id": attendance_id,
                        "student_id": attendance.student_id,
                        "check_in_time": check_in_time,
                        "check_out_time": check_out_time,
                        "status": final_status,
                        "method": "manual",
                        "notes": attendance.notes
                    }
                )
        else:
            logger.error(f"❌ Database function returned no data for student {attendance.student_id}")
            raise HTTPException(status_code=500, detail="Lỗi gọi database function")
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error calling database function for manual check-in: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.post("/check-out/{attendance_id}", response_model=ResponseModel)
async def check_out_attendance(
    attendance_id: int,
    db=Depends(get_db)
):
    """Điểm danh ra cho học sinh với Vietnam timezone"""
    try:
        # Kiểm tra attendance tồn tại
        existing = db.table("attendance").select("*").eq("id", attendance_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi điểm danh")
        
        # Update check out time với Vietnam timezone
        update_data = update_attendance_checkout()
        
        response = db.table("attendance").update(update_data).eq("id", attendance_id).execute()
        
        if response.data:
            return ResponseModel(
                success=True,
                message="Điểm danh ra thành công",
                data=fix_database_response_timestamps(response.data[0])
            )
        else:
            raise HTTPException(status_code=500, detail="Lỗi cập nhật điểm danh")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error checking out: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/", response_model=ListResponse)
async def get_attendance_records(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    student_id: Optional[int] = Query(None),
    class_name: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db=Depends(get_db)
):
    """Lấy danh sách điểm danh với filter"""
    try:
        # Build query with JOIN - use simpler approach
        query = db.table("attendance").select("*")
        
        # Apply filters
        if date_from:
            query = query.gte("date", date_from.isoformat())
        
        if date_to:
            query = query.lte("date", date_to.isoformat())
        
        if student_id:
            query = query.eq("student_id", student_id)
        
        if status:
            query = query.eq("status", status)
        
        # Count total
        count_response = query.execute()
        total = len(count_response.data) if count_response.data else 0
        
        # Apply pagination and ordering
        offset = (page - 1) * page_size
        response = query.order("date", desc=True).order("check_in_time", desc=True).range(offset, offset + page_size - 1).execute()
        
        # Get attendance records
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
        
        return ListResponse(
            success=True,
            data=fix_database_response_timestamps(attendance_data),
            total=total,
            page=page,
            page_size=page_size
        )
        
    except Exception as e:
        logger.error(f"❌ Error getting attendance records: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/student/{student_id}", response_model=ListResponse)
async def get_student_attendance(
    student_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
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
        
        # Count total
        count_response = query.execute()
        total = len(count_response.data) if count_response.data else 0
        
        # Apply pagination
        offset = (page - 1) * page_size
        response = query.order("date", desc=True).range(offset, offset + page_size - 1).execute()
        
        return ListResponse(
            success=True,
            data=fix_database_response_timestamps(response.data or []),
            total=total,
            page=page,
            page_size=page_size
        )
        
    except Exception as e:
        logger.error(f"❌ Error getting student attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/today", response_model=ListResponse)
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
            data=fix_database_response_timestamps(attendance_data),
            total=len(attendance_data),
            page=1,
            page_size=len(attendance_data)
        )
        
    except Exception as e:
        logger.error(f"❌ Error getting today attendance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/stats", response_model=ResponseModel)
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
        
        return ResponseModel(
            success=True,
            message="Lấy thống kê thành công",
            data=stats
        )
        
    except Exception as e:
        logger.error(f"❌ Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/stats/today", response_model=ResponseModel)
async def get_today_stats(db=Depends(get_db)):
    """Lấy thống kê điểm danh hôm nay"""
    try:
        today = date.today()
        
        # Total students
        total_students_response = db.table("students").select("count", count="exact").eq("is_active", True).execute()
        total_students = total_students_response.count if total_students_response.count else 0
        
        # Attendance today by status
        present_response = db.table("attendance").select("count", count="exact").eq("date", today.isoformat()).eq("status", "present").execute()
        present_today = present_response.count if present_response.count else 0
        
        absent_response = db.table("attendance").select("count", count="exact").eq("date", today.isoformat()).eq("status", "absent").execute()
        absent_today = absent_response.count if absent_response.count else 0
        
        late_response = db.table("attendance").select("count", count="exact").eq("date", today.isoformat()).eq("status", "late").execute()
        late_today = late_response.count if late_response.count else 0
        
        # Calculate attendance rate
        attendance_rate = round((present_today / total_students * 100) if total_students > 0 else 0, 1)
        
        stats = AttendanceStats(
            total_students=total_students,
            present_today=present_today,
            absent_today=absent_today,
            late_today=late_today,
            attendance_rate=attendance_rate
        )
        
        return ResponseModel(
            success=True,
            message="Lấy thống kê thành công",
            data=stats.dict()
        )
        
    except Exception as e:
        logger.error(f"❌ Error getting today stats: {str(e)}")
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
        response = db.table("attendance").select("""
            date, status, count
        """, count="exact").gte("date", date_from.isoformat()).lte("date", date_to.isoformat()).execute()
        
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
            
            stats_by_date[record_date][status] += 1
            stats_by_date[record_date]["total"] += 1
        
        # Convert to list and sort by date
        result = list(stats_by_date.values())
        result.sort(key=lambda x: x["date"])
        
        return ResponseModel(
            success=True,
            message="Lấy thống kê theo khoảng thời gian thành công",
            data=result
        )
        
    except Exception as e:
        logger.error(f"❌ Error getting attendance stats range: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.put("/{attendance_id}", response_model=ResponseModel)
async def update_attendance(
    attendance_id: int,
    attendance_update: AttendanceUpdate,
    db=Depends(get_db)
):
    """Cập nhật bản ghi điểm danh với Vietnam timezone"""
    try:
        # Kiểm tra attendance tồn tại
        existing = db.table("attendance").select("*").eq("id", attendance_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi điểm danh")
        
        # Prepare update data với Vietnam timezone
        update_data = attendance_update.dict(exclude_unset=True)
        update_data["updated_at"] = get_vietnam_time_string()
        
        # Update database
        response = db.table("attendance").update(update_data).eq("id", attendance_id).execute()
        
        if response.data:
            return ResponseModel(
                success=True,
                message="Cập nhật điểm danh thành công",
                data=fix_database_response_timestamps(response.data[0])
            )
        else:
            raise HTTPException(status_code=500, detail="Lỗi cập nhật điểm danh")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating attendance {attendance_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.delete("/{attendance_id}", response_model=ResponseModel)
async def delete_attendance(
    attendance_id: int,
    db=Depends(get_db)
):
    """Xóa bản ghi điểm danh"""
    try:
        # Kiểm tra attendance tồn tại
        existing = db.table("attendance").select("*").eq("id", attendance_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi điểm danh")
        
        # Delete record
        response = db.table("attendance").delete().eq("id", attendance_id).execute()
        
        return ResponseModel(
            success=True,
            message="Xóa điểm danh thành công"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting attendance {attendance_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.post("/recalculate/{attendance_id}", response_model=ResponseModel)
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
            
            return ResponseModel(
                success=recalc_result.get('success', True),
                message=recalc_result.get('message', 'Tính lại status thành công'),
                data={
                    "attendance_id": attendance_id,
                    "old_status": recalc_result.get('old_status'),
                    "new_status": recalc_result.get('new_status'),
                    "changed": recalc_result.get('old_status') != recalc_result.get('new_status')
                }
            )
        else:
            raise HTTPException(status_code=500, detail="Lỗi gọi database function")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error recalculating attendance {attendance_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.post("/recalculate/daily", response_model=ResponseModel)
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
            
            return ResponseModel(
                success=True,
                message=daily_result.get('message', 'Tính lại status hàng ngày thành công'),
                data={
                    "date": target_date.isoformat(),
                    "total_checked": daily_result.get('total_checked', 0),
                    "updated_count": daily_result.get('updated_count', 0),
                    "no_changes": daily_result.get('updated_count', 0) == 0
                }
            )
        else:
            raise HTTPException(status_code=500, detail="Lỗi gọi database function")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error recalculating daily attendance for {target_date}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.patch("/{attendance_id}/status", response_model=ResponseModel)
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
            updated_record = fix_database_response_timestamps(response.data[0])
            return ResponseModel(
                success=True,
                message="Cập nhật trạng thái điểm danh thành công",
                data=updated_record
            )
        else:
            raise HTTPException(status_code=500, detail="Lỗi cập nhật điểm danh")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating attendance status {attendance_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/full-list", response_model=ListResponse)
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
        
        # Fix timezone cho records có attendance
        fixed_list = fix_database_response_timestamps(full_list)
        
        return ListResponse(
            success=True,
            data=fixed_list,
            total=len(fixed_list),
            page=1,
            page_size=len(fixed_list),
            message=f"Danh sách điểm danh đầy đủ cho ngày {target_date.strftime('%d/%m/%Y')}"
        )
        
    except Exception as e:
        logger.error(f"❌ Error getting full attendance list: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")