import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';

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

  useEffect(() => {
    fetchTeacherInfo();
  }, [user]);

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
                        Object.keys(configForm).map((columnName, index) => (
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
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">👥</span>
                    <h3 className="text-lg font-bold text-gray-800">Danh sách học sinh</h3>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {students.length} học sinh
                    </span>
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
                        {Object.keys(gradeConfig.grade_column_config).map(columnName => (
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
                      {students.map((studentData, index) => (
                        <tr key={studentData.student.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                {index + 1}
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
                          {Object.keys(gradeConfig.grade_column_config).map(columnName => (
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
                      ))}
                    </tbody>
                  </table>
                </div>
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
                {Object.keys(gradeConfig.grade_column_config).map(columnName => (
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
      </div>
    </div>
  );
};

export default GradeManagement; 