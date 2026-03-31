"""
AI Feedback Service sử dụng OpenRouter API (OpenAI-compatible)
Hỗ trợ model: openai/gpt-oss-120b:free và các model khác trên OpenRouter
"""

import os
import logging
from typing import Optional
from openai import AsyncOpenAI


class OpenRouterFeedbackService:
    """
    Service tạo nhận xét học sinh sử dụng OpenRouter API
    Sử dụng OpenAI SDK (compatible) để gọi qua OpenRouter
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
    ):
        """
        Khởi tạo OpenRouter Feedback Service

        Args:
            api_key: OpenRouter API key
            model_name: Tên model trên OpenRouter (vd: openai/gpt-oss-120b:free)
        """
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        self.model_name = model_name or os.getenv(
            "OPENROUTER_MODEL", "openai/gpt-oss-120b:free"
        )
        self.logger = logging.getLogger(__name__)

        if not self.api_key:
            raise ValueError(
                "OpenRouter API key không được tìm thấy. "
                "Vui lòng cấu hình OPENROUTER_API_KEY trong .env"
            )

        # Headers bắt buộc cho free models trên OpenRouter
        # (tránh lỗi 404 "No endpoints found matching your data policy")
        self.extra_headers = {
            "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", "http://localhost:3000"),
            "X-Title": os.getenv("OPENROUTER_APP_NAME", "Smart School"),
        }

        self.client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=self.api_key,
            default_headers=self.extra_headers,
        )

        self.logger.info(
            f"✅ OpenRouterFeedbackService initialized với model: {self.model_name}"
        )

    def create_feedback_prompt(
        self,
        student_name: str,
        score: float,
        attendance_rate: int,
        top_subjects: Optional[list] = None,
        weak_subjects: Optional[list] = None,
        notes: str = "",
    ) -> str:
        """
        Tạo prompt chi tiết để model viết nhận xét (dùng chung logic với GeminiFeedbackService)

        Args:
            student_name: Tên học sinh
            score: Điểm số hiện tại (0-10)
            attendance_rate: Tỷ lệ chuyên cần (%)
            top_subjects: Danh sách môn học tốt
            weak_subjects: Danh sách môn học chưa tốt
            notes: Ghi chú thêm từ giáo viên

        Returns:
            Prompt đã được định dạng
        """
        top_subjects = top_subjects or []
        weak_subjects = weak_subjects or []
        top_text = ", ".join(top_subjects[:5]) if top_subjects else "Không có"
        weak_text = ", ".join(weak_subjects[:5]) if weak_subjects else "Không có"

        NEGATIVE_WORDS = [
            "vắng", "nghỉ", "trốn", "đi trễ", "không chuyên cần",
            "muộn học", "bỏ tiết", "trốn học", "cúp học",
        ]
        negative_attendance = any(
            word in (notes or "").lower() for word in NEGATIVE_WORDS
        )

        attendance_hint = ""
        if not negative_attendance:
            attendance_hint = (
                "- Lưu ý: Nếu không có ghi chú tiêu cực về chuyên cần, "
                "hãy TẶNG THÊM một câu khen em có ý thức đi học đầy đủ, đúng giờ, "
                "ngay sau câu khen về thành tích. "
                "Không cần sáng tạo thêm lý do hoặc chi tiết khác."
            )

        prompt = f"""Bạn là trợ lý AI của giáo viên chủ nhiệm. Hãy nhập vai giáo viên và viết nhận xét ngắn gọn, chuyên nghiệp cho học sinh (không phải sinh viên) để gửi cho phụ huynh.

**QUY TẮC BẮT BUỘC:**
- Chỉ trả lời đúng nội dung nhận xét, KHÔNG thêm lời chào hay tiêu đề.
- Văn phong: tích cực, mang tính xây dựng, khích lệ; nhưng rõ ràng và cụ thể.
- Nếu điểm trung bình < 7.0 hoặc có môn yếu thì cần đưa gợi ý cải thiện cụ thể.
- Mặc định chuyên cần tốt (đi học đầy đủ, đúng giờ); NẾU ghi chú nêu vắng/đi trễ thì phải đề cập và khuyến nghị khắc phục.
- Ưu tiên sử dụng thông tin môn mạnh/yếu nếu có; không suy diễn ngoài dữ liệu.
- Ngôn ngữ: Tiếng Việt chuẩn, trang trọng. Độ dài: 2–3 câu, không dùng markdown.
{attendance_hint}

**DỮ LIỆU HỌC SINH:**
- Tên: {student_name}
- Điểm trung bình học kì: {score}/10
- Môn học tốt: {top_text}
- Môn học chưa tốt: {weak_text}
- Chuyên cần (mặc định tốt nếu không ghi chú tiêu cực): {attendance_rate}%
- Ghi chú của GVCN (ưu tiên về chuyên cần): {notes if notes else 'Không có'}

Dựa trên dữ liệu trên, viết nhận xét cho học sinh này."""
        return prompt.strip()

    async def generate_student_feedback(
        self,
        student_name: str,
        score: float,
        attendance_rate: int,
        top_subjects: Optional[list] = None,
        weak_subjects: Optional[list] = None,
        notes: str = "",
    ) -> str:
        """
        Tạo nhận xét cho học sinh qua OpenRouter API

        Args:
            student_name: Tên học sinh
            score: Điểm số (0-10)
            attendance_rate: Tỷ lệ chuyên cần (%)
            top_subjects: Danh sách môn tốt
            weak_subjects: Danh sách môn yếu
            notes: Ghi chú giáo viên

        Returns:
            Nhận xét học sinh (string)

        Raises:
            Exception: Nếu có lỗi khi gọi API
        """
        try:
            self.logger.info(
                f"🤖 [OpenRouter] Đang tạo nhận xét AI cho học sinh: {student_name}"
            )

            prompt = self.create_feedback_prompt(
                student_name=student_name,
                score=score,
                attendance_rate=attendance_rate,
                top_subjects=top_subjects,
                weak_subjects=weak_subjects,
                notes=notes,
            )

            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=2048,
                temperature=0.7,
            )

            if response and response.choices and response.choices[0].message.content:
                feedback = response.choices[0].message.content.strip()
                self.logger.info(
                    f"✅ [OpenRouter] Đã tạo nhận xét thành công cho {student_name}"
                )
                return feedback
            else:
                raise Exception("Không nhận được phản hồi từ OpenRouter API")

        except Exception as e:
            self.logger.error(
                f"❌ [OpenRouter] Lỗi khi tạo nhận xét cho {student_name}: {e}"
            )
            raise Exception(f"Không thể tạo nhận xét: {str(e)}")

    async def generate_batch_feedback(self, students_data: list) -> dict:
        """
        Tạo nhận xét cho nhiều học sinh

        Args:
            students_data: Danh sách thông tin học sinh

        Returns:
            Dictionary chứa kết quả
        """
        feedbacks = []
        failed_students = []
        success_count = 0
        failed_count = 0

        for student_data in students_data:
            try:
                feedback_text = await self.generate_student_feedback(
                    student_name=student_data.get("name"),
                    score=student_data.get("score"),
                    attendance_rate=student_data.get("attendance"),
                    top_subjects=student_data.get("top_subjects"),
                    weak_subjects=student_data.get("weak_subjects"),
                    notes=student_data.get("notes", ""),
                )

                feedbacks.append({
                    "student_name": student_data["name"],
                    "feedback": feedback_text,
                    "success": True,
                    "error": None,
                })
                success_count += 1

            except Exception as e:
                self.logger.error(
                    f"❌ Lỗi tạo nhận xét cho {student_data.get('name')}: {e}"
                )
                feedbacks.append({
                    "student_name": student_data["name"],
                    "feedback": "",
                    "success": False,
                    "error": str(e),
                })
                failed_students.append(student_data["name"])
                failed_count += 1

        if failed_students:
            self.logger.warning(
                f"⚠️ Không thể tạo nhận xét cho: {', '.join(failed_students)}"
            )

        return {
            "success_count": success_count,
            "failed_count": failed_count,
            "failed_students": failed_students,
            "feedbacks": feedbacks,
        }
