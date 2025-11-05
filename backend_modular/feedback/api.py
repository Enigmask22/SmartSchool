"""
API Router cho AI Feedback
"""

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from typing import Optional
from feedback.models import (
    StudentFeedbackRequest, 
    StudentFeedbackResponse, 
    BatchFeedbackRequest,
    BatchFeedbackResponse,
    SMSFeedbackRequest,
    ResponseModel,
    CommentCreateRequest,
    CommentResponse,
    CommentResponseModel
)
from feedback.services import feedback_service
from core.logger import setup_logger
from core.database import get_db

logger = setup_logger("feedback_api")
router = APIRouter()

@router.post("/generate-feedback")
async def generate_student_feedback(request: StudentFeedbackRequest):
    """Tạo nhận xét cho học sinh"""
    try:
        feedback = await feedback_service.generate_feedback(
            student_name=request.student_name,
            score=request.score,
            attendance_rate=request.attendance_rate,
            subject=request.subject,
            top_subjects=request.top_subjects or [],
            weak_subjects=request.weak_subjects or [],
            notes=request.notes
        )
        
        return StudentFeedbackResponse(
            success=True,
            student_name=request.student_name,
            feedback=feedback
        )
    except Exception as e:
        logger.error(f"Error generating feedback: {str(e)}")
        return StudentFeedbackResponse(
            success=False,
            student_name=request.student_name,
            error=str(e)
        )

@router.post("/generate-batch-feedback")
async def generate_batch_feedback(request: BatchFeedbackRequest):
    """Tạo nhận xét cho nhiều học sinh cùng lúc"""
    try:
        logger.info(f"Tạo nhận xét hàng loạt cho {len(request.students)} học sinh")
        
        # Validate input
        if not request.students:
            raise HTTPException(
                status_code=400,
                detail="Danh sách học sinh không được rỗng"
            )
        
        if len(request.students) > 50:
            raise HTTPException(
                status_code=400,
                detail="Số lượng học sinh không được vượt quá 50"
            )
        
        # Chuyển đổi request thành format cho service
        students_data = []
        for student in request.students:
            students_data.append({
                "name": student.student_name,
                "score": student.score,
                "attendance": student.attendance_rate,
                "subject": student.subject,
                "top_subjects": student.top_subjects or [],
                "weak_subjects": student.weak_subjects or [],
                "notes": student.notes or "",
            })
        
        # Tạo nhận xét hàng loạt
        result = await feedback_service.generate_batch_feedback(students_data)
        
        logger.info(f"Tạo nhận xét hàng loạt hoàn tất: {result['success_count']}/{len(request.students)} thành công")
        
        return BatchFeedbackResponse(
            success=True,
            success_count=result['success_count'],
            failed_count=result['failed_count'],
            failed_students=result['failed_students'],
            feedbacks=result['feedbacks']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Lỗi tạo nhận xét hàng loạt: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi server: {str(e)}"
        )

@router.get("/health")
async def feedback_health_check():
    """Kiểm tra trạng thái AI Feedback service"""
    return {
        "success": True,
        "message": "AI Feedback service đang hoạt động",
        "data": {"status": "healthy"}
    }

@router.get("/test")
async def test_feedback_generation():
    """Test endpoint để kiểm tra chức năng tạo nhận xét"""
    try:
        # Dữ liệu test
        test_feedback = await feedback_service.generate_feedback(
            student_name="Nguyễn Văn A",
            score=8.5,
            attendance_rate=95,
            subject=None,
            top_subjects=["Toán", "Vật lý"],
            weak_subjects=["Ngữ văn"],
            notes="",
        )
        
        return StudentFeedbackResponse(
            success=True,
            student_name="Nguyễn Văn A",
            feedback=test_feedback
        )
        
    except Exception as e:
        logger.error(f"ERROR: Test feedback generation thất bại: {str(e)}")
        return StudentFeedbackResponse(
            success=False,
            student_name="Nguyễn Văn A",
            error=str(e)
        )

@router.post("/send-sms")
async def send_sms_feedback(request: SMSFeedbackRequest):
    """Gửi SMS nhận xét cho phụ huynh học sinh"""
    try:
        logger.info(f"Gửi SMS feedback cho học sinh ID: {request.student_id}")
        
        # Format phone number (remove spaces, dashes, etc.)
        formatted_phone = request.parent_phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        
        # Validate Vietnamese phone number format
        if not (formatted_phone.startswith("0") and len(formatted_phone) == 10):
            if not (formatted_phone.startswith("+84") and len(formatted_phone) == 12):
                raise HTTPException(status_code=400, detail="Invalid phone number format")
        
        # TODO: Tích hợp với SMS gateway (Twilio, AWS SNS, etc.)
        # Hiện tại chỉ log và return success cho testing
        
        logger.info(f"SMS Content for {formatted_phone}: {request.feedback[:100]}...")
        logger.info(f"SMS would be sent successfully to {formatted_phone}")
        
        # Simulation: SMS sending logic
        sms_content = f"Nhận xét học tập:\n{request.feedback}\n\nTrường THPT ABC - SynapseS"
        
        return {
            "success": True,
            "message": f"Gửi SMS thành công đến {formatted_phone}",
            "data": {
                "student_id": request.student_id,
                "phone": formatted_phone,
                "content_length": len(sms_content),
                "status": "sent",
                "timestamp": datetime.now().isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Lỗi gửi SMS feedback: {str(e)}")
        
        return {
            "success": False,
            "message": f"Lỗi gửi SMS: {str(e)}",
            "data": None
        }

@router.post("/comments")
async def save_comment(
    request: CommentCreateRequest,
    db=Depends(get_db)
):
    """Lưu hoặc cập nhật nhận xét học sinh vào database (upsert)"""
    try:
        # Lấy thông tin học sinh để lấy class_id
        student_response = db.table("students").select("id, class_name, grade").eq("id", request.student_id).execute()
        
        if not student_response.data or len(student_response.data) == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
        
        student = student_response.data[0]
        
        # Lấy class_id từ class_name và grade
        class_id = None
        if student.get("class_name") and student.get("grade"):
            class_response = db.table("classes").select("id").eq("class_name", student["class_name"]).eq("grade", student["grade"]).execute()
            if class_response.data and len(class_response.data) > 0:
                class_id = class_response.data[0]["id"]
        
        # Kiểm tra xem đã có comment chưa (lấy comment mới nhất)
        existing_comment_response = db.table("comments").select("*").eq("student_id", request.student_id).order("created_at", desc=True).limit(1).execute()
        
        comment_data = {
            "student_id": request.student_id,
            "class_id": class_id,
            "description": request.description,
            "updated_at": datetime.now().isoformat()
        }
        
        if existing_comment_response.data and len(existing_comment_response.data) > 0:
            # Update comment hiện có
            existing_comment = existing_comment_response.data[0]
            comment_id = existing_comment["id"]
            
            response = db.table("comments").update(comment_data).eq("id", comment_id).execute()
            
            if response.data and len(response.data) > 0:
                logger.info(f"✅ Đã cập nhật nhận xét cho học sinh ID: {request.student_id}")
                comment = response.data[0]
                return CommentResponseModel(
                    success=True,
                    message="Cập nhật nhận xét thành công",
                    data=CommentResponse(
                        id=comment["id"],
                        student_id=comment["student_id"],
                        class_id=comment.get("class_id"),
                        description=comment["description"],
                        created_at=comment["created_at"],
                        updated_at=comment["updated_at"]
                    )
                )
            else:
                raise HTTPException(status_code=500, detail="Không thể cập nhật nhận xét")
        else:
            # Insert comment mới
            comment_data["created_at"] = datetime.now().isoformat()
            
            response = db.table("comments").insert(comment_data).execute()
            
            if response.data and len(response.data) > 0:
                logger.info(f"✅ Đã tạo nhận xét mới cho học sinh ID: {request.student_id}")
                comment = response.data[0]
                return CommentResponseModel(
                    success=True,
                    message="Lưu nhận xét thành công",
                    data=CommentResponse(
                        id=comment["id"],
                        student_id=comment["student_id"],
                        class_id=comment.get("class_id"),
                        description=comment["description"],
                        created_at=comment["created_at"],
                        updated_at=comment["updated_at"]
                    )
                )
            else:
                raise HTTPException(status_code=500, detail="Không thể lưu nhận xét")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERROR: Lỗi lưu nhận xét: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi server: {str(e)}"
        )

@router.get("/comments/{student_id}")
async def get_comment(
    student_id: int,
    db=Depends(get_db)
):
    """Lấy nhận xét của học sinh (nhận xét mới nhất)"""
    try:
        response = db.table("comments").select("*").eq("student_id", student_id).order("created_at", desc=True).limit(1).execute()
        
        if response.data and len(response.data) > 0:
            comment = response.data[0]
            return CommentResponseModel(
                success=True,
                message="Lấy nhận xét thành công",
                    data=CommentResponse(
                        id=comment["id"],
                        student_id=comment["student_id"],
                        class_id=comment.get("class_id"),
                        description=comment["description"],
                        created_at=comment["created_at"],
                        updated_at=comment["updated_at"]
                    )
            )
        else:
            return CommentResponseModel(
                success=True,
                message="Chưa có nhận xét",
                data=None
            )
            
    except Exception as e:
        logger.error(f"ERROR: Lỗi lấy nhận xét: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi server: {str(e)}"
        )

@router.get("/comments/class/{class_id}")
async def get_class_comments(
    class_id: int,
    db=Depends(get_db)
):
    """Lấy tất cả nhận xét của lớp (lấy comment mới nhất cho mỗi học sinh)"""
    try:
        # Lấy thông tin lớp để có class_name và grade
        class_response = db.table("classes").select("id, class_name, grade").eq("id", class_id).execute()
        
        if not class_response.data or len(class_response.data) == 0:
            logger.warning(f"Không tìm thấy lớp với class_id: {class_id}")
            return {
                "success": True,
                "message": "Không tìm thấy lớp",
                "data": []
            }
        
        class_info = class_response.data[0]
        class_name = class_info.get("class_name")
        grade = class_info.get("grade")
        
        logger.info(f"🔍 Tìm nhận xét cho lớp: {class_name} (ID: {class_id})")
        
        # Lấy tất cả comments của class (bao gồm cả NULL class_id)
        # Vì có thể class_id chưa được set khi lưu comment
        response = db.table("comments").select("*").eq("class_id", class_id).order("created_at", desc=True).execute()
        
        logger.info(f"📊 Tìm thấy {len(response.data) if response.data else 0} comments với class_id = {class_id}")
        
        # Nếu không tìm thấy theo class_id, thử tìm theo học sinh của lớp (fallback)
        if not response.data or len(response.data) == 0:
            # Lấy danh sách học sinh của lớp
            students_response = db.table("students").select("id").eq("class_name", class_name).eq("grade", grade).execute()
            
            if students_response.data and len(students_response.data) > 0:
                student_ids = [s["id"] for s in students_response.data]
                logger.info(f"🔄 Fallback: Tìm comments theo {len(student_ids)} học sinh của lớp {class_name}")
                
                # Lấy comments của các học sinh này (có thể class_id NULL)
                response = db.table("comments").select("*").in_("student_id", student_ids).order("created_at", desc=True).execute()
                logger.info(f"📊 Tìm thấy {len(response.data) if response.data else 0} comments theo student_id")
        
        if not response.data:
            logger.warning(f"⚠️ Không tìm thấy comments cho lớp {class_name} (ID: {class_id})")
            return {
                "success": True,
                "message": "Chưa có nhận xét nào",
                "data": []
            }
        
        # Group by student_id và lấy comment mới nhất cho mỗi học sinh
        comments_by_student = {}
        for comment in response.data:
            student_id = comment["student_id"]
            # Chỉ lấy comment mới nhất cho mỗi học sinh
            if student_id not in comments_by_student:
                comments_by_student[student_id] = comment
        
        # Lấy thông tin học sinh cho các student_id có comment
        student_ids = list(comments_by_student.keys())
        students_response = db.table("students").select("id, student_id, full_name, class_name, grade").in_("id", student_ids).execute()
        students_map = {s["id"]: s for s in (students_response.data or [])}
        
        # Filter: chỉ lấy comments của học sinh thuộc lớp này
        comments_list = []
        for student_id, comment in comments_by_student.items():
            student_info = students_map.get(student_id, {})
            
            # Kiểm tra học sinh có thuộc lớp này không
            if student_info.get("class_name") == class_name and student_info.get("grade") == grade:
                comments_list.append({
                    "id": comment["id"],
                    "student_id": comment["student_id"],
                    "student_code": student_info.get("student_id"),
                    "student_name": student_info.get("full_name"),
                    "class_id": comment.get("class_id") or class_id,  # Nếu NULL thì dùng class_id từ param
                    "description": comment["description"],
                    "created_at": comment["created_at"],
                    "updated_at": comment["updated_at"]
                })
        
        logger.info(f"✅ Trả về {len(comments_list)} nhận xét cho lớp {class_name}")
        
        return {
            "success": True,
            "message": f"Lấy {len(comments_list)} nhận xét thành công",
            "data": comments_list
        }
            
    except Exception as e:
        logger.error(f"ERROR: Lỗi lấy nhận xét lớp: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi server: {str(e)}"
        )
