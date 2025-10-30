"""
AI Feedback Service sử dụng Google Gemini API
Tạo nhận xét học sinh tự động dựa trên dữ liệu học tập
"""

import os
import logging
from typing import Optional
import google.generativeai as genai
from datetime import datetime


class GeminiFeedbackService:
    """
    Service tạo nhận xét học sinh sử dụng Google Gemini API
    """
    
    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-2.0-flash-exp"):
        """
        Khởi tạo Gemini Service
        
        Args:
            api_key: API key cho Google AI Studio
            model_name: Tên model Gemini để sử dụng
        """
        self.api_key = api_key or self._load_api_key()
        self.model_name = model_name
        self.model = None
        self.logger = logging.getLogger(__name__)
        
        if not self.api_key:
            raise ValueError("API key không được tìm thấy. Vui lòng cấu hình GEMINI_API_KEY.")
        
        self._initialize_model()
    
    def _load_api_key(self) -> Optional[str]:
        """
        Tải API key từ biến môi trường
        
        Returns:
            API key nếu tìm thấy, None nếu không
        """
        # Thử lấy từ biến môi trường
        api_key = os.getenv('GEMINI_API_KEY')
        if api_key:
            return api_key
        
        # Fallback API key (chỉ dùng cho development)
        return 'AIzaSyA_95bYqbFt3mBxTZtp75fxhuZCwBH34es'
    
    def _initialize_model(self):
        """
        Khởi tạo model Gemini
        """
        try:
            # Cấu hình API key
            genai.configure(api_key=self.api_key)
            
            # Khởi tạo model
            self.model = genai.GenerativeModel(self.model_name)
            
            # Cấu hình generation
            self.generation_config = genai.types.GenerationConfig(
                candidate_count=1,
                max_output_tokens=2048,
                temperature=0.7,
            )
            
            self.logger.info(f"✅ Đã kết nối thành công với {self.model_name}")
            
        except Exception as e:
            self.logger.error(f"❌ ERROR: Lỗi khi khởi tạo Gemini model: {e}")
            raise
    
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
        try:
            self.logger.info(f"🤖 Đang tạo nhận xét AI cho học sinh: {student_name}")
            
            # Tạo prompt
            prompt = self.create_feedback_prompt(
                student_name=student_name,
                score=score,
                attendance_rate=attendance_rate,
                top_subjects=top_subjects,
                weak_subjects=weak_subjects,
                notes=notes,
            )
            
            # Gửi request tới Gemini
            response = self.model.generate_content(
                prompt,
                generation_config=self.generation_config
            )
            
            if response and response.text:
                feedback = response.text.strip()
                self.logger.info(f"✅ Đã tạo nhận xét thành công cho {student_name}")
                return feedback
            else:
                raise Exception("Không nhận được phản hồi từ Gemini API")
                
        except Exception as e:
            self.logger.error(f"❌ ERROR: Lỗi khi tạo nhận xét cho {student_name}: {e}")
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
