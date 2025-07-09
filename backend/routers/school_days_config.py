"""
Router để quản lý cấu hình số ngày học cho từng khối
"""

from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from database.connection import get_db
from models.schemas import (
    SchoolDaysConfig, SchoolDaysConfigCreate, SchoolDaysConfigUpdate,
    ResponseModel, ListResponse, SchoolDaysConfigBatch
)
from utils.logger import setup_logger
from utils.timezone_helper import get_vietnam_time, VIETNAM_TZ

# Initialize logger
logger = setup_logger("school_days_config")

router = APIRouter(prefix="/school-days-config", tags=["School Days Configuration"])

@router.post("/initialize", response_model=ResponseModel)
async def initialize_configs(db: Client = Depends(get_db)):
    """Khởi tạo cấu hình mặc định cho 3 khối nếu chưa có"""
    try:
        logger.info("Initializing school days configs...")
        
        # Kiểm tra xem đã có config chưa
        existing_response = db.table("school_days_config").select("*").execute()
        
        if existing_response.data:
            logger.info(f"Found {len(existing_response.data)} existing configs")
            return ResponseModel(
                success=True,
                message=f"Đã có {len(existing_response.data)} cấu hình",
                data={"configs": existing_response.data}
            )
        
        # Tạo cấu hình mặc định cho 3 khối
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
                logger.info(f"Created config for grade {config_data['grade']}")
        
        return ResponseModel(
            success=True,
            message=f"Khởi tạo thành công {len(created_configs)} cấu hình",
            data={"configs": created_configs}
        )
        
    except Exception as e:
        logger.error(f"ERROR: Error initializing configs: {str(e)}")
        # If table doesn't exist, provide helpful message
        if "relation" in str(e) and "does not exist" in str(e):
            return ResponseModel(
                success=False,
                message="Bảng school_days_config chưa tồn tại. Vui lòng chạy SQL script để tạo bảng.",
                data={"error": str(e)}
            )
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/", response_model=ListResponse)
async def get_school_days_configs(
    grade: Optional[str] = Query(None, description="Khối học (10, 11, 12)"),
    db: Client = Depends(get_db)
):
    """Lấy danh sách cấu hình số ngày học"""
    try:
        query = db.table("school_days_config").select("*")
        
        if grade:
            query = query.eq("grade", grade)
        
        response = query.order("grade").execute()
        
        return ListResponse(
            success=True,
            data=response.data or [],
            total=len(response.data) if response.data else 0,
            page=1,
            page_size=len(response.data) if response.data else 0
        )
        
    except Exception as e:
        logger.error(f"ERROR: Error getting school days configs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.post("/", response_model=ResponseModel)
async def create_school_days_config(
    config: SchoolDaysConfigCreate,
    db: Client = Depends(get_db)
):
    """Tạo cấu hình số ngày học mới"""
    try:
        # Kiểm tra khối hợp lệ
        if config.grade not in ["10", "11", "12"]:
            raise HTTPException(status_code=400, detail="Khối phải là 10, 11 hoặc 12")
        
        # Kiểm tra đã tồn tại chưa
        existing = db.table("school_days_config").select("*").eq("grade", config.grade).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail=f"Cấu hình cho khối {config.grade} đã tồn tại")
        
        # Tạo mới
        config_data = {
            "grade": config.grade,
            "default_days_per_week": config.default_days_per_week,
            "temporary_days_per_week": config.temporary_days_per_week,
            "current_week_days": config.default_days_per_week,  # Mặc định bằng default
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.table("school_days_config").insert(config_data).execute()
        
        return ResponseModel(
            success=True,
            message=f"Tạo cấu hình cho khối {config.grade} thành công",
            data=response.data[0] if response.data else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error creating school days config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.put("/{config_id}", response_model=ResponseModel)
async def update_school_days_config(
    config_id: int,
    config: SchoolDaysConfigUpdate,
    db: Client = Depends(get_db)
):
    """Cập nhật cấu hình số ngày học"""
    try:
        # Kiểm tra tồn tại
        existing = db.table("school_days_config").select("*").eq("id", config_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy cấu hình")
        
        # Tạo dữ liệu cập nhật
        update_data = {"updated_at": datetime.now().isoformat()}
        
        if config.default_days_per_week is not None:
            update_data["default_days_per_week"] = config.default_days_per_week
        
        if config.temporary_days_per_week is not None:
            update_data["temporary_days_per_week"] = config.temporary_days_per_week
        
        response = db.table("school_days_config").update(update_data).eq("id", config_id).execute()
        
        return ResponseModel(
            success=True,
            message="Cập nhật cấu hình thành công",
            data=response.data[0] if response.data else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error updating school days config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.post("/batch-update", response_model=ResponseModel)
async def batch_update_configs(
    configs: List[SchoolDaysConfigUpdate],
    grades: List[str] = Query(..., description="Danh sách khối cần cập nhật"),
    db: Client = Depends(get_db)
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
        
        return ResponseModel(
            success=True,
            message=f"Cập nhật cấu hình cho {len(grades)} khối thành công",
            data={"updated_configs": results}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error batch updating configs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.post("/apply-temporary/{grade}", response_model=ResponseModel)
async def apply_temporary_config(
    grade: str,
    temporary_days: int = None,
    db: Client = Depends(get_db)
):
    """Áp dụng cấu hình tạm thời cho tuần hiện tại"""
    try:
        if grade not in ["10", "11", "12"]:
            raise HTTPException(status_code=400, detail="Khối phải là 10, 11 hoặc 12")
        
        # Lấy cấu hình hiện tại
        config_response = db.table("school_days_config").select("*").eq("grade", grade).execute()
        if not config_response.data:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy cấu hình cho khối {grade}")
        
        config = config_response.data[0]
        
        # Ưu tiên temporary_days từ parameter, không có thì lấy từ database
        days_to_apply = temporary_days or config["temporary_days_per_week"]
        
        if days_to_apply is None:
            raise HTTPException(status_code=400, detail="Chưa có cấu hình tạm thời")
        
        if days_to_apply < 1 or days_to_apply > 7:
            raise HTTPException(status_code=400, detail="Số ngày tạm thời phải từ 1-7")
        
        # Update cả temporary_days_per_week và current_week_days
        update_data = {
            "temporary_days_per_week": days_to_apply,  # Lưu temporary để có thể dùng lại
            "current_week_days": days_to_apply,
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.table("school_days_config").update(update_data).eq("grade", grade).execute()
        
        return ResponseModel(
            success=True,
            message=f"Áp dụng cấu hình tạm thời {days_to_apply} ngày cho khối {grade} thành công",
            data=response.data[0] if response.data else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Error applying temporary config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.post("/reset-to-default", response_model=ResponseModel)
async def reset_all_to_default(db: Client = Depends(get_db)):
    """Reset tất cả khối về cấu hình mặc định - dùng cho scheduler chủ nhật"""
    try:
        # Lấy tất cả config
        configs_response = db.table("school_days_config").select("*").execute()
        
        if not configs_response.data:
            return ResponseModel(
                success=True,
                message="Không có cấu hình nào để reset",
                data={"reset_count": 0}
            )
        
        reset_count = 0
        
        for config in configs_response.data:
            # Reset current_week_days về default_days_per_week
            update_data = {
                "current_week_days": config["default_days_per_week"],
                "updated_at": datetime.now().isoformat()
            }
            
            db.table("school_days_config").update(update_data).eq("id", config["id"]).execute()
            reset_count += 1
        
        return ResponseModel(
            success=True,
            message=f"Reset {reset_count} khối về cấu hình mặc định thành công",
            data={"reset_count": reset_count}
        )
        
    except Exception as e:
        logger.error(f"ERROR: Error resetting to default: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/next-sunday-reset", response_model=ResponseModel)
async def get_next_sunday_reset():
    """Lấy thời gian reset chủ nhật tiếp theo"""
    try:
        now = get_vietnam_time()
        
        # Tính chủ nhật tiếp theo 00:00
        days_until_sunday = (6 - now.weekday()) % 7
        if days_until_sunday == 0:  # Nếu hôm nay là chủ nhật
            days_until_sunday = 7  # Lấy chủ nhật tuần sau
        
        next_sunday = now + timedelta(days=days_until_sunday)
        next_sunday = next_sunday.replace(hour=0, minute=0, second=0, microsecond=0)
        
        return ResponseModel(
            success=True,
            message="Thời gian reset tiếp theo",
            data={
                "next_reset": next_sunday.isoformat(),
                "days_remaining": days_until_sunday,
                "current_time": now.isoformat()
            }
        )
        
    except Exception as e:
        logger.error(f"ERROR: Error getting next sunday reset: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}") 