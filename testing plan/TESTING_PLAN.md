1. Chiến lược Testing (Mô hình Kim tự tháp)
Bạn nên tập trung vào 3 tầng chính, cộng thêm phần kiểm thử hiệu năng (Non-functional):
Tầng 1: Unit Testing (Kiểm thử đơn vị) - Quan trọng nhất cho Backend
•	Mục tiêu: Kiểm tra các hàm xử lý logic nhỏ nhất, đảm bảo tính toán đúng.
•	Phạm vi:
o	Backend: Các hàm tính điểm trung bình, các hàm validate dữ liệu đầu vào (Pydantic), các hàm tiện ích (Utils).
o	Frontend: Các component nhỏ (Button, Input), các hàm format ngày tháng, tiền tệ.
•	Công cụ:
o	Backend (Python/FastAPI): pytest (Chuẩn công nghiệp, gọn nhẹ hơn unittest mặc định).
o	Frontend (React): Vitest (nhanh hơn Jest) + React Testing Library.
Tầng 2: Integration Testing (Kiểm thử tích hợp) - Quan trọng cho API
•	Mục tiêu: Kiểm tra xem các module có "nói chuyện" với nhau đúng không (API gọi Database, API gọi AI Service).
•	Phạm vi:
o	Test các API Endpoints (Gửi request -> Check response status, data).
o	Test truy vấn Database (Repository Layer).
o	Lưu ý: Với các dịch vụ bên ngoài (AI Gemini, Email), nên dùng kỹ thuật Mocking (giả lập) để không bị tốn tiền/quota mỗi lần chạy test.
•	Công cụ: pytest (dùng chung với Unit test), Testcontainers (để dựng DB ảo khi test).
Tầng 3: End-to-End Testing (E2E) - Bạn đang làm
•	Mục tiêu: Mô phỏng hành vi người dùng thật từ đầu đến cuối.
•	Phạm vi: Các luồng chính (Critical Flows): Đăng nhập -> Điểm danh -> Xem báo cáo.
•	Công cụ: Playwright (Bạn đang dùng là chuẩn bài, tốt hơn Selenium/Cypress nhiều).
Tầng 4: Performance Testing (Kiểm thử hiệu năng) - Yêu cầu phi chức năng
•	Mục tiêu: Chứng minh hệ thống chịu được 50-100 người dùng đồng thời (như đã hứa trong báo cáo).
•	Công cụ: Locust (Viết bằng Python, rất hợp với stack của bạn) hoặc JMeter (Kinh điển nhưng giao diện hơi cũ).
________________________________________
2. Đề xuất cụ thể cho từng phần (Actionable Items)
Dưới đây là những gì bạn cần làm cụ thể cho đồ án:
A. Backend Testing (FastAPI) - Ưu tiên cao
Vì FastAPI chứa logic nghiệp vụ chính, bạn cần setup pytest ngay.
1.	Cài đặt: pip install pytest pytest-mock httpx
2.	Viết Test Case:
o	Unit: Test hàm tính toán điểm (nhập 9, 10 -> ra 9.5?).
o	Integration: Test API Login. Gửi user/pass đúng -> Trả về 200 + Token. Gửi sai -> Trả về 401.
3.	Mocking AI: Khi test API tạo nhận xét (Feedback), hãy Mock lại hàm gọi Gemini để nó luôn trả về chuỗi "AI Response" giả định. Đừng gọi Gemini thật khi chạy test tự động.
B. Frontend Testing (ReactJS) - Ưu tiên trung bình
Với đồ án, bạn không cần test từng cái nút bấm. Hãy tập trung test các logic hiển thị phức tạp.
1.	Công cụ: Vitest (nếu dùng Vite) hoặc Jest (nếu dùng CRA).
2.	Viết Test Case:
o	Test việc hiển thị dữ liệu lên bảng (Table) khi API trả về danh sách rỗng, có dữ liệu, hoặc lỗi.
o	Test các form validation (nhập sai email thì báo lỗi đỏ).
C. E2E Testing (Playwright) - Đã có, cần mở rộng
Bạn đang dùng Playwright để refactor, rất tốt. Hãy mở rộng nó thành kịch bản demo:
•	Record lại kịch bản: GVCN Đăng nhập -> Vào lớp -> Mở Camera -> Điểm danh -> Lưu.
•	Chạy kịch bản này trước mỗi lần commit code mới.
D. Performance Testing (Locust) - Cần cho báo cáo
Để điền vào mục "Đánh giá hệ thống" trong luận văn.
1.	Viết 1 file script locustfile.py mô phỏng 50 user cùng đăng nhập và xem bảng điểm.
2.	Chạy test trong 1-2 phút.
3.	Chụp lại biểu đồ Response Time và số lượng Request/s để đưa vào báo cáo. Đây là bằng chứng thép cho NFR (Non-functional Requirements).
________________________________________
3. Tổng kết Toolstack khuyên dùng
Loại Test	Công cụ đề xuất	Lý do
Unit/Integration (BE)	pytest	Chuẩn mực của Python, dễ viết, output đẹp.
Mocking (BE)	pytest-mock	Giả lập AI/Database/Email service dễ dàng.
Unit/Component (FE)	Vitest	Tương thích hoàn hảo với Vite (bạn đang dùng), nhanh hơn Jest.
E2E / UI	Playwright	Hiện đại, nhanh, hỗ trợ quay video/trace lỗi tốt.
Performance	Locust	Viết test bằng Python code, rất linh hoạt và nhẹ.
4. Lời khuyên cho "Đồ án tốt nghiệp"
Đừng cố gắng đạt 100% Code Coverage (độ bao phủ). Trong đồ án, bạn chỉ cần:
1.	Cover các luồng chính (Happy Path): Chạy đúng là được.
2.	Test các trường hợp biên (Edge Cases) quan trọng: Ví dụ nhập điểm < 0 hoặc > 10.
3.	Có hình ảnh bằng chứng: Chụp màn hình kết quả chạy test (tích xanh) và biểu đồ chịu tải để đưa vào báo cáo chương 6 hoặc 7.
Bạn có thể bắt đầu bằng việc cài pytest cho Backend trước, vì đó là nơi dễ phát sinh lỗi logic nhất khi refactor.

