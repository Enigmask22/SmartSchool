"""
OCR Factory để quản lý và switch giữa các OCR service
Hỗ trợ: Gemini Vision API, VinternVL, và các model khác
"""

import os
from enum import Enum
from typing import Optional, Union

from core.logger import setup_logger

logger = setup_logger("ocr_factory")


class OCRModel(Enum):
    """Enum định nghĩa các OCR model có sẵn"""
    GEMINI = "gemini"
    QWEN = "qwen"
    OPENROUTER = "openrouter"
    # Có thể thêm model khác nếu cần


class OCRFactory:
    """
    Factory class để tạo và quản lý OCR services
    Cho phép switch giữa các model khác nhau
    
    Note: DEFAULT_MODEL được đọc từ config.ocr_config.OCRConfig
    Thay đổi config tại: backend/config/ocr_config.py
    """
    
    _instances = {}  # Cache instances của mỗi service
    
    @classmethod
    def _get_default_model(cls) -> OCRModel:
        """
        Lấy default model từ environment variable OCR_MODEL
        
        Returns:
            OCRModel enum
        """
        # Đọc từ environment variable
        ocr_model_env = os.getenv('OCR_MODEL', 'qwen').lower()
        
        try:
            model = OCRModel(ocr_model_env)
            logger.info(f"Using OCR model from environment: {model.value}")
            return model
        except ValueError:
            logger.warning(f"Invalid OCR_MODEL '{ocr_model_env}', defaulting to QWEN")
            return OCRModel.QWEN
    
    @classmethod
    def get_ocr_service(cls, model: Optional[Union[OCRModel, str]] = None):
        """
        Lấy OCR service theo model được chỉ định
        
        Args:
            model: Model muốn sử dụng (OCRModel enum hoặc string)
                   Nếu None, sẽ dùng DEFAULT_MODEL
                   
        Returns:
            OCR service instance tương ứng
            
        Examples:
            # Sử dụng model mặc định
            service = OCRFactory.get_ocr_service()
            
            # Chỉ định model cụ thể
            service = OCRFactory.get_ocr_service(OCRModel.GEMINI)
            service = OCRFactory.get_ocr_service("gemini")
            
            # Switch sang Qwen2.5-VL
            service = OCRFactory.get_ocr_service(OCRModel.QWEN)
            service = OCRFactory.get_ocr_service("qwen")
        """
        # Xử lý model parameter
        if model is None:
            # Đọc từ OCRConfig (ưu tiên env var, sau đó config file)
            model = cls._get_default_model()
            logger.info(f"Using default OCR model from config: {model.value}")
        elif isinstance(model, str):
            try:
                model = OCRModel(model.lower())
            except ValueError:
                logger.error(f"Invalid model name: {model}, using default from config")
                model = cls._get_default_model()
        
        # Return cached instance nếu có
        if model in cls._instances:
            logger.info(f"Returning cached OCR service: {model.value}")
            return cls._instances[model]
        
        # Tạo instance mới
        logger.info(f"Creating new OCR service: {model.value}")
        
        if model == OCRModel.GEMINI:
            from .gemini_ocr_service import GeminiOCRService
            service = GeminiOCRService()
        elif model == OCRModel.QWEN:
            from .qwen_ocr_service import QwenOCRService
            # Auto-detect device (CUDA if available, else CPU)
            device = None  # Let QwenOCRService auto-detect
            service = QwenOCRService(device=device)
        elif model == OCRModel.OPENROUTER:
            from .openrouter_ocr_service import OpenRouterOCRService
            service = OpenRouterOCRService()
        else:
            raise ValueError(f"Unsupported OCR model: {model}")
        
        # Cache instance
        cls._instances[model] = service
        return service
    
    @classmethod
    def set_default_model(cls, model: Union[OCRModel, str]):
        """
        Đặt model mặc định cho factory
        
        DEPRECATED: Thay đổi model tại backend/config/ocr_config.py
        hoặc sử dụng biến môi trường OCR_MODEL
        
        Args:
            model: Model muốn đặt làm mặc định
        """
        logger.warning(
            "set_default_model() is deprecated. "
            "Please change DEFAULT_OCR_MODEL in backend/config/ocr_config.py "
            "or set OCR_MODEL environment variable."
        )
    
    @classmethod
    def clear_cache(cls):
        """Clear tất cả cached instances"""
        cls._instances.clear()
        logger.info("OCR service cache cleared")
    
    @classmethod
    def get_available_models(cls) -> list:
        """
        Lấy danh sách các model có sẵn
        
        Returns:
            List of available model names
        """
        return [model.value for model in OCRModel]


# Convenience function - tương thích với code cũ
def get_ocr_service(model: Optional[Union[OCRModel, str]] = None):
    """
    Convenience function để lấy OCR service
    Tương thích với code cũ: from services.ocr_service import get_ocr_service
    
    Args:
        model: Model muốn sử dụng (optional)
        
    Returns:
        OCR service instance
        
    Examples:
        # Code cũ vẫn hoạt động
        from services.ocr_factory import get_ocr_service
        service = get_ocr_service()
        
        # Hoặc chỉ định model
        service = get_ocr_service("qwen")
        service = get_ocr_service("gemini")
    """
    return OCRFactory.get_ocr_service(model)


# Example usage và config
if __name__ == "__main__":
    print("Available OCR models:", OCRFactory.get_available_models())
    
    # Test Gemini
    print("\n=== Testing Gemini OCR ===")
    gemini_service = OCRFactory.get_ocr_service(OCRModel.GEMINI)
    print(f"Service type: {type(gemini_service).__name__}")
    
    # Test Qwen2.5-VL
    print("\n=== Testing Qwen2.5-VL OCR ===")
    qwen_service = OCRFactory.get_ocr_service(OCRModel.QWEN)
    print(f"Service type: {type(qwen_service).__name__}")
    
    # Test default
    print("\n=== Testing Default OCR ===")
    default_service = get_ocr_service()
    print(f"Default service type: {type(default_service).__name__}")

