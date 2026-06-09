// API Service để giao tiếp với backend
// Sử dụng environment variable hoặc fallback về localhost
import logger from "@/utils/logger";

const API_BASE_URL =
  import.meta.env.VITE_APP_API_URL || "http://localhost:8000/api";

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
  body?: string | FormData;
}

interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}

// Custom error class for API errors
class APIError extends Error {
  statusCode: number;
  code?: string;
  message: string;
  field?: string;
  data?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number,
    code?: string,
    field?: string,
    data?: Record<string, any>
  ) {
    super(message);
    this.name = "APIError";
    this.message = message;
    this.statusCode = statusCode;
    this.code = code;
    this.field = field;
    this.data = data;
  }
}

class ApiService {
  baseURL: string;
  isRefreshing: boolean;
  failedQueue: QueueItem[];

  constructor() {
    this.baseURL = API_BASE_URL;
    this.isRefreshing = false;
    this.failedQueue = [];
  }

  // Helper method để xử lý hàng đợi các request bị failed
  processQueue(error: Error | null, token: string | null = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token!);
      }
    });

    this.failedQueue = [];
  }

  // Kiểm tra xem token có hết hạn không
  isTokenExpired(token: string | null): boolean {
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Date.now() / 1000;
      // Kiểm tra hết hạn với buffer 60 giây (1 phút)
      return payload.exp < currentTime + 60;
    } catch (error) {
      return true;
    }
  }

  // Refresh access token
  async refreshAccessToken() {
    const refreshToken = localStorage.getItem("refresh_token");

    if (!refreshToken) {
      throw new Error("Không có refresh token");
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refreshToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Refresh token failed");
      }

      const result = await response.json();

      if (result.success && result.data.access_token) {
        // Lưu access token mới
        localStorage.setItem("access_token", result.data.access_token);
        return result.data.access_token;
      } else {
        throw new Error("Invalid refresh response");
      }
    } catch (error) {
      // Nếu refresh thất bại, xóa tất cả tokens và redirect đến login
      this.clearTokens();
      window.location.href = "/login";
      throw error;
    }
  }

  // Xóa tất cả tokens
  clearTokens() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  }

  // Helper method để thực hiện HTTP requests với auto-refresh
  async request(endpoint: string, options: RequestOptions = {}): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;

    // Lấy access token
    let accessToken = localStorage.getItem("access_token");

    // Kiểm tra và refresh token nếu cần
    if (accessToken && this.isTokenExpired(accessToken)) {
      if (this.isRefreshing) {
        // Nếu đang refresh, đợi trong hàng đợi
        return new Promise((resolve, reject) => {
          this.failedQueue.push({ resolve, reject });
        }).then(() => {
          return this.request(endpoint, options);
        });
      }

      this.isRefreshing = true;

      try {
        accessToken = await this.refreshAccessToken();
        this.processQueue(null, accessToken);
      } catch (error) {
        this.processQueue(error as Error, null);
        throw error;
      } finally {
        this.isRefreshing = false;
      }
    }

    const config: RequestOptions = {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    };

    // Thêm JWT token nếu có
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    try {
      const response = await fetch(url, config);

      // Nếu gặp lỗi 401 và chưa thử refresh
      if (response.status === 401 && accessToken && !this.isRefreshing) {
        if (this.isRefreshing) {
          // Nếu đang refresh, đợi trong hàng đợi
          return new Promise((resolve, reject) => {
            this.failedQueue.push({ resolve, reject });
          }).then(() => {
            return this.request(endpoint, options);
          });
        }

        this.isRefreshing = true;

        try {
          const newToken = await this.refreshAccessToken();
          this.processQueue(null, newToken);

          // Thử lại request với token mới
          if (config.headers) {
            config.headers.Authorization = `Bearer ${newToken}`;
          }
          const retryResponse = await fetch(url, config);

          if (!retryResponse.ok) {
            throw new Error(`HTTP error! status: ${retryResponse.status}`);
          }

          return await retryResponse.json();
        } catch (error) {
          this.processQueue(error as Error, null);
          throw error;
        } finally {
          this.isRefreshing = false;
        }
      }

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorCode = undefined;
        let errorField = undefined;
        let errorData = undefined;

        try {
          const responseText = await response.text();
          const parsedError = JSON.parse(responseText);
          
          // Extract error information from backend error response
          errorMessage = parsedError.message || errorMessage;
          errorCode = parsedError.code;
          errorField = parsedError.field;
          errorData = parsedError;
        } catch (parseError) {
          // Nếu không parse được JSON, fallback về message cũ
          logger.warn("Failed to parse error response JSON");
        }

        throw new APIError(
          errorMessage,
          response.status,
          errorCode,
          errorField,
          errorData
        );
      }

      const result = await response.json();

      // Backend trả về format {success: true, data: [...]}
      // Trả về toàn bộ result để component có thể xử lý success/error
      return result;
    } catch (error) {
      logger.error("API request failed:", error);
      throw error;
    }
  }

  // Generic HTTP methods for convenience
  async get(endpoint: string) {
    return this.request(endpoint, { method: "GET" });
  }

  async post(endpoint: string, data: any = null) {
    const options: RequestOptions = { method: "POST" };
    if (data) {
      options.body = JSON.stringify(data);
    }
    return this.request(endpoint, options);
  }

  async put(endpoint: string, data: any = null) {
    const options: RequestOptions = { method: "PUT" };
    if (data) {
      options.body = JSON.stringify(data);
    }
    return this.request(endpoint, options);
  }

  async delete(endpoint: string) {
    return this.request(endpoint, { method: "DELETE" });
  }

  // Authentication
  async login(username, password) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  async register(userData) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  // Logout - xóa tokens và gọi backend logout
  async logout() {
    try {
      // Gọi backend logout endpoint
      await this.request("/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      logger.error("Backend logout failed:", error);
    } finally {
      // Luôn xóa tokens local dù backend logout có thành công hay không
      this.clearTokens();
    }
  }

  // Forgot Password
  async forgotPassword(username, otpEmail) {
    return this.request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ username, otp_email: otpEmail }),
    });
  }

  async verifyOTP(username, otp) {
    return this.request("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ username, otp }),
    });
  }

  async resetPassword(username, otp, newPassword, confirmPassword) {
    return this.request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        username,
        otp,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    });
  }

  // Change Password (for logged-in users)
  async changePassword(currentPassword, newPassword) {
    const formData = new URLSearchParams();
    formData.append("current_password", currentPassword);
    formData.append("new_password", newPassword);

    return this.request("/auth/change-password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
  }

  async getOTPStatus(username) {
    return this.request(`/auth/otp-status/${username}`);
  }

  // Students
  async getStudents(params = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (
        params[key] !== null &&
        params[key] !== undefined &&
        params[key] !== ""
      ) {
        queryParams.append(key, params[key]);
      }
    });

    const queryString = queryParams.toString();
    return this.request(`/students/${queryString ? "?" + queryString : ""}`);
  }

  // Classes
  async getClasses() {
    return this.request("/students/classes/list");
  }

  // Homeroom classes - for homeroom teachers only
  async getHomeroomClasses() {
    return this.request("/homeroom/classes");
  }

  // Homeroom students - for homeroom teachers only
  async getHomeroomStudents(className = null) {
    const params = className ? `?class_name=${className}` : "";
    return this.request(`/homeroom/students${params}`);
  }

  // Attendance
  async getAttendanceRecords(params = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (
        params[key] !== null &&
        params[key] !== undefined &&
        params[key] !== ""
      ) {
        queryParams.append(key, params[key]);
      }
    });

    const queryString = queryParams.toString();
    return this.request(`/attendance/${queryString ? "?" + queryString : ""}`);
  }

  async getTodayAttendance(className = null) {
    const queryParams = className ? `?class_name=${className}` : "";
    return this.request(`/attendance/today${queryParams}`);
  }

  async getAttendanceStats(targetDate = null) {
    const queryParams = targetDate ? `?target_date=${targetDate}` : "";
    return this.request(`/attendance/stats${queryParams}`);
  }

  async markAttendance(attendanceData) {
    return this.request("/attendance/check-in", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(attendanceData),
    });
  }

  async createManualAttendance(attendanceData) {
    return this.request("/attendance/manual", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(attendanceData),
    });
  }

  async getStudent(id) {
    return this.request(`/students/${id}`);
  }

  async createStudent(studentData) {
    return this.request("/students", {
      method: "POST",
      body: JSON.stringify(studentData),
    });
  }

  async updateStudent(id, studentData) {
    return this.request(`/students/${id}`, {
      method: "PUT",
      body: JSON.stringify(studentData),
    });
  }

  async deleteStudent(id) {
    return this.request(`/students/${id}`, {
      method: "DELETE",
    });
  }

  async moveStudentsClass(studentIds, currentClassId, targetClassId) {
    return this.request(`/admin/students/move-class`, {
      method: "POST",
      body: JSON.stringify({
        student_ids: studentIds,
        current_class_id: currentClassId,
        target_class_id: targetClassId,
      }),
    });
  }

  async restoreStudent(id) {
    return this.request(`/students/${id}/restore`, {
      method: "POST",
    });
  }

  async permanentDeleteStudent(id) {
    return this.request(`/students/${id}/permanent`, {
      method: "DELETE",
    });
  }

  // Attendance (deprecated - use getAttendanceRecords instead)
  async getAttendance(date = null) {
    // Redirect to new method
    const params = date ? { date_from: date, date_to: date } : {};
    return this.getAttendanceRecords(params);
  }

  // This method is deprecated, redirect to the new one above
  async getAttendanceStatsOld(date = null) {
    const endpoint = date
      ? `/attendance/stats/?date=${date}`
      : "/attendance/stats/";
    return this.request(endpoint);
  }

  // AI Computer Vision
  async uploadImageForRecognition(imageFile, confidenceThreshold = 0.2) {
    const formData = new FormData();
    formData.append("file", imageFile);

    // Thêm confidence threshold vào URL params
    const endpoint = `/ai/recognize?confidence_threshold=${confidenceThreshold}`;

    return this.request(endpoint, {
      method: "POST",
      headers: {}, // Remove Content-Type to let browser set it with boundary
      body: formData,
    });
  }

  async registerStudentFace(studentId, imageFile) {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("student_id", studentId);

    return this.request("/ai/register-face", {
      method: "POST",
      headers: {}, // Remove Content-Type to let browser set it with boundary
      body: formData,
    });
  }

  // Update attendance status and notes
  async updateAttendanceStatus(attendanceId, status, notes = null) {
    const params = new URLSearchParams();
    params.append("status", status);
    if (notes !== null) {
      params.append("notes", notes);
    }

    return this.request(
      `/attendance/${attendanceId}/status?${params.toString()}`,
      {
        method: "PATCH",
      },
    );
  }

  // ===============================================
  // LEAVE REQUEST - Đơn xin nghỉ học
  // ===============================================

  /**
   * Upload ảnh đơn xin nghỉ học cho học sinh
   * @param {number} studentId - ID học sinh (students.id)
   * @param {File} imageFile - File ảnh đơn xin nghỉ
   * @param {string} targetDate - Ngày điểm danh (YYYY-MM-DD)
   */
  async uploadLeaveRequestImage(studentId, imageFile, targetDate) {
    const formData = new FormData();
    formData.append("file", imageFile);

    const params = new URLSearchParams();
    if (targetDate) params.append("target_date", targetDate);

    return this.request(
      `/homeroom/attendance/leave-request/${studentId}?${params.toString()}`,
      {
        method: "POST",
        headers: {}, // Để browser tự set Content-Type với boundary
        body: formData,
      },
    );
  }

  /**
   * Lấy thông tin ảnh đơn xin nghỉ cho học sinh theo ngày
   * @param {number} studentId - ID học sinh
   * @param {string} targetDate - Ngày điểm danh (YYYY-MM-DD)
   */
  async getLeaveRequestImage(studentId, targetDate) {
    const params = new URLSearchParams();
    if (targetDate) params.append("target_date", targetDate);

    return this.request(
      `/homeroom/attendance/leave-request/${studentId}?${params.toString()}`,
    );
  }

  /**
   * Xóa ảnh đơn xin nghỉ
   * @param {number} studentId - ID học sinh
   * @param {string} targetDate - Ngày điểm danh (YYYY-MM-DD)
   */
  async deleteLeaveRequestImage(studentId, targetDate) {
    const params = new URLSearchParams();
    if (targetDate) params.append("target_date", targetDate);

    return this.request(
      `/homeroom/attendance/leave-request/${studentId}?${params.toString()}`,
      { method: "DELETE" },
    );
  }

  // ===============================================
  // NOTEBOOK - Sổ đầu bài
  // ===============================================

  /**
   * Upload ảnh chụp sổ đầu bài cho lớp học
   * @param {number} classId - ID lớp học
   * @param {File} imageFile - File ảnh
   * @param {string} targetDate - Ngày điểm danh (YYYY-MM-DD)
   */
  async uploadNotebookImage(classId, imageFile, targetDate) {
    const formData = new FormData();
    formData.append("file", imageFile);

    const params = new URLSearchParams();
    params.append("class_id", classId);
    if (targetDate) params.append("target_date", targetDate);

    return this.request(
      `/homeroom/attendance/notebook?${params.toString()}`,
      {
        method: "POST",
        headers: {},
        body: formData,
      },
    );
  }

  /**
   * Lấy thông tin ảnh sổ đầu bài cho lớp theo ngày
   * @param {number} classId - ID lớp học
   * @param {string} targetDate - Ngày điểm danh (YYYY-MM-DD)
   */
  async getNotebookImage(classId, targetDate) {
    const params = new URLSearchParams();
    params.append("class_id", classId);
    if (targetDate) params.append("target_date", targetDate);

    return this.request(
      `/homeroom/attendance/notebook?${params.toString()}`,
    );
  }

  /**
   * Xóa ảnh sổ đầu bài
   * @param {number} classId - ID lớp học
   * @param {string} targetDate - Ngày điểm danh (YYYY-MM-DD)
   */
  async deleteNotebookImage(classId, targetDate) {
    const params = new URLSearchParams();
    params.append("class_id", classId);
    if (targetDate) params.append("target_date", targetDate);

    return this.request(
      `/homeroom/attendance/notebook?${params.toString()}`,
      { method: "DELETE" },
    );
  }

  // Get full attendance list (all students with their attendance status)
  async getFullAttendanceList(targetDate = null, className = null) {
    const params = new URLSearchParams();
    if (targetDate) {
      params.append("target_date", targetDate);
    }
    if (className) {
      params.append("class_name", className);
    }

    const queryString = params.toString();
    return this.request(
      `/attendance/full-list${queryString ? "?" + queryString : ""}`,
    );
  }

  // Dashboard stats
  async getDashboardStats() {
    try {
      const [studentsResponse, , statsResponse] = await Promise.all([
        this.getStudents({}),
        this.getAttendance(),
        this.getAttendanceStats(),
      ]);

      // Extract data from response objects
      const students = studentsResponse.success ? studentsResponse.data : [];
      const stats = statsResponse.success ? statsResponse.data : {};

      return {
        totalStudents: Array.isArray(students) ? students.length : 0,
        presentToday: stats.present_count || 0,
        absentToday: stats.absent_count || 0,
        attendanceRate: stats.attendance_rate || 0,
      };
    } catch (error) {
      logger.error("Failed to fetch dashboard stats:", error);
      // Return mock data as fallback
      return {
        totalStudents: 150,
        presentToday: 142,
        absentToday: 8,
        attendanceRate: 94.7,
      };
    }
  }

  // School Days Configuration
  async getSchoolDaysConfigs(grade = null) {
    const queryParams = grade ? `?grade=${grade}` : "";
    return this.request(`/school-days-config/${queryParams}`);
  }

  async initializeSchoolDaysConfigs() {
    return this.request("/school-days-config/initialize", {
      method: "POST",
    });
  }

  async createSchoolDaysConfig(config) {
    return this.request("/school-days-config/", {
      method: "POST",
      body: JSON.stringify(config),
    });
  }

  async updateSchoolDaysConfig(configId, config) {
    return this.request(`/school-days-config/${configId}`, {
      method: "PUT",
      body: JSON.stringify(config),
    });
  }

  async batchUpdateSchoolDaysConfigs(configs, grades) {
    // Thêm grades vào query params
    const queryParams = new URLSearchParams();
    grades.forEach((grade) => queryParams.append("grades", grade));

    return this.request(
      `/school-days-config/batch-update?${queryParams.toString()}`,
      {
        method: "POST",
        body: JSON.stringify(configs),
      },
    );
  }

  async applyTemporaryConfig(grade, temporaryDays = null) {
    const queryParams = temporaryDays ? `?temporary_days=${temporaryDays}` : "";
    return this.request(
      `/school-days-config/apply-temporary/${grade}${queryParams}`,
      {
        method: "POST",
      },
    );
  }

  async resetAllToDefault() {
    return this.request("/school-days-config/reset-to-default", {
      method: "POST",
    });
  }

  async getNextSundayReset() {
    return this.request("/school-days-config/next-sunday-reset");
  }

  // AI Feedback
  async getStudentFeedback(studentData) {
    return this.request("/feedback/student", {
      method: "POST",
      body: JSON.stringify(studentData),
    });
  }

  /**
   * Batch generate feedback comments via AI.
   * Payload must match BE: { students: [ { student_name, score, attendance_rate, top_subjects, weak_subjects, subject, notes } ] }
   * Recommend: always provide all fields for each student.
   */
  async getBatchFeedback(studentsData) {
    return this.request("/feedback/generate-batch-feedback", {
      method: "POST",
      body: JSON.stringify({ students: studentsData }),
    });
  }

  // Scores Management
  async getScores(filters = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      if (
        filters[key] !== null &&
        filters[key] !== undefined &&
        filters[key] !== ""
      ) {
        queryParams.append(key, filters[key]);
      }
    });

    const queryString = queryParams.toString();
    return this.request(`/scores/${queryString ? "?" + queryString : ""}`);
  }

  async updateScore(scoreId, scoreData) {
    return this.request(`/scores/${scoreId}`, {
      method: "PUT",
      body: JSON.stringify(scoreData),
    });
  }

  async createScore(scoreData) {
    return this.request("/scores/", {
      method: "POST",
      body: JSON.stringify(scoreData),
    });
  }

  async getSubjects() {
    return this.request("/scores/subjects");
  }

  async getSubjectsForSelection() {
    return this.request("/students/subjects");
  }

  async getClassSubjects(filters = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      if (
        filters[key] !== null &&
        filters[key] !== undefined &&
        filters[key] !== ""
      ) {
        queryParams.append(key, filters[key]);
      }
    });

    const queryString = queryParams.toString();
    return this.request(
      `/scores/class-subjects${queryString ? "?" + queryString : ""}`,
    );
  }

  async getScoreConfig(teacherId, subjectId, academicYear, semester) {
    return this.request(
      `/scores/config/${teacherId}/${subjectId}/${academicYear}/${semester}`,
    );
  }

  async updateScoreConfig(
    teacherId,
    subjectId,
    academicYear,
    semester,
    config,
  ) {
    return this.request(
      `/scores/config/${teacherId}/${subjectId}/${academicYear}/${semester}`,
      {
        method: "PUT",
        body: JSON.stringify(config),
      },
    );
  }

  async getStudentsByClassSubject(
    classSubjectId,
    academicYear = "2024-2025",
    semester = "HK1",
  ) {
    return this.request(
      `/scores/teacher/students/${classSubjectId}?academic_year=${academicYear}&semester=${semester}`,
    );
  }

  // Teacher-specific Scores Management API
  async getTeacherInfo(academicYear?: string | null, semester?: string | null) {
    let url = "/scores/teacher/info";
    const params = new URLSearchParams();
    if (academicYear) params.append("academic_year", academicYear);
    if (semester) params.append("semester", semester);
    if (params.toString()) url += `?${params.toString()}`;
    return this.request(url);
  }

  async createScoreConfig(config) {
    return this.request("/scores/config", {
      method: "POST",
      body: JSON.stringify(config),
    });
  }

  async updateScoreConfigById(configId, config) {
    return this.request(`/scores/config/${configId}`, {
      method: "PUT",
      body: JSON.stringify(config),
    });
  }

  async createOrUpdateScore(scoreData) {
    return this.request("/scores/score", {
      method: "POST",
      body: JSON.stringify(scoreData),
    });
  }

  async getScoreConfigBySubject(subjectId) {
    // Sử dụng score-settings
    return this.request(`/score-settings/subject/${subjectId}`);
  }

  // Score Settings management (for admin integration in Subjects tab)
  async createScoreSettings(payload) {
    return this.request(`/score-settings`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateScoreSettings(subjectId, payload) {
    return this.request(`/score-settings/${subjectId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  // Backward compatibility aliases (for grade_settings -> score_settings migration)
  async createGradeSettings(payload) {
    return this.createScoreSettings(payload);
  }

  async updateGradeSettings(subjectId, payload) {
    return this.updateScoreSettings(subjectId, payload);
  }

  async getStudentScore(studentId: number, classSubjectId: number, academicYear: string, semester: string) {
    return this.request(
      `/scores/score/${studentId}/${classSubjectId}?academic_year=${academicYear}&semester=${semester}`,
    );
  }

  async getStudentScores(
    studentId: number,
    academicYear: string = "2024-2025",
    semester: string = "HK1",
  ) {
    return this.request(
      `/scores/student/${studentId}?academic_year=${academicYear}&semester=${semester}`,
    );
  }

  // Upsert score config - create if not exists, update if exists
  async upsertScoreConfig(config: any) {
    // Use backend upsert endpoint that handles both create and update automatically
    return this.request("/scores/config/upsert", {
      method: "POST",
      body: JSON.stringify(config),
    });
  }

  // Download score template
  async downloadScoreTemplate(classSubjectId: number) {
    const accessToken = localStorage.getItem("access_token");
    const url = `${this.baseURL}/scores/template/download/${classSubjectId}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "template_diem.xlsx";
      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(
          contentDisposition,
        );
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, "");
        }
      }

      // Download file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      return {
        success: true,
        message: "Tải template thành công",
      };
    } catch (error) {
      logger.error("Error downloading template:", error);
      throw error;
    }
  }

  // Bulk import scores
  async bulkImportScores(importData: any) {
    return this.request("/scores/bulk-import", {
      method: "POST",
      body: JSON.stringify(importData),
    });
  }

  // Teacher Classes List (for dropdown filter)
  async getTeacherClasses(academicYear: string = "2024-2025", semester: string = "HK1") {
    return this.request(
      `/scores/teacher/classes?academic_year=${academicYear}&semester=${semester}`,
    );
  }

  // Teacher Dashboard Analytics
  async getTeacherDashboardAnalytics(
    academicYear: string = "2024-2025",
    semester: string = "HK1",
    classId: number | null = null,
  ) {
    let url = `/scores/teacher/dashboard/analytics?academic_year=${academicYear}&semester=${semester}`;
    if (classId) {
      url += `&class_id=${classId}`;
    }
    return this.request(url);
  }

  // Get available academic years and semesters for teacher (from class_subjects)
  async getTeacherAvailablePeriods() {
    return this.request("/scores/teacher/available-periods");
  }

  // Get available academic years and semesters for teacher (from grades)
  async getTeacherAvailablePeriodsGrades() {
    return this.request("/scores/teacher/available-periods-scores");
  }

  // ===============================================
  // ADMIN MANAGEMENT METHODS
  // ===============================================

  // Users Management
  async getUsers() {
    return this.request("/admin/users");
  }

  async createUser(userData) {
    return this.request("/admin/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId, userData) {
    return this.request(`/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId) {
    return this.request(`/admin/users/${userId}`, {
      method: "DELETE",
    });
  }

  // Teachers Management
  async getTeachers() {
    return this.request("/admin/teachers");
  }

  async createTeacher(teacherData) {
    return this.request("/admin/teachers", {
      method: "POST",
      body: JSON.stringify(teacherData),
    });
  }

  async updateTeacher(teacherId, teacherData) {
    return this.request(`/admin/teachers/${teacherId}`, {
      method: "PUT",
      body: JSON.stringify(teacherData),
    });
  }

  async deleteTeacher(teacherId) {
    return this.request(`/admin/teachers/${teacherId}`, {
      method: "DELETE",
    });
  }

  // ===============================================
  // PERSONAL INFO MANAGEMENT METHODS
  // ===============================================

  // Personal Info
  async getPersonalInfo() {
    return this.request("/scores/teacher/personal-info");
  }

  async updateTeacherProfile(profileData) {
    return this.request("/scores/teacher/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  }

  async getTeacherSubjectClasses() {
    return this.request("/scores/teacher/subject-classes");
  }

  // Subjects Management
  async getSubjectsAdmin() {
    return this.request("/admin/subjects");
  }

  async createSubject(subjectData) {
    return this.request("/admin/subjects", {
      method: "POST",
      body: JSON.stringify(subjectData),
    });
  }

  async updateSubject(subjectId, subjectData) {
    return this.request(`/admin/subjects/${subjectId}`, {
      method: "PUT",
      body: JSON.stringify(subjectData),
    });
  }

  async deleteSubject(subjectId) {
    return this.request(`/admin/subjects/${subjectId}`, {
      method: "DELETE",
    });
  }

  async restoreSubject(subjectId) {
    return this.request(`/admin/subjects/${subjectId}/restore`, {
      method: "POST",
    });
  }

  async permanentDeleteSubject(subjectId) {
    return this.request(`/admin/subjects/${subjectId}/permanent`, {
      method: "DELETE",
    });
  }

  // Classes Management
  async getClassesAdmin(academicYear) {
    const qs = academicYear
      ? `?academic_year=${encodeURIComponent(academicYear)}`
      : "";
    return this.request(`/admin/classes${qs}`);
  }

  async createClass(classData) {
    return this.request("/admin/classes", {
      method: "POST",
      body: JSON.stringify(classData),
    });
  }

  async updateClass(classId, classData) {
    return this.request(`/admin/classes/${classId}`, {
      method: "PUT",
      body: JSON.stringify(classData),
    });
  }

  async deleteClass(classId) {
    return this.request(`/admin/classes/${classId}`, {
      method: "DELETE",
    });
  }

  // Subject Teachers Management
  async getSubjectTeachers() {
    return this.request("/admin/subject-teachers");
  }

  async createSubjectTeacher(subjectTeacherData) {
    return this.request("/admin/subject-teachers", {
      method: "POST",
      body: JSON.stringify(subjectTeacherData),
    });
  }

  async updateSubjectTeacher(subjectTeacherId, subjectTeacherData) {
    return this.request(`/admin/subject-teachers/${subjectTeacherId}`, {
      method: "PUT",
      body: JSON.stringify(subjectTeacherData),
    });
  }

  async deleteSubjectTeacher(subjectTeacherId) {
    return this.request(`/admin/subject-teachers/${subjectTeacherId}`, {
      method: "DELETE",
    });
  }

  async restoreSubjectTeacher(subjectTeacherId) {
    return this.request(`/admin/subject-teachers/${subjectTeacherId}/restore`, {
      method: "POST",
    });
  }

  async permanentDeleteSubjectTeacher(subjectTeacherId) {
    return this.request(
      `/admin/subject-teachers/${subjectTeacherId}/permanent`,
      {
        method: "DELETE",
      },
    );
  }

  // Class Subjects Management
  async getClassSubjectsAdmin() {
    return this.request("/admin/class-subjects");
  }

  async createClassSubject(classSubjectData) {
    return this.request("/admin/class-subjects", {
      method: "POST",
      body: JSON.stringify(classSubjectData),
    });
  }

  async updateClassSubject(classSubjectId, classSubjectData) {
    return this.request(`/admin/class-subjects/${classSubjectId}`, {
      method: "PUT",
      body: JSON.stringify(classSubjectData),
    });
  }

  async deleteClassSubject(classSubjectId) {
    return this.request(`/admin/class-subjects/${classSubjectId}`, {
      method: "DELETE",
    });
  }

  async restoreClassSubject(classSubjectId) {
    return this.request(`/admin/class-subjects/${classSubjectId}/restore`, {
      method: "POST",
    });
  }

  async permanentDeleteClassSubject(classSubjectId) {
    return this.request(`/admin/class-subjects/${classSubjectId}/permanent`, {
      method: "DELETE",
    });
  }

  // SMS Feedback - Using eSMS.vn API directly
  async sendSMSFeedback(feedbackData) {
    // eSMS.vn API configuration
    const ESMS_API_KEY = "12C55681BDAB5AD58F921858700530";
    const ESMS_SECRET_KEY = "0F749EB8CFC6279C0259F019C797B5";
    const ESMS_API_URL =
      "https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/";

    try {
      // Chuẩn bị dữ liệu cho eSMS API
      const { student_id, feedback, parent_phone } = feedbackData;

      // Kiểm tra số điện thoại phụ huynh
      if (!parent_phone) {
        throw new Error("Không có số điện thoại phụ huynh để gửi SMS");
      }

      // Định dạng nội dung SMS
      const smsContent = `Thong bao hoc tap: ${feedback}`;

      // Dữ liệu gửi đến eSMS API
      const esmsData = {
        ApiKey: ESMS_API_KEY,
        Content: smsContent,
        Phone: parent_phone,
        SecretKey: ESMS_SECRET_KEY,
        Brandname: "Baotrixemay",
        SmsType: "2", // Đầu số cố định (như trong docs)
        IsUnicode: "1", // Hỗ trợ tiếng Việt
        Sandbox: "1", // Gửi thật (1 = test mode)
        RequestId: `FEEDBACK_${student_id}_${Date.now()}`, // ID duy nhất
        campaignid: "school_feedback", // Tên chiến dịch
      };

      logger.debug("🚀 Gửi SMS qua eSMS.vn với dữ liệu:", {
        phone: parent_phone,
        content: smsContent.substring(0, 50) + "...",
        requestId: esmsData.RequestId,
      });

      // Gọi API eSMS.vn
      const response = await fetch(ESMS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(esmsData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      logger.debug("📱 Kết quả từ eSMS.vn:", result);

      // Xử lý kết quả từ eSMS
      if (result.CodeResult === "100") {
        return {
          success: true,
          message: "Gửi SMS thành công!",
          data: {
            smsId: result.SMSID,
            phone: parent_phone,
            content: smsContent,
          },
        };
      } else {
        // Xử lý các mã lỗi từ eSMS.vn
        const errorMessages = {
          101: "Đăng nhập thất bại (API key hoặc Secret key không đúng)",
          102: "Tài khoản đã bị khóa",
          103: "Số dư tài khoản không đủ để gửi tin",
          104: "Mã Brandname không đúng",
          118: "Loại tin nhắn không hợp lệ",
          99: "Lỗi không xác định, thử lại sau",
        };

        const errorMessage =
          errorMessages[result.CodeResult] ||
          `Lỗi không xác định: ${result.CodeResult}`;

        return {
          success: false,
          error: errorMessage,
          data: result,
        };
      }
    } catch (error) {
      logger.error("❌ Lỗi khi gửi SMS qua eSMS.vn:", error);
      return {
        success: false,
        error: `Lỗi kết nối eSMS.vn: ${(error as any).message}`,
        data: null,
      };
    }
  }

  // ===============================================
  // EMAIL REPORT CARD API
  // ===============================================

  /**
   * Gửi phiếu điểm qua email cho phụ huynh
   * @param {Object} reportData - Dữ liệu phiếu điểm
   */
  async sendEmailReportCard(reportData) {
    return this.request("/feedback/send-email-report-card", {
      method: "POST",
      body: JSON.stringify(reportData),
    });
  }

  /**
   * Lấy dữ liệu tổng kết cả năm của học sinh từ materialized view
   */
  async getStudentAcademicSummary(studentId: number, academicYear?: string) {
    const params = academicYear ? `?academic_year=${encodeURIComponent(academicYear)}` : "";
    return this.request(`/feedback/student-summary/${studentId}${params}`);
  }

  // ===============================================
  // BULK STUDENT IMPORT APIs
  // ===============================================

  /**
   * Nhập học sinh hàng loạt từ file Excel/CSV
   */
  async bulkImportStudents(importData) {
    return this.request("/admin/students/bulk-import", {
      method: "POST",
      body: JSON.stringify(importData),
    });
  }

  // ===============================================
  // OCR SCORE SHEET APIs
  // ===============================================

  /**
   * Upload và parse ảnh bảng điểm viết tay sử dụng OCR (Async với Queue)
   */
  async parseScoreSheetOCR(formData: FormData) {
    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch(
        `${this.baseURL}/scores/ocr/parse-score-sheet`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            // Không set Content-Type để browser tự động set với boundary cho multipart/form-data
          },
          body: formData,
        },
      );

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 503) {
          const errorData = await response.json();
          const error: any = new Error(errorData.detail || "Hệ thống đang quá tải");
          error.response = { status: 503 };
          throw error;
        }

        const errorData = await response.json();
        throw new Error(errorData.detail || "Lỗi khi phân tích ảnh");
      }

      return await response.json();
    } catch (error) {
      logger.error("Error parsing OCR score sheet:", error);
      throw error;
    }
  }

  /**
   * Kiểm tra status của OCR request
   */
  async getOCRStatus(requestId: string | number) {
    return this.request(`/scores/ocr/status/${requestId}`, {
      method: "GET",
    });
  }

  /**
   * Lấy thống kê queue
   */
  async getOCRQueueStats() {
    return this.request("/scores/ocr/queue-stats", {
      method: "GET",
    });
  }

  /**
   * Export dữ liệu đã parse từ OCR ra Excel
   */
  async exportParsedOCRToExcel(data: any) {
    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch(
        `${this.baseURL}/scores/ocr/export-parsed-to-excel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        throw new Error("Lỗi khi export file");
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Get filename from header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "Bang_diem_OCR.xlsx";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      logger.error("Error exporting OCR data to Excel:", error);
      throw error;
    }
  }
}

// Create and export singleton instance
const apiService = new ApiService();
export default apiService;
export { APIError };
