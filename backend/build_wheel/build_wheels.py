#!/usr/bin/env python3
"""
Build Wheels Script for Render Deployment
Tạo wheel files cho các packages cần Microsoft Build Tools

Usage:
1. Chạy trên Windows với Microsoft Build Tools đã cài
2. python build_wheels.py
3. Upload wheels directory cùng với code lên Render
"""

import os
import subprocess
import sys
from pathlib import Path

# Packages thường cần build tools và có thể gây lỗi trên Render
PROBLEMATIC_PACKAGES = [
    # Computer Vision packages - thường có C extensions
    "opencv-python==4.8.1.78",
    "opencv-contrib-python==4.8.1.78",
    
    # InsightFace và ONNX - có native code
    "insightface==0.7.3",
    "onnxruntime>=1.17.0", 
    "onnx>=1.15.0",
    
    # ML packages với C extensions
    "scikit-learn==1.3.2",
    "numpy>=1.21.0",
    "pandas>=2.0.0",
    
    # Cryptography packages
    "python-jose[cryptography]==3.3.0",
    "bcrypt==4.1.2",
    
    # Image processing
    "Pillow==10.0.1",
]

# Packages ít có vấn đề, có thể install bình thường
SAFE_PACKAGES = [
    "fastapi==0.104.1",
    "uvicorn[standard]==0.24.0",
    "passlib[bcrypt]==1.7.4",
    "supabase==2.15.3",
    "python-dotenv==1.0.0",
    "python-multipart==0.0.6",
    "requests==2.31.0",
    "aiofiles==23.2.1",
    "email-validator==2.1.0",
    "python-dateutil==2.8.2",
    "typing-extensions>=4.12.2",
    "websockets==12.0",
    "google-generativeai==0.8.3",
    "schedule==1.2.0",
    "setuptools==68.2.2",
    "wheel==0.41.2",
]

def setup_wheels_directory():
    """Tạo thư mục wheels"""
    wheels_dir = Path("wheels")
    wheels_dir.mkdir(exist_ok=True)
    print(f"📁 Wheels directory: {wheels_dir.absolute()}")
    return wheels_dir

def check_build_tools():
    """Kiểm tra Microsoft Build Tools"""
    print("🔍 Checking build environment...")
    
    try:
        # Check Python version
        python_version = sys.version
        print(f"   Python: {python_version}")
        
        # Check pip version
        result = subprocess.run([sys.executable, "-m", "pip", "--version"], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print(f"   Pip: {result.stdout.strip()}")
        
        # Check if we can build wheels
        result = subprocess.run([sys.executable, "-m", "pip", "wheel", "--help"], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print("   ✅ Pip wheel command available")
        else:
            print("   ❌ Pip wheel command not available")
            return False
            
        return True
        
    except Exception as e:
        print(f"   ❌ Error checking build tools: {e}")
        return False

def build_package_wheel(package, wheels_dir):
    """Build wheel cho một package"""
    print(f"🔧 Building wheel for: {package}")
    
    try:
        cmd = [
            sys.executable, "-m", "pip", "wheel",
            "--wheel-dir", str(wheels_dir),
            "--no-deps",  # Không build dependencies để tránh conflicts
            package
        ]
        
        print(f"   Running: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 phút timeout
        )
        
        if result.returncode == 0:
            print(f"   ✅ Success: {package}")
            return True
        else:
            print(f"   ❌ Failed: {package}")
            print(f"   Error: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print(f"   ⏰ Timeout building: {package}")
        return False
    except Exception as e:
        print(f"   ❌ Exception building {package}: {e}")
        return False

def download_prebuilt_wheels(package, wheels_dir):
    """Download pre-built wheels nếu có"""
    print(f"📥 Downloading pre-built wheel for: {package}")
    
    try:
        cmd = [
            sys.executable, "-m", "pip", "download",
            "--dest", str(wheels_dir),
            "--only-binary=:all:",  # Chỉ download binary wheels
            package
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if result.returncode == 0:
            print(f"   ✅ Downloaded: {package}")
            return True
        else:
            print(f"   ❌ No pre-built wheel available: {package}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error downloading {package}: {e}")
        return False

def create_requirements_wheels():
    """Tạo requirements-wheels.txt"""
    wheels_content = f"""# Requirements for Render deployment with pre-built wheels
# Usage: pip install -r requirements-wheels.txt --find-links wheels

# =============================================================================
# WHEEL INSTALLATION INSTRUCTIONS:
# 1. Install from wheels first (for packages with build issues)
# 2. Install remaining packages from PyPI
# =============================================================================

# PROBLEMATIC PACKAGES (install from wheels)
# These packages often need Microsoft Build Tools
{chr(10).join(f"# {pkg}" for pkg in PROBLEMATIC_PACKAGES)}

# SAFE PACKAGES (install from PyPI)
{chr(10).join(SAFE_PACKAGES)}
"""

    with open("requirements-wheels.txt", "w", encoding="utf-8") as f:
        f.write(wheels_content)
    
    print("📝 Created requirements-wheels.txt")

def create_install_script():
    """Tạo script install cho Render"""
    install_script = """#!/bin/bash
# install_with_wheels.sh
# Render deployment script with wheel support

echo "🚀 Installing dependencies with wheels support..."

# Upgrade pip first
pip install --upgrade pip wheel

# Install from wheels directory (for problematic packages)
echo "📦 Installing from pre-built wheels..."
pip install --find-links wheels --no-index --no-deps wheels/*.whl

# Install remaining dependencies from PyPI
echo "📦 Installing remaining packages from PyPI..."
pip install -r requirements-wheels.txt

echo "✅ Installation complete!"
"""

    with open("install_with_wheels.sh", "w", encoding="utf-8") as f:
        f.write(install_script)
    
    os.chmod("install_with_wheels.sh", 0o755)  # Make executable
    print("📝 Created install_with_wheels.sh")

def main():
    print("🛠️ Smart School Backend - Build Wheels for Render Deployment")
    print("=" * 70)
    
    # Setup
    wheels_dir = setup_wheels_directory()
    
    # Check build environment
    if not check_build_tools():
        print("❌ Build environment not ready. Please install Microsoft Build Tools.")
        return 1
    
    print(f"\n🔧 Building wheels for {len(PROBLEMATIC_PACKAGES)} packages...")
    
    success_count = 0
    failed_packages = []
    
    # Build/download wheels for problematic packages
    for package in PROBLEMATIC_PACKAGES:
        print(f"\n--- Processing: {package} ---")
        
        # Try to download pre-built wheel first
        if download_prebuilt_wheels(package, wheels_dir):
            success_count += 1
        # If no pre-built wheel, try to build
        elif build_package_wheel(package, wheels_dir):
            success_count += 1
        else:
            failed_packages.append(package)
    
    # Create requirements and scripts
    create_requirements_wheels()
    create_install_script()
    
    # Summary
    print("\n" + "=" * 70)
    print(f"📊 SUMMARY:")
    print(f"   ✅ Successful wheels: {success_count}")
    print(f"   ❌ Failed packages: {len(failed_packages)}")
    
    if failed_packages:
        print(f"\n⚠️ Failed packages:")
        for pkg in failed_packages:
            print(f"     - {pkg}")
        print(f"\n💡 These packages may install fine on Render from PyPI")
    
    # List created wheels
    wheels = list(wheels_dir.glob("*.whl"))
    if wheels:
        print(f"\n📦 Created wheels ({len(wheels)} files):")
        for wheel in wheels:
            print(f"     - {wheel.name}")
    
    print(f"\n🚀 Next steps:")
    print(f"   1. Upload 'wheels' directory with your code to Render")
    print(f"   2. Set build command: bash install_with_wheels.sh")
    print(f"   3. Or use: pip install -r requirements-wheels.txt --find-links wheels")
    
    return 0 if not failed_packages else 1

if __name__ == "__main__":
    sys.exit(main())
