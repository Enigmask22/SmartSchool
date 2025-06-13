import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

const FaceManagement = () => {
  const [aiStatus, setAiStatus] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch AI status and students data in parallel
      const [statusResponse, studentsResponse] = await Promise.all([
        fetch('http://localhost:8000/api/ai/status'),
        ApiService.getStudents({})
      ]);
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setAiStatus(statusData.data);
      }
      
      // Handle students response properly
      if (studentsResponse.success && studentsResponse.data) {
        setStudents(Array.isArray(studentsResponse.data) ? studentsResponse.data : []);
      } else {
        setStudents([]);
      }
      
      // Log để debug
      console.log('Students data:', studentsResponse);
      if (studentsResponse && studentsResponse.length > 0) {
        console.log('Sample student:', studentsResponse[0]);
        console.log('Has insightface_encoding:', !!studentsResponse[0].insightface_encoding);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Không thể tải thông tin AI system');
    } finally {
      setLoading(false);
    }
  };

  const deleteFaceEncoding = async (studentId, studentName) => {
    if (!window.confirm(`Bạn có chắc muốn xóa khuôn mặt đã đăng ký của ${studentName}?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/ai/student/${studentId}/encoding`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Xóa khuôn mặt thành công!');
        fetchData(); // Refresh data
      } else {
        alert(`Lỗi: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting face encoding:', error);
      alert('Có lỗi xảy ra khi xóa khuôn mặt');
    }
  };

  const reloadModels = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/ai/reload-models', {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Reload models thành công!');
        fetchData(); // Refresh data
      } else {
        alert(`Lỗi: ${result.message}`);
      }
    } catch (error) {
      console.error('Error reloading models:', error);
      alert('Có lỗi xảy ra khi reload models');
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
    <div className="face-management">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Quản lý khuôn mặt AI</h2>
        <p className="text-gray-600">Theo dõi và quản lý dữ liệu khuôn mặt đã đăng ký</p>
        {error && (
          <div className="mt-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>

      {/* AI Status Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">Trạng thái hệ thống AI</h3>
        
        {aiStatus ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {aiStatus.service_status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
              </div>
              <div className="text-sm text-gray-600">Trạng thái service</div>
              <div className="text-xs text-gray-500 mt-1">{aiStatus.service_name}</div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {aiStatus.database_encodings || 0}
              </div>
              <div className="text-sm text-gray-600">Khuôn mặt đã đăng ký</div>
              <div className="text-xs text-gray-500 mt-1">Database: {aiStatus.database_encodings}, Local: {aiStatus.local_ai_encodings}</div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {aiStatus.accuracy || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Độ chính xác</div>
              <div className="text-xs text-gray-500 mt-1">
                {aiStatus.similarity_threshold ? `Threshold: ${aiStatus.similarity_threshold}` : 'Advanced AI'}
              </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {aiStatus.sync_status === 'synced' ? '✅' : '⚠️'}
              </div>
              <div className="text-sm text-gray-600">Trạng thái đồng bộ</div>
              <div className="text-xs text-gray-500 mt-1 capitalize">{aiStatus.sync_status?.replace('_', ' ')}</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Không thể tải thông tin AI status</div>
        )}

        <div className="mt-4">
          <button
            onClick={reloadModels}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 mr-3"
          >
            Reload Models
          </button>
          <button
            onClick={fetchData}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Làm mới
          </button>
        </div>
      </div>

      {/* Students with Face Registration */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold">Học sinh đã đăng ký khuôn mặt</h3>
          <p className="text-gray-600 mt-1">
            Danh sách học sinh có thể được nhận diện bằng AI
          </p>
        </div>

        {/* Header */}
        <div className="bg-gray-50 grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b items-center">
          <div className="col-span-2">Mã SV</div>
          <div className="col-span-3">Họ tên</div>
          <div className="col-span-1">Lớp</div>
          <div className="col-span-4">Trạng thái khuôn mặt</div>
          <div className="col-span-2 text-center">Thao tác</div>
        </div>

        {/* Body */}
        <div className="divide-y divide-gray-200">
          {students.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              Chưa có học sinh nào đăng ký khuôn mặt
            </div>
          ) : (
            students.map((student) => (
              <div key={student.id} className="grid grid-cols-12 gap-4 px-4 py-4 hover:bg-gray-50 items-center">
                <div className="col-span-2 text-sm font-medium text-gray-900 truncate">
                  {student.student_id}
                </div>
                <div className="col-span-3 text-sm text-gray-900 truncate">
                  <div className="font-medium">{student.full_name}</div>
                </div>
                <div className="col-span-1 text-sm text-gray-900">
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    {student.class_name}
                  </span>
                </div>
                <div className="col-span-4 text-sm text-gray-900">
                  {(student.face_encoding || student.insightface_encoding) ? (
                    <span className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full inline-flex items-center">
                      ✅ Đã đăng ký {student.insightface_encoding ? '(InsightFace)' : '(MediaPipe)'}
                    </span>
                  ) : (
                    <span className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded-full inline-flex items-center">
                      ❌ Chưa đăng ký
                    </span>
                  )}
                </div>
                <div className="col-span-2 text-sm font-medium flex justify-center">
                  {(student.face_encoding || student.insightface_encoding) ? (
                    <button 
                      onClick={() => deleteFaceEncoding(student.id, student.full_name)}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors inline-flex items-center gap-1"
                      title="Xóa khuôn mặt đã đăng ký"
                    >
                      🗑️ Xóa
                    </button>
                  ) : (
                    <span className="px-3 py-1 text-xs bg-gray-100 text-gray-500 rounded">
                      Không có dữ liệu
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-blue-800 mb-2">Hướng dẫn sử dụng</h4>
        <div className="text-blue-700 space-y-1">
          <p>• Để đăng ký khuôn mặt cho học sinh, vào tab "Học sinh" và bấm nút "Đăng ký mặt"</p>
          <p>• Hệ thống sẽ mở camera để chụp ảnh khuôn mặt và lưu vào database</p>
          <p>• Sau khi đăng ký, học sinh có thể được nhận diện tự động trong chức năng điểm danh</p>
          <p>• Sử dụng nút "Reload Models" để cập nhật lại mô hình AI sau khi có thay đổi</p>
        </div>
      </div>
    </div>
  );
};

export default FaceManagement; 