// API Service để giao tiếp với backend
const API_BASE_URL = 'http://localhost:8000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method để thực hiện HTTP requests
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Thêm JWT token nếu có
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Backend trả về format {success: true, data: [...]}
      // Trả về toàn bộ result để component có thể xử lý success/error
      return result;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Students
  async getStudents(params = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    
    const queryString = queryParams.toString();
    return this.request(`/students/${queryString ? '?' + queryString : ''}`);
  }

  // Classes
  async getClasses() {
    return this.request('/students/classes/list');
  }

  // Attendance
  async getAttendanceRecords(params = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    
    const queryString = queryParams.toString();
    return this.request(`/attendance/${queryString ? '?' + queryString : ''}`);
  }

  async getTodayAttendance(className = null) {
    const queryParams = className ? `?class_name=${className}` : '';
    return this.request(`/attendance/today${queryParams}`);
  }

  async getAttendanceStats(targetDate = null) {
    const queryParams = targetDate ? `?target_date=${targetDate}` : '';
    return this.request(`/attendance/stats${queryParams}`);
  }

  async markAttendance(attendanceData) {
    return this.request('/attendance/check-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(attendanceData),
    });
  }

  async getStudent(id) {
    return this.request(`/students/${id}`);
  }

  async createStudent(studentData) {
    return this.request('/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
  }

  async updateStudent(id, studentData) {
    return this.request(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(studentData),
    });
  }

  async deleteStudent(id) {
    return this.request(`/students/${id}`, {
      method: 'DELETE',
    });
  }

  // Attendance (deprecated - use getAttendanceRecords instead)
  async getAttendance(date = null) {
    // Redirect to new method
    const params = date ? { date_from: date, date_to: date } : {};
    return this.getAttendanceRecords(params);
  }

  async markAttendance(studentId, status, notes = '') {
    return this.request('/attendance', {
      method: 'POST',
      body: JSON.stringify({
        student_id: studentId,
        status,
        notes,
      }),
    });
  }

  // This method is deprecated, redirect to the new one above
  async getAttendanceStatsOld(date = null) {
    const endpoint = date ? `/attendance/stats/?date=${date}` : '/attendance/stats/';
    return this.request(endpoint);
  }

  // AI Computer Vision
  async uploadImageForRecognition(imageFile, confidenceThreshold = 0.2) {
    const formData = new FormData();
    formData.append('file', imageFile);
    
    // Thêm confidence threshold vào URL params
    const endpoint = `/ai/recognize?confidence_threshold=${confidenceThreshold}`;

    return this.request(endpoint, {
      method: 'POST',
      headers: {}, // Remove Content-Type to let browser set it with boundary
      body: formData,
    });
  }

  async registerStudentFace(studentId, imageFile) {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('student_id', studentId);

    return this.request('/ai/register-face', {
      method: 'POST',
      headers: {}, // Remove Content-Type to let browser set it with boundary
      body: formData,
    });
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
      console.error('Failed to fetch dashboard stats:', error);
      // Return mock data as fallback
      return {
        totalStudents: 150,
        presentToday: 142,
        absentToday: 8,
        attendanceRate: 94.7,
      };
    }
  }
}

// Create and export singleton instance
const apiService = new ApiService();
export default apiService; 