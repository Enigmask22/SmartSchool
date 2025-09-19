"""
InsightFace Monkey Patch để force custom cache path
Workaround cho issue INSIGHTFACE_HOME environment variable không work
"""

import os
import sys

def patch_insightface_cache_path(custom_cache_path="./insightface_cache"):
    """
    Monkey patch InsightFace để force sử dụng custom cache path
    Phải được gọi TRƯỚC KHI import insightface
    """
    try:
        # Tạo thư mục cache nếu chưa có
        os.makedirs(custom_cache_path, exist_ok=True)
        abs_cache_path = os.path.abspath(custom_cache_path)
        
        print(f"🔧 Monkey patching InsightFace cache path: {abs_cache_path}")
        
        # Method 1: Set environment variable (backup approach)
        os.environ['INSIGHTFACE_HOME'] = abs_cache_path
        
        # Method 2: Patch os.path.expanduser để trick InsightFace
        original_expanduser = os.path.expanduser
        
        def patched_expanduser(path):
            """Patched expanduser to redirect ~/.insightface to custom path"""
            # Convert path to string if it's a Path object
            path_str = str(path) if hasattr(path, '__fspath__') else path
            
            if path_str == "~/.insightface" or path_str.endswith("/.insightface") or path_str.endswith("\\.insightface"):
                print(f"🎯 Redirecting {path_str} to {abs_cache_path}")
                return abs_cache_path
            return original_expanduser(path)
        
        # Apply patch
        os.path.expanduser = patched_expanduser
        
        print(f"✅ InsightFace cache path monkey patch applied")
        return abs_cache_path
        
    except Exception as e:
        print(f"❌ Error applying InsightFace monkey patch: {e}")
        return None

def patch_insightface_model_zoo():
    """
    Alternative approach: Patch InsightFace model_zoo directly
    """
    try:
        # Import InsightFace modules để patch
        import insightface.model_zoo as model_zoo
        
        # Override default model root
        custom_model_root = os.path.abspath("./insightface_cache/models")
        os.makedirs(custom_model_root, exist_ok=True)
        
        if hasattr(model_zoo, 'model_root'):
            original_model_root = model_zoo.model_root
            model_zoo.model_root = custom_model_root
            print(f"🔧 Override model_zoo.model_root: {original_model_root} -> {custom_model_root}")
        
        # Patch get_model_root function if exists
        if hasattr(model_zoo, 'get_model_root'):
            original_get_model_root = model_zoo.get_model_root
            
            def patched_get_model_root():
                print(f"🎯 Using patched model root: {custom_model_root}")
                return custom_model_root
            
            model_zoo.get_model_root = patched_get_model_root
        
        return custom_model_root
        
    except ImportError:
        print("⚠️ InsightFace not installed, cannot apply model_zoo patch")
        return None
    except Exception as e:
        print(f"❌ Error patching model_zoo: {e}")
        return None

def comprehensive_insightface_patch(custom_cache_path="./insightface_cache"):
    """
    Comprehensive patching approach - multiple methods
    """
    print("🚀 Applying comprehensive InsightFace cache path patches...")
    
    # Method 1: Basic environment variable
    abs_cache_path = os.path.abspath(custom_cache_path)
    os.makedirs(abs_cache_path, exist_ok=True)
    os.environ['INSIGHTFACE_HOME'] = abs_cache_path
    print(f"1️⃣ Set INSIGHTFACE_HOME = {abs_cache_path}")
    
    # Method 2: Patch expanduser
    patch_insightface_cache_path(custom_cache_path)
    
    # Method 3: Try to patch HOME environment variable as fallback
    if os.name == 'posix':  # Unix-like systems
        # Set HOME to parent of custom cache so ~/.insightface becomes custom_cache_path
        fake_home = os.path.dirname(abs_cache_path)
        if os.path.basename(abs_cache_path) == '.insightface':
            os.environ['HOME'] = fake_home
            print(f"3️⃣ Set fake HOME = {fake_home} (Unix)")
    else:  # Windows
        # Set USERPROFILE to redirect %USERPROFILE%\.insightface
        fake_userprofile = os.path.dirname(abs_cache_path)
        if os.path.basename(abs_cache_path) == '.insightface':
            os.environ['USERPROFILE'] = fake_userprofile
            print(f"3️⃣ Set fake USERPROFILE = {fake_userprofile} (Windows)")
    
    print("✅ Comprehensive InsightFace patches applied")
    return abs_cache_path

# Global flag để tránh patch multiple times
_PATCH_APPLIED = False

def ensure_insightface_patch(custom_cache_path="./insightface_cache"):
    """Ensure InsightFace patch chỉ được apply một lần"""
    global _PATCH_APPLIED
    
    if not _PATCH_APPLIED:
        comprehensive_insightface_patch(custom_cache_path)
        _PATCH_APPLIED = True
        print("🎯 InsightFace comprehensive patch completed")
    else:
        print("♻️ InsightFace patch already applied")
