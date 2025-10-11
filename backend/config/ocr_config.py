"""
Configuration file cho OCR Service
Quản lý việc switch giữa các OCR model
"""

import os
from typing import Optional


class OCRConfig:
    """
    Cấu hình cho OCR Service
    """
    
    # ============================================
    # CHỌN MODEL TẠI ĐÂY - THAY ĐỔI ĐỂ SWITCH
    # ============================================
    
    # Các tùy chọn: "gemini", "qwen"
    DEFAULT_OCR_MODEL = "qwen"  # <-- THAY ĐỔI TẠI ĐÂY
    
    # Hoặc sử dụng biến môi trường (ưu tiên hơn)
    # export OCR_MODEL=qwen
    
    @classmethod
    def get_ocr_model(cls) -> str:
        """
        Lấy OCR model được cấu hình
        
        Returns:
            Tên model: "gemini" hoặc "qwen"
        """
        # Ưu tiên biến môi trường
        env_model = os.getenv('OCR_MODEL', '').lower()
        if env_model in ['gemini', 'qwen']:
            return env_model
        
        # Fallback về config mặc định
        return cls.DEFAULT_OCR_MODEL
    
    # ============================================
    # GEMINI CONFIG
    # ============================================
    
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'AIzaSyAJLXNgLaKPxTv_rn_iERKxgiUhMPvLlMw')
    GEMINI_MODEL_NAME = "gemini-2.0-flash"
    
    # ============================================
    # QWEN CONFIG (State-of-the-art Vision Language Model)
    # ============================================
    
    # Model path hoặc Hugging Face model ID
    # Qwen2.5-VL-3B: State-of-the-art OCR model (3B params)
    # - Độ chính xác: 93-95% (gần sát Gemini 97%)
    # - Context length: 32K tokens (xử lý 100+ dòng)
    # - VRAM: 6-7GB (perfect cho RTX 4060 8GB)
    # - Speed: 2-3s trên GPU
    # - OCR tiếng Việt xuất sắc
    # Docs: https://huggingface.co/Qwen/Qwen2.5-VL-3B-Instruct
    QWEN_MODEL_PATH = os.getenv('QWEN_MODEL_PATH', 'Qwen/Qwen2.5-VL-3B-Instruct')
    
    # Device: 'cuda', 'cpu', hoặc None (auto-detect)
    # KHUYẾN NGHỊ: 'cuda' để đạt accuracy cao nhất
    # GPU cần: RTX 4060 8GB trở lên
    QWEN_DEVICE = os.getenv('QWEN_DEVICE', 'cuda')  # Default: GPU (khuyến nghị)
    
    # ============================================
    # GENERAL OCR CONFIG
    # ============================================
    
    # Maximum tokens for generation
    MAX_OUTPUT_TOKENS = 4096
    
    # Temperature for generation (0.0 - 1.0)
    # Lower = more deterministic, Higher = more creative
    TEMPERATURE = 0.1
    
    # Logging
    LOG_OCR_RESULTS = True
    
    @classmethod
    def get_model_info(cls) -> dict:
        """
        Lấy thông tin về model đang được sử dụng
        
        Returns:
            Dictionary chứa thông tin model
        """
        current_model = cls.get_ocr_model()
        
        info = {
            'current_model': current_model,
            'available_models': ['gemini', 'qwen']
        }
        
        if current_model == 'gemini':
            info.update({
                'model_name': cls.GEMINI_MODEL_NAME,
                'api_key_set': bool(cls.GEMINI_API_KEY),
                'type': 'cloud'
            })
        elif current_model == 'qwen':
            info.update({
                'model_path': cls.QWEN_MODEL_PATH,
                'device': cls.QWEN_DEVICE or 'auto',
                'type': 'local'
            })
        
        return info
    
    @classmethod
    def print_config(cls):
        """In thông tin cấu hình hiện tại"""
        info = cls.get_model_info()
        print("\n" + "="*50)
        print("OCR SERVICE CONFIGURATION")
        print("="*50)
        print(f"Current Model: {info['current_model'].upper()}")
        print(f"Type: {info.get('type', 'unknown')}")
        
        if info['current_model'] == 'gemini':
            print(f"Model Name: {info.get('model_name')}")
            print(f"API Key Set: {'✓' if info.get('api_key_set') else '✗'}")
        elif info['current_model'] == 'qwen':
            print(f"Model Path: {info.get('model_path')}")
            print(f"Device: {info.get('device')}")
        
        print(f"Available Models: {', '.join(info['available_models'])}")
        print("="*50 + "\n")


# Quick test
if __name__ == "__main__":
    OCRConfig.print_config()
    
    # Example: How to change model
    print("\nTo change OCR model:")
    print("1. Edit backend/config/ocr_config.py:")
    print("   DEFAULT_OCR_MODEL = 'qwen'  # or 'gemini'")
    print("\n2. Or use environment variable:")
    print("   export OCR_MODEL=qwen  # or 'gemini'")
    print("   python main.py")

