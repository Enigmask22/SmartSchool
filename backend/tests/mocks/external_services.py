"""
Mock implementations for external services
Used in unit tests to avoid API calls and costs
"""
from unittest.mock import MagicMock, AsyncMock
from typing import Optional, Dict, Any


class MockGeminiService:
    """Mock Google Gemini API for testing feedback generation"""
    
    def __init__(self, should_fail: bool = False, timeout: bool = False):
        self.should_fail = should_fail
        self.timeout = timeout
        self.call_count = 0
    
    async def call_gemini_api(self, prompt: str) -> str:
        """Mock API call"""
        self.call_count += 1
        if self.timeout:
            raise TimeoutError("Gemini API timeout (mocked)")
        if self.should_fail:
            raise Exception("Gemini API error (mocked)")
        return "Học sinh có tiến độ học tập tốt. (Mocked response)"
    
    def reset(self):
        """Reset mock state"""
        self.call_count = 0


class MockInsightFaceService:
    """Mock Face Recognition Service using InsightFace"""
    
    def __init__(self, recognition_data: Optional[Dict[str, Any]] = None, should_fail: bool = False):
        self.recognition_data = recognition_data or {
            'student_id': 1,
            'name': 'Nguyễn Văn A',
            'confidence': 0.98
        }
        self.should_fail = should_fail
    
    def recognize_face(self, image_data: Any) -> Optional[Dict[str, Any]]:
        """Mock face recognition"""
        if self.should_fail:
            raise Exception("Face recognition failed (mocked)")
        return self.recognition_data


class MockOCRService:
    """Mock OCR Service for score sheet recognition"""
    
    def __init__(self, ocr_result: Optional[Dict[str, Any]] = None, should_fail: bool = False):
        self.ocr_result = ocr_result or {
            'student_code': 'HS001',
            'student_name': 'Nguyễn Văn A',
            'scores': {
                'math': 8.5,
                'literature': 9.0,
                'english': 8.0,
            }
        }
        self.should_fail = should_fail
    
    def extract_scores_from_image(self, image_path: str) -> Dict[str, Any]:
        """Mock OCR extraction"""
        if self.should_fail:
            raise Exception("OCR processing failed (mocked)")
        return self.ocr_result


class MockDatabaseService:
    """Mock database service for integration tests"""
    
    def __init__(self):
        self.data = {}
        self.call_log = []
    
    def query(self, table: str, **filters) -> list:
        """Mock query"""
        self.call_log.append(('query', table, filters))
        return self.data.get(table, [])
    
    def insert(self, table: str, data: Dict[str, Any]) -> int:
        """Mock insert"""
        self.call_log.append(('insert', table, data))
        if table not in self.data:
            self.data[table] = []
        self.data[table].append(data)
        return len(self.data[table])
    
    def update(self, table: str, id: int, data: Dict[str, Any]) -> bool:
        """Mock update"""
        self.call_log.append(('update', table, id, data))
        return True
    
    def delete(self, table: str, id: int) -> bool:
        """Mock delete"""
        self.call_log.append(('delete', table, id))
        return True
    
    def reset(self):
        """Reset mock state"""
        self.data = {}
        self.call_log = []


# Convenience factory functions
def create_mock_gemini_working() -> MockGeminiService:
    """Create working mock Gemini service"""
    return MockGeminiService()


def create_mock_gemini_timeout() -> MockGeminiService:
    """Create timeout mock Gemini service"""
    return MockGeminiService(timeout=True)


def create_mock_gemini_failed() -> MockGeminiService:
    """Create failed mock Gemini service"""
    return MockGeminiService(should_fail=True)


def create_mock_face_recognition(student_id: int = 1, name: str = "Test Student", confidence: float = 0.95):
    """Create mock face recognition with specific data"""
    return MockInsightFaceService(
        recognition_data={
            'student_id': student_id,
            'name': name,
            'confidence': confidence
        }
    )


def create_mock_face_recognition_failed() -> MockInsightFaceService:
    """Create failed mock face recognition"""
    return MockInsightFaceService(should_fail=True)
