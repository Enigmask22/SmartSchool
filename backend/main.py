"""
Smart School System Backend - Modular Edition
Main entrypoint cho ứng dụng modular
"""

import os
import sys

# Thêm thư mục gốc vào Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app_factory import create_app

# Tạo app instance
app = create_app()

if __name__ == "__main__":
    import uvicorn
    
    # Chạy trên port khác để không conflict với backend cũ
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,  # Port khác với backend cũ (8000)
        reload=True,  # Auto reload khi code thay đổi
        log_level="info"
    )
