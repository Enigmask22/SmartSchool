import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Upload, Download, Users, GraduationCap, UserCheck, AlertCircle, Loader2, Trash2, Edit, RefreshCw, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import api from '../services/api';
import * as XLSX from 'xlsx';

const ClassManagement = () => {
  // States cho Class Management
  const [selectedClassForManagement, setSelectedClassForManagement] = useState('');
  const [showInactiveStudents, setShowInactiveStudents] = useState(false);
  const [classStudents, setClassStudents] = useState([]);
  const [homeroomTeacher, setHomeroomTeacher] = useState(null);
  const [loadingClassData, setLoadingClassData] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit student states
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  
  // States cho thêm học sinh
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [studentFormData, setStudentFormData] = useState({
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
  const [studentFormErrors, setStudentFormErrors] = useState({});
  const [studentFormLoading, setStudentFormLoading] = useState(false);
  
  // Pagination states cho Class Management
  const [currentPage, setCurrentPage] = useState(1);
  const [classManagementPageSize, setClassManagementPageSize] = useState(10); // 10 học sinh mỗi trang

  // States cho import học sinh bằng file
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedData, setImportedData] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [importLoading, setImportLoading] = useState(false);

  // Reference data cho dropdowns
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState(null);

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

  // Hàm tự động tạo mã học sinh
  const generateStudentId = useCallback(async (grade) => {
    try {
      // Xác định năm học dựa trên khối
      const currentYear = new Date().getFullYear();
      let yearPrefix;
      
      if (grade === '10') {
        yearPrefix = currentYear.toString().slice(-2); // 2025 -> 25
      } else if (grade === '11') {
        yearPrefix = (currentYear - 1).toString().slice(-2); // 2024 -> 24
      } else if (grade === '12') {
        yearPrefix = (currentYear - 2).toString().slice(-2); // 2023 -> 23
      } else {
        throw new Error('Khối học không hợp lệ');
      }

      // Query tất cả học sinh có mã bắt đầu bằng yearPrefix
      const response = await api.request(`/admin/students/by-grade?grade=${grade}`);
      if (response.success) {
        const students = response.data || [];
        
        // Lọc các học sinh có mã bắt đầu bằng yearPrefix và sắp xếp
        const filteredStudents = students
          .filter(student => student.student_id && student.student_id.startsWith(yearPrefix))
          .map(student => parseInt(student.student_id))
          .filter(id => !isNaN(id))
          .sort((a, b) => a - b);
        
        // Tìm mã tiếp theo
        let nextId = parseInt(yearPrefix + '0001');
        if (filteredStudents.length > 0) {
          const maxId = Math.max(...filteredStudents);
          nextId = maxId + 1;
        }
        
        return nextId.toString();
      }
    } catch (error) {
      console.error('Error generating student ID:', error);
      // Fallback: tạo mã dựa trên thời gian hiện tại
      const currentYear = new Date().getFullYear();
      let yearPrefix;
      if (grade === '10') yearPrefix = currentYear.toString().slice(-2);
      else if (grade === '11') yearPrefix = (currentYear - 1).toString().slice(-2);
      else if (grade === '12') yearPrefix = (currentYear - 2).toString().slice(-2);
      else yearPrefix = currentYear.toString().slice(-2);
      
      return yearPrefix + Date.now().toString().slice(-4);
    }
  }, []);

  // Hàm xử lý thay đổi form học sinh
  const handleStudentFormChange = (field, value) => {
    setStudentFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (studentFormErrors[field]) {
      setStudentFormErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  // Hàm validate form học sinh
  const validateStudentForm = () => {
    const newErrors = {};
    
    if (!studentFormData.full_name.trim()) {
      newErrors.full_name = 'Họ tên là bắt buộc';
    }
    
    if (!studentFormData.class_name.trim()) {
      newErrors.class_name = 'Lớp học là bắt buộc';
    }
    
    if (!studentFormData.grade.trim()) {
      newErrors.grade = 'Khối là bắt buộc';
    }
    
    if (studentFormData.email && !/\S+@\S+\.\S+/.test(studentFormData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }
    
    setStudentFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Hàm submit form học sinh
  const handleSubmitStudentForm = async (e) => {
    e.preventDefault();
    
    if (!validateStudentForm()) {
      return;
    }
    
    setStudentFormLoading(true);
    try {
      // Tự động tạo mã học sinh
      const studentId = await generateStudentId(studentFormData.grade);
      
      // Chuẩn bị dữ liệu để gửi
      const studentData = {
        student_id: studentId,
        ...studentFormData
      };
      
      // Filter out empty strings
      const cleanData = {};
      Object.keys(studentData).forEach(key => {
        const value = studentData[key];
        if (value !== '' && value !== null && value !== undefined) {
          cleanData[key] = value;
        }
      });
      
      const response = await api.request('/admin/students', {
        method: 'POST',
        body: JSON.stringify(cleanData)
      });
      
      if (response.success) {
        // Reset form
        setStudentFormData({
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
        setStudentFormErrors({});
        setShowAddStudentModal(false);
        
        // Reload danh sách học sinh
        loadClassStudents();
        
        alert('Thêm học sinh thành công!');
      } else {
        setError(response.message || 'Không thể thêm học sinh');
      }
    } catch (error) {
      console.error('Error creating student:', error);
      setError('Có lỗi xảy ra khi thêm học sinh: ' + error.message);
    } finally {
      setStudentFormLoading(false);
    }
  };

  // Hàm đóng modal thêm học sinh
  const handleCloseAddStudentModal = () => {
    setStudentFormData({
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
    setStudentFormErrors({});
    setShowAddStudentModal(false);
  };

  // Hàm download template cho import học sinh
  const downloadStudentTemplate = () => {
    // Tạo dữ liệu mẫu
    const templateData = [
      {
        'ho_va_ten': 'Nguyễn Văn A',
        'email': 'nguyenvana@example.com',
        'so_dien_thoai': '0123456789',
        'lop_hoc': '10A1',
        'khoi': '10',
        'ngay_sinh': '2006-01-01',
        'gioi_tinh': 'Nam',
        'ten_phu_huynh': 'Nguyễn Văn B',
        'sdt_phu_huynh': '0987654321',
        'dia_chi': 'TP.HCM',
      }
    ];

    // Tạo workbook
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách học sinh');

    // Download file
    XLSX.writeFile(wb, 'template_hoc_sinh.xlsx');
  };

  // Hàm xử lý upload file
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Validate format
        const errors = [];
        const validData = [];

        if (jsonData.length === 0) {
          alert('❌ File không có dữ liệu!');
          return;
        }

        // Kiểm tra cột bắt buộc
        const requiredColumns = ['ho_va_ten', 'lop_hoc', 'khoi'];
        const firstRow = jsonData[0];
        const missingColumns = requiredColumns.filter(col => !(col in firstRow));

        if (missingColumns.length > 0) {
          alert(`❌ File thiếu các cột bắt buộc: ${missingColumns.join(', ')}\n\nVui lòng tải template để có đúng định dạng!`);
          return;
        }

        // Validate từng dòng
        jsonData.forEach((row, index) => {
          const rowErrors = [];
          
          // Kiểm tra các trường bắt buộc
          if (!row.ho_va_ten || row.ho_va_ten.toString().trim() === '') {
            rowErrors.push('Họ tên không được để trống');
          }
          
          if (!row.lop_hoc || row.lop_hoc.toString().trim() === '') {
            rowErrors.push('Lớp học không được để trống');
          }
          
          if (!row.khoi || row.khoi.toString().trim() === '') {
            rowErrors.push('Khối không được để trống');
          }

          // Kiểm tra định dạng email
          if (row.email && row.email.toString().trim() !== '') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(row.email.toString().trim())) {
              rowErrors.push('Email không hợp lệ');
            }
          }

          // Kiểm tra khối học
          if (row.khoi && !['10', '11', '12'].includes(row.khoi.toString())) {
            rowErrors.push('Khối học phải là 10, 11 hoặc 12');
          }

          // Kiểm tra giới tính
          if (row.gioi_tinh && row.gioi_tinh.toString().trim() !== '') {
            const validGenders = ['Nam', 'Nữ', 'Khác'];
            if (!validGenders.includes(row.gioi_tinh.toString().trim())) {
              rowErrors.push('Giới tính phải là: Nam, Nữ, hoặc Khác');
            }
          }

          if (rowErrors.length > 0) {
            errors.push({
              row: index + 2, // +2 vì Excel bắt đầu từ 1 và có header
              student_name: row.ho_va_ten || 'Unknown',
              errors: rowErrors
            });
          } else {
            validData.push({
              ho_va_ten: row.ho_va_ten.toString().trim(),
              email: row.email ? row.email.toString().trim() : null,
              so_dien_thoai: row.so_dien_thoai ? row.so_dien_thoai.toString().trim() : null,
              lop_hoc: row.lop_hoc.toString().trim(),
              khoi: row.khoi.toString().trim(),
              ngay_sinh: row.ngay_sinh ? row.ngay_sinh.toString().trim() : null,
              ten_phu_huynh: row.ten_phu_huynh ? row.ten_phu_huynh.toString().trim() : null,
              sdt_phu_huynh: row.sdt_phu_huynh ? row.sdt_phu_huynh.toString().trim() : null,
              dia_chi: row.dia_chi ? row.dia_chi.toString().trim() : null,
              gioi_tinh: row.gioi_tinh ? row.gioi_tinh.toString().trim() : 'Nam'
            });
          }
        });

        if (errors.length > 0) {
          setImportErrors(errors);
          alert(`❌ File có ${errors.length} lỗi. Vui lòng kiểm tra!`);
          return;
        }

        setImportedData(validData);
        setImportErrors([]);
        setShowImportModal(true);

      } catch (error) {
        console.error('Error parsing file:', error);
        alert('❌ Lỗi khi đọc file! Vui lòng kiểm tra định dạng file.');
      }
    };

    reader.readAsArrayBuffer(file);
    // Reset input để có thể upload lại cùng file
    event.target.value = '';
  };

  // Hàm confirm import
  const handleConfirmImport = async () => {
    if (importedData.length === 0) {
      alert('Không có dữ liệu để import!');
      return;
    }

    try {
      setImportLoading(true);

      const importPayload = {
        students: importedData
      };

      const response = await api.bulkImportStudents(importPayload);

      if (response.success) {
        alert(`✅ ${response.message}\n\nThành công: ${response.data.success_count} học sinh${response.data.error_count > 0 ? `\nLỗi: ${response.data.error_count} học sinh` : ''}`);
        
        if (response.data.errors && response.data.errors.length > 0) {
          console.log('Import errors:', response.data.errors);
        }

        // Refresh data
        if (selectedClassForManagement) {
          loadClassStudents();
        }
        setShowImportModal(false);
        setImportedData([]);
        setImportErrors([]);
      } else {
        alert('❌ Lỗi khi import học sinh: ' + response.message);
      }
    } catch (error) {
      console.error('Error importing students:', error);
      alert('❌ Lỗi khi import học sinh!');
    } finally {
      setImportLoading(false);
    }
  };

  // Hàm đóng modal import
  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setImportedData([]);
    setImportErrors([]);
  };

  // Load dữ liệu khi component mount
  useEffect(() => {
    loadClassManagementData();
  }, [loadClassManagementData]);

  // Load học sinh khi chọn lớp
  useEffect(() => {
    if (selectedClassForManagement) {
      loadClassStudents();
    }
  }, [selectedClassForManagement, loadClassStudents]);

  // Reset trang khi search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Hàm xử lý xóa học sinh
  const handleDeleteStudent = async (studentId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa học sinh này?')) {
      try {
        const response = await api.deleteStudent(studentId);
        if (response.success) {
          alert('Xóa học sinh thành công!');
          loadClassStudents(); // Reload danh sách học sinh
        } else {
          alert(`Lỗi: ${response.message || 'Không thể xóa học sinh'}`);
        }
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Có lỗi xảy ra khi xóa học sinh: ' + error.message);
      }
    }
  };

  // Hàm xử lý sửa học sinh
  const handleEditStudent = (student) => {
    setSelectedStudentForEdit(student);
    setEditForm({
      full_name: student.full_name || '',
      email: student.email || '',
      phone: student.phone || '',
      class_name: student.class_name || '',
      grade: student.grade || '',
      date_of_birth: student.date_of_birth || '',
      address: student.address || '',
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      gender: student.gender || 'Nam'
    });
    setShowEditModal(true);
  };

  // Hàm xử lý khôi phục học sinh
  const handleRestore = async (student) => {
    console.log('Restore button clicked for student:', student);
    
    if (window.confirm(`Bạn có chắc chắn muốn khôi phục học sinh ${student.full_name}?`)) {
      setRestoreLoading(true);
      try {
        console.log('Sending restore request for student ID:', student.id);
        const response = await api.restoreStudent(student.id);
        console.log('Restore response:', response);
        
        if (response.success) {
          alert('Khôi phục học sinh thành công!');
          loadClassStudents(); // Refresh danh sách học sinh
        } else {
          alert(`Lỗi: ${response.message || 'Không thể khôi phục học sinh'}`);
        }
      } catch (error) {
        console.error('Error restoring student:', error);
        alert('Có lỗi xảy ra khi khôi phục học sinh: ' + error.message);
      } finally {
        setRestoreLoading(false);
      }
    }
  };

  // Hàm xử lý thay đổi form edit
  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Hàm submit edit form
  const submitEditForm = async () => {
    if (!selectedStudentForEdit || !editForm.full_name.trim()) {
      alert('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    setEditLoading(true);
    try {
      console.log('Updating student:', selectedStudentForEdit.id, editForm);
      const response = await api.updateStudent(selectedStudentForEdit.id, editForm);
      console.log('Update response:', response);
      
      if (response.success) {
        alert('Cập nhật thông tin học sinh thành công!');
        
        // Fetch students để cập nhật danh sách
        await loadClassStudents();
        
        // Đóng modal sau khi đã fetch xong
        setShowEditModal(false);
        setSelectedStudentForEdit(null);
        setEditForm({});
      } else {
        alert(`Lỗi: ${response.message || 'Không thể cập nhật thông tin học sinh'}`);
      }
    } catch (error) {
      console.error('Error updating student:', error);
      alert('Có lỗi xảy ra khi cập nhật thông tin học sinh');
    } finally {
      setEditLoading(false);
    }
  };

  // Hàm đóng edit modal
  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedStudentForEdit(null);
    setEditForm({});
  };

  // Filter and pagination logic
  const filteredStudents = classStudents.filter(student => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      student.full_name?.toLowerCase().includes(searchLower) ||
      student.student_id?.toLowerCase().includes(searchLower) ||
      student.class_name?.toLowerCase().includes(searchLower)
    );
  });

  const totalStudents = filteredStudents.length;
  const totalPages = Math.ceil(totalStudents / classManagementPageSize);
  const startIndex = (currentPage - 1) * classManagementPageSize;
  const endIndex = startIndex + classManagementPageSize;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <GraduationCap className="w-8 h-8 text-primary" />
            <span className="text-3xl font-bold">Quản trị lớp học</span>
          </CardTitle>
          <CardDescription className="text-lg">
            Quản lý học sinh và lớp học trong hệ thống
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Class Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc lớp học</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6 items-start sm:flex-row sm:items-end">
            {/* Class Selection */}
            <div className="flex-1 space-y-2">
              <Label htmlFor="class-select" className="text-sm font-medium">
                Chọn lớp học
              </Label>
              <select
                id="class-select"
                value={selectedClassForManagement}
                onChange={(e) => setSelectedClassForManagement(e.target.value)}
                className="px-4 py-3 w-full rounded-lg border sm:w-64 border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              >
                <option value="">Chọn lớp học</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class_name} - Khối {cls.grade}
                  </option>
                ))}
              </select>
            </div>

            {/* Show Inactive Students */}
            <div className="flex items-center mt-2 space-x-2 sm:mt-0">
              <input
                type="checkbox"
                id="show-inactive"
                checked={showInactiveStudents}
                onChange={(e) => setShowInactiveStudents(e.target.checked)}
                className="w-4 h-4 rounded text-primary bg-background border-input focus:ring-2 focus:ring-ring"
              />
              <Label htmlFor="show-inactive" className="text-sm font-medium cursor-pointer">
                Hiển thị học sinh đã xóa
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Homeroom Teacher Info */}
      {selectedClassForManagement && homeroomTeacher && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-primary" />
              <span>Giáo viên chủ nhiệm</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="flex justify-center items-center w-12 h-12 rounded-full bg-primary">
                <span className="text-lg font-bold text-primary-foreground">
                  {homeroomTeacher.full_name?.charAt(0) || '?'}
                </span>
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {homeroomTeacher.full_name || homeroomTeacher.name}
                </p>
                {homeroomTeacher.code && (
                  <p className="text-sm text-muted-foreground">Mã GV: {homeroomTeacher.code}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Students Table */}
      {selectedClassForManagement && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Danh sách học sinh</span>
                </CardTitle>
                <CardDescription>
                  {totalStudents} học sinh {searchTerm && `(tìm kiếm: "${searchTerm}")`}
                </CardDescription>
                
                {/* Search Bar */}
                <div className="mt-4 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 w-4 h-4 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Tìm kiếm theo tên, mã học sinh hoặc lớp..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="py-2 pr-4 pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={downloadStudentTemplate}
                  className="flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải template</span>
                </Button>
                
                <Button
                  variant="outline"
                  asChild
                  className="flex items-center space-x-2"
                >
                  <label className="cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Nhập từ file</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </Button>

                <Button
                  onClick={() => setShowAddStudentModal(true)}
                  className="flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm học sinh</span>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loadingClassData ? (
              <div className="py-12 text-center">
                <Loader2 className="mx-auto w-8 h-8 animate-spin text-primary" />
                <p className="mt-4 font-medium text-muted-foreground">Đang tải dữ liệu...</p>
              </div>
            ) : error ? (
              <div className="py-12 text-center">
                <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <p className="mb-4 font-medium text-destructive">{error}</p>
                <Button onClick={loadClassStudents}>
                  Thử lại
                </Button>
              </div>
            ) : paginatedStudents.length === 0 ? (
              <div className="py-12 text-center">
                <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 rounded-full bg-muted">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="font-medium text-muted-foreground">Chưa có học sinh nào trong lớp này</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>MÃ HS</TableHead>
                      <TableHead>HỌ TÊN</TableHead>
                      <TableHead>LỚP</TableHead>
                      <TableHead>TRẠNG THÁI KHUÔN MẶT</TableHead>
                      <TableHead>HÀNH ĐỘNG</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.student_id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="flex justify-center items-center w-8 h-8 rounded-full bg-primary">
                              <span className="text-sm font-bold text-primary-foreground">
                                {student.full_name?.charAt(0) || '?'}
                              </span>
                            </div>
                            <span>{student.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{student.class_name}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            ✗ Chưa đăng ký
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {student.is_active === false ? (
                              // Actions for deleted students (restore only)
                              <Button
                                onClick={() => handleRestore(student)}
                                disabled={restoreLoading}
                                variant="outline"
                                size="sm"
                                className="flex items-center space-x-1 text-green-600 hover:text-green-600 hover:bg-green-50 hover:border-green-200"
                              >
                                {restoreLoading ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Đang khôi phục...</span>
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="w-3 h-3" />
                                    <span>Khôi phục</span>
                                  </>
                                )}
                              </Button>
                            ) : (
                              // Actions for active students (edit and delete)
                              <>
                                <Button
                                  onClick={() => handleEditStudent(student)}
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center space-x-1"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Sửa</span>
                                </Button>
                                <Button
                                  onClick={() => handleDeleteStudent(student.id)}
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center space-x-1 text-destructive hover:text-destructive hover:bg-destructive/5 hover:border-destructive/50"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Xóa</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination for Class Management */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t bg-muted/50">
                    <div className="flex flex-wrap gap-3 justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-muted-foreground">
                          Hiển thị <span className="font-semibold">{((currentPage - 1) * classManagementPageSize) + 1}</span> đến <span className="font-semibold">{Math.min(currentPage * classManagementPageSize, totalStudents)}</span> trong tổng số <span className="font-semibold">{totalStudents}</span> học sinh
                        </div>
                        <div className="flex items-center space-x-2">
                          <Label className="text-sm">Số lượng/trang:</Label>
                          <select
                            value={classManagementPageSize}
                            onChange={(e) => {
                              setClassManagementPageSize(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                            className="pl-3 pr-8 py-1.5 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={30}>30</option>
                            <option value={50}>50</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          ← Trước
                        </Button>
                        
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                            const showPage = 
                              pageNum === 1 || 
                              pageNum === totalPages || 
                              (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);
                            
                            if (!showPage) {
                              if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                return <span key={pageNum} className="px-2 text-muted-foreground">...</span>;
                              }
                              return null;
                            }
                            
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Sau →
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Thêm Học Sinh */}
      <Dialog open={showAddStudentModal} onOpenChange={setShowAddStudentModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Thêm học sinh mới</DialogTitle>
            <DialogDescription>
              Điền thông tin để đăng ký học sinh mới vào hệ thống
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitStudentForm} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Họ tên */}
              <div className="space-y-2">
                <Label htmlFor="full_name">
                  Họ và tên *
                </Label>
                <Input
                  id="full_name"
                  type="text"
                  value={studentFormData.full_name}
                  onChange={(e) => handleStudentFormChange('full_name', e.target.value)}
                  className={studentFormErrors.full_name ? 'border-destructive' : ''}
                  placeholder="VD: Nguyễn Văn An"
                />
                {studentFormErrors.full_name && (
                  <p className="text-sm text-destructive">{studentFormErrors.full_name}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={studentFormData.email}
                  onChange={(e) => handleStudentFormChange('email', e.target.value)}
                  className={studentFormErrors.email ? 'border-destructive' : ''}
                  placeholder="VD: student@example.com"
                />
                {studentFormErrors.email && (
                  <p className="text-sm text-destructive">{studentFormErrors.email}</p>
                )}
              </div>

              {/* Số điện thoại */}
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Số điện thoại
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={studentFormData.phone}
                  onChange={(e) => handleStudentFormChange('phone', e.target.value)}
                  placeholder="VD: 0123456789"
                />
              </div>

              {/* Lớp */}
              <div className="space-y-2">
                <Label htmlFor="class_name">
                  Lớp học *
                </Label>
                <Input
                  id="class_name"
                  type="text"
                  value={studentFormData.class_name}
                  onChange={(e) => handleStudentFormChange('class_name', e.target.value)}
                  className={studentFormErrors.class_name ? 'border-destructive' : ''}
                  placeholder="VD: 10A1"
                />
                {studentFormErrors.class_name && (
                  <p className="text-sm text-destructive">{studentFormErrors.class_name}</p>
                )}
              </div>

              {/* Khối */}
              <div className="space-y-2">
                <Label htmlFor="grade">
                  Khối *
                </Label>
                <select
                  id="grade"
                  value={studentFormData.grade}
                  onChange={(e) => handleStudentFormChange('grade', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring ${
                    studentFormErrors.grade ? 'border-destructive' : 'border-input'
                  }`}
                >
                  <option value="">Chọn khối</option>
                  <option value="10">Khối 10</option>
                  <option value="11">Khối 11</option>
                  <option value="12">Khối 12</option>
                </select>
                {studentFormErrors.grade && (
                  <p className="text-sm text-destructive">{studentFormErrors.grade}</p>
                )}
              </div>

              {/* Giới tính */}
              <div className="space-y-2">
                <Label htmlFor="gender">
                  Giới tính
                </Label>
                <select
                  id="gender"
                  value={studentFormData.gender}
                  onChange={(e) => handleStudentFormChange('gender', e.target.value)}
                  className="px-4 py-3 w-full rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              {/* Ngày sinh */}
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">
                  Ngày sinh
                </Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={studentFormData.date_of_birth}
                  onChange={(e) => handleStudentFormChange('date_of_birth', e.target.value)}
                />
              </div>

              {/* Tên phụ huynh */}
              <div className="space-y-2">
                <Label htmlFor="parent_name">
                  Tên phụ huynh
                </Label>
                <Input
                  id="parent_name"
                  type="text"
                  value={studentFormData.parent_name}
                  onChange={(e) => handleStudentFormChange('parent_name', e.target.value)}
                  placeholder="VD: Nguyễn Văn Bình"
                />
              </div>

              {/* SĐT phụ huynh */}
              <div className="space-y-2">
                <Label htmlFor="parent_phone">
                  SĐT phụ huynh
                </Label>
                <Input
                  id="parent_phone"
                  type="tel"
                  value={studentFormData.parent_phone}
                  onChange={(e) => handleStudentFormChange('parent_phone', e.target.value)}
                  placeholder="VD: 0987654321"
                />
              </div>
              </div>

            {/* Địa chỉ */}
            <div className="space-y-2">
              <Label htmlFor="address">
                Địa chỉ
              </Label>
              <textarea
                id="address"
                value={studentFormData.address}
                onChange={(e) => handleStudentFormChange('address', e.target.value)}
                rows={3}
                className="px-4 py-3 w-full rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="VD: 123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
              />
            </div>

            {/* Thông báo mã học sinh sẽ được tạo tự động */}
            <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-primary" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-primary">
                    <strong>Lưu ý:</strong> Mã học sinh sẽ được hệ thống tự động tạo dựa trên khối học bạn chọn.
                    Khối 10: bắt đầu bằng 25, Khối 11: bắt đầu bằng 24, Khối 12: bắt đầu bằng 23.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseAddStudentModal}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={studentFormLoading}
              >
                {studentFormLoading ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    <span>Đang thêm...</span>
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 w-4 h-4" />
                    <span>Thêm học sinh</span>
                  </>
                )}
              </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Preview Import Học Sinh */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Xem trước dữ liệu import</DialogTitle>
            <DialogDescription>
              Kiểm tra dữ liệu trước khi nhập vào hệ thống ({importedData.length} học sinh)
            </DialogDescription>
          </DialogHeader>

          {/* Import Errors */}
          {importErrors.length > 0 && (
            <div className="p-4 mb-6 rounded-lg border bg-destructive/10 border-destructive/20">
              <h3 className="mb-3 text-lg font-semibold text-destructive">Các lỗi cần sửa:</h3>
              <div className="overflow-y-auto space-y-2 max-h-40">
                {importErrors.map((error, index) => (
                  <div key={index} className="p-2 rounded border bg-destructive/5 border-destructive/20">
                    <p className="font-medium text-destructive">
                      Dòng {error.row}: {error.student_name}
                    </p>
                    <ul className="mt-1 text-sm list-disc list-inside text-destructive/80">
                      {error.errors.map((err, errIndex) => (
                        <li key={errIndex}>{err}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Table */}
          <div className="overflow-x-auto mb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>STT</TableHead>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>SĐT</TableHead>
                  <TableHead>Lớp</TableHead>
                  <TableHead>Khối</TableHead>
                  <TableHead>Giới tính</TableHead>
                  <TableHead>Ngày sinh</TableHead>
                  <TableHead>Phụ huynh</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importedData.map((student, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {student.ho_va_ten}
                    </TableCell>
                    <TableCell>
                      {student.email || '-'}
                    </TableCell>
                    <TableCell>
                      {student.so_dien_thoai || '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {student.lop_hoc}
                    </TableCell>
                    <TableCell className="font-medium">
                      {student.khoi}
                    </TableCell>
                    <TableCell>
                      {student.gioi_tinh || 'Nam'}
                    </TableCell>
                    <TableCell>
                      {student.ngay_sinh || '-'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div>{student.ten_phu_huynh || '-'}</div>
                        {student.sdt_phu_huynh && (
                          <div className="text-xs text-muted-foreground">{student.sdt_phu_huynh}</div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Thông báo về mã học sinh */}
          <div className="p-4 mb-6 rounded-lg border bg-primary/5 border-primary/20">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-primary" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-primary">
                  <strong>Lưu ý:</strong> Mã học sinh sẽ được hệ thống tự động tạo dựa trên khối học.
                  Khối 10: bắt đầu bằng 25, Khối 11: bắt đầu bằng 24, Khối 12: bắt đầu bằng 23.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseImportModal}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleConfirmImport}
              disabled={importLoading || importErrors.length > 0}
            >
              {importLoading ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  <span>Đang nhập...</span>
                </>
              ) : (
                <>
                  <Upload className="mr-2 w-4 h-4" />
                  <span>Xác nhận nhập ({importedData.length} học sinh)</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Modal */}
      {showEditModal && selectedStudentForEdit && (
        <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
          <div className="overflow-y-auto p-6 mx-4 w-full max-w-2xl max-h-screen bg-white rounded-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Sửa thông tin học sinh
              </h3>
              <button
                onClick={closeEditModal}
                className="text-2xl text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Mã học sinh (Không thể thay đổi)
                  </label>
                  <input
                    type="text"
                    value={selectedStudentForEdit.student_id || ''}
                    className="px-3 py-2 w-full text-gray-500 bg-gray-50 rounded-lg border border-gray-300"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Họ và tên *
                  </label>
                  <input
                    type="text"
                    value={editForm.full_name || ''}
                    onChange={(e) => handleEditFormChange('full_name', e.target.value)}
                    className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: Nguyễn Văn An"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => handleEditFormChange('email', e.target.value)}
                    className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: student@example.com"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone || ''}
                    onChange={(e) => handleEditFormChange('phone', e.target.value)}
                    className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: 0123456789"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Lớp
                  </label>
                  <input
                    type="text"
                    value={editForm.class_name || ''}
                    onChange={(e) => handleEditFormChange('class_name', e.target.value)}
                    className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: 10A1"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Khối
                  </label>
                  <select
                    value={editForm.grade || ''}
                    onChange={(e) => handleEditFormChange('grade', e.target.value)}
                    className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Chọn khối</option>
                    <option value="10">Khối 10</option>
                    <option value="11">Khối 11</option>
                    <option value="12">Khối 12</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Giới tính
                  </label>
                  <select
                    value={editForm.gender || 'Nam'}
                    onChange={(e) => handleEditFormChange('gender', e.target.value)}
                    className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={editForm.date_of_birth || ''}
                    onChange={(e) => handleEditFormChange('date_of_birth', e.target.value)}
                    className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Tên phụ huynh
                  </label>
                  <input
                    type="text"
                    value={editForm.parent_name || ''}
                    onChange={(e) => handleEditFormChange('parent_name', e.target.value)}
                    className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: Nguyễn Văn Bố"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Số điện thoại phụ huynh
                  </label>
                  <input
                    type="tel"
                    value={editForm.parent_phone || ''}
                    onChange={(e) => handleEditFormChange('parent_phone', e.target.value)}
                    className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: 0987654321"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Địa chỉ
                </label>
                <textarea
                  value={editForm.address || ''}
                  onChange={(e) => handleEditFormChange('address', e.target.value)}
                  rows={3}
                  className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: 123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
                />
              </div>

              <div className="flex justify-end pt-4 space-x-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={submitEditForm}
                  disabled={editLoading}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editLoading ? (
                    <>
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                      Đang cập nhật...
                    </>
                  ) : (
                    'Cập nhật'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassManagement;
