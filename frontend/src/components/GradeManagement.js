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

      const response = gradeConfig 
        ? await api.updateGradeConfigById(gradeConfig.id, { grade_column_config: configForm })
        : await api.createGradeConfig(configData);
      
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
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 rounded-full border-b-2 border-indigo-600 animate-spin"></div>
      </div>
    );
  }

  if (!teacherInfo) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Không thể tải thông tin giáo viên. Vui lòng thử lại.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded-lg shadow">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Quản lý điểm số</h1>
        <p className="text-gray-600">Chào {teacherInfo.teacher.full_name}</p>
      </div>

      {!selectedClassSubject ? (
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="mb-4 text-xl font-semibold">Chọn lớp - môn học</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teacherInfo.assigned_classes.map(classSubject => (
              <button
                key={classSubject.id}
                onClick={() => handleClassSubjectSelect(classSubject)}
                className="p-4 text-left rounded-lg border border-gray-300 transition-colors hover:bg-blue-50 hover:border-blue-500"
              >
                <div className="text-lg font-semibold">
                  {classSubject.classes.class_name} - {classSubject.subjects.subject_name}
                </div>
                <div className="text-sm text-gray-600">
                  Khối {classSubject.classes.grade} | {academicYear} - {semester}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Back button and config */}
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => setSelectedClassSubject(null)}
                className="flex items-center font-medium text-blue-600 hover:text-blue-800"
              >
                ← Quay lại
              </button>
              <button
                onClick={handleShowConfigEditor}
                className="px-4 py-2 font-medium text-white bg-yellow-500 rounded-lg hover:bg-yellow-600"
              >
                Cấu hình cột điểm
              </button>
            </div>
            <h2 className="text-xl font-semibold">
              {selectedClassSubject.classes.class_name} - {selectedClassSubject.subjects.subject_name}
            </h2>
          </div>

          {/* Config Editor Modal */}
          {showConfigEditor && (
            <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
              <div className="overflow-y-auto p-6 w-full max-w-2xl max-h-96 bg-white rounded-lg">
                <h3 className="mb-4 text-lg font-semibold">Cấu hình cột điểm</h3>
                
                <div className="space-y-3">
                  {Object.keys(configForm).length === 0 ? (
                    <div className="p-4 text-center text-gray-500 bg-gray-50 rounded">
                      Chưa có cột điểm nào. Hãy thêm cột điểm đầu tiên.
                    </div>
                  ) : (
                    Object.keys(configForm).map((columnName, index) => (
                      <div key={columnName} className="flex items-center p-4 space-x-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-center items-center w-8 h-8 text-xs font-bold text-white bg-blue-500 rounded-full">
                          {index + 1}
                        </div>
                        
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Tên hiển thị: <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={configForm[columnName].label}
                            onChange={(e) => handleConfigInputChange(columnName, 'label', e.target.value)}
                            className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                          <p className="mt-1 text-xs text-gray-500">Key: {columnName}</p>
                        </div>
                        
                        <div className="w-24">
                          <label className="block text-sm font-medium text-gray-700">
                            Hệ số: <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={configForm[columnName].he_so}
                            onChange={(e) => handleConfigInputChange(columnName, 'he_so', parseInt(e.target.value) || 1)}
                            className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                        
                        <button
                          onClick={() => handleRemoveColumn(columnName)}
                          className="p-2 text-red-600 rounded-lg transition-colors hover:text-red-800 hover:bg-red-50"
                          title={`Xóa cột "${configForm[columnName].label}"`}
                        >
                          🗑️
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-between mt-6">
                  <button
                    onClick={handleAddColumn}
                    className="px-4 py-2 text-white bg-green-500 rounded-lg hover:bg-green-600"
                  >
                    + Thêm cột
                  </button>
                  
                  <div className="space-x-3">
                    <button
                      onClick={() => setShowConfigEditor(false)}
                      className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleSaveConfig}
                      className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      Lưu cấu hình
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Column Modal */}
          {showAddColumnModal && (
            <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
              <div className="p-6 w-full max-w-md bg-white rounded-lg">
                <h3 className="mb-4 text-lg font-semibold">Thêm cột điểm mới</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Tên cột (key) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newColumnForm.name}
                      onChange={(e) => setNewColumnForm(prev => ({...prev, name: e.target.value}))}
                      placeholder="vd: Diem_thi_15_phut"
                      className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Chỉ được sử dụng chữ cái, số và dấu gạch dưới. Không dấu.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Tên hiển thị <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newColumnForm.label}
                      onChange={(e) => setNewColumnForm(prev => ({...prev, label: e.target.value}))}
                      placeholder="vd: Điểm thi 15 phút"
                      className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Hệ số <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newColumnForm.he_so}
                      onChange={(e) => setNewColumnForm(prev => ({...prev, he_so: e.target.value}))}
                      className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-6 space-x-3">
                  <button
                    onClick={() => setShowAddColumnModal(false)}
                    className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleConfirmAddColumn}
                    className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
                  >
                    Thêm cột
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Students Grade Table */}
          {gradeConfig ? (
            <div className="overflow-hidden bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium">Danh sách học sinh</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Học sinh
                      </th>
                      {Object.keys(gradeConfig.grade_column_config).map(columnName => (
                        <th key={columnName} className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          {gradeConfig.grade_column_config[columnName].label} (HS: {gradeConfig.grade_column_config[columnName].he_so})
                        </th>
                      ))}
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Điểm TB
                      </th>
                      <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((studentData) => (
                      <tr key={studentData.student.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {studentData.student.full_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {studentData.student.student_id}
                            </div>
                          </div>
                        </td>
                        {Object.keys(gradeConfig.grade_column_config).map(columnName => (
                          <td key={columnName} className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                            {studentData.grade?.grade_data?.[columnName]?.Diem || '-'}
                          </td>
                        ))}
                        <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                          {studentData.grade?.grade_data ? calculateFinalGrade(studentData.grade.grade_data) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                          <button
                            onClick={() => handleEditGrade(studentData)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            {studentData.grade ? 'Sửa' : 'Nhập điểm'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center bg-white rounded-lg shadow">
              <p className="mb-4 text-gray-600">Chưa có cấu hình cột điểm cho môn học này.</p>
              <button
                onClick={handleShowConfigEditor}
                className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Tạo cấu hình cột điểm
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grade Edit Modal */}
      {editingStudent && gradeConfig && (
        <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
          <div className="p-6 w-full max-w-md bg-white rounded-lg">
            <h3 className="mb-4 text-lg font-semibold">
              Nhập điểm cho {editingStudent.student.full_name}
            </h3>
            
            <div className="space-y-4">
              {Object.keys(gradeConfig.grade_column_config).map(columnName => (
                <div key={columnName}>
                  <label className="block text-sm font-medium text-gray-700">
                    {gradeConfig.grade_column_config[columnName].label} (Hệ số: {gradeConfig.grade_column_config[columnName].he_so})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={gradeForm[columnName]?.Diem || ''}
                    onChange={(e) => handleGradeInputChange(columnName, e.target.value)}
                    className="block mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveGrade}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Lưu điểm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeManagement; 