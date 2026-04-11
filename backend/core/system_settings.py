"""
System Settings Service
Cung cấp các function tiện ích để lấy và cache system settings
"""

from typing import Optional, Dict
from functools import lru_cache
from datetime import datetime, timedelta
from core.database import get_db
from core.logger import setup_logger

logger = setup_logger("system_settings")

# Cache settings trong memory với TTL
_settings_cache: Dict[str, tuple] = {}
CACHE_TTL = timedelta(minutes=5)  # Cache 5 phút


def get_setting_value(setting_key: str, default: Optional[str] = None, use_cache: bool = True) -> Optional[str]:
    """
    Lấy giá trị của một setting từ database
    
    Args:
        setting_key: Key của setting cần lấy
        default: Giá trị mặc định nếu không tìm thấy
        use_cache: Có sử dụng cache không (mặc định True)
    
    Returns:
        Giá trị của setting hoặc default
    """
    try:
        # Kiểm tra cache
        if use_cache and setting_key in _settings_cache:
            cached_value, cached_time = _settings_cache[setting_key]
            if datetime.now() - cached_time < CACHE_TTL:
                return cached_value
        
        # Lấy từ database
        db = get_db()
        response = db.table("system_settings").select("setting_value").eq("setting_key", setting_key).execute()
        
        if response.data and len(response.data) > 0:
            value = response.data[0]["setting_value"]
            # Lưu vào cache
            _settings_cache[setting_key] = (value, datetime.now())
            return value
        else:
            logger.warning(f"Setting '{setting_key}' not found, using default: {default}")
            return default
            
    except Exception as e:
        logger.error(f"Error getting setting '{setting_key}': {str(e)}")
        return default


def get_current_academic_year(use_cache: bool = True) -> str:
    """
    Lấy năm học hiện tại từ system settings
    
    Returns:
        Năm học hiện tại (VD: "2024-2025")
    """
    return get_setting_value("academic_year", default="2024-2025", use_cache=use_cache)


def get_current_semester(use_cache: bool = True) -> str:
    """
    Lấy học kỳ hiện tại từ system settings
    
    Returns:
        Học kỳ hiện tại (VD: "HK1", "HK2", "HK3")
    """
    return get_setting_value("semester", default="HK1", use_cache=use_cache)


def get_attendance_cutoff_time(use_cache: bool = True) -> str:
    """
    Lấy giờ cutoff điểm danh vào (check-in) từ system settings
    
    Returns:
        Giờ cutoff check-in (VD: "06:45")
    """
    return get_setting_value("attendance_cutoff_time", default="06:45", use_cache=use_cache)


def get_checkout_cutoff_time(use_cache: bool = True) -> str:
    """
    Lấy giờ cutoff điểm danh ra (check-out) từ system settings
    Học sinh phải điểm danh ra sau giờ này để được tính là có mặt đầy đủ
    
    Returns:
        Giờ cutoff check-out (VD: "11:05")
    """
    return get_setting_value("checkout_cutoff_time", default="11:05", use_cache=use_cache)


def get_recognition_cooldown_seconds(use_cache: bool = True) -> int:
    """
    Lấy thời gian chờ giữa các lần nhận diện cho cùng 1 học sinh (giây)
    
    Returns:
        Số giây cooldown (mặc định 5 giây)
    """
    value = get_setting_value("recognition_cooldown_seconds", default="5", use_cache=use_cache)
    try:
        return int(value)
    except (ValueError, TypeError):
        return 5


def clear_settings_cache():
    """
    Xóa cache của settings (dùng khi update settings)
    """
    global _settings_cache
    _settings_cache.clear()
    logger.info("Settings cache cleared")


def get_all_settings(use_cache: bool = False) -> Dict[str, str]:
    """
    Lấy tất cả settings dưới dạng dictionary
    
    Returns:
        Dictionary với key là setting_key và value là setting_value
    """
    try:
        db = get_db()
        response = db.table("system_settings").select("setting_key, setting_value").execute()
        
        if response.data:
            return {item["setting_key"]: item["setting_value"] for item in response.data}
        else:
            return {}
            
    except Exception as e:
        logger.error(f"Error getting all settings: {str(e)}")
        return {}
