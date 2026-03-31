"""
School Database Manager - Quản lý multiple Supabase databases cho các trường khác nhau
STANDALONE VERSION - Hoàn toàn độc lập, không phụ thuộc backend cũ
"""

import json
import os
import logging
from typing import Dict, Optional
from supabase import create_client, Client
from threading import Lock
import base64
import hmac
import hashlib
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class SchoolDatabaseManager:
    """
    Singleton class quản lý multi-school database connections
    """
    
    _instance: Optional['SchoolDatabaseManager'] = None
    _lock = Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(SchoolDatabaseManager, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self._initialized = True
        self._clients: Dict[str, Client] = {}
        self._school_configs: Dict = {}
        self._default_school: str = ""
        
        # Load school configurations from encoded file
        self._load_school_configs()
    
    def _load_school_configs(self):
        """Load và decode school configurations từ file encoded"""
        try:
            # Đường dẫn tới file encoded trong backend_modular/core/
            encoded_file = os.path.join(
                os.path.dirname(__file__), 
                'school_databases.encoded'
            )
            
            if not os.path.exists(encoded_file):
                logger.error(f"❌ File encoded không tồn tại: {encoded_file}")
                raise FileNotFoundError(f"Không tìm thấy file: {encoded_file}")
            
            logger.info(f"📂 Loading school configs from: {encoded_file}")
            
            # Đọc file encoded
            with open(encoded_file, 'r', encoding='utf-8') as f:
                encoded_data = json.load(f)
            
            # Decode data
            decoded_data = self._decode_data(encoded_data['data'])
            
            self._school_configs = decoded_data.get('schools', {})
            self._default_school = decoded_data.get('default_school', '')
            
            logger.info(f"✅ Loaded {len(self._school_configs)} school configs")
            logger.info(f"📋 Available schools: {list(self._school_configs.keys())}")
            logger.info(f"🏫 Default school: {self._default_school}")
            
        except Exception as e:
            logger.error(f"❌ Lỗi khi load school configs: {str(e)}")
            # Fallback: sử dụng default config
            self._use_default_config()
    
    def _decode_data(self, encoded_str: str) -> Dict:
        """Decode base64 và verify HMAC"""
        try:
            secret_key = os.getenv("SECRET_KEY")
            if not secret_key:
                raise ValueError("SECRET_KEY không được tìm thấy trong .env")
            
            # Decode base64
            decoded = base64.b64decode(encoded_str)
            
            # Tách data và signature bằng separator '|'
            separator_index = decoded.rfind(b'|')
            
            if separator_index == -1:
                raise ValueError("Cannot find separator '|' in decoded data")
            
            data_bytes = decoded[:separator_index]
            signature = decoded[separator_index+1:]
            
            # Verify signature
            expected_signature = hmac.new(
                secret_key.encode(),
                data_bytes,
                hashlib.sha256
            ).digest()
            
            if not hmac.compare_digest(signature, expected_signature):
                raise ValueError("Invalid signature - File có thể bị thay đổi!")
            
            # Parse JSON data
            data_json = json.loads(data_bytes.decode('utf-8'))
            logger.info("✅ Decoded và verified data thành công")
            
            return data_json
            
        except Exception as e:
            logger.error(f"❌ Lỗi khi decode data: {str(e)}")
            raise
    
    def _use_default_config(self):
        """Fallback: Sử dụng config mặc định từ .env"""
        logger.warning("⚠️ Sử dụng default config từ .env")
        
        self._school_configs = {
            "default": {
                "school_name": "Default School",
                "province": "Default",
                "supabase_url_env": "SUPABASE_URL_1",
                "supabase_key_env": "SUPABASE_KEY_1",
                "description": "Default school configuration"
            }
        }
        self._default_school = "default"
    
    def _get_school_key_from_username(self, username: str) -> str:
        """
        Trích xuất school_key từ username
        Format: user_name.school_name.province
        Returns: school_name.province
        """
        try:
            parts = username.split('.')
            
            if len(parts) < 3:
                logger.warning(f"Username format không đúng (cần 3 phần): {username}, using default: {self._default_school}")
                return self._default_school
            
            # School key = school_name.province (bỏ phần user_name đầu tiên)
            school_key = '.'.join(parts[1:])
            
            return school_key
            
        except Exception as e:
            logger.error(f"Lỗi khi parse username: {str(e)}")
            return self._default_school
    
    def get_client(self, username: str) -> Client:
        """
        Lấy Supabase client cho school tương ứng với username
        
        Args:
            username: Format user_name.school_name.province
            
        Returns:
            Supabase Client instance
        """
        # Parse username để lấy school_key
        school_key = self._get_school_key_from_username(username)
        
        # Kiểm tra cache
        if school_key in self._clients:
            return self._clients[school_key]
        
        # Lấy config cho school
        school_config = self._school_configs.get(school_key)
        
        if not school_config:
            logger.warning(f"Config not found for school: {school_key}, using default: {self._default_school}")
            
            # Fallback to default school
            school_key = self._default_school
            school_config = self._school_configs.get(school_key)
            
            if not school_config:
                raise ValueError(f"Không tìm thấy config cho school: {school_key}")
        
        logger.info(f"🏫 Creating NEW client for: {school_config.get('school_name')} - {school_config.get('province')}")
        
        # Lấy env variable names
        url_env_key = school_config.get('supabase_url_env', 'SUPABASE_URL_1')
        key_env_key = school_config.get('supabase_key_env', 'SUPABASE_KEY_1')
        
        logger.info(f"🔑 Env keys: {url_env_key}, {key_env_key}")
        
        # Lấy actual values từ .env
        supabase_url = os.getenv(url_env_key)
        supabase_key = os.getenv(key_env_key)
        
        if not supabase_url or not supabase_key:
            raise ValueError(
                f"Thiếu config trong .env: {url_env_key}={supabase_url}, {key_env_key}={supabase_key}"
            )
        
        logger.info(f"🌐 Supabase URL: {supabase_url}")
        logger.info(f"🔐 Supabase Key: {supabase_key[:20]}...")
        
        # Tạo client
        try:
            client = create_client(supabase_url, supabase_key)
            self._clients[school_key] = client
            
            logger.info(f"✅ Created new Supabase client for: {school_key}")
            logger.info(f"   Database: {supabase_url.split('//')[1].split('.')[0]}")
            
            return client
            
        except Exception as e:
            logger.error(f"❌ Lỗi khi tạo Supabase client: {str(e)}")
            raise
    
    def get_school_info(self, username: str) -> Dict:
        """Lấy thông tin school từ username"""
        school_key = self._get_school_key_from_username(username)
        return self._school_configs.get(school_key, {})
    
    def list_schools(self) -> Dict:
        """Liệt kê tất cả schools có sẵn"""
        return self._school_configs


# Singleton instance
school_db_manager = SchoolDatabaseManager()
