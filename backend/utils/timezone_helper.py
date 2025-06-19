#!/usr/bin/env python3
"""
Timezone helper cho Smart School System
Xử lý chuyển đổi timezone Vietnam (UTC+7)
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
import json

# Vietnam timezone UTC+7
VIETNAM_TZ = timezone(timedelta(hours=7))

def get_vietnam_time():
    """Lấy thời gian hiện tại theo múi giờ Việt Nam"""
    return datetime.now(VIETNAM_TZ)

def get_vietnam_time_string():
    """Lấy thời gian hiện tại theo múi giờ Việt Nam dưới dạng ISO string"""
    return get_vietnam_time().isoformat()

def get_vietnam_date_string():
    """Lấy ngày hiện tại theo múi giờ Việt Nam dưới dạng string YYYY-MM-DD"""
    return get_vietnam_time().strftime('%Y-%m-%d')

def convert_utc_to_vietnam(utc_timestamp_str: str) -> str:
    """
    Chuyển đổi UTC timestamp string thành Vietnam time string
    
    Args:
        utc_timestamp_str: UTC timestamp string (ví dụ: "2025-01-19T05:28:30.123456+00:00")
    
    Returns:
        Vietnam time string (ví dụ: "2025-01-19T12:28:30.123456+07:00")
    """
    if not utc_timestamp_str:
        return utc_timestamp_str
    
    try:
        # Parse UTC timestamp
        if utc_timestamp_str.endswith('Z'):
            utc_timestamp_str = utc_timestamp_str[:-1] + '+00:00'
        
        utc_dt = datetime.fromisoformat(utc_timestamp_str)
        
        # Nếu timestamp không có timezone info, assume là UTC
        if utc_dt.tzinfo is None:
            utc_dt = utc_dt.replace(tzinfo=timezone.utc)
        
        # Convert to Vietnam timezone
        vietnam_dt = utc_dt.astimezone(VIETNAM_TZ)
        
        return vietnam_dt.isoformat()
        
    except Exception as e:
        print(f"❌ Error converting timestamp {utc_timestamp_str}: {e}")
        return utc_timestamp_str

def fix_attendance_timestamps(attendance_record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sửa lại timestamps trong attendance record từ UTC thành Vietnam time
    
    Args:
        attendance_record: Dictionary chứa attendance data từ database
    
    Returns:
        Dictionary với timestamps đã được convert thành Vietnam time
    """
    if not attendance_record:
        return attendance_record
    
    # List of timestamp fields cần convert
    timestamp_fields = [
        'check_in_time', 
        'check_out_time', 
        'recognition_time',
        'created_at', 
        'updated_at'
    ]
    
    # Copy record để không modify original
    fixed_record = attendance_record.copy()
    
    for field in timestamp_fields:
        if field in fixed_record and fixed_record[field]:
            fixed_record[field] = convert_utc_to_vietnam(fixed_record[field])
    
    return fixed_record

def fix_student_timestamps(student_record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sửa lại timestamps trong student record từ UTC thành Vietnam time
    """
    if not student_record:
        return student_record
    
    timestamp_fields = ['last_recognized', 'created_at', 'updated_at']
    fixed_record = student_record.copy()
    
    for field in timestamp_fields:
        if field in fixed_record and fixed_record[field]:
            fixed_record[field] = convert_utc_to_vietnam(fixed_record[field])
    
    return fixed_record

def fix_database_response_timestamps(response_data) -> Any:
    """
    Tự động fix timestamps trong response data từ Supabase
    
    Args:
        response_data: Response data từ Supabase (có thể là dict, list, hoặc None)
    
    Returns:
        Data với timestamps đã được convert thành Vietnam time
    """
    if not response_data:
        return response_data
    
    if isinstance(response_data, dict):
        # Nếu là dict đơn lẻ, check xem có phải attendance/student record không
        if 'check_in_time' in response_data or 'check_out_time' in response_data:
            return fix_attendance_timestamps(response_data)
        elif 'student_id' in response_data and 'full_name' in response_data:
            return fix_student_timestamps(response_data)
        else:
            # Recursive fix cho nested objects
            fixed_dict = {}
            for key, value in response_data.items():
                if key in ['check_in_time', 'check_out_time', 'recognition_time', 'created_at', 'updated_at', 'last_recognized'] and value:
                    fixed_dict[key] = convert_utc_to_vietnam(value)
                else:
                    fixed_dict[key] = fix_database_response_timestamps(value)
            return fixed_dict
    
    elif isinstance(response_data, list):
        # Nếu là list, fix từng item
        return [fix_database_response_timestamps(item) for item in response_data]
    
    else:
        # Nếu không phải dict hoặc list, return as-is
        return response_data

def prepare_attendance_data(student_id, status, notes=None, confidence_score=None):
    """
    Chuẩn bị dữ liệu attendance với đúng timezone Việt Nam
    """
    vietnam_time = get_vietnam_time_string()
    
    return {
        "student_id": student_id,
        "date": get_vietnam_date_string(),
        "status": status,
        "check_in_time": vietnam_time,
        "notes": notes,
        "confidence_score": confidence_score,
        "method": "auto",
        "created_at": vietnam_time,
        "updated_at": vietnam_time
    }

def update_attendance_checkout(checkout_time=None):
    """Chuẩn bị dữ liệu cập nhật check-out time"""
    if checkout_time is None:
        checkout_time = get_vietnam_time_string()
    
    return {
        "check_out_time": checkout_time,
        "updated_at": get_vietnam_time_string()
    } 