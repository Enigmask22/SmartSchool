import React, { useState } from 'react';
import ApiService from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { X, Loader2, UserPlus } from 'lucide-react';
import logger from "../utils/logger";

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
      logger.error('Error creating student:', error);
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="w-6 h-6" />
            <span>Thêm học sinh mới</span>
          </DialogTitle>
          <DialogDescription>
            Điền thông tin để đăng ký học sinh mới vào hệ thống
          </DialogDescription>
        </DialogHeader>

        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Mã học sinh */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Mã học sinh *
                </label>
                <Input
                  type="text"
                  value={formData.student_id}
                  onChange={(e) => handleChange('student_id', e.target.value)}
                  className={errors.student_id ? 'border-red-500' : ''}
                  placeholder="VD: 250001"
                />
                {errors.student_id && (
                  <p className="text-sm text-red-500">{errors.student_id}</p>
                )}
              </div>

              {/* Họ tên */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Họ và tên *
                </label>
                <Input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  className={errors.full_name ? 'border-red-500' : ''}
                  placeholder="VD: Nguyễn Văn An"
                />
                {errors.full_name && (
                  <p className="text-sm text-red-500">{errors.full_name}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={errors.email ? 'border-red-500' : ''}
                  placeholder="VD: student@example.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Số điện thoại */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Số điện thoại
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="VD: 0123456789"
                />
              </div>

              {/* Lớp */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Lớp học *
                </label>
                <Input
                  type="text"
                  value={formData.class_name}
                  onChange={(e) => handleChange('class_name', e.target.value)}
                  className={errors.class_name ? 'border-red-500' : ''}
                  placeholder="VD: 10A1"
                />
                {errors.class_name && (
                  <p className="text-sm text-red-500">{errors.class_name}</p>
                )}
              </div>

              {/* Khối */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Khối *
                </label>
                <Select
                  value={formData.grade}
                  onValueChange={(value) => handleChange('grade', value)}
                >
                  <SelectTrigger className={errors.grade ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Chọn khối" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">Khối 10</SelectItem>
                    <SelectItem value="11">Khối 11</SelectItem>
                    <SelectItem value="12">Khối 12</SelectItem>
                  </SelectContent>
                </Select>
                {errors.grade && (
                  <p className="text-sm text-red-500">{errors.grade}</p>
                )}
              </div>

              {/* Giới tính */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Giới tính
                </label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleChange('gender', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nam">Nam</SelectItem>
                    <SelectItem value="Nữ">Nữ</SelectItem>
                    <SelectItem value="Khác">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ngày sinh */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Ngày sinh
                </label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleChange('date_of_birth', e.target.value)}
                />
              </div>

              {/* Tên phụ huynh */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Tên phụ huynh
                </label>
                <Input
                  type="text"
                  value={formData.parent_name}
                  onChange={(e) => handleChange('parent_name', e.target.value)}
                  placeholder="VD: Nguyễn Văn Bình"
                />
              </div>

              {/* SĐT phụ huynh */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  SĐT phụ huynh
                </label>
                <Input
                  type="tel"
                  value={formData.parent_phone}
                  onChange={(e) => handleChange('parent_phone', e.target.value)}
                  placeholder="VD: 0987654321"
                />
              </div>
            </div>

            {/* Địa chỉ */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Địa chỉ
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="VD: 123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end pt-6 space-x-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Đang thêm...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 w-4 h-4" />
                    Thêm học sinh
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentModal;