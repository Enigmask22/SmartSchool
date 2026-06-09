"""
AI Feedback Service sử dụng OpenRouter API (OpenAI-compatible)
Hỗ trợ model: openai/gpt-oss-120b:free và các model khác trên OpenRouter
"""

import os
import logging
from typing import Optional
from openai import AsyncOpenAI


def _map_ren_luyen(value: str) -> str:
    """Ánh xạ mã kết quả rèn luyện / học lực sang nhãn hiển thị."""
    mapping = {"1": "Tốt", "2": "Khá", "3": "Đạt", "4": "Chưa Đạt"}
    return mapping.get(value, "") if value else ""


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
        ket_qua_ren_luyen: Optional[str] = None,
        hoc_luc: Optional[str] = None,
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
- Kết quả rèn luyện và Học lực là thông tin do giáo viên xác định. PHẢI đề cập CHÍNH XÁC các giá trị này trong nhận xét, KHÔNG được tự ý thay đổi hay đánh giá lại.
{attendance_hint}

**DỮ LIỆU HỌC SINH:**
- Tên: {student_name}
- Điểm trung bình học kì: {score}/10
- Môn học tốt: {top_text}
- Môn học chưa tốt: {weak_text}
- Chuyên cần (mặc định tốt nếu không ghi chú tiêu cực): {attendance_rate}%
- Kết quả rèn luyện: {_map_ren_luyen(ket_qua_ren_luyen) if ket_qua_ren_luyen else 'Chưa có'}
- Học lực: {_map_ren_luyen(hoc_luc) if hoc_luc else 'Chưa có'}
- Ghi chú của GVCN (ưu tiên về chuyên cần): {notes if notes else 'Không có'}

Dựa trên dữ liệu trên, viết nhận xét cho học sinh này."""
        return prompt.strip()

    def create_gk_feedback_prompt(
        self,
        student_name: str,
        attendance_rate: int,
        low_score_details: Optional[list] = None,
        notes: str = "",
        ket_qua_ren_luyen: Optional[str] = None,
    ) -> str:
        """
        Tạo prompt nhận xét GIỮA KỲ (GK) — thông báo tình hình cho phụ huynh,
        không đánh giá điểm số, chỉ liệt kê các cột TX/GK cần lưu ý.
        """
        low_score_details = low_score_details or []

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
- Kết quả rèn luyện là thông tin do giáo viên xác định. PHẢI đề cập CHÍNH XÁC giá trị này trong nhận xét, KHÔNG được tự ý thay đổi hay đánh giá lại.
- Ngôn ngữ: Tiếng Việt chuẩn, trang trọng. Độ dài: tối đa 4 câu, không dùng markdown.
{attendance_hint}

**DỮ LIỆU HỌC SINH:**
- Tên: {student_name}
- Danh sách ĐẦY ĐỦ các cột điểm thường xuyên / giữa kỳ dưới 8 hoặc KĐ (PHẢI liệt kê TẤT CẢ):
{details_text}
- Chuyên cần (mặc định tốt nếu không ghi chú tiêu cực): {attendance_rate}%
- Kết quả rèn luyện: {_map_ren_luyen(ket_qua_ren_luyen) if ket_qua_ren_luyen else 'Chưa có'}
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
        ket_qua_ren_luyen: Optional[str] = None,
    ) -> str:
        """Tạo nhận xét GIỮA KỲ qua OpenRouter API."""
        prompt = self.create_gk_feedback_prompt(
            student_name=student_name,
            attendance_rate=attendance_rate,
            low_score_details=low_score_details or [],
            notes=(notes or "").strip(),
            ket_qua_ren_luyen=ket_qua_ren_luyen,
        )
        response = await self.client.chat.completions.create(
            model=self.model_name,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2048,
            temperature=0.7,
        )
        if response and response.choices and response.choices[0].message.content:
            return response.choices[0].message.content.strip()
        raise Exception("Empty response from OpenRouter for GK feedback")

    def create_cn_feedback_prompt(
        self,
        student_name: str,
        summary_data: dict,
        notes: str = "",
    ) -> str:
        """Tạo prompt nhận xét CẢ NĂM (CN)."""
        label_map = {"1": "Tốt", "2": "Khá", "3": "Đạt", "4": "Chưa Đạt"}
        title_map = {"1": "Học sinh Xuất sắc", "2": "Học sinh Giỏi"}

        year_avg = summary_data.get("year_avg_score", "N/A")
        hl = label_map.get(summary_data.get("year_hoc_luc", ""), "Chưa có")
        rl = label_map.get(summary_data.get("year_ren_luyen", ""), "Chưa có")
        hk1_avg = summary_data.get("hk1_avg_score", "N/A")
        hk2_avg = summary_data.get("hk2_avg_score", "N/A")
        hk1_hl = label_map.get(summary_data.get("hk1_hoc_luc", ""), "Chưa có")
        hk2_hl = label_map.get(summary_data.get("hk2_hoc_luc", ""), "Chưa có")
        hk1_rl = label_map.get(summary_data.get("hk1_ren_luyen", ""), "Chưa có")
        hk2_rl = label_map.get(summary_data.get("hk2_ren_luyen", ""), "Chưa có")
        title_val = summary_data.get("title")
        title_str = title_map.get(title_val, "") if title_val else ""

        subject_lines = ""
        details = summary_data.get("subject_details", [])
        if isinstance(details, list) and details:
            subject_lines = "\n".join(
                f"  - {s.get('subject_name', '???')}: HK1={s.get('hk1_score', '-')}, HK2={s.get('hk2_score', '-')}, CN={s.get('year_avg', '-')}"
                for s in details
            )

        prompt = f"""Bạn là trợ lý AI của giáo viên chủ nhiệm. Hãy nhập vai giáo viên và viết nhận xét TỔNG KẾT CẢ NĂM ngắn gọn, chuyên nghiệp cho học sinh (không phải sinh viên) để gửi cho phụ huynh.

**MỤC TIÊU:**
Đây là nhận xét TỔNG KẾT CẢ NĂM — tổng hợp toàn bộ kết quả học tập và rèn luyện trong năm học để thông báo cho phụ huynh.

**QUY TẮC BẮT BUỘC:**
- Chỉ trả lời đúng nội dung nhận xét, KHÔNG thêm lời chào hay tiêu đề.
- Văn phong: trang trọng, tích cực, mang tính động viên và ghi nhận.
- PHẢI đề cập CHÍNH XÁC: điểm trung bình cả năm, học lực, kết quả rèn luyện, danh hiệu (nếu có).
- Có thể nhận xét ngắn gọn về sự tiến bộ hoặc ổn định giữa HK1 và HK2 dựa trên số liệu.
- Nếu có danh hiệu (Học sinh Xuất sắc / Học sinh Giỏi) thì mở đầu bằng lời chúc mừng.
- Ngôn ngữ: Tiếng Việt chuẩn, trang trọng. Độ dài: 3–5 câu, không dùng markdown.
- Các giá trị học lực và rèn luyện là do giáo viên xác định. PHẢI đề cập CHÍNH XÁC, KHÔNG tự ý thay đổi.

**DỮ LIỆU HỌC SINH:**
- Tên: {student_name}
- Điểm trung bình HK1: {hk1_avg} — Học lực HK1: {hk1_hl} — KQRL HK1: {hk1_rl}
- Điểm trung bình HK2: {hk2_avg} — Học lực HK2: {hk2_hl} — KQRL HK2: {hk2_rl}
- Điểm trung bình cả năm: {year_avg}
- Học lực cả năm: {hl}
- Kết quả rèn luyện cả năm: {rl}
- Danh hiệu: {title_str if title_str else 'Không có'}
{f'- Chi tiết từng môn:\n{subject_lines}' if subject_lines else ''}
- Ghi chú của GVCN: {notes if notes else 'Không có'}

Dựa trên dữ liệu trên, viết nhận xét TỔNG KẾT CẢ NĂM cho học sinh này."""
        return prompt.strip()

    async def generate_cn_feedback(
        self,
        student_name: str,
        summary_data: dict,
        notes: str = "",
    ) -> str:
        """Tạo nhận xét CẢ NĂM qua OpenRouter API."""
        prompt = self.create_cn_feedback_prompt(
            student_name=student_name,
            summary_data=summary_data or {},
            notes=(notes or "").strip(),
        )
        response = await self.client.chat.completions.create(
            model=self.model_name,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2048,
            temperature=0.7,
        )
        if response and response.choices and response.choices[0].message.content:
            return response.choices[0].message.content.strip()
        raise Exception("Empty response from OpenRouter for CN feedback")

    async def generate_student_feedback(
        self,
        student_name: str,
        score: float,
        attendance_rate: int,
        top_subjects: Optional[list] = None,
        weak_subjects: Optional[list] = None,
        notes: str = "",
        ket_qua_ren_luyen: Optional[str] = None,
        hoc_luc: Optional[str] = None,
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
            ket_qua_ren_luyen: Kết quả rèn luyện (1=Tốt, 2=Khá, 3=Đạt, 4=Chưa Đạt)
            hoc_luc: Học lực (1=Tốt, 2=Khá, 3=Đạt, 4=Chưa Đạt)

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
                ket_qua_ren_luyen=ket_qua_ren_luyen,
                hoc_luc=hoc_luc,
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
