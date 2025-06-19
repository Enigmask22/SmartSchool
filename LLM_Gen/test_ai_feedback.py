#!/usr/bin/env python3
"""
Test script cho AI Feedback API
Kiểm tra các endpoint API cho chức năng tạo nhận xét học sinh
"""

import requests
import json
import time
from typing import Dict, List

# Cấu hình API
API_BASE_URL = "http://localhost:8000"
FEEDBACK_API_URL = f"{API_BASE_URL}/api/feedback"

def test_api_health():
    """Test health check endpoint"""
    print("🔍 Kiểm tra tình trạng API...")
    
    try:
        response = requests.get(f"{FEEDBACK_API_URL}/health")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API Health Check: {data['message']}")
            return True
        else:
            print(f"❌ API Health Check failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Không thể kết nối API: {e}")
        return False

def test_single_feedback():
    """Test tạo nhận xét cho một học sinh"""
    print("\n📝 Test tạo nhận xét đơn lẻ...")
    
    test_data = {
        "student_name": "Nguyễn Văn An",
        "score": 8.5,
        "score_trend": "tăng",
        "attendance_rate": 95,
        "notes": "Học sinh rất tích cực tham gia hoạt động lớp và luôn hoàn thành bài tập đúng hạn"
    }
    
    try:
        response = requests.post(
            f"{FEEDBACK_API_URL}/generate-feedback",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            
            if result['success']:
                print(f"✅ Tạo nhận xét thành công cho {result['student_name']}")
                print(f"💬 Nhận xét: {result['feedback']}")
                return True
            else:
                print(f"❌ API trả về lỗi: {result.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Lỗi khi test single feedback: {e}")
        return False

def test_batch_feedback():
    """Test tạo nhận xét hàng loạt"""
    print("\n📚 Test tạo nhận xét hàng loạt...")
    
    test_students = [
        {
            "student_name": "Trần Thị Bình",
            "score": 7.2,
            "score_trend": "ổn định",
            "attendance_rate": 88,
            "notes": "Cần cải thiện kỹ năng thuyết trình"
        },
        {
            "student_name": "Lê Hoàng Cường",
            "score": 6.5,
            "score_trend": "giảm",
            "attendance_rate": 78,
            "notes": "Thường xuyên vắng mặt, cần sự quan tâm hỗ trợ thêm"
        },
        {
            "student_name": "Phạm Thị Dung",
            "score": 9.0,
            "score_trend": "tăng",
            "attendance_rate": 98,
            "notes": "Học sinh xuất sắc, luôn đứng đầu lớp"
        }
    ]
    
    batch_data = {"students": test_students}
    
    try:
        response = requests.post(
            f"{FEEDBACK_API_URL}/generate-batch-feedback",
            json=batch_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            
            if result['success']:
                print(f"✅ Tạo nhận xét hàng loạt thành công!")
                print(f"📊 Thống kê: {result['success_count']}/{len(test_students)} thành công")
                
                if result['failed_count'] > 0:
                    print(f"⚠️ Thất bại: {result['failed_students']}")
                
                print("\n💬 Các nhận xét được tạo:")
                for student_name, feedback in result['feedbacks'].items():
                    print(f"- {student_name}: {feedback}")
                
                return True
            else:
                print(f"❌ Batch feedback failed")
                return False
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Lỗi khi test batch feedback: {e}")
        return False

def test_invalid_data():
    """Test với dữ liệu không hợp lệ"""
    print("\n🚫 Test validation với dữ liệu không hợp lệ...")
    
    invalid_tests = [
        {
            "name": "Điểm số âm",
            "data": {
                "student_name": "Test Student",
                "score": -1,
                "score_trend": "tăng",
                "attendance_rate": 95,
                "notes": ""
            }
        },
        {
            "name": "Điểm số > 10",
            "data": {
                "student_name": "Test Student",
                "score": 11,
                "score_trend": "tăng",
                "attendance_rate": 95,
                "notes": ""
            }
        },
        {
            "name": "Xu hướng không hợp lệ",
            "data": {
                "student_name": "Test Student",
                "score": 8.0,
                "score_trend": "invalid_trend",
                "attendance_rate": 95,
                "notes": ""
            }
        },
        {
            "name": "Chuyên cần > 100%",
            "data": {
                "student_name": "Test Student",
                "score": 8.0,
                "score_trend": "tăng",
                "attendance_rate": 120,
                "notes": ""
            }
        }
    ]
    
    success_count = 0
    
    for test_case in invalid_tests:
        try:
            response = requests.post(
                f"{FEEDBACK_API_URL}/generate-feedback",
                json=test_case["data"],
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 422 or response.status_code == 400:
                print(f"✅ {test_case['name']}: Validation hoạt động đúng")
                success_count += 1
            else:
                print(f"❌ {test_case['name']}: Validation không hoạt động (status: {response.status_code})")
                
        except Exception as e:
            print(f"❌ {test_case['name']}: Lỗi {e}")
    
    return success_count == len(invalid_tests)

def test_endpoint_performance():
    """Test hiệu suất của endpoint"""
    print("\n⚡ Test hiệu suất API...")
    
    test_data = {
        "student_name": "Performance Test Student",
        "score": 8.0,
        "score_trend": "tăng",
        "attendance_rate": 90,
        "notes": "Test performance"
    }
    
    start_time = time.time()
    
    try:
        response = requests.post(
            f"{FEEDBACK_API_URL}/generate-feedback",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=30  # 30 seconds timeout
        )
        
        end_time = time.time()
        response_time = end_time - start_time
        
        if response.status_code == 200:
            print(f"✅ API response time: {response_time:.2f} seconds")
            
            if response_time < 10:
                print("🚀 Hiệu suất tốt!")
                return True
            elif response_time < 20:
                print("⚠️ Hiệu suất trung bình")
                return True
            else:
                print("🐌 Hiệu suất chậm")
                return False
        else:
            print(f"❌ API failed with status: {response.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        print("⏰ API timeout (>30s)")
        return False
    except Exception as e:
        print(f"❌ Performance test error: {e}")
        return False

def main():
    """Chạy tất cả các test"""
    print("🧪 Bắt đầu test AI Feedback API")
    print("=" * 50)
    
    tests = [
        ("API Health Check", test_api_health),
        ("Single Feedback", test_single_feedback),
        ("Batch Feedback", test_batch_feedback),
        ("Invalid Data Validation", test_invalid_data),
        ("Performance Test", test_endpoint_performance)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        
        try:
            result = test_func()
            results.append((test_name, result))
            
            if result:
                print(f"✅ {test_name}: PASS")
            else:
                print(f"❌ {test_name}: FAIL")
                
        except Exception as e:
            print(f"💥 {test_name}: ERROR - {e}")
            results.append((test_name, False))
        
        # Pause between tests
        time.sleep(1)
    
    # Summary
    print("\n" + "="*50)
    print("📊 KẾT QUẢ TỔNG KẾT")
    print("="*50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:.<30} {status}")
    
    print(f"\nTổng kết: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 Tất cả tests đều PASS! API sẵn sàng sử dụng.")
        return True
    else:
        print(f"⚠️ {total - passed} tests thất bại. Cần kiểm tra lại.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1) 