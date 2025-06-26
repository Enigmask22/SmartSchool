import React, { useState, useEffect, useRef, useContext } from 'react';
import ApiService from '../services/api';
import MultipleFaceRegistration from './MultipleFaceRegistration';
import { AuthContext } from '../contexts/AuthContext';

const StudentList = () => {
  const { user, isHomeroomTeacher } = useContext(AuthContext);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  
  // Face registration states
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [selectedStudentForFace, setSelectedStudentForFace] = useState(null);
  const [faceRegistrationLoading, setFaceRegistrationLoading] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [registrationMode, setRegistrationMode] = useState('camera'); // 'camera' or 'upload' or 'multiple'
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  
  // Multiple samples states
  const [multipleFiles, setMultipleFiles] = useState([]);
  const [multipleResults, setMultipleResults] = useState([]);
  
  // Multiple Face Registration Modal
  const [showMultipleModal, setShowMultipleModal] = useState(false);
  const [selectedStudentForMultiple, setSelectedStudentForMultiple] = useState(null);
  
  // Edit student states
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  
  // Show inactive students option
  const [showInactive, setShowInactive] = useState(false);
  
  // View grades states
  const [showGradesModal, setShowGradesModal] = useState(false);
  const [selectedStudentForGrades, setSelectedStudentForGrades] = useState(null);
  const [studentGrades, setStudentGrades] = useState([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  
  // Feedback states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedStudentForFeedback, setSelectedStudentForFeedback] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({
    student_name: '',
    score: '',
    score_trend: '',
    attendance_rate: '',
    notes: ''
  });
  const [generatedFeedback, setGeneratedFeedback] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const multipleFileInputRef = useRef(null);

  // Cleanup camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Handle video loaded event
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVideoReady = () => {
      setCameraReady(true);
      setCameraError(null);
    };

    const handleVideoError = () => {
      setCameraReady(false);
      setCameraError('Camera không thể khởi động');
    };

    video.addEventListener('loadedmetadata', handleVideoReady);
    video.addEventListener('error', handleVideoError);

    return () => {
      video.removeEventListener('loadedmetadata', handleVideoReady);
      video.removeEventListener('error', handleVideoError);
    };
  }, [showFaceModal, registrationMode]);

  // Initial load
  useEffect(() => {
    fetchAvailableClasses();
  }, []);
  
  useEffect(() => {
    fetchStudents();
  }, [showInactive, selectedClass]);

  useEffect(() => {
    fetchAvailableClasses();
  }, [user]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      
      if (isHomeroomTeacher()) {
        // If homeroom teacher but no class selected, don't fetch
        if (!selectedClass) {
          console.log('🚫 No class selected for homeroom teacher, skipping fetch');
          setStudents([]);
          setLoading(false);
          return;
        }
        // If homeroom teacher, get only their homeroom students
        response = await ApiService.getHomeroomStudents(selectedClass);
      } else {
        // If admin or other roles, get all students
        const params = showInactive ? { is_active: null } : {};
        response = await ApiService.getStudents(params);
      }
      
      console.log('Students API response:', response);
      
      if (response.success && response.data) {
        setStudents(Array.isArray(response.data) ? response.data : []);
      } else {
        console.warn('Invalid response structure:', response);
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Không thể tải danh sách học sinh từ server. Hiển thị dữ liệu mẫu.');
      
      // Mock data fallback
      setStudents([
        {
          id: 1,
          student_id: 'SV001',
          full_name: 'Nguyễn Văn An',
          class_name: '10A1',
          grade: '10',
          email: 'an.nguyen@student.edu.vn',
          phone: '0123456789'
        },
        {
          id: 2,
          student_id: 'SV002',
          full_name: 'Trần Thị Bình',
          class_name: '10A1',
          grade: '10',
          email: 'binh.tran@student.edu.vn',
          phone: '0123456790'
        },
        {
          id: 3,
          student_id: 'SV003',
          full_name: 'Lê Minh Châu',
          class_name: '10A2',
          grade: '10',
          email: 'chau.le@student.edu.vn',
          phone: '0123456791'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Filter students based on search and class - với safety check
  const filteredStudents = Array.isArray(students) ? students.filter(student => {
    const matchesSearch = student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.student_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === '' || student.class_name === selectedClass;
    return matchesSearch && matchesClass;
  }) : [];

  // State for available classes
  const [availableClasses, setAvailableClasses] = useState([]);

  // Fetch available classes based on user role
  const fetchAvailableClasses = async () => {
    try {
      console.log('👤 User role check:', {
        user,
        isHomeroomTeacher: isHomeroomTeacher(),
        userRole: user?.role
      });

      let classesResponse;
      
      if (isHomeroomTeacher()) {
        console.log('📚 Fetching homeroom classes...');
        // If homeroom teacher, only get their homeroom classes
        classesResponse = await ApiService.getHomeroomClasses();
        
        if (classesResponse.success && classesResponse.data) {
          const classNames = classesResponse.data.map(cls => cls.class_name).sort();
          console.log('📚 Setting homeroom classes:', classNames);
          setAvailableClasses(classNames);
        } else {
          console.warn('📚 Invalid homeroom classes response:', classesResponse);
          setAvailableClasses([]);
        }
      } else {
        console.log('📚 Fetching all students to extract classes for admin...');
        // If admin, get all students and extract unique class names
        const studentsResponse = await ApiService.getStudents({});
        
        if (studentsResponse.success && studentsResponse.data) {
          // Extract unique class names from students
          const uniqueClasses = [...new Set(
            studentsResponse.data
              .map(student => student.class_name)
              .filter(className => className) // Remove null/undefined
          )].sort();
          
          console.log('📚 Extracted unique classes from students:', uniqueClasses);
          setAvailableClasses(uniqueClasses);
        } else {
          console.warn('📚 Invalid students response for classes:', studentsResponse);
          setAvailableClasses([]);
        }
      }
    } catch (error) {
      console.error('Error fetching available classes:', error);
      // Fallback: get unique classes from students data
      const fallbackClasses = Array.isArray(students) ? 
        [...new Set(students.map(student => student.class_name).filter(Boolean))].sort() : 
        [];
      console.log('📚 Using fallback classes:', fallbackClasses);
      setAvailableClasses(fallbackClasses);
    }
  };

  // Get classes for display
  const classes = availableClasses;

  // Face registration functions
  const startFaceRegistration = async (student) => {
    setSelectedStudentForFace(student);
    setShowFaceModal(true);
    setCapturedImage(null);
    setUploadedImage(null);
    setRegistrationMode('camera');
    setCameraReady(false);
    setCameraError(null);
    
    // Cleanup any existing stream first
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      setCameraStream(stream);
      
      // Wait for video element to be available
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraError('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.');
      setRegistrationMode('upload'); // Chuyển sang upload mode nếu không có camera
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      alert('Camera chưa sẵn sàng. Vui lòng thử lại.');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Check if video is ready
    if (video.readyState < 2) {
      alert('Video chưa sẵn sàng. Vui lòng đợi một chút và thử lại.');
      return;
    }

    // Check if video has actual dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      alert('Camera chưa sẵn sàng. Vui lòng thử lại.');
      return;
    }

    try {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Clear canvas first
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to image data URL
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageDataUrl);
      
    } catch (error) {
      console.error('Error capturing photo:', error);
      alert('Có lỗi khi chụp ảnh. Vui lòng thử lại.');
    }
  };

  const resetCamera = async () => {
    setCameraReady(false);
    setCameraError(null);
    
    // Stop existing stream
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      setCameraStream(null);
    }

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Restart camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      setCameraStream(stream);
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
      
    } catch (error) {
      console.error('Error restarting camera:', error);
      setCameraError('Không thể khởi động lại camera. Vui lòng kiểm tra quyền truy cập.');
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh (JPG, PNG, etc.)');
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setUploadedImage({ file, previewUrl });
    setCapturedImage(null);
  };

  const submitFaceRegistration = async () => {
    if ((!capturedImage && !uploadedImage) || !selectedStudentForFace) return;
    
    setFaceRegistrationLoading(true);
    try {
      let response;
      
      if (registrationMode === 'upload' && uploadedImage) {
        // Use FormData for file upload
        const formData = new FormData();
        formData.append('file', uploadedImage.file);
        
        response = await fetch(`http://localhost:8000/api/ai/register/${selectedStudentForFace.id}`, {
          method: 'POST',
          body: formData
        });
      } else if (capturedImage) {
        // Use base64 for camera capture
        const base64Image = capturedImage.split(',')[1];
        
        response = await fetch(`http://localhost:8000/api/ai/register-base64/${selectedStudentForFace.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_base64: base64Image,
            confidence_threshold: 0.6
          })
        });
      }
      
      const result = await response.json();
      
      if (result.success) {
        alert(`Đăng ký khuôn mặt thành công cho ${selectedStudentForFace.full_name}!`);
        closeFaceModal();
        // Refresh students list to show updated status
        fetchStudents();
      } else {
        alert(`Lỗi: ${result.message}`);
      }
    } catch (error) {
      console.error('Error registering face:', error);
      alert('Có lỗi xảy ra khi đăng ký khuôn mặt');
    } finally {
      setFaceRegistrationLoading(false);
    }
  };

  const closeFaceModal = () => {
    setShowFaceModal(false);
    setSelectedStudentForFace(null);
    setCapturedImage(null);
    setUploadedImage(null);
    setRegistrationMode('camera');
    setCameraReady(false);
    setCameraError(null);
    
    // Stop camera stream with proper cleanup
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      setCameraStream(null);
    }

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Clean up uploaded image URL
    if (uploadedImage?.previewUrl) {
      URL.revokeObjectURL(uploadedImage.previewUrl);
    }
    
    // Clean up multiple files
    multipleFiles.forEach(file => {
      if (file.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
    });
    setMultipleFiles([]);
    setMultipleResults([]);
    
    // Reset multiple file input
    if (multipleFileInputRef.current) {
      multipleFileInputRef.current.value = '';
    }
  };

  const handleMultipleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 10) {
      alert('Tối đa 10 ảnh mỗi lần');
      return;
    }
    
    const fileObjects = files.map((file, index) => ({
      file,
      id: index,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      status: 'pending' // pending, success, error
    }));
    
    setMultipleFiles(fileObjects);
  };

  const removeMultipleFile = (fileId) => {
    setMultipleFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      // Revoke URL for removed file
      const removedFile = prev.find(f => f.id === fileId);
      if (removedFile) {
        URL.revokeObjectURL(removedFile.previewUrl);
      }
      return updated;
    });
  };

  const submitMultipleFaceRegistration = async () => {
    if (multipleFiles.length === 0 || !selectedStudentForFace) return;
    
    setFaceRegistrationLoading(true);
    setMultipleResults([]);
    
    try {
      const formData = new FormData();
      multipleFiles.forEach(fileObj => {
        formData.append('files', fileObj.file);
      });
      
      const response = await fetch(`http://localhost:8000/api/ai/register-multiple/${selectedStudentForFace.id}`, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMultipleResults(result.data.results || []);
        alert(`Đăng ký thành công ${result.data.successful_registrations}/${result.data.total_images} ảnh cho ${selectedStudentForFace.full_name}!`);
        
        // Update file statuses
        setMultipleFiles(prev => prev.map((file, index) => ({
          ...file,
          status: result.data.results[index]?.success ? 'success' : 'error',
          message: result.data.results[index]?.message || ''
        })));
        
        // Refresh students list
        fetchStudents();
      } else {
        alert(`Lỗi: ${result.message}`);
      }
    } catch (error) {
      console.error('Error registering multiple faces:', error);
      alert('Có lỗi xảy ra khi đăng ký nhiều khuôn mặt');
    } finally {
      setFaceRegistrationLoading(false);
    }
  };

  const handleEdit = (student) => {
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
      parent_phone: student.parent_phone || ''
    });
    setShowEditModal(true);
  };

  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const submitEditForm = async () => {
    if (!selectedStudentForEdit || !editForm.full_name.trim()) {
      alert('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }

    // Filter out empty strings and convert to null for optional fields
    const cleanFormData = {};
    Object.keys(editForm).forEach(key => {
      const value = editForm[key];
      if (value !== '' && value !== null && value !== undefined) {
        cleanFormData[key] = value;
      }
    });

    console.log('Debug - editForm data:', editForm);
    console.log('Debug - cleaned data:', cleanFormData);
    console.log('Debug - student ID:', selectedStudentForEdit.id);

    setEditLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/students/${selectedStudentForEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanFormData)
      });

      if (response.ok) {
        alert('Cập nhật thông tin học sinh thành công!');
        setShowEditModal(false);
        fetchStudents();
      } else {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(`Failed to update student: ${response.status} - ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error('Error updating student:', error);
      alert('Có lỗi xảy ra khi cập nhật thông tin học sinh');
    } finally {
      setEditLoading(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedStudentForEdit(null);
    setEditForm({});
  };

  const handleDelete = async (studentId) => {
    console.log('Delete button clicked for student ID:', studentId);
    
    if (window.confirm('Bạn có chắc chắn muốn xóa học sinh này?')) {
      try {
        console.log('Calling ApiService.deleteStudent with ID:', studentId);
        const response = await ApiService.deleteStudent(studentId);
        console.log('Delete response:', response);
        
        if (response.success) {
          alert('Xóa học sinh thành công!');
          fetchStudents();
        } else {
          alert(`Lỗi: ${response.message || 'Không thể xóa học sinh'}`);
        }
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Có lỗi xảy ra khi xóa học sinh: ' + error.message);
      }
    }
  };

  const handleViewGrades = async (student) => {
    setSelectedStudentForGrades(student);
    setShowGradesModal(true);
    setGradesLoading(true);
    setStudentGrades([]);

    try {
      // Get all grades for this student across all subjects
      const response = await ApiService.getStudentGrades(student.id);
      
      if (response.success) {
        setStudentGrades(response.data?.grades || []);
      } else {
        console.error('Failed to fetch grades:', response.message);
        setStudentGrades([]);
      }
    } catch (error) {
      console.error('Error fetching student grades:', error);
      // Mock data for demonstration
      setStudentGrades([
        {
          subject_name: 'Toán',
          class_name: student.class_name,
          academic_year: '2024-2025',
          semester: 'HK1',
          grade_data: {
            'Diem_thuong_xuyen': { Diem: 8.5, He_so: 1 },
            'Diem_thi_giua_ki': { Diem: 9.0, He_so: 2 },
            'Diem_thi_cuoi_ki': { Diem: 8.0, He_so: 3 }
          },
          final_grade: 8.4,
          teacher_name: 'Nguyễn Thị Lan'
        },
        {
          subject_name: 'Ngữ Văn', 
          class_name: student.class_name,
          academic_year: '2024-2025',
          semester: 'HK1',
          grade_data: {
            'Diem_mieng': { Diem: 7.5, He_so: 1 },
            'Diem_15_phut': { Diem: 8.0, He_so: 1 },
            'Diem_1_tiet': { Diem: 8.5, He_so: 2 },
            'Diem_cuoi_ki': { Diem: 8.0, He_so: 3 }
          },
          final_grade: 8.1,
          teacher_name: 'Trần Văn Nam'
        }
      ]);
    } finally {
      setGradesLoading(false);
    }
  };

  const closeGradesModal = () => {
    setShowGradesModal(false);
    setSelectedStudentForGrades(null);
    setStudentGrades([]);
  };

  // Feedback functions
  const handleFeedbackClick = async (student) => {
    setSelectedStudentForFeedback(student);
    setGeneratedFeedback('');
    setFeedbackError('');
    setFeedbackSuccess(false);
    
    // Initialize form with student name first
    let initialForm = {
      student_name: student.full_name,
      score: '',
      score_trend: '',
      attendance_rate: '',
      notes: ''
    };
    
    // Fetch student's average grade (use same calculation as in grades modal)
    try {
      console.log('🎯 Fetching grades for feedback form for student:', student);
      const gradesResponse = await ApiService.getStudentGrades(student.id);
      console.log('📊 Grades response for feedback:', gradesResponse);
      
      if (gradesResponse.success && gradesResponse.data) {
        const responseData = gradesResponse.data;
        const grades = responseData.grades; // Access the grades array from the response object
        console.log('📋 Full response data:', responseData);
        console.log('📋 Grades array:', grades);
        console.log('📏 Grades array length:', grades?.length);
        console.log('🔍 First grade object:', grades?.[0]);
        
        if (Array.isArray(grades) && grades.length > 0) {
          // Use final_grade (điểm trung bình môn) instead of individual scores
          const validGrades = grades.filter(grade => grade.final_grade !== null && grade.final_grade !== undefined);
          console.log('✅ Valid grades with final_grade:', validGrades);
          
          if (validGrades.length > 0) {
            const avgScore = (validGrades.reduce((sum, grade) => sum + (grade.final_grade || 0), 0) / validGrades.length).toFixed(1);
            console.log('📊 Calculated average score for feedback:', avgScore);
            
            initialForm.score = avgScore;
          } else {
            console.log('⚠️ No valid final_grade found in grades');
          }
        } else {
          console.log('⚠️ No grades found for student - not an array or empty');
          console.log('📋 Grades type:', typeof grades);
          console.log('📋 Is array:', Array.isArray(grades));
        }
      } else {
        console.log('❌ Failed to fetch grades:', gradesResponse);
      }
    } catch (error) {
      console.error('Error fetching student grades:', error);
    }
    
    // Set form with calculated score
    console.log('📝 Setting feedback form:', initialForm);
    setFeedbackForm(initialForm);
    setShowFeedbackModal(true);
  };

  const closeFeedbackModal = () => {
    setShowFeedbackModal(false);
    setSelectedStudentForFeedback(null);
    setFeedbackForm({
      student_name: '',
      score: '',
      score_trend: '',
      attendance_rate: '',
      notes: ''
    });
    setGeneratedFeedback('');
    setFeedbackError('');
    setFeedbackSuccess(false);
  };

  const handleFeedbackFormChange = (field, value) => {
    setFeedbackForm(prev => ({
      ...prev,
      [field]: value
    }));
    setFeedbackError('');
    setFeedbackSuccess(false);
  };

  const validateFeedbackForm = () => {
    const { student_name, score, score_trend, attendance_rate } = feedbackForm;
    
    if (!student_name.trim()) {
      setFeedbackError('Vui lòng nhập tên học sinh');
      return false;
    }
    
    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
      setFeedbackError('Điểm số phải từ 0 đến 10');
      return false;
    }
    
    if (!score_trend) {
      setFeedbackError('Vui lòng chọn xu hướng điểm số');
      return false;
    }
    
    const attendanceNum = parseInt(attendance_rate);
    if (isNaN(attendanceNum) || attendanceNum < 0 || attendanceNum > 100) {
      setFeedbackError('Tỷ lệ chuyên cần phải từ 0 đến 100%');
      return false;
    }
    
    return true;
  };

  const generateFeedback = async () => {
    if (!validateFeedbackForm()) return;

    setFeedbackLoading(true);
    setFeedbackError('');
    setGeneratedFeedback('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/feedback/generate-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_name: feedbackForm.student_name,
          score: parseFloat(feedbackForm.score),
          score_trend: feedbackForm.score_trend,
          attendance_rate: parseInt(feedbackForm.attendance_rate),
          notes: feedbackForm.notes
        })
      });

      const result = await response.json();

      if (result.success) {
        setGeneratedFeedback(result.feedback);
        setFeedbackSuccess(true);
      } else {
        setFeedbackError(result.error || 'Không thể tạo nhận xét');
      }
    } catch (err) {
      console.error('Error generating feedback:', err);
      setFeedbackError('Lỗi kết nối server. Vui lòng thử lại.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const sendSMS = async () => {
    if (!generatedFeedback || !selectedStudentForFeedback) {
      setFeedbackError('Không có nhận xét để gửi');
      return;
    }

    setSmsLoading(true);
    setFeedbackError('');

    try {
      const response = await ApiService.sendSMSFeedback({
        student_id: selectedStudentForFeedback.id,
        feedback: generatedFeedback,
        parent_phone: selectedStudentForFeedback.parent_phone || selectedStudentForFeedback.phone
      });

      if (response.success) {
        alert('Gửi SMS thành công!');
      } else {
        setFeedbackError(response.error || 'Không thể gửi SMS');
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      setFeedbackError('Lỗi kết nối server khi gửi SMS');
    } finally {
      setSmsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-32 h-32 rounded-full border-b-2 border-blue-600 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="student-list">
      <div className="mb-8">
        <h2 className="mb-2 text-3xl font-bold text-gray-800">Danh sách học sinh</h2>
        <p className="text-gray-600">Quản lý thông tin học sinh</p>
        {error && (
          <div className="p-3 mt-2 text-yellow-700 bg-yellow-100 rounded border border-yellow-400">
            {error}
          </div>
        )}
      </div>

      {/* Search and Filter */}
      <div className="p-6 mb-6 bg-white rounded-lg shadow-md">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Tìm kiếm
            </label>
            <input
              type="text"
              placeholder="Tên hoặc mã học sinh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Lớp
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {/* Show placeholder for homeroom teachers, "Tất cả lớp" for others */}
              {isHomeroomTeacher() ? (
                <option value="">Chọn lớp chủ nhiệm</option>
              ) : (
                <option value="">Tất cả lớp</option>
              )}
              {availableClasses.map(className => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Hiển thị
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-600">Đã xóa</span>
              </label>
              <button
                onClick={fetchStudents}
                className="px-4 py-2 text-white bg-blue-600 rounded-md transition-colors hover:bg-blue-700"
              >
                Làm mới
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredStudents.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <div className="mb-4 text-6xl text-gray-400">👥</div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              {searchTerm || selectedClass ? 'Không tìm thấy học sinh nào' : 'Chưa có học sinh nào'}
            </h3>
            <p className="text-gray-500">
              {searchTerm || selectedClass ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm' : 'Hãy thêm học sinh mới để bắt đầu'}
            </p>
          </div>
        ) : (
          filteredStudents.map((student) => (
            <div key={student.id} className="overflow-hidden bg-white rounded-xl border border-gray-100 shadow-lg transition-all duration-300 hover:shadow-xl">
              {/* Header with avatar and basic info */}
              <div className="p-6 text-white bg-gradient-to-r from-blue-500 to-purple-600">
                <div className="flex items-center space-x-4">
                  <div className="flex justify-center items-center w-16 h-16 text-2xl font-bold rounded-full bg-white/20">
                    {student.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold truncate">{student.full_name}</h3>
                    <p className="text-sm text-blue-100">{student.student_id}</p>
                    <div className="inline-flex items-center px-2 py-1 mt-1 text-xs rounded-full bg-white/20">
                      🎓 {student.class_name}
                    </div>
                  </div>
                </div>
              </div>

              {/* Student info */}
              <div className="p-6 space-y-3">
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex items-center space-x-3">
                    <span className="flex justify-center items-center w-5 h-5 text-gray-400">📧</span>
                    <span className="text-gray-600 truncate">{student.email || 'Chưa có email'}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="flex justify-center items-center w-5 h-5 text-gray-400">📱</span>
                    <span className="text-gray-600">{student.phone || 'Chưa có SĐT'}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="flex justify-center items-center w-5 h-5 text-gray-400">📚</span>
                    <span className="text-gray-600">Khối {student.grade || 'N/A'}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <button
                      onClick={() => handleFeedbackClick(student)}
                      className="flex justify-center items-center px-2 py-2 space-x-1 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg transition-colors hover:bg-indigo-100"
                      title="Tạo nhận xét"
                    >
                      <span className="text-base">💬</span>
                      <span>Nhận xét</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setSelectedStudentForMultiple(student);
                        setShowMultipleModal(true);
                      }}
                      className="flex justify-center items-center px-2 py-2 space-x-1 text-sm font-medium text-green-700 bg-green-50 rounded-lg transition-colors hover:bg-green-100"
                      title="Nhiều ảnh"
                    >
                      <span className="text-base">📸</span>
                      <span>Nhiều ảnh</span>
                    </button>
                    
                    <button
                      onClick={() => handleViewGrades(student)}
                      className="flex justify-center items-center px-2 py-2 space-x-1 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg transition-colors hover:bg-purple-100"
                      title="Xem điểm số"
                    >
                      <span className="text-base">📊</span>
                      <span>Điểm số</span>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleEdit(student)}
                      className="flex justify-center items-center px-2 py-2 space-x-1 text-sm font-medium text-amber-700 bg-amber-50 rounded-lg transition-colors hover:bg-amber-100"
                      title="Sửa thông tin"
                    >
                      <span className="text-base">✏️</span>
                      <span>Sửa</span>
                    </button>
                    
                    <button
                      onClick={() => handleDelete(student.id)}
                      className="flex justify-center items-center px-2 py-2 space-x-1 text-sm font-medium text-red-700 bg-red-50 rounded-lg transition-colors hover:bg-red-100"
                      title="Xóa học sinh"
                    >
                      <span className="text-base">🗑️</span>
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

        {/* Face Registration Modal */}
        {showFaceModal && (
          <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
            <div className="p-6 mx-4 w-full max-w-2xl bg-white rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Đăng ký khuôn mặt - {selectedStudentForFace?.full_name}
                </h3>
                <button
                  onClick={closeFaceModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Mode Selection */}
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                  <button
                    onClick={() => setRegistrationMode('camera')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      registrationMode === 'camera'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    📷 Camera
                  </button>
                  <button
                    onClick={() => setRegistrationMode('upload')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      registrationMode === 'upload'
                        ? 'bg-white text-purple-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    📁 Upload
                  </button>
                  <button
                    onClick={() => setRegistrationMode('multiple')}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      registrationMode === 'multiple'
                        ? 'bg-white text-green-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    📸 Nhiều ảnh
                  </button>
                </div>

                {/* Camera Mode */}
                {registrationMode === 'camera' && (
                  <>
                    {!capturedImage ? (
                      <div className="text-center">
                        {cameraError ? (
                          <div className="p-6 bg-red-50 rounded-lg border border-red-200">
                            <div className="mb-2 text-lg text-red-600">❌</div>
                            <p className="font-medium text-red-700">{cameraError}</p>
                            <div className="mt-3 space-x-2">
                              <button
                                onClick={resetCamera}
                                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                              >
                                🔄 Thử lại Camera
                              </button>
                              <button
                                onClick={() => setRegistrationMode('upload')}
                                className="px-4 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700"
                              >
                                📁 Chuyển sang Upload
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="relative">
                              <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="mx-auto w-full max-w-md rounded-lg border"
                              />
                              {!cameraReady && (
                                <div className="flex absolute inset-0 justify-center items-center bg-gray-200 rounded-lg">
                                  <div className="text-center">
                                    <div className="mx-auto mb-2 w-8 h-8 rounded-full border-b-2 border-blue-600 animate-spin"></div>
                                    <p className="text-gray-600">Đang khởi động camera...</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="mt-4">
                              <button
                                onClick={capturePhoto}
                                disabled={!cameraReady}
                                className={`px-6 py-2 rounded-md transition-colors ${
                                  cameraReady 
                                    ? 'text-white bg-blue-600 hover:bg-blue-700' 
                                    : 'text-gray-500 bg-gray-300 cursor-not-allowed'
                                }`}
                              >
                                📸 Chụp ảnh
                              </button>
                            </div>
                            <p className="mt-2 text-sm text-gray-600">
                              {cameraReady 
                                ? 'Hãy nhìn thẳng vào camera và bấm "Chụp ảnh"'
                                : 'Đang chuẩn bị camera, vui lòng đợi...'
                              }
                            </p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-center">
                        <img
                          src={capturedImage}
                          alt="Captured face"
                          className="mx-auto w-full max-w-md rounded-lg border"
                        />
                        <div className="mt-4 space-x-2">
                          <button
                            onClick={() => setCapturedImage(null)}
                            className="px-4 py-2 text-white bg-gray-500 rounded-md hover:bg-gray-600"
                          >
                            🔄 Chụp lại
                          </button>
                          <button
                            onClick={submitFaceRegistration}
                            disabled={faceRegistrationLoading}
                            className="px-6 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                          >
                            {faceRegistrationLoading ? '⏳ Đang xử lý...' : '✅ Đăng ký'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Upload Mode */}
                {registrationMode === 'upload' && (
                  <>
                    {!uploadedImage ? (
                      <div className="text-center">
                        <div className="p-8 rounded-lg border-2 border-gray-300 border-dashed">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-6 py-3 text-white bg-purple-600 rounded-md hover:bg-purple-700"
                          >
                            📁 Chọn ảnh từ máy tính
                          </button>
                          <p className="mt-2 text-sm text-gray-600">
                            Chọn ảnh khuôn mặt rõ ràng, đủ sáng
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <img
                          src={uploadedImage.previewUrl}
                          alt="Uploaded face"
                          className="mx-auto w-full max-w-md rounded-lg border"
                        />
                        <div className="mt-4 space-x-2">
                          <button
                            onClick={() => {
                              URL.revokeObjectURL(uploadedImage.previewUrl);
                              setUploadedImage(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                            className="px-4 py-2 text-white bg-gray-500 rounded-md hover:bg-gray-600"
                          >
                            🔄 Chọn lại
                          </button>
                          <button
                            onClick={submitFaceRegistration}
                            disabled={faceRegistrationLoading}
                            className="px-6 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                          >
                            {faceRegistrationLoading ? '⏳ Đang xử lý...' : '✅ Đăng ký'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Multiple Mode */}
                {registrationMode === 'multiple' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="mb-2 font-semibold text-blue-800">📸 Đăng ký nhiều ảnh (Độ chính xác cao)</h4>
                      <p className="text-sm text-blue-700">
                        Chụp 5-10 ảnh với góc độ khác nhau để đạt độ chính xác 90%+:
                      </p>
                      <ul className="mt-2 space-y-1 text-xs text-blue-600">
                        <li>• Nhìn thẳng, nghiêng trái/phải 15-30°</li>
                        <li>• Cười và không cười</li>
                        <li>• Ánh sáng tự nhiên và đèn</li>
                        <li>• Khoảng cách gần và xa</li>
                      </ul>
                    </div>

                    {multipleFiles.length === 0 ? (
                      <div className="text-center">
                        <div className="p-8 rounded-lg border-2 border-green-300 border-dashed">
                          <input
                            ref={multipleFileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleMultipleFileSelect}
                            className="hidden"
                          />
                          <button
                            onClick={() => multipleFileInputRef.current?.click()}
                            className="px-6 py-3 text-white bg-green-600 rounded-md hover:bg-green-700"
                          >
                            📸 Chọn nhiều ảnh (tối đa 10)
                          </button>
                          <p className="mt-2 text-sm text-gray-600">
                            Chọn 5-10 ảnh khuôn mặt với góc độ khác nhau
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="font-medium">Đã chọn {multipleFiles.length} ảnh:</h5>
                          <button
                            onClick={() => multipleFileInputRef.current?.click()}
                            className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                          >
                            + Thêm ảnh
                          </button>
                        </div>
                        
                        <div className="grid overflow-y-auto grid-cols-3 gap-3 max-h-60">
                          {multipleFiles.map((fileObj) => (
                            <div key={fileObj.id} className="relative">
                              <img
                                src={fileObj.previewUrl}
                                alt={fileObj.name}
                                className="object-cover w-full h-24 rounded border"
                              />
                              <button
                                onClick={() => removeMultipleFile(fileObj.id)}
                                className="absolute -top-2 -right-2 w-6 h-6 text-xs text-white bg-red-500 rounded-full hover:bg-red-600"
                              >
                                ×
                              </button>
                              {fileObj.status !== 'pending' && (
                                <div className={`absolute bottom-0 left-0 right-0 text-xs p-1 text-center ${
                                  fileObj.status === 'success' 
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-red-500 text-white'
                                }`}>
                                  {fileObj.status === 'success' ? '✅' : '❌'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-4 space-x-2 text-center">
                          <button
                            onClick={() => {
                              multipleFiles.forEach(file => URL.revokeObjectURL(file.previewUrl));
                              setMultipleFiles([]);
                              setMultipleResults([]);
                              if (multipleFileInputRef.current) {
                                multipleFileInputRef.current.value = '';
                              }
                            }}
                            className="px-4 py-2 text-white bg-gray-500 rounded-md hover:bg-gray-600"
                          >
                            🔄 Chọn lại
                          </button>
                          <button
                            onClick={submitMultipleFaceRegistration}
                            disabled={faceRegistrationLoading || multipleFiles.length === 0}
                            className="px-6 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                          >
                            {faceRegistrationLoading ? '⏳ Đang xử lý...' : `✅ Đăng ký ${multipleFiles.length} ảnh`}
                          </button>
                        </div>
                        
                        {multipleResults.length > 0 && (
                          <div className="p-3 mt-4 bg-gray-50 rounded">
                            <h6 className="mb-2 font-medium">Kết quả:</h6>
                            <div className="space-y-1 text-sm">
                              {multipleResults.map((result, index) => (
                                <div key={index} className={`flex items-center gap-2 ${
                                  result.success ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  <span>{result.success ? '✅' : '❌'}</span>
                                  <span>{result.message}</span>
                                  {result.detection_score && (
                                    <span className="text-xs text-gray-500">
                                      ({(result.detection_score * 100).toFixed(1)}%)
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
          </div>
        )}

      {/* Summary */}
      <div className="p-4 mt-6 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          Hiển thị {filteredStudents.length} / {students.length} học sinh
          {selectedClass && ` trong lớp ${selectedClass}`}
          {searchTerm && ` với từ khóa "${searchTerm}"`}
        </p>
      </div>

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
                    placeholder="VD: Nguyễn Văn Bình"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    SĐT phụ huynh
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

              <div className="col-span-2">
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

              <div className="flex justify-end pt-4 space-x-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 font-medium text-gray-700 bg-gray-100 rounded-lg transition-colors hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={submitEditForm}
                  disabled={editLoading}
                  className="px-6 py-2 font-medium text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {editLoading ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multiple Face Registration Modal */}
      {showMultipleModal && selectedStudentForMultiple && (
        <MultipleFaceRegistration
          student={selectedStudentForMultiple}
          onClose={() => {
            setShowMultipleModal(false);
            setSelectedStudentForMultiple(null);
          }}
          onSuccess={() => {
            fetchStudents(); // Refresh students list
          }}
        />
      )}

      {/* Student Grades Modal */}
      {showGradesModal && selectedStudentForGrades && (
        <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
          <div className="overflow-y-auto mx-4 w-full max-w-6xl max-h-screen bg-white rounded-lg">
            {/* Modal Header */}
            <div className="p-6 text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-t-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">📊 Bảng điểm</h3>
                  <p className="mt-1 text-purple-100">
                    {selectedStudentForGrades.full_name} - {selectedStudentForGrades.student_id}
                  </p>
                  <p className="text-sm text-purple-100">
                    Lớp {selectedStudentForGrades.class_name} - Khối {selectedStudentForGrades.grade}
                  </p>
                </div>
                <button
                  onClick={closeGradesModal}
                  className="text-3xl font-bold text-white hover:text-purple-200"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {gradesLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="w-16 h-16 rounded-full border-b-2 border-purple-600 animate-spin"></div>
                  <span className="ml-4 text-lg text-gray-600">Đang tải điểm số...</span>
                </div>
              ) : studentGrades.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mb-4 text-6xl text-gray-400">📝</div>
                  <h4 className="mb-2 text-lg font-medium text-gray-900">
                    Chưa có điểm số
                  </h4>
                  <p className="text-gray-500">
                    Học sinh này chưa có điểm số nào được nhập vào hệ thống.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Academic Year & Semester Filter */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-gray-900">Năm học: 2024-2025</h4>
                        <p className="text-sm text-gray-600">Học kỳ: HK1</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Tổng số môn học</p>
                        <p className="text-2xl font-bold text-purple-600">{studentGrades.length}</p>
                      </div>
                    </div>
                  </div>

                  {/* Grades Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-sm font-medium tracking-wider text-left text-gray-500 uppercase border-b">
                            Môn học
                          </th>
                          <th className="px-6 py-4 text-sm font-medium tracking-wider text-left text-gray-500 uppercase border-b">
                            Giáo viên
                          </th>
                          <th className="px-6 py-4 text-sm font-medium tracking-wider text-center text-gray-500 uppercase border-b">
                            Chi tiết điểm
                          </th>
                          <th className="px-6 py-4 text-sm font-medium tracking-wider text-center text-gray-500 uppercase border-b">
                            Điểm TB
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {studentGrades.map((gradeRecord, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="flex justify-center items-center w-10 h-10 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
                                  {gradeRecord.subject_name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {gradeRecord.subject_name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {gradeRecord.class_name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">
                                {gradeRecord.teacher_name || 'Chưa có thông tin'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {gradeRecord.academic_year} - {gradeRecord.semester}
                              </div>
                            </td>
                            
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-2 justify-center">
                                {gradeRecord.grade_data && Object.keys(gradeRecord.grade_data).filter(key => 
                                  key !== 'Mon_hoc' && gradeRecord.grade_data[key]?.Diem
                                ).map(columnName => (
                                  <div key={columnName} className="px-3 py-1 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="text-xs font-medium text-blue-600">
                                      {columnName.replace(/_/g, ' ').replace(/Diem/g, 'Điểm')}
                                    </div>
                                    <div className="text-sm font-bold text-blue-800">
                                      {gradeRecord.grade_data[columnName]?.Diem}
                                      <span className="ml-1 text-xs text-blue-600">
                                        (HS: {gradeRecord.grade_data[columnName]?.He_so})
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                            
                            <td className="px-6 py-4 text-center">
                              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                gradeRecord.final_grade >= 8.0 
                                  ? 'bg-green-100 text-green-800'
                                  : gradeRecord.final_grade >= 6.5
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : gradeRecord.final_grade >= 5.0
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {gradeRecord.final_grade}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary */}
                  <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                    <h4 className="mb-3 font-medium text-gray-900">📈 Tổng kết</h4>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Điểm trung bình chung</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {studentGrades.length > 0 
                            ? (studentGrades.reduce((sum, grade) => sum + (grade.final_grade || 0), 0) / studentGrades.length).toFixed(2)
                            : '0.00'
                          }
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Số môn &gt;= 8.0</p>
                        <p className="text-2xl font-bold text-green-600">
                          {studentGrades.filter(grade => (grade.final_grade || 0) >= 8.0).length}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Số môn &lt; 5.0</p>
                        <p className="text-2xl font-bold text-red-600">
                          {studentGrades.filter(grade => (grade.final_grade || 0) < 5.0).length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
              <div className="flex justify-end">
                <button
                  onClick={closeGradesModal}
                  className="px-6 py-2 font-medium text-white bg-gray-600 rounded-lg transition-colors hover:bg-gray-700"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && selectedStudentForFeedback && (
        <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
          <div className="overflow-y-auto mx-4 w-full max-w-4xl max-h-screen bg-white rounded-lg">
            {/* Modal Header */}
            <div className="p-6 text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">💬 Tạo nhận xét học sinh</h3>
                  <p className="mt-1 text-indigo-100">
                    {selectedStudentForFeedback.full_name} - {selectedStudentForFeedback.student_id}
                  </p>
                  <p className="text-sm text-indigo-100">
                    Lớp {selectedStudentForFeedback.class_name} - Khối {selectedStudentForFeedback.grade}
                  </p>
                </div>
                <button
                  onClick={closeFeedbackModal}
                  className="text-3xl font-bold text-white hover:text-indigo-200"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Error Alert */}
              {feedbackError && (
                <div className="p-4 mb-4 bg-red-50 rounded-md border border-red-200">
                  <div className="flex">
                    <div className="w-5 h-5 text-red-400">⚠️</div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{feedbackError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Alert */}
              {feedbackSuccess && (
                <div className="p-4 mb-4 bg-green-50 rounded-md border border-green-200">
                  <div className="flex">
                    <div className="w-5 h-5 text-green-400">✅</div>
                    <div className="ml-3">
                      <p className="text-sm text-green-800">Tạo nhận xét thành công!</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Input Form */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Thông Tin Học Sinh</h3>
                  </div>
                  <div className="px-6 py-4 space-y-4">
                    {/* Student Name */}
                    <div>
                      <label htmlFor="student_name" className="block mb-1 text-sm font-medium text-gray-700">
                        Tên Học Sinh
                      </label>
                      <input
                        id="student_name"
                        type="text"
                        value={feedbackForm.student_name}
                        onChange={(e) => handleFeedbackFormChange('student_name', e.target.value)}
                        placeholder="Nhập tên học sinh"
                        className="px-3 py-2 w-full rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        readOnly
                      />
                    </div>

                    {/* Score */}
                    <div>
                      <label htmlFor="score" className="block mb-1 text-sm font-medium text-gray-700">
                        Điểm Số (0-10)
                      </label>
                      <input
                        id="score"
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={feedbackForm.score}
                        onChange={(e) => handleFeedbackFormChange('score', e.target.value)}
                        placeholder="8.5"
                        className="px-3 py-2 w-full rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {/* Score Trend */}
                    <div>
                      <label htmlFor="score_trend" className="block mb-1 text-sm font-medium text-gray-700">
                        Xu Hướng Điểm Số
                      </label>
                      <select
                        id="score_trend"
                        value={feedbackForm.score_trend}
                        onChange={(e) => handleFeedbackFormChange('score_trend', e.target.value)}
                        className="px-3 py-2 w-full rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Chọn xu hướng</option>
                        <option value="tăng">Tăng</option>
                        <option value="giảm">Giảm</option>
                        <option value="ổn định">Ổn định</option>
                      </select>
                    </div>

                    {/* Attendance Rate */}
                    <div>
                      <label htmlFor="attendance_rate" className="block mb-1 text-sm font-medium text-gray-700">
                        Tỷ Lệ Chuyên Cần (%)
                      </label>
                      <input
                        id="attendance_rate"
                        type="number"
                        min="0"
                        max="100"
                        value={feedbackForm.attendance_rate}
                        onChange={(e) => handleFeedbackFormChange('attendance_rate', e.target.value)}
                        placeholder="95"
                        className="px-3 py-2 w-full rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label htmlFor="notes" className="block mb-1 text-sm font-medium text-gray-700">
                        Ghi Chú Thêm (Tùy chọn)
                      </label>
                      <textarea
                        id="notes"
                        value={feedbackForm.notes}
                        onChange={(e) => handleFeedbackFormChange('notes', e.target.value)}
                        placeholder="Ví dụ: Học sinh rất tích cực tham gia hoạt động lớp..."
                        rows={3}
                        className="px-3 py-2 w-full rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {/* Generate Button */}
                    <button 
                      onClick={generateFeedback} 
                      disabled={feedbackLoading}
                      className="flex justify-center items-center px-4 py-2 w-full font-medium text-white bg-indigo-600 rounded-md transition-colors hover:bg-indigo-700 disabled:bg-gray-400"
                    >
                      {feedbackLoading ? (
                        <>
                          <svg className="mr-2 -ml-1 w-4 h-4 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Đang tạo...
                        </>
                      ) : (
                        <>
                          💬 Tạo Nhận Xét
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Result Display */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Nhận Xét Được Tạo</h3>
                  </div>
                  <div className="px-6 py-4">
                    {generatedFeedback ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                          <div className="flex gap-3 items-start">
                            <div className="flex-shrink-0 mt-1 w-5 h-5 text-indigo-600">💬</div>
                            <div>
                              <h4 className="mb-2 font-medium text-indigo-900">
                                Nhận xét cho {feedbackForm.student_name}:
                              </h4>
                              <div className="text-sm text-indigo-800 whitespace-pre-wrap">
                                {generatedFeedback}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* SMS Button */}
                        <button 
                          onClick={sendSMS}
                          disabled={smsLoading}
                          className="flex justify-center items-center px-4 py-2 w-full font-medium text-white bg-green-600 rounded-md transition-colors hover:bg-green-700 disabled:bg-gray-400"
                        >
                          {smsLoading ? (
                            <>
                              <svg className="mr-2 -ml-1 w-4 h-4 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Đang gửi...
                            </>
                          ) : (
                            <>
                              📱 Gửi SMS cho phụ huynh
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-gray-500">
                        <div className="mb-4 text-6xl">💬</div>
                        <p>Nhấn "Tạo nhận xét" để AI tự động tạo nhận xét cho học sinh</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
              <div className="flex justify-end">
                <button
                  onClick={closeFeedbackModal}
                  className="px-6 py-2 font-medium text-white bg-gray-600 rounded-lg transition-colors hover:bg-gray-700"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentList; 