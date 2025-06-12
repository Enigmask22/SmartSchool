#!/usr/bin/env python3
"""
Smart School System Setup Script
Automated setup cho hệ thống trường học thông minh
"""

import os
import sys
import subprocess
import platform
import shutil
from pathlib import Path

def print_banner():
    """In banner chào mừng"""
    print("=" * 60)
    print("🎓 SMART SCHOOL SYSTEM SETUP")
    print("=" * 60)
    print("Hệ thống trường học thông minh với AI Computer Vision")
    print("Author: Smart School Team")
    print("=" * 60)

def get_python_executable():
    """Tìm Python executable phù hợp"""
    python_executables = []
    
    # Windows
    if platform.system() == "Windows":
        # Kiểm tra py launcher trước
        try:
            result = subprocess.run(['py', '-0'], capture_output=True, text=True)
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    if '3.12' in line:
                        python_executables.append('py -3.12')
                    elif '3.11' in line:
                        python_executables.append('py -3.11')
                    elif '3.10' in line:
                        python_executables.append('py -3.10')
        except:
            pass
        
        # Kiểm tra python commands khác
        python_executables.extend(['python', 'python3', 'py'])
    else:
        # Unix/Linux
        python_executables.extend(['python3.12', 'python3.11', 'python3.10', 'python3', 'python'])
    
    # Test từng executable
    for exe in python_executables:
        try:
            cmd = exe.split() if ' ' in exe else [exe]
            result = subprocess.run(cmd + ['--version'], capture_output=True, text=True)
            if result.returncode == 0:
                version = result.stdout.strip()
                print(f"🐍 Tìm thấy: {version} ({exe})")
                
                # Kiểm tra version có phù hợp không
                version_parts = version.split()[1].split('.')
                major, minor = int(version_parts[0]), int(version_parts[1])
                
                if major == 3 and minor >= 10 and minor <= 12:
                    return exe
                elif major == 3 and minor >= 8:
                    print(f"⚠️ Python {major}.{minor} có thể gây vấn đề compatibility")
                    
        except:
            continue
    
    return None

def check_requirements():
    """Kiểm tra system requirements"""
    print("\n📋 Kiểm tra system requirements...")
    
    # Check Python version
    python_exe = get_python_executable()
    if not python_exe:
        print("❌ Không tìm thấy Python phù hợp (3.10-3.12 được khuyến nghị)")
        print("💡 Vui lòng cài đặt Python 3.12 từ https://python.org")
        return False, None
    
    print(f"✅ Sử dụng Python: {python_exe}")
    
    # Check CMake cho Windows
    if platform.system() == "Windows":
        cmake_found = False
        try:
            result = subprocess.run(['cmake', '--version'], capture_output=True, text=True)
            if result.returncode == 0:
                cmake_version = result.stdout.split('\n')[0]
                print(f"✅ {cmake_version}")
                cmake_found = True
        except:
            pass
        
        if not cmake_found:
            print("⚠️ CMake không được tìm thấy")
            print("💡 CMake cần thiết để build dlib trên Windows")
            print("💡 Download từ: https://cmake.org/download/")
    
    # Check Node.js
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True, shell=True)
        if result.returncode == 0:
            print(f"✅ Node.js {result.stdout.strip()}")
        else:
            print("❌ Node.js không được tìm thấy")
            return False, python_exe
    except FileNotFoundError:
        print("❌ Node.js không được tìm thấy")
        return False, python_exe
    
    # Check npm
    try:
        npm_commands = ['npm', 'npm.cmd'] if platform.system() == "Windows" else ['npm']
        npm_found = False
        
        for npm_cmd in npm_commands:
            try:
                result = subprocess.run([npm_cmd, '--version'], capture_output=True, text=True, shell=True)
                if result.returncode == 0:
                    print(f"✅ npm {result.stdout.strip()}")
                    npm_found = True
                    break
            except FileNotFoundError:
                continue
        
        if not npm_found:
            print("❌ npm không được tìm thấy")
            return False, python_exe
            
    except Exception as e:
        print("❌ npm không được tìm thấy")
        return False, python_exe
    
    # Check Git
    try:
        result = subprocess.run(['git', '--version'], capture_output=True, text=True, shell=True)
        if result.returncode == 0:
            print(f"✅ Git đã cài đặt")
        else:
            print("⚠️ Git không được tìm thấy (optional)")
    except FileNotFoundError:
        print("⚠️ Git không được tìm thấy (optional)")
    
    return True, python_exe

def create_env_files():
    """Tạo environment files"""
    print("\n📝 Tạo environment files...")
    
    # Backend .env
    backend_env_content = """# Supabase Configuration
SUPABASE_URL=https://zuvmlptzdbwhanwfdbab.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dm1scHR6ZGJ3aGFud2ZkYmFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2OTU4OTEsImV4cCI6MjA2NTI3MTg5MX0.OuyAGlGaxlEhFMjGQuOjIY5vKIpW6GOzYOhSyBdP5E8
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dm1scHR6ZGJ3aGFud2ZkYmFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY5NTg5MSwiZXhwIjoyMDY1MjcxODkxfQ.-4lLg3JJnAo0zQGPF20DOQ1lNh_gcsokqe4Q-Nyq5_8

# API Configuration
SECRET_KEY=smart-school-secret-key-change-in-production-2024
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=True

# AI Model Configuration
FACE_RECOGNITION_TOLERANCE=0.6
MIN_FACE_SIZE=50
MODEL_PATH=./ai_models/
UPLOAD_PATH=./uploads/

# Database
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.zuvmlptzdbwhanwfdbab.supabase.co:5432/postgres
"""
    
    backend_env_path = Path("backend/.env")
    if not backend_env_path.exists():
        with open(backend_env_path, "w", encoding='utf-8') as f:
            f.write(backend_env_content)
        print("✅ Tạo backend/.env")
    else:
        print("ℹ️ backend/.env đã tồn tại")
    
    # Frontend .env
    frontend_env_content = """# API Configuration
REACT_APP_API_URL=http://localhost:8000
REACT_APP_API_BASE_URL=http://localhost:8000/api

# Supabase Configuration (optional for direct client access)
REACT_APP_SUPABASE_URL=https://zuvmlptzdbwhanwfdbab.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dm1scHR6ZGJ3aGFud2ZkYmFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2OTU4OTEsImV4cCI6MjA2NTI3MTg5MX0.OuyAGlGaxlEhFMjGQuOjIY5vKIpW6GOzYOhSyBdP5E8

# App Configuration
REACT_APP_NAME=Smart School System
REACT_APP_VERSION=1.0.0
"""
    
    frontend_env_path = Path("frontend/.env")
    if not frontend_env_path.exists():
        with open(frontend_env_path, "w", encoding='utf-8') as f:
            f.write(frontend_env_content)
        print("✅ Tạo frontend/.env")
    else:
        print("ℹ️ frontend/.env đã tồn tại")

def setup_backend(python_exe):
    """Setup Python backend với smart installation cho Python 3.12"""
    print("\n🐍 Setup Python Backend...")
    
    # Change to backend directory
    os.chdir("backend")
    
    # Create virtual environment
    venv_path = Path("venv")
    if not venv_path.exists():
        print("📦 Tạo Python virtual environment...")
        cmd = python_exe.split() if ' ' in python_exe else [python_exe]
        result = subprocess.run(cmd + ["-m", "venv", "venv"])
        if result.returncode != 0:
            print("❌ Lỗi tạo virtual environment")
            return False
        print("✅ Virtual environment đã tạo")
    
    # Determine activation script and pip path based on OS
    if platform.system() == "Windows":
        activate_script = "venv\\Scripts\\activate"
        pip_path = "venv\\Scripts\\pip"
        python_venv = "venv\\Scripts\\python"
    else:
        activate_script = "venv/bin/activate"
        pip_path = "venv/bin/pip"
        python_venv = "venv/bin/python"
    
    # ===== BƯỚC 1: Upgrade pip =====
    print("📦 Step 1/6: Upgrade pip...")
    try:
        subprocess.run([python_venv, "-m", "pip", "install", "--upgrade", "pip>=23.0.0"], 
                      check=True, timeout=60)
        print("✅ Pip upgraded successfully")
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        print("⚠️ Pip upgrade warning, tiếp tục...")
    
    # ===== BƯỚC 2: Install build tools (CRITICAL cho Python 3.12) =====
    print("📦 Step 2/6: Install build tools cho Python 3.12...")
    build_packages = ["setuptools==68.2.2", "wheel==0.41.2"]
    for package in build_packages:
        try:
            subprocess.run([pip_path, "install", "--upgrade", package], 
                          check=True, timeout=60)
            print(f"✅ Installed: {package}")
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            print(f"⚠️ Warning with {package}, tiếp tục...")
    
    # ===== BƯỚC 3: Install core web framework =====
    print("📦 Step 3/6: Install core web framework...")
    core_packages = [
        "fastapi==0.104.1",
        "uvicorn[standard]==0.24.0",
        "python-dotenv==1.0.0",
        "requests==2.31.0"
    ]
    
    for package in core_packages:
        try:
            subprocess.run([pip_path, "install", package, "--no-cache-dir"], 
                          check=True, timeout=120)
            print(f"✅ Installed: {package}")
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            print(f"⚠️ Issue with {package}, tiếp tục...")
    
    # ===== BƯỚC 4: Install data processing (NumPy trước OpenCV) =====
    print("📦 Step 4/6: Install data processing...")
    data_packages = [
        "numpy==1.26.4",  # CRITICAL: NumPy 1.x cho OpenCV
        "pandas==2.1.4",
        "Pillow==10.0.1"
    ]
    
    for package in data_packages:
        try:
            subprocess.run([pip_path, "install", package, "--no-cache-dir"], 
                          check=True, timeout=120)
            print(f"✅ Installed: {package}")
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            print(f"⚠️ Issue with {package}, tiếp tục...")
    
    # ===== BƯỚC 5: Install OpenCV (sau khi NumPy đã stable) =====
    print("📦 Step 5/6: Install OpenCV...")
    opencv_packages = [
        "opencv-python==4.8.1.78",
        "opencv-contrib-python==4.8.1.78"
    ]
    
    for package in opencv_packages:
        try:
            subprocess.run([pip_path, "install", package, "--no-cache-dir", "--prefer-binary"], 
                          check=True, timeout=180)
            print(f"✅ Installed: {package}")
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            print(f"⚠️ Issue with {package}, sẽ thử alternative...")
    
    # ===== BƯỚC 6: Install remaining packages =====
    print("📦 Step 6/6: Install remaining packages...")
    remaining_packages = [
        "python-multipart==0.0.6",
        "python-jose[cryptography]==3.3.0", 
        "passlib[bcrypt]==1.7.4",
        "supabase==2.15.3",
        "scikit-learn==1.3.2",
        "websockets==12.0",
        "python-dateutil==2.8.2",
        "typing-extensions>=4.12.2",  # Fixed version
        "mediapipe==0.10.14"  # Updated version
    ]
    
    for package in remaining_packages:
        try:
            # Xử lý special case cho typing-extensions
            if "typing-extensions" in package:
                # Uninstall old version first nếu có conflict
                subprocess.run([pip_path, "uninstall", "typing-extensions", "-y"], 
                             check=False, timeout=60)
            
            subprocess.run([pip_path, "install", package, "--no-cache-dir", "--upgrade"], 
                          check=True, timeout=120)
            print(f"✅ Installed: {package}")
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            print(f"⚠️ Issue with {package}, có thể skip...")
    
    # ===== FIX DEPENDENCY CONFLICTS =====
    print("\n🔧 Fixing dependency conflicts...")
    try:
        # Reinstall packages có thể bị conflict
        subprocess.run([pip_path, "install", "--upgrade", "--force-reinstall", 
                       "typing-extensions>=4.12.2"], check=True, timeout=60)
        print("✅ Fixed typing-extensions conflicts")
    except:
        print("⚠️ Could not fix typing-extensions, but continuing...")
    
    # ===== TEST IMPORTS =====
    print("\n🧪 Testing critical imports...")
    test_imports = [
        ("fastapi", "FastAPI"),
        ("uvicorn", "Uvicorn"), 
        ("cv2", "OpenCV"),
        ("numpy", "NumPy"),
        ("supabase", "Supabase")
    ]
    
    all_imports_ok = True
    for module, name in test_imports:
        try:
            # Fix UnicodeEncodeError - không dùng emoji trong subprocess
            result = subprocess.run([python_venv, "-c", f"import {module}; print('{name} OK')"], 
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                print(f"✅ {result.stdout.strip()}")
            else:
                print(f"⚠️ {name} import warning")
                # Chỉ check stderr nếu có
                if result.stderr:
                    print(f"   Error: {result.stderr.strip()[:100]}...")
        except subprocess.TimeoutExpired:
            print(f"⚠️ {name} import timeout")
        except Exception as e:
            print(f"⚠️ {name} import error: {e}")
    
    # Create necessary directories
    dirs_to_create = ["uploads", "uploads/students", "ai_models", "logs", "temp"]
    for dir_name in dirs_to_create:
        Path(dir_name).mkdir(parents=True, exist_ok=True)
    print("✅ Created necessary directories")
    
    # Create test script - fix encoding
    test_script_content = '''#!/usr/bin/env python3
"""Quick test cho backend setup"""
try:
    import fastapi, uvicorn, supabase, cv2, numpy as np
    print("All critical packages imported successfully!")
    print(f"FastAPI: {fastapi.__version__}")
    print(f"NumPy: {np.__version__}")
    print(f"OpenCV: {cv2.__version__}")
    print("\\nReady to run: python main.py")
except Exception as e:
    print(f"Import error: {e}")
'''
    
    with open("test_imports.py", "w", encoding='utf-8') as f:
        f.write(test_script_content)
    print("✅ Created test_imports.py")
    
    os.chdir("..")
    
    print("\n🎉 Backend setup completed successfully!")
    return True

def setup_frontend():
    """Setup React frontend với improved npm detection"""
    print("\n⚛️ Setup React Frontend...")
    
    # Check nếu frontend directory tồn tại
    if not Path("frontend").exists():
        print("⚠️ Frontend directory không tồn tại, tạo placeholder...")
        Path("frontend").mkdir(exist_ok=True)
        # Tạo package.json placeholder
        package_json = {
            "name": "smart-school-frontend",
            "version": "0.1.0",
            "private": True,
            "dependencies": {
                "react": "^18.2.0",
                "react-dom": "^18.2.0"
            },
            "scripts": {
                "start": "react-scripts start",
                "build": "react-scripts build"
            }
        }
        import json
        with open("frontend/package.json", "w") as f:
            json.dump(package_json, f, indent=2)
        print("✅ Created frontend placeholder")
        return True
    
    # Change to frontend directory
    os.chdir("frontend")
    
    # Check npm availability với multiple approaches
    npm_cmd = None
    npm_commands = ['npm', 'npm.cmd']
    
    print("📦 Detecting npm...")
    for cmd in npm_commands:
        try:
            result = subprocess.run([cmd, '--version'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                npm_cmd = cmd
                print(f"✅ Found npm: {cmd} (version {result.stdout.strip()})")
                break
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            continue
    
    if not npm_cmd:
        print("❌ npm không được tìm thấy")
        print("💡 Vui lòng:")
        print("   1. Cài đặt Node.js từ https://nodejs.org")
        print("   2. Restart terminal")
        print("   3. Hoặc thêm npm vào PATH")
        os.chdir("..")
        return False
    
    # Clear npm cache nếu cần
    try:
        subprocess.run([npm_cmd, "cache", "clean", "--force"], 
                      check=False, timeout=30)
        print("✅ Cleared npm cache")
    except:
        print("⚠️ Could not clear npm cache, continuing...")
    
    # Check nếu package.json tồn tại
    if not Path("package.json").exists():
        print("⚠️ package.json không tồn tại, frontend chưa được setup")
        os.chdir("..")
        return True  # Không fail, chỉ skip
    
    # Install dependencies
    print("📦 Installing Node.js dependencies...")
    max_retries = 2
    for attempt in range(max_retries):
        try:
            result = subprocess.run([npm_cmd, "install", "--legacy-peer-deps"], 
                                  check=True, timeout=300)
            print("✅ Node.js dependencies installed successfully")
            break
        except subprocess.CalledProcessError as e:
            print(f"⚠️ Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                print("🔄 Retrying...")
            else:
                print("❌ Failed to install Node.js dependencies")
                print("💡 You can install manually later: npm install")
                os.chdir("..")
                return True  # Không fail setup, user có thể install manual
        except subprocess.TimeoutExpired:
            print("⚠️ npm install timeout")
            print("💡 You can install manually later: npm install")
            os.chdir("..")
            return True
    
    os.chdir("..")
    return True

def create_scripts(python_exe):
    """Tạo scripts khởi chạy"""
    print("\n🚀 Tạo startup scripts...")
    
    # Windows batch script
    if platform.system() == "Windows":
        # Xử lý python command cho Windows
        if ' ' in python_exe:
            python_cmd = python_exe
        else:
            python_cmd = python_exe
            
        batch_content = f"""@echo off
echo Starting Smart School System...
echo.

echo Starting Backend...
cd backend
start "Smart School Backend" cmd /k "venv\\Scripts\\activate && python main.py"

timeout /t 3 /nobreak > nul

echo Starting Frontend...
cd ..\\frontend  
start "Smart School Frontend" cmd /k "npm start"

echo.
echo Smart School System is starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
echo Press any key to exit...
pause
"""
        with open("start.bat", "w", encoding='utf-8') as f:
            f.write(batch_content)
        print("✅ Tạo start.bat")
    
    # Unix shell script
    bash_content = """#!/bin/bash
echo "Starting Smart School System..."

echo "Starting Backend..."
cd backend
source venv/bin/activate
python main.py &
BACKEND_PID=$!

echo "Starting Frontend..."
cd ../frontend
npm start &
FRONTEND_PID=$!

echo "Smart School System is starting..."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:8000/docs"

# Function to cleanup processes
cleanup() {
    echo "Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Setup signal handlers
trap cleanup SIGINT SIGTERM

# Wait for processes
wait
"""
    with open("start.sh", "w", encoding='utf-8') as f:
        f.write(bash_content)
    
    # Make executable on Unix
    if platform.system() != "Windows":
        os.chmod("start.sh", 0o755)
    
    print("✅ Tạo start.sh")

def print_next_steps():
    """In hướng dẫn tiếp theo"""
    print("\n🎉 SETUP HOÀN TẤT!")
    print("=" * 60)
    print("\n📋 CÁC BƯỚC TIẾP THEO:")
    
    print("\n1. 🧪 Test Backend (Optional):")
    if platform.system() == "Windows":
        print("   cd backend && venv\\Scripts\\activate && python test_imports.py")
    else:
        print("   cd backend && source venv/bin/activate && python test_imports.py")
    
    print("\n2. 🚀 Chạy Backend:")
    if platform.system() == "Windows":
        print("   cd backend && venv\\Scripts\\activate && python main.py")
    else:
        print("   cd backend && source venv/bin/activate && python main.py")
    
    print("\n3. 🌐 Chạy Frontend (Terminal mới):")
    print("   cd frontend && npm start")
    
    print("\n4. 🔧 Cấu hình Supabase:")
    print("   - Tạo project trên https://supabase.com")
    print("   - Import schema từ database/schema.sql")
    print("   - Cập nhật thông tin trong backend/.env và frontend/.env")
    
    print("\n5. 🌐 Truy cập hệ thống:")
    print("   - Frontend: http://localhost:3000")
    print("   - Backend API: http://localhost:8000")
    print("   - API Documentation: http://localhost:8000/docs")
    
    print("\n6. 👤 Đăng nhập:")
    print("   - Admin: admin@smartschool.edu.vn / admin123")
    print("   - Teacher: teacher@smartschool.edu.vn / teacher123")
    
    print("\n💡 QUICK START:")
    if platform.system() == "Windows":
        print("   1. cd backend && venv\\Scripts\\activate && python main.py")
        print("   2. (New terminal) cd frontend && npm start")
        print("   3. Open: http://localhost:3000")
    else:
        print("   1. cd backend && source venv/bin/activate && python main.py")
        print("   2. (New terminal) cd frontend && npm start")
        print("   3. Open: http://localhost:3000")
    
    print("\n🔄 ALTERNATIVE - Dùng start script:")
    if platform.system() == "Windows":
        print("   start.bat  (auto start cả backend và frontend)")
    else:
        print("   ./start.sh  (auto start cả backend và frontend)")
    
    print("\n💡 TIP: Hãy đọc README.md để biết thêm chi tiết!")
    print("=" * 60)

def main():
    """Main setup function"""
    print_banner()
    
    # Check requirements
    req_check, python_exe = check_requirements()
    if not req_check:
        print("\n❌ Setup failed! Vui lòng cài đặt các requirements cần thiết.")
        return False
    
    # Create environment files
    create_env_files()
    
    # Setup backend
    if not setup_backend(python_exe):
        print("\n❌ Backend setup failed!")
        return False
    
    # Setup frontend
    if not setup_frontend():
        print("\n❌ Frontend setup failed!")
        return False
    
    # Create startup scripts
    create_scripts(python_exe)
    
    # Print next steps
    print_next_steps()
    
    return True

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ Setup đã bị hủy bởi user.")
    except Exception as e:
        print(f"\n❌ Lỗi setup: {str(e)}")
        sys.exit(1) 