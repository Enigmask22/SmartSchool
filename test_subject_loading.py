#!/usr/bin/env python3
"""
Test script để kiểm tra việc load subject_selected
"""

import requests
import json

def test_student_subject_loading():
    """Test việc load subject_selected từ database"""
    
    print("Testing Student Subject Loading")
    print("=" * 50)
    
    # Test 1: Lấy danh sách học sinh từ homeroom endpoint
    print("Test 1: /api/homeroom/students")
    try:
        response = requests.get("http://localhost:8000/api/homeroom/students")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"OK Success: {data.get('success')}")
            students = data.get('data', [])
            print(f"   Students count: {len(students)}")
            
            # Tìm học sinh 250002
            student_250002 = None
            for student in students:
                if student.get('student_id') == '250002':
                    student_250002 = student
                    break
            
            if student_250002:
                print(f"   OK Found student 250002: {student_250002.get('full_name')}")
                print(f"   Subject selected: {student_250002.get('subject_selected')}")
                print(f"   Subject selected type: {type(student_250002.get('subject_selected'))}")
            else:
                print("   ERROR Student 250002 not found")
                
        else:
            print(f"ERROR Error: {response.text}")
    except Exception as e:
        print(f"ERROR Connection error: {str(e)}")
    
    print("\n" + "-" * 30)
    
    # Test 2: Lấy thông tin học sinh cụ thể
    print("Test 2: /api/students/2 (assuming student 250002 has id=2)")
    try:
        response = requests.get("http://localhost:8000/api/students/2")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"OK Success: {data.get('success')}")
            student = data.get('data')
            if student:
                print(f"   Student ID: {student.get('student_id')}")
                print(f"   Full name: {student.get('full_name')}")
                print(f"   Subject selected: {student.get('subject_selected')}")
                print(f"   Subject selected type: {type(student.get('subject_selected'))}")
        else:
            print(f"ERROR Error: {response.text}")
    except Exception as e:
        print(f"ERROR Connection error: {str(e)}")

if __name__ == "__main__":
    test_student_subject_loading()
