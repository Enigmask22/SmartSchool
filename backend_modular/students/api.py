"""
API Router cho Students management
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from datetime import datetime
import os
import aiofiles

from students.models import StudentCreate, StudentUpdate, ResponseModel, ListResponse
from core.database import get_db
from core.logger import setup_logger
from core.dependencies import get_current_user

logger = setup_logger("students_api")
router = APIRouter()

@router.post("/")
async def create_student(student: StudentCreate, db=Depends(get_db)):
    """Tạo học sinh mới"""
    try:
        existing = db.table("students").select("id").eq("student_id", student.student_id).execute()
        
        if existing.data:
            raise HTTPException(status_code=400, detail="Mã học sinh đã tồn tại")
        
        if student.gender not in ['Nam', 'Nữ', 'Khác']:
            raise HTTPException(status_code=400, detail="Giới tính phải là Nam, Nữ hoặc Khác")
        
        student_data = student.dict()
        
        if student_data.get("date_of_birth"):
            student_data["date_of_birth"] = student_data["date_of_birth"].isoformat()
        
        student_data["created_at"] = datetime.now().isoformat()
        student_data["updated_at"] = datetime.now().isoformat()
        
        response = db.table("students").insert(student_data).execute()
        
        if response.data:
            return {
                "success": True,
                "message": "Tạo học sinh thành công",
                "data": response.data[0]
            }
        else:
            raise HTTPException(status_code=500, detail="Lỗi tạo học sinh")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating student: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/")
async def get_students(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    class_name: Optional[str] = Query(None),
    grade: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(True),
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    """Lấy danh sách học sinh với phân trang"""
    try:
        query = db.table("students").select("*")
        
        if search:
            query = query.or_(
                f"full_name.ilike.%{search}%,"
                f"student_id.ilike.%{search}%,"
                f"email.ilike.%{search}%"
            )
        
        if class_name:
            query = query.eq("class_name", class_name)
            
        if grade:
            query = query.eq("grade", grade)
            
        # Backend gốc sử dụng is_active parameter, không có show_deleted
        if is_active is not None:
            query = query.eq("is_active", is_active)
        
        count_response = query.execute()
        total = len(count_response.data) if count_response.data else 0
        
        offset = (page - 1) * page_size
        response = query.range(offset, offset + page_size - 1).execute()
        
        return ListResponse(
            success=True,
            data=response.data or [],
            total=total,
            page=page,
            page_size=page_size
        )
        
    except Exception as e:
        logger.error(f"Error getting students: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/subjects")
async def get_subjects_for_students(db=Depends(get_db)):
    """Lấy danh sách môn học (cho teachers/students chọn môn) - Public endpoint"""
    try:
        # Chỉ lấy các môn học active
        response = db.table("subjects").select("*").eq("is_active", True).order("subject_code").execute()
        
        return {
            "success": True,
            "data": response.data
        }
    except Exception as e:
        logger.error(f"ERROR: Error getting subjects: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/{student_id}")
async def get_student(student_id: int, db=Depends(get_db)):
    """Lấy thông tin chi tiết học sinh"""
    try:
        response = db.table("students").select("*").eq("id", student_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
        
        return {
            "success": True,
            "message": "Lấy thông tin học sinh thành công",
            "data": response.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting student {student_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.put("/{student_id}")
async def update_student(
    student_id: int,
    student: StudentUpdate,
    db=Depends(get_db)
):
    """Cập nhật thông tin học sinh"""
    try:
        update_data = {}
        for field, value in student.dict(exclude_unset=True).items():
            if value is not None:
                if field == "date_of_birth" and value:
                    update_data[field] = value.isoformat()
                else:
                    update_data[field] = value
        
        if not update_data:
            raise HTTPException(status_code=400, detail="Không có dữ liệu để cập nhật")
        
        update_data["updated_at"] = datetime.now().isoformat()
        
        response = db.table("students").update(update_data).eq("id", student_id).execute()
        
        if response.data:
            return {
                "success": True,
                "message": "Cập nhật học sinh thành công",
                "data": response.data[0]
            }
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating student: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.delete("/{student_id}")
async def delete_student(student_id: int, db=Depends(get_db)):
    """Xóa học sinh (soft delete)"""
    try:
        # Kiểm tra student tồn tại
        existing = db.table("students").select("id, is_active").eq("id", student_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
        
        # Soft delete
        response = db.table("students").update({
            "is_active": False,
            "updated_at": datetime.now().isoformat()
        }).eq("id", student_id).execute()
        
        if response.data:
            return {
                "success": True,
                "message": "Xóa học sinh thành công",
                "data": response.data[0]
            }
        else:
            raise HTTPException(status_code=500, detail="Không thể xóa học sinh")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error deleting student {student_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")


@router.post("/{student_id}/restore")
async def restore_student(
    student_id: int,
    db=Depends(get_db)
):
    """Khôi phục học sinh đã bị xóa"""
    try:
        # Kiểm tra student tồn tại
        existing = db.table("students").select("id, is_active").eq("id", student_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
        
        # Kiểm tra student đã bị xóa chưa
        if existing.data[0].get("is_active", True):
            raise HTTPException(status_code=400, detail="Học sinh chưa bị xóa")
        
        # Restore student
        response = db.table("students").update({
            "is_active": True,
            "updated_at": datetime.now().isoformat()
        }).eq("id", student_id).execute()
        
        if response.data:
            return {
                "success": True,
                "message": "Khôi phục học sinh thành công",
                "data": response.data[0]
            }
        else:
            raise HTTPException(status_code=500, detail="Không thể khôi phục học sinh")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error restoring student {student_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.delete("/{student_id}/permanent")
async def permanent_delete_student(
    student_id: int,
    db=Depends(get_db)
):
    """Xóa vĩnh viễn học sinh (hard delete với cascade)"""
    try:
        # Kiểm tra xem student có tồn tại không
        student_check = db.table("students").select("id").eq("id", student_id).execute()
        if not student_check.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
        
        # Xóa các bản ghi liên quan
        db.table("attendance").delete().eq("student_id", student_id).execute()
        db.table("scores").delete().eq("student_id", student_id).execute()
        
        # Xóa vĩnh viễn student record
        response = db.table("students").delete().eq("id", student_id).execute()
        
        if response.data:
            return {
                "success": True,
                "message": "Xóa vĩnh viễn học sinh thành công"
            }
        else:
            raise HTTPException(status_code=500, detail="Lỗi khi xóa vĩnh viễn học sinh")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error permanently deleting student {student_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.post("/{student_id}/upload-image")
async def upload_student_image(
    student_id: int,
    file: UploadFile = File(...),
    db=Depends(get_db)
):
    """Upload ảnh profile cho học sinh"""
    try:
        os.makedirs("uploads/students", exist_ok=True)
        
        file_extension = file.filename.split(".")[-1]
        file_name = f"student_{student_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{file_extension}"
        file_path = f"uploads/students/{file_name}"
        
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        db.table("students").update({
            "profile_image": f"/{file_path}",
            "updated_at": datetime.now().isoformat()
        }).eq("id", student_id).execute()
        
        return {
            "success": True,
            "message": "Upload ảnh thành công",
            "data": {"image_url": f"/{file_path}"}
        }
        
    except Exception as e:
        logger.error(f"Error uploading image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi upload: {str(e)}")


@router.get("/classes/list")
async def get_classes(db=Depends(get_db)):
    """Lấy danh sách các lớp học"""
    try:
        response = db.table("students").select("class_name, grade").execute()
        
        if response.data:
            # Group by class and grade
            classes = {}
            for row in response.data:
                grade = row.get("grade", "Unknown")
                class_name = row.get("class_name", "Unknown")
                
                if grade not in classes:
                    classes[grade] = set()
                classes[grade].add(class_name)
            
            # Convert to list format
            result = []
            for grade, class_set in classes.items():
                for class_name in sorted(class_set):
                    result.append({
                        "grade": grade,
                        "class_name": class_name,
                        "display_name": f"{grade} - {class_name}"
                    })
            
            return {
                "success": True,
                "message": "Lấy danh sách lớp thành công",
                "data": result
            }
        else:
            return {
                "success": True,
                "message": "Chưa có lớp nào",
                "data": []
            }
            
    except Exception as e:
        logger.error(f"ERROR: Error getting classes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")


@router.get("/stats/summary")
async def get_student_stats(db=Depends(get_db)):
    """Lấy thống kê tổng quan học sinh"""
    try:
        # Total students
        total_response = db.table("students").select("count", count="exact").execute()
        total_students = total_response.count if total_response.count else 0
        
        # Active students
        active_response = db.table("students").select("count", count="exact").eq("is_active", True).execute()
        active_students = active_response.count if active_response.count else 0
        
        # Students with InsightFace encoding
        encoded_response = db.table("students").select("count", count="exact").not_.is_("insightface_encoding", "null").execute()
        encoded_students = encoded_response.count if encoded_response.count else 0
        
        stats = {
            "total_students": total_students,
            "active_students": active_students,
            "encoded_students": encoded_students,
            "inactive_students": total_students - active_students,
            "encoding_rate": round((encoded_students / total_students * 100) if total_students > 0 else 0, 1)
        }
        
        return {
            "success": True,
            "message": "Lấy thống kê thành công",
            "data": stats
        }
        
    except Exception as e:
        logger.error(f"ERROR: Error getting student stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")
