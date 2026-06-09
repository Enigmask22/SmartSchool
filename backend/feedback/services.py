"""
Feedback Services - Tích hợp AI (Gemini / OpenRouter)
Chọn provider qua biến môi trường FEEDBACK_PROVIDER (gemini | openrouter)
"""

import os
from typing import List, Dict
from core.logger import setup_logger

logger = setup_logger("feedback_service")


def _create_ai_service():
    """
    Factory function: khởi tạo AI feedback service dựa trên FEEDBACK_PROVIDER.

    Returns:
        Tuple[service_instance | None, str] - (service, provider_name)
    """
    provider = os.getenv("FEEDBACK_PROVIDER", "gemini").lower().strip()

    if provider == "openrouter":
        try:
            from .openrouter_service import OpenRouterFeedbackService
            service = OpenRouterFeedbackService()
            logger.info("✅ OpenRouter AI feedback service initialized")
            return service, "openrouter"
        except Exception as e:
            logger.error(f"⚠️ Cannot initialize OpenRouter service: {e}")
            # Fallback sang Gemini
            logger.warning("🔄 Fallback sang Gemini service...")
            provider = "gemini"

    # Default: Gemini
    if provider == "gemini":
        try:
            from .gemini_service import get_gemini_service
            service = get_gemini_service()
            logger.info("✅ Gemini AI feedback service initialized")
            return service, "gemini"
        except Exception as e:
            logger.error(f"⚠️ Cannot initialize Gemini service: {e}")

    return None, "none"


class FeedbackService:
    """Service tạo feedback bằng AI (Gemini hoặc OpenRouter)"""

    def __init__(self):
        self.use_ai = True
        self.provider_name = "none"

        self.ai_service, self.provider_name = _create_ai_service()
        if self.ai_service is None:
            logger.warning("📝 No AI service available – falling back to template-based feedback")
            self.use_ai = False
        
    async def generate_feedback(
        self,
        student_name: str,
        score: float,
        attendance_rate: int,
        subject: str = None,
        top_subjects: List[str] = None,
        weak_subjects: List[str] = None,
        notes: str = "",
        feedback_type: str = "CK",
        low_score_details: List[dict] = None,
        ket_qua_ren_luyen: str = None,
        hoc_luc: str = None,
        summary_data: dict = None,
    ) -> str:
        """
        Tạo nhận xét cho học sinh sử dụng Gemini AI

        Args:
            student_name: Tên học sinh
            score: Điểm trung bình (0-10) — chỉ dùng cho CK
            attendance_rate: Tỷ lệ chuyên cần (%)
            subject: Môn học cụ thể (nếu có)
            top_subjects: Môn tốt (CK only)
            weak_subjects: Môn yếu (CK only)
            notes: Ghi chú thêm từ giáo viên
            feedback_type: "GK" hoặc "CK"
            low_score_details: Chi tiết cột TX/GK dưới 8 hoặc KĐ (GK only)
            ket_qua_ren_luyen: Kết quả rèn luyện (1=Tốt, 2=Khá, 3=Đạt, 4=Chưa Đạt)
            hoc_luc: Học lực (1=Tốt, 2=Khá, 3=Đạt, 4=Chưa Đạt) — CK only

        Returns:
            Nhận xét được tạo bởi AI hoặc template
        """
        try:
            # Sử dụng AI service nếu có
            if self.use_ai:
                try:
                    if feedback_type == "GK":
                        feedback = await self.ai_service.generate_gk_feedback(
                            student_name=student_name,
                            attendance_rate=attendance_rate,
                            low_score_details=low_score_details or [],
                            notes=(notes or "").strip(),
                            ket_qua_ren_luyen=ket_qua_ren_luyen,
                        )
                        logger.info(f"🤖 [{self.provider_name}] AI-generated GK feedback for {student_name}")
                        return feedback
                    elif feedback_type == "CN":
                        feedback = await self.ai_service.generate_cn_feedback(
                            student_name=student_name,
                            summary_data=summary_data or {},
                            notes=(notes or "").strip(),
                        )
                        logger.info(f"🤖 [{self.provider_name}] AI-generated CN feedback for {student_name}")
                        return feedback
                    else:
                        # CK: prompt hiện tại
                        feedback = await self.ai_service.generate_student_feedback(
                            student_name=student_name,
                            score=score,
                            attendance_rate=attendance_rate,
                            top_subjects=top_subjects,
                            weak_subjects=weak_subjects,
                            notes=(notes or "").strip(),
                            ket_qua_ren_luyen=ket_qua_ren_luyen,
                            hoc_luc=hoc_luc,
                        )
                        logger.info(f"🤖 [{self.provider_name}] AI-generated CK feedback for {student_name}")
                        return feedback
                except Exception as ai_error:
                    logger.error(f"❌ AI generation failed: {str(ai_error)}")
                    logger.warning("📝 Falling back to template-based feedback")

            # Fallback: Template-based feedback
            logger.info(f"📝 Using template-based feedback for {student_name} (type={feedback_type})")

            if feedback_type == "GK":
                return _build_gk_template_fallback(student_name, attendance_rate, low_score_details, notes)

            if feedback_type == "CN":
                return _build_cn_template_fallback(student_name, summary_data or {}, notes)

            # CK template fallback (giữ nguyên)
            feedback_parts = []
            subject_text = f" môn {subject}" if subject else ""

            if score >= 8.5:
                feedback_parts.append(f"Em {student_name} có kết quả học tập{subject_text} xuất sắc với điểm trung bình {score}.")
            elif score >= 6.5:
                feedback_parts.append(f"Em {student_name} có kết quả học tập{subject_text} khá với điểm trung bình {score}.")
            else:
                feedback_parts.append(f"Em {student_name} cần cố gắng hơn nữa{subject_text} với điểm trung bình hiện tại là {score}.")

            if top_subjects:
                feedback_parts.append(f"Các môn nổi bật: {', '.join(top_subjects[:3])}.")
            if weak_subjects:
                feedback_parts.append(f"Cần cải thiện ở các môn: {', '.join(weak_subjects[:3])}.")

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


def _build_gk_template_fallback(
    student_name: str,
    attendance_rate: int,
    low_score_details: List[dict] = None,
    notes: str = "",
) -> str:
    """Template fallback cho GK khi không có AI."""
    parts = []
    low_score_details = low_score_details or []

    if low_score_details:
        subjects_mentioned = []
        for item in low_score_details[:3]:
            subj = item.get("subject", "")
            cols = item.get("columns", [])
            if cols:
                col_text = ", ".join(f"{c['name']}={c['value']}" for c in cols[:2])
                subjects_mentioned.append(f"{subj} ({col_text})")
        parts.append(
            f"Kính gửi quý phụ huynh em {student_name}, giáo viên chủ nhiệm xin thông báo "
            f"tình hình giữa kỳ: một số cột điểm thường xuyên và giữa kỳ cần lưu ý — "
            f"{'; '.join(subjects_mentioned)}. "
            f"Kính mong quý phụ huynh cập nhật và nhắc nhở em ôn tập tốt hơn cho kỳ thi cuối kỳ."
        )
    else:
        parts.append(
            f"Kính gửi quý phụ huynh em {student_name}, giáo viên chủ nhiệm xin thông báo "
            f"tình hình giữa kỳ: tất cả các cột điểm thường xuyên và giữa kỳ đều ổn định. "
            f"Kính mong quý phụ huynh tiếp tục động viên em giữ vững phong độ cho kỳ thi cuối kỳ."
        )

    if attendance_rate < 90:
        parts.append(f"Lưu ý: tỷ lệ chuyên cần hiện tại là {attendance_rate}%, cần cải thiện.")
    elif not any("vắng" in (notes or "").lower() for _ in [1]):
        parts.append("Em có ý thức đi học đầy đủ, đúng giờ.")

    if notes:
        parts.append(notes)

    return " ".join(parts)


def _build_cn_template_fallback(
    student_name: str,
    summary_data: dict,
    notes: str = "",
) -> str:
    """Template fallback cho CN (Cả năm) khi không có AI."""
    label_map = {"1": "Tốt", "2": "Khá", "3": "Đạt", "4": "Chưa Đạt"}
    title_map = {"1": "Học sinh Xuất sắc", "2": "Học sinh Giỏi"}

    year_avg = summary_data.get("year_avg_score", "N/A")
    hl = label_map.get(summary_data.get("year_hoc_luc", ""), "Chưa có")
    rl = label_map.get(summary_data.get("year_ren_luyen", ""), "Chưa có")
    title_val = summary_data.get("title")
    title_str = title_map.get(title_val, "") if title_val else ""

    parts = [
        f"Kính gửi quý phụ huynh em {student_name},"
        f"giáo viên chủ nhiệm xin thông báo kết quả tổng kết cả năm học:",
        f"Điểm trung bình cả năm đạt {year_avg},",
        f"học lực {hl}, kết quả rèn luyện {rl}.",
    ]
    if title_str:
        parts.append(f"Em đạt danh hiệu {title_str}.")
    if notes:
        parts.append(notes)
    return " ".join(parts)


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
            # Sử dụng AI batch generation nếu có
            if self.use_ai:
                try:
                    result = await self.ai_service.generate_batch_feedback(students_data)
                    logger.info(f"🤖 [{self.provider_name}] AI batch: {result['success_count']}/{len(students_data)} successful")
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
