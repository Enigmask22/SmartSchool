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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-3xl">📊</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Quản lý điểm số</h1>
              <p className="text-indigo-100 text-lg">Chào mừng {teacherInfo.teacher.full_name}</p>
              <div className="flex items-center mt-2 space-x-4 text-sm text-indigo-200">
                <span className="bg-white/20 px-3 py-1 rounded-full">📅 {academicYear}</span>
                <span className="bg-white/20 px-3 py-1 rounded-full">📚 {semester}</span>
              </div>
            </div>
          </div>
        </div>

        {!selectedClassSubject ? (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Chọn lớp - môn học</h2>
              <p className="text-gray-600">Lựa chọn lớp và môn học để bắt đầu quản lý điểm số</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teacherInfo.assigned_classes.map(classSubject => (
                <div
                  key={classSubject.id}
                  onClick={() => handleClassSubjectSelect(classSubject)}
                  className="group cursor-pointer bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:border-indigo-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      {classSubject.classes.class_name.charAt(0)}
                    </div>
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                      <span className="text-gray-400 group-hover:text-indigo-600">→</span>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-800 mb-2">
                    {classSubject.classes.class_name}
                  </h3>
                  <p className="text-indigo-600 font-semibold mb-3">
                    {classSubject.subjects.subject_name}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span className="bg-gray-100 px-3 py-1 rounded-full">
                      Khối {classSubject.classes.grade}
                    </span>
                    <span className="text-xs">{academicYear}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Navigation and Header */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setSelectedClassSubject(null)}
                    className="flex items-center space-x-2 px-4 py-2 text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors font-medium"
                  >
                    <span>←</span>
                    <span>Quay lại</span>
                  </button>
                  <div className="h-8 w-px bg-gray-300"></div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {selectedClassSubject.classes.class_name} - {selectedClassSubject.subjects.subject_name}
                    </h2>
                    <p className="text-sm text-gray-500">Khối {selectedClassSubject.classes.grade}</p>
                  </div>
                </div>
                
                <button
                  onClick={handleShowConfigEditor}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
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
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
                    <h3 className="text-2xl font-bold flex items-center space-x-3">
                      <span>⚙️</span>
                      <span>Cấu hình cột điểm</span>
                    </h3>
                    <p className="text-purple-100 mt-2">Thiết lập các cột điểm và hệ số cho môn học</p>
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
                          <div key={columnName} className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-2xl p-6 transition-all hover:shadow-lg">
                            <div className="flex items-center space-x-6">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                                {index + 1}
                              </div>
                              
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                    placeholder="Nhập tên hiển thị"
                                  />
                                  <p className="mt-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">Key: {columnName}</p>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                  />
                                </div>
                              </div>
                              
                              <button
                                onClick={() => handleRemoveColumn(columnName)}
                                className="w-12 h-12 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl transition-all duration-300 hover:scale-110"
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

                  <div className="flex items-center justify-between p-6 bg-gray-50 border-t">
                    <button
                      onClick={handleAddColumn}
                      className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
                    >
                      <span>➕</span>
                      <span>Thêm cột</span>
                    </button>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setShowConfigEditor(false)}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 font-medium"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleSaveConfig}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
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
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
                    <h3 className="text-xl font-bold flex items-center space-x-2">
                      <span>➕</span>
                      <span>Thêm cột điểm mới</span>
                    </h3>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      />
                      <p className="mt-2 text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                        ⚠️ Chỉ được sử dụng chữ cái, số và dấu gạch dưới. Không dấu.
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 p-6 bg-gray-50 border-t">
                    <button
                      onClick={() => setShowAddColumnModal(false)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 font-medium"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleConfirmAddColumn}
                      className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
                    >
                      ➕ Thêm cột
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Students Grade Table */}
            {gradeConfig ? (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">👥</span>
                    <h3 className="text-xl font-bold text-gray-800">Danh sách học sinh</h3>
                    <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                      {students.length} học sinh
                    </span>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-indigo-50 to-purple-50">
                        <th className="px-6 py-4 text-left">
                          <span className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center space-x-2">
                            <span>👤</span>
                            <span>Học sinh</span>
                          </span>
                        </th>
                        {Object.keys(gradeConfig.grade_column_config).map(columnName => (
                          <th key={columnName} className="px-6 py-4 text-left">
                            <div className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                              <div>{gradeConfig.grade_column_config[columnName].label}</div>
                              <div className="text-xs text-indigo-600 normal-case">
                                Hệ số: {gradeConfig.grade_column_config[columnName].he_so}
                              </div>
                            </div>
                          </th>
                        ))}
                        <th className="px-6 py-4 text-left">
                          <span className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center space-x-2">
                            <span>🏆</span>
                            <span>Điểm TB</span>
                          </span>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <span className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center space-x-2">
                            <span>⚡</span>
                            <span>Thao tác</span>
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {students.map((studentData, index) => (
                        <tr key={studentData.student.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {studentData.student.full_name}
                                </div>
                                <div className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-md inline-block">
                                  {studentData.student.student_id}
                                </div>
                              </div>
                            </div>
                          </td>
                          {Object.keys(gradeConfig.grade_column_config).map(columnName => (
                            <td key={columnName} className="px-6 py-4">
                              <span className="text-sm font-medium text-gray-900">
                                {studentData.grade?.grade_data?.[columnName]?.Diem ? (
                                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                                    {studentData.grade.grade_data[columnName].Diem}
                                  </span>
                                ) : (
                                  <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full">-</span>
                                )}
                              </span>
                            </td>
                          ))}
                          <td className="px-6 py-4">
                            {studentData.grade?.grade_data ? (
                              <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-bold">
                                {calculateFinalGrade(studentData.grade.grade_data)}
                              </span>
                            ) : (
                              <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-sm">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleEditGrade(studentData)}
                              className="flex items-center space-x-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition-all duration-300 font-medium"
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
              <div className="text-center py-16 bg-white rounded-2xl shadow-xl">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">📊</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">Chưa có cấu hình cột điểm</h3>
                <p className="text-gray-600 mb-8">Môn học này chưa có cấu hình cột điểm. Hãy tạo cấu hình để bắt đầu nhập điểm.</p>
                <button
                  onClick={handleShowConfigEditor}
                  className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
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
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                <h3 className="text-xl font-bold flex items-center space-x-2">
                  <span>✏️</span>
                  <span>Nhập điểm cho {editingStudent.student.full_name}</span>
                </h3>
                <p className="text-indigo-100 mt-1">Mã số: {editingStudent.student.student_id}</p>
              </div>
              
              <div className="p-6 space-y-6">
                {Object.keys(gradeConfig.grade_column_config).map(columnName => (
                  <div key={columnName} className="bg-gray-50 rounded-2xl p-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      <span className="flex items-center justify-between">
                        <span>{gradeConfig.grade_column_config[columnName].label}</span>
                        <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-center text-lg font-semibold"
                      placeholder="0.0"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3 p-6 bg-gray-50 border-t">
                <button
                  onClick={() => setEditingStudent(null)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-300 font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveGrade}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
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