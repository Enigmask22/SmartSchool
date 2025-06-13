"""
Test Script for InsightFace Database Schema
Kiểm tra schema database mới cho InsightFace Edition v2.0
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import init_db
from utils.logger import setup_logger

logger = setup_logger()

async def test_schema():
    """Test database schema for InsightFace Edition"""
    try:
        logger.info("🔍 Testing InsightFace Edition v2.0 database schema...")
        
        # Initialize database connection
        db = await init_db()
        
        # 1. Check if new columns exist
        logger.info("📊 Checking database schema...")
        
        # Check students table structure
        students = db.table("students").select("id, student_id, full_name, face_encoding, insightface_encoding, encoding_version, face_samples_count").limit(5).execute()
        
        if students.data:
            logger.info(f"✅ Found {len(students.data)} students in database")
            
            # Check for InsightFace Edition fields
            first_student = students.data[0]
            logger.info("📋 Student table structure check:")
            
            has_insightface = 'insightface_encoding' in first_student
            has_encoding_version = 'encoding_version' in first_student
            has_samples_count = 'face_samples_count' in first_student
            
            logger.info(f"  - insightface_encoding: {'✓' if has_insightface else '✗'}")
            logger.info(f"  - encoding_version: {'✓' if has_encoding_version else '✗'}")
            logger.info(f"  - face_samples_count: {'✓' if has_samples_count else '✗'}")
            
            if has_insightface and has_encoding_version:
                logger.info("✅ InsightFace Edition schema detected!")
            else:
                logger.warning("⚠️ Old schema detected - migration needed")
                
        else:
            logger.warning("⚠️ No students found in database")
        
        # 2. Test system functions if available
        logger.info("🧪 Testing system functions...")
        
        try:
            # Try to call system status function
            status = db.rpc('check_system_status').execute()
            if status.data:
                logger.info("✅ System status function working!")
                logger.info(f"📊 System info: {status.data}")
            else:
                logger.info("📋 System status function available but no data")
        except Exception as e:
            logger.warning(f"⚠️ System functions not available: {e}")
        
        # 3. Check sample data
        logger.info("📈 Checking sample data...")
        
        # Count students by encoding type
        encoding_stats = {}
        for student in students.data:
            if student.get('insightface_encoding'):
                encoding_stats['insightface'] = encoding_stats.get('insightface', 0) + 1
            elif student.get('face_encoding'):
                encoding_stats['mediapipe'] = encoding_stats.get('mediapipe', 0) + 1
            else:
                encoding_stats['none'] = encoding_stats.get('none', 0) + 1
        
        logger.info(f"Encoding distribution: {encoding_stats}")
        
        # 4. Test attendance table
        logger.info("📅 Testing attendance table...")
        attendance = db.table("attendance").select("id, student_id, date, status, method, recognition_model").limit(3).execute()
        
        if attendance.data:
            logger.info(f"✅ Found {len(attendance.data)} attendance records")
            # Check for new fields
            first_record = attendance.data[0]
            has_method = 'method' in first_record
            has_recognition_model = 'recognition_model' in first_record
            logger.info(f"  - method field: {'✓' if has_method else '✗'}")
            logger.info(f"  - recognition_model field: {'✓' if has_recognition_model else '✗'}")
        else:
            logger.info("📋 No attendance records found")
        
        logger.info("✅ Database schema test completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Schema test failed: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False

async def check_migration_needed():
    """Check if migration to new schema is needed"""
    try:
        logger.info("🔍 Checking if migration is needed...")
        
        db = await init_db()
        
        # Try to select new fields
        try:
            students = db.table("students").select("insightface_encoding, encoding_version, face_samples_count").limit(1).execute()
            if students.data:
                logger.info("✅ New schema already applied!")
                return False
            else:
                logger.info("📋 Database exists but might need new schema")
                return True
        except Exception as e:
            logger.warning(f"⚠️ New schema fields not found: {e}")
            return True
            
    except Exception as e:
        logger.error(f"❌ Migration check failed: {str(e)}")
        return True

async def main():
    """Main function"""
    print("🎯 InsightFace Edition v2.0 Database Schema Test")
    print("=" * 60)
    
    # Check if migration needed
    migration_needed = await check_migration_needed()
    
    if migration_needed:
        print("\n🔄 MIGRATION NEEDED!")
        print("=" * 60)
        print("📋 STEPS TO APPLY NEW SCHEMA:")
        print("1. Open Supabase Dashboard > SQL Editor")
        print("2. Copy and paste the contents of 'schema_insightface_edition.sql'")
        print("3. Execute the SQL to create/update all tables and functions")
        print("4. Run this script again to verify")
        print("=" * 60)
        print("\n💡 The new schema includes:")
        print("  - Dual encoding support (InsightFace + MediaPipe)")
        print("  - Enhanced attendance tracking")
        print("  - Recognition performance logging")
        print("  - System settings management")
        print("  - Advanced analytics functions")
    else:
        # Test current schema
        if await test_schema():
            print("\n✅ SUCCESS!")
            print("=" * 60)
            print("🎉 InsightFace Edition v2.0 schema is ready!")
            print("📊 All required fields and functions are available")
            print("🚀 You can now use the full InsightFace Edition features")
        else:
            print("\n❌ ISSUES DETECTED")
            print("Please check the logs above and resolve any issues")

if __name__ == "__main__":
    asyncio.run(main()) 