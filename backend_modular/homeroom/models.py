"""
Pydantic models cho Homeroom module
"""

from pydantic import BaseModel
from typing import Optional

class ResponseModel(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None
