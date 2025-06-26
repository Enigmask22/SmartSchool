"""
Router cho AI Feedback - Tạo nhận xét học sinh tự động
"""

import logging
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime

from models.schemas import (
    StudentFeedbackRequest, 
    StudentFeedbackResponse,
    BatchFeedbackRequest,
    BatchFeedbackResponse,
    ResponseModel
)
from services.gemini_service import get_gemini_service, GeminiFeedbackService

# Khởi tạo router
router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/generate-feedback", response_model=StudentFeedbackResponse)
async def generate_student_feedback(
    request: StudentFeedbackRequest,
    gemini_service: GeminiFeedbackService = Depends(get_gemini_service)
):
    """
    Tạo nhận xét cho một học sinh
    
    Args:
        request: Thông tin học sinh cần tạo nhận xét
        
    Returns:
        Nhận xét được tạo bởi AI
    """
    try:
        logger.info(f"Tạo nhận xét cho học sinh: {request.student_name}")
        
        # Validate score_trend
        valid_trends = ['tăng', 'giảm', 'ổn định']
        if request.score_trend not in valid_trends:
            raise HTTPException(
                status_code=400,
                detail=f"score_trend phải là một trong: {', '.join(valid_trends)}"
            )
        
        # Tạo nhận xét bằng Gemini AI
        feedback = await gemini_service.generate_student_feedback(
            student_name=request.student_name,
            score=request.score,
            score_trend=request.score_trend,
            attendance_rate=request.attendance_rate,
            notes=request.notes
        )
        
        logger.info(f"✅ Tạo nhận xét thành công cho {request.student_name}")
        
        return StudentFeedbackResponse(
            success=True,
            student_name=request.student_name,
            feedback=feedback
        )
        
    except Exception as e:
        logger.error(f"❌ Lỗi tạo nhận xét cho {request.student_name}: {str(e)}")
        
        return StudentFeedbackResponse(
            success=False,
            student_name=request.student_name,
            error=str(e)
        )

@router.post("/generate-batch-feedback", response_model=BatchFeedbackResponse)
async def generate_batch_feedback(
    request: BatchFeedbackRequest,
    gemini_service: GeminiFeedbackService = Depends(get_gemini_service)
):
    """
    Tạo nhận xét cho nhiều học sinh cùng lúc
    
    Args:
        request: Danh sách thông tin các học sinh
        
    Returns:
        Kết quả tạo nhận xét cho tất cả học sinh
    """
    try:
        logger.info(f"Tạo nhận xét hàng loạt cho {len(request.students)} học sinh")
        
        # Validate input
        if not request.students:
            raise HTTPException(
                status_code=400,
                detail="Danh sách học sinh không được rỗng"
            )
        
        if len(request.students) > 50:  # Giới hạn số lượng để tránh timeout
            raise HTTPException(
                status_code=400,
                detail="Số lượng học sinh không được vượt quá 50"
            )
        
        # Validate score_trend cho tất cả học sinh
        valid_trends = ['tăng', 'giảm', 'ổn định']
        for student in request.students:
            if student.score_trend not in valid_trends:
                raise HTTPException(
                    status_code=400,
                    detail=f"score_trend của {student.student_name} phải là một trong: {', '.join(valid_trends)}"
                )
        
        # Chuyển đổi request thành format cho service
        students_data = []
        for student in request.students:
            students_data.append({
                "name": student.student_name,
                "score": student.score,
                "trend": student.score_trend,
                "attendance": student.attendance_rate,
                "notes": student.notes
            })
        
        # Tạo nhận xét hàng loạt
        result = await gemini_service.generate_batch_feedback(students_data)
        
        logger.info(f"✅ Tạo nhận xét hàng loạt hoàn tất: {result['success_count']}/{len(request.students)} thành công")
        
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
        logger.error(f"❌ Lỗi tạo nhận xét hàng loạt: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi server: {str(e)}"
        )

@router.get("/health", response_model=ResponseModel)
async def feedback_health_check():
    """
    Kiểm tra tình trạng AI Feedback service
    """
    try:
        gemini_service = get_gemini_service()
        
        return ResponseModel(
            success=True,
            message="AI Feedback service đang hoạt động bình thường",
            data={
                "model_name": gemini_service.model_name,
                "status": "healthy"
            }
        )
        
    except Exception as e:
        logger.error(f"❌ AI Feedback service không khả dụng: {str(e)}")
        return ResponseModel(
            success=False,
            message=f"AI Feedback service lỗi: {str(e)}"
        )

@router.get("/test", response_model=StudentFeedbackResponse)
async def test_feedback_generation():
    """
    Test endpoint để kiểm tra chức năng tạo nhận xét
    """
    try:
        gemini_service = get_gemini_service()
        
        # Dữ liệu test
        test_feedback = await gemini_service.generate_student_feedback(
            student_name="Nguyễn Văn A",
            score=8.5,
            score_trend="tăng",
            attendance_rate=95,
            notes="Học sinh rất chăm chỉ và tích cực tham gia hoạt động lớp"
        )
        
        return StudentFeedbackResponse(
            success=True,
            student_name="Nguyễn Văn A",
            feedback=test_feedback
        )
        
    except Exception as e:
        logger.error(f"❌ Test feedback generation thất bại: {str(e)}")
        return StudentFeedbackResponse(
            success=False,
            student_name="Nguyễn Văn A",
            error=str(e)
        )

@router.post("/send-sms", response_model=ResponseModel)
async def send_sms_feedback(
    request: dict,
    db = Depends(lambda: None)  # Placeholder cho DB connection nếu cần
):
    """
    Gửi SMS nhận xét cho phụ huynh học sinh
    
    Args:
        request: {
            "student_id": int,
            "feedback": str,
            "parent_phone": str
        }
        
    Returns:
        Kết quả gửi SMS
    """
    try:
        logger.info(f"📱 Gửi SMS feedback cho học sinh ID: {request.get('student_id')}")
        
        # Validate input
        student_id = request.get('student_id')
        feedback = request.get('feedback')
        parent_phone = request.get('parent_phone')
        
        if not student_id:
            raise HTTPException(status_code=400, detail="Missing student_id")
        
        if not feedback:
            raise HTTPException(status_code=400, detail="Missing feedback")
        
        if not parent_phone:
            raise HTTPException(status_code=400, detail="Missing parent_phone")
        
        # Format phone number (remove spaces, dashes, etc.)
        formatted_phone = parent_phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        
        # Validate Vietnamese phone number format
        if not (formatted_phone.startswith("0") and len(formatted_phone) == 10):
            if not (formatted_phone.startswith("+84") and len(formatted_phone) == 12):
                raise HTTPException(status_code=400, detail="Invalid phone number format")
        
        # TODO: Tích hợp với SMS gateway (Twilio, AWS SNS, etc.)
        # Hiện tại chỉ log và return success cho testing
        
        logger.info(f"📱 SMS Content for {formatted_phone}: {feedback[:100]}...")
        logger.info(f"✅ SMS would be sent successfully to {formatted_phone}")
        
        # Simulation: SMS sending logic
        sms_content = f"Nhận xét học tập:\n{feedback}\n\nTrường THPT ABC - Hệ thống Smart School"
        
        return ResponseModel(
            success=True,
            message=f"Gửi SMS thành công đến {formatted_phone}",
            data={
                "student_id": student_id,
                "phone": formatted_phone,
                "content_length": len(sms_content),
                "status": "sent",
                "timestamp": datetime.now().isoformat()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Lỗi gửi SMS feedback: {str(e)}")
        
        return ResponseModel(
            success=False,
            message=f"Lỗi gửi SMS: {str(e)}",
            data=None
        ) 