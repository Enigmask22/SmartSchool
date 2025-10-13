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
import base64
import hmac
import hashlib

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
        """Load cấu hình schools từ file JSON (có thể là file gốc hoặc file encoded)"""
        try:
            config_dir = os.path.dirname(__file__)
            
            # Thử load từ file encoded trước
            encoded_path = os.path.join(config_dir, 'school_databases.encoded')
            json_path = os.path.join(config_dir, 'school_databases.json')
            
            config = None
            
            # Kiểm tra file encoded trước
            if os.path.exists(encoded_path):
                try:
                    config = self._load_from_encoded_file(encoded_path)
                    logger.info("Đã load cấu hình từ file encoded")
                except Exception as e:
                    logger.warning(f"Không thể load từ file encoded: {str(e)}")
                    config = None
            
            # Fallback về file JSON gốc
            if config is None and os.path.exists(json_path):
                try:
                    with open(json_path, 'r', encoding='utf-8') as f:
                        config = json.load(f)
                    logger.info("Đã load cấu hình từ file JSON gốc")
                except Exception as e:
                    logger.error(f"Không thể load từ file JSON: {str(e)}")
                    raise
            
            if config is None:
                raise ValueError("Không tìm thấy file cấu hình schools")
            
            # Parse config
            self._school_configs = config.get('schools', {})
            self._default_school = config.get('default_school', '')
            self._cache_ttl = config.get('cache_ttl', 300)
            self._max_connections = config.get('max_connections', 10)
                
            logger.info(f"Đã load {len(self._school_configs)} school configurations")
            
        except Exception as e:
            logger.error(f"Lỗi khi load school configs: {str(e)}")
            raise
    
    def _load_from_encoded_file(self, encoded_path: str) -> dict:
        """Load cấu hình từ file encoded"""
        try:
            # Đọc biến môi trường
            secret_key = os.getenv("SECRET_KEY")
            algorithm = os.getenv("ALGORITHM")
            
            if not secret_key:
                raise ValueError("SECRET_KEY không được tìm thấy trong biến môi trường")
            
            if not algorithm:
                raise ValueError("ALGORITHM không được cấu hình trong biến môi trường")
            
            # Đọc file encoded
            with open(encoded_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            
            encoded_data = metadata.get('data')
            if not encoded_data:
                raise ValueError("Không tìm thấy dữ liệu trong file encoded")
            
            # Đọc thuật toán từ metadata
            file_algorithm = metadata.get('algorithm', algorithm)
            
            # Giải mã
            decoded_data = self._decode_data(encoded_data, secret_key, file_algorithm)
            if not decoded_data:
                raise ValueError("Không thể giải mã file encoded")
            
            # Parse JSON
            config = json.loads(decoded_data)
            return config
            
        except Exception as e:
            logger.error(f"Lỗi khi load từ file encoded: {str(e)}")
            raise
    
    def _decode_data(self, encoded_data: str, secret_key: str, algorithm: str) -> str:
        """Giải mã dữ liệu được mã hóa bằng thuật toán từ biến môi trường"""
        try:
            # Decode base64
            combined = base64.b64decode(encoded_data.encode('utf-8'))
            
            # Tách data và signature
            parts = combined.split(b'|', 1)
            if len(parts) != 2:
                return None
            
            data_bytes, signature = parts
            data = data_bytes.decode('utf-8')
            
            # Tạo HMAC signature để so sánh bằng thuật toán từ biến môi trường
            key_bytes = secret_key.encode('utf-8')
            
            if algorithm.upper() == "HS256":
                expected_signature = hmac.new(key_bytes, data.encode('utf-8'), hashlib.sha256).digest()
            elif algorithm.upper() == "HS512":
                expected_signature = hmac.new(key_bytes, data.encode('utf-8'), hashlib.sha512).digest()
            elif algorithm.upper() == "HS1":
                expected_signature = hmac.new(key_bytes, data.encode('utf-8'), hashlib.sha1).digest()
            else:
                # Fallback về SHA256 nếu không nhận diện được
                expected_signature = hmac.new(key_bytes, data.encode('utf-8'), hashlib.sha256).digest()
            
            # So sánh signature
            if hmac.compare_digest(signature, expected_signature):
                return data
            else:
                logger.error("Signature không khớp - file có thể bị chỉnh sửa")
                return None
                
        except Exception as e:
            logger.error(f"Lỗi giải mã: {str(e)}")
            return None
    
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
            
            # Đọc từ biến môi trường
            url_env = school_config.get('supabase_url_env')
            key_env = school_config.get('supabase_key_env')
            
            if not url_env or not key_env:
                raise ValueError(f"Thiếu supabase_url_env hoặc supabase_key_env cho school: {school_key}")
            
            # Lấy giá trị từ biến môi trường
            url = os.getenv(url_env)
            key = os.getenv(key_env)
            
            if not url or not key:
                raise ValueError(f"Không tìm thấy biến môi trường {url_env} hoặc {key_env} cho school: {school_key}")
            
            client = create_client(url, key)
            logger.info(f"Đã tạo client cho school: {school_key} từ biến môi trường {url_env}")
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
