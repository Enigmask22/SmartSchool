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
    
    # Các tùy chọn: "gemini" hoặc "vintern"
    DEFAULT_OCR_MODEL = "vintern"  # <-- THAY ĐỔI TẠI ĐÂY
    
    # Hoặc sử dụng biến môi trường (ưu tiên hơn)
    # export OCR_MODEL=vintern
    
    @classmethod
    def get_ocr_model(cls) -> str:
        """
        Lấy OCR model được cấu hình
        
        Returns:
            Tên model: "gemini" hoặc "vintern"
        """
        # Ưu tiên biến môi trường
        env_model = os.getenv('OCR_MODEL', '').lower()
        if env_model in ['gemini', 'vintern']:
            return env_model
        
        # Fallback về config mặc định
        return cls.DEFAULT_OCR_MODEL
    
    # ============================================
    # GEMINI CONFIG
    # ============================================
    
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'AIzaSyAJLXNgLaKPxTv_rn_iERKxgiUhMPvLlMw')
    GEMINI_MODEL_NAME = "gemini-2.0-flash"
    
    # ============================================
    # VINTERN CONFIG (Local Vision Language Model)
    # ============================================
    
    # Model path hoặc Hugging Face model ID
    # Vintern-1B-v3.5: Top model cho OCR tiếng Việt (1B params)
    # - Đặc biệt tốt cho: invoices, legal texts, handwriting, tables
    # - Vi-MTVQA: 41.9% (cao nhất trong class 1B)
    # - Chạy được trên T4 GPU (Google Colab free)
    # Source: https://huggingface.co/5CD-AI/Vintern-1B-v3_5
    VINTERN_MODEL_PATH = os.getenv('VINTERN_MODEL_PATH', '5CD-AI/Vintern-1B-v3_5')
    
    # Device: 'cuda', 'cpu', hoặc None (auto-detect)
    # Auto-detect: Sẽ dùng CUDA nếu có GPU, fallback về CPU nếu không
    # Force CPU: set VINTERN_DEVICE='cpu' (cho testing hoặc hệ thống không có GPU)
    # Force GPU: set VINTERN_DEVICE='cuda' (recommended nếu có GPU)
    VINTERN_DEVICE = os.getenv('VINTERN_DEVICE', 'cuda')  # Default: dùng CPU (thay đổi thành 'cuda' hoặc None để dùng GPU)
    
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
            'available_models': ['gemini', 'vintern']
        }
        
        if current_model == 'gemini':
            info.update({
                'model_name': cls.GEMINI_MODEL_NAME,
                'api_key_set': bool(cls.GEMINI_API_KEY),
                'type': 'cloud'
            })
        elif current_model == 'vintern':
            info.update({
                'model_path': cls.VINTERN_MODEL_PATH,
                'device': cls.VINTERN_DEVICE or 'auto',
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
        elif info['current_model'] == 'vintern':
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
    print("   DEFAULT_OCR_MODEL = 'vintern'")
    print("\n2. Or use environment variable:")
    print("   export OCR_MODEL=vintern")
    print("   python main.py")

