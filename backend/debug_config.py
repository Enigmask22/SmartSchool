#!/usr/bin/env python3
"""
Debug script để kiểm tra school_days_config
"""

import os
import sys
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment
load_dotenv()

from database.connection import get_db
from utils.logger import setup_logger

logger = setup_logger("debug")

def check_database():
    """Kiểm tra database connection và table"""
    try:
        logger.info("🔍 Checking database connection...")
        db = get_db()
        
        # Kiểm tra bảng school_days_config
        logger.info("🔍 Checking school_days_config table...")
        response = db.table('school_days_config').select('*').execute()
        
        if response.data:
            logger.info(f"✅ Found {len(response.data)} configs:")
            for config in response.data:
                logger.info(f"   Grade {config['grade']}: default={config['default_days_per_week']}, temp={config.get('temporary_days_per_week', 'None')}, current={config['current_week_days']}")
        else:
            logger.warning("⚠️ No configs found in table")
            
        return response.data
        
    except Exception as e:
        logger.error(f"❌ Database error: {str(e)}")
        return None

def test_apply_temporary():
    """Test apply temporary logic"""
    try:
        logger.info("🧪 Testing apply temporary logic...")
        db = get_db()
        
        # Test với khối 12
        grade = "12"
        config_response = db.table("school_days_config").select("*").eq("grade", grade).execute()
        
        if not config_response.data:
            logger.error(f"❌ Không tìm thấy cấu hình cho khối {grade}")
            return False
            
        config = config_response.data[0]
        logger.info(f"📋 Config cho khối {grade}: {config}")
        
        if config["temporary_days_per_week"] is None:
            logger.error(f"❌ Khối {grade} chưa có cấu hình tạm thời")
            return False
            
        logger.info(f"✅ Khối {grade} có thể apply temporary: {config['temporary_days_per_week']} ngày")
        return True
        
    except Exception as e:
        logger.error(f"❌ Apply temporary test error: {str(e)}")
        return False

if __name__ == "__main__":
    logger.info("🚀 Starting debug script...")
    
    # Check database
    configs = check_database()
    
    if configs:
        # Test apply temporary
        test_apply_temporary()
    else:
        logger.error("❌ Cannot proceed without configs. Please run SQL script to create table and data.")
        
    logger.info("✅ Debug completed") 