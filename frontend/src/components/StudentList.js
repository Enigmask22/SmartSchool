import React, { useState, useEffect, useRef } from 'react';
import ApiService from '../services/api';
import MultipleFaceRegistration from './MultipleFaceRegistration';

const StudentList = () => {
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

  useEffect(() => {
    fetchStudents();
  }, []);
  
  useEffect(() => {
    fetchStudents();
  }, [showInactive]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Add is_active parameter based on showInactive checkbox
      const params = showInactive ? { is_active: null } : {};
      const response = await ApiService.getStudents(params);
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

  // Get unique classes for filter - với safety check
  const classes = Array.isArray(students) ? 
    [...new Set(students.map(student => student.class_name).filter(Boolean))].sort() : 
    [];

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="student-list">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Danh sách học sinh</h2>
        <p className="text-gray-600">Quản lý thông tin học sinh</p>
        {error && (
          <div className="mt-2 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tìm kiếm
            </label>
            <input
              type="text"
              placeholder="Tên hoặc mã học sinh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lớp
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả lớp</option>
              {classes.map(className => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hiển thị
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-600">Đã xóa</span>
              </label>
              <button
                onClick={fetchStudents}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Làm mới
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || selectedClass ? 'Không tìm thấy học sinh nào' : 'Chưa có học sinh nào'}
            </h3>
            <p className="text-gray-500">
              {searchTerm || selectedClass ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm' : 'Hãy thêm học sinh mới để bắt đầu'}
            </p>
          </div>
        ) : (
          filteredStudents.map((student) => (
            <div key={student.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden">
              {/* Header with avatar and basic info */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                    {student.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold truncate">{student.full_name}</h3>
                    <p className="text-blue-100 text-sm">{student.student_id}</p>
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-white/20 mt-1">
                      🎓 {student.class_name}
                    </div>
                  </div>
                </div>
              </div>

              {/* Student info */}
              <div className="p-6 space-y-3">
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex items-center space-x-3">
                    <span className="w-5 h-5 flex items-center justify-center text-gray-400">📧</span>
                    <span className="text-gray-600 truncate">{student.email || 'Chưa có email'}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="w-5 h-5 flex items-center justify-center text-gray-400">📱</span>
                    <span className="text-gray-600">{student.phone || 'Chưa có SĐT'}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="w-5 h-5 flex items-center justify-center text-gray-400">📚</span>
                    <span className="text-gray-600">Khối {student.grade || 'N/A'}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => startFaceRegistration(student)}
                      className="flex items-center justify-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      title="Đăng ký khuôn mặt"
                    >
                      <span className="text-base">📷</span>
                      <span>Đăng ký</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setSelectedStudentForMultiple(student);
                        setShowMultipleModal(true);
                      }}
                      className="flex items-center justify-center space-x-2 bg-green-50 hover:bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      title="Nhiều ảnh"
                    >
                      <span className="text-base">📸</span>
                      <span>Nhiều ảnh</span>
                    </button>
                    
                    <button
                      onClick={() => handleEdit(student)}
                      className="flex items-center justify-center space-x-2 bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      title="Sửa thông tin"
                    >
                      <span className="text-base">✏️</span>
                      <span>Sửa</span>
                    </button>
                    
                    <button
                      onClick={() => handleDelete(student.id)}
                      className="flex items-center justify-center space-x-2 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
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
                <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
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
                          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                            <div className="text-red-600 text-lg mb-2">❌</div>
                            <p className="text-red-700 font-medium">{cameraError}</p>
                            <div className="mt-3 space-x-2">
                              <button
                                onClick={resetCamera}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                              >
                                🔄 Thử lại Camera
                              </button>
                              <button
                                onClick={() => setRegistrationMode('upload')}
                                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
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
                                className="w-full max-w-md mx-auto rounded-lg border"
                              />
                              {!cameraReady && (
                                <div className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center">
                                  <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
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
                                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                📸 Chụp ảnh
                              </button>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
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
                          className="w-full max-w-md mx-auto rounded-lg border"
                        />
                        <div className="mt-4 space-x-2">
                          <button
                            onClick={() => setCapturedImage(null)}
                            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                          >
                            🔄 Chụp lại
                          </button>
                          <button
                            onClick={submitFaceRegistration}
                            disabled={faceRegistrationLoading}
                            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
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
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700"
                          >
                            📁 Chọn ảnh từ máy tính
                          </button>
                          <p className="text-sm text-gray-600 mt-2">
                            Chọn ảnh khuôn mặt rõ ràng, đủ sáng
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <img
                          src={uploadedImage.previewUrl}
                          alt="Uploaded face"
                          className="w-full max-w-md mx-auto rounded-lg border"
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
                            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                          >
                            🔄 Chọn lại
                          </button>
                          <button
                            onClick={submitFaceRegistration}
                            disabled={faceRegistrationLoading}
                            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
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
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2">📸 Đăng ký nhiều ảnh (Độ chính xác cao)</h4>
                      <p className="text-sm text-blue-700">
                        Chụp 5-10 ảnh với góc độ khác nhau để đạt độ chính xác 90%+:
                      </p>
                      <ul className="text-xs text-blue-600 mt-2 space-y-1">
                        <li>• Nhìn thẳng, nghiêng trái/phải 15-30°</li>
                        <li>• Cười và không cười</li>
                        <li>• Ánh sáng tự nhiên và đèn</li>
                        <li>• Khoảng cách gần và xa</li>
                      </ul>
                    </div>

                    {multipleFiles.length === 0 ? (
                      <div className="text-center">
                        <div className="border-2 border-dashed border-green-300 rounded-lg p-8">
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
                            className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700"
                          >
                            📸 Chọn nhiều ảnh (tối đa 10)
                          </button>
                          <p className="text-sm text-gray-600 mt-2">
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
                            className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
                          >
                            + Thêm ảnh
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                          {multipleFiles.map((fileObj) => (
                            <div key={fileObj.id} className="relative">
                              <img
                                src={fileObj.previewUrl}
                                alt={fileObj.name}
                                className="w-full h-24 object-cover rounded border"
                              />
                              <button
                                onClick={() => removeMultipleFile(fileObj.id)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs hover:bg-red-600"
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
                        
                        <div className="mt-4 text-center space-x-2">
                          <button
                            onClick={() => {
                              multipleFiles.forEach(file => URL.revokeObjectURL(file.previewUrl));
                              setMultipleFiles([]);
                              setMultipleResults([]);
                              if (multipleFileInputRef.current) {
                                multipleFileInputRef.current.value = '';
                              }
                            }}
                            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                          >
                            🔄 Chọn lại
                          </button>
                          <button
                            onClick={submitMultipleFaceRegistration}
                            disabled={faceRegistrationLoading || multipleFiles.length === 0}
                            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                          >
                            {faceRegistrationLoading ? '⏳ Đang xử lý...' : `✅ Đăng ký ${multipleFiles.length} ảnh`}
                          </button>
                        </div>
                        
                        {multipleResults.length > 0 && (
                          <div className="mt-4 bg-gray-50 p-3 rounded">
                            <h6 className="font-medium mb-2">Kết quả:</h6>
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
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          Hiển thị {filteredStudents.length} / {students.length} học sinh
          {selectedClass && ` trong lớp ${selectedClass}`}
          {searchTerm && ` với từ khóa "${searchTerm}"`}
        </p>
      </div>

      {/* Edit Student Modal */}
      {showEditModal && selectedStudentForEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Sửa thông tin học sinh
              </h3>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mã học sinh (Không thể thay đổi)
                  </label>
                  <input
                    type="text"
                    value={selectedStudentForEdit.student_id || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Họ và tên *
                  </label>
                  <input
                    type="text"
                    value={editForm.full_name || ''}
                    onChange={(e) => handleEditFormChange('full_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: Nguyễn Văn An"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => handleEditFormChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: student@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone || ''}
                    onChange={(e) => handleEditFormChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: 0123456789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lớp
                  </label>
                  <input
                    type="text"
                    value={editForm.class_name || ''}
                    onChange={(e) => handleEditFormChange('class_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: 10A1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Khối
                  </label>
                  <select
                    value={editForm.grade || ''}
                    onChange={(e) => handleEditFormChange('grade', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Chọn khối</option>
                    <option value="10">Khối 10</option>
                    <option value="11">Khối 11</option>
                    <option value="12">Khối 12</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    value={editForm.date_of_birth || ''}
                    onChange={(e) => handleEditFormChange('date_of_birth', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên phụ huynh
                  </label>
                  <input
                    type="text"
                    value={editForm.parent_name || ''}
                    onChange={(e) => handleEditFormChange('parent_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: Nguyễn Văn Bình"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SĐT phụ huynh
                  </label>
                  <input
                    type="tel"
                    value={editForm.parent_phone || ''}
                    onChange={(e) => handleEditFormChange('parent_phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: 0987654321"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Địa chỉ
                </label>
                <textarea
                  value={editForm.address || ''}
                  onChange={(e) => handleEditFormChange('address', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: 123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={submitEditForm}
                  disabled={editLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
    </div>
  );
};

export default StudentList; 