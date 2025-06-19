"""
AI Chat Bot sử dụng Google AI Studio (Gemini) API
Tác giả: AI Assistant
Mô tả: Ứng dụng chat console đơn giản với Gemini AI
"""

import os
import sys
from typing import Optional
import google.generativeai as genai
from datetime import datetime
import json


class GeminiChatBot:
    """
    Lớp ChatBot sử dụng Google Gemini API
    """
    
    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-2.0-flash"):
        """
        Khởi tạo ChatBot
        
        Args:
            api_key: API key cho Google AI Studio
            model_name: Tên model Gemini để sử dụng
        """
        self.api_key = api_key or self._load_api_key()
        self.model_name = model_name
        self.model = None
        self.chat_session = None
        self.chat_history = []
        
        if not self.api_key:
            raise ValueError("API key không được tìm thấy. Vui lòng cấu hình API key.")
        
        self._initialize_model()
    
    def _load_api_key(self) -> Optional[str]:
        """
        Tải API key từ biến môi trường hoặc file config
        
        Returns:
            API key nếu tìm thấy, None nếu không
        """
        # Thử lấy từ biến môi trường
        api_key = 'AIzaSyAJLXNgLaKPxTv_rn_iERKxgiUhMPvLlMw'
        if api_key:
            return api_key
        
        # Thử lấy từ file config.json
        try:
            if os.path.exists('config.json'):
                with open('config.json', 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    return config.get('gemini_api_key')
        except Exception as e:
            print(f"Lỗi khi đọc file config: {e}")
        
        return None
    
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
                max_output_tokens=8192,
                temperature=0.7,
            )
            
            print(f"✅ Đã kết nối thành công với {self.model_name}")
            
        except Exception as e:
            print(f"❌ Lỗi khi khởi tạo model: {e}")
            sys.exit(1)
    
    def start_chat_session(self):
        """
        Bắt đầu phiên chat mới
        """
        try:
            self.chat_session = self.model.start_chat(history=[])
            print("💬 Phiên chat đã được bắt đầu!")
        except Exception as e:
            print(f"❌ Lỗi khi bắt đầu chat: {e}")
            return False
        return True
    
    def send_message(self, message: str) -> str:
        """
        Gửi tin nhắn và nhận phản hồi
        
        Args:
            message: Tin nhắn của người dùng
            
        Returns:
            Phản hồi từ AI
        """
        if not self.chat_session:
            self.start_chat_session()
        
        try:
            # Gửi tin nhắn
            response = self.chat_session.send_message(
                message,
                generation_config=self.generation_config
            )
            
            # Lưu lịch sử chat
            timestamp = datetime.now().strftime("%H:%M:%S")
            self.chat_history.append({
                "timestamp": timestamp,
                "user": message,
                "ai": response.text
            })
            
            return response.text
            
        except Exception as e:
            error_msg = f"❌ Lỗi khi gửi tin nhắn: {e}"
            print(error_msg)
            return error_msg
    
    def save_chat_history(self, filename: Optional[str] = None):
        """
        Lưu lịch sử chat vào file
        
        Args:
            filename: Tên file để lưu (mặc định: chat_history_YYYYMMDD_HHMMSS.json)
        """
        if not self.chat_history:
            print("📝 Không có lịch sử chat để lưu.")
            return
        
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"chat_history_{timestamp}.json"
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.chat_history, f, ensure_ascii=False, indent=2)
            print(f"💾 Đã lưu lịch sử chat vào {filename}")
        except Exception as e:
            print(f"❌ Lỗi khi lưu file: {e}")
    
    def display_help(self):
        """
        Hiển thị hướng dẫn sử dụng
        """
        help_text = """
🤖 === HƯỚNG DẪN SỬ DỤNG GEMINI CHAT BOT ===

📝 Lệnh đặc biệt:
  /help     - Hiển thị hướng dẫn này
  /clear    - Xóa màn hình
  /history  - Hiển thị lịch sử chat
  /save     - Lưu lịch sử chat vào file
  /exit     - Thoát chương trình

💬 Cách sử dụng:
  - Nhập tin nhắn của bạn và nhấn Enter
  - AI sẽ phản hồi ngay lập tức
  - Sử dụng các lệnh đặc biệt bằng cách gõ / trước

⚡ Mẹo:
  - Hãy đặt câu hỏi cụ thể để nhận được câu trả lời tốt nhất
  - Bạn có thể chat bằng tiếng Việt hoặc tiếng Anh
  - Lịch sử chat sẽ được lưu tự động trong phiên làm việc
        """
        print(help_text)
    
    def run_interactive_chat(self):
        """
        Chạy chế độ chat tương tác
        """
        print("🚀 Chào mừng bạn đến với Gemini Chat Bot!")
        print("Nhập '/help' để xem hướng dẫn, '/exit' để thoát.\n")
        
        if not self.start_chat_session():
            return
        
        while True:
            try:
                # Nhận input từ người dùng
                user_input = input("\n👤 Bạn: ").strip()
                
                if not user_input:
                    continue
                
                # Xử lý lệnh đặc biệt
                if user_input.startswith('/'):
                    command = user_input[1:].lower()
                    
                    if command == 'exit':
                        print("\n👋 Cảm ơn bạn đã sử dụng Gemini Chat Bot!")
                        self.save_chat_history()
                        break
                    
                    elif command == 'help':
                        self.display_help()
                        continue
                    
                    elif command == 'clear':
                        os.system('cls' if os.name == 'nt' else 'clear')
                        continue
                    
                    elif command == 'history':
                        self._display_chat_history()
                        continue
                    
                    elif command == 'save':
                        self.save_chat_history()
                        continue
                    
                    else:
                        print(f"❓ Lệnh không hợp lệ: {command}")
                        print("Nhập '/help' để xem danh sách lệnh.")
                        continue
                
                # Gửi tin nhắn cho AI
                print("\n🤖 AI đang suy nghĩ...")
                response = self.send_message(user_input)
                print(f"\n🤖 Gemini: {response}")
                
            except KeyboardInterrupt:
                print("\n\n⏹️ Đã dừng bởi người dùng.")
                print("👋 Cảm ơn bạn đã sử dụng Gemini Chat Bot!")
                break
            except Exception as e:
                print(f"\n❌ Lỗi không mong muốn: {e}")
                print("Vui lòng thử lại.")
    
    def _display_chat_history(self):
        """
        Hiển thị lịch sử chat
        """
        if not self.chat_history:
            print("📝 Chưa có lịch sử chat nào.")
            return
        
        print("\n📚 === LỊCH SỬ CHAT ===")
        for i, entry in enumerate(self.chat_history, 1):
            timestamp = entry['timestamp']
            user_msg = entry['user'][:100] + "..." if len(entry['user']) > 100 else entry['user']
            ai_msg = entry['ai'][:100] + "..." if len(entry['ai']) > 100 else entry['ai']
            
            print(f"\n[{i}] {timestamp}")
            print(f"👤 Bạn: {user_msg}")
            print(f"🤖 AI: {ai_msg}")
        print("\n" + "="*50)


def create_config_file():
    """
    Tạo file config.json mẫu
    """
    config_template = {
        "gemini_api_key": "YOUR_GEMINI_API_KEY_HERE",
        "model_name": "gemini-2.0-flash",
        "note": "Thay thế YOUR_GEMINI_API_KEY_HERE bằng API key thực của bạn từ Google AI Studio"
    }
    
    try:
        with open('config.json', 'w', encoding='utf-8') as f:
            json.dump(config_template, f, ensure_ascii=False, indent=2)
        print("📄 Đã tạo file config.json mẫu. Vui lòng cập nhật API key của bạn.")
    except Exception as e:
        print(f"❌ Lỗi khi tạo file config: {e}")


def main():
    """
    Hàm main để chạy ứng dụng
    """
    try:
        # Kiểm tra xem có file config không
        if not os.path.exists('config.json') and not os.getenv('GEMINI_API_KEY'):
            print("⚠️ Không tìm thấy API key!")
            print("📋 Hướng dẫn cấu hình:")
            print("1. Cách 1: Tạo biến môi trường GEMINI_API_KEY")
            print("2. Cách 2: Tạo file config.json với API key")
            print("\nTạo file config.json mẫu? (y/n): ", end="")
            
            choice = input().strip().lower()
            if choice in ['y', 'yes', 'có']:
                create_config_file()
                print("\n🔑 Vui lòng:")
                print("1. Truy cập https://makersuite.google.com/app/apikey")
                print("2. Tạo API key mới")
                print("3. Cập nhật API key vào file config.json")
                print("4. Chạy lại chương trình")
                return
            else:
                print("👋 Hẹn gặp lại!")
                return
        
        # Khởi tạo và chạy chat bot
        chatbot = GeminiChatBot()
        chatbot.run_interactive_chat()
        
    except Exception as e:
        print(f"❌ Lỗi nghiêm trọng: {e}")
        print("Vui lòng kiểm tra lại cấu hình và thử lại.")


if __name__ == "__main__":
    main() 