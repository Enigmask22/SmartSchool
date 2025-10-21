"""
Feedback Services - Tích hợp với Gemini AI
"""

import os
from typing import List, Dict
from core.logger import setup_logger

logger = setup_logger("feedback_service")

class FeedbackService:
    """Service tạo feedback bằng AI"""
    
    def __init__(self):
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        
    async def generate_feedback(
        self,
        student_name: str,
        score: float,
        score_trend: str,
        attendance_rate: int,
        notes: str = ""
    ) -> str:
        """Tạo nhận xét cho học sinh"""
        try:
            # Tạo feedback template đơn giản
            feedback_parts = []
            
            # Đánh giá điểm số
            if score >= 8.5:
                feedback_parts.append(f"Em {student_name} có kết quả học tập xuất sắc với điểm trung bình {score}.")
            elif score >= 6.5:
                feedback_parts.append(f"Em {student_name} có kết quả học tập khá với điểm trung bình {score}.")
            else:
                feedback_parts.append(f"Em {student_name} cần cố gắng hơn nữa với điểm trung bình hiện tại là {score}.")
            
            # Xu hướng
            if score_trend == "tăng":
                feedback_parts.append("Điểm số có xu hướng tăng dần, thể hiện sự tiến bộ đáng khen.")
            elif score_trend == "giảm":
                feedback_parts.append("Cần chú ý vì điểm số đang có xu hướng giảm.")
            
            # Chuyên cần
            if attendance_rate >= 90:
                feedback_parts.append(f"Em có ý thức chuyên cần tốt với {attendance_rate}% tỷ lệ tham gia.")
            else:
                feedback_parts.append(f"Cần cải thiện ý thức chuyên cần, hiện tại chỉ đạt {attendance_rate}%.")
            
            if notes:
                feedback_parts.append(notes)
            
            return " ".join(feedback_parts)
            
        except Exception as e:
            logger.error(f"Error generating feedback: {str(e)}")
            return f"Không thể tạo nhận xét tự động: {str(e)}"
    
    async def generate_batch_feedback(self, students_data: List[Dict]) -> Dict:
        """Tạo nhận xét hàng loạt cho nhiều học sinh"""
        try:
            feedbacks = []
            failed_students = []
            success_count = 0
            failed_count = 0
            
            for student in students_data:
                try:
                    feedback_text = await self.generate_feedback(
                        student_name=student["name"],
                        score=student["score"],
                        score_trend=student["trend"],
                        attendance_rate=student["attendance"],
                        notes=student.get("notes", "")
                    )
                    
                    feedbacks.append({
                        "student_name": student["name"],
                        "feedback": feedback_text,
                        "success": True,
                        "error": None
                    })
                    success_count += 1
                    
                except Exception as e:
                    logger.error(f"Failed to generate feedback for {student['name']}: {str(e)}")
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
            logger.error(f"Error in batch feedback generation: {str(e)}")
            raise

feedback_service = FeedbackService()
