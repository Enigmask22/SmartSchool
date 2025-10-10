"""
Script để sửa lại password hash trong database
Sử dụng khi cần reset password cho users
"""
from passlib.context import CryptContext
from database.connection import get_db
from datetime import datetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Hash password với truncation cho bcrypt"""
    # Bcrypt chỉ hỗ trợ password tối đa 72 bytes
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password = password_bytes[:72].decode('utf-8', errors='ignore')
    return pwd_context.hash(password)

def fix_password_hashes():
    """Update password hash cho các user"""
    try:
        # Get database connection
        db = get_db()
        
        print("\n📋 Kiểm tra user hiện tại trong database...")
        
        # Lấy thông tin user hiện tại
        all_users = db.table("users").select("id, email, password_hash").execute()
        
        if all_users.data:
            print(f"\n✅ Tìm thấy {len(all_users.data)} user(s):")
            for user in all_users.data:
                email = user.get("email")
                current_hash = user.get("password_hash", "")
                print(f"\n   👤 {email}")
                print(f"      Hash length: {len(current_hash)} chars")
                print(f"      Hash preview: {current_hash[:50]}...")
        
        print("\n" + "="*60)
        print("🔧 Bắt đầu update password hashes...")
        print("="*60)
        
        # Các user cần update với default password
        users_to_fix = [
            {"email": "lan.nguyen@school.edu.vn", "password": "password"},
            {"email": "admin@smartschool.edu.vn", "password": "password"},
            # Thêm các user khác nếu cần
        ]
        
        for user_info in users_to_fix:
            email = user_info["email"]
            password = user_info["password"]
            
            print(f"\n🔄 Đang xử lý user: {email}")
            print(f"   Password: {password}")
            
            # Hash password mới
            new_hash = get_password_hash(password)
            print(f"   ✓ New hash created: {new_hash[:50]}...")
            print(f"   ✓ Hash length: {len(new_hash)} chars")
            
            # Update trong database
            response = db.table("users").update({
                "password_hash": new_hash,
                "updated_at": datetime.now().isoformat()
            }).eq("email", email).execute()
            
            if response.data:
                print(f"   ✅ ĐÃ CẬP NHẬT THÀNH CÔNG!")
            else:
                print(f"   ❌ Không tìm thấy user trong database")
        
        print("\n" + "="*60)        
        print("✅ HOÀN THÀNH!")
        print("="*60)
        print("\n💡 Bây giờ bạn có thể:")
        print("   1. Restart server (nếu đang chạy)")
        print("   2. Thử login với:")
        print("      Email: lan.nguyen@school.edu.vn")
        print("      Password: password")
        print()
                
    except Exception as e:
        print(f"\n❌ LỖI: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("="*60)
    print("🔧 SCRIPT SỬA PASSWORD HASHES")
    print("="*60)
    fix_password_hashes()

