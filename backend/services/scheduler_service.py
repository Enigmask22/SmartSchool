"""
Scheduler service để quản lý các tác vụ định kỳ
"""

import asyncio
import schedule
import time
from datetime import datetime, timedelta
from threading import Thread
from typing import Optional

from database.connection import get_db
from utils.logger import setup_logger
from utils.timezone_helper import get_vietnam_time, VIETNAM_TZ

# Initialize logger
logger = setup_logger("scheduler_service")

class SchedulerService:
    """Service quản lý các tác vụ định kỳ"""
    
    def __init__(self):
        self.is_running = False
        self.scheduler_thread: Optional[Thread] = None
        
    def start(self):
        """Khởi động scheduler"""
        if self.is_running:
            logger.warning("Scheduler đã đang chạy")
            return
            
        self.is_running = True
        
        # Đăng ký các tác vụ định kỳ
        self._register_jobs()
        
        # Khởi động thread cho scheduler
        self.scheduler_thread = Thread(target=self._run_scheduler, daemon=True)
        self.scheduler_thread.start()
        
        logger.info("Scheduler service đã khởi động")
    
    def stop(self):
        """Dừng scheduler"""
        self.is_running = False
        schedule.clear()
        logger.info("Scheduler service đã dừng")
    
    def _register_jobs(self):
        """Đăng ký các tác vụ định kỳ"""
        
        # Reset cấu hình số ngày học vào 00:00 chủ nhật hàng tuần
        schedule.every().sunday.at("00:00").do(self._reset_school_days_config)
        
        # Có thể thêm các job khác ở đây
        # schedule.every().day.at("01:00").do(self._cleanup_old_logs)
        # schedule.every().hour.do(self._check_system_health)
        
        logger.info("Đã đăng ký tác vụ reset cấu hình số ngày học vào chủ nhật 00:00")
    
    def _run_scheduler(self):
        """Chạy scheduler trong thread riêng"""
        while self.is_running:
            try:
                schedule.run_pending()
                time.sleep(60)  # Kiểm tra mỗi phút
            except Exception as e:
                logger.error(f"ERROR: Lỗi trong scheduler: {str(e)}")
                time.sleep(60)
    
    def _reset_school_days_config(self):
        """Reset tất cả cấu hình số ngày học về mặc định"""
        try:
            now = get_vietnam_time()
            
            logger.info(f"Bắt đầu reset cấu hình số ngày học - {now.isoformat()}")
            
            # Thực hiện reset bằng cách gọi database trực tiếp
            db = get_db()
            
            # Lấy tất cả config
            configs_response = db.table("school_days_config").select("*").execute()
            
            if not configs_response.data:
                logger.info("Không có cấu hình nào để reset")
                return
            
            reset_count = 0
            
            for config in configs_response.data:
                # Reset current_week_days về default_days_per_week
                update_data = {
                    "current_week_days": config["default_days_per_week"],
                    "updated_at": datetime.now().isoformat()
                }
                
                db.table("school_days_config").update(update_data).eq("id", config["id"]).execute()
                reset_count += 1
                
                logger.info(f"Reset khối {config['grade']}: {config['current_week_days']} → {config['default_days_per_week']} ngày")
            
            logger.info(f"Hoàn thành reset {reset_count} khối về cấu hình mặc định")
            
        except Exception as e:
            logger.error(f"ERROR: Lỗi khi reset cấu hình số ngày học: {str(e)}")
    
    def run_reset_now(self):
        """Chạy reset ngay lập tức (cho testing)"""
        logger.info("Chạy reset cấu hình ngay lập tức (testing)")
        self._reset_school_days_config()
    
    def get_next_reset_time(self) -> dict:
        """Lấy thời gian reset tiếp theo"""
        try:
            now = get_vietnam_time()
            
            # Tính chủ nhật tiếp theo 00:00
            days_until_sunday = (6 - now.weekday()) % 7
            if days_until_sunday == 0:  # Nếu hôm nay là chủ nhật
                days_until_sunday = 7  # Lấy chủ nhật tuần sau
            
            next_sunday = now + timedelta(days=days_until_sunday)
            next_sunday = next_sunday.replace(hour=0, minute=0, second=0, microsecond=0)
            
            return {
                "next_reset": next_sunday.isoformat(),
                "days_remaining": days_until_sunday,
                "hours_remaining": int((next_sunday - now).total_seconds() / 3600),
                "current_time": now.isoformat(),
                "is_running": self.is_running
            }
            
        except Exception as e:
            logger.error(f"ERROR: Lỗi khi tính thời gian reset: {str(e)}")
            return {
                "error": str(e),
                "is_running": self.is_running
            }

# Global scheduler instance
scheduler_service = SchedulerService()

def start_scheduler():
    """Khởi động scheduler service"""
    scheduler_service.start()

def stop_scheduler():
    """Dừng scheduler service"""
    scheduler_service.stop()

def get_scheduler_status():
    """Lấy trạng thái scheduler"""
    return {
        "is_running": scheduler_service.is_running,
        "next_reset": scheduler_service.get_next_reset_time()
    } 