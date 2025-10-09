# USE CASE DIAGRAM - HỆ THỐNG QUẢN LÝ TRƯỜNG HỌC THÔNG MINH (SMART SCHOOL)

## Mô tả tổng quan hệ thống
Hệ thống Smart School là một giải pháp quản lý trường học toàn diện với các tính năng:
- Quản lý học sinh, giáo viên, lớp học, môn học
- Điểm danh tự động sử dụng AI nhận dạng khuôn mặt (InsightFace - độ chính xác 95-99%)
- Quản lý điểm số học sinh
- Tạo nhận xét học sinh tự động bằng AI (Gemini)
- Quản lý cấu hình ngày học
- Dashboard và báo cáo thống kê

## Các Actor (Người dùng hệ thống)
1. **Admin (Quản trị viên)**: Quản lý toàn bộ hệ thống
2. **Teacher (Giáo viên bộ môn)**: Quản lý điểm số và giảng dạy
3. **Homeroom Teacher (Giáo viên chủ nhiệm)**: Quản lý lớp, học sinh và điểm danh
4. **System (Hệ thống)**: Các tác vụ tự động

---

## DANH SÁCH USE CASE THEO MODULE

### MODULE 1: XÁC THỰC VÀ PHÂN QUYỀN (AUTHENTICATION)

| Use-case ID | Use-case name | Actor | Mô tả |
|------------|---------------|-------|-------|
| UC-Auth-01 | Đăng nhập | User | Cho phép người dùng đăng nhập vào hệ thống |
| UC-Auth-02 | Đăng ký | User | Đăng ký tài khoản mới |
| UC-Auth-03 | Đăng xuất | User | Đăng xuất khỏi hệ thống |
| UC-Auth-04 | Đổi mật khẩu | User | Thay đổi mật khẩu người dùng |
| UC-Auth-05 | Làm mới token | User | Refresh access token khi hết hạn |
| UC-Auth-06 | Xem thông tin cá nhân | User | Xem thông tin người dùng hiện tại |

### MODULE 2: QUẢN LÝ HỌC SINH (STUDENT MANAGEMENT)

| Use-case ID | Use-case name | Actor | Mô tả |
|------------|---------------|-------|-------|
| UC-Student-01 | Tạo học sinh mới | Admin | Thêm học sinh mới vào hệ thống |
| UC-Student-02 | Xem danh sách học sinh | Admin, Teacher, Homeroom Teacher | Xem danh sách học sinh với filter và phân trang |
| UC-Student-03 | Xem chi tiết học sinh | Admin, Teacher, Homeroom Teacher | Xem thông tin chi tiết của một học sinh |
| UC-Student-04 | Cập nhật thông tin học sinh | Admin, Homeroom Teacher | Chỉnh sửa thông tin học sinh |
| UC-Student-05 | Xóa học sinh | Admin | Xóa học sinh (soft delete) |
| UC-Student-06 | Upload ảnh đại diện | Admin, Homeroom Teacher | Tải lên ảnh đại diện cho học sinh |
| UC-Student-07 | Xem thống kê học sinh | Admin | Xem thống kê tổng quan về học sinh |

### MODULE 3: NHẬN DẠNG KHUÔN MẶT AI (FACE RECOGNITION)

| Use-case ID | Use-case name | Actor | Mô tả |
|------------|---------------|-------|-------|
| UC-AI-01 | Đăng ký khuôn mặt học sinh | Admin, Homeroom Teacher | Đăng ký khuôn mặt cho học sinh (1 ảnh) |
| UC-AI-02 | Đăng ký nhiều khuôn mặt | Admin, Homeroom Teacher | Đăng ký nhiều ảnh khuôn mặt (tối đa 10 ảnh) |
| UC-AI-03 | Nhận dạng khuôn mặt | System, User | Nhận dạng khuôn mặt từ ảnh |
| UC-AI-04 | Xóa encoding khuôn mặt | Admin, Homeroom Teacher | Xóa dữ liệu khuôn mặt đã đăng ký |
| UC-AI-05 | Reload AI models | Admin | Tải lại models AI từ database |
| UC-AI-06 | Xem trạng thái AI | Admin | Kiểm tra trạng thái dịch vụ AI |
| UC-AI-07 | Điểm danh liên tục | System | Điểm danh tự động qua camera (WebSocket) |
| UC-AI-08 | Điều khiển điểm danh liên tục | Admin, Homeroom Teacher | Bật/tắt chế độ điểm danh liên tục |
| UC-AI-09 | Đếm khuôn mặt | User | Đếm số lượng khuôn mặt trong ảnh |

### MODULE 4: QUẢN LÝ ĐIỂM DANH (ATTENDANCE)

| Use-case ID | Use-case name | Actor | Mô tả |
|------------|---------------|-------|-------|
| UC-Attend-01 | Điểm danh vào | System, Homeroom Teacher | Ghi nhận giờ vào của học sinh |
| UC-Attend-02 | Điểm danh ra | System, Homeroom Teacher | Ghi nhận giờ ra của học sinh |
| UC-Attend-03 | Xem danh sách điểm danh | Admin, Homeroom Teacher | Xem lịch sử điểm danh với filter |
| UC-Attend-04 | Xem điểm danh theo học sinh | Admin, Homeroom Teacher | Xem lịch sử điểm danh của 1 học sinh |
| UC-Attend-05 | Xem điểm danh hôm nay | Admin, Homeroom Teacher | Xem điểm danh trong ngày |
| UC-Attend-06 | Xem thống kê điểm danh | Admin, Homeroom Teacher | Xem thống kê tỷ lệ điểm danh |
| UC-Attend-07 | Cập nhật điểm danh | Admin, Homeroom Teacher | Chỉnh sửa bản ghi điểm danh |
| UC-Attend-08 | Xóa bản ghi điểm danh | Admin | Xóa bản ghi điểm danh |
| UC-Attend-09 | Tính lại trạng thái | Admin, System | Tính lại trạng thái muộn/đúng giờ |
| UC-Attend-10 | Cập nhật trạng thái | Admin, Homeroom Teacher | Cập nhật trạng thái và ghi chú |
| UC-Attend-11 | Xem danh sách đầy đủ | Homeroom Teacher | Xem tất cả học sinh kể cả chưa điểm danh |

### MODULE 5: GIÁO VIÊN CHỦ NHIỆM (HOMEROOM TEACHER)

| Use-case ID | Use-case name | Actor | Mô tả |
|------------|---------------|-------|-------|
| UC-Homeroom-01 | Xem thông tin lớp chủ nhiệm | Homeroom Teacher | Xem thông tin các lớp được phân công |
| UC-Homeroom-02 | Xem học sinh lớp chủ nhiệm | Homeroom Teacher | Xem danh sách học sinh trong lớp |
| UC-Homeroom-03 | Cập nhật face encoding | Homeroom Teacher | Cập nhật dữ liệu khuôn mặt học sinh |
| UC-Homeroom-04 | Xem thống kê điểm danh lớp | Homeroom Teacher | Xem thống kê điểm danh của lớp |
| UC-Homeroom-05 | Xem chi tiết điểm danh lớp | Homeroom Teacher | Xem chi tiết điểm danh từng học sinh |
| UC-Homeroom-06 | Điểm danh thủ công | Homeroom Teacher | Tạo/cập nhật điểm danh thủ công |
| UC-Homeroom-07 | Xem recognition logs | Homeroom Teacher | Xem lịch sử nhận dạng khuôn mặt |

### MODULE 6: QUẢN LÝ ĐIỂM SỐ (GRADES MANAGEMENT)

| Use-case ID | Use-case name | Actor | Mô tả |
|------------|---------------|-------|-------|
| UC-Grade-01 | Xem thông tin giáo viên | Teacher | Xem lớp/môn được phân công |
| UC-Grade-02 | Xem học sinh theo lớp-môn | Teacher | Xem danh sách học sinh của lớp-môn |
| UC-Grade-03 | Tạo cấu hình cột điểm | Teacher | Tạo cấu hình điểm cho môn học |
| UC-Grade-04 | Xem cấu hình cột điểm | Teacher | Xem cấu hình điểm |
| UC-Grade-05 | Cập nhật cấu hình điểm | Teacher | Chỉnh sửa cấu hình điểm |
| UC-Grade-06 | Nhập/cập nhật điểm | Teacher | Nhập điểm cho học sinh |
| UC-Grade-07 | Xem điểm học sinh | Teacher, Admin | Xem điểm của học sinh |
| UC-Grade-08 | Xóa điểm | Teacher | Xóa bản ghi điểm |
| UC-Grade-09 | Xem danh sách môn học | Teacher | Xem tất cả môn học |

### MODULE 7: NHẬN XÉT TỰ ĐỘNG AI (AI FEEDBACK - GEMINI)

| Use-case ID | Use-case name | Actor | Mô tả |
|------------|---------------|-------|-------|
| UC-Feedback-01 | Tạo nhận xét học sinh | Teacher, Homeroom Teacher | Tạo nhận xét cho 1 học sinh bằng AI |
| UC-Feedback-02 | Tạo nhận xét hàng loạt | Teacher, Homeroom Teacher | Tạo nhận xét cho nhiều học sinh |
| UC-Feedback-03 | Gửi SMS nhận xét | Teacher, Homeroom Teacher | Gửi nhận xét qua SMS cho phụ huynh |
| UC-Feedback-04 | Kiểm tra AI Feedback | Admin | Kiểm tra trạng thái dịch vụ AI Feedback |

### MODULE 8: CẤU HÌNH NGÀY HỌC (SCHOOL DAYS CONFIG)

| Use-case ID | Use-case name | Actor | Mô tả |
|------------|---------------|-------|-------|
| UC-Config-01 | Khởi tạo cấu hình | Admin | Khởi tạo cấu hình ngày học cho các khối |
| UC-Config-02 | Xem cấu hình ngày học | Admin | Xem cấu hình ngày học |
| UC-Config-03 | Tạo cấu hình mới | Admin | Tạo cấu hình cho khối mới |
| UC-Config-04 | Cập nhật cấu hình | Admin | Chỉnh sửa cấu hình ngày học |
| UC-Config-05 | Cập nhật hàng loạt | Admin | Cập nhật cấu hình nhiều khối cùng lúc |
| UC-Config-06 | Áp dụng cấu hình tạm thời | Admin | Áp dụng số ngày học tạm thời cho tuần |
| UC-Config-07 | Reset về mặc định | System, Admin | Reset về cấu hình mặc định (Chủ nhật) |

### MODULE 9: QUẢN TRỊ HỆ THỐNG (ADMIN OPERATIONS)

| Use-case ID | Use-case name | Actor | Mô tả |
|------------|---------------|-------|-------|
| UC-Admin-01 | Quản lý người dùng | Admin | CRUD người dùng hệ thống |
| UC-Admin-02 | Quản lý giáo viên | Admin | CRUD thông tin giáo viên |
| UC-Admin-03 | Quản lý môn học | Admin | CRUD môn học |
| UC-Admin-04 | Quản lý lớp học | Admin | CRUD lớp học |
| UC-Admin-05 | Phân công giáo viên-môn | Admin | CRUD phân công giáo viên dạy môn |
| UC-Admin-06 | Phân công lớp-môn | Admin | CRUD phân công môn học cho lớp |

---

# MÔ TẢ CHI TIẾT CÁC USE CASE

## MODULE 1: XÁC THỰC VÀ PHÂN QUYỀN

### UC-Auth-01: Đăng nhập

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Đăng nhập |
| **Use-case ID** | UC-Auth-01 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Cho phép người dùng đăng nhập vào hệ thống. |
| **Actor** | User (Admin, Teacher, Homeroom Teacher) |
| **Trigger** | Người dùng muốn đăng nhập vào hệ thống. |
| **Pre-condition** | Người dùng đã có tài khoản trong hệ thống. |
| **Post-condition** | Người dùng đăng nhập thành công vào hệ thống. Nếu người dùng đổi mật khẩu, mật khẩu mới được cập nhật thành công. |
| **Normal flow** | 1. Người dùng truy cập vào trang đăng nhập của hệ thống.<br>2. Người dùng nhập tên đăng nhập (email) và mật khẩu vào các trường tương ứng.<br>3. Người dùng bấm nút "Đăng nhập".<br>4. Hệ thống xác thực thông tin đăng nhập:<br>   • Nếu email và mật khẩu hợp lệ, hệ thống tạo access token và refresh token, chuyển đến trang chính của hệ thống.<br>   • Nếu email hoặc mật khẩu không hợp lệ, hệ thống hiển thị thông báo lỗi và yêu cầu người dùng nhập lại thông tin. |
| **Alternative flow** | Tại bước 4: Tài khoản bị vô hiệu hóa, hệ thống hiển thị thông báo "Tài khoản đã bị vô hiệu hóa". |
| **Exception** | Lỗi kết nối server, hệ thống hiển thị thông báo lỗi. |

### UC-Auth-02: Đăng ký

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Đăng ký |
| **Use-case ID** | UC-Auth-02 |
| **Created by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Description** | Đăng ký tài khoản mới vào hệ thống. |
| **Actor** | User |
| **Trigger** | Người dùng muốn tạo tài khoản mới. |
| **Pre-condition** | Người dùng chưa có tài khoản trong hệ thống. |
| **Post-condition** | Tài khoản mới được tạo thành công. |
| **Normal flow** | 1. Người dùng truy cập vào trang đăng ký.<br>2. Người dùng nhập email, password, full_name và role.<br>3. Hệ thống kiểm tra email đã tồn tại chưa.<br>4. Hệ thống hash password và tạo user mới.<br>5. Hệ thống trả về thông tin user đã tạo. |
| **Alternative flow** | Tại bước 3: Email đã được sử dụng, hệ thống hiển thị lỗi "Email đã được sử dụng". |
| **Exception** | Lỗi server khi tạo user. |

### UC-Auth-03: Đăng xuất

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Đăng xuất |
| **Use-case ID** | UC-Auth-03 |
| **Created at** | 09/10/2025 |
| **Description** | Đăng xuất khỏi hệ thống. |
| **Actor** | User (đã đăng nhập) |
| **Trigger** | Người dùng muốn đăng xuất. |
| **Pre-condition** | Người dùng đã đăng nhập vào hệ thống. |
| **Post-condition** | Người dùng đã đăng xuất, token bị xóa ở client. |
| **Normal flow** | 1. Người dùng bấm nút "Đăng xuất".<br>2. Client xóa access token và refresh token.<br>3. Hệ thống trả về thông báo "Đăng xuất thành công".<br>4. Chuyển về trang đăng nhập. |
| **Alternative flow** | Không có. |
| **Exception** | Không có ngoại lệ được ghi nhận. |

### UC-Auth-04: Đổi mật khẩu

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Đổi mật khẩu |
| **Use-case ID** | UC-Auth-04 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Thay đổi mật khẩu người dùng. |
| **Actor** | User (đã đăng nhập) |
| **Trigger** | Người dùng muốn đổi mật khẩu. |
| **Pre-condition** | Người dùng đã đăng nhập vào hệ thống. |
| **Post-condition** | Mật khẩu mới được cập nhật thành công. |
| **Normal flow** | 1. Người dùng truy cập chức năng "Đổi mật khẩu".<br>2. Nhập mật khẩu hiện tại và mật khẩu mới.<br>3. Hệ thống xác thực mật khẩu hiện tại.<br>4. Hệ thống hash mật khẩu mới và cập nhật vào database.<br>5. Trả về thông báo "Đổi mật khẩu thành công". |
| **Alternative flow** | Tại bước 3: Mật khẩu hiện tại không đúng, hiển thị lỗi "Password hiện tại không đúng". |
| **Exception** | Lỗi cập nhật database. |

### UC-Auth-05: Làm mới token

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Làm mới token |
| **Use-case ID** | UC-Auth-05 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Refresh access token khi token hiện tại hết hạn sử dụng refresh token. |
| **Actor** | User (đã đăng nhập) |
| **Trigger** | Access token hết hạn và cần gia hạn. |
| **Pre-condition** | Người dùng có refresh token hợp lệ. |
| **Post-condition** | Access token mới được tạo và trả về cho client. |
| **Normal flow** | 1. Client phát hiện access token sắp hết hạn hoặc đã hết hạn.<br>2. Client gửi refresh token lên server.<br>3. Hệ thống xác thực refresh token:<br>   • Kiểm tra token type phải là "refresh"<br>   • Kiểm tra token chưa hết hạn<br>   • Lấy thông tin user từ token<br>4. Hệ thống tạo access token mới với thời gian hết hạn mới (15 phút).<br>5. Trả về access token mới cho client.<br>6. Client lưu token mới và tiếp tục sử dụng. |
| **Alternative flow** | Tại bước 3: Refresh token hết hạn hoặc không hợp lệ, yêu cầu người dùng đăng nhập lại. |
| **Exception** | Lỗi xác thực token, lỗi tạo token mới. |

### UC-Auth-06: Xem thông tin cá nhân

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xem thông tin cá nhân |
| **Use-case ID** | UC-Auth-06 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Xem thông tin người dùng hiện tại đang đăng nhập. |
| **Actor** | User (Admin, Teacher, Homeroom Teacher) |
| **Trigger** | Người dùng muốn xem thông tin cá nhân. |
| **Pre-condition** | Người dùng đã đăng nhập vào hệ thống. |
| **Post-condition** | Thông tin người dùng được hiển thị. |
| **Normal flow** | 1. Người dùng truy cập vào trang "Thông tin cá nhân".<br>2. Hệ thống giải mã access token để lấy thông tin user.<br>3. Truy vấn database để lấy thông tin đầy đủ của user:<br>   • ID, email, full_name<br>   • Role (admin/teacher/homeroom_teacher)<br>   • is_active, last_login<br>   • created_at, updated_at<br>4. Loại bỏ password_hash khỏi response.<br>5. Hiển thị thông tin người dùng. |
| **Alternative flow** | Không có. |
| **Exception** | Token không hợp lệ, user không tồn tại trong database. |

---

## MODULE 2: QUẢN LÝ HỌC SINH

### UC-Student-01: Tạo học sinh mới

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Tạo học sinh mới |
| **Use-case ID** | UC-Student-01 |
| **Created at** | 09/10/2025 |
| **Description** | Thêm học sinh mới vào hệ thống. |
| **Actor** | Admin |
| **Trigger** | Admin muốn thêm học sinh mới. |
| **Pre-condition** | Admin đã đăng nhập với quyền admin. |
| **Post-condition** | Học sinh mới được tạo thành công trong hệ thống. |
| **Normal flow** | 1. Admin truy cập trang "Quản lý học sinh".<br>2. Admin bấm nút "Thêm học sinh mới".<br>3. Nhập thông tin học sinh: student_id, full_name, email, phone, class_name, grade, date_of_birth, address, parent_name, parent_phone.<br>4. Hệ thống kiểm tra student_id đã tồn tại chưa.<br>5. Hệ thống tạo record mới trong database.<br>6. Hiển thị thông báo "Tạo học sinh thành công". |
| **Alternative flow** | Tại bước 4: Mã học sinh đã tồn tại, hiển thị lỗi "Mã học sinh đã tồn tại". |
| **Exception** | Lỗi tạo học sinh trong database. |

### UC-Student-02: Xem danh sách học sinh

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xem danh sách học sinh |
| **Use-case ID** | UC-Student-02 |
| **Created at** | 09/10/2025 |
| **Description** | Xem danh sách học sinh với filter và phân trang. |
| **Actor** | Admin, Teacher, Homeroom Teacher |
| **Trigger** | Người dùng muốn xem danh sách học sinh. |
| **Pre-condition** | Người dùng đã đăng nhập. |
| **Post-condition** | Hiển thị danh sách học sinh theo quyền truy cập. |
| **Normal flow** | 1. Người dùng truy cập trang "Danh sách học sinh".<br>2. Hệ thống kiểm tra role của người dùng:<br>   • Admin: Xem tất cả học sinh<br>   • Teacher: Xem học sinh của các lớp được phân công<br>   • Homeroom Teacher: Xem học sinh lớp chủ nhiệm<br>3. Người dùng có thể filter theo: search, class_name, grade, is_active.<br>4. Hệ thống trả về danh sách học sinh với phân trang. |
| **Alternative flow** | Không có học sinh nào, hiển thị danh sách rỗng. |
| **Exception** | Lỗi truy vấn database. |

### UC-Student-03: Xem chi tiết học sinh

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xem chi tiết học sinh |
| **Use-case ID** | UC-Student-03 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Xem thông tin chi tiết đầy đủ của một học sinh cụ thể. |
| **Actor** | Admin, Teacher, Homeroom Teacher |
| **Trigger** | Người dùng click vào một học sinh để xem chi tiết. |
| **Pre-condition** | Người dùng đã đăng nhập và có quyền xem học sinh đó. |
| **Post-condition** | Thông tin chi tiết học sinh được hiển thị. |
| **Normal flow** | 1. Người dùng chọn một học sinh từ danh sách.<br>2. Hệ thống truy vấn database với student_id.<br>3. Lấy tất cả thông tin học sinh:<br>   • Thông tin cá nhân: student_id, full_name, date_of_birth, email, phone, address<br>   • Thông tin lớp: class_name, grade<br>   • Thông tin phụ huynh: parent_name, parent_phone<br>   • Thông tin khác: profile_image, is_active, face_encoding status<br>   • Thông tin hệ thống: created_at, updated_at<br>4. Hiển thị đầy đủ thông tin học sinh. |
| **Alternative flow** | Học sinh không tồn tại, hiển thị lỗi "Không tìm thấy học sinh". |
| **Exception** | Lỗi truy vấn database, người dùng không có quyền xem. |

### UC-Student-04: Cập nhật thông tin học sinh

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Cập nhật thông tin học sinh |
| **Use-case ID** | UC-Student-04 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Chỉnh sửa và cập nhật thông tin của học sinh. |
| **Actor** | Admin, Homeroom Teacher |
| **Trigger** | Người dùng muốn cập nhật thông tin học sinh. |
| **Pre-condition** | Học sinh đã tồn tại trong hệ thống, người dùng có quyền cập nhật. |
| **Post-condition** | Thông tin học sinh được cập nhật thành công. |
| **Normal flow** | 1. Người dùng truy cập vào trang chỉnh sửa thông tin học sinh.<br>2. Hệ thống hiển thị form với thông tin hiện tại của học sinh.<br>3. Người dùng chỉnh sửa các trường cần thiết:<br>   • full_name, email, phone<br>   • class_name, grade<br>   • date_of_birth, address<br>   • parent_name, parent_phone<br>   • is_active<br>4. Người dùng bấm nút "Cập nhật".<br>5. Hệ thống validate dữ liệu đầu vào.<br>6. Cập nhật thông tin vào database với updated_at = now().<br>7. Hiển thị thông báo "Cập nhật học sinh thành công". |
| **Alternative flow** | Tại bước 5: Dữ liệu không hợp lệ (email sai format, phone không đúng), hiển thị lỗi validation. |
| **Exception** | Lỗi cập nhật database, học sinh không tồn tại. |

### UC-Student-05: Xóa học sinh

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xóa học sinh |
| **Use-case ID** | UC-Student-05 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Xóa học sinh khỏi hệ thống (soft delete - chỉ set is_active = false). |
| **Actor** | Admin |
| **Trigger** | Admin muốn xóa học sinh khỏi hệ thống. |
| **Pre-condition** | Học sinh đã tồn tại trong hệ thống, admin đã đăng nhập. |
| **Post-condition** | Học sinh bị đánh dấu là không active (is_active = false). |
| **Normal flow** | 1. Admin chọn học sinh cần xóa.<br>2. Hệ thống hiển thị dialog xác nhận:<br>   • "Bạn có chắc chắn muốn xóa học sinh này?"<br>   • Hiển thị thông tin học sinh: student_id, full_name, class_name<br>3. Admin xác nhận xóa.<br>4. Hệ thống thực hiện soft delete:<br>   • Set is_active = false<br>   • Set updated_at = now()<br>   • Không xóa record khỏi database<br>5. Hiển thị thông báo "Xóa học sinh thành công".<br>6. Cập nhật danh sách học sinh (học sinh bị xóa không hiển thị). |
| **Alternative flow** | Tại bước 3: Admin hủy bỏ, không thực hiện xóa. |
| **Exception** | Lỗi cập nhật database, học sinh không tồn tại. |

### UC-Student-06: Upload ảnh đại diện

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Upload ảnh đại diện |
| **Use-case ID** | UC-Student-06 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Tải lên ảnh đại diện cho học sinh. |
| **Actor** | Admin, Homeroom Teacher |
| **Trigger** | Người dùng muốn upload ảnh cho học sinh. |
| **Pre-condition** | Học sinh đã tồn tại trong hệ thống. |
| **Post-condition** | Ảnh đại diện được lưu và cập nhật vào profile học sinh. |
| **Normal flow** | 1. Người dùng chọn học sinh cần upload ảnh.<br>2. Click vào nút "Upload ảnh đại diện".<br>3. Chọn file ảnh từ thiết bị.<br>4. Hệ thống validate file:<br>   • Kiểm tra content_type phải là image/*<br>   • Kiểm tra kích thước file (tối đa 5MB)<br>5. Tạo tên file unique: student_{id}_{timestamp}.{ext}<br>6. Lưu file vào thư mục uploads/students/<br>7. Cập nhật trường profile_image trong database.<br>8. Hiển thị "Upload ảnh thành công" và preview ảnh mới. |
| **Alternative flow** | Tại bước 4: File không phải hình ảnh hoặc quá lớn, hiển thị lỗi tương ứng. |
| **Exception** | Lỗi lưu file, lỗi cập nhật database, xóa file nếu update DB thất bại. |

### UC-Student-07: Xem thống kê học sinh

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xem thống kê học sinh |
| **Use-case ID** | UC-Student-07 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Xem thống kê tổng quan về học sinh trong hệ thống. |
| **Actor** | Admin |
| **Trigger** | Admin muốn xem báo cáo thống kê học sinh. |
| **Pre-condition** | Admin đã đăng nhập. |
| **Post-condition** | Thống kê học sinh được hiển thị. |
| **Normal flow** | 1. Admin truy cập vào trang "Thống kê học sinh".<br>2. Hệ thống truy vấn và tính toán các chỉ số:<br>   • total_students: Tổng số học sinh<br>   • active_students: Số học sinh đang active<br>   • inactive_students: Số học sinh đã ngừng học<br>   • encoded_students: Số học sinh đã đăng ký khuôn mặt<br>   • encoding_rate: Tỷ lệ % học sinh đã đăng ký khuôn mặt<br>3. Thống kê theo khối:<br>   • Số học sinh mỗi khối 10, 11, 12<br>   • Tỷ lệ phân bố theo khối<br>4. Thống kê theo lớp:<br>   • Số lớp, số học sinh mỗi lớp<br>5. Hiển thị thống kê dưới dạng biểu đồ và số liệu. |
| **Alternative flow** | Không có học sinh, hiển thị thống kê = 0. |
| **Exception** | Lỗi truy vấn database. |

---

## MODULE 3: NHẬN DẠNG KHUÔN MẶT AI

### UC-AI-01: Đăng ký khuôn mặt học sinh

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Đăng ký khuôn mặt học sinh |
| **Use-case ID** | UC-AI-01 |
| **Created at** | 09/10/2025 |
| **Description** | Đăng ký khuôn mặt cho học sinh sử dụng InsightFace AI. |
| **Actor** | Admin, Homeroom Teacher |
| **Trigger** | Người dùng muốn đăng ký khuôn mặt cho học sinh. |
| **Pre-condition** | Học sinh đã tồn tại trong hệ thống. |
| **Post-condition** | Face encoding được lưu vào hệ thống và database. |
| **Normal flow** | 1. Người dùng chọn học sinh cần đăng ký.<br>2. Upload ảnh khuôn mặt (file hoặc base64).<br>3. Hệ thống sử dụng InsightFace để detect và extract embedding.<br>4. Lưu embedding vào face_database (memory) và database (insightface_encoding).<br>5. Hiển thị "Đăng ký khuôn mặt thành công". |
| **Alternative flow** | Tại bước 3: Không phát hiện khuôn mặt, hiển thị lỗi "Không tìm thấy khuôn mặt trong ảnh". |
| **Exception** | Lỗi AI service hoặc lưu database. |

### UC-AI-02: Đăng ký nhiều khuôn mặt

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Đăng ký nhiều khuôn mặt |
| **Use-case ID** | UC-AI-02 |
| **Created at** | 09/10/2025 |
| **Description** | Đăng ký nhiều ảnh khuôn mặt cho học sinh (tối đa 10 ảnh) để tăng độ chính xác. |
| **Actor** | Admin, Homeroom Teacher |
| **Trigger** | Người dùng muốn đăng ký nhiều góc ảnh/biểu cảm cho học sinh. |
| **Pre-condition** | Học sinh đã tồn tại. |
| **Post-condition** | Nhiều face encodings được lưu, tăng độ chính xác nhận dạng. |
| **Normal flow** | 1. Người dùng chọn học sinh.<br>2. Upload nhiều ảnh (tối đa 10).<br>3. Hệ thống xử lý từng ảnh, extract embeddings.<br>4. Lưu tất cả embeddings vào database.<br>5. Đồng bộ lên database một lần.<br>6. Hiển thị kết quả "Đăng ký thành công X/Y ảnh". |
| **Alternative flow** | Vượt quá 10 ảnh, hiển thị lỗi "Tối đa 10 ảnh mỗi lần". |
| **Exception** | Một số ảnh lỗi, hiển thị chi tiết ảnh nào lỗi. |

### UC-AI-03: Nhận dạng khuôn mặt

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Nhận dạng khuôn mặt |
| **Use-case ID** | UC-AI-03 |
| **Created at** | 09/10/2025 |
| **Description** | Nhận dạng khuôn mặt từ ảnh sử dụng InsightFace (độ chính xác 95-99%). |
| **Actor** | System, User |
| **Trigger** | Upload ảnh hoặc camera stream để nhận dạng. |
| **Pre-condition** | Đã có học sinh đăng ký khuôn mặt trong hệ thống. |
| **Post-condition** | Trả về thông tin học sinh được nhận dạng (nếu có). |
| **Normal flow** | 1. Người dùng upload ảnh hoặc gửi frame từ camera.<br>2. Hệ thống detect khuôn mặt trong ảnh.<br>3. Extract embedding sử dụng InsightFace.<br>4. So sánh với database embeddings (cosine similarity).<br>5. Nếu similarity > threshold (0.20), trả về thông tin học sinh.<br>6. Hiển thị kết quả nhận dạng với confidence score. |
| **Alternative flow** | Không tìm thấy khuôn mặt đã đăng ký, trả về "Không tìm thấy khuôn mặt trong hệ thống". |
| **Exception** | Lỗi AI service. |

### UC-AI-04: Xóa encoding khuôn mặt

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xóa encoding khuôn mặt |
| **Use-case ID** | UC-AI-04 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Xóa dữ liệu khuôn mặt đã đăng ký của học sinh khỏi hệ thống. |
| **Actor** | Admin, Homeroom Teacher |
| **Trigger** | Người dùng muốn xóa dữ liệu khuôn mặt của học sinh (để đăng ký lại hoặc xóa hoàn toàn). |
| **Pre-condition** | Học sinh đã có face encoding trong hệ thống. |
| **Post-condition** | Face encoding bị xóa khỏi memory và database. |
| **Normal flow** | 1. Người dùng chọn học sinh cần xóa face encoding.<br>2. Click nút "Xóa dữ liệu khuôn mặt".<br>3. Hệ thống hiển thị dialog xác nhận:<br>   • "Bạn có chắc chắn muốn xóa dữ liệu khuôn mặt?"<br>   • "Học sinh sẽ không thể được nhận dạng tự động cho đến khi đăng ký lại."<br>4. Người dùng xác nhận.<br>5. Hệ thống xóa face encoding:<br>   • Xóa từ face_database trong memory<br>   • Set insightface_encoding = NULL trong database<br>   • Set face_samples_count = 0<br>   • Update updated_at = now()<br>6. Hiển thị "Xóa dữ liệu khuôn mặt thành công". |
| **Alternative flow** | Tại bước 4: Người dùng hủy bỏ, không thực hiện xóa. |
| **Exception** | Lỗi xóa khỏi database, học sinh không có encoding. |

### UC-AI-05: Reload AI models

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Reload AI models |
| **Use-case ID** | UC-AI-05 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Tải lại toàn bộ face encodings từ database vào memory (dùng khi có thay đổi dữ liệu). |
| **Actor** | Admin |
| **Trigger** | Admin muốn đồng bộ lại dữ liệu khuôn mặt từ database. |
| **Pre-condition** | Admin đã đăng nhập, có dữ liệu trong database. |
| **Post-condition** | Face database trong memory được cập nhật với dữ liệu mới nhất từ database. |
| **Normal flow** | 1. Admin truy cập vào trang "Quản lý AI".<br>2. Click nút "Reload Models".<br>3. Hệ thống xóa toàn bộ face_database hiện tại trong memory.<br>4. Truy vấn database để lấy tất cả insightface_encoding:<br>   • SELECT id, insightface_encoding, face_samples_count FROM students WHERE insightface_encoding IS NOT NULL<br>5. Parse JSON encodings và load vào memory.<br>6. Đếm số lượng:<br>   • face_count: Số học sinh có encoding<br>   • total_samples: Tổng số mẫu encoding<br>7. Hiển thị "Đã reload X khuôn mặt với Y mẫu từ database". |
| **Alternative flow** | Database không có encoding nào, face_database = empty. |
| **Exception** | Lỗi parse JSON, lỗi load vào memory. |

### UC-AI-06: Xem trạng thái AI

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xem trạng thái AI service |
| **Use-case ID** | UC-AI-06 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Kiểm tra trạng thái hoạt động của dịch vụ AI nhận dạng khuôn mặt. |
| **Actor** | Admin |
| **Trigger** | Admin muốn kiểm tra AI service có hoạt động bình thường không. |
| **Pre-condition** | Admin đã đăng nhập. |
| **Post-condition** | Thông tin trạng thái AI được hiển thị. |
| **Normal flow** | 1. Admin truy cập trang "Trạng thái AI".<br>2. Hệ thống thu thập thông tin:<br>   • service_name: "InsightFace (ArcFace)"<br>   • accuracy: "95-99%"<br>   • service_status: "active" hoặc "inactive"<br>   • local_ai_encodings: Số encoding trong memory<br>   • database_encodings: Số encoding trong database<br>   • sync_status: "synced", "out_of_sync", "database_only", "local_only"<br>   • registered_students: Danh sách student_ids đã đăng ký<br>   • similarity_threshold: Ngưỡng nhận dạng hiện tại (0.20)<br>   • detection_size: Kích thước ảnh để detect (640x640)<br>3. Hiển thị dashboard với tất cả thông tin trên.<br>4. Hiển thị status indicators (màu xanh/đỏ). |
| **Alternative flow** | AI service không hoạt động, hiển thị status = "inactive" với màu đỏ. |
| **Exception** | Lỗi kết nối đến AI service. |

### UC-AI-07: Điểm danh liên tục

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Điểm danh liên tục qua WebSocket |
| **Use-case ID** | UC-AI-07 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Điểm danh tự động liên tục qua camera sử dụng WebSocket. |
| **Actor** | System, Homeroom Teacher |
| **Trigger** | Bật chế độ điểm danh liên tục. |
| **Pre-condition** | AI service đang hoạt động, có camera. |
| **Post-condition** | Tự động tạo attendance records khi nhận dạng học sinh. |
| **Normal flow** | 1. Client kết nối WebSocket tới /api/ai/recognition/stream.<br>2. Gửi lệnh {"type": "control", "command": "start"}.<br>3. Client gửi frames từ camera dạng base64 liên tục.<br>4. Server nhận dạng khuôn mặt trong từng frame:<br>   • Detect faces sử dụng InsightFace<br>   • Extract embeddings<br>   • So sánh với database (cosine similarity)<br>5. Nếu nhận dạng thành công (similarity > 0.20):<br>   • Kiểm tra cooldown (30s từ lần nhận dạng cuối)<br>   • Nếu hết cooldown: Tự động tạo attendance record<br>   • Gửi kết quả về client qua WebSocket<br>6. Lặp lại cho đến khi nhận lệnh "stop".<br>7. Client gửi {"type": "control", "command": "stop"} để dừng. |
| **Alternative flow** | Student vẫn trong cooldown period, bỏ qua không tạo attendance nhưng vẫn hiển thị recognized. |
| **Exception** | WebSocket disconnect, tự động dừng stream. Camera lỗi, hiển thị thông báo. |

### UC-AI-08: Điều khiển điểm danh liên tục

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Điều khiển điểm danh liên tục |
| **Use-case ID** | UC-AI-08 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Bật/tắt chế độ điểm danh liên tục và cấu hình tham số. |
| **Actor** | Admin, Homeroom Teacher |
| **Trigger** | Người dùng muốn bật/tắt hoặc cấu hình điểm danh liên tục. |
| **Pre-condition** | Người dùng đã đăng nhập. |
| **Post-condition** | Trạng thái điểm danh liên tục được cập nhật. |
| **Normal flow** | 1. Người dùng truy cập trang "Điểm danh AI".<br>2. Hiển thị trạng thái hiện tại:<br>   • is_running: true/false<br>   • active_connections: Số WebSocket đang kết nối<br>   • cooldown_period: Thời gian chờ giữa 2 lần nhận dạng (30s)<br>   • total_recognized_today: Số lần nhận dạng hôm nay<br>3. Người dùng có thể thực hiện:<br>   • **Start**: Bật chế độ continuous recognition<br>   • **Stop**: Tắt chế độ continuous recognition<br>   • **Reset**: Reset cooldown của tất cả học sinh<br>   • **Update Settings**: Thay đổi cooldown_period (5-300s)<br>4. Hệ thống cập nhật trạng thái global.<br>5. Thông báo cho tất cả WebSocket clients đang kết nối.<br>6. Hiển thị thông báo thành công. |
| **Alternative flow** | Không có. |
| **Exception** | Lỗi cập nhật trạng thái, không có WebSocket connection nào. |

### UC-AI-09: Đếm khuôn mặt

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Đếm khuôn mặt trong ảnh |
| **Use-case ID** | UC-AI-09 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Đếm số lượng khuôn mặt có trong một ảnh (dùng để validate ảnh trước khi đăng ký). |
| **Actor** | User (Admin, Homeroom Teacher) |
| **Trigger** | Người dùng upload ảnh và muốn kiểm tra số khuôn mặt. |
| **Pre-condition** | Có ảnh cần kiểm tra. |
| **Post-condition** | Trả về số lượng khuôn mặt phát hiện được. |
| **Normal flow** | 1. Người dùng upload ảnh hoặc gửi base64 image.<br>2. Hệ thống sử dụng InsightFace để detect faces:<br>   • Convert base64 to image array<br>   • Apply face detection<br>   • Đếm số bounding boxes<br>3. Trả về kết quả:<br>   • face_count: Số khuôn mặt phát hiện<br>   • message: "Phát hiện X khuôn mặt"<br>4. Hiển thị kết quả cho người dùng:<br>   • Nếu count = 0: "Không phát hiện khuôn mặt nào"<br>   • Nếu count = 1: "Phát hiện 1 khuôn mặt - phù hợp để đăng ký"<br>   • Nếu count > 1: "Phát hiện nhiều khuôn mặt - khuyến nghị chỉ 1 người trong ảnh" |
| **Alternative flow** | Không phát hiện khuôn mặt nào, trả về count = 0. |
| **Exception** | Lỗi xử lý ảnh, lỗi AI service. |

---

## MODULE 4: QUẢN LÝ ĐIỂM DANH

### UC-Attend-01: Điểm danh vào

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Điểm danh vào (Check-in) |
| **Use-case ID** | UC-Attend-01 |
| **Created at** | 09/10/2025 |
| **Description** | Ghi nhận giờ vào của học sinh sử dụng database function. |
| **Actor** | System (AI), Homeroom Teacher (manual) |
| **Trigger** | Học sinh được nhận dạng bởi AI hoặc điểm danh thủ công. |
| **Pre-condition** | Học sinh tồn tại trong hệ thống. |
| **Post-condition** | Attendance record được tạo với check_in_time và status (present/late). |
| **Normal flow** | 1. Nhận thông tin điểm danh: student_id, confidence_score, method.<br>2. Gọi database function process_attendance_checkin với:<br>   • p_student_id<br>   • p_date (Vietnam timezone)<br>   • p_checkin_time (actual time)<br>   • p_confidence_score<br>   • p_recognition_model<br>   • p_device_info<br>3. Function tự động xác định status (present/late) dựa trên giờ vào và cutoff time.<br>4. Trả về attendance_id, is_first_checkin, final_status.<br>5. Hiển thị "Điểm danh thành công". |
| **Alternative flow** | Học sinh đã check-in rồi, cập nhật check_out_time thay vì tạo mới. |
| **Exception** | Lỗi gọi database function. |

### UC-Attend-02: Điểm danh ra

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Điểm danh ra (Check-out) |
| **Use-case ID** | UC-Attend-02 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Ghi nhận giờ ra của học sinh khi kết thúc buổi học. |
| **Actor** | System (AI), Homeroom Teacher |
| **Trigger** | Học sinh được nhận dạng lần 2 trong ngày hoặc check-out thủ công. |
| **Pre-condition** | Học sinh đã có attendance record với check_in_time trong ngày. |
| **Post-condition** | check_out_time được cập nhật vào attendance record. |
| **Normal flow** | 1. Nhận thông tin check-out: student_id, attendance_id.<br>2. Hệ thống kiểm tra attendance record đã tồn tại:<br>   • Truy vấn bằng attendance_id hoặc student_id + date<br>3. Kiểm tra check_out_time đã có chưa.<br>4. Cập nhật check_out_time = current Vietnam time.<br>5. Set updated_at = now().<br>6. Hiển thị "Điểm danh ra thành công" với thông tin:<br>   • Giờ vào: check_in_time<br>   • Giờ ra: check_out_time<br>   • Tổng thời gian: duration |
| **Alternative flow** | Tại bước 2: Không tìm thấy attendance record, hiển thị lỗi "Học sinh chưa điểm danh vào". |
| **Exception** | Lỗi cập nhật database. |

### UC-Attend-04: Xem điểm danh theo học sinh

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xem lịch sử điểm danh theo học sinh |
| **Use-case ID** | UC-Attend-04 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Xem lịch sử điểm danh của một học sinh cụ thể. |
| **Actor** | Admin, Homeroom Teacher |
| **Trigger** | Người dùng muốn xem lịch sử điểm danh của một học sinh. |
| **Pre-condition** | Học sinh tồn tại, có dữ liệu điểm danh. |
| **Post-condition** | Hiển thị danh sách điểm danh của học sinh. |
| **Normal flow** | 1. Người dùng chọn một học sinh.<br>2. Có thể filter theo khoảng thời gian (date_from, date_to).<br>3. Hệ thống truy vấn attendance records:<br>   • WHERE student_id = selected_id<br>   • AND date BETWEEN date_from AND date_to<br>   • ORDER BY date DESC<br>4. Hiển thị danh sách với thông tin:<br>   • Date, check_in_time, check_out_time<br>   • Status (present/late/absent)<br>   • Method (ai/manual)<br>   • Confidence score (nếu có)<br>   • Notes<br>5. Tính thống kê cho học sinh:<br>   • Tổng ngày đi học<br>   • Số ngày present, late, absent<br>   • Attendance rate |
| **Alternative flow** | Không có dữ liệu điểm danh, hiển thị danh sách rỗng. |
| **Exception** | Lỗi truy vấn database. |

### UC-Attend-05: Xem điểm danh hôm nay

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xem điểm danh hôm nay |
| **Use-case ID** | UC-Attend-05 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Xem danh sách điểm danh trong ngày hiện tại. |
| **Actor** | Admin, Homeroom Teacher |
| **Trigger** | Người dùng muốn xem điểm danh hôm nay. |
| **Pre-condition** | Có dữ liệu điểm danh trong ngày. |
| **Post-condition** | Hiển thị danh sách điểm danh hôm nay. |
| **Normal flow** | 1. Người dùng truy cập trang "Điểm danh hôm nay".<br>2. Hệ thống lấy ngày hiện tại (Vietnam timezone).<br>3. Có thể filter theo class_name (tùy chọn).<br>4. Truy vấn attendance records:<br>   • WHERE date = today<br>   • AND class_name = selected_class (nếu có)<br>   • ORDER BY check_in_time ASC<br>5. Manually join với students data để lấy thông tin học sinh.<br>6. Hiển thị danh sách với:<br>   • Thông tin học sinh: student_id, full_name, class_name<br>   • Thông tin điểm danh: check_in_time, status, method<br>   • Profile image<br>7. Hiển thị tổng số: present, late, absent.<br>8. Auto-refresh mỗi 30 giây để cập nhật real-time. |
| **Alternative flow** | Chưa có ai điểm danh, hiển thị danh sách rỗng. |
| **Exception** | Lỗi truy vấn database. |

### UC-Attend-06: Xem thống kê điểm danh

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xem thống kê điểm danh |
| **Use-case ID** | UC-Attend-06 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Xem thống kê tỷ lệ điểm danh theo ngày. |
| **Actor** | Admin, Homeroom Teacher |
| **Trigger** | Người dùng muốn xem thống kê. |
| **Pre-condition** | Có dữ liệu điểm danh. |
| **Post-condition** | Hiển thị thống kê: total_students, present_count, absent_count, late_count, attendance_rate. |
| **Normal flow** | 1. Người dùng chọn ngày cần xem thống kê (mặc định hôm nay).<br>2. Hệ thống đếm tổng số học sinh active.<br>3. Đếm số lượng theo từng status trong ngày đó:<br>   • present_count = COUNT WHERE status = 'present'<br>   • absent_count = COUNT WHERE status = 'absent'<br>   • late_count = COUNT WHERE status = 'late'<br>4. Tính attendance_rate = (present_count / total_students) × 100.<br>5. Hiển thị kết quả thống kê dạng:<br>   • Số liệu (numbers)<br>   • Biểu đồ tròn (pie chart)<br>   • Progress bars<br>6. Có thể xem theo khoảng thời gian (range). |
| **Alternative flow** | Không có dữ liệu, hiển thị tất cả = 0. |
| **Exception** | Lỗi truy vấn database. |

### UC-Attend-07: Cập nhật điểm danh

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Cập nhật bản ghi điểm danh |
| **Use-case ID** | UC-Attend-07 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Chỉnh sửa thông tin của một bản ghi điểm danh đã tồn tại. |
| **Actor** | Admin, Homeroom Teacher |
| **Trigger** | Người dùng muốn sửa thông tin điểm danh (sửa status, notes, giờ vào/ra). |
| **Pre-condition** | Attendance record đã tồn tại. |
| **Post-condition** | Thông tin điểm danh được cập nhật. |
| **Normal flow** | 1. Người dùng chọn bản ghi điểm danh cần sửa.<br>2. Click nút "Chỉnh sửa".<br>3. Hệ thống hiển thị form với dữ liệu hiện tại:<br>   • status (present/late/absent)<br>   • check_in_time<br>   • check_out_time<br>   • notes<br>4. Người dùng chỉnh sửa các trường cần thiết.<br>5. Click "Cập nhật".<br>6. Hệ thống validate dữ liệu.<br>7. Update database với:<br>   • Các trường đã sửa<br>   • updated_at = Vietnam time now<br>8. Hiển thị "Cập nhật điểm danh thành công". |
| **Alternative flow** | Tại bước 6: Dữ liệu không hợp lệ (giờ ra < giờ vào), hiển thị lỗi. |
| **Exception** | Lỗi cập nhật database, record không tồn tại. |

### UC-Attend-08: Xóa bản ghi điểm danh

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xóa bản ghi điểm danh |
| **Use-case ID** | UC-Attend-08 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Xóa một bản ghi điểm danh (hard delete). |
| **Actor** | Admin |
| **Trigger** | Admin muốn xóa bản ghi điểm danh do nhập sai hoặc duplicate. |
| **Pre-condition** | Attendance record tồn tại, admin đã đăng nhập. |
| **Post-condition** | Bản ghi điểm danh bị xóa khỏi database. |
| **Normal flow** | 1. Admin chọn bản ghi điểm danh cần xóa.<br>2. Click nút "Xóa".<br>3. Hệ thống hiển thị dialog xác nhận:<br>   • "Bạn có chắc chắn muốn xóa bản ghi này?"<br>   • Hiển thị thông tin: Học sinh, ngày, giờ vào<br>   • Warning: "Hành động này không thể hoàn tác!"<br>4. Admin xác nhận xóa.<br>5. Hệ thống thực hiện DELETE FROM attendance WHERE id = selected_id.<br>6. Hiển thị "Xóa điểm danh thành công".<br>7. Refresh danh sách điểm danh. |
| **Alternative flow** | Tại bước 4: Admin hủy bỏ, không xóa. |
| **Exception** | Lỗi xóa database, record không tồn tại. |

### UC-Attend-09: Tính lại trạng thái

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Tính lại trạng thái điểm danh |
| **Use-case ID** | UC-Attend-09 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Tính lại status (present/late) dựa trên check_in_time và cutoff time. |
| **Actor** | Admin, System |
| **Trigger** | Admin muốn recalculate status hoặc system auto-recalculate. |
| **Pre-condition** | Có attendance records cần tính lại. |
| **Post-condition** | Status được cập nhật dựa trên logic cutoff time. |
| **Normal flow** | 1. Có 2 chế độ:<br>   • **Single**: Tính lại 1 record cụ thể<br>   • **Daily**: Tính lại tất cả records trong 1 ngày<br>2. Hệ thống gọi database function tương ứng:<br>   • recalculate_single_attendance(attendance_id)<br>   • recalculate_daily_attendance(target_date)<br>3. Function thực hiện:<br>   • Lấy check_in_time<br>   • So sánh với cutoff time (7:30 AM)<br>   • Nếu <= 7:30: status = 'present'<br>   • Nếu > 7:30: status = 'late'<br>4. Update status nếu có thay đổi.<br>5. Trả về kết quả:<br>   • total_checked: Số records đã kiểm tra<br>   • updated_count: Số records đã update<br>   • old_status và new_status<br>6. Hiển thị thông báo "Đã cập nhật X/Y records". |
| **Alternative flow** | Không có thay đổi nào, hiển thị "Tất cả đã đúng, không cần cập nhật". |
| **Exception** | Lỗi gọi database function. |

### UC-Attend-10: Cập nhật trạng thái

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Cập nhật trạng thái và ghi chú |
| **Use-case ID** | UC-Attend-10 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Cập nhật nhanh status và notes của attendance record (không sửa giờ vào/ra). |
| **Actor** | Admin, Homeroom Teacher |
| **Trigger** | Người dùng muốn thay đổi status hoặc thêm ghi chú. |
| **Pre-condition** | Attendance record tồn tại. |
| **Post-condition** | Status và/hoặc notes được cập nhật. |
| **Normal flow** | 1. Người dùng chọn attendance record.<br>2. Click vào dropdown status hoặc notes field.<br>3. Chọn status mới từ dropdown:<br>   • present<br>   • absent<br>   • late<br>   • excused (có phép)<br>4. Nhập notes (tùy chọn): lý do vắng, đi muộn, etc.<br>5. Hệ thống validate status hợp lệ.<br>6. Update database:<br>   • PATCH /attendance/{id}/status<br>   • SET status = new_status, notes = new_notes<br>   • SET updated_at = now()<br>7. Hiển thị "Cập nhật trạng thái thành công".<br>8. Refresh UI để hiển thị thay đổi. |
| **Alternative flow** | Status không thay đổi, chỉ update notes. |
| **Exception** | Status không hợp lệ, lỗi cập nhật database. |

### UC-Attend-11: Xem danh sách đầy đủ

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xem danh sách điểm danh đầy đủ |
| **Use-case ID** | UC-Attend-11 |
| **Created at** | 09/10/2025 |
| **Description** | Xem tất cả học sinh kể cả chưa điểm danh (hiển thị absent). |
| **Actor** | Homeroom Teacher |
| **Trigger** | Giáo viên muốn xem đầy đủ học sinh trong ngày. |
| **Pre-condition** | Có học sinh trong lớp. |
| **Post-condition** | Hiển thị tất cả học sinh, ai chưa điểm danh hiển thị status="absent". |
| **Normal flow** | 1. Chọn ngày và lớp (optional).<br>2. Lấy tất cả học sinh active (filter theo class nếu có).<br>3. Lấy attendance records cho ngày đó.<br>4. Merge data: học sinh có attendance -> hiển thị thông tin thực, học sinh chưa có -> tạo virtual record với status="absent".<br>5. Hiển thị danh sách đầy đủ. |
| **Alternative flow** | Không có học sinh, hiển thị rỗng. |
| **Exception** | Lỗi truy vấn. |

---

## MODULE 5: GIÁO VIÊN CHỦ NHIỆM

### UC-Homeroom-01: Xem thông tin lớp chủ nhiệm

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xem thông tin lớp chủ nhiệm |
| **Use-case ID** | UC-Homeroom-01 |
| **Created at** | 09/10/2025 |
| **Description** | Xem thông tin các lớp được phân công làm chủ nhiệm. |
| **Actor** | Homeroom Teacher |
| **Trigger** | Giáo viên truy cập dashboard chủ nhiệm. |
| **Pre-condition** | Giáo viên có role homeroom_teacher và được phân công lớp. |
| **Post-condition** | Hiển thị thông tin lớp: teacher_id, class_name, grade, total_students, etc. |
| **Normal flow** | 1. Giáo viên đăng nhập và truy cập "Lớp chủ nhiệm".<br>2. Hệ thống lấy teacher_id từ user_id.<br>3. Truy vấn bảng homeroom_teacher_classes để lấy các lớp.<br>4. Gọi RPC function get_homeroom_teacher_info.<br>5. Hiển thị thông tin chi tiết lớp chủ nhiệm. |
| **Alternative flow** | Chưa được phân công lớp, hiển thị "Không có lớp chủ nhiệm". |
| **Exception** | Lỗi RPC function. |

### UC-Homeroom-02: Xem học sinh lớp chủ nhiệm

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xem danh sách học sinh lớp chủ nhiệm |
| **Use-case ID** | UC-Homeroom-02 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Xem danh sách học sinh trong các lớp mà giáo viên được phân công chủ nhiệm. |
| **Actor** | Homeroom Teacher |
| **Trigger** | Giáo viên chủ nhiệm muốn xem danh sách học sinh lớp mình. |
| **Pre-condition** | Giáo viên đã được phân công làm chủ nhiệm cho ít nhất một lớp. |
| **Post-condition** | Hiển thị danh sách học sinh thuộc lớp chủ nhiệm. |
| **Normal flow** | 1. Giáo viên chủ nhiệm đăng nhập và truy cập "Lớp chủ nhiệm".<br>2. Hệ thống lấy teacher_id từ user_id.<br>3. Truy vấn homeroom_teacher_classes để lấy các lớp được phân công.<br>4. Với mỗi class_name, lấy danh sách học sinh:<br>   • WHERE class_name = homeroom_class<br>   • AND is_active = true<br>   • ORDER BY full_name<br>5. Hiển thị thông tin học sinh:<br>   • student_id, full_name, email, phone<br>   • profile_image<br>   • face_encoding status (có/chưa)<br>   • Thống kê điểm danh gần đây<br>6. Có thể search, filter theo grade. |
| **Alternative flow** | Không có học sinh nào trong lớp, hiển thị danh sách rỗng. |
| **Exception** | Giáo viên chưa được phân công lớp chủ nhiệm, lỗi truy vấn database. |

### UC-Homeroom-03: Cập nhật face encoding

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Cập nhật face encoding học sinh |
| **Use-case ID** | UC-Homeroom-03 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Cập nhật hoặc đăng ký lại dữ liệu khuôn mặt cho học sinh trong lớp chủ nhiệm. |
| **Actor** | Homeroom Teacher |
| **Trigger** | Giáo viên muốn đăng ký hoặc cập nhật khuôn mặt cho học sinh. |
| **Pre-condition** | Học sinh thuộc lớp chủ nhiệm của giáo viên. |
| **Post-condition** | Face encoding được cập nhật thành công. |
| **Normal flow** | 1. Giáo viên chọn học sinh từ danh sách lớp chủ nhiệm.<br>2. Click "Cập nhật khuôn mặt".<br>3. Hệ thống verify học sinh thuộc lớp chủ nhiệm:<br>   • Kiểm tra teacher_id và class_name<br>4. Giáo viên có 2 lựa chọn:<br>   • **Đăng ký mới/cập nhật**: Upload ảnh mới (gọi UC-AI-01)<br>   • **Xóa encoding cũ**: Xóa để đăng ký lại (gọi UC-AI-04)<br>5. Thực hiện action tương ứng.<br>6. Hiển thị kết quả:<br>   • "Cập nhật khuôn mặt thành công"<br>   • face_samples_count hiện tại<br>7. Cập nhật UI hiển thị status encoding mới. |
| **Alternative flow** | Học sinh không thuộc lớp chủ nhiệm, từ chối quyền truy cập. |
| **Exception** | Lỗi AI service, lỗi cập nhật database. |

### UC-Homeroom-04: Xem thống kê điểm danh lớp

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xem thống kê điểm danh lớp chủ nhiệm |
| **Use-case ID** | UC-Homeroom-04 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Xem thống kê tổng quan về điểm danh của lớp chủ nhiệm. |
| **Actor** | Homeroom Teacher |
| **Trigger** | Giáo viên muốn xem thống kê điểm danh lớp mình. |
| **Pre-condition** | Giáo viên có lớp chủ nhiệm, có dữ liệu điểm danh. |
| **Post-condition** | Hiển thị thống kê điểm danh chi tiết. |
| **Normal flow** | 1. Giáo viên truy cập "Thống kê điểm danh".<br>2. Chọn khoảng thời gian (mặc định: tuần này).<br>3. Hệ thống lấy class_name của lớp chủ nhiệm.<br>4. Gọi UC-Attend-06 (Xem thống kê) với filter class_name.<br>5. Tính toán các chỉ số:<br>   • total_students: Tổng số học sinh lớp<br>   • present_rate: Tỷ lệ có mặt (%)<br>   • late_rate: Tỷ lệ đi muộn (%)<br>   • absent_rate: Tỷ lệ vắng (%)<br>6. Thống kê theo từng ngày trong khoảng thời gian.<br>7. Hiển thị biểu đồ:<br>   • Line chart: Attendance rate theo ngày<br>   • Bar chart: Present/Late/Absent mỗi ngày<br>8. Danh sách học sinh thường xuyên vắng/muộn. |
| **Alternative flow** | Chưa có dữ liệu điểm danh, hiển thị thống kê = 0. |
| **Exception** | Lỗi truy vấn database. |

### UC-Homeroom-05: Xem chi tiết điểm danh lớp

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xem chi tiết điểm danh từng học sinh |
| **Use-case ID** | UC-Homeroom-05 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Xem chi tiết điểm danh của từng học sinh trong lớp chủ nhiệm. |
| **Actor** | Homeroom Teacher |
| **Trigger** | Giáo viên muốn xem chi tiết điểm danh từng học sinh. |
| **Pre-condition** | Có dữ liệu điểm danh trong lớp. |
| **Post-condition** | Hiển thị bảng điểm danh chi tiết. |
| **Normal flow** | 1. Giáo viên chọn ngày cần xem (mặc định: hôm nay).<br>2. Hệ thống lấy class_name của lớp chủ nhiệm.<br>3. Gọi UC-Attend-03 (Xem danh sách) với filter class_name và date.<br>4. Hiển thị bảng với cột:<br>   • STT<br>   • Mã học sinh<br>   • Họ tên<br>   • Giờ vào<br>   • Giờ ra<br>   • Trạng thái (present/late/absent)<br>   • Phương thức (AI/Manual)<br>   • Ghi chú<br>5. Mỗi row có actions:<br>   • View: Xem chi tiết<br>   • Edit: Sửa (gọi UC-Attend-07)<br>   • Update Status: Quick update (gọi UC-Attend-10)<br>6. Có thể export Excel, PDF. |
| **Alternative flow** | Giáo viên có thể toggle sang "Xem đầy đủ" (gọi UC-Attend-11) để xem cả học sinh chưa điểm danh. |
| **Exception** | Lỗi truy vấn database. |

### UC-Homeroom-06: Điểm danh thủ công

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Điểm danh thủ công |
| **Use-case ID** | UC-Homeroom-06 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Tạo/cập nhật điểm danh thủ công cho học sinh trong lớp chủ nhiệm. |
| **Actor** | Homeroom Teacher |
| **Trigger** | Giáo viên cần điểm danh thủ công (học sinh vắng, đi muộn có phép, etc). |
| **Pre-condition** | Học sinh thuộc lớp chủ nhiệm của giáo viên. |
| **Post-condition** | Attendance record được tạo/cập nhật với method="manual". |
| **Normal flow** | 1. Giáo viên chọn học sinh và ngày.<br>2. Chọn status: present, absent, late, excused.<br>3. Nhập check_in_time (nếu present/late).<br>4. Nhập check_out_time (tùy chọn).<br>5. Nhập notes (optional): lý do vắng, đi muộn, etc.<br>6. Hệ thống verify học sinh thuộc lớp chủ nhiệm:<br>   • Kiểm tra class_name match<br>7. Kiểm tra đã có attendance record chưa:<br>   • Có: Update existing record<br>   • Chưa: Insert new record<br>8. Lưu với:<br>   • method = "manual"<br>   • created_by = teacher's user_id<br>9. Hiển thị "Điểm danh thành công". |
| **Alternative flow** | Học sinh không thuộc lớp, hiển thị lỗi "Học sinh không thuộc lớp chủ nhiệm của bạn". |
| **Exception** | Lỗi lưu database, thời gian không hợp lệ (check_out < check_in). |

### UC-Homeroom-07: Xem recognition logs

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xem lịch sử nhận dạng khuôn mặt |
| **Use-case ID** | UC-Homeroom-07 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Xem lịch sử các lần nhận dạng khuôn mặt của học sinh lớp chủ nhiệm (để kiểm tra accuracy). |
| **Actor** | Homeroom Teacher |
| **Trigger** | Giáo viên muốn kiểm tra lịch sử nhận dạng AI. |
| **Pre-condition** | Có dữ liệu nhận dạng từ AI. |
| **Post-condition** | Hiển thị danh sách recognition logs. |
| **Normal flow** | 1. Giáo viên truy cập "Lịch sử nhận dạng".<br>2. Có thể filter theo:<br>   • Date range<br>   • Student (tùy chọn)<br>   • Status (success/failed)<br>3. Hệ thống truy vấn attendance records:<br>   • WHERE method = 'ai'<br>   • AND class_name = homeroom_class<br>   • ORDER BY created_at DESC<br>4. Hiển thị danh sách với thông tin:<br>   • Timestamp<br>   • Student info (student_id, full_name)<br>   • Confidence score (0.0 - 1.0)<br>   • Recognition model (insightface)<br>   • Device info (nếu có)<br>   • Status: Created attendance / Already checked<br>5. Highlight các nhận dạng có confidence < 0.30 (low confidence).<br>6. Có thể click vào để xem chi tiết attendance record. |
| **Alternative flow** | Không có logs, hiển thị "Chưa có lịch sử nhận dạng". |
| **Exception** | Lỗi truy vấn database. |

---

## MODULE 6: QUẢN LÝ ĐIỂM SỐ

### UC-Grade-01: Xem thông tin giáo viên

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xem thông tin giáo viên và phân công |
| **Use-case ID** | UC-Grade-01 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Giáo viên xem thông tin cá nhân và các lớp-môn được phân công giảng dạy. |
| **Actor** | Teacher |
| **Trigger** | Giáo viên muốn xem danh sách lớp-môn được phân công. |
| **Pre-condition** | Giáo viên đã đăng nhập và có teacher record. |
| **Post-condition** | Hiển thị thông tin giáo viên và danh sách phân công. |
| **Normal flow** | 1. Giáo viên đăng nhập vào hệ thống.<br>2. Hệ thống lấy user_id từ token.<br>3. Truy vấn teacher record dựa trên user_id.<br>4. Lấy teacher_id.<br>5. Truy vấn class_subjects để lấy tất cả phân công:<br>   • WHERE teacher_id = current_teacher_id<br>   • JOIN với classes và subjects<br>   • ORDER BY academic_year DESC, semester, class_name<br>6. Hiển thị thông tin:<br>   • Teacher info: full_name, subject_specialization, hire_date<br>   • Danh sách phân công: class_name, subject_name, academic_year, semester<br>7. Đếm tổng số lớp-môn đang dạy. |
| **Alternative flow** | Giáo viên chưa được phân công lớp-môn nào, hiển thị danh sách rỗng. |
| **Exception** | Teacher record không tồn tại, lỗi truy vấn. |

### UC-Grade-02: Xem học sinh theo lớp-môn

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xem danh sách học sinh của lớp-môn |
| **Use-case ID** | UC-Grade-02 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Giáo viên xem danh sách học sinh của một lớp-môn cụ thể. |
| **Actor** | Teacher |
| **Trigger** | Giáo viên muốn xem học sinh để nhập điểm hoặc theo dõi. |
| **Pre-condition** | Giáo viên được phân công dạy lớp-môn đó. |
| **Post-condition** | Hiển thị danh sách học sinh của lớp. |
| **Normal flow** | 1. Giáo viên chọn một lớp-môn từ danh sách phân công.<br>2. Hệ thống verify quyền truy cập:<br>   • Kiểm tra teacher_id match với class_subjects.teacher_id<br>3. Truy vấn students:<br>   • WHERE class_name = selected_class<br>   • AND is_active = true<br>   • ORDER BY student_id<br>4. Hiển thị danh sách học sinh:<br>   • student_id, full_name, email<br>   • profile_image<br>   • Status điểm: Đã nhập/Chưa nhập<br>5. Hiển thị actions cho mỗi học sinh:<br>   • Nhập điểm (UC-Grade-06)<br>   • Xem điểm (UC-Grade-07)<br>6. Tổng hợp: Tổng học sinh, số học sinh đã nhập điểm. |
| **Alternative flow** | Lớp không có học sinh, hiển thị danh sách rỗng. |
| **Exception** | Giáo viên không có quyền truy cập lớp này. |

### UC-Grade-03: Tạo cấu hình cột điểm

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Tạo cấu hình cột điểm cho môn học |
| **Use-case ID** | UC-Grade-03 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Giáo viên tạo cấu hình các cột điểm và hệ số tính điểm trung bình cho môn học. |
| **Actor** | Teacher |
| **Trigger** | Giáo viên muốn định nghĩa cách tính điểm cho môn mình dạy. |
| **Pre-condition** | Giáo viên được phân công dạy môn, chưa có config. |
| **Post-condition** | Grade config được tạo và lưu vào database. |
| **Normal flow** | 1. Giáo viên truy cập "Cấu hình điểm" cho môn học.<br>2. Chọn subject_id, class_name, academic_year, semester.<br>3. Định nghĩa các cột điểm (grade_columns JSON):<br>   • **Tên cột**: VD: "Điểm thường xuyên", "Điểm giữa kỳ", "Điểm cuối kỳ"<br>   • **Key**: diem_thuong_xuyen, diem_giua_ki, diem_cuoi_ki<br>   • **Weight (Hệ số)**: VD: 1, 2, 3<br>   • **Max score**: Điểm tối đa (thường là 10)<br>4. Xác nhận tổng hệ số > 0.<br>5. Click "Lưu cấu hình".<br>6. Hệ thống validate:<br>   • Kiểm tra chưa có config cho subject+class+semester này<br>   • Validate JSON structure<br>7. Insert vào grade_configs.<br>8. Hiển thị "Tạo cấu hình thành công". |
| **Alternative flow** | Đã có config, hiển thị lỗi "Cấu hình đã tồn tại, vui lòng cập nhật". |
| **Exception** | Lỗi validate JSON, lỗi insert database. |

### UC-Grade-04: Xem cấu hình cột điểm

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xem cấu hình cột điểm |
| **Use-case ID** | UC-Grade-04 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Xem cấu hình cột điểm hiện tại của môn học. |
| **Actor** | Teacher |
| **Trigger** | Giáo viên muốn xem cấu hình để biết cách tính điểm. |
| **Pre-condition** | Có grade_config cho môn học. |
| **Post-condition** | Hiển thị chi tiết cấu hình. |
| **Normal flow** | 1. Giáo viên chọn lớp-môn, học kỳ.<br>2. Click "Xem cấu hình điểm".<br>3. Hệ thống truy vấn grade_configs:<br>   • WHERE subject_id + class_name + semester + academic_year<br>4. Parse grade_columns JSON.<br>5. Hiển thị bảng cấu hình:<br>   • Tên cột | Hệ số | Điểm tối đa<br>   • Điểm thường xuyên | 1 | 10<br>   • Điểm giữa kỳ | 2 | 10<br>   • Điểm cuối kỳ | 3 | 10<br>6. Hiển thị công thức tính:<br>   • **Final Grade** = (ĐTX×1 + ĐGK×2 + ĐCK×3) / (1+2+3)<br>7. Có actions: Cập nhật (UC-Grade-05). |
| **Alternative flow** | Chưa có config, hiển thị "Chưa có cấu hình, vui lòng tạo mới" với link đến UC-Grade-03. |
| **Exception** | Lỗi parse JSON, lỗi truy vấn. |

### UC-Grade-05: Cập nhật cấu hình điểm

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Cập nhật cấu hình cột điểm |
| **Use-case ID** | UC-Grade-05 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Chỉnh sửa cấu hình cột điểm đã tồn tại. |
| **Actor** | Teacher |
| **Trigger** | Giáo viên muốn thay đổi hệ số hoặc thêm/xóa cột điểm. |
| **Pre-condition** | Đã có grade_config. |
| **Post-condition** | Config được cập nhật. |
| **Normal flow** | 1. Giáo viên truy cập UC-Grade-04 để xem config hiện tại.<br>2. Click nút "Chỉnh sửa".<br>3. Hệ thống hiển thị form với dữ liệu hiện tại.<br>4. Giáo viên có thể:<br>   • Thay đổi hệ số (weight)<br>   • Đổi tên cột<br>   • Thêm cột mới<br>   • Xóa cột (nếu chưa có điểm nào sử dụng)<br>5. Click "Cập nhật".<br>6. Hệ thống validate dữ liệu mới.<br>7. **Warning**: Hiển thị thông báo nếu đã có điểm:<br>   • "Có X học sinh đã nhập điểm, thay đổi có thể ảnh hưởng điểm trung bình"<br>8. Giáo viên xác nhận.<br>9. Update grade_columns trong database.<br>10. Recalculate tất cả final_grade đã có (nếu cần).<br>11. Hiển thị "Cập nhật thành công". |
| **Alternative flow** | Giáo viên hủy bỏ tại bước 8, không cập nhật. |
| **Exception** | Lỗi validate, lỗi update, lỗi recalculate. |

### UC-Grade-06: Nhập/cập nhật điểm

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Nhập/cập nhật điểm học sinh |
| **Use-case ID** | UC-Grade-06 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Giáo viên nhập điểm cho học sinh theo cấu hình cột điểm. |
| **Actor** | Teacher |
| **Trigger** | Giáo viên muốn nhập điểm. |
| **Pre-condition** | Giáo viên được phân công dạy lớp-môn đó, có grade_config. |
| **Post-condition** | Điểm được lưu vào database, final_grade tự động tính. |
| **Normal flow** | 1. Giáo viên chọn lớp-môn, học kỳ.<br>2. Chọn học sinh cần nhập điểm (từ UC-Grade-02).<br>3. Hệ thống load grade_config để biết các cột điểm.<br>4. Hiển thị form nhập điểm với các field tương ứng grade_columns:<br>   • Điểm thường xuyên (hệ số 1)<br>   • Điểm giữa kỳ (hệ số 2)<br>   • Điểm cuối kỳ (hệ số 3)<br>5. Giáo viên nhập điểm (0-10).<br>6. Hệ thống tính final_grade tự động:<br>   • final_grade = Σ(điểm × hệ số) / Σ(hệ số)<br>   • Hiển thị preview điểm trung bình<br>7. Nhập notes (tùy chọn).<br>8. Click "Lưu điểm".<br>9. Hệ thống kiểm tra đã có grade record chưa:<br>   • Có: UPDATE grades SET grade_data, final_grade, notes, updated_at<br>   • Chưa: INSERT new grade<br>10. Lưu grade_data dạng JSON.<br>11. Hiển thị "Lưu điểm thành công". |
| **Alternative flow** | Chưa có grade_config, hiển thị lỗi và yêu cầu tạo config trước (UC-Grade-03). |
| **Exception** | Điểm không hợp lệ (< 0 hoặc > 10), lỗi tính toán, lỗi lưu database. |

### UC-Grade-07: Xem điểm học sinh

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xem điểm của học sinh |
| **Use-case ID** | UC-Grade-07 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Xem điểm đã nhập của một học sinh trong môn học. |
| **Actor** | Teacher, Admin |
| **Trigger** | Người dùng muốn xem điểm của học sinh. |
| **Pre-condition** | Học sinh đã có điểm trong hệ thống. |
| **Post-condition** | Hiển thị thông tin điểm chi tiết. |
| **Normal flow** | 1. Người dùng chọn học sinh và môn học.<br>2. Chọn học kỳ cần xem.<br>3. Hệ thống truy vấn grades:<br>   • WHERE student_id + subject_id + semester + academic_year<br>4. Lấy grade_config để biết các cột điểm.<br>5. Parse grade_data JSON.<br>6. Hiển thị bảng điểm:<br>   • Tên cột | Điểm | Hệ số | Điểm × Hệ số<br>   • Điểm thường xuyên | 8.0 | 1 | 8.0<br>   • Điểm giữa kỳ | 7.5 | 2 | 15.0<br>   • Điểm cuối kỳ | 9.0 | 3 | 27.0<br>   • **Điểm trung bình** | **8.33** | | **(8+15+27)/6**<br>7. Hiển thị notes (nếu có).<br>8. Hiển thị thông tin khác:<br>   • Giáo viên nhập: teacher_name<br>   • Ngày nhập/cập nhật: created_at / updated_at |
| **Alternative flow** | Học sinh chưa có điểm, hiển thị "Chưa có điểm". |
| **Exception** | Lỗi truy vấn, lỗi parse JSON. |

### UC-Grade-08: Xóa điểm

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xóa bản ghi điểm |
| **Use-case ID** | UC-Grade-08 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Xóa bản ghi điểm của học sinh (khi nhập sai hoặc cần nhập lại). |
| **Actor** | Teacher |
| **Trigger** | Giáo viên muốn xóa điểm để nhập lại. |
| **Pre-condition** | Grade record tồn tại, giáo viên có quyền. |
| **Post-condition** | Grade record bị xóa khỏi database. |
| **Normal flow** | 1. Giáo viên xem điểm học sinh (UC-Grade-07).<br>2. Click nút "Xóa điểm".<br>3. Hệ thống hiển thị dialog xác nhận:<br>   • "Bạn có chắc chắn muốn xóa điểm này?"<br>   • Hiển thị: Học sinh, môn học, học kỳ, điểm hiện tại<br>   • Warning: "Hành động này không thể hoàn tác!"<br>4. Giáo viên xác nhận.<br>5. Hệ thống thực hiện DELETE FROM grades WHERE id = grade_id.<br>6. Hiển thị "Xóa điểm thành công".<br>7. Redirect về danh sách học sinh. |
| **Alternative flow** | Tại bước 4: Giáo viên hủy bỏ, không xóa. |
| **Exception** | Lỗi xóa database, grade không tồn tại. |

### UC-Grade-09: Xem danh sách môn học

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xem tất cả môn học trong hệ thống |
| **Use-case ID** | UC-Grade-09 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Xem danh sách tất cả môn học (dùng để tham khảo hoặc chọn khi cấu hình). |
| **Actor** | Teacher |
| **Trigger** | Giáo viên muốn xem danh sách môn học có trong hệ thống. |
| **Pre-condition** | Có môn học trong database. |
| **Post-condition** | Hiển thị danh sách môn học. |
| **Normal flow** | 1. Giáo viên truy cập trang "Danh sách môn học".<br>2. Hệ thống truy vấn:<br>   • SELECT * FROM subjects<br>   • ORDER BY subject_name<br>3. Hiển thị danh sách với thông tin:<br>   • subject_id (Mã môn)<br>   • subject_name (Tên môn)<br>   • description (Mô tả)<br>   • subject_code (Mã môn học)<br>4. Có search box để tìm kiếm.<br>5. Hiển thị tổng số môn học. |
| **Alternative flow** | Không có môn học, hiển thị danh sách rỗng. |
| **Exception** | Lỗi truy vấn database. |

---

## MODULE 7: NHẬN XÉT TỰ ĐỘNG AI

### UC-Feedback-01: Tạo nhận xét học sinh

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Tạo nhận xét cho một học sinh |
| **Use-case ID** | UC-Feedback-01 |
| **Created at** | 09/10/2025 |
| **Description** | Sử dụng Gemini AI để tạo nhận xét học sinh tự động. |
| **Actor** | Teacher, Homeroom Teacher |
| **Trigger** | Giáo viên muốn tạo nhận xét cho học sinh. |
| **Pre-condition** | Gemini AI service đang hoạt động. |
| **Post-condition** | Nhận xét được tạo tự động bởi AI. |
| **Normal flow** | 1. Giáo viên chọn học sinh.<br>2. Nhập thông tin:<br>   • student_name<br>   • score (điểm trung bình)<br>   • score_trend (tăng/giảm/ổn định)<br>   • attendance_rate (%)<br>   • notes (ghi chú thêm)<br>3. Validate score_trend phải là: tăng, giảm, ổn định.<br>4. Gọi Gemini service để generate feedback.<br>5. Trả về nhận xét bằng tiếng Việt.<br>6. Hiển thị nhận xét cho giáo viên review. |
| **Alternative flow** | score_trend không hợp lệ, hiển thị lỗi validation. |
| **Exception** | Lỗi Gemini API, trả về error message. |

### UC-Feedback-02: Tạo nhận xét hàng loạt

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Tạo nhận xét hàng loạt |
| **Use-case ID** | UC-Feedback-02 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Tạo nhận xét cho nhiều học sinh cùng lúc (tối đa 50) bằng AI Gemini. |
| **Actor** | Teacher, Homeroom Teacher |
| **Trigger** | Giáo viên muốn tạo nhận xét cho cả lớp hoặc nhiều học sinh. |
| **Pre-condition** | Có danh sách học sinh với thông tin điểm và chuyên cần, Gemini AI hoạt động. |
| **Post-condition** | Nhận xét được tạo cho tất cả học sinh. |
| **Normal flow** | 1. Giáo viên chọn lớp hoặc danh sách học sinh.<br>2. Nhập thông tin chung (hoặc lấy từ database):<br>   • score_trend cho mỗi học sinh<br>   • notes bổ sung (optional)<br>3. Hệ thống validate:<br>   • Số lượng học sinh <= 50<br>   • Mỗi học sinh có đầy đủ thông tin cần thiết<br>4. Gọi batch_generate_feedback với danh sách học sinh.<br>5. Gemini service xử lý tuần tự hoặc song song từng học sinh:<br>   • Gọi UC-Feedback-01 cho mỗi học sinh<br>   • Track success/failed<br>6. Trả về kết quả tổng hợp:<br>   • success_count: Số học sinh tạo thành công<br>   • failed_count: Số học sinh thất bại<br>   • failed_students: Danh sách học sinh lỗi với lý do<br>   • feedbacks: Dict {student_name: feedback_text}<br>7. Hiển thị bảng kết quả:<br>   • STT | Học sinh | Nhận xét | Status<br>8. Cho phép download Excel với tất cả nhận xét. |
| **Alternative flow** | Tại bước 3: Vượt quá 50 học sinh, hiển thị lỗi "Số lượng học sinh không được vượt quá 50". |
| **Exception** | Gemini API lỗi, một số học sinh thất bại (hiển thị chi tiết), timeout. |

### UC-Feedback-03: Gửi SMS nhận xét

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Gửi nhận xét qua SMS |
| **Use-case ID** | UC-Feedback-03 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Gửi nhận xét học sinh qua SMS tới số điện thoại phụ huynh. |
| **Actor** | Teacher, Homeroom Teacher |
| **Trigger** | Giáo viên muốn gửi nhận xét cho phụ huynh qua SMS. |
| **Pre-condition** | Đã có nhận xét cho học sinh, phụ huynh có số điện thoại hợp lệ. |
| **Post-condition** | SMS được gửi tới số điện thoại phụ huynh. |
| **Normal flow** | 1. Giáo viên đã tạo nhận xét (UC-Feedback-01 hoặc UC-Feedback-02).<br>2. Click nút "Gửi SMS" cho học sinh cụ thể hoặc hàng loạt.<br>3. Hệ thống lấy thông tin:<br>   • parent_phone từ students table<br>   • feedback_text đã tạo<br>   • student_name, class_name<br>4. Validate parent_phone:<br>   • Kiểm tra format số điện thoại VN (0XXXXXXXXX hoặc +84XXXXXXXXX)<br>   • Không null, không empty<br>5. Format nội dung SMS:<br>   • "Thân gửi phụ huynh học sinh [Tên]"<br>   • "Lớp: [class_name]"<br>   • "Nhận xét: [feedback_text]"<br>   • "Trường [School Name]"<br>6. Gọi SMS Gateway API (hiện tại là placeholder):<br>   • POST /sms/send<br>   • Body: {phone, message, sender_name}<br>7. Log kết quả gửi SMS.<br>8. Hiển thị thông báo:<br>   • Thành công: "Đã gửi SMS thành công tới [phone]"<br>   • Thất bại: "Gửi SMS thất bại: [lý do]" |
| **Alternative flow** | Tại bước 4: Số điện thoại không hợp lệ, hiển thị lỗi "Số điện thoại phụ huynh không hợp lệ". |
| **Exception** | SMS Gateway lỗi, số điện thoại không tồn tại, hết credit SMS, timeout. |

### UC-Feedback-04: Kiểm tra AI Feedback

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Kiểm tra trạng thái AI Feedback service |
| **Use-case ID** | UC-Feedback-04 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Kiểm tra trạng thái hoạt động của dịch vụ AI Feedback (Gemini). |
| **Actor** | Admin |
| **Trigger** | Admin muốn kiểm tra Gemini service có hoạt động không. |
| **Pre-condition** | Admin đã đăng nhập. |
| **Post-condition** | Thông tin trạng thái AI Feedback được hiển thị. |
| **Normal flow** | 1. Admin truy cập trang "Trạng thái hệ thống".<br>2. Click vào "AI Feedback Service".<br>3. Hệ thống thu thập thông tin:<br>   • **Service name**: "Google Gemini AI"<br>   • **Service status**: "active" / "inactive"<br>   • **API key status**: "valid" / "invalid" / "not_configured"<br>   • **Model**: Tên model đang sử dụng (VD: gemini-1.5-flash)<br>   • **Last successful call**: Thời gian gọi thành công gần nhất<br>   • **Total calls today**: Số lần gọi API hôm nay<br>   • **Success rate**: Tỷ lệ thành công (%)<br>   • **Average response time**: Thời gian phản hồi trung bình (ms)<br>4. Thực hiện test call tới Gemini API:<br>   • Gọi với prompt đơn giản: "Test connection"<br>   • Đo thời gian phản hồi<br>5. Hiển thị kết quả test:<br>   • Success: "Service hoạt động bình thường" (màu xanh)<br>   • Failed: "Service không phản hồi" (màu đỏ)<br>6. Hiển thị logs gần nhất (10 calls cuối). |
| **Alternative flow** | Không thể kết nối Gemini, hiển thị status = "inactive" với chi tiết lỗi. |
| **Exception** | API key không hợp lệ, hết quota, timeout, network error. |

---

## MODULE 8: CẤU HÌNH NGÀY HỌC

### UC-Config-01: Khởi tạo cấu hình

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Khởi tạo cấu hình ngày học ban đầu |
| **Use-case ID** | UC-Config-01 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Khởi tạo cấu hình ngày học mặc định cho tất cả các khối (10, 11, 12). |
| **Actor** | Admin |
| **Trigger** | Lần đầu setup hệ thống hoặc cần reset tất cả cấu hình. |
| **Pre-condition** | Admin đã đăng nhập, chưa có config hoặc muốn khởi tạo lại. |
| **Post-condition** | Cấu hình mặc định được tạo cho tất cả khối. |
| **Normal flow** | 1. Admin truy cập "Cấu hình ngày học".<br>2. Click nút "Khởi tạo cấu hình".<br>3. Hệ thống kiểm tra đã có config chưa.<br>4. Hiển thị dialog xác nhận:<br>   • "Khởi tạo cấu hình mặc định cho các khối?"<br>   • "Mặc định: 6 ngày/tuần"<br>5. Admin xác nhận.<br>6. Tạo config cho từng khối (10, 11, 12):<br>   • grade = 10, 11, 12<br>   • default_days_per_week = 6<br>   • current_week_days = 6<br>   • temporary_days_per_week = NULL<br>   • created_at = now()<br>7. Insert vào school_days_config.<br>8. Hiển thị "Khởi tạo thành công cho 3 khối". |
| **Alternative flow** | Tại bước 3: Đã có config, hiển thị cảnh báo "Đã có cấu hình, bạn có muốn reset không?". |
| **Exception** | Lỗi insert database, duplicate key. |

### UC-Config-02: Xem cấu hình ngày học

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Xem cấu hình ngày học hiện tại |
| **Use-case ID** | UC-Config-02 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Xem cấu hình số ngày học của tất cả các khối. |
| **Actor** | Admin |
| **Trigger** | Admin muốn xem cấu hình hiện tại. |
| **Pre-condition** | Đã có cấu hình trong hệ thống. |
| **Post-condition** | Hiển thị danh sách cấu hình tất cả khối. |
| **Normal flow** | 1. Admin truy cập trang "Cấu hình ngày học".<br>2. Hệ thống truy vấn:<br>   • SELECT * FROM school_days_config<br>   • ORDER BY grade<br>3. Hiển thị bảng cấu hình:<br>   • **Khối** | **Mặc định** | **Tuần này** | **Tạm thời** | **Cập nhật**<br>   • 10 | 6 | 6 | - | 2025-10-09<br>   • 11 | 6 | 6 | - | 2025-10-09<br>   • 12 | 6 | 5 | 5 | 2025-10-09<br>4. Highlight khối có cấu hình tạm thời (màu vàng).<br>5. Hiển thị actions:<br>   • Sửa (UC-Config-04)<br>   • Áp dụng tạm thời (UC-Config-06)<br>   • Reset (UC-Config-07)<br>6. Hiển thị thông tin:<br>   • "Reset tự động vào Chủ nhật hàng tuần" |
| **Alternative flow** | Chưa có config, hiển thị nút "Khởi tạo cấu hình" (UC-Config-01). |
| **Exception** | Lỗi truy vấn database. |

### UC-Config-03: Tạo cấu hình mới

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Tạo cấu hình cho khối mới |
| **Use-case ID** | UC-Config-03 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Tạo cấu hình ngày học cho một khối cụ thể (nếu chưa có). |
| **Actor** | Admin |
| **Trigger** | Admin muốn tạo cấu hình cho khối mới hoặc khối thiếu. |
| **Pre-condition** | Khối chưa có cấu hình. |
| **Post-condition** | Cấu hình mới được tạo cho khối. |
| **Normal flow** | 1. Admin click "Thêm cấu hình mới".<br>2. Nhập thông tin:<br>   • grade: Chọn từ dropdown (10, 11, 12)<br>   • default_days_per_week: Số ngày mặc định (1-7)<br>3. Hệ thống validate:<br>   • grade chưa tồn tại trong school_days_config<br>   • default_days_per_week trong khoảng 1-7<br>4. Tạo config mới:<br>   • grade = selected_grade<br>   • default_days_per_week = input_value<br>   • current_week_days = default_days_per_week<br>   • temporary_days_per_week = NULL<br>5. Insert vào database.<br>6. Hiển thị "Tạo cấu hình thành công cho khối [grade]". |
| **Alternative flow** | Tại bước 3: Khối đã có config, hiển thị lỗi "Khối đã có cấu hình, vui lòng sử dụng chức năng cập nhật". |
| **Exception** | Lỗi insert, số ngày không hợp lệ. |

### UC-Config-04: Cập nhật cấu hình

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Cập nhật cấu hình ngày học |
| **Use-case ID** | UC-Config-04 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Cập nhật số ngày học mặc định cho một khối. |
| **Actor** | Admin |
| **Trigger** | Admin muốn thay đổi số ngày học mặc định. |
| **Pre-condition** | Cấu hình đã tồn tại cho khối. |
| **Post-condition** | Cấu hình được cập nhật. |
| **Normal flow** | 1. Admin xem danh sách config (UC-Config-02).<br>2. Click "Sửa" cho khối cần cập nhật.<br>3. Hệ thống hiển thị form với dữ liệu hiện tại.<br>4. Admin sửa default_days_per_week (1-7).<br>5. Click "Cập nhật".<br>6. Hệ thống validate số ngày hợp lệ.<br>7. Update database:<br>   • SET default_days_per_week = new_value<br>   • SET current_week_days = new_value (nếu không có temporary)<br>   • SET updated_at = now()<br>   • WHERE grade = selected_grade<br>8. Hiển thị "Cập nhật thành công".<br>9. Refresh danh sách cấu hình. |
| **Alternative flow** | Không có thay đổi nào, không update database. |
| **Exception** | Số ngày không hợp lệ, lỗi update database. |

### UC-Config-05: Cập nhật hàng loạt

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Cập nhật cấu hình nhiều khối cùng lúc |
| **Use-case ID** | UC-Config-05 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Cập nhật số ngày học cho tất cả các khối cùng một lúc. |
| **Actor** | Admin |
| **Trigger** | Admin muốn set cùng số ngày cho tất cả khối. |
| **Pre-condition** | Có cấu hình cho các khối. |
| **Post-condition** | Tất cả khối được cập nhật số ngày giống nhau. |
| **Normal flow** | 1. Admin click "Cập nhật hàng loạt".<br>2. Nhập số ngày chung cho tất cả khối (1-7).<br>3. Checkbox chọn khối nào cần update (mặc định tất cả).<br>4. Hiển thị preview:<br>   • "Sẽ cập nhật X khối với số ngày = Y"<br>5. Admin xác nhận.<br>6. Hệ thống thực hiện update từng khối:<br>   • Gọi UC-Config-04 cho mỗi khối đã chọn<br>7. Track kết quả:<br>   • success_count<br>   • failed_count<br>8. Hiển thị "Đã cập nhật X/Y khối thành công". |
| **Alternative flow** | Admin bỏ chọn một số khối, chỉ update khối được chọn. |
| **Exception** | Một số khối update thất bại, hiển thị chi tiết. |

### UC-Config-06: Áp dụng cấu hình tạm thời

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Áp dụng cấu hình tạm thời |
| **Use-case ID** | UC-Config-06 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Áp dụng số ngày học tạm thời cho tuần hiện tại (VD: giảm từ 6 xuống 5 ngày). |
| **Actor** | Admin |
| **Trigger** | Admin muốn thay đổi số ngày học cho tuần (nghỉ lễ, sự kiện đặc biệt). |
| **Pre-condition** | Đã có cấu hình cho khối. |
| **Post-condition** | current_week_days được cập nhật với giá trị tạm thời. |
| **Normal flow** | 1. Admin chọn khối (10, 11, 12).<br>2. Nhập số ngày tạm thời (1-7).<br>3. Có thể nhập ghi chú (VD: "Nghỉ lễ 30/4").<br>4. Hệ thống validate:<br>   • grade tồn tại<br>   • số ngày trong khoảng 1-7<br>5. Cập nhật database:<br>   • SET temporary_days_per_week = temp_value<br>   • SET current_week_days = temp_value<br>   • SET updated_at = now()<br>   • WHERE grade = selected_grade<br>6. Hiển thị thông báo:<br>   • "Áp dụng cấu hình tạm thời thành công"<br>   • "Sẽ tự động reset về [default_days] vào Chủ nhật"<br>7. Cập nhật UI, highlight khối có config tạm thời. |
| **Alternative flow** | Chưa có cấu hình, hiển thị lỗi "Vui lòng tạo cấu hình trước" (UC-Config-03). |
| **Exception** | Số ngày không hợp lệ (< 1 hoặc > 7), lỗi update database. |

### UC-Config-07: Reset về mặc định

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Reset về cấu hình mặc định |
| **Use-case ID** | UC-Config-07 |
| **Created at** | 09/10/2025 |
| **Description** | Reset tất cả khối về số ngày mặc định (chạy tự động vào Chủ nhật 00:00). |
| **Actor** | System (Scheduler), Admin (manual) |
| **Trigger** | Scheduler chạy vào Chủ nhật 00:00 hoặc Admin trigger thủ công. |
| **Pre-condition** | Có cấu hình trong hệ thống. |
| **Post-condition** | current_week_days của tất cả khối = default_days_per_week. |
| **Normal flow** | 1. Scheduler/Admin trigger reset.<br>2. Lấy tất cả config trong school_days_config.<br>3. Với mỗi config:<br>   • current_week_days = default_days_per_week<br>   • updated_at = now()<br>4. Update tất cả vào database.<br>5. Log "Reset X khối về cấu hình mặc định thành công". |
| **Alternative flow** | Không có config, skip. |
| **Exception** | Lỗi update database. |

---

## MODULE 9: QUẢN TRỊ HỆ THỐNG

### UC-Admin-01: Quản lý người dùng

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Quản lý người dùng (CRUD) |
| **Use-case ID** | UC-Admin-01 |
| **Created at** | 09/10/2025 |
| **Description** | Admin quản lý tất cả người dùng trong hệ thống. |
| **Actor** | Admin |
| **Trigger** | Admin muốn thêm/sửa/xóa người dùng. |
| **Pre-condition** | Đăng nhập với role admin. |
| **Post-condition** | Thao tác CRUD thành công. |
| **Normal flow** | **CREATE:**<br>1. Admin nhập: email, password, full_name, role.<br>2. Hash password.<br>3. Insert vào table users.<br>4. Trả về user (không có password_hash).<br><br>**READ:**<br>1. Lấy danh sách users (không có password_hash).<br>2. Có thể filter, sort.<br><br>**UPDATE:**<br>1. Admin chọn user cần sửa.<br>2. Cập nhật: email, full_name, role, is_active.<br>3. Update vào database.<br><br>**DELETE:**<br>1. Admin chọn user cần xóa.<br>2. Delete khỏi database. |
| **Alternative flow** | Email đã tồn tại (CREATE), user không tồn tại (UPDATE/DELETE). |
| **Exception** | Lỗi database. |

### UC-Admin-02: Quản lý giáo viên

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Quản lý giáo viên (CRUD) |
| **Use-case ID** | UC-Admin-02 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Admin quản lý thông tin giáo viên trong trường. |
| **Actor** | Admin |
| **Trigger** | Admin muốn thêm/sửa/xóa giáo viên. |
| **Pre-condition** | Admin đã đăng nhập. |
| **Post-condition** | Thao tác CRUD giáo viên thành công. |
| **Normal flow** | **CREATE:**<br>1. Admin click "Thêm giáo viên".<br>2. Nhập thông tin:<br>   • user_id (FK tới users table)<br>   • full_name<br>   • email<br>   • phone<br>   • subject_specialization (môn chuyên môn)<br>   • hire_date (ngày vào làm)<br>3. Validate email không trùng, user_id tồn tại.<br>4. Insert vào teachers table.<br>5. Hiển thị "Thêm giáo viên thành công".<br><br>**READ:**<br>1. Truy vấn SELECT * FROM teachers.<br>2. JOIN với users để lấy thông tin user.<br>3. Order by full_name.<br>4. Có search, filter theo subject_specialization.<br><br>**UPDATE:**<br>1. Admin chọn giáo viên cần sửa.<br>2. Hiển thị form với dữ liệu hiện tại.<br>3. Admin sửa thông tin (trừ user_id).<br>4. Validate dữ liệu.<br>5. UPDATE teachers WHERE teacher_id.<br><br>**DELETE:**<br>1. Admin chọn giáo viên cần xóa.<br>2. Hiển thị dialog xác nhận với warning:<br>   • "Giáo viên có đang được phân công dạy không?"<br>3. Nếu có phân công, cảnh báo phải xóa phân công trước.<br>4. Xác nhận → DELETE FROM teachers WHERE teacher_id. |
| **Alternative flow** | Giáo viên đang có phân công, không cho phép xóa. |
| **Exception** | Email trùng, user_id không tồn tại, foreign key constraint. |

### UC-Admin-03: Quản lý môn học

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Quản lý môn học (CRUD) |
| **Use-case ID** | UC-Admin-03 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Admin quản lý các môn học trong chương trình. |
| **Actor** | Admin |
| **Trigger** | Admin muốn thêm/sửa/xóa môn học. |
| **Pre-condition** | Admin đã đăng nhập. |
| **Post-condition** | Thao tác CRUD môn học thành công. |
| **Normal flow** | **CREATE:**<br>1. Admin click "Thêm môn học".<br>2. Nhập thông tin:<br>   • subject_code (Mã môn: VD: TOAN10)<br>   • subject_name (Tên môn: Toán)<br>   • description (Mô tả)<br>   • credits (Số tín chỉ - optional)<br>3. Validate subject_code không trùng.<br>4. INSERT INTO subjects.<br>5. Hiển thị "Thêm môn học thành công".<br><br>**READ:**<br>1. Truy vấn SELECT * FROM subjects.<br>2. Order by subject_name.<br>3. Search theo subject_code hoặc subject_name.<br>4. Hiển thị danh sách với actions (Edit, Delete).<br><br>**UPDATE:**<br>1. Chọn môn học cần sửa.<br>2. Hiển thị form với dữ liệu hiện tại.<br>3. Sửa thông tin (subject_code không cho sửa sau khi tạo).<br>4. Validate và UPDATE.<br><br>**DELETE:**<br>1. Chọn môn học cần xóa.<br>2. Kiểm tra:<br>   • Có teacher nào đang dạy môn này không?<br>   • Có class nào có môn này không?<br>   • Có grades nào cho môn này không?<br>3. Nếu có, hiển thị cảnh báo "Không thể xóa, môn đang được sử dụng".<br>4. Nếu không, xác nhận và DELETE. |
| **Alternative flow** | Môn học đang được sử dụng, không cho phép xóa. |
| **Exception** | subject_code trùng, lỗi foreign key constraints. |

### UC-Admin-04: Quản lý lớp học

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Quản lý lớp học (CRUD) |
| **Use-case ID** | UC-Admin-04 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Admin quản lý các lớp học trong trường. |
| **Actor** | Admin |
| **Trigger** | Admin muốn thêm/sửa/xóa lớp học. |
| **Pre-condition** | Đăng nhập với role admin. |
| **Post-condition** | Thao tác CRUD lớp học thành công. |
| **Normal flow** | **CREATE:**<br>1. Admin click "Thêm lớp học".<br>2. Nhập thông tin:<br>   • class_name (VD: 10A1)<br>   • grade (10, 11, 12)<br>   • homeroom_teacher_id (FK tới teachers)<br>   • room_number (Phòng học)<br>   • academic_year (Năm học: 2024-2025)<br>3. Validate:<br>   • class_name không trùng trong cùng academic_year<br>   • homeroom_teacher_id tồn tại<br>4. INSERT INTO classes.<br>5. Nếu có homeroom_teacher_id, tạo record trong homeroom_teacher_classes.<br>6. Hiển thị "Thêm lớp học thành công".<br><br>**READ:**<br>1. SELECT * FROM classes.<br>2. LEFT JOIN teachers ON homeroom_teacher_id.<br>3. Order by grade, class_name.<br>4. Hiển thị: class_name, grade, homeroom_teacher, room_number, số học sinh.<br>5. Filter theo grade, academic_year.<br><br>**UPDATE:**<br>1. Chọn lớp cần sửa.<br>2. Hiển thị form với dữ liệu hiện tại.<br>3. Có thể sửa: room_number, homeroom_teacher_id.<br>4. Nếu đổi homeroom_teacher_id, cập nhật homeroom_teacher_classes.<br>5. UPDATE classes.<br><br>**DELETE:**<br>1. Chọn lớp cần xóa.<br>2. Kiểm tra có học sinh nào không.<br>3. Nếu có, cảnh báo "Lớp còn X học sinh, cần chuyển lớp trước".<br>4. Nếu không, DELETE FROM classes. |
| **Alternative flow** | Lớp còn học sinh, không cho phép xóa. |
| **Exception** | class_name trùng, homeroom_teacher_id không tồn tại, constraint violations. |

### UC-Admin-05: Phân công giáo viên-môn

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Phân công giáo viên dạy môn (CRUD) |
| **Use-case ID** | UC-Admin-05 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Admin phân công giáo viên dạy môn học nào (quản lý teacher_subjects). |
| **Actor** | Admin |
| **Trigger** | Admin muốn thiết lập giáo viên dạy môn gì. |
| **Pre-condition** | Đã có teachers và subjects. |
| **Post-condition** | Phân công giáo viên-môn được tạo/cập nhật. |
| **Normal flow** | **CREATE:**<br>1. Admin click "Phân công giáo viên-môn".<br>2. Chọn teacher từ dropdown.<br>3. Chọn môn subject từ dropdown (có thể multi-select).<br>4. Chọn academic_year.<br>5. Validate:<br>   • teacher_id và subject_id tồn tại<br>   • Chưa có phân công duplicate<br>6. INSERT INTO teacher_subjects.<br>7. Hiển thị "Phân công thành công".<br><br>**READ:**<br>1. Truy vấn teacher_subjects.<br>2. JOIN với teachers và subjects.<br>3. Hiển thị bảng:<br>   • Giáo viên | Môn học | Năm học | Actions<br>4. Filter theo teacher, subject, academic_year.<br>5. Search theo tên giáo viên hoặc môn.<br><br>**UPDATE:**<br>1. Chọn phân công cần sửa.<br>2. Có thể đổi subject_id (không đổi teacher_id - nếu đổi thì xóa và tạo mới).<br>3. UPDATE teacher_subjects.<br><br>**DELETE:**<br>1. Chọn phân công cần xóa.<br>2. Kiểm tra có class_subjects nào đang dùng không.<br>3. Nếu có, cảnh báo "Giáo viên đang dạy ở một số lớp".<br>4. Xác nhận và DELETE. |
| **Alternative flow** | Phân công đã tồn tại, hiển thị lỗi "Giáo viên đã được phân công môn này". |
| **Exception** | teacher_id hoặc subject_id không tồn tại, phân công đang được sử dụng. |

### UC-Admin-06: Phân công lớp-môn

| Thuộc tính | Nội dung |
|-----------|----------|
| **Use-case name** | Quản lý phân công lớp-môn học (CRUD) |
| **Use-case ID** | UC-Admin-06 |
| **Created by** | System Analysis Team |
| **Last modified by** | System Analysis Team |
| **Created at** | 09/10/2025 |
| **Last modified at** | 09/10/2025 |
| **Description** | Admin phân công giáo viên dạy môn nào cho lớp nào (quản lý class_subjects). |
| **Actor** | Admin |
| **Trigger** | Admin muốn thiết lập lịch giảng dạy cho lớp. |
| **Pre-condition** | Đã có: classes, subjects, teachers và teacher_subjects assignments. |
| **Post-condition** | Class-subject assignments được tạo/cập nhật. |
| **Normal flow** | **CREATE:**<br>1. Admin click "Phân công lớp-môn".<br>2. Chọn thông tin:<br>   • class_id (Dropdown lớp: 10A1, 11B2, etc.)<br>   • subject_id (Dropdown môn học)<br>   • teacher_id (Dropdown giáo viên - filter theo môn)<br>   • academic_year (Năm học: 2024-2025)<br>   • semester (Học kỳ: 1, 2)<br>3. Validate:<br>   • class_id, subject_id, teacher_id tồn tại<br>   • Teacher đã được phân công dạy subject đó (teacher_subjects)<br>   • Chưa có phân công duplicate (class+subject+semester+year)<br>4. INSERT INTO class_subjects.<br>5. Hiển thị "Phân công thành công".<br><br>**READ:**<br>1. Truy vấn class_subjects.<br>2. JOIN với classes, subjects, teachers để lấy đầy đủ thông tin.<br>3. Hiển thị bảng:<br>   • Lớp | Môn học | Giáo viên | Năm học | Học kỳ | Actions<br>   • 10A1 | Toán | Nguyễn Văn A | 2024-2025 | 1 | Edit Delete<br>4. Filter theo class, subject, teacher, academic_year, semester.<br>5. Search theo tên lớp hoặc giáo viên.<br><br>**UPDATE:**<br>1. Chọn phân công cần sửa.<br>2. Hiển thị form với dữ liệu hiện tại.<br>3. Có thể đổi:<br>   • teacher_id (nhưng phải validate teacher dạy được subject đó)<br>   • semester<br>4. UPDATE class_subjects WHERE id.<br><br>**DELETE:**<br>1. Chọn phân công cần xóa.<br>2. Kiểm tra:<br>   • Có grades nào đã nhập cho phân công này không?<br>   • Có grade_configs nào không?<br>3. Nếu có, cảnh báo "Đã có dữ liệu điểm, cân nhắc trước khi xóa".<br>4. Xác nhận và DELETE FROM class_subjects. |
| **Alternative flow** | Phân công đã tồn tại cho cùng class+subject+semester+year, hiển thị lỗi. |
| **Exception** | Foreign key constraint, teacher chưa được phân công dạy môn đó, phân công đang có dữ liệu điểm. |

---

## USE CASE DIAGRAM - CẤU TRÚC CHI TIẾT

### 1. DANH SÁCH ACTORS

| Actor ID | Actor Name | Mô tả | Kế thừa từ |
|----------|------------|-------|------------|
| A1 | User | Người dùng cơ bản của hệ thống | - |
| A2 | Admin | Quản trị viên hệ thống | User |
| A3 | Teacher | Giáo viên bộ môn | User |
| A4 | Homeroom Teacher | Giáo viên chủ nhiệm | User |
| A5 | System | Hệ thống tự động (Scheduler, AI) | - |

---

### 2. USE CASES THEO ACTOR

#### 👤 A1: USER (Base Actor - Tất cả actors kế thừa)

| Use Case ID | Use Case Name | Include | Extend |
|-------------|---------------|---------|--------|
| UC-Auth-01 | Đăng nhập | - | UC-Auth-05 (Làm mới token) |
| UC-Auth-03 | Đăng xuất | UC-Auth-06 (Xác thực user) | - |
| UC-Auth-04 | Đổi mật khẩu | UC-Auth-06 (Xác thực user) | - |
| UC-Auth-06 | Xem thông tin cá nhân | - | - |

#### 👨‍💼 A2: ADMIN

| Use Case ID | Use Case Name | Include | Extend |
|-------------|---------------|---------|--------|
| **MODULE: Quản lý User** |
| UC-Admin-01 | Quản lý người dùng (CRUD) | UC-Auth-06 | UC-Auth-02 (Đăng ký - khi tạo user mới) |
| **MODULE: Quản lý Học sinh** |
| UC-Student-01 | Tạo học sinh mới | UC-Auth-06 | UC-Student-06 (Upload ảnh), UC-AI-01 (Đăng ký khuôn mặt) |
| UC-Student-02 | Xem danh sách học sinh | UC-Auth-06 | UC-Student-03 (Xem chi tiết) |
| UC-Student-03 | Xem chi tiết học sinh | UC-Auth-06 | - |
| UC-Student-04 | Cập nhật thông tin học sinh | UC-Auth-06, UC-Student-03 | UC-Student-06 (Upload ảnh) |
| UC-Student-05 | Xóa học sinh | UC-Auth-06, UC-Student-03 | - |
| UC-Student-06 | Upload ảnh đại diện | UC-Auth-06 | - |
| UC-Student-07 | Xem thống kê học sinh | UC-Auth-06 | - |
| **MODULE: Quản lý Giáo viên** |
| UC-Admin-02 | Quản lý giáo viên (CRUD) | UC-Auth-06 | - |
| **MODULE: Quản lý Môn học** |
| UC-Admin-03 | Quản lý môn học (CRUD) | UC-Auth-06 | - |
| **MODULE: Quản lý Lớp học** |
| UC-Admin-04 | Quản lý lớp học (CRUD) | UC-Auth-06 | - |
| UC-Admin-05 | Phân công giáo viên-môn | UC-Auth-06, UC-Admin-02, UC-Admin-03 | - |
| UC-Admin-06 | Phân công lớp-môn | UC-Auth-06, UC-Admin-03, UC-Admin-04 | - |
| **MODULE: AI Face Recognition** |
| UC-AI-01 | Đăng ký khuôn mặt học sinh | UC-Auth-06, UC-Student-03 | UC-AI-02 (Đăng ký nhiều ảnh) |
| UC-AI-02 | Đăng ký nhiều khuôn mặt | UC-Auth-06, UC-AI-01 | - |
| UC-AI-04 | Xóa encoding khuôn mặt | UC-Auth-06, UC-Student-03 | - |
| UC-AI-05 | Reload AI models | UC-Auth-06 | - |
| UC-AI-06 | Xem trạng thái AI | UC-Auth-06 | - |
| UC-AI-08 | Điều khiển điểm danh liên tục | UC-Auth-06 | - |
| **MODULE: Attendance** |
| UC-Attend-03 | Xem danh sách điểm danh | UC-Auth-06 | UC-Attend-04 (Theo học sinh) |
| UC-Attend-06 | Xem thống kê điểm danh | UC-Auth-06 | - |
| UC-Attend-07 | Cập nhật điểm danh | UC-Auth-06, UC-Attend-03 | - |
| UC-Attend-08 | Xóa bản ghi điểm danh | UC-Auth-06, UC-Attend-03 | - |
| UC-Attend-09 | Tính lại trạng thái | UC-Auth-06 | - |
| **MODULE: School Config** |
| UC-Config-01 | Khởi tạo cấu hình | UC-Auth-06 | - |
| UC-Config-02 | Xem cấu hình ngày học | UC-Auth-06 | - |
| UC-Config-03 | Tạo cấu hình mới | UC-Auth-06 | - |
| UC-Config-04 | Cập nhật cấu hình | UC-Auth-06 | - |
| UC-Config-05 | Cập nhật hàng loạt | UC-Auth-06, UC-Config-04 | - |
| UC-Config-06 | Áp dụng cấu hình tạm thời | UC-Auth-06 | - |
| UC-Config-07 | Reset về mặc định | UC-Auth-06 | - |

#### 👨‍🏫 A3: TEACHER (Giáo viên bộ môn)

| Use Case ID | Use Case Name | Include | Extend |
|-------------|---------------|---------|--------|
| **MODULE: Xem Học sinh** |
| UC-Student-02 | Xem danh sách học sinh | UC-Auth-06 | UC-Student-03 (Xem chi tiết) |
| UC-Student-03 | Xem chi tiết học sinh | UC-Auth-06 | - |
| **MODULE: Quản lý Điểm** |
| UC-Grade-01 | Xem thông tin giáo viên | UC-Auth-06 | - |
| UC-Grade-02 | Xem học sinh theo lớp-môn | UC-Auth-06, UC-Grade-01 | - |
| UC-Grade-03 | Tạo cấu hình cột điểm | UC-Auth-06 | - |
| UC-Grade-04 | Xem cấu hình cột điểm | UC-Auth-06 | UC-Grade-03 (Nếu chưa có) |
| UC-Grade-05 | Cập nhật cấu hình điểm | UC-Auth-06, UC-Grade-04 | - |
| UC-Grade-06 | Nhập/cập nhật điểm | UC-Auth-06, UC-Grade-04 | - |
| UC-Grade-07 | Xem điểm học sinh | UC-Auth-06 | - |
| UC-Grade-08 | Xóa điểm | UC-Auth-06 | - |
| UC-Grade-09 | Xem danh sách môn học | UC-Auth-06 | - |
| **MODULE: AI Feedback** |
| UC-Feedback-01 | Tạo nhận xét học sinh | UC-Auth-06, UC-Grade-07 | UC-Feedback-03 (Gửi SMS) |
| UC-Feedback-02 | Tạo nhận xét hàng loạt | UC-Auth-06, UC-Feedback-01 | UC-Feedback-03 (Gửi SMS hàng loạt) |
| UC-Feedback-03 | Gửi SMS nhận xét | UC-Auth-06 | - |
| UC-Feedback-04 | Kiểm tra AI Feedback | UC-Auth-06 | - |

#### 👨‍👩‍👧‍👦 A4: HOMEROOM TEACHER (Giáo viên chủ nhiệm)

| Use Case ID | Use Case Name | Include | Extend |
|-------------|---------------|---------|--------|
| **MODULE: Lớp chủ nhiệm** |
| UC-Homeroom-01 | Xem thông tin lớp chủ nhiệm | UC-Auth-06 | - |
| UC-Homeroom-02 | Xem học sinh lớp chủ nhiệm | UC-Auth-06, UC-Homeroom-01 | UC-Student-03 (Xem chi tiết) |
| UC-Homeroom-03 | Cập nhật face encoding | UC-Auth-06, UC-AI-01 | - |
| **MODULE: Điểm danh** |
| UC-Homeroom-04 | Xem thống kê điểm danh lớp | UC-Auth-06, UC-Attend-06 | - |
| UC-Homeroom-05 | Xem chi tiết điểm danh lớp | UC-Auth-06, UC-Attend-03 | UC-Attend-11 (Full list) |
| UC-Homeroom-06 | Điểm danh thủ công | UC-Auth-06, UC-Attend-01 | UC-Attend-10 (Cập nhật status) |
| UC-Homeroom-07 | Xem recognition logs | UC-Auth-06 | - |
| **MODULE: Face Recognition** |
| UC-AI-01 | Đăng ký khuôn mặt học sinh | UC-Auth-06, UC-Homeroom-02 | UC-AI-02 (Nhiều ảnh) |
| UC-AI-02 | Đăng ký nhiều khuôn mặt | UC-Auth-06, UC-AI-01 | - |
| UC-AI-04 | Xóa encoding khuôn mặt | UC-Auth-06 | - |
| UC-AI-08 | Điều khiển điểm danh liên tục | UC-Auth-06 | UC-AI-07 (Stream điểm danh) |
| **MODULE: Upload ảnh** |
| UC-Student-06 | Upload ảnh đại diện | UC-Auth-06, UC-Homeroom-02 | - |
| **MODULE: AI Feedback** |
| UC-Feedback-01 | Tạo nhận xét học sinh | UC-Auth-06 | UC-Feedback-03 (Gửi SMS) |
| UC-Feedback-02 | Tạo nhận xét hàng loạt | UC-Auth-06, UC-Feedback-01 | - |

#### 🤖 A5: SYSTEM (Hệ thống tự động)

| Use Case ID | Use Case Name | Include | Extend |
|-------------|---------------|---------|--------|
| **MODULE: AI Recognition** |
| UC-AI-03 | Nhận dạng khuôn mặt | - | UC-Attend-01 (Tạo attendance) |
| UC-AI-07 | Điểm danh liên tục (WebSocket) | UC-AI-03, UC-Attend-01 | - |
| UC-AI-09 | Đếm khuôn mặt | - | - |
| **MODULE: Auto Attendance** |
| UC-Attend-01 | Điểm danh vào (Auto) | UC-AI-03 | UC-Attend-02 (Check-out) |
| UC-Attend-02 | Điểm danh ra (Auto) | UC-Attend-01 | - |
| **MODULE: Scheduler** |
| UC-Config-07 | Reset về mặc định (Chủ nhật 00:00) | - | - |

---

### 3. QUAN HỆ INCLUDE (A <<include>> B: A cần B để hoàn thành)

| Use Case A (Base) | Include → | Use Case B (Required) | Lý do |
|-------------------|-----------|----------------------|-------|
| **Authentication Module** |
| UC-Auth-03 (Đăng xuất) | **include** | UC-Auth-06 (Xác thực user) | Cần xác thực user trước khi đăng xuất |
| UC-Auth-04 (Đổi mật khẩu) | **include** | UC-Auth-06 (Xác thực user) | Cần xác thực user hiện tại |
| **Student Management** |
| UC-Student-01 (Tạo học sinh) | **include** | UC-Auth-06 (Xác thực user) | Cần quyền admin |
| UC-Student-02 (Xem danh sách) | **include** | UC-Auth-06 (Xác thực user) | Cần xác thực và kiểm tra quyền |
| UC-Student-04 (Cập nhật) | **include** | UC-Student-03 (Xem chi tiết) | Cần lấy thông tin học sinh trước |
| UC-Student-05 (Xóa) | **include** | UC-Student-03 (Xem chi tiết) | Cần verify học sinh tồn tại |
| **AI Face Recognition** |
| UC-AI-01 (Đăng ký khuôn mặt) | **include** | UC-Student-03 (Xem chi tiết) | Cần verify học sinh tồn tại |
| UC-AI-02 (Nhiều ảnh) | **include** | UC-AI-01 (Đăng ký 1 ảnh) | Gọi multiple lần UC-AI-01 |
| UC-AI-04 (Xóa encoding) | **include** | UC-Student-03 (Xem chi tiết) | Verify học sinh |
| UC-AI-07 (Stream điểm danh) | **include** | UC-AI-03 (Nhận dạng) | Stream gọi nhận dạng liên tục |
| UC-AI-07 (Stream điểm danh) | **include** | UC-Attend-01 (Điểm danh vào) | Tự động tạo attendance |
| **Attendance** |
| UC-Attend-03 (Xem danh sách) | **include** | UC-Auth-06 (Xác thực) | Cần quyền truy cập |
| UC-Attend-07 (Cập nhật) | **include** | UC-Attend-03 (Xem) | Cần lấy record trước |
| UC-Attend-08 (Xóa) | **include** | UC-Attend-03 (Xem) | Verify record tồn tại |
| **Grades Management** |
| UC-Grade-02 (Xem học sinh lớp-môn) | **include** | UC-Grade-01 (Xem thông tin GV) | Verify quyền dạy lớp đó |
| UC-Grade-05 (Cập nhật config) | **include** | UC-Grade-04 (Xem config) | Lấy config hiện tại |
| UC-Grade-06 (Nhập điểm) | **include** | UC-Grade-04 (Xem config) | Cần config để tính điểm |
| **Homeroom Teacher** |
| UC-Homeroom-02 (Xem học sinh) | **include** | UC-Homeroom-01 (Xem lớp CN) | Verify lớp chủ nhiệm |
| UC-Homeroom-03 (Update encoding) | **include** | UC-AI-01 (Đăng ký khuôn mặt) | Sử dụng chức năng AI |
| UC-Homeroom-04 (Thống kê ĐD) | **include** | UC-Attend-06 (Xem thống kê) | Dùng chức năng attendance |
| UC-Homeroom-05 (Chi tiết ĐD) | **include** | UC-Attend-03 (Xem ĐD) | Dùng chức năng attendance |
| UC-Homeroom-06 (ĐD thủ công) | **include** | UC-Attend-01 (Điểm danh) | Tạo attendance record |
| **AI Feedback** |
| UC-Feedback-02 (Hàng loạt) | **include** | UC-Feedback-01 (1 học sinh) | Gọi multiple lần |
| UC-Feedback-01 (Tạo nhận xét) | **include** | UC-Grade-07 (Xem điểm) | Cần điểm để tạo nhận xét |
| **Admin** |
| UC-Admin-05 (Phân công GV-môn) | **include** | UC-Admin-02 (Quản lý GV) | Cần danh sách GV |
| UC-Admin-05 (Phân công GV-môn) | **include** | UC-Admin-03 (Quản lý môn) | Cần danh sách môn |
| UC-Admin-06 (Phân công lớp-môn) | **include** | UC-Admin-03 (Quản lý môn) | Cần danh sách môn |
| UC-Admin-06 (Phân công lớp-môn) | **include** | UC-Admin-04 (Quản lý lớp) | Cần danh sách lớp |
| **Config** |
| UC-Config-05 (Update hàng loạt) | **include** | UC-Config-04 (Update 1 khối) | Gọi multiple lần |

---

### 4. QUAN HỆ EXTEND (A <<extend>> B: A là mở rộng tùy chọn của B)

| Use Case B (Base) | ← Extend | Use Case A (Extension) | Điều kiện extend |
|-------------------|----------|------------------------|------------------|
| **Authentication** |
| UC-Auth-01 (Đăng nhập) | **extend** | UC-Auth-05 (Làm mới token) | Khi token hết hạn |
| UC-Admin-01 (Quản lý user) | **extend** | UC-Auth-02 (Đăng ký) | Khi tạo user mới |
| **Student Management** |
| UC-Student-01 (Tạo học sinh) | **extend** | UC-Student-06 (Upload ảnh) | User muốn upload ảnh ngay |
| UC-Student-01 (Tạo học sinh) | **extend** | UC-AI-01 (Đăng ký khuôn mặt) | User muốn đăng ký face ngay |
| UC-Student-02 (Xem danh sách) | **extend** | UC-Student-03 (Xem chi tiết) | User click vào 1 học sinh |
| UC-Student-04 (Cập nhật) | **extend** | UC-Student-06 (Upload ảnh) | User muốn đổi ảnh |
| **AI Face Recognition** |
| UC-AI-01 (Đăng ký 1 ảnh) | **extend** | UC-AI-02 (Đăng ký nhiều ảnh) | Muốn tăng độ chính xác |
| UC-AI-03 (Nhận dạng) | **extend** | UC-Attend-01 (Tạo attendance) | Nhận dạng thành công |
| UC-AI-08 (Điều khiển stream) | **extend** | UC-AI-07 (Stream điểm danh) | Bật chế độ continuous |
| **Attendance** |
| UC-Attend-01 (Điểm danh vào) | **extend** | UC-Attend-02 (Điểm danh ra) | Học sinh check-in lần 2 trong ngày |
| UC-Attend-03 (Xem danh sách) | **extend** | UC-Attend-04 (Theo học sinh) | Filter theo 1 học sinh cụ thể |
| UC-Attend-07 (Cập nhật ĐD) | **extend** | UC-Attend-10 (Cập nhật status) | Chỉ cập nhật status & notes |
| UC-Homeroom-05 (Chi tiết ĐD) | **extend** | UC-Attend-11 (Full list) | Muốn xem cả học sinh chưa ĐD |
| **Grades** |
| UC-Grade-04 (Xem config) | **extend** | UC-Grade-03 (Tạo config) | Chưa có config → tạo mới |
| **AI Feedback** |
| UC-Feedback-01 (Tạo nhận xét) | **extend** | UC-Feedback-03 (Gửi SMS) | User muốn gửi cho phụ huynh |
| UC-Feedback-02 (Hàng loạt) | **extend** | UC-Feedback-03 (Gửi SMS hàng loạt) | User muốn gửi hàng loạt |

---

### 5. QUAN HỆ GENERALIZATION (Kế thừa)

#### Actors Generalization:

```
                    User (Base Actor)
                         |
        +----------------+------------------+
        |                |                  |
      Admin          Teacher        Homeroom Teacher
```

**Chi tiết kế thừa:**
- **Admin** kế thừa từ **User**: Có tất cả quyền của User + quyền quản trị
- **Teacher** kế thừa từ **User**: Có quyền của User + quản lý điểm
- **Homeroom Teacher** kế thừa từ **User**: Có quyền của User + quản lý lớp chủ nhiệm

**Use Cases được kế thừa:**
- UC-Auth-01 (Đăng nhập)
- UC-Auth-03 (Đăng xuất)
- UC-Auth-04 (Đổi mật khẩu)
- UC-Auth-06 (Xem thông tin cá nhân)

---

### 6. SUMMARY - TỔNG HỢP RELATIONSHIPS

#### 📊 Thống kê quan hệ:

| Loại quan hệ | Số lượng | Mô tả |
|-------------|----------|-------|
| **Include** | 35+ quan hệ | Use case cần use case khác để hoàn thành |
| **Extend** | 18+ quan hệ | Use case mở rộng tùy chọn |
| **Generalization** | 3 actors | Admin, Teacher, Homeroom Teacher kế thừa User |

#### 🎯 Use Cases quan trọng nhất (Được include nhiều nhất):

1. **UC-Auth-06 (Xác thực user)** - Include bởi ~40 use cases
2. **UC-Student-03 (Xem chi tiết học sinh)** - Include bởi 8 use cases
3. **UC-AI-01 (Đăng ký khuôn mặt)** - Include bởi 5 use cases
4. **UC-Attend-01 (Điểm danh vào)** - Include bởi 3 use cases
5. **UC-Grade-04 (Xem cấu hình điểm)** - Include bởi 3 use cases

---

### 7. HƯỚNG DẪN VẼ USE CASE DIAGRAM

#### Bước 1: Vẽ Actors (Bên trái và phải hệ thống)
```
Bên TRÁI:                                    Bên PHẢI:
- User (Base - ở giữa)                      - System (Scheduler/AI)
- Admin (phía trên User)
- Teacher (phía dưới User)  
- Homeroom Teacher (phía dưới Teacher)
```

#### Bước 2: Vẽ Use Cases (Trong hệ thống - dạng oval)
- Nhóm theo 9 modules (dùng package/boundary)
- Use cases cơ bản (được include nhiều) ở trung tâm
- Use cases extend ở rìa

#### Bước 3: Vẽ quan hệ
- **Association** (─────): Actor → Use Case (đường thẳng)
- **Include** (- - - →): UC A - - - → UC B với <<include>> (đường đứt nét + mũi tên)
- **Extend** (- - - →): UC A - - - → UC B với <<extend>> (đường đứt nét + mũi tên)
- **Generalization** (─────▷): Child Actor ─────▷ Parent Actor (đường thẳng + tam giác)

#### Bước 4: Ưu tiên vẽ
1. Vẽ User và các actor kế thừa (Generalization)
2. Vẽ UC-Auth-06 (Xác thực) - UC trung tâm nhất
3. Vẽ các UC chính theo module
4. Vẽ các quan hệ Include (đường nét đứt)
5. Vẽ các quan hệ Extend (đường nét đứt khác màu)
6. Vẽ System actor và các UC tự động

---

**💡 Lưu ý khi vẽ:**
- Dùng màu sắc để phân biệt: Include (xanh), Extend (đỏ), Association (đen)
- Nhóm use cases theo module để diagram rõ ràng
- Đặt use cases được dùng nhiều ở vị trí trung tâm
- Các extend use case nên ở rìa, gần base use case

---

## KẾT LUẬN

Hệ thống Smart School bao gồm **66 Use Cases** được tổ chức thành **9 modules chính**:

1. **Authentication (6 UCs)**: Xác thực và phân quyền
2. **Student Management (7 UCs)**: Quản lý học sinh
3. **Face Recognition AI (9 UCs)**: Nhận dạng khuôn mặt với InsightFace
4. **Attendance (11 UCs)**: Quản lý điểm danh
5. **Homeroom Teacher (7 UCs)**: Chức năng giáo viên chủ nhiệm
6. **Grades Management (9 UCs)**: Quản lý điểm số
7. **AI Feedback (4 UCs)**: Tạo nhận xét tự động với Gemini
8. **School Days Config (7 UCs)**: Cấu hình ngày học
9. **Admin Operations (6 UCs)**: Quản trị hệ thống

### Công nghệ chính:
- **Backend**: FastAPI (Python)
- **Frontend**: React.js
- **Database**: Supabase (PostgreSQL)
- **AI Face Recognition**: InsightFace (ArcFace) - Độ chính xác 95-99%
- **AI Feedback**: Google Gemini
- **Real-time**: WebSocket cho điểm danh liên tục

### Các tính năng nổi bật:
- ✅ Điểm danh tự động bằng AI nhận dạng khuôn mặt
- ✅ Tạo nhận xét học sinh tự động bằng AI
- ✅ Quản lý điểm số linh hoạt với cấu hình cột điểm
- ✅ Dashboard riêng cho giáo viên chủ nhiệm
- ✅ Scheduler tự động reset cấu hình vào Chủ nhật
- ✅ Support Vietnam timezone
- ✅ Phân quyền rõ ràng (Admin, Teacher, Homeroom Teacher)


