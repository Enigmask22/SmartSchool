"""
Database connection và configuration cho Supabase
Hỗ trợ multiple databases cho các trường khác nhau
Module core cho backend_modular - STANDALONE VERSION
"""

import os
from typing import Optional, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv
import logging
from fastapi import Request

# Import school_database_manager từ backend_modular/core (độc lập hoàn toàn)
from .school_database_manager import school_db_manager

load_dotenv()
logger = logging.getLogger(__name__)

class Database:
    """
    Database class cho modular backend
    Sử dụng SchoolDatabaseManager để multi-school support
    """
    
    _instance: Optional['Database'] = None
    _client: Optional[Client] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._client is None:
            self._init_client()
    
    def _init_client(self):
        """Khởi tạo Supabase client - legacy mode"""
        # Thử load từ .env trước (backward compatibility)
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        
        if url and key:
            self._client = create_client(url, key)
            logger.info("Kết nối Supabase thành công (legacy mode)")
        elif school_db_manager is not None:
            # Fallback về default school từ config
            try:
                self._client = school_db_manager.get_client("default.default")
                logger.info("Kết nối Supabase thành công (school config mode)")
            except Exception as e:
                logger.error(f"Không thể kết nối database: {str(e)}")
                try:
                    default_school = school_db_manager._default_school
                    self._client = school_db_manager.get_client(f"default.{default_school}")
                    logger.info(f"Kết nối Supabase thành công với default school: {default_school}")
                except Exception as e2:
                    logger.error(f"Không thể kết nối database với default school: {str(e2)}")
                    raise ValueError("Không thể khởi tạo database connection")
        else:
            raise ValueError("Không thể khởi tạo database connection - thiếu SUPABASE_URL và SUPABASE_KEY")
    
    @property
    def client(self) -> Client:
        """Trả về Supabase client"""
        if self._client is None:
            self._init_client()
        return self._client

# Global database instance
db = Database()

async def init_db():
    """Khởi tạo database và trả về client"""
    try:
        client = db.client
        
        # Kiểm tra kết nối đơn giản
        response = client.rpc('version').execute()
        logger.info("Database connection verified - PostgreSQL version available")
        
        return client
    except Exception as e:
        logger.warning(f"Database initialization warning: {str(e)}")
        try:
            client = db.client
            logger.info("Database client created successfully")
            return client
        except Exception as e2:
            logger.error(f"Backup connection also failed: {str(e2)}")
            raise

def get_db(request: Request = None) -> Client:
    """
    Dependency để inject database client
    
    MULTI-SCHOOL MODE:
    - Nếu request.state.db có sẵn (từ middleware) → dùng đó
    - Nếu không → fallback về legacy database
    
    Middleware đã tự động parse JWT token và set request.state.db
    nên tất cả endpoints chỉ cần dùng Depends(get_db) như bình thường!
    """
    if request and hasattr(request.state, 'db') and request.state.db:
        logger.debug(f"✅ Using school database from request.state")
        return request.state.db
    
    # Fallback to legacy database
    logger.debug("⚠️ Using legacy database (no request.state.db)")
    return db.client

# ===== MULTI-SCHOOL SUPPORT FUNCTIONS =====

def get_school_db(username: str) -> Client:
    """
    Lấy database client dựa trên username
    Format username: user_name.school_name.province
    
    Note: Function này được gọi 1 lần mỗi request từ middleware.
    SchoolDatabaseManager tự động cache client nên không có overhead.
    """
    logger.debug(f"get_school_db called for: {username}")
    
    if school_db_manager is None:
        logger.warning("school_db_manager not available, using default client")
        return db.client
        
    try:
        client = school_db_manager.get_client(username)
        logger.debug(f"Got cached client for: {username}")
        return client
    except Exception as e:
        logger.error(f"Lỗi khi lấy school database cho {username}: {str(e)}")
        # Fallback về legacy database
        logger.warning("Fallback to default legacy database")
        return db.client

def get_school_info(username: str) -> Optional[Dict[str, Any]]:
    """
    Lấy thông tin school từ username
    """
    if school_db_manager is None:
        return None
    return school_db_manager.get_school_info(username)

def parse_username(username: str) -> Dict[str, str]:
    """
    Parse username thành các thành phần
    Format: user_name.school_name.province
    Returns: {"user_name": "...", "school_name": "...", "province": "...", "school_key": "..."}
    """
    try:
        parts = username.split('.')
        if len(parts) < 3:
            return {
                "user_name": username,
                "school_name": "",
                "province": "",
                "school_key": ""
            }
        
        user_name = parts[0]
        school_key = '.'.join(parts[1:])
        school_parts = school_key.split('.')
        
        if len(school_parts) >= 2:
            province = school_parts[-1]
            school_name = '.'.join(school_parts[:-1])
        else:
            school_name = school_key
            province = ""
        
        return {
            "user_name": user_name,
            "school_name": school_name,
            "province": province,
            "school_key": school_key
        }
        
    except Exception as e:
        logger.error(f"Lỗi khi parse username {username}: {str(e)}")
        return {
            "user_name": username,
            "school_name": "",
            "province": "",
            "school_key": ""
        }

async def init_school_db(username: str):
    """
    Khởi tạo database cho school cụ thể dựa trên username
    """
    try:
        client = get_school_db(username)
        
        # Kiểm tra kết nối
        response = client.rpc('version').execute()
        logger.info(f"Database connection verified cho user: {username}")
        
        return client
    except Exception as e:
        logger.error(f"Database initialization failed cho {username}: {str(e)}")
        try:
            client = db.client
            logger.info(f"Fallback về default database cho user: {username}")
            return client
        except Exception as e2:
            logger.error(f"Backup connection also failed: {str(e2)}")
            raise

def list_available_schools() -> Dict[str, dict]:
    """
    Lấy danh sách tất cả schools có sẵn
    """
    if school_db_manager is None:
        return {}
    return school_db_manager.list_schools()

def refresh_school_configs():
    """
    Refresh lại school configurations từ file JSON
    """
    if school_db_manager is not None:
        school_db_manager.refresh_config()
