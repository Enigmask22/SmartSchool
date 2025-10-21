"""
API Router cho School Configuration
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timedelta
from school_config.models import SchoolDaysConfigCreate, SchoolDaysConfigUpdate, ResponseModel
from core.database import get_db
from core.logger import setup_logger

logger = setup_logger("school_config_api")
router = APIRouter()

@router.get("/")
async def get_school_days_config(
    grade: Optional[str] = Query(None, description="Khối học (10, 11, 12)"),
    db=Depends(get_db)
):
    """Lấy cấu hình ngày học"""
    try:
        query = db.table("school_days_config").select("*")
        
        if grade:
            query = query.eq("grade", grade)
        
        response = query.order("grade").execute()
        
        return {
            "success": True,
            "data": response.data or [],
            "total": len(response.data) if response.data else 0
        }
    except Exception as e:
        logger.error(f"Error getting config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.post("/")
async def create_school_days_config(
    config: SchoolDaysConfigCreate,
    db=Depends(get_db)
):
    """Tạo cấu hình ngày học"""
    try:
        if config.grade not in ["10", "11", "12"]:
            raise HTTPException(status_code=400, detail="Khối phải là 10, 11 hoặc 12")
        
        existing = db.table("school_days_config").select("*").eq("grade", config.grade).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail=f"Cấu hình cho khối {config.grade} đã tồn tại")
        
        config_data = {
            "grade": config.grade,
            "default_days_per_week": config.default_days_per_week,
            "temporary_days_per_week": config.temporary_days_per_week,
            "current_week_days": config.default_days_per_week,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.table("school_days_config").insert(config_data).execute()
        
        return {
            "success": True,
            "message": f"Tạo cấu hình cho khối {config.grade} thành công",
            "data": response.data[0] if response.data else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.put("/{config_id}")
async def update_school_days_config(
    config_id: int,
    update_data: dict,
    db=Depends(get_db)
):
    """Cập nhật cấu hình ngày học"""
    try:
        existing = db.table("school_days_config").select("*").eq("id", config_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy cấu hình")
        
        update_dict = {"updated_at": datetime.now().isoformat()}
        
        if "default_days_per_week" in update_data:
            update_dict["default_days_per_week"] = update_data["default_days_per_week"]
        
        if "temporary_days_per_week" in update_data:
            update_dict["temporary_days_per_week"] = update_data["temporary_days_per_week"]
        
        response = db.table("school_days_config").update(update_dict).eq("id", config_id).execute()
        
        return {
            "success": True,
            "message": "Cập nhật cấu hình thành công",
            "data": response.data[0] if response.data else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.post("/initialize")
async def initialize_configs(db=Depends(get_db)):
    """Khởi tạo cấu hình mặc định cho 3 khối"""
    try:
        existing_response = db.table("school_days_config").select("*").execute()
        
        if existing_response.data:
            return {
                "success": True,
                "message": f"Đã có {len(existing_response.data)} cấu hình",
                "data": {"configs": existing_response.data}
            }
        
        default_configs = [
            {"grade": "10", "default_days_per_week": 6, "temporary_days_per_week": None, "current_week_days": 6},
            {"grade": "11", "default_days_per_week": 6, "temporary_days_per_week": None, "current_week_days": 6},
            {"grade": "12", "default_days_per_week": 6, "temporary_days_per_week": None, "current_week_days": 6}
        ]
        
        created_configs = []
        for config_data in default_configs:
            config_data.update({
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            })
            
            response = db.table("school_days_config").insert(config_data).execute()
            if response.data:
                created_configs.extend(response.data)
        
        return {
            "success": True,
            "message": f"Khởi tạo thành công {len(created_configs)} cấu hình",
            "data": {"configs": created_configs}
        }
    except Exception as e:
        logger.error(f"Error initializing configs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.post("/apply-temporary/{grade}")
async def apply_temporary_config(
    grade: str,
    temporary_days: int = None,
    db=Depends(get_db)
):
    """Áp dụng cấu hình tạm thời"""
    try:
        if grade not in ["10", "11", "12"]:
            raise HTTPException(status_code=400, detail="Khối phải là 10, 11 hoặc 12")
        
        config_response = db.table("school_days_config").select("*").eq("grade", grade).execute()
        if not config_response.data:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy cấu hình cho khối {grade}")
        
        config = config_response.data[0]
        days_to_apply = temporary_days or config.get("temporary_days_per_week")
        
        if days_to_apply is None:
            raise HTTPException(status_code=400, detail="Chưa có cấu hình tạm thời")
        
        update_data = {
            "temporary_days_per_week": days_to_apply,
            "current_week_days": days_to_apply,
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.table("school_days_config").update(update_data).eq("grade", grade).execute()
        
        return {
            "success": True,
            "message": f"Áp dụng cấu hình tạm thời {days_to_apply} ngày cho khối {grade} thành công",
            "data": response.data[0] if response.data else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error applying temporary config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.post("/reset-to-default")
async def reset_all_to_default(db=Depends(get_db)):
    """Reset tất cả khối về cấu hình mặc định"""
    try:
        configs_response = db.table("school_days_config").select("*").execute()
        
        if not configs_response.data:
            return {
                "success": True,
                "message": "Không có cấu hình nào để reset",
                "data": {"reset_count": 0}
            }
        
        reset_count = 0
        for config in configs_response.data:
            update_data = {
                "current_week_days": config["default_days_per_week"],
                "updated_at": datetime.now().isoformat()
            }
            
            db.table("school_days_config").update(update_data).eq("id", config["id"]).execute()
            reset_count += 1
        
        return {
            "success": True,
            "message": f"Reset {reset_count} khối về cấu hình mặc định thành công",
            "data": {"reset_count": reset_count}
        }
    except Exception as e:
        logger.error(f"Error resetting to default: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.post("/batch-update")
async def batch_update_configs(
    configs: List[SchoolDaysConfigUpdate],
    grades: List[str] = Query(..., description="Danh sách khối cần cập nhật"),
    db=Depends(get_db)
):
    """Cập nhật cấu hình hàng loạt cho các khối"""
    try:
        logger.info(f"Batch update request: {len(configs)} configs for grades: {grades}")
        
        if len(configs) != len(grades):
            raise HTTPException(status_code=400, detail=f"Số lượng config ({len(configs)}) và grades ({len(grades)}) không khớp")
        
        # Validate grades
        valid_grades = ["10", "11", "12"]
        invalid_grades = [g for g in grades if g not in valid_grades]
        if invalid_grades:
            raise HTTPException(status_code=400, detail=f"Khối không hợp lệ: {invalid_grades}")
        
        results = []
        
        for i, grade in enumerate(grades):
            config = configs[i]
            logger.info(f"Processing grade {grade}: {config.dict()}")
            
            # Validate config
            if config.default_days_per_week is not None and (config.default_days_per_week < 1 or config.default_days_per_week > 7):
                raise HTTPException(status_code=400, detail=f"Số ngày mặc định không hợp lệ cho khối {grade}: {config.default_days_per_week}")
            
            if config.temporary_days_per_week is not None and (config.temporary_days_per_week < 1 or config.temporary_days_per_week > 7):
                raise HTTPException(status_code=400, detail=f"Số ngày tạm thời không hợp lệ cho khối {grade}: {config.temporary_days_per_week}")
            
            # Tìm config hiện tại
            existing = db.table("school_days_config").select("*").eq("grade", grade).execute()
            
            if existing.data:
                # Cập nhật
                config_id = existing.data[0]["id"]
                update_data = {"updated_at": datetime.now().isoformat()}
                
                if config.default_days_per_week is not None:
                    update_data["default_days_per_week"] = config.default_days_per_week
                    update_data["current_week_days"] = config.default_days_per_week  # Update current as well
                
                if config.temporary_days_per_week is not None:
                    update_data["temporary_days_per_week"] = config.temporary_days_per_week
                
                response = db.table("school_days_config").update(update_data).eq("id", config_id).execute()
                if response.data:
                    results.append(response.data[0])
                    logger.info(f"Updated grade {grade}")
                else:
                    logger.error(f"ERROR: Failed to update grade {grade}")
            else:
                # Tạo mới
                if config.default_days_per_week is None:
                    raise HTTPException(status_code=400, detail=f"Số ngày mặc định là bắt buộc cho khối {grade}")
                
                config_data = {
                    "grade": grade,
                    "default_days_per_week": config.default_days_per_week,
                    "temporary_days_per_week": config.temporary_days_per_week,
                    "current_week_days": config.default_days_per_week,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
                
                response = db.table("school_days_config").insert(config_data).execute()
                if response.data:
                    results.append(response.data[0])
                    logger.info(f"Created grade {grade}")
                else:
                    logger.error(f"ERROR: Failed to create grade {grade}")
        
        return {
            "success": True,
            "message": f"Cập nhật cấu hình cho {len(grades)} khối thành công",
            "data": {"updated_configs": results}
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error batch updating configs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/next-sunday-reset")
async def get_next_sunday_reset():
    """Lấy thời gian reset chủ nhật tiếp theo"""
    try:
        now = datetime.now()
        days_until_sunday = (6 - now.weekday()) % 7
        if days_until_sunday == 0:
            days_until_sunday = 7
        
        next_sunday = now + timedelta(days=days_until_sunday)
        next_sunday = next_sunday.replace(hour=0, minute=0, second=0, microsecond=0)
        
        return {
            "success": True,
            "message": "Thời gian reset tiếp theo",
            "data": {
                "next_reset": next_sunday.isoformat(),
                "days_remaining": days_until_sunday,
                "current_time": now.isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error getting next sunday reset: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")
