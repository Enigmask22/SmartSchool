"""
API Router cho quản lý học sinh
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Query
from fastapi.responses import JSONResponse
import aiofiles
import os
from datetime import datetime

from models.schemas import (
    Student, StudentCreate, StudentUpdate, 
    ResponseModel, ListResponse
)
from database.connection import get_db
from utils.logger import setup_logger
from ai.face_recognition_insightface import insightface_service
from routers.auth import get_current_user

logger = setup_logger()
router = APIRouter()

@router.post("/", response_model=ResponseModel)
async def create_student(
    student: StudentCreate,
    db=Depends(get_db)
):
    """Tạo học sinh mới"""
    try:
        # Kiểm tra student_id đã tồn tại chưa
        existing = db.table("students").select("id").eq("student_id", student.student_id).execute()
        
        if existing.data:
            raise HTTPException(status_code=400, detail="Mã học sinh đã tồn tại")
        
        # Tạo student data
        student_data = student.dict()
        
        # Convert date fields to string format
        if student_data.get("date_of_birth"):
            student_data["date_of_birth"] = student_data["date_of_birth"].isoformat()
        
        student_data["created_at"] = datetime.now().isoformat()
        student_data["updated_at"] = datetime.now().isoformat()
        
        # Insert vào database
        response = db.table("students").insert(student_data).execute()
        
        if response.data:
            return ResponseModel(
                success=True,
                message="Tạo học sinh thành công",
                data=response.data[0]
            )
        else:
            raise HTTPException(status_code=500, detail="Lỗi tạo học sinh")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creating student: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/", response_model=ListResponse)
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
    """Lấy danh sách học sinh với phân trang và filter"""
    try:
        # Build query
        query = db.table("students").select("*")
        
        # Filter theo giáo viên nếu role là teacher
        if current_user.get("role") == "teacher":
            # Lấy teacher_id từ user_id
            teacher_response = db.table("teachers").select("id").eq("user_id", current_user["id"]).execute()
            if teacher_response.data:
                teacher_id = teacher_response.data[0]["id"]
                
                # Lấy các class_id mà giáo viên này dạy
                class_subjects_response = db.table("class_subjects")\
                    .select("class_id")\
                    .eq("teacher_id", teacher_id)\
                    .eq("academic_year", "2024-2025")\
                    .execute()
                
                if class_subjects_response.data:
                    class_ids = [cs["class_id"] for cs in class_subjects_response.data]
                    
                    # Lấy class_name từ class_ids
                    classes_response = db.table("classes")\
                        .select("class_name")\
                        .in_("id", class_ids)\
                        .execute()
                    
                    if classes_response.data:
                        allowed_classes = [cls["class_name"] for cls in classes_response.data]
                        query = query.in_("class_name", allowed_classes)
                    else:
                        # Nếu không có lớp nào, trả về empty
                        return ListResponse(
                            success=True,
                            data=[],
                            total=0,
                            page=page,
                            page_size=page_size
                        )
                else:
                    # Nếu không dạy lớp nào, trả về empty
                    return ListResponse(
                        success=True,
                        data=[],
                        total=0,
                        page=page,
                        page_size=page_size
                    )
            else:
                # Nếu không tìm thấy teacher record, trả về empty
                return ListResponse(
                    success=True,
                    data=[],
                    total=0,
                    page=page,
                    page_size=page_size
                )
        
        # Apply filters
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
            
        if is_active is not None:
            query = query.eq("is_active", is_active)
        
        # Count total
        count_response = query.execute()
        total = len(count_response.data) if count_response.data else 0
        
        # Apply pagination
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
        logger.error(f"❌ Error getting students: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/{student_id}", response_model=ResponseModel)
async def get_student(
    student_id: int,
    db=Depends(get_db)
):
    """Lấy thông tin chi tiết học sinh"""
    try:
        response = db.table("students").select("*").eq("id", student_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
        
        return ResponseModel(
            success=True,
            message="Lấy thông tin học sinh thành công",
            data=response.data[0]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting student {student_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.put("/{student_id}", response_model=ResponseModel)
async def update_student(
    student_id: int,
    student_update: StudentUpdate,
    db=Depends(get_db)
):
    """Cập nhật thông tin học sinh"""
    try:
        # Kiểm tra student tồn tại
        existing = db.table("students").select("id").eq("id", student_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
        
        # Prepare update data
        update_data = student_update.dict(exclude_unset=True)
        
        # Convert date fields to string format
        if update_data.get("date_of_birth"):
            update_data["date_of_birth"] = update_data["date_of_birth"].isoformat()
        
        update_data["updated_at"] = datetime.now().isoformat()
        
        # Update database
        response = db.table("students").update(update_data).eq("id", student_id).execute()
        
        if response.data:
            return ResponseModel(
                success=True,
                message="Cập nhật học sinh thành công",
                data=response.data[0]
            )
        else:
            raise HTTPException(status_code=500, detail="Lỗi cập nhật học sinh")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating student {student_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.delete("/{student_id}", response_model=ResponseModel)
async def delete_student(
    student_id: int,
    db=Depends(get_db)
):
    """Xóa học sinh (soft delete)"""
    try:
        # Kiểm tra student tồn tại
        existing = db.table("students").select("id").eq("id", student_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
        
        # Soft delete
        response = db.table("students").update({
            "is_active": False,
            "updated_at": datetime.now().isoformat()
        }).eq("id", student_id).execute()
        
        if response.data:
            return ResponseModel(
                success=True,
                message="Xóa học sinh thành công"
            )
        else:
            raise HTTPException(status_code=500, detail="Lỗi xóa học sinh")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting student {student_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.post("/{student_id}/upload-image", response_model=ResponseModel)
async def upload_student_image(
    student_id: int,
    file: UploadFile = File(...),
    db=Depends(get_db)
):
    """Upload ảnh đại diện cho học sinh"""
    try:
        # Kiểm tra student tồn tại
        student_response = db.table("students").select("*").eq("id", student_id).execute()
        
        if not student_response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
        
        student = student_response.data[0]
        
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File phải là hình ảnh")
        
        # Create upload directory
        upload_dir = "uploads/students"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate filename
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        filename = f"student_{student_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{file_extension}"
        file_path = os.path.join(upload_dir, filename)
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Update database
        update_response = db.table("students").update({
            "profile_image": file_path,
            "updated_at": datetime.now().isoformat()
        }).eq("id", student_id).execute()
        
        if update_response.data:
            return ResponseModel(
                success=True,
                message="Upload ảnh thành công",
                data={"image_path": file_path}
            )
        else:
            # Delete uploaded file if database update failed
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(status_code=500, detail="Lỗi cập nhật database")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error uploading image for student {student_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

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
            
            return ResponseModel(
                success=True,
                message="Lấy danh sách lớp thành công",
                data=result
            )
        else:
            return ResponseModel(
                success=True,
                message="Chưa có lớp nào",
                data=[]
            )
            
    except Exception as e:
        logger.error(f"❌ Error getting classes: {str(e)}")
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
        
        # Students with face encoding
        encoded_response = db.table("students").select("count", count="exact").not_.is_("face_encoding", "null").execute()
        encoded_students = encoded_response.count if encoded_response.count else 0
        
        # By grade
        grade_response = db.table("students").select("grade, count", count="exact").eq("is_active", True).execute()
        
        stats = {
            "total_students": total_students,
            "active_students": active_students,
            "encoded_students": encoded_students,
            "inactive_students": total_students - active_students,
            "encoding_rate": round((encoded_students / total_students * 100) if total_students > 0 else 0, 1)
        }
        
        return ResponseModel(
            success=True,
            message="Lấy thống kê thành công",
            data=stats
        )
        
    except Exception as e:
        logger.error(f"❌ Error getting student stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}") 