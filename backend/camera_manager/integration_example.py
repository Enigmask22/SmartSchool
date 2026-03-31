"""
Ví dụ tích hợp Camera Manager với Face Recognition
Script này minh họa cách tự động gửi frames từ camera tới AI service
"""

import asyncio
import base64
import cv2
import time
from typing import Optional
from camera_manager.services import camera_manager, CameraCapture
from camera_manager.models import CameraConfig
from ai_services.services import ai_service
from core.database import get_db

# Global để tránh gọi recognition quá thường xuyên
last_recognition_time = {}
RECOGNITION_INTERVAL = 2.0  # Chỉ nhận dạng mỗi 2 giây


async def process_camera_frame_for_recognition(camera_id: str, frame):
    """
    Callback để xử lý frame từ camera và gửi tới AI service
    
    Args:
        camera_id: ID của camera
        frame: numpy array frame từ camera
    """
    global last_recognition_time
    
    # Kiểm tra cooldown để tránh gọi quá thường xuyên
    current_time = time.time()
    last_time = last_recognition_time.get(camera_id, 0)
    
    if current_time - last_time < RECOGNITION_INTERVAL:
        return  # Skip nếu chưa đủ thời gian
    
    try:
        # Convert frame sang base64
        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        image_base64 = base64.b64encode(buffer).decode('utf-8')
        
        # Lấy database client
        db = get_db()
        
        # Gọi AI service để nhận dạng (threshold thấp hơn cho real-time)
        result = await ai_service.recognize_face(
            image_base64, 
            db, 
            confidence_threshold=0.20  # InsightFace threshold
        )
        
        # Cập nhật thời gian gọi lần cuối
        last_recognition_time[camera_id] = current_time
        
        # Xử lý kết quả
        if result.get('success') and result.get('faces'):
            faces = result['faces']
            recognized = [f for f in faces if f.get('student_id') != 'unknown']
            
            if recognized:
                best_face = max(recognized, key=lambda f: f.get('confidence', 0))
                student_id = best_face['student_id']
                confidence = best_face['confidence']
                
                print(f"📹 Camera {camera_id}: Nhận diện học sinh {student_id} với độ tin cậy {confidence:.2f}")
                
                # Tự động tạo attendance (nếu cần)
                # Có thể gọi attendance API ở đây
                
    except Exception as e:
        print(f"❌ Lỗi xử lý frame từ camera {camera_id}: {e}")


def setup_cameras_with_auto_recognition():
    """
    Setup cameras với auto recognition enabled
    """
    # Camera 1: Điện thoại 1
    camera1_config = CameraConfig(
        camera_id="phone_camera_1",
        name="Camera Điện Thoại 1",
        source="http://192.168.1.100:8080/video",  # Thay bằng IP thật
        location="Cổng vào chính",
        description="Camera điện thoại Android",
        enabled=True,
        fps=15,  # Giảm FPS để tiết kiệm tài nguyên
        width=1280,
        height=720
    )
    
    # Camera 2: Điện thoại 2
    camera2_config = CameraConfig(
        camera_id="phone_camera_2",
        name="Camera Điện Thoại 2",
        source="http://192.168.1.101:8080/video",  # Thay bằng IP thật
        location="Cổng phụ",
        description="Camera điện thoại iPhone",
        enabled=True,
        fps=15,
        width=1280,
        height=720
    )
    
    # Thêm cameras với callback
    camera_manager.add_camera(
        camera1_config, 
        frame_callback=process_camera_frame_for_recognition
    )
    
    camera_manager.add_camera(
        camera2_config,
        frame_callback=process_camera_frame_for_recognition
    )
    
    print("✅ Đã setup 2 cameras với auto recognition")
    
    # In thông tin cameras
    cameras = camera_manager.list_cameras()
    for cam in cameras:
        print(f"📹 {cam.name}: {cam.status.value} - {cam.source}")


async def main():
    """
    Main function để chạy ví dụ
    """
    print("🚀 Khởi động Camera Manager với Auto Face Recognition...")
    
    # Setup cameras
    setup_cameras_with_auto_recognition()
    
    # Giữ script chạy
    print("\n⏳ Đang chạy... (Nhấn Ctrl+C để dừng)")
    try:
        while True:
            await asyncio.sleep(1)
            
            # In status mỗi 10 giây
            cameras = camera_manager.list_cameras()
            for cam in cameras:
                if cam.is_connected:
                    print(f"📹 {cam.name}: Frame count = {cam.frame_count}")
                    
    except KeyboardInterrupt:
        print("\n🛑 Đang dừng...")
        camera_manager.cleanup()
        print("✅ Đã dừng tất cả cameras")


if __name__ == "__main__":
    # Chạy với asyncio
    asyncio.run(main())

