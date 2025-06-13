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

logger = setup_logger()
router = APIRouter()

@router.post("/check-in", response_model=ResponseModel)
@router.post("/", response_model=ResponseModel)  # Alias for markAttendance
async def check_in_attendance(
    attendance: AttendanceCreate,
    db=Depends(get_db)
):
    """Điểm danh vào cho học sinh"""
    try:
        # Kiểm tra đã điểm danh hôm nay chưa
        today = date.today()
        vietnam_tz = timezone(timedelta(hours=7))
        existing = db.table("attendance").select("*").eq("student_id", attendance.student_id).eq("date", today.isoformat()).execute()
        
        if existing.data:
            # Update existing attendance
            update_data = {
                "check_in_time": datetime.now(vietnam_tz).isoformat(),
                "status": attendance.status,
                "notes": attendance.notes,
                "confidence_score": attendance.confidence_score,
                "updated_at": datetime.now(vietnam_tz).isoformat()
            }
            
            response = db.table("attendance").update(update_data).eq("id", existing.data[0]["id"]).execute()
            
            return ResponseModel(
                success=True,
                message="Cập nhật điểm danh thành công",
                data=response.data[0]
            )
        else:
            # Create new attendance record
            attendance_data = attendance.dict()
            attendance_data.update({
                "date": today.isoformat(),
                "check_in_time": datetime.now(vietnam_tz).isoformat(),
                "created_at": datetime.now(vietnam_tz).isoformat(),
                "updated_at": datetime.now(vietnam_tz).isoformat()
            })
            
            response = db.table("attendance").insert(attendance_data).execute()
            
            if response.data:
                return ResponseModel(
                    success=True,
                    message="Điểm danh thành công",
                    data=response.data[0]
                )
            else:
                raise HTTPException(status_code=500, detail="Lỗi tạo điểm danh")
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error checking in: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.post("/check-out/{attendance_id}", response_model=ResponseModel)
async def check_out_attendance(
    attendance_id: int,
    db=Depends(get_db)
):
    """Điểm danh ra cho học sinh"""
    try:
        # Kiểm tra attendance tồn tại
        existing = db.table("attendance").select("*").eq("id", attendance_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi điểm danh")
        
        # Update check out time
        vietnam_tz = timezone(timedelta(hours=7))
        update_data = {
            "check_out_time": datetime.now(vietnam_tz).isoformat(),
            "updated_at": datetime.now(vietnam_tz).isoformat()
        }
        
        response = db.table("attendance").update(update_data).eq("id", attendance_id).execute()
        
        if response.data:
            return ResponseModel(
                success=True,
                message="Điểm danh ra thành công",
                data=response.data[0]
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
            data=attendance_data,
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
            data=response.data or [],
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
            data=attendance_data,
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
    """Cập nhật bản ghi điểm danh"""
    try:
        # Kiểm tra attendance tồn tại
        existing = db.table("attendance").select("*").eq("id", attendance_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi điểm danh")
        
        # Prepare update data
        vietnam_tz = timezone(timedelta(hours=7))
        update_data = attendance_update.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.now(vietnam_tz).isoformat()
        
        # Update database
        response = db.table("attendance").update(update_data).eq("id", attendance_id).execute()
        
        if response.data:
            return ResponseModel(
                success=True,
                message="Cập nhật điểm danh thành công",
                data=response.data[0]
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