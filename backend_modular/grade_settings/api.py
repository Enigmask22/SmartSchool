"""
API Router cho Grade Settings Management
- Admin: Full CRUD (Create, Read, Update, Delete)
- Teachers: Read-only (để lấy cấu hình cột điểm khi nhập điểm)
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Optional, List
from datetime import datetime

from grade_settings.models import GradeSettingsCreate, GradeSettingsUpdate, ResponseModel
from core.database import get_db
from core.logger import setup_logger
from auth.api import get_current_user

logger = setup_logger("grade_settings_api")
router = APIRouter()


def get_admin_user(current_user=Depends(get_current_user)):
    """Verify current user is admin"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ admin mới có quyền truy cập grade settings"
        )
    return current_user


# ===============================================
# GET ALL GRADE SETTINGS
# ===============================================

@router.get("")
async def get_all_grade_settings(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    is_active: Optional[bool] = None,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy danh sách tất cả grade settings"""
    try:
        query = db.table("grade_settings").select(
            """
            id,
            subject_id,
            grade_column_config,
            is_active,
            created_at,
            updated_at,
            subjects!inner(id, subject_code, subject_name)
            """
        )
        
        # Filter by is_active if provided
        if is_active is not None:
            query = query.eq("is_active", is_active)
        
        response = query.order("id", desc=False).execute()
        
        return {
            "success": True,
            "message": f"Lấy danh sách grade settings thành công",
            "data": response.data
        }
    except Exception as e:
        logger.error(f"Error getting grade settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách: {str(e)}")


# ===============================================
# GET GRADE SETTINGS BY ID
# ===============================================

@router.get("/{settings_id}")
async def get_grade_settings_by_id(
    settings_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy grade settings theo ID"""
    try:
        response = db.table("grade_settings").select(
            """
            *,
            subjects!inner(id, subject_code, subject_name)
            """
        ).eq("id", settings_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=404,
                detail=f"Không tìm thấy grade settings với ID: {settings_id}"
            )
        
        return {
            "success": True,
            "message": "Lấy grade settings thành công",
            "data": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting grade settings by id: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy grade settings: {str(e)}")


# ===============================================
# GET GRADE SETTINGS BY SUBJECT ID
# ===============================================
# GET GRADE SETTINGS BY SUBJECT ID
# ===============================================

@router.get("/subject/{subject_id}")
async def get_grade_settings_by_subject_id(
    subject_id: int,
    current_user=Depends(get_current_user),  # Changed: Allow all authenticated users (teachers can read)
    db=Depends(get_db)
):
    """Lấy grade settings theo subject_id - Giáo viên có thể đọc để nhập điểm"""
    try:
        response = db.table("grade_settings").select(
            """
            *,
            subjects!inner(id, subject_code, subject_name)
            """
        ).eq("subject_id", subject_id).eq("is_active", True).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=404,
                detail=f"Không tìm thấy grade settings cho môn học ID: {subject_id}"
            )
        
        return {
            "success": True,
            "message": "Lấy grade settings thành công",
            "data": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting grade settings by subject: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy grade settings: {str(e)}")


# ===============================================
# CREATE GRADE SETTINGS
# ===============================================

@router.post("")
async def create_grade_settings(
    settings_data: GradeSettingsCreate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Tạo mới grade settings"""
    try:
        # Kiểm tra subject_id có tồn tại không
        subject_check = db.table("subjects").select("id").eq("id", settings_data.subject_id).execute()
        if not subject_check.data:
            raise HTTPException(
                status_code=404,
                detail=f"Không tìm thấy môn học với ID: {settings_data.subject_id}"
            )
        
        # Kiểm tra grade settings đã tồn tại cho subject này chưa
        existing = db.table("grade_settings").select("id").eq("subject_id", settings_data.subject_id).execute()
        if existing.data:
            raise HTTPException(
                status_code=400,
                detail=f"Grade settings cho môn học ID {settings_data.subject_id} đã tồn tại"
            )
        
        # Tạo mới
        new_settings = {
            "subject_id": settings_data.subject_id,
            "grade_column_config": settings_data.grade_column_config,
            "is_active": settings_data.is_active,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.table("grade_settings").insert(new_settings).execute()
        
        if response.data:
            # Fetch với subject info
            result = db.table("grade_settings").select(
                """
                *,
                subjects!inner(id, subject_code, subject_name)
                """
            ).eq("id", response.data[0]["id"]).execute()
            
            return {
                "success": True,
                "message": "Tạo grade settings thành công",
                "data": result.data[0] if result.data else response.data[0]
            }
        else:
            raise HTTPException(status_code=500, detail="Lỗi khi tạo grade settings")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating grade settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo grade settings: {str(e)}")


# ===============================================
# UPDATE GRADE SETTINGS
# ===============================================

@router.put("/{settings_id}")
async def update_grade_settings(
    settings_id: int,
    settings_data: GradeSettingsUpdate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Cập nhật grade settings"""
    try:
        # Kiểm tra settings có tồn tại không
        existing = db.table("grade_settings").select("*").eq("id", settings_id).execute()
        if not existing.data:
            raise HTTPException(
                status_code=404,
                detail=f"Không tìm thấy grade settings với ID: {settings_id}"
            )
        
        # Chuẩn bị data update
        update_data = {
            "updated_at": datetime.now().isoformat()
        }
        
        if settings_data.grade_column_config is not None:
            update_data["grade_column_config"] = settings_data.grade_column_config
        
        if settings_data.is_active is not None:
            update_data["is_active"] = settings_data.is_active
        
        # Update
        response = db.table("grade_settings").update(update_data).eq("id", settings_id).execute()
        
        if response.data:
            # Fetch với subject info
            result = db.table("grade_settings").select(
                """
                *,
                subjects!inner(id, subject_code, subject_name)
                """
            ).eq("id", settings_id).execute()
            
            return {
                "success": True,
                "message": "Cập nhật grade settings thành công",
                "data": result.data[0] if result.data else response.data[0]
            }
        else:
            raise HTTPException(status_code=500, detail="Lỗi khi cập nhật grade settings")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating grade settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật grade settings: {str(e)}")


# ===============================================
# DELETE GRADE SETTINGS
# ===============================================

@router.delete("/{settings_id}")
async def delete_grade_settings(
    settings_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Xóa grade settings"""
    try:
        # Kiểm tra settings có tồn tại không
        existing = db.table("grade_settings").select("*").eq("id", settings_id).execute()
        if not existing.data:
            raise HTTPException(
                status_code=404,
                detail=f"Không tìm thấy grade settings với ID: {settings_id}"
            )
        
        # Delete
        response = db.table("grade_settings").delete().eq("id", settings_id).execute()
        
        return {
            "success": True,
            "message": "Xóa grade settings thành công",
            "data": existing.data[0]
        }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting grade settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa grade settings: {str(e)}")


# ===============================================
# BULK OPERATIONS
# ===============================================

@router.post("/bulk-create")
async def bulk_create_grade_settings(
    settings_list: List[GradeSettingsCreate],
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Tạo nhiều grade settings cùng lúc"""
    try:
        created_count = 0
        errors = []
        
        for settings_data in settings_list:
            try:
                # Kiểm tra subject_id tồn tại
                subject_check = db.table("subjects").select("id").eq("id", settings_data.subject_id).execute()
                if not subject_check.data:
                    errors.append(f"Subject ID {settings_data.subject_id} không tồn tại")
                    continue
                
                # Kiểm tra đã tồn tại
                existing = db.table("grade_settings").select("id").eq("subject_id", settings_data.subject_id).execute()
                if existing.data:
                    errors.append(f"Grade settings cho subject ID {settings_data.subject_id} đã tồn tại")
                    continue
                
                # Tạo mới
                new_settings = {
                    "subject_id": settings_data.subject_id,
                    "grade_column_config": settings_data.grade_column_config,
                    "is_active": settings_data.is_active,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
                
                db.table("grade_settings").insert(new_settings).execute()
                created_count += 1
                
            except Exception as e:
                errors.append(f"Lỗi khi tạo grade settings cho subject ID {settings_data.subject_id}: {str(e)}")
        
        return {
            "success": True,
            "message": f"Tạo thành công {created_count}/{len(settings_list)} grade settings",
            "data": {
                "created_count": created_count,
                "error_count": len(errors),
                "errors": errors if errors else None
            }
        }
            
    except Exception as e:
        logger.error(f"Error bulk creating grade settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo bulk: {str(e)}")

