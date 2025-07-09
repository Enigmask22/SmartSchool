import React, { useState, useEffect } from 'react';
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

  // Reference data cho dropdowns
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);

  // Configuration cho từng tab
  const tabConfig = {
    users: {
      title: 'Quản lý người dùng',
      fields: ['email', 'full_name', 'role'],
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
    { id: 'subject_teachers', label: 'GV-Môn học', icon: '👨‍🏫📚' },
    { id: 'class_subjects', label: 'Lớp-Môn học', icon: '🏫📚' }
  ];

  const currentConfig = tabConfig[activeTab];

  // Load dữ liệu khi đổi tab
  useEffect(() => {
    loadData();
    loadReferenceData();
  }, [activeTab]);

  const loadData = async () => {
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
  };

  // Load reference data cho dropdowns
  const loadReferenceData = async () => {
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
  };

  const handleCreate = async (data) => {
    try {
      const response = await api.request(currentConfig.endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (response.success) {
        loadData();
        setShowAddForm(false);
        setFormData({});
      } else {
        setError(response.message || 'Không thể tạo bản ghi');
      }
    } catch (err) {
      setError('Lỗi khi tạo bản ghi: ' + err.message);
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      const response = await api.request(`${currentConfig.endpoint}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      if (response.success) {
        loadData();
        setEditingItem(null);
        setFormData({});
      } else {
        setError(response.message || 'Không thể cập nhật bản ghi');
      }
    } catch (err) {
      setError('Lỗi khi cập nhật bản ghi: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) return;

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
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentConfig.fields.map(field => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </label>
              {field === 'role' ? (
                <select
                  value={formData[field] || item[field] || ''}
                  onChange={(e) => handleChange(field, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Chọn role</option>
                  <option value="admin">Admin</option>
                  <option value="teacher">Teacher</option>
                  <option value="homeroom_teacher">Homeroom Teacher</option>
                  <option value="staff">Staff</option>
                </select>
              ) : field === 'teacher_id' ? (
                <select
                  value={formData[field] || item[field] || ''}
                  onChange={(e) => handleChange(field, parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              ) : (
                <input
                  type={field.includes('email') ? 'email' : field.includes('phone') ? 'tel' : 'text'}
                  value={formData[field] || item[field] || ''}
                  onChange={(e) => handleChange(field, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={field !== 'description' && field !== 'phone' && field !== 'homeroom_teacher' && field !== 'homeroom_teacher_id' && field !== 'user_id'}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end space-x-2 mt-6">
          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setShowAddForm(false);
              setFormData({});
            }}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            <X className="w-4 h-4 inline mr-1" />
            Hủy
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Save className="w-4 h-4 inline mr-1" />
            {isEdit ? 'Cập nhật' : 'Tạo mới'}
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Quản trị hệ thống</h1>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {currentConfig.title}
            </h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 inline mr-1" />
              Thêm mới
            </button>
          </div>

          {/* Search */}
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            {renderForm()}
          </div>
        )}

        {/* Table */}
        <div className="px-6 py-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Đang tải dữ liệu...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
              <button
                onClick={loadData}
                className="mt-2 px-4 py-2 text-blue-600 hover:text-blue-800"
              >
                Thử lại
              </button>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Không có dữ liệu</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {currentConfig.displayFields.map(field => (
                      <th
                        key={field}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {field.replace(/_/g, ' ')}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-gray-50">
                        {currentConfig.displayFields.map(field => (
                          <td key={field} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {typeof item[field] === 'boolean' ? 
                              (item[field] ? 'Có' : 'Không') : 
                              item[field] || '-'
                            }
                          </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => {
                              setEditingItem(item.id);
                              setFormData(item);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 mr-2"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      {editingItem === item.id && (
                        <tr>
                          <td colSpan={currentConfig.displayFields.length + 1} className="px-6 py-4">
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
    </div>
  );
};

export default AdminManagement; 