import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Save, X, Search, Users, Download } from 'lucide-react';
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
  
  // Reference data cho dropdowns
  const [teachers, setTeachers] = useState([]);
  const [homeroomTeachers, setHomeroomTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Import từ Users modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [importLoading, setImportLoading] = useState(false);

  // Configuration cho từng tab
  const tabConfig = {
    users: {
      title: 'Quản lý người dùng',
      fields: ['email', 'username', 'full_name', 'password', 'role'],
      displayFields: ['id', 'email', 'username', 'full_name', 'role', 'is_active'],
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
    { id: 'subject_teachers', label: 'GV-Môn học', icon: '👨‍🏫📚' },
    { id: 'class_subjects', label: 'GV-Lớp học', icon: '🏫📚' }
  ];

  const currentConfig = tabConfig[activeTab];

  // Function để generate password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setFormData(prev => ({ ...prev, password: newPassword }));
  };

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
      const [teachersRes, homeroomTeachersRes, subjectsRes, classesRes, usersRes] = await Promise.all([
        api.request('/admin/teachers'),
        api.request('/admin/teachers/homeroom'),
        api.request('/admin/subjects'),
        api.request('/admin/classes'),
        api.request('/admin/users')
      ]);

      if (teachersRes.success) setTeachers(teachersRes.data || []);
      if (homeroomTeachersRes.success) setHomeroomTeachers(homeroomTeachersRes.data || []);
      if (subjectsRes.success) setSubjects(subjectsRes.data || []);
      if (classesRes.success) setClasses(classesRes.data || []);
      if (usersRes.success) setUsers(usersRes.data || []);
    } catch (err) {
      console.error('Error loading reference data:', err);
    }
  }, []);

  // Load dữ liệu khi đổi tab
  useEffect(() => {
    loadData();
    loadReferenceData();
  }, [activeTab, loadData, loadReferenceData]);

  const handleCreate = async (data) => {
    if (!currentConfig?.endpoint) return;
    
    try {
      const response = await api.request(currentConfig.endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
      });

      if (response.success) {
        setShowAddForm(false);
        setFormData({});
        loadData();
        alert('Tạo thành công!');
      } else {
        setError(response.message || 'Không thể tạo bản ghi');
      }
    } catch (err) {
      setError('Lỗi khi tạo: ' + err.message);
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
        setEditingItem(null);
        setFormData({});
        loadData();
        alert('Cập nhật thành công!');
      } else {
        setError(response.message || 'Không thể cập nhật');
      }
    } catch (err) {
      setError('Lỗi khi cập nhật: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!currentConfig?.endpoint) return;
    
    if (!window.confirm('Bạn có chắc muốn xóa bản ghi này?')) return;
    
    try {
      const response = await api.request(`${currentConfig.endpoint}/${id}`, {
        method: 'DELETE'
      });

      if (response.success) {
        loadData();
        alert('Xóa thành công!');
      } else {
        setError(response.message || 'Không thể xóa');
      }
    } catch (err) {
      setError('Lỗi khi xóa: ' + err.message);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Load available users for import
  const loadAvailableUsers = async () => {
    try {
      const response = await api.request('/admin/users/teachers');
      if (response.success) {
        setAvailableUsers(response.data || []);
      } else {
        setError(response.message || 'Không thể tải danh sách users');
      }
    } catch (err) {
      setError('Lỗi khi tải danh sách users: ' + err.message);
    }
  };

  // Handle import teachers from users
  const handleImportTeachers = async () => {
    if (selectedUserIds.length === 0) {
      alert('Vui lòng chọn ít nhất một user để tạo giáo viên');
      return;
    }

    setImportLoading(true);
    try {
      const response = await api.request('/admin/teachers/import-from-users', {
        method: 'POST',
        body: JSON.stringify(selectedUserIds)
      });

      if (response.success) {
        setShowImportModal(false);
        setSelectedUserIds([]);
        loadData(); // Reload teachers list
        alert(`Tạo thành công ${response.data.length} giáo viên!`);
      } else {
        setError(response.message || 'Không thể tạo giáo viên');
      }
    } catch (err) {
      setError('Lỗi khi tạo giáo viên: ' + err.message);
    } finally {
      setImportLoading(false);
    }
  };

  // Handle user selection
  const handleUserSelect = (userId) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Handle select all users
  const handleSelectAllUsers = () => {
    if (selectedUserIds.length === availableUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(availableUsers.map(user => user.id));
    }
  };

  const filteredData = data.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return Object.values(item).some(value => 
      String(value).toLowerCase().includes(searchLower)
    );
  });

  const renderForm = (isEdit = false, item = null) => {
    
    return (
      <form onSubmit={(e) => {
        e.preventDefault();
        if (isEdit) {
          handleUpdate(item.id, formData);
        } else {
          handleCreate(formData);
        }
      }} className="space-y-4">
        {currentConfig?.fields?.map(field => (
          <div key={field}>
            <label className="block mb-2 text-sm font-semibold text-gray-800">
              {field === 'password' ? 'Mật khẩu' : 
               field === 'full_name' ? 'Họ tên' :
               field === 'username' ? 'Username' :
               field === 'email' ? 'Email' :
               field === 'role' ? 'Vai trò' :
               field === 'teacher_code' ? 'Mã giáo viên' :
               field === 'subject_code' ? 'Mã môn học' :
               field === 'subject_name' ? 'Tên môn học' :
               field === 'class_name' ? 'Tên lớp' :
               field === 'room_number' ? 'Số phòng' :
               field === 'academic_year' ? 'Năm học' :
               field === 'teacher_id' ? 'Giáo viên' :
               field === 'subject_id' ? 'Môn học' :
               field === 'class_id' ? 'Lớp học' :
               field === 'homeroom_teacher_id' ? 'Giáo viên chủ nhiệm' :
               field.replace(/_/g, ' ')}
              {field !== 'description' && field !== 'phone' && field !== 'homeroom_teacher' && field !== 'homeroom_teacher_id' && field !== 'user_id' && field !== 'username' ? ' *' : ''}
            </label>
            
            {field === 'role' ? (
              <select
                value={formData[field] || item?.[field] || ''}
                onChange={(e) => handleChange(field, e.target.value)}
                className="px-4 py-3 w-full rounded-lg border-2 border-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Chọn vai trò</option>
                <option value="teacher">Giáo viên</option>
                <option value="homeroom_teacher">Giáo viên chủ nhiệm</option>
              </select>
            ) : field === 'teacher_id' ? (
              <select
                value={formData[field] || item?.[field] || ''}
                onChange={(e) => handleChange(field, e.target.value ? parseInt(e.target.value) : null)}
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
                value={formData[field] || item?.[field] || ''}
                onChange={(e) => handleChange(field, e.target.value ? parseInt(e.target.value) : null)}
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
                value={formData[field] || item?.[field] || ''}
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
                value={formData[field] || item?.[field] || ''}
                onChange={(e) => handleChange(field, e.target.value ? parseInt(e.target.value) : null)}
                className="px-4 py-3 w-full rounded-lg border-2 border-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Chọn GVCN (tùy chọn)</option>
                {homeroomTeachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.teacher_code} - {teacher.full_name}
                  </option>
                ))}
              </select>
            ) : field === 'user_id' ? (
              <select
                value={formData[field] || item?.[field] || ''}
                onChange={(e) => handleChange(field, e.target.value ? parseInt(e.target.value) : null)}
                className="px-4 py-3 w-full rounded-lg border-2 border-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Chọn người dùng (tùy chọn)</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.email} - {user.full_name}
                  </option>
                ))}
              </select>
            ) : field === 'semester' ? (
              <select
                value={formData[field] || item?.[field] || ''}
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
                value={formData[field] || item?.[field] || ''}
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
                value={formData[field] || item?.[field] || ''}
                onChange={(e) => handleChange(field, e.target.value)}
                className="px-4 py-3 w-full rounded-lg border-2 border-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
              />
            ) : field === 'password' && isEdit ? (
              // Bỏ trường password khi edit
              <div className="px-4 py-3 text-sm text-gray-500 bg-gray-100 rounded-lg border-2 border-gray-200">
                Mật khẩu không thể thay đổi ở đây. Người dùng có thể tự đổi mật khẩu trong phần cài đặt.
              </div>
            ) : (
              <div className="relative">
                <input
                  type={field.includes('email') ? 'email' : field.includes('phone') ? 'tel' : field === 'password' ? (showPassword ? 'text' : 'password') : 'text'}
                  value={formData[field] || item?.[field] || ''}
                  onChange={(e) => handleChange(field, e.target.value)}
                  className="px-4 py-3 w-full rounded-lg border-2 border-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={field === 'username' ? 'ho_va_ten.ten_truong.ten_tinh' : ''}
                  required={field !== 'description' && field !== 'phone' && field !== 'homeroom_teacher' && field !== 'homeroom_teacher_id' && field !== 'user_id' && field !== 'username'}
                />
                {field === 'password' && !isEdit && (
                  <div className="flex absolute right-2 top-1/2 space-x-1 transform -translate-y-1/2">
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="px-2 py-1 text-xs text-green-700 bg-green-100 rounded transition-colors hover:bg-green-200"
                      title="Tạo mật khẩu tự động"
                    >
                      🎲
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded transition-colors hover:bg-blue-200"
                      title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {field === 'username' && (
              <p className="mt-1 text-xs text-gray-500">
                Tùy chọn. Format: tên.school.province (VD: nguyen_thi_lan.chuyen_le_quy_don.tphcm)
              </p>
            )}
          </div>
        ))}
        
        <div className="flex justify-end pt-6 mt-8 space-x-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              if (isEdit) {
                setEditingItem(null);
              } else {
              setShowAddForm(false);
            }
            setFormData({});
            setShowPassword(false);
            }}
            className="px-6 py-3 font-medium text-gray-700 bg-gray-100 rounded-lg transition-colors duration-200 hover:bg-gray-200"
          >
            <X className="inline mr-2 w-4 h-4" />
            Hủy
          </button>
          <button
            type="submit"
            className="px-6 py-3 font-medium text-white bg-blue-600 rounded-lg transition-colors duration-200 hover:bg-blue-700"
          >
            <Save className="inline mr-2 w-4 h-4" />
            {isEdit ? 'Cập nhật' : 'Tạo mới'}
          </button>
        </div>
      </form>
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
            <div className="flex space-x-3">
              {activeTab === 'teachers' && (
                <button
                  onClick={() => {
                    setShowImportModal(true);
                    loadAvailableUsers();
                  }}
                  className="px-6 py-3 font-medium text-white bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg shadow-lg transition-all duration-200 transform hover:from-green-600 hover:to-emerald-600 hover:scale-105"
                >
                  <Download className="inline mr-2 w-5 h-5" />
                  Import từ Users
                </button>
              )}
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg shadow-lg transition-all duration-200 transform hover:from-blue-600 hover:to-indigo-600 hover:scale-105"
              >
                <Plus className="inline mr-2 w-5 h-5" />
                Thêm mới
              </button>
            </div>
          </div>

          {/* Enhanced Search */}
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
        </div>

        {/* Enhanced Add Form */}
        {showAddForm && (
          <div className="px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <div className="mb-4">
              <h3 className="mb-2 text-lg font-semibold text-gray-800">Thông tin mới</h3>
              <p className="text-sm text-gray-600">Nhập thông tin để tạo bản ghi mới</p>
            </div>
            {renderForm()}
          </div>
        )}

        {/* Enhanced Table */}
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
                        {field === 'username' ? 'USERNAME' :
                         field === 'full_name' ? 'HỌ TÊN' :
                         field === 'is_active' ? 'TRẠNG THÁI' :
                         field.replace(/_/g, ' ').toUpperCase()}
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
      </div>

      {/* Import từ Users Modal */}
      {showImportModal && (
        <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white rounded-xl shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Import giáo viên từ Users</h3>
                  <p className="text-sm text-gray-600">Chọn những user có role teacher hoặc homeroom_teacher để tạo thành giáo viên</p>
                </div>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setSelectedUserIds([]);
                  }}
                  className="p-2 text-gray-400 rounded-lg transition-colors hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
              {availableUsers.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-gray-100 rounded-full">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-500">Không có user nào có thể import</p>
                  <p className="mt-2 text-sm text-gray-400">
                    Tất cả users có role teacher/homeroom_teacher đã được tạo thành giáo viên
                  </p>
                </div>
              ) : (
                <>
                  {/* Select All */}
                  <div className="p-3 mb-4 bg-blue-50 rounded-lg border border-blue-200">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.length === availableUsers.length && availableUsers.length > 0}
                        onChange={handleSelectAllUsers}
                        className="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="ml-3 font-medium text-blue-800">
                        Chọn tất cả ({availableUsers.length} users)
                      </span>
                    </label>
                  </div>

                  {/* Users List */}
                  <div className="space-y-2">
                    {availableUsers.map((user) => (
                      <div
                        key={user.id}
                        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          selectedUserIds.includes(user.id)
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => handleUserSelect(user.id)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(user.id)}
                              onChange={() => handleUserSelect(user.id)}
                              className="w-4 h-4 text-green-600 bg-gray-100 rounded border-gray-300 focus:ring-green-500 focus:ring-2"
                            />
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-gray-900">{user.full_name}</h4>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  user.role === 'teacher' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {user.role === 'teacher' ? 'Teacher' : 'Homeroom Teacher'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{user.email}</p>
                              {user.username && (
                                <p className="text-xs text-gray-500">@{user.username}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">ID: {user.id}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Đã chọn: <span className="font-medium text-green-600">{selectedUserIds.length}</span> users
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setSelectedUserIds([]);
                    }}
                    className="px-4 py-2 font-medium text-gray-700 bg-white rounded-lg border border-gray-300 transition-colors hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleImportTeachers}
                    disabled={selectedUserIds.length === 0 || importLoading}
                    className="flex items-center px-6 py-2 font-medium text-white bg-green-600 rounded-lg transition-colors hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {importLoading ? (
                      <>
                        <div className="mr-2 w-4 h-4 rounded-full border-2 border-white animate-spin border-t-transparent"></div>
                        Đang tạo...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 w-4 h-4" />
                        Tạo {selectedUserIds.length} giáo viên
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;