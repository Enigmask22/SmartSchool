#!/usr/bin/env python3
"""Quick test cho backend setup"""
try:
    import fastapi, uvicorn, supabase, cv2, numpy as np
    print("All critical packages imported successfully!")
    print(f"FastAPI: {fastapi.__version__}")
    print(f"NumPy: {np.__version__}")
    print(f"OpenCV: {cv2.__version__}")
    print("\nReady to run: python main.py")
except Exception as e:
    print(f"Import error: {e}")
