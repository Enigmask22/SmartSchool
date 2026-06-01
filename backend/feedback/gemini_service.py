"""
AI Feedback Service sử dụng Google Gemini API
Tạo nhận xét học sinh tự động dựa trên dữ liệu học tập
"""

import os
import logging
from typing import Optional
from google import genai


class GeminiFeedbackService:
    """
    Service tạo nhận xét học sinh sử dụng Google Gemini API
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
    ):
        """
        Khởi tạo Gemini Service

        Args:
            api_key: API key cho Google AI Studio
            model_name: Tên model Gemini để sử dụng (vd: gemma-4-31b-it)
        """
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model_name = model_name or os.getenv(
            "GEMINI_MODEL", "gemini-2.5-flash"
        )
        self.logger = logging.getLogger(__name__)

        if not self.api_key:
            raise ValueError(
                "Gemini API key không được tìm thấy. "
                "Vui lòng cấu hình GEMINI_API_KEY trong .env"
            )

        self.client = genai.Client(api_key=self.api_key)
        self.logger.info(f"✅ GeminiFeedbackService initialized với model: {self.model_name}")

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
        Tạo ra một prompt chi tiết để yêu cầu model viết nhận xét

        Args:
            student_name: Tên học sinh
            score: Điểm số hiện tại (0-10)
            attendance_rate: Tỷ lệ chuyên cần (%)
            top_subjects: Danh sách môn học tốt (nếu có)
            weak_subjects: Danh sách môn học chưa tốt (nếu có)
            notes: Ghi chú thêm từ giáo viên (ưu tiên về chuyên cần: vắng/đi trễ)

        Returns:
            Prompt đã được định dạng
        """

        # Chuẩn hoá dữ liệu môn học
        top_subjects = top_subjects or []
        weak_subjects = weak_subjects or []
        top_text = ", ".join(top_subjects[:5]) if top_subjects else "Không có"
        weak_text = ", ".join(weak_subjects[:5]) if weak_subjects else "Không có"
        # Kiểm tra ghi chú tiêu cực
        NEGATIVE_WORDS = ["vắng", "nghỉ", "trốn", "đi trễ", "không chuyên cần", "muộn học", "bỏ tiết", "trốn học", "cúp học"]
        negative_attendance = any(word in (notes or "").lower() for word in NEGATIVE_WORDS)

        attendance_hint = ""
        if not negative_attendance:
            attendance_hint = "- Lưu ý: Nếu không có ghi chú tiêu cực về chuyên cần, hãy TẶNG THÊM một câu khen em có ý thức đi học đầy đủ, đúng giờ, ngay sau câu khen về thành tích. Không cần sáng tạo thêm lý do hoặc chi tiết khác."

        prompt = f"""
Bạn là trợ lý AI của giáo viên chủ nhiệm. Hãy nhập vai giáo viên và viết nhận xét ngắn gọn, chuyên nghiệp cho học sinh (không phải sinh viên) để gửi cho phụ huynh.

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

Dựa trên dữ liệu trên, viết nhận xét cho học sinh này.
"""
        return prompt.strip()

    def create_gk_feedback_prompt(
        self,
        student_name: str,
        attendance_rate: int,
        low_score_details: Optional[list] = None,
        notes: str = "",
    ) -> str:
        """
        Tạo prompt nhận xét GIỮA KỲ (GK) — thông báo tình hình cho phụ huynh,
        không đánh giá điểm số, chỉ liệt kê các cột TX/GK cần lưu ý.
        """
        low_score_details = low_score_details or []

        # Build low score details text
        if low_score_details:
            details_lines = []
            for item in low_score_details:
                subject = item.get("subject", "???")
                columns = item.get("columns", [])
                if columns:
                    col_text = ", ".join(
                        f"{c['name']} = {c['value']}" for c in columns
                    )
                    details_lines.append(f"  - {subject}: {col_text}")
            details_text = "\n".join(details_lines) if details_lines else "Không có cột điểm nào dưới 8"
        else:
            details_text = "Không có cột điểm nào dưới 8 — tất cả các môn đều ổn."

        NEGATIVE_WORDS = ["vắng", "nghỉ", "trốn", "đi trễ", "không chuyên cần", "muộn học", "bỏ tiết", "trốn học", "cúp học"]
        negative_attendance = any(word in (notes or "").lower() for word in NEGATIVE_WORDS)

        attendance_hint = ""
        if not negative_attendance:
            attendance_hint = "- Lưu ý: Nếu không có ghi chú tiêu cực về chuyên cần, hãy thêm một câu ngắn gọn khen em có ý thức đi học đầy đủ, đúng giờ."

        prompt = f"""
Bạn là trợ lý AI của giáo viên chủ nhiệm. Hãy nhập vai giáo viên và viết nhận xét GIỮA KỲ ngắn gọn, chuyên nghiệp cho học sinh (không phải sinh viên) để THÔNG BÁO TÌNH HÌNH cho phụ huynh.

**MỤC TIÊU:**
Đây là nhận xét GIỮA KỲ — mục đích là cung cấp thông tin để phụ huynh nắm bắt tình hình học tập và kịp thời nhắc nhở, động viên học sinh trước khi thi cuối kỳ.

**QUY TẮC BẮT BUỘC:**
- Chỉ trả lời đúng nội dung nhận xét, KHÔNG thêm lời chào hay tiêu đề.
- Văn phong: thuần túy THÔNG BÁO, trung tính, khách quan. KHÔNG đánh giá, KHÔNG nhận xét điểm cao hay thấp, KHÔNG dùng các từ như "yếu", "kém", "tệ", "cần cố gắng", "cần nỗ lực", "cần cải thiện".
- PHẢI liệt kê ĐẦY ĐỦ TẤT CẢ các môn và TẤT CẢ các cột điểm được cung cấp trong dữ liệu bên dưới. KHÔNG được bỏ sót bất kỳ môn nào hay cột điểm nào. Đây là yêu cầu BẮT BUỘC.
- Sau khi liệt kê, kết thúc bằng một câu ngắn gọn mang tính hợp tác: kính mong quý phụ huynh theo dõi, động viên và nhắc nhở học sinh ôn tập chuẩn bị cho kỳ thi cuối kỳ.
- Nếu tất cả các cột điểm đều ≥ 8 và không có KĐ thì khen ngợi và động viên giữ vững phong độ.
- Mặc định chuyên cần tốt (đi học đầy đủ, đúng giờ); NẾU ghi chú nêu vắng/đi trễ thì phải đề cập.
- Ngôn ngữ: Tiếng Việt chuẩn, trang trọng. Độ dài: tối đa 4 câu, không dùng markdown.
{attendance_hint}

**DỮ LIỆU HỌC SINH:**
- Tên: {student_name}
- Danh sách ĐẦY ĐỦ các cột điểm thường xuyên / giữa kỳ dưới 8 hoặc KĐ (PHẢI liệt kê TẤT CẢ):
{details_text}
- Chuyên cần (mặc định tốt nếu không ghi chú tiêu cực): {attendance_rate}%
- Ghi chú của GVCN: {notes if notes else 'Không có'}

Dựa trên dữ liệu trên, viết nhận xét GIỮA KỲ cho học sinh này. Nhớ liệt kê ĐẦY ĐỦ TẤT CẢ các môn và cột điểm.
"""
        return prompt.strip()

    async def generate_gk_feedback(
        self,
        student_name: str,
        attendance_rate: int,
        low_score_details: Optional[list] = None,
        notes: str = "",
    ) -> str:
        """Tạo nhận xét GIỮA KỲ qua Gemini API."""
        prompt = self.create_gk_feedback_prompt(
            student_name=student_name,
            attendance_rate=attendance_rate,
            low_score_details=low_score_details or [],
            notes=(notes or "").strip(),
        )
        response = await self.client.aio.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config={"max_output_tokens": 2048, "temperature": 0.7},
        )
        if response and response.text:
            return response.text.strip()
        raise Exception("Empty response from Gemini for GK feedback")

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
        Tạo nhận xét cho học sinh dựa trên dữ liệu đầu vào

        Args:
            student_name: Tên học sinh
            score: Điểm số (0-10)
            attendance_rate: Tỷ lệ chuyên cần (%)
            top_subjects: Danh sách môn học tốt (nếu có)
            weak_subjects: Danh sách môn học chưa tốt (nếu có)
            notes: Ghi chú thêm từ giáo viên

        Returns:
            Nhận xét học sinh

        Raises:
            Exception: Nếu có lỗi khi tạo nhận xét
        """
        import traceback

        try:
            self.logger.info(f"🤖 Đang tạo nhận xét AI cho học sinh: {student_name}")

            prompt = self.create_feedback_prompt(
                student_name=student_name,
                score=score,
                attendance_rate=attendance_rate,
                top_subjects=top_subjects,
                weak_subjects=weak_subjects,
                notes=notes,
            )

            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config={
                    "max_output_tokens": 2048,
                    "temperature": 0.7,
                },
            )

            if response and response.text:
                feedback = response.text.strip()
                self.logger.info(f"✅ Đã tạo nhận xét thành công cho {student_name}")
                return feedback
            else:
                self.logger.error(f"❌ Gemini trả về response rỗng: {response}")
                raise Exception("Không nhận được phản hồi từ Gemini API")

        except Exception as e:
            self.logger.error(f"❌ ERROR: Lỗi khi tạo nhận xét cho {student_name}")
            self.logger.error(f"   Model: {self.model_name}")
            self.logger.error(f"   Exception type: {type(e).__name__}")
            self.logger.error(f"   Exception args: {e.args}")
            self.logger.error(f"   Traceback:\n{traceback.format_exc()}")
            raise Exception(f"Không thể tạo nhận xét: {str(e)}")

    async def generate_batch_feedback(self, students_data: list) -> dict:
        """
        Tạo nhận xét cho nhiều học sinh cùng lúc

        Args:
            students_data: Danh sách thông tin học sinh
            Format: [{"name": str, "score": float, "attendance": int, "top_subjects": [str], "weak_subjects": [str], "notes": str}]

        Returns:
            Dictionary chứa kết quả và danh sách feedbacks
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
                    "error": None
                })
                success_count += 1

            except Exception as e:
                self.logger.error(f"❌ Lỗi tạo nhận xét cho {student_data.get('name')}: {e}")
                feedbacks.append({
                    "student_name": student_data["name"],
                    "feedback": "",
                    "success": False,
                    "error": str(e)
                })
                failed_students.append(student_data["name"])
                failed_count += 1

        if failed_students:
            self.logger.warning(f"⚠️ Không thể tạo nhận xét cho: {', '.join(failed_students)}")

        return {
            "success_count": success_count,
            "failed_count": failed_count,
            "failed_students": failed_students,
            "feedbacks": feedbacks
        }


# Khởi tạo service singleton
_gemini_service = None

def get_gemini_service() -> GeminiFeedbackService:
    """
    Lấy instance của GeminiFeedbackService (Singleton pattern)

    Returns:
        GeminiFeedbackService instance
    """
    global _gemini_service

    if _gemini_service is None:
        try:
            _gemini_service = GeminiFeedbackService()
        except Exception as e:
            logging.error(f"❌ Không thể khởi tạo Gemini service: {e}")
            raise

    return _gemini_service
