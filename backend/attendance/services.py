"""
Attendance Services - Business logic
"""

from datetime import datetime, timezone, timedelta
from core.logger import setup_logger

logger = setup_logger("attendance_service")

def get_vietnam_timezone():
    """Get Vietnam timezone (UTC+7)"""
    return timezone(timedelta(hours=7))

def get_vietnam_now():
    """Get current time in Vietnam timezone"""
    return datetime.now(get_vietnam_timezone())

def get_vietnam_time_string():
    """Get current time as ISO string in Vietnam timezone"""
    return get_vietnam_now().isoformat()

def get_vietnam_date_string():
    """Get current date as ISO string in Vietnam timezone"""
    return get_vietnam_now().date().isoformat()
