#!/usr/bin/env python3
"""
Test script để kiểm tra các imports quan trọng
Chạy sau khi deploy để đảm bảo mọi thứ hoạt động
"""

import sys
from typing import List, Tuple

def test_import(module_name: str, package_name: str = None) -> Tuple[bool, str]:
    """Test import một module"""
    try:
        if package_name:
            exec(f"import {module_name}")
            return True, f"✅ {package_name} ({module_name}): OK"
        else:
            exec(f"import {module_name}")
            return True, f"✅ {module_name}: OK"
    except ImportError as e:
        return False, f"❌ {package_name or module_name}: {str(e)}"
    except Exception as e:
        return False, f"⚠️ {package_name or module_name}: {str(e)}"

def main():
    print("🧪 Smart School Backend - Import Test")
    print("=" * 50)
    
    # Core dependencies
    tests = [
        ("fastapi", "FastAPI"),
        ("uvicorn", "Uvicorn"),
        ("supabase", "Supabase"),
        ("dotenv", "python-dotenv"),
        ("requests", "Requests"),
        
        # Data processing
        ("numpy", "NumPy"),
        ("pandas", "Pandas"),
        
        # Image processing  
        ("PIL", "Pillow"),
        
        # Computer vision
        ("cv2", "OpenCV"),
        
        # Face recognition
        ("insightface", "InsightFace"),
        ("onnxruntime", "ONNX Runtime"),
        ("onnx", "ONNX"),
        
        # ML
        ("sklearn", "Scikit-learn"),
        
        # Security
        ("bcrypt", "BCrypt"),
        ("passlib", "Passlib"),
        ("jose", "python-jose"),
        
        # Others
        ("websockets", "WebSockets"),
        ("google.generativeai", "Google AI"),
        ("schedule", "Schedule"),
    ]
    
    success_count = 0
    failed_imports = []
    
    for module, package in tests:
        success, message = test_import(module, package)
        print(message)
        
        if success:
            success_count += 1
        else:
            failed_imports.append(package or module)
    
    print("\n" + "=" * 50)
    print(f"📊 RESULTS:")
    print(f"✅ Successful: {success_count}/{len(tests)}")
    print(f"❌ Failed: {len(failed_imports)}")
    
    if failed_imports:
        print(f"\n⚠️ Failed packages:")
        for pkg in failed_imports:
            print(f"   - {pkg}")
        
        print(f"\n💡 Suggestions:")
        if "OpenCV" in failed_imports:
            print("   - Try: pip install opencv-python-headless")
        if "InsightFace" in failed_imports:
            print("   - Try: pip install --upgrade insightface")
            print("   - Alternative: pip install face-recognition")
        if "ONNX Runtime" in failed_imports:
            print("   - Try: pip install onnxruntime-gpu (for GPU)")
            print("   - Try: pip install onnxruntime (CPU only)")
    
    # Version info for successful imports
    print(f"\n📋 VERSION INFO:")
    version_checks = [
        ("numpy", "numpy.__version__"),
        ("cv2", "cv2.__version__"),
        ("sklearn", "sklearn.__version__"),
        ("fastapi", "fastapi.__version__"),
    ]
    
    for module, version_attr in version_checks:
        try:
            exec(f"import {module}")
            version = eval(version_attr)
            print(f"   {module}: {version}")
        except:
            pass
    
    return len(failed_imports) == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
