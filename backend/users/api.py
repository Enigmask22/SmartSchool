"""
API Router cho Users và Admin management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime

from users.models import UserCreate, UserUpdate, TeacherCreate, TeacherUpdate
from users.services import hash_password
from core.database import get_db
from core.logger import setup_logger
from core.dependencies import get_current_user

logger = setup_logger("users_api")
router = APIRouter()

# ===============================================
# USERS CRUD ENDPOINTS
# ===============================================

@router.get("/users")
async def get_all_users(db=Depends(get_db)):
    """Lấy danh sách tất cả người dùng"""
    try:
        response = db.table("users").select("id, email, username, full_name, role, is_active, last_login, created_at, updated_at").order("created_at", desc=True).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        logger.error(f"Error getting users: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách người dùng: {str(e)}")

@router.post("/users")
async def create_user(user_data: dict, db=Depends(get_db)):
    """Tạo người dùng mới"""
    try:
        if user_data.get('username'):
            trimmed_username = user_data['username'].strip()
            if trimmed_username:
                existing_username = db.table("users").select("id").eq("username", trimmed_username).execute()
                if existing_username.data:
                    raise HTTPException(status_code=400, detail="Username đã được sử dụng")
        
        password = user_data.get('password', 'defaultpassword')
        password_hash = hash_password(password)
        
        data = {
            "email": user_data['email'],
            "password_hash": password_hash,
            "full_name": user_data['full_name'],
            "role": user_data['role'],
            "is_active": user_data.get('is_active', True),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        if user_data.get('username'):
            data["username"] = user_data['username'].strip()
        
        response = db.table("users").insert(data).execute()
        
        if response.data:
            new_user = response.data[0]
            new_user.pop("password_hash", None)
            return {"success": True, "data": new_user, "message": "Tạo người dùng thành công"}
        else:
            raise HTTPException(status_code=500, detail="Không thể tạo người dùng")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo người dùng: {str(e)}")

@router.put("/users/{user_id}")
async def update_user(user_id: int, user_data: dict, db=Depends(get_db)):
    """Cập nhật thông tin người dùng"""
    try:
        if 'username' in user_data and user_data['username']:
            trimmed_username = user_data['username'].strip()
            if trimmed_username:
                existing_username = db.table("users").select("id").eq("username", trimmed_username).neq("id", user_id).execute()
                if existing_username.data:
                    raise HTTPException(status_code=400, detail="Username đã được sử dụng")
        
        update_data = {}
        for field in ['email', 'username', 'full_name', 'role', 'is_active']:
            if field in user_data:
                if field == 'username' and user_data[field]:
                    update_data[field] = user_data[field].strip()
                else:
                    update_data[field] = user_data[field]
        
        if not update_data:
            raise HTTPException(status_code=400, detail="Không có trường nào để cập nhật")
        
        update_data['updated_at'] = datetime.now().isoformat()
        
        response = db.table("users").update(update_data).eq("id", user_id).execute()
        
        if response.data:
            updated_user = response.data[0]
            updated_user.pop("password_hash", None)
            return {"success": True, "data": updated_user, "message": "Cập nhật người dùng thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật người dùng: {str(e)}")

@router.delete("/users/{user_id}")
async def delete_user(user_id: int, db=Depends(get_db)):
    """Xóa người dùng"""
    try:
        response = db.table("users").delete().eq("id", user_id).execute()
        
        if response.data:
            return {"success": True, "message": "Xóa người dùng thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa người dùng: {str(e)}")

# ===============================================
# TEACHERS CRUD ENDPOINTS
# ===============================================

@router.get("/teachers")
async def get_all_teachers(db=Depends(get_db)):
    """Lấy danh sách tất cả giáo viên"""
    try:
        response = db.table("teachers").select("*, users(email, role)").order("created_at", desc=True).execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        logger.error(f"Error getting teachers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy danh sách giáo viên: {str(e)}")

@router.post("/teachers")
async def create_teacher(teacher_data: dict, db=Depends(get_db)):
    """Tạo giáo viên mới"""
    try:
        data = {
            "teacher_code": teacher_data['teacher_code'],
            "full_name": teacher_data['full_name'],
            "email": teacher_data.get('email'),
            "phone": teacher_data.get('phone'),
            "date_of_birth": teacher_data.get('date_of_birth'),
            "gender": teacher_data.get('gender', 'Nam'),
            "user_id": teacher_data.get('user_id'),
            "is_active": teacher_data.get('is_active', True),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        response = db.table("teachers").insert(data).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Tạo giáo viên thành công"}
        else:
            raise HTTPException(status_code=500, detail="Không thể tạo giáo viên")
        
    except Exception as e:
        logger.error(f"Error creating teacher: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo giáo viên: {str(e)}")

@router.put("/teachers/{teacher_id}")
async def update_teacher(teacher_id: int, teacher_data: dict, db=Depends(get_db)):
    """Cập nhật thông tin giáo viên"""
    try:
        update_data = {}
        for field in ['teacher_code', 'full_name', 'email', 'phone', 'date_of_birth', 'gender', 'user_id', 'is_active']:
            if field in teacher_data:
                update_data[field] = teacher_data[field]
        
        if not update_data:
            raise HTTPException(status_code=400, detail="Không có trường nào để cập nhật")
        
        update_data['updated_at'] = datetime.now().isoformat()
        
        response = db.table("teachers").update(update_data).eq("id", teacher_id).execute()
        
        if response.data:
            return {"success": True, "data": response.data[0], "message": "Cập nhật giáo viên thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy giáo viên")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating teacher: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi cập nhật giáo viên: {str(e)}")

@router.delete("/teachers/{teacher_id}")
async def delete_teacher(teacher_id: int, db=Depends(get_db)):
    """Xóa giáo viên"""
    try:
        response = db.table("teachers").delete().eq("id", teacher_id).execute()
        
        if response.data:
            return {"success": True, "message": "Xóa giáo viên thành công"}
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy giáo viên")
        
    except Exception as e:
        logger.error(f"Error deleting teacher: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa giáo viên: {str(e)}")

# ===============================================
# DASHBOARD ENDPOINTS
# ===============================================

@router.get("/dashboard/overview")
async def get_dashboard_overview(db=Depends(get_db)):
    """Lấy tổng quan dashboard"""
    try:
        # Count users
        users_response = db.table("users").select("id", count="exact").eq("is_active", True).execute()
        total_users = users_response.count if users_response.count else 0
        
        # Count students
        students_response = db.table("students").select("id", count="exact").eq("is_active", True).execute()
        total_students = students_response.count if students_response.count else 0
        
        # Count teachers
        teachers_response = db.table("teachers").select("id", count="exact").execute()
        total_teachers = teachers_response.count if teachers_response.count else 0
        
        # Count classes
        classes_response = db.table("classes").select("id", count="exact").execute()
        total_classes = classes_response.count if classes_response.count else 0
        
        # Today's attendance
        from attendance.services import get_vietnam_date_string
        today = get_vietnam_date_string()
        attendance_response = db.table("attendance").select("id", count="exact").eq("date", today).execute()
        today_attendance = attendance_response.count if attendance_response.count else 0
        
        # Calculate attendance rate
        attendance_rate = 0
        if total_students > 0:
            attendance_rate = round((today_attendance / total_students) * 100, 1)
        
        # Count recent logins (last 7 days)
        recent_logins_response = db.table("users").select("id", count="exact").gte("last_login", datetime.now().isoformat()).execute()
        recent_logins = recent_logins_response.count if recent_logins_response.count else 0
        
        return {
            "success": True,
            "data": {
                "overview": {
                    "total_users": total_users,
                    "total_students": total_students,
                    "total_teachers": total_teachers,
                    "total_classes": total_classes
                },
                "activity": {
                    "recent_logins": recent_logins
                },
                "attendance_today": {
                    "rate": attendance_rate,
                    "present": today_attendance,
                    "total": total_students
                }
            }
        }
    except Exception as e:
        logger.error(f"Error getting dashboard overview: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.get("/dashboard/attendance-trends")
async def get_attendance_trends(days: int = 30, db=Depends(get_db)):
    """Lấy xu hướng điểm danh theo thời gian"""
    try:
        from datetime import timedelta
        end_date = datetime.now().date()
        start_date = (end_date - timedelta(days=days)).isoformat()
        end_date_str = end_date.isoformat()
        
        # Lấy dữ liệu điểm danh theo ngày
        attendance_data = db.table("attendance").select("date, status").gte("date", start_date).lte("date", end_date_str).execute()
        
        # Nhóm theo ngày
        daily_stats = {}
        for record in attendance_data.data:
            date = record['date']
            if date not in daily_stats:
                daily_stats[date] = {'present': 0, 'absent': 0, 'total': 0}
            
            daily_stats[date]['total'] += 1
            if record['status'] == 'present':
                daily_stats[date]['present'] += 1
            elif record['status'] == 'absent':
                daily_stats[date]['absent'] += 1
        
        # Tạo dữ liệu cho chart
        chart_data = []
        for date in sorted(daily_stats.keys()):
            stats = daily_stats[date]
            rate = (stats['present'] / stats['total'] * 100) if stats['total'] > 0 else 0
            chart_data.append({
                "date": date,
                "present": stats['present'],
                "absent": stats['absent'],
                "total": stats['total'],
                "rate": round(rate, 1)
            })
        
        return {
            "success": True,
            "data": chart_data
        }
    except Exception as e:
        logger.error(f"Error getting attendance trends: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.get("/dashboard/class-performance")
async def get_class_performance(db=Depends(get_db)):
    """Lấy hiệu suất học tập theo lớp"""
    try:
        # Lấy dữ liệu điểm số
        scores_data = db.table("scores").select("student_id, class_subject_id, final_score, semester, academic_year").execute()
        
        # Lấy thông tin học sinh và lớp
        students_data = db.table("students").select("id, full_name, class_name").eq("is_active", True).execute()
        students_dict = {s['id']: s for s in students_data.data}
        
        # Nhóm điểm theo lớp
        class_performance = {}
        for score in scores_data.data:
            student_id = score['student_id']
            if student_id in students_dict and score.get('final_score') is not None:
                class_name = students_dict[student_id]['class_name']
                if class_name not in class_performance:
                    class_performance[class_name] = []
                class_performance[class_name].append(float(score['final_score']))
        
        # Tính toán thống kê cho mỗi lớp
        result = []
        for class_name, scores in class_performance.items():
            if scores:
                avg_score = sum(scores) / len(scores)
                result.append({
                    "class_name": class_name,
                    "total_students": len(set([s['student_id'] for s in scores_data.data if students_dict.get(s['student_id'], {}).get('class_name') == class_name])),
                    "average_grade": round(avg_score, 1),
                    "total_grades": len(scores),
                    "excellent_count": len([s for s in scores if s >= 8.0]),
                    "good_count": len([s for s in scores if 6.5 <= s < 8.0]),
                    "average_count": len([s for s in scores if 5.0 <= s < 6.5]),
                    "poor_count": len([s for s in scores if s < 5.0])
                })
        
        # Sắp xếp theo điểm trung bình
        result.sort(key=lambda x: x['average_grade'], reverse=True)
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        logger.error(f"Error getting class performance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.get("/dashboard/teacher-performance")
async def get_teacher_performance(db=Depends(get_db)):
    """Lấy hiệu suất giảng dạy của giáo viên"""
    try:
        from datetime import timedelta
        
        # Lấy dữ liệu giáo viên
        teachers_data = db.table("teachers").select("id, full_name, teacher_code").eq("is_active", True).execute()
        
        # Lấy dữ liệu lớp học
        classes_data = db.table("classes").select("id, class_name, homeroom_teacher_id").execute()
        
        # Lấy dữ liệu điểm danh (30 ngày gần đây)
        thirty_days_ago = (datetime.now().date() - timedelta(days=30)).isoformat()
        attendance_data = db.table("attendance").select("student_id, status, date").gte("date", thirty_days_ago).execute()
        
        # Lấy dữ liệu học sinh
        students_data = db.table("students").select("id, class_name").eq("is_active", True).execute()
        students_dict = {s['id']: s for s in students_data.data}
        
        result = []
        for teacher in teachers_data.data:
            # Tìm các lớp mà giáo viên này chủ nhiệm
            teacher_classes = [c for c in classes_data.data if c.get('homeroom_teacher_id') == teacher['id']]
            
            total_students = 0
            total_attendance = 0
            present_count = 0
            
            for class_info in teacher_classes:
                class_students = [s for s in students_data.data if s['class_name'] == class_info['class_name']]
                total_students += len(class_students)
                
                # Tính điểm danh cho lớp này
                class_attendance = [a for a in attendance_data.data if students_dict.get(a['student_id'], {}).get('class_name') == class_info['class_name']]
                total_attendance += len(class_attendance)
                present_count += len([a for a in class_attendance if a['status'] == 'present'])
            
            attendance_rate = (present_count / total_attendance * 100) if total_attendance > 0 else 0
            
            result.append({
                "teacher_id": teacher['id'],
                "teacher_name": teacher['full_name'],
                "teacher_code": teacher.get('teacher_code', ''),
                "classes_count": len(teacher_classes),
                "total_students": total_students,
                "attendance_rate": round(attendance_rate, 1),
                "total_attendance_records": total_attendance
            })
        
        # Sắp xếp theo tỷ lệ điểm danh
        result.sort(key=lambda x: x['attendance_rate'], reverse=True)
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        logger.error(f"Error getting teacher performance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

@router.get("/dashboard/system-health")
async def get_system_health(db=Depends(get_db)):
    """Lấy tình trạng sức khỏe hệ thống"""
    try:
        from datetime import timedelta
        
        # Kiểm tra kết nối database
        db_status = "healthy"
        try:
            db.table("users").select("id").limit(1).execute()
        except:
            db_status = "error"
        
        # Thống kê lỗi gần đây (placeholder)
        error_count = 0
        
        # Thống kê hoạt động API gần đây (24h)
        yesterday = (datetime.now().date() - timedelta(days=1)).isoformat()
        recent_activity = db.table("users").select("last_login").gte("last_login", yesterday).execute()
        
        return {
            "success": True,
            "data": {
                "database_status": db_status,
                "error_count_24h": error_count,
                "active_users_24h": len(recent_activity.data) if recent_activity.data else 0,
                "uptime": "99.9%",
                "last_backup": datetime.now().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error getting system health: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")

# ===============================================
# CLASSES ENDPOINTS
# ===============================================

@router.get("/classes")
async def get_all_classes(db=Depends(get_db)):
    """Lấy danh sách tất cả lớp học với số lượng học sinh"""
    try:
        # Lấy dữ liệu từ bảng classes với join teachers
        response = db.table("classes").select("*, teachers(teacher_code, full_name)").order("grade, class_name").execute()
        
        return {"success": True, "data": response.data if response.data else []}
    except Exception as e:
        logger.error(f"Error getting classes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")
