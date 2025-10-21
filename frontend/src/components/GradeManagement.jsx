import React, { useState, useEffect, useContext } from 'react';
import { GraduationCap, Settings, Plus, Download, Upload, AlertCircle, Trash2, Save, BarChart3, FileEdit, Scale, Key, Lightbulb, Star, Zap, Pencil, FileText, Clipboard, Calendar, BookOpen, Users, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
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
        // Sắp xếp học sinh theo student_id tăng dần (250001, 250002, 250003...)
        const sortedStudents = (studentsResponse.data.students || []).sort((a, b) => {
          const aId = parseInt(a.student?.student_id) || 0;
          const bId = parseInt(b.student?.student_id) || 0;
          return aId - bId;
        });
        setStudents(sortedStudents);
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
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!teacherInfo) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="p-8 text-center bg-destructive/5 rounded-2xl border border-destructive/20">
          <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full">
            <span className="text-2xl text-red-600">⚠️</span>
          </div>
          <p className="font-medium text-red-600">Không thể tải thông tin giáo viên. Vui lòng thử lại.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 min-h-screen bg-gray-50">
      <div className="mx-auto space-y-6 max-w-7xl">
        {/* Header Card */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="flex justify-center items-center w-14 h-14 bg-primary/10 rounded-lg">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Quản lý điểm số</CardTitle>
                <CardDescription className="text-lg">
                  Chào mừng {teacherInfo.teacher.full_name}
                </CardDescription>
                <div className="flex items-center mt-2 space-x-3">
                  <Badge variant="secondary" className="text-sm">
                    <Calendar className="w-3 h-3 mr-1" />
                    {academicYear}
                  </Badge>
                  <Badge variant="secondary" className="text-sm">
                    <BookOpen className="w-3 h-3 mr-1" />
                    {semester}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {!selectedClassSubject ? (
          <Card>
            <CardHeader>
              <div className="text-center">
                <CardTitle className="text-xl font-bold">Chọn lớp - môn học</CardTitle>
                <CardDescription>
                  Lựa chọn lớp và môn học để bắt đầu quản lý điểm số
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teacherInfo.assigned_classes.map(classSubject => (
                  <Card
                    key={classSubject.id}
                    onClick={() => handleClassSubjectSelect(classSubject)}
                    className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary group"
                  >
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex justify-center items-center w-11 h-11 text-lg font-bold text-primary-foreground bg-primary rounded-lg">
                          {classSubject.classes.class_name.charAt(0)}
                        </div>
                        <div className="flex justify-center items-center w-7 h-7 bg-muted rounded-full transition-colors group-hover:bg-primary/10">
                          <span className="text-muted-foreground group-hover:text-primary">→</span>
                        </div>
                      </div>
                      
                      <h3 className="mb-1 text-base font-bold text-foreground">
                        {classSubject.classes.class_name}
                      </h3>
                      <p className="mb-3 font-medium text-primary">
                        {classSubject.subjects.subject_name}
                      </p>
                      
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          Khối {classSubject.classes.grade}
                        </Badge>
                        <span className="text-xs">{academicYear}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Navigation and Header */}
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-4">
                      <Button
                        onClick={() => setSelectedClassSubject(null)}
                        variant="outline"
                        className="flex items-center space-x-2"
                      >
                        <span>←</span>
                        <span>Quay lại</span>
                      </Button>
                      <div className="w-px h-8 bg-border"></div>
                      <div>
                        <h2 className="text-lg font-bold text-foreground">
                          {selectedClassSubject.classes.class_name} - {selectedClassSubject.subjects.subject_name}
                        </h2>
                        <p className="text-sm text-muted-foreground">Khối {selectedClassSubject.classes.grade}</p>
                      </div>
                    </div>
                    
                    <Button
                      onClick={handleShowConfigEditor}
                      className="flex items-center space-x-2"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Cấu hình cột điểm</span>
                    </Button>
                  </div>

                  {/* Import/Export Buttons */}
                  {gradeConfig && (
                    <div className="flex flex-wrap gap-3 items-center pt-3 border-t border-border">
                      <Button
                        onClick={handleDownloadTemplate}
                        className="flex items-center space-x-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>Tải template</span>
                      </Button>
                      
                      <Button
                        asChild
                        variant="outline"
                        className="flex items-center space-x-2"
                      >
                        <label className="cursor-pointer">
                          <Upload className="w-4 h-4" />
                          <span>Nhập điểm từ file</span>
                          <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </Button>

                      <OCRGradeSheet 
                        selectedClassSubject={selectedClassSubject}
                        academicYear={academicYear}
                        semester={semester}
                        onImportSuccess={() => handleClassSubjectSelect(selectedClassSubject)}
                      />

                      <div className="px-3 py-2 text-sm text-muted-foreground bg-primary/5 rounded-lg border border-primary/20">
                        <span className="font-medium flex items-center space-x-1">
                          <Lightbulb className="w-4 h-4" />
                          <span>Hỗ trợ:</span>
                        </span> Excel (.xlsx, .xls), CSV, và ảnh bảng điểm
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Config Editor Modal */}
            <Dialog open={showConfigEditor} onOpenChange={setShowConfigEditor}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Cấu hình cột điểm</span>
                  </DialogTitle>
                  <DialogDescription>
                    Thiết lập các cột điểm và hệ số cho môn học
                  </DialogDescription>
                </DialogHeader>
                
                <div className="max-h-[60vh] overflow-y-auto">
                  <div className="space-y-4">
                    {Object.keys(configForm).length === 0 ? (
                      <div className="py-12 text-center">
                        <div className="flex justify-center items-center mx-auto mb-4 w-24 h-24 bg-muted rounded-full">
                          <BarChart3 className="w-12 h-12 text-muted-foreground" />
                        </div>
                        <p className="mb-6 text-lg text-muted-foreground">Chưa có cột điểm nào</p>
                        <p className="text-muted-foreground">Hãy thêm cột điểm đầu tiên để bắt đầu</p>
                      </div>
                    ) : (
                      getSortedColumnNames(configForm).map((columnName, index) => (
                        <Card key={columnName} className="transition-all hover:shadow-md">
                          <CardContent className="p-5">
                            <div className="flex items-center space-x-4">
                              <div className="flex justify-center items-center w-10 h-10 text-base font-bold text-white bg-primary rounded-lg">
                                {index + 1}
                              </div>
                              
                              <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                  <Label className="flex items-center space-x-1 mb-1.5">
                                    <FileEdit className="w-4 h-4" />
                                    <span>Tên hiển thị</span>
                                    <span className="text-destructive">*</span>
                                  </Label>
                                  <Input
                                    type="text"
                                    value={configForm[columnName].label}
                                    onChange={(e) => handleConfigInputChange(columnName, 'label', e.target.value)}
                                    placeholder="Nhập tên hiển thị"
                                  />
                                  <p className="px-2 py-1 mt-1 text-xs text-muted-foreground bg-muted rounded">Key: {columnName}</p>
                                </div>
                                
                                <div>
                                  <Label className="flex items-center space-x-1 mb-1.5">
                                    <Scale className="w-4 h-4" />
                                    <span>Hệ số</span>
                                    <span className="text-destructive">*</span>
                                  </Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={configForm[columnName].he_so}
                                    onChange={(e) => handleConfigInputChange(columnName, 'he_so', parseInt(e.target.value) || 1)}
                                  />
                                </div>
                              </div>
                              
                              <Button
                                onClick={() => handleRemoveColumn(columnName)}
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/5 hover:border-destructive/50"
                                title={`Xóa cột "${configForm[columnName].label}"`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>

                <DialogFooter className="flex justify-between">
                  <Button
                    onClick={handleAddColumn}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm cột</span>
                  </Button>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowConfigEditor(false)}
                    >
                      Hủy
                    </Button>
                    <Button
                      onClick={handleSaveConfig}
                      className="flex items-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>Lưu cấu hình</span>
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add Column Modal */}
            <Dialog open={showAddColumnModal} onOpenChange={setShowAddColumnModal}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <Plus className="w-5 h-5" />
                    <span>Thêm cột điểm mới</span>
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-5">
                  <div>
                    <Label className="flex items-center space-x-1 mb-1.5">
                      <Key className="w-4 h-4" />
                      <span>Tên cột (key)</span>
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="text"
                      value={newColumnForm.name}
                      onChange={(e) => setNewColumnForm(prev => ({...prev, name: e.target.value}))}
                      placeholder="vd: Diem_thi_15_phut"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground bg-muted border border-border rounded-md p-2">
                      <AlertCircle className="inline w-3 h-3 mr-1" />
                      Chỉ được sử dụng chữ cái, số và dấu gạch dưới. Không dấu.
                    </p>
                  </div>
                  
                  <div>
                    <Label className="flex items-center space-x-1 mb-1.5">
                      <FileEdit className="w-4 h-4" />
                      <span>Tên hiển thị</span>
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="text"
                      value={newColumnForm.label}
                      onChange={(e) => setNewColumnForm(prev => ({...prev, label: e.target.value}))}
                      placeholder="vd: Điểm thi 15 phút"
                    />
                  </div>
                  
                  <div>
                    <Label className="flex items-center space-x-1 mb-1.5">
                      <Scale className="w-4 h-4" />
                      <span>Hệ số</span>
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={newColumnForm.he_so}
                      onChange={(e) => setNewColumnForm(prev => ({...prev, he_so: parseInt(e.target.value) || 1}))}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddColumnModal(false)}
                  >
                    Hủy
                  </Button>
                  <Button
                    onClick={handleConfirmAddColumn}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm cột</span>
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Students Grade Table */}
            {gradeConfig ? (
              <div className="overflow-hidden bg-white rounded-lg shadow-md">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex flex-wrap gap-3 justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <Users className="w-5 h-5 text-gray-700" />
                      <h3 className="text-lg font-bold text-gray-800">Danh sách học sinh</h3>
                      <span className="px-3 py-1 text-sm font-medium text-blue-800 bg-blue-100 rounded-full">
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
                            <User className="w-4 h-4" />
                            <span>Học sinh</span>
                          </span>
                        </th>
                        {getSortedColumnNames(gradeConfig.grade_column_config).map(columnName => (
                          <th key={columnName} className="px-5 py-3 text-left">
                            <div className="text-xs font-semibold tracking-wider text-gray-600 uppercase">
                              <div>{gradeConfig.grade_column_config[columnName].label}</div>
                              <div className="text-xs text-blue-600 normal-case font-normal mt-0.5">
                                Hệ số: {gradeConfig.grade_column_config[columnName].he_so}
                              </div>
                            </div>
                          </th>
                        ))}
                        <th className="px-5 py-3 text-left">
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center space-x-1.5">
                            <Star className="w-4 h-4" />
                            <span>Điểm TB</span>
                          </span>
                        </th>
                        <th className="px-5 py-3 text-left">
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center space-x-1.5">
                            <Zap className="w-4 h-4" />
                            <span>Thao tác</span>
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        // Calculate pagination
                        const totalStudents = students.length;
                        const startIndex = (currentPage - 1) * pageSize;
                        const endIndex = startIndex + pageSize;
                        const paginatedStudents = students.slice(startIndex, endIndex);
                        
                        return paginatedStudents.map((studentData, index) => (
                        <tr key={studentData.student.id} className="transition-colors hover:bg-gray-50">
                          <td className="px-5 py-3">
                            <div className="flex items-center space-x-2.5">
                              <div className="flex justify-center items-center w-9 h-9 text-sm font-bold text-white bg-blue-600 rounded-lg">
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
                              {studentData.grade ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
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
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                      <div className="flex flex-wrap gap-3 justify-between items-center">
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
              <div className="py-12 text-center bg-white rounded-lg shadow-md">
                <div className="flex justify-center items-center mx-auto mb-4 w-20 h-20 bg-blue-100 rounded-full">
                  <BarChart3 className="w-8 h-8" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-gray-800">Chưa có cấu hình cột điểm</h3>
                <p className="mb-6 text-gray-600">Môn học này chưa có cấu hình cột điểm. Hãy tạo cấu hình để bắt đầu nhập điểm.</p>
                <button
                  onClick={handleShowConfigEditor}
                  className="inline-flex items-center px-6 py-3 space-x-2 font-medium text-white bg-blue-600 rounded-lg shadow-sm transition-colors hover:bg-blue-700 hover:shadow-md"
                >
                  <Settings className="w-4 h-4" />
                  <span>Tạo cấu hình cột điểm</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Grade Edit Modal */}
        <Dialog open={!!editingStudent} onOpenChange={() => setEditingStudent(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Pencil className="w-4 h-4" />
                <span>Nhập điểm cho {editingStudent?.student?.full_name}</span>
              </DialogTitle>
              <DialogDescription>
                Mã số: {editingStudent?.student?.student_id}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {editingStudent && gradeConfig && getSortedColumnNames(gradeConfig.grade_column_config).map(columnName => (
                <div key={columnName} className="p-4 bg-muted rounded-lg">
                  <Label className="block mb-2 text-sm font-medium">
                    <span className="flex justify-between items-center">
                      <span>{gradeConfig.grade_column_config[columnName].label}</span>
                      <Badge variant="secondary" className="text-xs">
                        Hệ số: {gradeConfig.grade_column_config[columnName].he_so}
                      </Badge>
                    </span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={gradeForm[columnName]?.Diem || ''}
                    onChange={(e) => handleGradeInputChange(columnName, e.target.value)}
                    className="text-center text-lg font-semibold"
                    placeholder="0.0"
                  />
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditingStudent(null)}
              >
                Hủy
              </Button>
              <Button
                onClick={handleSaveGrade}
              >
                💾 Lưu điểm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Preview Modal */}
        <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Clipboard className="w-4 h-4" />
                <span>Xem trước dữ liệu import</span>
              </DialogTitle>
              <DialogDescription>
                Kiểm tra kỹ thông tin trước khi cập nhật điểm • {importedData.length} học sinh
              </DialogDescription>
            </DialogHeader>
            
            <div className="max-h-[60vh] overflow-y-auto">
              {importErrors.length > 0 && (
                <div className="p-4 mb-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <h4 className="mb-2 font-bold text-destructive flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>Có {importErrors.length} lỗi:</span>
                  </h4>
                  <ul className="space-y-1 text-sm list-disc list-inside text-destructive">
                    {importErrors.slice(0, 10).map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                    {importErrors.length > 10 && (
                      <li className="font-medium text-destructive">... và {importErrors.length - 10} lỗi khác</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>STT</TableHead>
                      <TableHead>Mã HS</TableHead>
                      <TableHead>Họ và tên</TableHead>
                      <TableHead className="text-center">Điểm TX</TableHead>
                      <TableHead className="text-center">Điểm GK</TableHead>
                      <TableHead className="text-center">Điểm CK</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importedData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium text-primary">{row.student_id}</TableCell>
                        <TableCell>{row.ho_va_ten}</TableCell>
                        <TableCell className="text-center">
                          {row.diem_thuong_xuyen !== null && row.diem_thuong_xuyen !== undefined ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              {row.diem_thuong_xuyen}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.diem_thi_giua_ki !== null && row.diem_thi_giua_ki !== undefined ? (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                              {row.diem_thi_giua_ki}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.diem_thi_cuoi_ki !== null && row.diem_thi_cuoi_ki !== undefined ? (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                              {row.diem_thi_cuoi_ki}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {importedData.length === 0 && (
                <div className="py-12 text-center">
                  <div className="flex justify-center items-center mx-auto mb-4 w-20 h-20 bg-muted rounded-full">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">Không có dữ liệu hợp lệ</p>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold">{importedData.length}</span> bản ghi sẽ được cập nhật
                {importErrors.length > 0 && (
                  <span className="ml-2 text-destructive">• <span className="font-semibold">{importErrors.length}</span> lỗi</span>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportedData([]);
                    setImportErrors([]);
                  }}
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={importedData.length === 0 || importErrors.length > 0}
                >
                  ✅ Cập nhật điểm
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default GradeManagement; 