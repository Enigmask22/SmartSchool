"""
Pydantic models cho AI Services module
"""

from pydantic import BaseModel, Field
from typing import Optional, List

class FaceRecognitionRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded image")
    confidence_threshold: float = Field(default=0.6, ge=0, le=1, description="Confidence threshold")

class FaceRecognitionResponse(BaseModel):
    recognized: bool = Field(..., description="Whether face was recognized")
    student: Optional[dict] = None
    confidence: Optional[float] = None
    message: str = Field(..., description="Result message")

class FaceEncodingResponse(BaseModel):
    success: bool
    message: str
    student_id: Optional[int] = None
    detection_score: Optional[float] = None
    samples_registered: Optional[int] = None

class ResponseModel(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None
