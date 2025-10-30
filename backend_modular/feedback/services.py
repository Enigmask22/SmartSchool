"""
Feedback Services - Tích hợp với Gemini AI
"""

import os
from typing import List, Dict
from core.logger import setup_logger
from .gemini_service import get_gemini_service

logger = setup_logger("feedback_service")

class FeedbackService:
    """Service tạo feedback bằng Gemini AI"""
    
    def __init__(self):
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.use_ai = True  # Flag để bật/tắt AI generation
        
        # Kiểm tra xem Gemini service có khả dụng không
        try:
            self.gemini_service = get_gemini_service()
            logger.info("✅ Gemini AI service initialized successfully")
        except Exception as e:
            logger.error(f"⚠️ Cannot initialize Gemini service: {str(e)}")
            logger.warning("📝 Falling back to template-based feedback")
            self.use_ai = False
        
    async def generate_feedback(
        self,
        student_name: str,
        score: float,
        attendance_rate: int,
        subject: str = None,
        top_subjects: List[str] = None,
        weak_subjects: List[str] = None,
        notes: str = ""
    ) -> str:
        """
        Tạo nhận xét cho học sinh sử dụng Gemini AI
        
        Args:
            student_name: Tên học sinh
            score: Điểm trung bình (0-10)
            score_trend: Xu hướng điểm ('tăng', 'giảm', 'ổn định')
            attendance_rate: Tỷ lệ chuyên cần (%)
            subject: Môn học cụ thể (nếu có)
            notes: Ghi chú thêm từ giáo viên
            
        Returns:
            Nhận xét được tạo bởi AI hoặc template
        """
        try:
            # Sử dụng Gemini AI nếu có
            if self.use_ai:
                try:
                    feedback = await self.gemini_service.generate_student_feedback(
                        student_name=student_name,
                        score=score,
                        attendance_rate=attendance_rate,
                        top_subjects=top_subjects,
                        weak_subjects=weak_subjects,
                        notes=(notes or "").strip(),
                    )
                    logger.info(f"🤖 AI-generated feedback for {student_name}")
                    return feedback
                except Exception as ai_error:
                    logger.error(f"❌ AI generation failed: {str(ai_error)}")
                    logger.warning("📝 Falling back to template-based feedback")
                    # Fall through to template-based generation
            
            # Fallback: Template-based feedback
            logger.info(f"📝 Using template-based feedback for {student_name}")
            feedback_parts = []
            
            # Thêm môn học vào feedback nếu có
            subject_text = f" môn {subject}" if subject else ""
            
            # Đánh giá điểm số
            if score >= 8.5:
                feedback_parts.append(f"Em {student_name} có kết quả học tập{subject_text} xuất sắc với điểm trung bình {score}.")
            elif score >= 6.5:
                feedback_parts.append(f"Em {student_name} có kết quả học tập{subject_text} khá với điểm trung bình {score}.")
            else:
                feedback_parts.append(f"Em {student_name} cần cố gắng hơn nữa{subject_text} với điểm trung bình hiện tại là {score}.")
            
            # Tổng hợp môn mạnh/yếu
            if top_subjects:
                feedback_parts.append(f"Các môn nổi bật: {', '.join(top_subjects[:3])}.")
            if weak_subjects:
                feedback_parts.append(f"Cần cải thiện ở các môn: {', '.join(weak_subjects[:3])}.")
            
            # Chuyên cần
            if attendance_rate >= 90:
                feedback_parts.append(f"Em có ý thức chuyên cần tốt với {attendance_rate}% tỷ lệ tham gia.")
            else:
                feedback_parts.append(f"Cần cải thiện ý thức chuyên cần, hiện tại chỉ đạt {attendance_rate}%.")
            
            if notes:
                feedback_parts.append(notes)
            
            return " ".join(feedback_parts)
            
        except Exception as e:
            logger.error(f"❌ Error generating feedback: {str(e)}")
            return f"Không thể tạo nhận xét tự động: {str(e)}"
    
    async def generate_batch_feedback(self, students_data: List[Dict]) -> Dict:
        """
        Tạo nhận xét hàng loạt cho nhiều học sinh sử dụng Gemini AI
        
        Args:
            students_data: Danh sách thông tin học sinh
            Format: [{"name": str, "score": float, "trend": str, "attendance": int, "notes": str}]
            
        Returns:
            Dictionary chứa kết quả và danh sách feedbacks
        """
        try:
            # Sử dụng Gemini AI batch generation nếu có
            if self.use_ai:
                try:
                    result = await self.gemini_service.generate_batch_feedback(students_data)
                    logger.info(f"🤖 AI batch generation: {result['success_count']}/{len(students_data)} successful")
                    return result
                except Exception as ai_error:
                    logger.error(f"❌ AI batch generation failed: {str(ai_error)}")
                    logger.warning("📝 Falling back to template-based batch generation")
                    # Fall through to template-based generation
            
            # Fallback: Template-based batch generation
            logger.info(f"📝 Using template-based batch feedback for {len(students_data)} students")
            feedbacks = []
            failed_students = []
            success_count = 0
            failed_count = 0
            
            for student in students_data:
                try:
                    feedback_text = await self.generate_feedback(
                        student_name=student["name"],
                        score=student["score"],
                        attendance_rate=student["attendance"],
                        subject=student.get("subject"),
                        top_subjects=student.get("top_subjects"),
                        weak_subjects=student.get("weak_subjects"),
                        notes=student.get("notes", ""),
                    )
                    
                    feedbacks.append({
                        "student_name": student["name"],
                        "feedback": feedback_text,
                        "success": True,
                        "error": None
                    })
                    success_count += 1
                    
                except Exception as e:
                    logger.error(f"❌ Failed to generate feedback for {student['name']}: {str(e)}")
                    feedbacks.append({
                        "student_name": student["name"],
                        "feedback": "",
                        "success": False,
                        "error": str(e)
                    })
                    failed_students.append(student["name"])
                    failed_count += 1
            
            return {
                "success_count": success_count,
                "failed_count": failed_count,
                "failed_students": failed_students,
                "feedbacks": feedbacks
            }
            
        except Exception as e:
            logger.error(f"❌ Error in batch feedback generation: {str(e)}")
            raise

feedback_service = FeedbackService()
