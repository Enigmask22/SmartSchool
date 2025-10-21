"""
Users Services - Business logic cho users management
"""

import bcrypt
from datetime import datetime
from typing import Optional, Dict, Any
from core.logger import setup_logger

logger = setup_logger("users_service")

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
