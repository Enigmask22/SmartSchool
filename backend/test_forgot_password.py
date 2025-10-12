#!/usr/bin/env python3
"""
Script test cho chức năng quên mật khẩu
"""

import os
import sys
import asyncio
import json
from pathlib import Path

# Thêm đường dẫn backend vào sys.path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

from services.email_service import email_service
from services.otp_service import otp_service
from utils.logger import setup_logger

logger = setup_logger("test_forgot_password")

async def test_email_service():
    """Test email service"""
    print("🧪 Testing Email Service...")
    
    # Test SMTP configuration
    is_configured = email_service.is_smtp_configured()
    print(f"📧 SMTP Configured: {is_configured}")
    
    if is_configured:
        print("📧 SMTP Configuration:")
        print(f"   Server: {email_service.smtp_server}")
        print(f"   Port: {email_service.smtp_port}")
        print(f"   Email: {email_service.email}")
        print(f"   Sender: {email_service.sender_name}")
        
        # Test OTP generation
        otp = email_service.generate_otp()
        print(f"🔢 Generated OTP: {otp}")
        
        # Test email sending (chỉ test nếu có cấu hình thật)
        test_email = input("Nhập email test để gửi OTP (hoặc Enter để bỏ qua): ").strip()
        if test_email:
            try:
                success = await email_service.send_otp_email(test_email, otp)
                if success:
                    print("✅ Email sent successfully!")
                else:
                    print("❌ Failed to send email")
            except Exception as e:
                print(f"❌ Error sending email: {e}")
    else:
        print("⚠️ SMTP not configured, using demo mode")
        otp = email_service.generate_otp()
        print(f"🔢 Generated OTP (demo): {otp}")

def test_otp_service():
    """Test OTP service"""
    print("\n🧪 Testing OTP Service...")
    
    # Test OTP generation and storage
    test_email = "test@example.com"
    test_otp_email = "test-receive@example.com"
    otp = "123456"
    
    print(f"📧 Test Email: {test_email}")
    print(f"📧 OTP Email: {test_otp_email}")
    print(f"🔢 Test OTP: {otp}")
    
    # Generate and store OTP
    success = otp_service.generate_and_store_otp(test_email, test_otp_email, otp)
    print(f"💾 Store OTP: {'✅ Success' if success else '❌ Failed'}")
    
    # Get OTP data
    otp_data = otp_service.get_otp_data(test_email)
    if otp_data:
        print(f"📋 OTP Data: {json.dumps(otp_data, indent=2, ensure_ascii=False)}")
    else:
        print("❌ No OTP data found")
    
    # Test OTP verification
    print("\n🔍 Testing OTP verification...")
    
    # Test correct OTP
    result = otp_service.verify_otp(test_email, otp)
    print(f"✅ Correct OTP: {result}")
    
    # Test incorrect OTP
    result = otp_service.verify_otp(test_email, "000000")
    print(f"❌ Incorrect OTP: {result}")
    
    # Test OTP status
    status = otp_service.get_otp_status(test_email)
    print(f"📊 OTP Status: {json.dumps(status, indent=2, ensure_ascii=False)}")
    
    # Cleanup
    deleted = otp_service.delete_otp(test_email)
    print(f"🗑️ Cleanup: {'✅ Success' if deleted else '❌ Failed'}")

def test_api_endpoints():
    """Test API endpoints"""
    print("\n🧪 Testing API Endpoints...")
    
    import requests
    
    base_url = "http://localhost:8000/api"
    
    # Test data
    test_data = {
        "email": "admin@smartschool.edu.vn",
        "otp_email": "admin@smartschool.edu.vn"
    }
    
    try:
        # Test forgot password endpoint
        print("📧 Testing /auth/forgot-password...")
        response = requests.post(f"{base_url}/auth/forgot-password", json=test_data)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"   Response: {json.dumps(result, indent=2, ensure_ascii=False)}")
        else:
            print(f"   Error: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API server. Make sure the server is running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Error testing API: {e}")

async def main():
    """Main test function"""
    print("🚀 Starting Forgot Password Feature Tests\n")
    
    # Test email service
    await test_email_service()
    
    # Test OTP service
    test_otp_service()
    
    # Test API endpoints
    test_api_endpoints()
    
    print("\n✅ Tests completed!")
    print("\n📋 Next steps:")
    print("1. Configure SMTP settings in .env file (see EMAIL_SETUP_GUIDE.md)")
    print("2. Start the backend server: python main.py")
    print("3. Start the frontend: cd frontend && npm start")
    print("4. Test the forgot password flow in the browser")

if __name__ == "__main__":
    asyncio.run(main())
