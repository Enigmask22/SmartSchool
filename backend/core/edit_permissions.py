"""
Kiểm tra khóa chỉnh sửa điểm / điểm danh theo deadline system_settings
và quyền ưu tiên can_edit_grade / can_edit_attendance trên users (non-admin).
"""

from datetime import datetime, date, timezone, timedelta
from typing import Any, Dict, Optional

from fastapi import HTTPException, status

from core.system_settings import get_setting_value

GRADE_LOCK_DEADLINE_KEY = "grade_lock_deadline"
ATTENDANCE_LOCK_DEADLINE_KEY = "attendance_lock_deadline"


def _vietnam_today() -> date:
    tz = timezone(timedelta(hours=7))
    return datetime.now(tz).date()


def _parse_deadline(value: Optional[str]) -> Optional[date]:
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    try:
        return date.fromisoformat(s[:10])
    except ValueError:
        return None


def _is_past_deadline(deadline: date) -> bool:
    """Quá hạn khi ngày hiện tại (VN) > ngày deadline (vẫn cho sửa trong ngày deadline)."""
    return _vietnam_today() > deadline


def is_grade_edit_locked_for_user(user: Dict[str, Any], db: Optional[Any] = None) -> bool:
    """
    True = user không được sửa điểm (trừ khi BE đã chặn trước đó bằng assert).
    Admin luôn không khóa bởi rule này.
    """
    if user.get("role") == "admin":
        return False
    if user.get("can_edit_grade") is True:
        return False
    raw = get_setting_value(GRADE_LOCK_DEADLINE_KEY, default=None, use_cache=True)
    d = _parse_deadline(raw)
    if d is None:
        return False
    return _is_past_deadline(d)


def is_attendance_edit_locked_for_user(user: Dict[str, Any], db: Optional[Any] = None) -> bool:
    if user.get("role") == "admin":
        return False
    if user.get("can_edit_attendance") is True:
        return False
    raw = get_setting_value(ATTENDANCE_LOCK_DEADLINE_KEY, default=None, use_cache=True)
    d = _parse_deadline(raw)
    if d is None:
        return False
    return _is_past_deadline(d)


def assert_can_edit_grade(user: Dict[str, Any], db: Optional[Any] = None) -> None:
    if is_grade_edit_locked_for_user(user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Đã quá hạn chỉnh sửa điểm theo cấu hình hệ thống hoặc bạn không có quyền.",
        )


def assert_can_edit_attendance(user: Dict[str, Any], db: Optional[Any] = None) -> None:
    if is_attendance_edit_locked_for_user(user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Đã quá hạn chỉnh sửa điểm danh theo cấu hình hệ thống hoặc bạn không có quyền.",
        )


def enrich_user_for_client(user: Dict[str, Any]) -> Dict[str, Any]:
    """Bỏ password_hash và thêm cờ khóa cho client."""
    out = {k: v for k, v in user.items() if k != "password_hash"}
    out["grade_edit_locked"] = is_grade_edit_locked_for_user(user)
    out["attendance_edit_locked"] = is_attendance_edit_locked_for_user(user)
    return out
