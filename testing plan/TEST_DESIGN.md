# TÀI LIỆU KẾ HOẠCH KIỂM THỬ HỆ THỐNG SYNAPSES
*(Định hướng: Black-box Testing & Risk-based Testing)*

## 1. Các Giai đoạn Kiểm thử (Testing Stages)
Hệ thống SynapseS sẽ trải qua 4 giai đoạn kiểm thử, tập trung chủ yếu vào phương pháp Black-box (kiểm thử hộp đen - chú trọng vào Input/Output theo đặc tả hệ thống).

### 1.1. Unit Testing (Kiểm thử đơn vị)
*   **Mục tiêu:** Đảm bảo các hàm xử lý logic nghiệp vụ nhỏ nhất và các UI component hoạt động độc lập chính xác.
*   **Thành phần áp dụng:** 
    *   *Backend:* Các hàm tính toán điểm số (GPA), Validation dữ liệu (Pydantic schemas), định dạng chuỗi.
    *   *Frontend:* Các hàm utilities (format ngày giờ, format tên), state hiển thị của các Component độc lập (Button, Input có báo lỗi).
*   **Công cụ:** `pytest` (Backend), `Vitest` (Frontend).
*   **Lý do:** Đây là các công cụ chuẩn mực, chạy cực nhanh, giúp Developer phát hiện lỗi ngay trong lúc code (TDD - Test Driven Development).

### 1.2. Integration Testing (Kiểm thử tích hợp)
*   **Mục tiêu:** Kiểm tra sự giao tiếp giữa các module nội bộ (API với Database) và với các dịch vụ bên ngoài (External Services: AI Gemini, SMTP).
*   **Thành phần áp dụng:** Các API Endpoints phía Backend (Layer 1 & 2) kết nối xuống Infrastructure (Layer 3).
*   **Công cụ:** `pytest` kết hợp `pytest-mock` và `Testcontainers` (hoặc DB test trên Supabase).
*   **Lý do:** Trong kiến trúc Modular Monolith của SynapseS, việc các module nói chuyện với nhau rất quan trọng. Việc dùng `pytest-mock` là bắt buộc để *giả lập (mock)* API của Google Gemini, giúp không bị tốn chi phí (quota) và không bị phụ thuộc vào mạng khi chạy test tự động.

### 1.3. End-to-End (E2E) & Regression Testing (Kiểm thử hồi quy)
*   **Mục tiêu:** Mô phỏng hành vi của người dùng thật thao tác trên trình duyệt từ đầu đến cuối luồng nghiệp vụ. Đảm bảo khi thêm tính năng mới, các luồng cũ (Regression) không bị gãy.
*   **Thành phần áp dụng:** Toàn bộ hệ thống (Frontend gọi API -> API gọi DB/AI -> Trả data về Frontend hiển thị).
*   **Công cụ:** `Playwright`.
*   **Lý do:** Playwright hỗ trợ tự động hóa trình duyệt cực tốt, có thể giả lập luồng stream Camera (để test Nhận diện khuôn mặt) và quay lại video bằng chứng (Video/Trace logs) rất hữu ích cho báo cáo hội đồng.

### 1.4. Performance Testing (Kiểm thử hiệu năng)
*   **Mục tiêu:** Kiểm chứng các giới hạn chịu tải của hệ thống, đáp ứng yêu cầu phi chức năng.
*   **Thành phần áp dụng:** Các API xử lý nặng phía Backend (Face Recognition AI, Tổng hợp Dashboard).
*   **Công cụ:** `Locust`.
*   **Lý do:** Viết bằng Python, dễ dàng tái sử dụng các model dữ liệu của FastAPI, giả lập chính xác hành vi người dùng (spawn 50 users đồng thời) với biểu đồ báo cáo trực quan.

---

## 2. Xây dựng Test Scenarios dựa trên Requirements
Dựa vào tài liệu thiết kế (Chương 3 & Chương 4), các kịch bản kiểm thử được ánh xạ trực tiếp từ FR (Functional Req) và NFR (Non-Functional Req).

### 2.1. Nhóm Scenarios cho Functional Requirements (FR)
*   **Scenario 1: Xác thực và Phân quyền (Map với F.R.1)**
    *   Kiểm tra tính năng Đăng nhập.
    *   Kiểm tra Role-Based Access Control (RBAC): Đảm bảo Giáo viên bộ môn không thể truy cập API cấu hình toàn trường của Quản trị viên.
*   **Scenario 2: Điểm danh thông minh (Map với F.R.4 & UC-HOM-02)**
    *   Kiểm tra luồng AI tự động nhận diện và cập nhật trạng thái (Có mặt/Đi trễ).
    *   Kiểm tra luồng ghi đè thủ công của GVCN.
*   **Scenario 3: Nhập điểm bằng OCR (Map với F.R.5 & UC-SUB-02-EXT2)**
    *   Kiểm tra trích xuất dữ liệu từ ảnh sang JSON.
    *   Kiểm tra cơ chế chặn lưu dữ liệu nếu OCR phát hiện điểm < 0 hoặc > 10.
*   **Scenario 4: Nhận xét học sinh bằng GenAI (Map với F.R.7)**
    *   Kiểm tra sinh nhận xét dựa trên prompt engineering.
    *   Kiểm tra cơ chế **Fallback Logic** (sinh nhận xét dựa trên Rule-based) khi AI API không khả dụng.

### 2.2. Nhóm Scenarios cho Non-Functional Requirements (NFR)
*   **Scenario 5: Chịu tải hệ thống (Map với N.F.R.1 - Hiệu năng)**
    *   Mô phỏng 50 user đồng thời truy cập API Dashboard và API Nhận diện khuôn mặt. Đo lường Response Time (< 2s và < 4s tương ứng).
*   **Scenario 6: Độ chính xác của AI (Map với N.F.R.2 - Accuracy)**
    *   Đánh giá model InsightFace trên tập Dataset 50 ảnh. *Đặc biệt: Test các ảnh chụp từ góc cao mô phỏng camera CCTV (giải quyết câu hỏi phản biện của hội đồng).* Độ chính xác kỳ vọng > 95%.

---

## 3. Ứng dụng Kỹ thuật Black-Box để sinh Test Suites
Dưới đây là phương pháp áp dụng các kỹ thuật thiết kế test case hộp đen vào các Scenario cụ thể.

### 3.1. Kỹ thuật Phân vùng tương đương (Equivalence Partitioning) & Phân tích giá trị biên (Boundary Value Analysis)
*Áp dụng cho: Module Quản lý điểm số (Unit/Integration Test).*
*   **Input:** Điểm số (0 đến 10).
*   **Test Suite:**
    *   *Vùng hợp lệ (Valid):* Nhập điểm `5`, `7.5` -> PASS.
    *   *Giá trị biên hợp lệ (Boundary):* Nhập `0.0` và `10.0` -> PASS.
    *   *Vùng không hợp lệ (Invalid):* Nhập `-1`, `10.5` -> Báo lỗi chặn lưu.
    *   *Sai kiểu dữ liệu:* Nhập "Mười", `null` -> Báo lỗi Validation.

### 3.2. Kỹ thuật Đoán lỗi (Error Guessing) & Kiểm thử ngoại lệ
*Áp dụng cho: Module OCR (Integration Test/E2E).*
*   **Test Suite:**
    *   Gửi file ảnh đúng định dạng (.jpg, .png) -> PASS.
    *   Gửi file ảnh dung lượng quá lớn (> 5MB) -> Báo lỗi File Size.
    *   Gửi file PDF hoặc file thực thi (.exe) -> Báo lỗi Format.
    *   Gửi ảnh chụp... phong cảnh (không phải bảng điểm) -> Trả về mảng JSON rỗng hoặc lỗi OCR không nhận dạng được cấu trúc.

### 3.3. Kỹ thuật Bảng quyết định (Decision Table)
*Áp dụng cho: Module GenAI Feedback & Fallback (Integration Test).*
*   **Test Suite:**

| Điều kiện (Conditions) | TC 1 | TC 2 | TC 3 |
| :--- | :--- | :--- | :--- |
| Trạng thái Dịch vụ AI (Gemini) | Hoạt động | Timeout/500 | Hoạt động |
| Dữ liệu học sinh (Điểm, Chuyên cần) | Đầy đủ | Đầy đủ | Thiếu (Chưa có điểm) |
| **Kết quả kỳ vọng (Actions)** | | | |
| Sinh nhận xét bằng LLM | X | | |
| Kích hoạt Fallback Template (Rule-based)| | X | |
| Báo lỗi "Không đủ dữ liệu" | | | X |

---

## 4. Tài liệu Hướng dẫn cho AI Coding Agent (Document For Code Generation)

*(Ghi chú: Khi bạn mở dự án code thực tế lên, hãy copy/paste đoạn dưới đây cùng với file code của bạn vào prompt của AI Agent).*

> **Prompt Context for AI Agent:**
> 
> "I am working on the Capstone Project named SynapseS (Smart School Management System). The backend is built with FastAPI (Python) and frontend with React (Vite). We are implementing our Testing Strategy based on Risk-Based Testing.
> 
> I have designed the Test Plan above. Now, I need your help to execute **Integration Testing** for the Backend.
> 
> **Task 1:** 
> Please look at my `score_service.py` (which I will attach). Generate a `pytest` file using `@pytest.mark.parametrize` applying Boundary Value Analysis (0 to 10) to test the GPA calculation logic.
> 
> **Task 2:** 
> Please look at my `feedback_service.py`. Generate a `pytest` using `pytest-mock`. I want you to mock the `call_gemini_api` function to raise a `TimeoutError`. The test must assert that the system correctly catches this error and calls the `generate_fallback_template()` function instead, returning an HTTP 200 with the hardcoded text, proving our system's Reliability (NFR.4)."