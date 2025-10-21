"""
Configuration module cho backend_modular
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "WARNING")

# Environment
ENV = os.getenv("ENV", "development")

# Database
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
