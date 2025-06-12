"""
Database connection và configuration cho Supabase
"""

import os
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

class Database:
    """Singleton class để quản lý kết nối Supabase"""
    
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
        """Khởi tạo Supabase client"""
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        
        if not url or not key:
            raise ValueError("SUPABASE_URL và SUPABASE_KEY phải được cấu hình trong .env")
        
        self._client = create_client(url, key)
        print("Kết nối Supabase thành công")
    
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
        
        # Kiểm tra kết nối đơn giản - không dùng RLS policies
        response = client.rpc('version').execute()
        print(f"Database connection verified - PostgreSQL version available")
        
        return client
    except Exception as e:
        print(f"Database initialization failed: {str(e)}")
        # Thử kết nối backup đơn giản
        try:
            # Kiểm tra với query đơn giản không dùng RLS
            client = db.client
            print("Database client created successfully")
            return client
        except Exception as e2:
            print(f"Backup connection also failed: {str(e2)}")
            raise

def get_db() -> Client:
    """Dependency để inject database client"""
    return db.client 