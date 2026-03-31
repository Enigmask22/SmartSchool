"""
API Router cho Score Settings Management
- Admin: Full CRUD (Create, Read, Update, Delete)
- Teachers: Read-only (để lấy cấu hình cột điểm khi nhập điểm)
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Optional, List
from datetime import datetime

from score_settings.models import ScoreSettingsCreate, ScoreSettingsUpdate, ResponseModel
from core.database import get_db
from core.logger import setup_logger
from core.dependencies import get_current_user

logger = setup_logger("score_settings_api")
router = APIRouter()


def get_admin_user(current_user=Depends(get_current_user)):
    """Verify current user is admin"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ admin mới có quyền truy cập score settings"
        )
    return current_user


# ===============================================
# GET ALL SCORE SETTINGS
# ===============================================

@router.get("")
async def get_all_score_settings(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    is_active: Optional[bool] = None,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy danh sách tất cả score settings (từ subjects.score_column_config)"""
    try:
        query = db.table("subjects").select(
            """
            id,
            subject_code,
            subject_name,
            score_column_config,
            is_active,
            created_at,
            updated_at
            """
        )
        
        # Filter by is_active if provided
        if is_active is not None:
            query = query.eq("is_active", is_active)
        
        # Chỉ lấy subjects có score_column_config
        query = query.not_.is_("score_column_config", "null")
        
        response = query.order("id", desc=False).execute()
        
        # Transform data
        transformed_data = []
        for item in response.data:
            transformed_data.append({
                "id": item["id"],  # Dùng subject_id làm id
                "subject_id": item["id"],
                "subject_code": item.get("subject_code"),
                "subject_name": item.get("subject_name"),
                "score_column_config": item.get("score_column_config", {}),
                "is_active": item.get("is_active", True),
                "created_at": item.get("created_at"),
                "updated_at": item.get("updated_at"),
                "subjects": {
                    "id": item["id"],
                    "subject_code": item.get("subject_code"),
                    "subject_name": item.get("subject_name")
                }
            })
        
        return {
            "success": True,
            "message": f"Lấy danh sách score settings thành công",
            "data": transformed_data
        }
    except Exception as e:
        logger.error(f"Error getting score settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách: {str(e)}")


# ===============================================
# GET SCORE SETTINGS BY SUBJECT ID
# ===============================================

@router.get("/{subject_id}")
async def get_score_settings_by_subject_id(
    subject_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Lấy score settings theo subject_id"""
    try:
        response = db.table("subjects").select(
            """
            id,
            subject_code,
            subject_name,
            score_column_config,
            is_active,
            created_at,
            updated_at
            """
        ).eq("id", subject_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=404,
                detail=f"Không tìm thấy môn học với ID: {subject_id}"
            )
        
        subject = response.data[0]
        
        result = {
            "id": subject["id"],
            "subject_id": subject["id"],
            "subject_code": subject.get("subject_code"),
            "subject_name": subject.get("subject_name"),
            "score_column_config": subject.get("score_column_config", {}),
            "is_active": subject.get("is_active", True),
            "created_at": subject.get("created_at"),
            "updated_at": subject.get("updated_at"),
            "subjects": {
                "id": subject["id"],
                "subject_code": subject.get("subject_code"),
                "subject_name": subject.get("subject_name")
            }
        }
        
        return {
            "success": True,
            "message": "Lấy score settings thành công",
            "data": result
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting score settings by subject_id: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy score settings: {str(e)}")


@router.get("/subject/{subject_id}")
async def get_score_settings_by_subject_id_for_teacher(
    subject_id: int,
    current_user=Depends(get_current_user),  # Allow all authenticated users (teachers can read)
    db=Depends(get_db)
):
    """Lấy score settings theo subject_id - Giáo viên có thể đọc để nhập điểm"""
    try:
        response = db.table("subjects").select(
            """
            id,
            subject_code,
            subject_name,
            score_column_config,
            is_active,
            created_at,
            updated_at
            """
        ).eq("id", subject_id).eq("is_active", True).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=404,
                detail=f"Không tìm thấy môn học ID: {subject_id} hoặc môn học không active"
            )
        
        subject = response.data[0]
        
        # Nếu không có score_column_config, trả về empty object
        score_config = subject.get("score_column_config") or {}
        
        result = {
            "id": subject["id"],
            "subject_id": subject["id"],
            "subject_code": subject.get("subject_code"),
            "subject_name": subject.get("subject_name"),
            "score_column_config": score_config,
            "is_active": subject.get("is_active", True),
            "created_at": subject.get("created_at"),
            "updated_at": subject.get("updated_at"),
            "subjects": {
                "id": subject["id"],
                "subject_code": subject.get("subject_code"),
                "subject_name": subject.get("subject_name")
            }
        }
        
        return {
            "success": True,
            "message": "Lấy score settings thành công",
            "data": result
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting score settings by subject: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy score settings: {str(e)}")


# ===============================================
# CREATE SCORE SETTINGS
# ===============================================

@router.post("")
async def create_score_settings(
    settings_data: ScoreSettingsCreate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Tạo/cập nhật score settings (update subjects.score_column_config)"""
    try:
        # Kiểm tra subject_id có tồn tại không
        subject_check = db.table("subjects").select("*").eq("id", settings_data.subject_id).execute()
        if not subject_check.data:
            raise HTTPException(
                status_code=404,
                detail=f"Không tìm thấy môn học với ID: {settings_data.subject_id}"
            )
        
        # Update subjects table với score_column_config
        update_data = {
            "score_column_config": settings_data.score_column_config,
            "updated_at": datetime.now().isoformat()
        }
        
        # Nếu có is_active, có thể cập nhật is_active của subject
        if settings_data.is_active is not None:
            update_data["is_active"] = settings_data.is_active
        
        response = db.table("subjects").update(update_data).eq("id", settings_data.subject_id).execute()
        
        if response.data:
            subject = response.data[0]
            
            result = {
                "id": subject["id"],
                "subject_id": subject["id"],
                "subject_code": subject.get("subject_code"),
                "subject_name": subject.get("subject_name"),
                "score_column_config": subject.get("score_column_config", {}),
                "is_active": subject.get("is_active", True),
                "created_at": subject.get("created_at"),
                "updated_at": subject.get("updated_at"),
                "subjects": {
                    "id": subject["id"],
                    "subject_code": subject.get("subject_code"),
                    "subject_name": subject.get("subject_name")
                }
            }
            
            return {
                "success": True,
                "message": "Tạo/cập nhật score settings thành công",
                "data": result
            }
        else:
            raise HTTPException(status_code=500, detail="Lỗi khi tạo score settings")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating score settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo score settings: {str(e)}")


# ===============================================
# UPDATE SCORE SETTINGS
# ===============================================

@router.put("/{subject_id}")
async def update_score_settings(
    subject_id: int,
    settings_data: ScoreSettingsUpdate,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Cập nhật score settings (update subjects.score_column_config)"""
    try:
        # Kiểm tra subject có tồn tại không
        existing = db.table("subjects").select("*").eq("id", subject_id).execute()
        if not existing.data:
            raise HTTPException(
                status_code=404,
                detail=f"Không tìm thấy môn học với ID: {subject_id}"
            )
        
        # Chuẩn bị data update
        update_data = {
            "updated_at": datetime.now().isoformat()
        }
        
        if settings_data.score_column_config is not None:
            update_data["score_column_config"] = settings_data.score_column_config
        
        if settings_data.is_active is not None:
            update_data["is_active"] = settings_data.is_active
        
        # Update subjects table
        response = db.table("subjects").update(update_data).eq("id", subject_id).execute()
        
        if response.data:
            subject = response.data[0]
            
            result = {
                "id": subject["id"],
                "subject_id": subject["id"],
                "subject_code": subject.get("subject_code"),
                "subject_name": subject.get("subject_name"),
                "score_column_config": subject.get("score_column_config", {}),
                "is_active": subject.get("is_active", True),
                "created_at": subject.get("created_at"),
                "updated_at": subject.get("updated_at"),
                "subjects": {
                    "id": subject["id"],
                    "subject_code": subject.get("subject_code"),
                    "subject_name": subject.get("subject_name")
                }
            }
            
            return {
                "success": True,
                "message": "Cập nhật score settings thành công",
                "data": result
            }
        else:
            raise HTTPException(status_code=500, detail="Lỗi khi cập nhật score settings")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating score settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật score settings: {str(e)}")


# ===============================================
# DELETE SCORE SETTINGS
# ===============================================

@router.delete("/{subject_id}")
async def delete_score_settings(
    subject_id: int,
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Xóa score settings (xóa score_column_config của subject)"""
    try:
        # Kiểm tra subject có tồn tại không
        existing = db.table("subjects").select("*").eq("id", subject_id).execute()
        if not existing.data:
            raise HTTPException(
                status_code=404,
                detail=f"Không tìm thấy môn học với ID: {subject_id}"
            )
        
        # Xóa score_column_config (set về null)
        update_data = {
            "score_column_config": None,
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.table("subjects").update(update_data).eq("id", subject_id).execute()
        
        if response.data:
            subject = response.data[0]
            
            result = {
                "id": subject["id"],
                "subject_id": subject["id"],
                "subject_code": subject.get("subject_code"),
                "subject_name": subject.get("subject_name"),
                "score_column_config": {},  # Đã xóa
                "is_active": subject.get("is_active", True),
                "created_at": subject.get("created_at"),
                "updated_at": subject.get("updated_at")
            }
            
            return {
                "success": True,
                "message": "Xóa score settings thành công",
                "data": result
            }
        else:
            raise HTTPException(status_code=500, detail="Lỗi khi xóa score settings")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting score settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa score settings: {str(e)}")


# ===============================================
# BULK OPERATIONS
# ===============================================

@router.post("/bulk-create")
async def bulk_create_score_settings(
    settings_list: List[ScoreSettingsCreate],
    admin_user=Depends(get_admin_user),
    db=Depends(get_db)
):
    """Tạo nhiều score settings cùng lúc"""
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
                
                # Update subjects table với score_column_config
                update_data = {
                    "score_column_config": settings_data.score_column_config,
                    "updated_at": datetime.now().isoformat()
                }
                
                if settings_data.is_active is not None:
                    update_data["is_active"] = settings_data.is_active
                
                db.table("subjects").update(update_data).eq("id", settings_data.subject_id).execute()
                created_count += 1
                
            except Exception as e:
                errors.append(f"Lỗi khi tạo score settings cho subject ID {settings_data.subject_id}: {str(e)}")
        
        return {
            "success": True,
            "message": f"Tạo thành công {created_count}/{len(settings_list)} score settings",
            "data": {
                "created_count": created_count,
                "error_count": len(errors),
                "errors": errors if errors else None
            }
        }
            
    except Exception as e:
        logger.error(f"Error bulk creating score settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo bulk: {str(e)}")
