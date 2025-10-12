import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Save, X, Search } from 'lucide-react';
import api from '../services/api';

const AdminManagement = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  
  // States cho Class Management tab
  const [selectedClassForManagement, setSelectedClassForManagement] = useState('');
  const [showInactiveStudents, setShowInactiveStudents] = useState(false);
  const [classStudents, setClassStudents] = useState([]);
  const [homeroomTeacher, setHomeroomTeacher] = useState(null);
  const [loadingClassData, setLoadingClassData] = useState(false);
  
  // Pagination states cho Class Management
  const [currentPage, setCurrentPage] = useState(1);
  const [classManagementPageSize, setClassManagementPageSize] = useState(10); // 10 học sinh mỗi trang

  // Reference data cho dropdowns
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);

  // Configuration cho từng tab
  const tabConfig = {
    users: {
      title: 'Quản lý người dùng',
      fields: ['email', 'full_name', 'password', 'role'],
      displayFields: ['id', 'email', 'full_name', 'role', 'is_active', 'created_at'],
      endpoint: '/admin/users'
    },
    teachers: {
      title: 'Quản lý giáo viên',
      fields: ['teacher_code', 'full_name', 'email', 'phone'],
      displayFields: ['id', 'teacher_code', 'full_name', 'email', 'phone', 'is_active'],
      endpoint: '/admin/teachers'
    },
    subjects: {
      title: 'Quản lý môn học',
      fields: ['subject_code', 'subject_name', 'description'],
      displayFields: ['id', 'subject_code', 'subject_name', 'description', 'is_active'],
      endpoint: '/admin/subjects'
    },
    classes: {
      title: 'Quản lý lớp học',
      fields: ['class_name', 'grade', 'homeroom_teacher', 'homeroom_teacher_id', 'room_number', 'academic_year'],
      displayFields: ['id', 'class_name', 'grade', 'homeroom_teacher', 'room_number', 'academic_year', 'total_students'],
      endpoint: '/admin/classes'
    },
    subject_teachers: {
      title: 'Quản lý giáo viên - môn học',
      fields: ['teacher_id', 'subject_id', 'academic_year'],
      displayFields: ['id', 'teacher_name', 'subject_name', 'academic_year', 'is_active'],
      endpoint: '/admin/subject-teachers'
    },
    class_subjects: {
      title: 'Quản lý lớp - môn học',
      fields: ['class_id', 'subject_id', 'teacher_id', 'academic_year', 'semester'],
      displayFields: ['id', 'class_name', 'subject_name', 'teacher_name', 'academic_year', 'semester', 'is_active'],
      endpoint: '/admin/class-subjects'
    }
  };

  const tabs = [
    { id: 'users', label: 'Người dùng', icon: '👤' },
    { id: 'teachers', label: 'Giáo viên', icon: '👨‍🏫' },
    { id: 'subjects', label: 'Môn học', icon: '📚' },
    { id: 'classes', label: 'Lớp học', icon: '🏫' },
    { id: 'class_management', label: 'Quản trị lớp học', icon: '🎯' },
    { id: 'subject_teachers', label: 'GV-Môn học', icon: '👨‍🏫📚' },
    { id: 'class_subjects', label: 'GV-Lớp học', icon: '🏫📚' }
  ];

  const currentConfig = tabConfig[activeTab];

  const loadData = useCallback(async () => {
    if (!currentConfig?.endpoint) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await api.request(currentConfig.endpoint);
      if (response.success) {
        setData(response.data || []);
      } else {
        setError(response.message || 'Không thể tải dữ liệu');
      }
    } catch (err) {
      setError('Lỗi khi tải dữ liệu: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [currentConfig?.endpoint]);

  // Load reference data cho dropdowns
  const loadReferenceData = useCallback(async () => {
    try {
      const [teachersRes, subjectsRes, classesRes, usersRes] = await Promise.all([
        api.request('/admin/teachers'),
        api.request('/admin/subjects'),
        api.request('/admin/classes'),
        api.request('/admin/users')
      ]);
      
      if (teachersRes.success) setTeachers(teachersRes.data || []);
      if (subjectsRes.success) setSubjects(subjectsRes.data || []);
      if (classesRes.success) setClasses(classesRes.data || []);
      if (usersRes.success) setUsers(usersRes.data || []);
    } catch (err) {
      console.error('Error loading reference data:', err);
    }
  }, []);

  // Load dữ liệu cho Class Management tab
  const loadClassManagementData = useCallback(async () => {
    try {
      const response = await api.request('/admin/classes');
      if (response.success) {
        setClasses(response.data || []);
      }
    } catch (err) {
      console.error('Error loading classes:', err);
    }
  }, []);

  // Load học sinh của lớp được chọn
  const loadClassStudents = useCallback(async () => {
    if (!selectedClassForManagement) return;
    
    setLoadingClassData(true);
    setCurrentPage(1); // Reset về trang đầu khi load dữ liệu mới
    
    try {
      const response = await api.request(`/admin/classes/${selectedClassForManagement}/students`);
      if (response.success) {
        let students = response.data || [];
        
        // Filter theo trạng thái active/inactive
        if (showInactiveStudents) {
          students = students.filter(student => student.is_active === false);
        } else {
          students = students.filter(student => student.is_active !== false);
        }
        
        // Sắp xếp theo student_id
        students = students.sort((a, b) => {
          const aId = parseInt(a.student_id) || 0;
          const bId = parseInt(b.student_id) || 0;
          return aId - bId;
        });
        
        setClassStudents(students);
        
        // Load thông tin giáo viên chủ nhiệm
        const classInfo = classes.find(c => c.id === parseInt(selectedClassForManagement));
        if (classInfo) {
          setHomeroomTeacher({
            name: classInfo.homeroom_teacher || 'Chưa phân công',
            code: classInfo.teachers?.teacher_code || '',
            full_name: classInfo.teachers?.full_name || ''
          });
        }
      }
    } catch (err) {
      console.error('Error loading class students:', err);
      setError('Không thể tải danh sách học sinh');
    } finally {
      setLoadingClassData(false);
    }
  }, [selectedClassForManagement, showInactiveStudents, classes]);

  // Load dữ liệu khi đổi tab
  useEffect(() => {
    if (activeTab === 'class_management') {
      loadClassManagementData();
    } else {
      loadData();
      loadReferenceData();
    }
  }, [activeTab, loadData, loadClassManagementData, loadReferenceData]);

  // Load dữ liệu khi chọn lớp
  useEffect(() => {
    if (selectedClassForManagement && activeTab === 'class_management') {
      setCurrentPage(1); // Reset về trang đầu khi chọn lớp mới
      loadClassStudents();
    }
  }, [selectedClassForManagement, showInactiveStudents, activeTab, loadClassStudents]);

  const handleCreate = async (data) => {
    if (!currentConfig?.endpoint) return;
    
    try {
      const response = await api.request(currentConfig.endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (response.success) {
        loadData();
        setShowAddForm(false);
        setFormData({});
        setShowPassword(false);
      } else {
        setError(response.message || 'Không thể tạo bản ghi');
      }
    } catch (err) {
      setError('Lỗi khi tạo bản ghi: ' + err.message);
    }
  };

  const handleUpdate = async (id, data) => {
    if (!currentConfig?.endpoint) return;
    
    try {
      const response = await api.request(`${currentConfig.endpoint}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      if (response.success) {
        loadData();
        setEditingItem(null);
        setFormData({});
        setShowPassword(false);
      } else {
        setError(response.message || 'Không thể cập nhật bản ghi');
      }
    } catch (err) {
      setError('Lỗi khi cập nhật bản ghi: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) return;
    if (!currentConfig?.endpoint) return;

    try {
      const response = await api.request(`${currentConfig.endpoint}/${id}`, {
        method: 'DELETE'
      });
      if (response.success) {
        loadData();
      } else {
        setError(response.message || 'Không thể xóa bản ghi');
      }
    } catch (err) {
      setError('Lỗi khi xóa bản ghi: ' + err.message);
    }
  };

  const filteredData = data.filter(item => {
    if (!searchTerm) return true;
    return Object.values(item).some(value => 
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Function to generate random password
  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const renderForm = (isEdit = false, item = {}) => {
    const handleSubmit = (e) => {
      e.preventDefault();
      if (isEdit) {
        handleUpdate(item.id, formData);
      } else {
        handleCreate(formData);
      }
    };

    const handleChange = (field, value) => {
      setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
      <form onSubmit={handleSubmit} className="p-8 bg-white rounded-xl border border-gray-100 shadow-lg">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {currentConfig?.fields?.map(field => (
            <div key={field} className="space-y-2">
              <label className="block mb-2 text-sm font-semibold text-gray-800">
                {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </label>
              {field === 'password' ? (
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData[field] || ''}
                      onChange={(e) => handleChange(field, e.target.value)}
                      className="px-4 py-3 pr-20 w-full rounded-lg border-2 border-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nhập mật khẩu"
                      required={!isEdit}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 p-2 text-gray-400 transition-colors duration-200 transform -translate-y-1/2 hover:text-gray-600"
                      title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="flex justify-center items-center px-4 py-3 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg border-2 border-blue-200 transition-all duration-200 hover:bg-blue-100 hover:border-blue-300"
                    title="Tạo mật khẩu ngẫu nhiên"
                  >
                    <svg className="mr-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Random
                  </button>
                </div>
              ) : field === 'role' ? (
                <div className="relative">
                  <select
                    value={formData[field] || item[field] || ''}
                    onChange={(e) => handleChange(field, e.target.value)}
                    className="px-4 py-3 pr-10 w-full bg-white rounded-lg border-2 border-gray-200 transition-all duration-200 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="" disabled>Chọn role</option>
                    <option value="teacher">👨‍🏫 Giáo viên bộ môn</option>
                    <option value="homeroom_teacher">🏫 Giáo viên chủ nhiệm</option>
                  </select>
                  <div className="flex absolute inset-y-0 right-0 items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              ) : field === 'teacher_id' ? (
                <select
                  value={formData[field] || item[field] || ''}
                  onChange={(e) => handleChange(field, parseInt(e.target.value))}
                  className="px-4 py-3 w-full rounded-lg border-2 border-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Chọn giáo viên</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.teacher_code} - {teacher.full_name}
                    </option>
                  ))}
                </select>
              ) : field === 'subject_id' ? (
                <select
                  value={formData[field] || item[field] || ''}
                  onChange={(e) => handleChange(field, parseInt(e.target.value))}
                  className="px-4 py-3 w-full rounded-lg border-2 border-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Chọn môn học</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.subject_code} - {subject.subject_name}
                    </option>
                  ))}
                </select>
              ) : field === 'class_id' ? (
                <select
                  value={formData[field] || item[field] || ''}
                  onChange={(e) => handleChange(field, parseInt(e.target.value))}
                  className="px-4 py-3 w-full rounded-lg border-2 border-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Chọn lớp</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name} - {cls.grade}
                    </option>
                  ))}
                </select>
              ) : field === 'homeroom_teacher_id' ? (
                <select
                  value={formData[field] || item[field] || ''}
                  onChange={(e) => handleChange(field, e.target.value ? parseInt(e.target.value) : null)}
                  className="px-4 py-3 w-full rounded-lg border-2 border-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Chọn GVCN (tùy chọn)</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.teacher_code} - {teacher.full_name}
                    </option>
                  ))}
                </select>
              ) : field === 'user_id' ? (
                <select
                  value={formData[field] || item[field] || ''}
                  onChange={(e) => handleChange(field, e.target.value ? parseInt(e.target.value) : null)}
                  className="px-4 py-3 w-full rounded-lg border-2 border-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Chọn user (tùy chọn)</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.email} - {user.full_name}
                    </option>
                  ))}
                </select>
              ) : field === 'semester' ? (
                <select
                  value={formData[field] || item[field] || ''}
                  onChange={(e) => handleChange(field, e.target.value)}
                  className="px-4 py-3 w-full rounded-lg border-2 border-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Chọn học kỳ</option>
                  <option value="HK1">Học kỳ 1</option>
                  <option value="HK2">Học kỳ 2</option>
                  <option value="HK3">Học kỳ 3</option>
                </select>
              ) : field === 'grade' ? (
                <select
                  value={formData[field] || item[field] || ''}
                  onChange={(e) => handleChange(field, e.target.value)}
                  className="px-4 py-3 w-full rounded-lg border-2 border-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Chọn khối</option>
                  <option value="10">Khối 10</option>
                  <option value="11">Khối 11</option>
                  <option value="12">Khối 12</option>
                </select>
              ) : field.includes('description') ? (
                <textarea
                  value={formData[field] || item[field] || ''}
                  onChange={(e) => handleChange(field, e.target.value)}
                  className="px-4 py-3 w-full rounded-lg border-2 border-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                />
              ) : (
                <input
                  type={field.includes('email') ? 'email' : field.includes('phone') ? 'tel' : 'text'}
                  value={formData[field] || item[field] || ''}
                  onChange={(e) => handleChange(field, e.target.value)}
                  className="px-4 py-3 w-full rounded-lg border-2 border-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required={field !== 'description' && field !== 'phone' && field !== 'homeroom_teacher' && field !== 'homeroom_teacher_id' && field !== 'user_id'}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-6 mt-8 space-x-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setShowAddForm(false);
              setFormData({});
              setShowPassword(false);
            }}
            className="px-6 py-3 font-medium text-gray-600 bg-gray-100 rounded-lg border border-gray-200 transition-all duration-200 hover:bg-gray-200"
          >
            <X className="inline mr-2 w-5 h-5" />
            Hủy
          </button>
          <button
            type="submit"
            className="px-6 py-3 font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg shadow-lg transition-all duration-200 transform hover:from-blue-600 hover:to-indigo-600 hover:scale-105"
          >
            <Save className="inline mr-2 w-5 h-5" />
            {isEdit ? 'Cập nhật' : 'Tạo mới'}
          </button>
        </div>
      </form>
    );
  };

  // Render Class Management tab
  const renderClassManagement = () => {
    return (
      <div className="space-y-6">
        {/* Filter Section */}
        <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-lg">
          <h3 className="mb-4 text-lg font-semibold text-gray-800">Bộ lọc lớp học</h3>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Class Selection */}
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-800">
                Chọn lớp học
              </label>
              <div className="relative">
                <select
                  value={selectedClassForManagement}
                  onChange={(e) => setSelectedClassForManagement(e.target.value)}
                  className="px-4 py-3 pr-10 w-full bg-white rounded-lg border-2 border-gray-200 transition-all duration-200 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="" disabled>Chọn lớp học</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name} - Khối {cls.grade}
                    </option>
                  ))}
                </select>
                <div className="flex absolute inset-y-0 right-0 items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Show Inactive Students */}
            <div className="flex items-end">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactiveStudents}
                  onChange={(e) => setShowInactiveStudents(e.target.checked)}
                  className="w-5 h-5 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Hiển thị học sinh đã xóa
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Homeroom Teacher Info */}
        {selectedClassForManagement && homeroomTeacher && (
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-lg">
            <h3 className="mb-2 text-lg font-semibold text-gray-800">Giáo viên chủ nhiệm</h3>
            <div className="flex items-center space-x-4">
              <div className="flex justify-center items-center w-12 h-12 bg-blue-500 rounded-full">
                <span className="text-lg font-bold text-white">
                  {homeroomTeacher.full_name?.charAt(0) || '?'}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {homeroomTeacher.full_name || homeroomTeacher.name}
                </p>
                {homeroomTeacher.code && (
                  <p className="text-sm text-gray-600">Mã GV: {homeroomTeacher.code}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Students Table */}
        {selectedClassForManagement && (
          <div className="overflow-hidden bg-white rounded-xl border border-gray-100 shadow-lg">
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">
                  Danh sách học sinh ({classStudents.length} học sinh)
                </h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loadingClassData ? (
                <div className="py-12 text-center">
                  <div className="mx-auto w-8 h-8 rounded-full border-4 border-blue-200 animate-spin border-t-blue-600"></div>
                  <p className="mt-2 text-gray-600">Đang tải danh sách học sinh...</p>
                </div>
              ) : classStudents.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-gray-100 rounded-full">
                    <span className="text-2xl text-gray-400">👥</span>
                  </div>
                  <p className="font-medium text-gray-500">
                    {showInactiveStudents ? 'Không có học sinh đã xóa' : 'Không có học sinh trong lớp này'}
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                        Mã HS
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                        Họ Tên
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                        Lớp
                      </th>
                      <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                        Trạng thái khuôn mặt
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      // Apply frontend pagination
                      const startIndex = (currentPage - 1) * classManagementPageSize;
                      const endIndex = startIndex + classManagementPageSize;
                      const paginatedStudents = classStudents.slice(startIndex, endIndex);
                      
                      return paginatedStudents.map((student, index) => (
                        <tr key={student.id} className={`hover:bg-blue-50 transition-colors duration-200 ${(startIndex + index) % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${student.is_active === false ? 'opacity-60' : ''}`}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                            {student.student_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 w-10 h-10">
                                <div className="flex justify-center items-center w-10 h-10 bg-blue-100 rounded-full">
                                  <span className="text-sm font-medium text-blue-600">
                                    {student.full_name?.charAt(0) || '?'}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {student.full_name}
                                </div>
                                {student.is_active === false && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    🗑️ Đã xóa
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                            {student.class_name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              student.face_encoding || student.insightface_encoding 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {student.face_encoding || student.insightface_encoding ? '✅ Đã đăng ký' : '❌ Chưa đăng ký'}
                            </span>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              )}
            </div>
            
            {/* Pagination for Class Management */}
            {(() => {
              const totalStudents = classStudents.length;
              const totalPages = Math.ceil(totalStudents / classManagementPageSize);
              
              if (totalPages <= 1) return null;
              
              return (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex flex-wrap gap-3 justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-700">
                        Hiển thị <span className="font-semibold">{((currentPage - 1) * classManagementPageSize) + 1}</span> đến <span className="font-semibold">{Math.min(currentPage * classManagementPageSize, totalStudents)}</span> trong tổng số <span className="font-semibold">{totalStudents}</span> học sinh
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-700">Số lượng/trang:</label>
                        <select
                          value={classManagementPageSize}
                          onChange={(e) => {
                            setClassManagementPageSize(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={30}>30</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        ← Trước
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                          const showPage = 
                            pageNum === 1 || 
                            pageNum === totalPages || 
                            (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);
                          
                          if (!showPage) {
                            if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                              return <span key={pageNum} className="px-2 text-gray-500">...</span>;
                            }
                            return null;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Sau →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header Section */}
      <div className="mb-8">
        <div className="p-6 bg-white rounded-xl border border-blue-100 shadow-lg">
          <h1 className="mb-2 text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            Quản trị hệ thống
          </h1>
          <p className="text-lg text-gray-600">Quản lý người dùng, lớp học, môn học và cấu hình hệ thống</p>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <div className="mb-8">
        <div className="overflow-hidden bg-white rounded-xl border border-gray-100 shadow-lg">
          <nav className="flex overflow-x-auto space-x-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-4 font-medium text-sm transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <span className="mr-3 text-lg">{tab.icon}</span>
                {tab.label}
                {activeTab === tab.id && (
                  <div className="ml-2 w-2 h-2 bg-white rounded-full animate-pulse"></div>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Enhanced Content */}
      {activeTab === 'class_management' ? (
        renderClassManagement()
      ) : (
        <div className="overflow-hidden bg-white rounded-xl border border-gray-100 shadow-lg">
          {/* Enhanced Header */}
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="mb-1 text-2xl font-bold text-gray-900">
                  {currentConfig?.title || 'Quản lý'}
                </h2>
                <p className="text-gray-600">Quản lý và cấu hình dữ liệu hệ thống</p>
              </div>
              {activeTab !== 'class_management' && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-6 py-3 font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg shadow-lg transition-all duration-200 transform hover:from-blue-600 hover:to-indigo-600 hover:scale-105"
                >
                  <Plus className="inline mr-2 w-5 h-5" />
                  Thêm mới
                </button>
              )}
            </div>

            {/* Enhanced Search */}
            {activeTab !== 'class_management' && (
              <div className="mt-6">
                <div className="relative max-w-md">
                  <Search className="absolute left-4 top-1/2 w-5 h-5 text-gray-400 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="py-3 pr-4 pl-12 w-full rounded-lg border-2 border-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

        {/* Enhanced Add Form */}
        {showAddForm && activeTab !== 'class_management' && (
          <div className="px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <div className="mb-4">
              <h3 className="mb-2 text-lg font-semibold text-gray-800">Thông tin mới</h3>
              <p className="text-sm text-gray-600">Nhập thông tin để tạo bản ghi mới</p>
            </div>
            {renderForm()}
          </div>
        )}

        {/* Enhanced Table */}
        {activeTab !== 'class_management' && (
          <div className="px-8 py-6">
          {loading ? (
            <div className="py-16 text-center">
              <div className="mx-auto w-12 h-12 rounded-full border-4 border-blue-200 animate-spin border-t-blue-600"></div>
              <p className="mt-4 font-medium text-gray-600">Đang tải dữ liệu...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full">
                <span className="text-2xl text-red-500">⚠️</span>
              </div>
              <p className="mb-4 font-medium text-red-600">{error}</p>
              <button
                onClick={loadData}
                className="px-6 py-3 font-medium text-white bg-blue-500 rounded-lg transition-colors duration-200 hover:bg-blue-600"
              >
                Thử lại
              </button>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="py-16 text-center">
              <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-gray-100 rounded-full">
                <span className="text-2xl text-gray-400">📋</span>
              </div>
              <p className="font-medium text-gray-500">Không có dữ liệu</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                  <tr>
                    {currentConfig?.displayFields?.map(field => (
                      <th
                        key={field}
                        className="px-6 py-4 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase"
                      >
                        {field.replace(/_/g, ' ')}
                      </th>
                    ))}
                    <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((item, index) => (
                    <React.Fragment key={item.id}>
                      <tr className={`hover:bg-blue-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        {currentConfig?.displayFields?.map(field => (
                          <td key={field} className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                            {typeof item[field] === 'boolean' ? 
                              (item[field] ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Có
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Không
                                </span>
                              )) : 
                              item[field] || '-'
                            }
                          </td>
                        ))}
                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setEditingItem(item.id);
                                setFormData(item);
                              }}
                              className="p-2 text-blue-600 bg-blue-100 rounded-lg transition-colors duration-200 hover:bg-blue-200"
                              title="Chỉnh sửa"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-red-600 bg-red-100 rounded-lg transition-colors duration-200 hover:bg-red-200"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {editingItem === item.id && (
                        <tr>
                          <td colSpan={(currentConfig?.displayFields?.length || 0) + 1} className="px-6 py-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="mb-4">
                              <h3 className="mb-2 text-lg font-semibold text-gray-800">Chỉnh sửa thông tin</h3>
                              <p className="text-sm text-gray-600">Cập nhật thông tin cho bản ghi này</p>
                            </div>
                            {renderForm(true, item)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        )}
        </div>
      )}
    </div>
  );
};

export default AdminManagement; 