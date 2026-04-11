"""
Camera Manager Service
Quản lý nhiều camera và capture frames từ chúng
"""

import cv2
import threading
import time
import base64
import numpy as np
from typing import Dict, Optional, Callable
from datetime import datetime
import logging
import os
from enum import Enum

from camera_manager.models import CameraConfig, CameraInfo, CameraStatus

logger = logging.getLogger(__name__)

# Suppress FFmpeg warnings (overread, etc.) - chỉ hiển thị errors
os.environ['OPENCV_FFMPEG_LOGLEVEL'] = '-8'  # Only show errors, hide warnings
os.environ['OPENCV_LOG_LEVEL'] = 'ERROR'  # Suppress OpenCV verbose logging


class CameraCapture:
    """Class để capture từ một camera cụ thể"""
    
    def __init__(self, config: CameraConfig, frame_callback: Optional[Callable] = None):
        self.config = config
        self.frame_callback = frame_callback
        self.cap: Optional[cv2.VideoCapture] = None
        self.running = False
        self.thread: Optional[threading.Thread] = None
        self.status = CameraStatus.INACTIVE
        self.last_frame_time = None
        self.frame_count = 0
        self.error_message = None
        self.current_frame = None
        self.width = None
        self.height = None
        self.lock = threading.Lock()  # Lock để thread-safe access vào current_frame
        
    def _build_camera_url(self) -> str:
        """Xây dựng URL camera từ config - chỉ dùng /video path"""
        source = self.config.source.strip()
        
        # Nếu là số, dùng làm index (webcam local)
        if source.isdigit():
            return int(source)
        
        # Đảm bảo URL luôn có /video path
        if "://" in source:
            protocol = source.split("://")[0]
            url_part = source.split("://")[1]
            
            # Tách phần host:port và path nếu có
            if "/" in url_part:
                host_port = url_part.split("/")[0]
                # Luôn dùng /video, bỏ path cũ
                url_part = host_port + "/video"
            else:
                # Không có path, thêm /video
                url_part = url_part.rstrip("/") + "/video"
            
            source = f"{protocol}://{url_part}"
        elif ":" in source and "/" not in source:
            # Format: IP:port (không có protocol và path)
            # Thêm http:// và /video
            source = f"http://{source}/video"
        
        # Nếu là IP camera với authentication
        if self.config.username and self.config.password:
            # Tách protocol và URL
            if "://" in source:
                protocol = source.split("://")[0]
                url_part = source.split("://")[1]
                # Format: http://username:password@ip:port/video
                auth_url = f"{protocol}://{self.config.username}:{self.config.password}@{url_part}"
                return auth_url
            else:
                # Nếu không có protocol, thêm http://
                return f"http://{self.config.username}:{self.config.password}@{source}"
        
        logger.info(f"🔗 Camera URL: {source}")
        return source
    
    def start(self):
        """Bắt đầu capture từ camera"""
        if self.running:
            logger.warning(f"Camera {self.config.camera_id} đã đang chạy")
            return
        
        self.status = CameraStatus.CONNECTING
        logger.info(f"🔌 Đang kết nối camera {self.config.camera_id} từ {self.config.source}")
        
        try:
            camera_url = self._build_camera_url()
            logger.info(f"🔗 Đang thử kết nối với URL: {camera_url}")
            
            self.cap = cv2.VideoCapture(camera_url)
            
            if not self.cap or not self.cap.isOpened():
                raise Exception(f"Không thể mở camera từ {self.config.source}. Hãy kiểm tra:\n- App IP Webcam đang chạy\n- URL đúng format: http://IP:port/video\n- Camera và máy tính cùng WiFi")
            
            # Set properties
            if self.config.width:
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.config.width)
            if self.config.height:
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.config.height)
            self.cap.set(cv2.CAP_PROP_FPS, self.config.fps)
            
            # Đọc frame đầu tiên để kiểm tra
            ret, frame = self.cap.read()
            if not ret:
                raise Exception("Không thể đọc frame từ camera")
            
            self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            self.status = CameraStatus.ACTIVE
            self.running = True
            self.error_message = None
            
            # Bắt đầu thread capture
            self.thread = threading.Thread(target=self._capture_loop, daemon=True)
            self.thread.start()
            
            logger.info(f"✅ Camera {self.config.camera_id} đã kết nối thành công ({self.width}x{self.height} @ {self.config.fps}fps)")
            
        except Exception as e:
            self.status = CameraStatus.ERROR
            self.error_message = str(e)
            self.running = False
            logger.error(f"❌ Lỗi kết nối camera {self.config.camera_id}: {e}")
            if self.cap:
                self.cap.release()
                self.cap = None
            raise
    
    def stop(self):
        """Dừng capture từ camera"""
        if not self.running:
            return
        
        logger.info(f"🛑 Dừng camera {self.config.camera_id}")
        self.running = False
        
        # Release VideoCapture TRƯỚC để thread có thể thoát khỏi cv2.read()
        if self.cap:
            try:
                self.cap.release()
            except Exception as e:
                logger.warning(f"Error releasing camera {self.config.camera_id}: {e}")
            self.cap = None
        
        # Sau đó join thread với timeout ngắn hơn
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=1.0)
            if self.thread.is_alive():
                logger.warning(f"⚠️ Thread camera {self.config.camera_id} không thể dừng trong 1s, bỏ qua...")
        
        self.status = CameraStatus.INACTIVE
        self.current_frame = None
        logger.info(f"✅ Camera {self.config.camera_id} đã dừng")
    
    def _capture_loop(self):
        """Loop để capture frames liên tục"""
        frame_interval = 1.0 / self.config.fps
        
        while self.running:
            try:
                # Kiểm tra running ngay từ đầu
                if not self.running:
                    break
                
                start_time = time.time()
                
                if not self.cap or not self.cap.isOpened():
                    self.status = CameraStatus.ERROR
                    self.error_message = "Camera đã bị ngắt kết nối"
                    logger.error(f"❌ Camera {self.config.camera_id} bị ngắt kết nối")
                    break
                
                # Kiểm tra lại trước khi read (cv2.read() có thể block)
                if not self.running:
                    break
                
                ret, frame = self.cap.read()
                
                # Kiểm tra running sau khi read
                if not self.running:
                    break
                
                if not ret:
                    # Chỉ log khi status thay đổi từ ACTIVE sang ERROR (tránh spam logs)
                    previous_status = self.status
                    self.status = CameraStatus.ERROR
                    self.error_message = "Không thể đọc frame"
                    
                    # Chỉ log khi thực sự có vấn đề (status mới chuyển sang ERROR)
                    if previous_status != CameraStatus.ERROR:
                        logger.warning(f"⚠️ Camera {self.config.camera_id} không đọc được frame")
                    # Nếu đã ở trạng thái ERROR rồi thì không log nữa (tránh spam)
                    
                    # Sleep ngắn hơn để retry nhanh hơn (giảm từ 0.1s xuống 0.05s)
                    for _ in range(5):  # 5 x 0.01s = 0.05s
                        if not self.running:
                            break
                        time.sleep(0.01)
                    continue
                
                # Update frame info
                self.current_frame = frame.copy()
                self.last_frame_time = datetime.now()
                self.frame_count += 1
                self.status = CameraStatus.ACTIVE
                self.error_message = None
                
                # Callback nếu có
                if self.frame_callback:
                    try:
                        self.frame_callback(self.config.camera_id, frame)
                    except Exception as e:
                        logger.error(f"Error in frame callback for camera {self.config.camera_id}: {e}")
                
                # Điều chỉnh FPS - sleep ngắn và kiểm tra running
                elapsed = time.time() - start_time
                sleep_time = max(0, frame_interval - elapsed)
                if sleep_time > 0:
                    # Chia sleep thành các khoảng nhỏ để có thể stop nhanh hơn
                    sleep_chunks = int(sleep_time * 100)  # Chia thành 10ms chunks
                    for _ in range(sleep_chunks):
                        if not self.running:
                            break
                        time.sleep(0.01)
                    # Sleep phần còn lại
                    if self.running:
                        remaining = sleep_time - (sleep_chunks * 0.01)
                        if remaining > 0:
                            time.sleep(remaining)
                
            except Exception as e:
                self.status = CameraStatus.ERROR
                self.error_message = str(e)
                logger.error(f"❌ Lỗi trong capture loop camera {self.config.camera_id}: {e}")
                # Sleep ngắn hơn khi lỗi
                for _ in range(100):  # 100 x 0.01s = 1s
                    if not self.running:
                        break
                    time.sleep(0.01)
    
    def get_frame(self) -> Optional[np.ndarray]:
        """Lấy frame hiện tại (thread-safe)"""
        with self.lock:
            if self.current_frame is not None:
                try:
                    return self.current_frame.copy()
                except Exception as e:
                    logger.error(f"Error copying frame: {e}")
                    return None
            return None
    
    def get_frame_base64(self) -> Optional[str]:
        """Lấy frame hiện tại dưới dạng base64"""
        frame = self.get_frame()
        if frame is None:
            return None
        
        try:
            # Encode frame thành JPEG
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            image_base64 = base64.b64encode(buffer).decode('utf-8')
            return image_base64
        except Exception as e:
            logger.error(f"Error encoding frame to base64: {e}")
            return None
    
    def get_info(self) -> CameraInfo:
        """Lấy thông tin camera"""
        return CameraInfo(
            camera_id=self.config.camera_id,
            name=self.config.name,
            source=self.config.source,
            location=self.config.location,
            status=self.status,
            enabled=self.config.enabled,
            fps=self.config.fps,
            is_connected=self.running and self.cap is not None and self.cap.isOpened(),
            last_frame_time=self.last_frame_time,
            frame_count=self.frame_count,
            error_message=self.error_message,
            width=self.width,
            height=self.height
        )


class CameraManager:
    """Manager để quản lý nhiều camera"""
    
    def __init__(self):
        self.cameras: Dict[str, CameraCapture] = {}
        self.frame_callbacks: Dict[str, Callable] = {}
        self.lock = threading.Lock()
        logger.info("📹 CameraManager initialized")
    
    def add_camera(self, config: CameraConfig, frame_callback: Optional[Callable] = None) -> bool:
        """Thêm camera mới"""
        with self.lock:
            if config.camera_id in self.cameras:
                logger.warning(f"Camera {config.camera_id} đã tồn tại")
                return False
            
            camera_capture = CameraCapture(config, frame_callback)
            self.cameras[config.camera_id] = camera_capture
            
            if config.enabled:
                try:
                    camera_capture.start()
                except Exception as e:
                    logger.error(f"Không thể start camera {config.camera_id}: {e}")
            
            logger.info(f"✅ Đã thêm camera {config.camera_id}: {config.name}")
            return True
    
    def remove_camera(self, camera_id: str) -> bool:
        """Xóa camera - thread-safe"""
        with self.lock:
            if camera_id not in self.cameras:
                logger.warning(f"Camera {camera_id} không tồn tại")
                return False
            
            camera = self.cameras[camera_id]
            camera_id_to_remove = camera_id
        
        # Stop camera bên ngoài lock để tránh deadlock nếu stop() block lâu
        try:
            camera.stop()
        except Exception as e:
            logger.error(f"Error stopping camera {camera_id_to_remove}: {e}")
        
        # Xóa khỏi dict sau khi stop
        with self.lock:
            if camera_id_to_remove in self.cameras:
                del self.cameras[camera_id_to_remove]
            
            if camera_id_to_remove in self.frame_callbacks:
                del self.frame_callbacks[camera_id_to_remove]
        
        logger.info(f"✅ Đã xóa camera {camera_id_to_remove}")
        return True
    
    def update_camera(self, camera_id: str, config: CameraConfig) -> bool:
        """Cập nhật cấu hình camera"""
        with self.lock:
            if camera_id not in self.cameras:
                logger.warning(f"Camera {camera_id} không tồn tại")
                return False
            
            old_camera = self.cameras[camera_id]
            was_running = old_camera.running
            
            # Stop camera cũ
            old_camera.stop()
            
            # Tạo camera mới với config mới
            frame_callback = self.frame_callbacks.get(camera_id)
            new_camera = CameraCapture(config, frame_callback)
            self.cameras[camera_id] = new_camera
            
            # Start lại nếu đang chạy
            if was_running or config.enabled:
                try:
                    new_camera.start()
                except Exception as e:
                    logger.error(f"Không thể start camera {camera_id} sau khi update: {e}")
            
            logger.info(f"✅ Đã cập nhật camera {camera_id}")
            return True
    
    def start_camera(self, camera_id: str) -> bool:
        """Bắt đầu camera"""
        with self.lock:
            if camera_id not in self.cameras:
                logger.warning(f"Camera {camera_id} không tồn tại")
                return False
            
            camera = self.cameras[camera_id]
            if camera.running:
                logger.warning(f"Camera {camera_id} đã đang chạy")
                return True
            
            try:
                camera.start()
                return True
            except Exception as e:
                logger.error(f"Không thể start camera {camera_id}: {e}")
                return False
    
    def stop_camera(self, camera_id: str) -> bool:
        """Dừng camera"""
        with self.lock:
            if camera_id not in self.cameras:
                logger.warning(f"Camera {camera_id} không tồn tại")
                return False
            
            camera = self.cameras[camera_id]
            camera.stop()
            return True
    
    def get_camera(self, camera_id: str) -> Optional[CameraCapture]:
        """Lấy camera object"""
        with self.lock:
            return self.cameras.get(camera_id)
    
    def get_camera_frame(self, camera_id: str) -> Optional[np.ndarray]:
        """Lấy frame từ camera"""
        camera = self.get_camera(camera_id)
        if camera:
            return camera.get_frame()
        return None
    
    def get_camera_frame_base64(self, camera_id: str) -> Optional[str]:
        """Lấy frame từ camera dưới dạng base64"""
        camera = self.get_camera(camera_id)
        if camera:
            return camera.get_frame_base64()
        return None
    
    def list_cameras(self) -> list[CameraInfo]:
        """Lấy danh sách tất cả camera"""
        with self.lock:
            return [camera.get_info() for camera in self.cameras.values()]
    
    def get_camera_info(self, camera_id: str) -> Optional[CameraInfo]:
        """Lấy thông tin camera"""
        camera = self.get_camera(camera_id)
        if camera:
            return camera.get_info()
        return None
    
    def set_frame_callback(self, camera_id: str, callback: Callable):
        """Đặt callback cho frame từ camera"""
        if camera_id not in self.cameras:
            logger.warning(f"Camera {camera_id} không tồn tại")
            return
        
        self.frame_callbacks[camera_id] = callback
        # Cập nhật callback cho camera đang chạy
        self.cameras[camera_id].frame_callback = callback
    
    def cleanup(self):
        """Dọn dẹp tất cả camera - non-blocking"""
        try:
            # Lấy danh sách camera IDs trước để tránh deadlock
            with self.lock:
                camera_ids = list(self.cameras.keys())
            
            # Stop tất cả cameras (không cần lock ở đây vì stop() đã thread-safe)
            for camera_id in camera_ids:
                try:
                    self.remove_camera(camera_id)
                except Exception as e:
                    logger.error(f"Error removing camera {camera_id} during cleanup: {e}")
            
            logger.info("🧹 Đã cleanup tất cả camera")
        except Exception as e:
            logger.error(f"Error in camera cleanup: {e}")


# Global instance
camera_manager = CameraManager()

