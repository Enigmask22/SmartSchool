import React, { useState } from 'react';
import ApiService from '../services/api';

const AddStudentModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    student_id: '',
    full_name: '',
    email: '',
    phone: '',
    class_name: '',
    grade: '',
    date_of_birth: '',
    address: '',
    parent_name: '',
    parent_phone: '',
    gender: 'Nam'
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.student_id.trim()) {
      newErrors.student_id = 'Mã học sinh là bắt buộc';
    }
    
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Họ tên là bắt buộc';
    }
    
    if (!formData.class_name.trim()) {
      newErrors.class_name = 'Lớp học là bắt buộc';
    }
    
    if (!formData.grade.trim()) {
      newErrors.grade = 'Khối là bắt buộc';
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      // Filter out empty strings
      const cleanData = {};
      Object.keys(formData).forEach(key => {
        const value = formData[key];
        if (value !== '' && value !== null && value !== undefined) {
          cleanData[key] = value;
        }
      });
      
      await ApiService.createStudent(cleanData);
      
      // Reset form
      setFormData({
        student_id: '',
        full_name: '',
        email: '',
        phone: '',
        class_name: '',
        grade: '',
        date_of_birth: '',
        address: '',
        parent_name: '',
        parent_phone: '',
        gender: 'Nam'
      });
      
      onSuccess && onSuccess();
      onClose();
      
      // Show success message
      alert('Thêm học sinh thành công!');
      
    } catch (error) {
      console.error('Error creating student:', error);
      alert('Có lỗi xảy ra khi thêm học sinh: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      student_id: '',
      full_name: '',
      email: '',
      phone: '',
      class_name: '',
      grade: '',
      date_of_birth: '',
      address: '',
      parent_name: '',
      parent_phone: '',
      gender: 'Nam'
    });
    setErrors({});
    onClose();
  };

  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
      <div className="overflow-y-auto p-6 mx-4 w-full max-w-4xl max-h-screen bg-white rounded-xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Thêm học sinh mới</h2>
            <p className="text-gray-600">Điền thông tin để đăng ký học sinh mới vào hệ thống</p>
          </div>
          <button
            onClick={handleClose}
            className="text-3xl text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Mã học sinh */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Mã học sinh *
              </label>
              <input
                type="text"
                value={formData.student_id}
                onChange={(e) => handleChange('student_id', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.student_id ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="VD: 250001"
              />
              {errors.student_id && (
                <p className="mt-1 text-sm text-red-500">{errors.student_id}</p>
              )}
            </div>

            {/* Họ tên */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Họ và tên *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.full_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="VD: Nguyễn Văn An"
              />
              {errors.full_name && (
                <p className="mt-1 text-sm text-red-500">{errors.full_name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="VD: student@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Số điện thoại */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Số điện thoại
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="px-4 py-3 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: 0123456789"
              />
            </div>

            {/* Lớp */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Lớp học *
              </label>
              <input
                type="text"
                value={formData.class_name}
                onChange={(e) => handleChange('class_name', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.class_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="VD: 10A1"
              />
              {errors.class_name && (
                <p className="mt-1 text-sm text-red-500">{errors.class_name}</p>
              )}
            </div>

            {/* Khối */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Khối *
              </label>
              <select
                value={formData.grade}
                onChange={(e) => handleChange('grade', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.grade ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Chọn khối</option>
                <option value="10">Khối 10</option>
                <option value="11">Khối 11</option>
                <option value="12">Khối 12</option>
              </select>
              {errors.grade && (
                <p className="mt-1 text-sm text-red-500">{errors.grade}</p>
              )}
            </div>

            {/* Giới tính */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Giới tính
              </label>
              <select
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            {/* Ngày sinh */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Ngày sinh
              </label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => handleChange('date_of_birth', e.target.value)}
                className="px-4 py-3 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tên phụ huynh */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Tên phụ huynh
              </label>
              <input
                type="text"
                value={formData.parent_name}
                onChange={(e) => handleChange('parent_name', e.target.value)}
                className="px-4 py-3 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: Nguyễn Văn Bình"
              />
            </div>

            {/* SĐT phụ huynh */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                SĐT phụ huynh
              </label>
              <input
                type="tel"
                value={formData.parent_phone}
                onChange={(e) => handleChange('parent_phone', e.target.value)}
                className="px-4 py-3 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: 0987654321"
              />
            </div>
          </div>

          {/* Địa chỉ */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Địa chỉ
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              rows={3}
              className="px-4 py-3 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="VD: 123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end pt-6 space-x-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 font-medium text-gray-700 bg-gray-100 rounded-lg transition-colors hover:bg-gray-200"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-8 py-3 space-x-2 font-medium text-white bg-green-600 rounded-lg transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-b-2 border-white animate-spin"></div>
                  <span>Đang thêm...</span>
                </>
              ) : (
                <>
                  <span>➕</span>
                  <span>Thêm học sinh</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStudentModal; 