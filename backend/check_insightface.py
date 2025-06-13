from ai.face_recognition_insightface import insightface_service

def check_insightface():
    print("=== Checking InsightFace Service ===")
    
    if insightface_service is None:
        print("❌ InsightFace service is None")
        return False
    
    print("✅ InsightFace service object exists")
    
    # Check if app is initialized
    if insightface_service.app is None:
        print("❌ InsightFace app not initialized")
        print("Trying to initialize...")
        success = insightface_service._initialize_sync()
        if not success:
            print("❌ Failed to initialize InsightFace")
            return False
        else:
            print("✅ InsightFace initialized successfully")
    else:
        print("✅ InsightFace app is initialized")
    
    # Get service info
    info = insightface_service.get_service_info()
    print(f"Service info: {info}")
    
    return True

if __name__ == "__main__":
    check_insightface() 