"""
API Router cho AI Feedback
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
from feedback.models import (
    StudentFeedbackRequest, 
    StudentFeedbackResponse, 
    BatchFeedbackRequest,
    BatchFeedbackResponse,
    SMSFeedbackRequest,
    ResponseModel
)
from feedback.services import feedback_service
from core.logger import setup_logger

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
