import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Upload, FileText, Download } from 'lucide-react';
import api from '../services/api';
import * as XLSX from 'xlsx';

const ClassManagement = () => {
  // States cho Class Management
  const [selectedClassForManagement, setSelectedClassForManagement] = useState('');
  const [showInactiveStudents, setShowInactiveStudents] = useState(false);
  const [classStudents, setClassStudents] = useState([]);
  const [homeroomTeacher, setHomeroomTeacher] = useState(null);
  const [loadingClassData, setLoadingClassData] = useState(false);
  
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

  // Pagination logic
  const totalStudents = classStudents.length;
  const totalPages = Math.ceil(totalStudents / classManagementPageSize);
  const startIndex = (currentPage - 1) * classManagementPageSize;
  const endIndex = startIndex + classManagementPageSize;
  const paginatedStudents = classStudents.slice(startIndex, endIndex);

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header Section */}
      <div className="mb-8">
        <div className="p-6 bg-white rounded-xl border border-blue-100 shadow-lg">
          <h1 className="mb-2 text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            Quản trị lớp học
          </h1>
          <p className="text-lg text-gray-600">Quản lý học sinh và lớp học trong hệ thống</p>
        </div>
      </div>

      {/* Class Filter */}
      <div className="mb-6">
        <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-lg">
          <h3 className="mb-4 text-lg font-semibold text-gray-800">Bộ lọc lớp học</h3>
          <div className="flex flex-wrap gap-6 items-center">
            {/* Class Selection */}
            <div className="flex flex-col">
              <label className="mb-2 text-sm font-medium text-gray-700">Chọn lớp học</label>
              <select
                value={selectedClassForManagement}
                onChange={(e) => setSelectedClassForManagement(e.target.value)}
                className="px-4 py-3 w-64 rounded-lg border-2 border-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
      </div>

      {/* Homeroom Teacher Info */}
      {selectedClassForManagement && homeroomTeacher && (
        <div className="mb-6">
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
              <div className="flex items-center space-x-3">
                <button
                  onClick={downloadStudentTemplate}
                  className="flex items-center px-4 py-2 font-medium text-blue-600 bg-blue-50 rounded-lg shadow-sm transition-all duration-200 hover:bg-blue-100 hover:shadow-md"
                >
                  <Download className="mr-2 w-4 h-4" />
                  Tải template
                </button>
                
                <label className="flex items-center px-4 py-2 font-medium text-purple-600 bg-purple-50 rounded-lg shadow-sm transition-all duration-200 cursor-pointer hover:bg-purple-100 hover:shadow-md">
                  <Upload className="mr-2 w-4 h-4" />
                  Nhập từ file
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={() => setShowAddStudentModal(true)}
                  className="flex items-center px-4 py-2 font-medium text-white bg-green-600 rounded-lg shadow-lg transition-all duration-200 transform hover:bg-green-700 hover:scale-105"
                >
                  <Plus className="mr-2 w-4 h-4" />
                  Thêm học sinh
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loadingClassData ? (
              <div className="py-12 text-center">
                <div className="mx-auto w-8 h-8 rounded-full border-4 border-blue-200 animate-spin border-t-blue-600"></div>
                <p className="mt-4 font-medium text-gray-600">Đang tải dữ liệu...</p>
              </div>
            ) : error ? (
              <div className="py-12 text-center">
                <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full">
                  <span className="text-2xl text-red-500">⚠️</span>
                </div>
                <p className="mb-4 font-medium text-red-600">{error}</p>
                <button
                  onClick={loadClassStudents}
                  className="px-6 py-3 font-medium text-white bg-blue-500 rounded-lg transition-colors duration-200 hover:bg-blue-600"
                >
                  Thử lại
                </button>
              </div>
            ) : paginatedStudents.length === 0 ? (
              <div className="py-12 text-center">
                <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-gray-100 rounded-full">
                  <span className="text-2xl text-gray-400">👥</span>
                </div>
                <p className="font-medium text-gray-500">Chưa có học sinh nào trong lớp này</p>
              </div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                        MÃ HS
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                        HỌ TÊN
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                        LỚP
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                        TRẠNG THÁI KHUÔN MẶT
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedStudents.map((student, index) => (
                      <tr key={student.id} className={`hover:bg-blue-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {student.student_id}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="flex justify-center items-center w-8 h-8 bg-blue-500 rounded-full">
                              <span className="text-sm font-bold text-white">
                                {student.full_name?.charAt(0) || '?'}
                              </span>
                            </div>
                            <span>{student.full_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {student.class_name}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            ✗ Chưa đăng ký
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination for Class Management */}
                {(() => {
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
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Thêm Học Sinh */}
      {showAddStudentModal && (
        <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
          <div className="overflow-y-auto p-6 mx-4 w-full max-w-4xl max-h-screen bg-white rounded-xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Thêm học sinh mới</h2>
                <p className="text-gray-600">Điền thông tin để đăng ký học sinh mới vào hệ thống</p>
              </div>
              <button
                onClick={handleCloseAddStudentModal}
                className="text-3xl text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitStudentForm} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Họ tên */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Họ và tên *
                  </label>
                  <input
                    type="text"
                    value={studentFormData.full_name}
                    onChange={(e) => handleStudentFormChange('full_name', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      studentFormErrors.full_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="VD: Nguyễn Văn An"
                  />
                  {studentFormErrors.full_name && (
                    <p className="mt-1 text-sm text-red-500">{studentFormErrors.full_name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={studentFormData.email}
                    onChange={(e) => handleStudentFormChange('email', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      studentFormErrors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="VD: student@example.com"
                  />
                  {studentFormErrors.email && (
                    <p className="mt-1 text-sm text-red-500">{studentFormErrors.email}</p>
                  )}
                </div>

                {/* Số điện thoại */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={studentFormData.phone}
                    onChange={(e) => handleStudentFormChange('phone', e.target.value)}
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
                    value={studentFormData.class_name}
                    onChange={(e) => handleStudentFormChange('class_name', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      studentFormErrors.class_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="VD: 10A1"
                  />
                  {studentFormErrors.class_name && (
                    <p className="mt-1 text-sm text-red-500">{studentFormErrors.class_name}</p>
                  )}
                </div>

                {/* Khối */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Khối *
                  </label>
                  <select
                    value={studentFormData.grade}
                    onChange={(e) => handleStudentFormChange('grade', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      studentFormErrors.grade ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Chọn khối</option>
                    <option value="10">Khối 10</option>
                    <option value="11">Khối 11</option>
                    <option value="12">Khối 12</option>
                  </select>
                  {studentFormErrors.grade && (
                    <p className="mt-1 text-sm text-red-500">{studentFormErrors.grade}</p>
                  )}
                </div>

                {/* Giới tính */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Giới tính
                  </label>
                  <select
                    value={studentFormData.gender}
                    onChange={(e) => handleStudentFormChange('gender', e.target.value)}
                    className="px-4 py-3 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    value={studentFormData.date_of_birth}
                    onChange={(e) => handleStudentFormChange('date_of_birth', e.target.value)}
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
                    value={studentFormData.parent_name}
                    onChange={(e) => handleStudentFormChange('parent_name', e.target.value)}
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
                    value={studentFormData.parent_phone}
                    onChange={(e) => handleStudentFormChange('parent_phone', e.target.value)}
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
                  value={studentFormData.address}
                  onChange={(e) => handleStudentFormChange('address', e.target.value)}
                  rows={3}
                  className="px-4 py-3 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: 123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
                />
              </div>

              {/* Thông báo mã học sinh sẽ được tạo tự động */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>Lưu ý:</strong> Mã học sinh sẽ được hệ thống tự động tạo dựa trên khối học bạn chọn.
                      Khối 10: bắt đầu bằng 25, Khối 11: bắt đầu bằng 24, Khối 12: bắt đầu bằng 23.
                    </p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end pt-6 space-x-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseAddStudentModal}
                  className="px-6 py-3 font-medium text-gray-700 bg-gray-100 rounded-lg transition-colors hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={studentFormLoading}
                  className="flex items-center px-8 py-3 space-x-2 font-medium text-white bg-green-600 rounded-lg transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                  {studentFormLoading ? (
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
      )}

      {/* Modal Preview Import Học Sinh */}
      {showImportModal && (
        <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
          <div className="overflow-y-auto p-6 mx-4 w-full max-w-6xl max-h-screen bg-white rounded-xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Xem trước dữ liệu import</h2>
                <p className="text-gray-600">Kiểm tra dữ liệu trước khi nhập vào hệ thống ({importedData.length} học sinh)</p>
              </div>
              <button
                onClick={handleCloseImportModal}
                className="text-3xl text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {/* Import Errors */}
            {importErrors.length > 0 && (
              <div className="p-4 mb-6 bg-red-50 rounded-lg border border-red-200">
                <h3 className="mb-3 text-lg font-semibold text-red-800">Các lỗi cần sửa:</h3>
                <div className="overflow-y-auto space-y-2 max-h-40">
                  {importErrors.map((error, index) => (
                    <div key={index} className="p-2 bg-red-100 rounded border border-red-300">
                      <p className="font-medium text-red-800">
                        Dòng {error.row}: {error.student_name}
                      </p>
                      <ul className="mt-1 text-sm list-disc list-inside text-red-700">
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
              <table className="min-w-full rounded-lg border border-gray-200 divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                      STT
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                      Họ tên
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                      SĐT
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                      Lớp
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                      Khối
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                      Giới tính
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                      Ngày sinh
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                      Phụ huynh
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {importedData.map((student, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {student.ho_va_ten}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {student.email || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {student.so_dien_thoai || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {student.lop_hoc}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {student.khoi}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {student.gioi_tinh || 'Nam'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {student.ngay_sinh || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div>
                          <div>{student.ten_phu_huynh || '-'}</div>
                          {student.sdt_phu_huynh && (
                            <div className="text-xs text-gray-500">{student.sdt_phu_huynh}</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Thông báo về mã học sinh */}
            <div className="p-4 mb-6 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>Lưu ý:</strong> Mã học sinh sẽ được hệ thống tự động tạo dựa trên khối học.
                    Khối 10: bắt đầu bằng 25, Khối 11: bắt đầu bằng 24, Khối 12: bắt đầu bằng 23.
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end pt-6 space-x-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCloseImportModal}
                className="px-6 py-3 font-medium text-gray-700 bg-gray-100 rounded-lg transition-colors hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importLoading || importErrors.length > 0}
                className="flex items-center px-8 py-3 space-x-2 font-medium text-white bg-green-600 rounded-lg transition-colors hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importLoading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-b-2 border-white animate-spin"></div>
                    <span>Đang nhập...</span>
                  </>
                ) : (
                  <>
                    <span>📤</span>
                    <span>Xác nhận nhập ({importedData.length} học sinh)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassManagement;
