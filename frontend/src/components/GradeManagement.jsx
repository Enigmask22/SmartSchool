import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import * as XLSX from 'xlsx';
import OCRGradeSheet from './OCRGradeSheet';

const GradeManagement = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [teacherInfo, setTeacherInfo] = useState(null);
  const [selectedClassSubject, setSelectedClassSubject] = useState(null);
  const [students, setStudents] = useState([]);
  const [gradeConfig, setGradeConfig] = useState(null);
  const [academicYear] = useState('2024-2025');
  const [semester] = useState('HK1');
  const [editingStudent, setEditingStudent] = useState(null);
  const [gradeForm, setGradeForm] = useState({});
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [configForm, setConfigForm] = useState({});
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnForm, setNewColumnForm] = useState({ name: '', label: '', he_so: 1 });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedData, setImportedData] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20); // 20 students per page

  useEffect(() => {
    fetchTeacherInfo();
  }, [user]);

  // Reset page when selectedClassSubject changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClassSubject]);

  const fetchTeacherInfo = async () => {
    try {
      setLoading(true);
      const response = await api.getTeacherInfo();
      if (response.success) {
        setTeacherInfo(response.data);
      } else {
        console.error('Failed to fetch teacher info:', response.message);
      }
    } catch (error) {
      console.error('Error fetching teacher info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClassSubjectSelect = async (classSubject) => {
    setSelectedClassSubject(classSubject);
    setLoading(true);
    
    try {
      // Fetch students for this class-subject
      const studentsResponse = await api.getStudentsByClassSubject(
        classSubject.id, 
        academicYear, 
        semester
      );
      
      if (studentsResponse.success) {
        setStudents(studentsResponse.data.students || []);
      }

      // Fetch grade config for this subject
      const configResponse = await api.getGradeConfigBySubject(
        classSubject.subject_id,
        academicYear,
        semester
      );
      
      if (configResponse.success) {
        setGradeConfig(configResponse.data);
      } else {
        // No config exists yet, use default
        setGradeConfig(null);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeGradeForm = (student, existingGrade = null) => {
    const form = {};
    
    if (gradeConfig && gradeConfig.grade_column_config) {
      Object.keys(gradeConfig.grade_column_config).forEach(columnName => {
        form[columnName] = {
          He_so: gradeConfig.grade_column_config[columnName].he_so,
          Diem: existingGrade?.grade_data?.[columnName]?.Diem || ''
        };
      });
    }
    
    return form;
  };

  const handleEditGrade = (student) => {
    setEditingStudent(student);
    const form = initializeGradeForm(student.student, student.grade);
    setGradeForm(form);
  };

  const handleGradeInputChange = (columnName, value) => {
    setGradeForm(prev => ({
      ...prev,
      [columnName]: {
        ...prev[columnName],
        Diem: value
      }
    }));
  };

  const handleSaveGrade = async () => {
    try {
      const gradeData = {
        student_id: editingStudent.student.id,
        class_subject_id: selectedClassSubject.id,
        academic_year: academicYear,
        semester: semester,
        grade_data: {
          Mon_hoc: selectedClassSubject.subjects.subject_name,
          ...gradeForm
        }
      };

      const response = await api.createOrUpdateGrade(gradeData);
      
      if (response.success) {
        // Refresh students data
        handleClassSubjectSelect(selectedClassSubject);
        setEditingStudent(null);
        setGradeForm({});
        alert('Lưu điểm thành công!');
      } else {
        alert('Lỗi khi lưu điểm: ' + response.message);
      }
      
    } catch (error) {
      console.error('Error saving grade:', error);
      alert('Lỗi khi lưu điểm!');
    }
  };

  // Helper function to sort grade columns in desired order
  const getSortedColumnNames = (gradeColumnConfig) => {
    if (!gradeColumnConfig) return [];
    
    const columnNames = Object.keys(gradeColumnConfig);
    
    // Define desired order: Điểm thường xuyên -> Điểm giữa kì -> Điểm cuối kì -> Others
    const orderPriority = {
      'diem_thuong_xuyen': 1,
      'Diem_thuong_xuyen': 1,
      'diem_tx': 1,
      'diem_thi_giua_ki': 2,
      'Diem_thi_giua_ki': 2,
      'diem_gk': 2,
      'diem_thi_cuoi_ki': 3,
      'Diem_thi_cuoi_ki': 3,
      'diem_ck': 3
    };
    
    return columnNames.sort((a, b) => {
      const priorityA = orderPriority[a] || 999;
      const priorityB = orderPriority[b] || 999;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // If same priority or no priority, maintain original order
      return 0;
    });
  };

  const calculateFinalGrade = (gradeData) => {
    if (!gradeData || !gradeConfig?.grade_column_config) return 0;
    
    let totalScore = 0;
    let totalWeight = 0;
    
    Object.keys(gradeConfig.grade_column_config).forEach(columnName => {
      if (gradeData[columnName]?.Diem) {
        const score = parseFloat(gradeData[columnName].Diem);
        const weight = parseFloat(gradeConfig.grade_column_config[columnName].he_so);
        
        totalScore += score * weight;
        totalWeight += weight;
      }
    });
    
    return totalWeight > 0 ? (totalScore / totalWeight).toFixed(2) : 0;
  };

  // Grade Config Management
  const handleShowConfigEditor = () => {
    if (gradeConfig) {
      setConfigForm({...gradeConfig.grade_column_config});
    } else {
      // Default config
      setConfigForm({
        'Diem_thuong_xuyen': { he_so: 1, label: 'Điểm thường xuyên' },
        'Diem_thi_giua_ki': { he_so: 2, label: 'Điểm thi giữa kì' },
        'Diem_thi_cuoi_ki': { he_so: 3, label: 'Điểm thi cuối kì' }
      });
    }
    setShowConfigEditor(true);
  };

  const handleConfigInputChange = (columnName, field, value) => {
    setConfigForm(prev => ({
      ...prev,
      [columnName]: {
        ...prev[columnName],
        [field]: value
      }
    }));
  };

  const handleAddColumn = () => {
    setShowAddColumnModal(true);
    setNewColumnForm({ name: '', label: '', he_so: 1 });
  };

  const handleConfirmAddColumn = () => {
    if (newColumnForm.name && newColumnForm.label) {
      // Validate column name format
      const validName = newColumnForm.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      if (!validName) {
        alert('Tên cột không hợp lệ. Chỉ được sử dụng chữ cái, số và dấu gạch dưới.');
        return;
      }

      // Check if column already exists
      if (configForm[validName]) {
        alert('Cột điểm này đã tồn tại!');
        return;
      }

      setConfigForm(prev => ({
        ...prev,
        [validName]: { 
          he_so: parseInt(newColumnForm.he_so) || 1, 
          label: newColumnForm.label 
        }
      }));
      
      setShowAddColumnModal(false);
      setNewColumnForm({ name: '', label: '', he_so: 1 });
    } else {
      alert('Vui lòng điền đầy đủ thông tin!');
    }
  };

  const handleRemoveColumn = (columnName) => {
    if (Object.keys(configForm).length <= 1) {
      alert('Phải có ít nhất một cột điểm!');
      return;
    }
    
    if (window.confirm(`Bạn có chắc muốn xóa cột "${configForm[columnName]?.label || columnName}"?\n\nViệc xóa sẽ làm mất tất cả điểm số đã nhập cho cột này.`)) {
      setConfigForm(prev => {
        const newForm = {...prev};
        delete newForm[columnName];
        return newForm;
      });
    }
  };

  const handleSaveConfig = async () => {
    try {
      // Validation
      if (Object.keys(configForm).length === 0) {
        alert('Phải có ít nhất một cột điểm!');
        return;
      }

      // Check if all columns have valid data
      const invalidColumns = Object.keys(configForm).filter(columnName => {
        const column = configForm[columnName];
        return !column.label || !column.he_so || column.he_so < 1 || column.he_so > 10;
      });

      if (invalidColumns.length > 0) {
        alert('Vui lòng điền đầy đủ thông tin cho tất cả các cột điểm. Hệ số phải từ 1 đến 10.');
        return;
      }

      const configData = {
        subject_id: selectedClassSubject.subject_id,
        academic_year: academicYear,
        semester: semester,
        grade_column_config: configForm
      };

      const response = await api.upsertGradeConfig(gradeConfig?.id, configData);
      
      if (response.success) {
        setGradeConfig(response.data);
        setShowConfigEditor(false);
        alert('✅ Lưu cấu hình cột điểm thành công!');
        // Refresh current view
        handleClassSubjectSelect(selectedClassSubject);
      } else {
        alert('❌ Lỗi khi lưu cấu hình: ' + response.message);
      }
      
    } catch (error) {
      console.error('Error saving config:', error);
      alert('❌ Lỗi khi lưu cấu hình!');
    }
  };

  // Import điểm từ file
  const handleDownloadTemplate = async () => {
    try {
      await api.downloadGradeTemplate(selectedClassSubject.id);
      alert('✅ Tải template thành công!');
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('❌ Lỗi khi tải template!');
    }
  };

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
        const requiredColumns = ['id', 'ho_va_ten', 'diem_thuong_xuyen', 'diem_thi_giua_ki', 'diem_thi_cuoi_ki'];
        const firstRow = jsonData[0];
        const missingColumns = requiredColumns.filter(col => !(col in firstRow));

        if (missingColumns.length > 0) {
          alert(`❌ File thiếu các cột: ${missingColumns.join(', ')}\n\nVui lòng tải template để có đúng định dạng!`);
          return;
        }

        // Validate từng dòng
        jsonData.forEach((row, index) => {
          const rowNum = index + 2; // +2 vì dòng 1 là header, index bắt đầu từ 0
          
          // Kiểm tra ID
          if (!row.id) {
            errors.push(`Dòng ${rowNum}: Thiếu ID học sinh`);
            return;
          }

          // Validate điểm số
          const scores = {
            diem_thuong_xuyen: row.diem_thuong_xuyen,
            diem_thi_giua_ki: row.diem_thi_giua_ki,
            diem_thi_cuoi_ki: row.diem_thi_cuoi_ki
          };

          let hasInvalidScore = false;
          Object.entries(scores).forEach(([key, value]) => {
            if (value !== '' && value !== null && value !== undefined) {
              const score = parseFloat(value);
              if (isNaN(score) || score < 0 || score > 10) {
                errors.push(`Dòng ${rowNum} - ${row.ho_va_ten || row.id}: Điểm ${key} không hợp lệ (${value}). Điểm phải từ 0-10.`);
                hasInvalidScore = true;
              }
            }
          });

          if (!hasInvalidScore) {
            validData.push({
              student_id: row.id,
              ho_va_ten: row.ho_va_ten,
              diem_thuong_xuyen: scores.diem_thuong_xuyen === '' || scores.diem_thuong_xuyen === null || scores.diem_thuong_xuyen === undefined ? null : parseFloat(scores.diem_thuong_xuyen),
              diem_thi_giua_ki: scores.diem_thi_giua_ki === '' || scores.diem_thi_giua_ki === null || scores.diem_thi_giua_ki === undefined ? null : parseFloat(scores.diem_thi_giua_ki),
              diem_thi_cuoi_ki: scores.diem_thi_cuoi_ki === '' || scores.diem_thi_cuoi_ki === null || scores.diem_thi_cuoi_ki === undefined ? null : parseFloat(scores.diem_thi_cuoi_ki),
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

  const handleConfirmImport = async () => {
    if (importedData.length === 0) {
      alert('Không có dữ liệu để import!');
      return;
    }

    try {
      setLoading(true);

      const importPayload = {
        class_subject_id: selectedClassSubject.id,
        academic_year: academicYear,
        semester: semester,
        grades: importedData
      };

      const response = await api.bulkImportGrades(importPayload);

      if (response.success) {
        alert(`✅ ${response.message}\n\nThành công: ${response.data.success_count} bản ghi${response.data.error_count > 0 ? `\nLỗi: ${response.data.error_count} bản ghi` : ''}`);
        
        if (response.data.errors && response.data.errors.length > 0) {
          console.log('Import errors:', response.data.errors);
        }

        // Refresh data
        handleClassSubjectSelect(selectedClassSubject);
        setShowImportModal(false);
        setImportedData([]);
        setImportErrors([]);
      } else {
        alert('❌ Lỗi khi import điểm: ' + response.message);
      }
    } catch (error) {
      console.error('Error importing grades:', error);
      alert('❌ Lỗi khi import điểm!');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-pink-600 rounded-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!teacherInfo) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center p-8 bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl border border-red-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <p className="text-red-600 font-medium">Không thể tải thông tin giáo viên. Vui lòng thử lại.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-3xl">📊</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">Quản lý điểm số</h1>
              <p className="text-gray-600">Chào mừng {teacherInfo.teacher.full_name}</p>
              <div className="flex items-center mt-2 space-x-3 text-sm text-gray-500">
                <span className="bg-gray-100 px-3 py-1 rounded-full">📅 {academicYear}</span>
                <span className="bg-gray-100 px-3 py-1 rounded-full">📚 {semester}</span>
              </div>
            </div>
          </div>
        </div>

        {!selectedClassSubject ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Chọn lớp - môn học</h2>
              <p className="text-gray-600">Lựa chọn lớp và môn học để bắt đầu quản lý điểm số</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teacherInfo.assigned_classes.map(classSubject => (
                <div
                  key={classSubject.id}
                  onClick={() => handleClassSubjectSelect(classSubject)}
                  className="group cursor-pointer bg-white border border-gray-200 rounded-lg p-5 transition-all duration-200 hover:shadow-lg hover:border-blue-400"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                      {classSubject.classes.class_name.charAt(0)}
                    </div>
                    <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <span className="text-gray-400 group-hover:text-blue-600">→</span>
                    </div>
                  </div>
                  
                  <h3 className="text-base font-bold text-gray-800 mb-1">
                    {classSubject.classes.class_name}
                  </h3>
                  <p className="text-blue-600 font-medium mb-3">
                    {classSubject.subjects.subject_name}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded-md text-xs">
                      Khối {classSubject.classes.grade}
                    </span>
                    <span className="text-xs">{academicYear}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Navigation and Header */}
            <div className="bg-white rounded-lg shadow-md p-5">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setSelectedClassSubject(null)}
                      className="flex items-center space-x-2 px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                    >
                      <span>←</span>
                      <span>Quay lại</span>
                    </button>
                    <div className="h-8 w-px bg-gray-300"></div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-800">
                        {selectedClassSubject.classes.class_name} - {selectedClassSubject.subjects.subject_name}
                      </h2>
                      <p className="text-sm text-gray-500">Khối {selectedClassSubject.classes.grade}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleShowConfigEditor}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow-md"
                  >
                    <span>⚙️</span>
                    <span>Cấu hình cột điểm</span>
                  </button>
                </div>

                {/* Import/Export Buttons */}
                {gradeConfig && (
                  <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={handleDownloadTemplate}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm hover:shadow-md"
                    >
                      <span>📥</span>
                      <span>Tải template</span>
                    </button>
                    
                    <label className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm hover:shadow-md cursor-pointer">
                      <span>📤</span>
                      <span>Nhập điểm từ file</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    <OCRGradeSheet 
                      selectedClassSubject={selectedClassSubject}
                      academicYear={academicYear}
                      semester={semester}
                      onImportSuccess={() => handleClassSubjectSelect(selectedClassSubject)}
                    />

                    <div className="text-sm text-gray-500 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                      <span className="font-medium">💡 Hỗ trợ:</span> Excel (.xlsx, .xls), CSV, và ảnh bảng điểm
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Config Editor Modal */}
            {showConfigEditor && (
              <div 
                className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center p-4"
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100vw',
                  height: '100vh',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  backdropFilter: 'blur(4px)',
                  margin: 0,
                  zIndex: 9999
                }}
                onClick={(e) => e.target === e.currentTarget && setShowConfigEditor(false)}
              >
                <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="bg-blue-600 p-6 text-white border-b border-blue-700">
                    <h3 className="text-xl font-bold flex items-center space-x-2">
                      <span>⚙️</span>
                      <span>Cấu hình cột điểm</span>
                    </h3>
                    <p className="text-blue-100 mt-1 text-sm">Thiết lập các cột điểm và hệ số cho môn học</p>
                  </div>
                  
                  <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-4">
                      {Object.keys(configForm).length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-gray-400 text-4xl">📊</span>
                          </div>
                          <p className="text-gray-500 text-lg mb-6">Chưa có cột điểm nào</p>
                          <p className="text-gray-400">Hãy thêm cột điểm đầu tiên để bắt đầu</p>
                        </div>
                      ) : (
                        getSortedColumnNames(configForm).map((columnName, index) => (
                          <div key={columnName} className="bg-gray-50 border border-gray-200 rounded-lg p-5 transition-all hover:shadow-md">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-base">
                                {index + 1}
                              </div>
                              
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    <span className="flex items-center space-x-1">
                                      <span>📝</span>
                                      <span>Tên hiển thị</span>
                                      <span className="text-red-500">*</span>
                                    </span>
                                  </label>
                                  <input
                                    type="text"
                                    value={configForm[columnName].label}
                                    onChange={(e) => handleConfigInputChange(columnName, 'label', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Nhập tên hiển thị"
                                  />
                                  <p className="mt-1 text-xs text-gray-500 bg-white px-2 py-1 rounded">Key: {columnName}</p>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    <span className="flex items-center space-x-1">
                                      <span>⚖️</span>
                                      <span>Hệ số</span>
                                      <span className="text-red-500">*</span>
                                    </span>
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={configForm[columnName].he_so}
                                    onChange={(e) => handleConfigInputChange(columnName, 'he_so', parseInt(e.target.value) || 1)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                              </div>
                              
                              <button
                                onClick={() => handleRemoveColumn(columnName)}
                                className="w-10 h-10 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                                title={`Xóa cột "${configForm[columnName].label}"`}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-5 bg-gray-50 border-t">
                    <button
                      onClick={handleAddColumn}
                      className="flex items-center space-x-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm hover:shadow-md"
                    >
                      <span>➕</span>
                      <span>Thêm cột</span>
                    </button>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowConfigEditor(false)}
                        className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleSaveConfig}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow-md"
                      >
                        💾 Lưu cấu hình
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Add Column Modal */}
            {showAddColumnModal && (
              <div 
                className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center p-4"
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100vw',
                  height: '100vh',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  backdropFilter: 'blur(4px)',
                  margin: 0,
                  zIndex: 9999
                }}
                onClick={(e) => e.target === e.currentTarget && setShowAddColumnModal(false)}
              >
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="bg-green-600 p-5 text-white border-b border-green-700">
                    <h3 className="text-lg font-bold flex items-center space-x-2">
                      <span>➕</span>
                      <span>Thêm cột điểm mới</span>
                    </h3>
                  </div>
                  
                  <div className="p-5 space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        <span className="flex items-center space-x-1">
                          <span>🔑</span>
                          <span>Tên cột (key)</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="text"
                        value={newColumnForm.name}
                        onChange={(e) => setNewColumnForm(prev => ({...prev, name: e.target.value}))}
                        placeholder="vd: Diem_thi_15_phut"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <p className="mt-1.5 text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded-md p-2">
                        ⚠️ Chỉ được sử dụng chữ cái, số và dấu gạch dưới. Không dấu.
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        <span className="flex items-center space-x-1">
                          <span>📝</span>
                          <span>Tên hiển thị</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="text"
                        value={newColumnForm.label}
                        onChange={(e) => setNewColumnForm(prev => ({...prev, label: e.target.value}))}
                        placeholder="vd: Điểm thi 15 phút"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        <span className="flex items-center space-x-1">
                          <span>⚖️</span>
                          <span>Hệ số</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={newColumnForm.he_so}
                        onChange={(e) => setNewColumnForm(prev => ({...prev, he_so: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 p-5 bg-gray-50 border-t">
                    <button
                      onClick={() => setShowAddColumnModal(false)}
                      className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleConfirmAddColumn}
                      className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm hover:shadow-md"
                    >
                      ➕ Thêm cột
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Students Grade Table */}
            {gradeConfig ? (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">👥</span>
                      <h3 className="text-lg font-bold text-gray-800">Danh sách học sinh</h3>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        {students.length} học sinh
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-700">Số lượng/trang:</label>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
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
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-5 py-3 text-left">
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center space-x-1.5">
                            <span>👤</span>
                            <span>Học sinh</span>
                          </span>
                        </th>
                        {getSortedColumnNames(gradeConfig.grade_column_config).map(columnName => (
                          <th key={columnName} className="px-5 py-3 text-left">
                            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              <div>{gradeConfig.grade_column_config[columnName].label}</div>
                              <div className="text-xs text-blue-600 normal-case font-normal mt-0.5">
                                Hệ số: {gradeConfig.grade_column_config[columnName].he_so}
                              </div>
                            </div>
                          </th>
                        ))}
                        <th className="px-5 py-3 text-left">
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center space-x-1.5">
                            <span>🏆</span>
                            <span>Điểm TB</span>
                          </span>
                        </th>
                        <th className="px-5 py-3 text-left">
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center space-x-1.5">
                            <span>⚡</span>
                            <span>Thao tác</span>
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        // Calculate pagination
                        const totalStudents = students.length;
                        const totalPages = Math.ceil(totalStudents / pageSize);
                        const startIndex = (currentPage - 1) * pageSize;
                        const endIndex = startIndex + pageSize;
                        const paginatedStudents = students.slice(startIndex, endIndex);
                        
                        return paginatedStudents.map((studentData, index) => (
                        <tr key={studentData.student.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                {startIndex + index + 1}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {studentData.student.full_name}
                                </div>
                                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded inline-block mt-0.5">
                                  {studentData.student.student_id}
                                </div>
                              </div>
                            </div>
                          </td>
                          {getSortedColumnNames(gradeConfig.grade_column_config).map(columnName => (
                            <td key={columnName} className="px-5 py-3">
                              <span className="text-sm font-medium text-gray-900">
                                {studentData.grade?.grade_data?.[columnName]?.Diem ? (
                                  <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-sm font-medium">
                                    {studentData.grade.grade_data[columnName].Diem}
                                  </span>
                                ) : (
                                  <span className="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-md text-sm">-</span>
                                )}
                              </span>
                            </td>
                          ))}
                          <td className="px-5 py-3">
                            {studentData.grade?.grade_data ? (
                              <span className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-bold">
                                {calculateFinalGrade(studentData.grade.grade_data)}
                              </span>
                            ) : (
                              <span className="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-md text-sm">-</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <button
                              onClick={() => handleEditGrade(studentData)}
                              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium text-sm"
                            >
                              <span>{studentData.grade ? '✏️' : '➕'}</span>
                              <span>{studentData.grade ? 'Sửa' : 'Nhập điểm'}</span>
                            </button>
                          </td>
                        </tr>
                      ));
                      })()}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {(() => {
                  const totalStudents = students.length;
                  const totalPages = Math.ceil(totalStudents / pageSize);
                  const startIndex = (currentPage - 1) * pageSize;
                  const endIndex = startIndex + pageSize;
                  
                  if (totalPages <= 1) return null;
                  
                  return (
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm text-gray-700">
                          Hiển thị <span className="font-semibold">{startIndex + 1}</span> đến <span className="font-semibold">{Math.min(endIndex, totalStudents)}</span> trong tổng số <span className="font-semibold">{totalStudents}</span> học sinh
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow-md">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📊</span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Chưa có cấu hình cột điểm</h3>
                <p className="text-gray-600 mb-6">Môn học này chưa có cấu hình cột điểm. Hãy tạo cấu hình để bắt đầu nhập điểm.</p>
                <button
                  onClick={handleShowConfigEditor}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow-md"
                >
                  <span>⚙️</span>
                  <span>Tạo cấu hình cột điểm</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Grade Edit Modal */}
        {editingStudent && gradeConfig && (
          <div 
            className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center p-4"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              margin: 0,
              zIndex: 9999
            }}
            onClick={(e) => e.target === e.currentTarget && setEditingStudent(null)}
          >
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="bg-blue-600 p-5 text-white border-b border-blue-700">
                <h3 className="text-lg font-bold flex items-center space-x-2">
                  <span>✏️</span>
                  <span>Nhập điểm cho {editingStudent.student.full_name}</span>
                </h3>
                <p className="text-blue-100 mt-1 text-sm">Mã số: {editingStudent.student.student_id}</p>
              </div>
              
              <div className="p-5 space-y-4">
                {getSortedColumnNames(gradeConfig.grade_column_config).map(columnName => (
                  <div key={columnName} className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="flex items-center justify-between">
                        <span>{gradeConfig.grade_column_config[columnName].label}</span>
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-md">
                          Hệ số: {gradeConfig.grade_column_config[columnName].he_so}
                        </span>
                      </span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={gradeForm[columnName]?.Diem || ''}
                      onChange={(e) => handleGradeInputChange(columnName, e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-semibold"
                      placeholder="0.0"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2 p-5 bg-gray-50 border-t">
                <button
                  onClick={() => setEditingStudent(null)}
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveGrade}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow-md"
                >
                  💾 Lưu điểm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import Preview Modal */}
        {showImportModal && (
          <div 
            className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center p-4"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              margin: 0,
              zIndex: 9999
            }}
            onClick={(e) => e.target === e.currentTarget && setShowImportModal(false)}
          >
            <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="bg-purple-600 p-6 text-white border-b border-purple-700">
                <h3 className="text-xl font-bold flex items-center space-x-2">
                  <span>📋</span>
                  <span>Xem trước dữ liệu import</span>
                </h3>
                <p className="text-purple-100 mt-1 text-sm">
                  Kiểm tra kỹ thông tin trước khi cập nhật điểm • {importedData.length} học sinh
                </p>
              </div>
              
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {importErrors.length > 0 && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-bold text-red-800 mb-2">⚠️ Có {importErrors.length} lỗi:</h4>
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                      {importErrors.slice(0, 10).map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                      {importErrors.length > 10 && (
                        <li className="text-red-600 font-medium">... và {importErrors.length - 10} lỗi khác</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 rounded-lg">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase border-b">STT</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase border-b">Mã HS</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase border-b">Họ và tên</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b">Điểm TX</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b">Điểm GK</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b">Điểm CK</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {importedData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-blue-600">{row.student_id}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{row.ho_va_ten}</td>
                          <td className="px-4 py-3 text-center">
                            {row.diem_thuong_xuyen !== null && row.diem_thuong_xuyen !== undefined ? (
                              <span className="inline-block bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-sm font-medium">
                                {row.diem_thuong_xuyen}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.diem_thi_giua_ki !== null && row.diem_thi_giua_ki !== undefined ? (
                              <span className="inline-block bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md text-sm font-medium">
                                {row.diem_thi_giua_ki}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.diem_thi_cuoi_ki !== null && row.diem_thi_cuoi_ki !== undefined ? (
                              <span className="inline-block bg-purple-100 text-purple-700 px-2.5 py-1 rounded-md text-sm font-medium">
                                {row.diem_thi_cuoi_ki}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {importedData.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">📄</span>
                    </div>
                    <p className="text-gray-500">Không có dữ liệu hợp lệ</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-6 bg-gray-50 border-t">
                <div className="text-sm text-gray-600">
                  <span className="font-semibold">{importedData.length}</span> bản ghi sẽ được cập nhật
                  {importErrors.length > 0 && (
                    <span className="ml-2 text-red-600">• <span className="font-semibold">{importErrors.length}</span> lỗi</span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setImportedData([]);
                      setImportErrors([]);
                    }}
                    className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={importedData.length === 0 || importErrors.length > 0}
                    className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✅ Cập nhật điểm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GradeManagement; 