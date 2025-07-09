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
    
    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-2.0-flash"):
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
        return 'AIzaSyAJLXNgLaKPxTv_rn_iERKxgiUhMPvLlMw'
    
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
            
            self.logger.info(f"Đã kết nối thành công với {self.model_name}")
            
        except Exception as e:
            self.logger.error(f"ERROR: Lỗi khi khởi tạo Gemini model: {e}")
            raise
    
    def create_feedback_prompt(self, student_name: str, score: float, score_trend: str, 
                             attendance_rate: int, notes: str = "") -> str:
        """
        Tạo ra một prompt chi tiết để yêu cầu model viết nhận xét
        
        Args:
            student_name: Tên học sinh
            score: Điểm số hiện tại (0-10)
            score_trend: Xu hướng điểm ('tăng', 'giảm', 'ổn định')
            attendance_rate: Tỷ lệ chuyên cần (%)
            notes: Ghi chú thêm từ giáo viên
            
        Returns:
            Prompt đã được định dạng
        """
        
        prompt = f"""
Bạn là một trợ lý AI cho giáo viên, bạn sẽ vào vai là một giáo viên và chuyên viết nhận xét ngắn gọn và chuyên nghiệp cho học sinh (không phải sinh viên) để gửi về cho phụ huynh.

**QUY TẮC BẮT BUỘC:**
- Chỉ trả lời bằng nội dung nhận xét, KHÔNG thêm lời chào, câu giới thiệu hay bất kỳ văn bản thừa nào.
- Văn phong: Tích cực, mang tính xây dựng, khích lệ. Nếu xu hướng điểm số dưới 7 hay tỷ lệ chuyên cần dưới 80% thì cần phải phê bình học sinh và góp ý cho phụ huynh. 
- Có thể dựa trên ghi chú thêm của giáo viên để tạo nhận xét cho phù hợp
- Ngôn ngữ: Tiếng Việt chuẩn, trang trọng.
- Độ dài: Khoảng 2-3 câu.

**DỮ LIỆU HỌC SINH:**
- Tên: {student_name}
- Điểm số gần nhất: {score}/10
- Xu hướng điểm số: {score_trend}
- Tỷ lệ chuyên cần: {attendance_rate}%
- Ghi chú thêm của giáo viên: {notes if notes else "Không có"}

Dựa vào các dữ liệu trên, hãy viết một đoạn nhận xét.
        """
        return prompt.strip()
    
    async def generate_student_feedback(self, student_name: str, score: float, 
                                      score_trend: str, attendance_rate: int, 
                                      notes: str = "") -> str:
        """
        Tạo nhận xét cho học sinh dựa trên dữ liệu đầu vào
        
        Args:
            student_name: Tên học sinh
            score: Điểm số (0-10)
            score_trend: Xu hướng điểm ('tăng', 'giảm', 'ổn định')
            attendance_rate: Tỷ lệ chuyên cần (%)
            notes: Ghi chú thêm từ giáo viên
            
        Returns:
            Nhận xét học sinh
            
        Raises:
            Exception: Nếu có lỗi khi tạo nhận xét
        """
        try:
            self.logger.info(f"Đang tạo nhận xét cho học sinh: {student_name}")
            
            # Tạo prompt
            prompt = self.create_feedback_prompt(
                student_name, score, score_trend, attendance_rate, notes
            )
            
            # Gửi request tới Gemini
            response = self.model.generate_content(
                prompt,
                generation_config=self.generation_config
            )
            
            if response and response.text:
                feedback = response.text.strip()
                self.logger.info(f"Đã tạo nhận xét thành công cho {student_name}")
                return feedback
            else:
                raise Exception("Không nhận được phản hồi từ Gemini API")
                
        except Exception as e:
            self.logger.error(f"ERROR: Lỗi khi tạo nhận xét cho {student_name}: {e}")
            raise Exception(f"Không thể tạo nhận xét: {str(e)}")
    
    async def generate_batch_feedback(self, students_data: list) -> dict:
        """
        Tạo nhận xét cho nhiều học sinh cùng lúc
        
        Args:
            students_data: Danh sách thông tin học sinh
            Format: [{"name": str, "score": float, "trend": str, "attendance": int, "notes": str}]
            
        Returns:
            Dictionary với key là tên học sinh, value là nhận xét
        """
        results = {}
        failed_students = []
        
        for student_data in students_data:
            try:
                feedback = await self.generate_student_feedback(
                    student_name=student_data.get("name"),
                    score=student_data.get("score"),
                    score_trend=student_data.get("trend"),
                    attendance_rate=student_data.get("attendance"),
                    notes=student_data.get("notes", "")
                )
                results[student_data["name"]] = feedback
                
            except Exception as e:
                self.logger.error(f"Lỗi tạo nhận xét cho {student_data.get('name')}: {e}")
                failed_students.append(student_data["name"])
        
        if failed_students:
            self.logger.warning(f"Không thể tạo nhận xét cho: {', '.join(failed_students)}")
        
        return {
            "success_count": len(results),
            "failed_count": len(failed_students),
            "failed_students": failed_students,
            "feedbacks": results
        }


# Khởi tạo service singleton
gemini_service = None

def get_gemini_service() -> GeminiFeedbackService:
    """
    Lấy instance của GeminiFeedbackService
    
    Returns:
        GeminiFeedbackService instance
    """
    global gemini_service
    
    if gemini_service is None:
        try:
            gemini_service = GeminiFeedbackService()
        except Exception as e:
            logging.error(f"Không thể khởi tạo Gemini service: {e}")
            raise
    
    return gemini_service 