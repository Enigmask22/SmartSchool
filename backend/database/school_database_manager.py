"""
School Database Manager - Quản lý multiple Supabase databases cho các trường khác nhau
"""

import json
import os
import logging
from typing import Dict, Optional, Tuple
from supabase import create_client, Client
from threading import Lock
import time

logger = logging.getLogger(__name__)

class SchoolDatabaseManager:
    """
    Singleton class để quản lý multiple Supabase databases
    Mỗi trường sẽ có một database riêng
    """
    
    _instance: Optional['SchoolDatabaseManager'] = None
    _lock = Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(SchoolDatabaseManager, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, '_initialized'):
            self._clients: Dict[str, Client] = {}
            self._school_configs: Dict[str, dict] = {}
            self._cache_timestamps: Dict[str, float] = {}
            self._config_lock = Lock()
            self._initialized = True
            self._load_school_configs()
    
    def _load_school_configs(self):
        """Load cấu hình schools từ file JSON"""
        try:
            config_path = os.path.join(os.path.dirname(__file__), 'school_databases.json')
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                self._school_configs = config.get('schools', {})
                self._default_school = config.get('default_school', '')
                self._cache_ttl = config.get('cache_ttl', 300)
                self._max_connections = config.get('max_connections', 10)
                
            logger.info(f"Đã load {len(self._school_configs)} school configurations")
            
        except Exception as e:
            logger.error(f"Lỗi khi load school configs: {str(e)}")
            raise
    
    def _get_school_key_from_username(self, username: str) -> str:
        """
        Parse school key từ username
        Format: user_name.school_name.province
        Returns: school_name.province
        """
        try:
            parts = username.split('.')
            if len(parts) < 3:
                logger.warning(f"Username format không đúng: {username}")
                return self._default_school
            
            # Lấy phần school_name.province (bỏ phần user_name đầu tiên)
            school_key = '.'.join(parts[1:])
            logger.debug(f"Parsed school key: {school_key} from username: {username}")
            return school_key
            
        except Exception as e:
            logger.error(f"Lỗi khi parse username {username}: {str(e)}")
            return self._default_school
    
    def _is_cache_valid(self, school_key: str) -> bool:
        """Kiểm tra cache có còn hiệu lực không"""
        if school_key not in self._cache_timestamps:
            return False
        
        current_time = time.time()
        cache_time = self._cache_timestamps[school_key]
        return (current_time - cache_time) < self._cache_ttl
    
    def _create_client(self, school_key: str) -> Client:
        """Tạo Supabase client cho school cụ thể"""
        try:
            school_config = self._school_configs.get(school_key)
            if not school_config:
                logger.warning(f"Không tìm thấy config cho school: {school_key}, sử dụng default")
                school_key = self._default_school
                school_config = self._school_configs.get(school_key)
            
            if not school_config:
                raise ValueError(f"Không tìm thấy config cho school: {school_key}")
            
            url = school_config.get('supabase_url')
            key = school_config.get('supabase_key')
            
            if not url or not key:
                raise ValueError(f"Thiếu SUPABASE_URL hoặc SUPABASE_KEY cho school: {school_key}")
            
            client = create_client(url, key)
            logger.info(f"Đã tạo client cho school: {school_key}")
            return client
            
        except Exception as e:
            logger.error(f"Lỗi khi tạo client cho school {school_key}: {str(e)}")
            raise
    
    def get_client(self, username: str) -> Client:
        """
        Lấy Supabase client dựa trên username
        Format username: user_name.school_name.province
        """
        try:
            school_key = self._get_school_key_from_username(username)
            
            # Kiểm tra cache
            if school_key in self._clients and self._is_cache_valid(school_key):
                logger.debug(f"Sử dụng cached client cho school: {school_key}")
                return self._clients[school_key]
            
            # Tạo client mới
            with self._config_lock:
                # Double-check locking
                if school_key in self._clients and self._is_cache_valid(school_key):
                    return self._clients[school_key]
                
                client = self._create_client(school_key)
                self._clients[school_key] = client
                self._cache_timestamps[school_key] = time.time()
                
                # Cleanup old connections nếu vượt quá limit
                self._cleanup_old_connections()
                
                return client
                
        except Exception as e:
            logger.error(f"Lỗi khi lấy client cho username {username}: {str(e)}")
            # Fallback về default school
            if school_key != self._default_school:
                logger.info(f"Fallback về default school: {self._default_school}")
                return self.get_client(f"default.{self._default_school}")
            raise
    
    def _cleanup_old_connections(self):
        """Dọn dẹp các connection cũ"""
        if len(self._clients) <= self._max_connections:
            return
        
        current_time = time.time()
        expired_keys = []
        
        for key, timestamp in self._cache_timestamps.items():
            if (current_time - timestamp) >= self._cache_ttl:
                expired_keys.append(key)
        
        for key in expired_keys:
            if key in self._clients:
                del self._clients[key]
                del self._cache_timestamps[key]
                logger.info(f"Đã cleanup connection cho school: {key}")
    
    def get_school_info(self, username: str) -> Optional[dict]:
        """Lấy thông tin school từ username"""
        try:
            school_key = self._get_school_key_from_username(username)
            return self._school_configs.get(school_key)
        except Exception as e:
            logger.error(f"Lỗi khi lấy school info cho {username}: {str(e)}")
            return None
    
    def list_schools(self) -> Dict[str, dict]:
        """Lấy danh sách tất cả schools"""
        return self._school_configs.copy()
    
    def refresh_config(self):
        """Refresh lại config từ file JSON"""
        try:
            with self._config_lock:
                self._load_school_configs()
                # Clear cache để force reload clients
                self._clients.clear()
                self._cache_timestamps.clear()
                logger.info("Đã refresh school configs")
        except Exception as e:
            logger.error(f"Lỗi khi refresh config: {str(e)}")

# Global instance
school_db_manager = SchoolDatabaseManager()
