import time
import sys
from ollama import chat, ChatResponse
from typing import Optional


def create_feedback_prompt(student_name, score, score_trend, attendance_rate, notes=""):
    """
    Tạo ra một prompt chi tiết để yêu cầu model viết nhận xét.
    - score: Điểm số hiện tại (vd: 8.5)
    - score_trend: Xu hướng điểm ('tăng', 'giảm', 'ổn định')
    - attendance_rate: Tỷ lệ chuyên cần (vd: 95)
    - notes: Ghi chú thêm từ giáo viên (vd: "Hay phát biểu xây dựng bài")
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


def kiem_tra_ket_noi_ollama(model: str = 'ontocord/vinallama') -> bool:
    """
    Kiểm tra xem Ollama service có đang chạy không và model có sẵn không
    
    Args:
        model (str): Tên model cần kiểm tra
        
    Returns:
        bool: True nếu kết nối thành công, False nếu không
    """
    try:
        # Thử một chat request đơn giản để kiểm tra kết nối
        response = chat(
            model=model, 
            messages=[{'role': 'user', 'content': 'test'}]
        )
        return True
    except Exception as e:
        print(f"❌ Lỗi kết nối Ollama hoặc model không tồn tại: {e}")
        return False


def chat_voi_ollama(cau_hoi: str, model: str = 'vinallama-7b-chat') -> Optional[str]:
    """
    Gửi câu hỏi tới Ollama và nhận phản hồi
    
    Args:
        cau_hoi (str): Câu hỏi cần hỏi
        model (str): Tên model cần sử dụng
        
    Returns:
        Optional[str]: Phản hồi từ AI hoặc None nếu có lỗi
    """
    try:
        print(f"🤖 Đang sử dụng model: {model}")
        print("⏳ Đang xử lý...")
        
        response: ChatResponse = chat(model=model, messages=[
            {
                'role': 'user',
                'content': cau_hoi,
            },
        ])
        
        # Trả về nội dung phản hồi
        return response.message.content
        
    except ConnectionError as e:
        print(f"❌ Lỗi kết nối: {e}")
        print("💡 Hướng dẫn khắc phục:")
        print("   1. Kiểm tra Ollama đã được cài đặt và chạy")
        print("   2. Khởi động Ollama service: ollama serve")
        print(f"   3. Tải model: ollama pull {model}")
        return None
        
    except Exception as e:
        print(f"❌ Lỗi không xác định: {e}")
        return None


def tao_nhan_xet_hoc_sinh(student_name: str, score: float, score_trend: str, 
                          attendance_rate: int, notes: str = "", 
                          model: str = 'vinallama-7b-chat') -> Optional[str]:
    """
    Tạo nhận xét cho học sinh dựa trên dữ liệu đầu vào
    
    Args:
        student_name (str): Tên học sinh
        score (float): Điểm số (0-10)
        score_trend (str): Xu hướng điểm ('tăng', 'giảm', 'ổn định')
        attendance_rate (int): Tỷ lệ chuyên cần (%)
        notes (str): Ghi chú thêm từ giáo viên
        model (str): Model AI sử dụng
        
    Returns:
        Optional[str]: Nhận xét học sinh hoặc None nếu có lỗi
    """
    print(f"\n📋 Đang tạo nhận xét cho học sinh: {student_name}")
    print(f"   📊 Điểm số: {score}/10 ({score_trend})")
    print(f"   📅 Chuyên cần: {attendance_rate}%")
    if notes:
        print(f"   📝 Ghi chú: {notes}")
    
    # Tạo prompt
    prompt = create_feedback_prompt(student_name, score, score_trend, attendance_rate, notes)
    
    # Gửi tới AI để tạo nhận xét
    nhan_xet = chat_voi_ollama(prompt, model)
    
    return nhan_xet


def main():
    """
    Hàm main để chạy chương trình
    """
    print("🚀 Khởi động chương trình tạo nhận xét học sinh với Ollama...")
    
    model = 'ontocord/vinallama'
    
    # Kiểm tra kết nối trước
    if not kiem_tra_ket_noi_ollama(model):
        print(f"❌ Không thể kết nối tới Ollama hoặc model {model} không tồn tại.")
        print(f"💡 Hãy chạy lệnh: ollama pull {model}")
        sys.exit(1)
    
    print("✅ Kết nối Ollama thành công!")
    
    # Dữ liệu mẫu của học sinh
    du_lieu_hoc_sinh = [
        {
            "student_name": "Nguyễn Văn An",
            "score": 8.5,
            "score_trend": "tăng",
            "attendance_rate": 95,
            "notes": "Hay phát biểu xây dựng bài, nhiệt tình tham gia hoạt động nhóm"
        },
        {
            "student_name": "Trần Thị Bình",
            "score": 7.0,
            "score_trend": "ổn định", 
            "attendance_rate": 88,
            "notes": "Cần cải thiện kỹ năng thuyết trình"
        },
        {
            "student_name": "Lê Hoàng Cường",
            "score": 6.5,
            "score_trend": "giảm",
            "attendance_rate": 78,
            "notes": "Thường xuyên vắng mặt, cần sự quan tâm hỗ trợ thêm"
        }
    ]
    
    # Tạo nhận xét cho từng học sinh
    for i, hoc_sinh in enumerate(du_lieu_hoc_sinh, 1):
        print(f"\n{'='*60}")
        print(f"HỌC SINH {i}: {hoc_sinh['student_name']}")
        print('='*60)
        
        nhan_xet = tao_nhan_xet_hoc_sinh(
            student_name=hoc_sinh['student_name'],
            score=hoc_sinh['score'], 
            score_trend=hoc_sinh['score_trend'],
            attendance_rate=hoc_sinh['attendance_rate'],
            notes=hoc_sinh['notes'],
            model=model
        )
        
        if nhan_xet:
            print(f"\n💬 NHẬN XÉT:")
            print("-" * 40)
            print(nhan_xet)
            print("-" * 40)
        else:
            print("❌ Không thể tạo nhận xét cho học sinh này.")
        
        # Pause giữa các request để tránh quá tải
        if i < len(du_lieu_hoc_sinh):
            print("\n⏳ Đang chuẩn bị tạo nhận xét cho học sinh tiếp theo...")
            time.sleep(2)


if __name__ == "__main__":
    main()
