import React, { useState } from 'react';
import { 
  UserIcon, 
  DocumentTextIcon, 
  XMarkIcon,
  AcademicCapIcon,
  ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline';
import { 
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/solid';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const AIFeedback = () => {
  const [formData, setFormData] = useState({
    student_name: '',
    score: '',
    score_trend: '',
    attendance_rate: '',
    notes: ''
  });

  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchStudents, setBatchStudents] = useState([]);

  // Reset form
  const resetForm = () => {
    setFormData({
      student_name: '',
      score: '',
      score_trend: '',
      attendance_rate: '',
      notes: ''
    });
    setFeedback('');
    setError('');
    setSuccess(false);
  };

  // Handle input change
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
    setSuccess(false);
  };

  // Validate form
  const validateForm = () => {
    const { student_name, score, score_trend, attendance_rate } = formData;
    
    if (!student_name.trim()) {
      setError('Vui lòng nhập tên học sinh');
      return false;
    }
    
    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
      setError('Điểm số phải từ 0 đến 10');
      return false;
    }
    
    if (!score_trend) {
      setError('Vui lòng chọn xu hướng điểm số');
      return false;
    }
    
    const attendanceNum = parseInt(attendance_rate);
    if (isNaN(attendanceNum) || attendanceNum < 0 || attendanceNum > 100) {
      setError('Tỷ lệ chuyên cần phải từ 0 đến 100%');
      return false;
    }
    
    return true;
  };

  // Generate feedback for single student
  const generateFeedback = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setFeedback('');

    try {
      const response = await fetch(`${API_BASE_URL}/feedback/generate-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_name: formData.student_name,
          score: parseFloat(formData.score),
          score_trend: formData.score_trend,
          attendance_rate: parseInt(formData.attendance_rate),
          notes: formData.notes
        })
      });

      const result = await response.json();

      if (result.success) {
        setFeedback(result.feedback);
        setSuccess(true);
      } else {
        setError(result.error || 'Không thể tạo nhận xét');
      }
    } catch (err) {
      console.error('Error generating feedback:', err);
      setError('Lỗi kết nối server. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Add student to batch
  const addToBatch = () => {
    if (!validateForm()) return;

    const newStudent = {
      student_name: formData.student_name,
      score: parseFloat(formData.score),
      score_trend: formData.score_trend,
      attendance_rate: parseInt(formData.attendance_rate),
      notes: formData.notes
    };

    setBatchStudents(prev => [...prev, newStudent]);
    resetForm();
  };

  // Remove student from batch
  const removeFromBatch = (index) => {
    setBatchStudents(prev => prev.filter((_, i) => i !== index));
  };

  // Generate batch feedback
  const generateBatchFeedback = async () => {
    if (batchStudents.length === 0) {
      setError('Vui lòng thêm ít nhất một học sinh vào danh sách');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/feedback/generate-batch-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          students: batchStudents
        })
      });

      const result = await response.json();

      if (result.success) {
        // Update batch students with feedback
        setBatchStudents(prev => prev.map(student => ({
          ...student,
          feedback: result.feedbacks[student.student_name] || 'Không thể tạo nhận xét'
        })));
        setSuccess(true);
      } else {
        setError('Không thể tạo nhận xét hàng loạt');
      }
    } catch (err) {
      console.error('Error generating batch feedback:', err);
      setError('Lỗi kết nối server. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 mx-auto space-y-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="flex justify-center items-center mb-2 text-3xl font-bold text-gray-900">
          <AcademicCapIcon className="mr-3 w-8 h-8 text-blue-600" />
          AI Tạo Nhận Xét Học Sinh
        </h1>
        <p className="text-gray-600">Sử dụng AI Gemini để tạo nhận xét tự động cho học sinh</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center mb-6">
        <div className="p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setBatchMode(false)}
            className={`px-4 py-2 rounded-md flex items-center transition-colors ${
              !batchMode 
                ? 'text-white bg-blue-600 shadow-sm' 
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <UserIcon className="mr-2 w-4 h-4" />
            Đơn lẻ
          </button>
          <button
            onClick={() => setBatchMode(true)}
            className={`px-4 py-2 rounded-md flex items-center ml-1 transition-colors ${
              batchMode 
                ? 'text-white bg-blue-600 shadow-sm' 
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <DocumentTextIcon className="mr-2 w-4 h-4" />
            Hàng loạt
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 rounded-md border border-red-200">
          <div className="flex">
            <ExclamationCircleIcon className="w-5 h-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="p-4 bg-green-50 rounded-md border border-green-200">
          <div className="flex">
            <CheckCircleIcon className="w-5 h-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-800">
                {batchMode ? 'Tạo nhận xét hàng loạt thành công!' : 'Tạo nhận xét thành công!'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <div className="bg-white rounded-lg shadow">
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
                value={formData.student_name}
                onChange={(e) => handleInputChange('student_name', e.target.value)}
                placeholder="Nhập tên học sinh"
                className="px-3 py-2 w-full rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                value={formData.score}
                onChange={(e) => handleInputChange('score', e.target.value)}
                placeholder="8.5"
                className="px-3 py-2 w-full rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Score Trend */}
            <div>
              <label htmlFor="score_trend" className="block mb-1 text-sm font-medium text-gray-700">
                Xu Hướng Điểm Số
              </label>
              <select
                id="score_trend"
                value={formData.score_trend}
                onChange={(e) => handleInputChange('score_trend', e.target.value)}
                className="px-3 py-2 w-full rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                value={formData.attendance_rate}
                onChange={(e) => handleInputChange('attendance_rate', e.target.value)}
                placeholder="95"
                className="px-3 py-2 w-full rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block mb-1 text-sm font-medium text-gray-700">
                Ghi Chú Thêm (Tùy chọn)
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Ví dụ: Học sinh rất tích cực tham gia hoạt động lớp..."
                rows={3}
                className="px-3 py-2 w-full rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {!batchMode ? (
                <button 
                  onClick={generateFeedback} 
                  disabled={loading}
                  className="flex flex-1 justify-center items-center px-4 py-2 font-medium text-white bg-blue-600 rounded-md transition-colors hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? (
                    <>
                      <svg className="mr-2 -ml-1 w-4 h-4 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <ChatBubbleLeftEllipsisIcon className="mr-2 w-4 h-4" />
                      Tạo Nhận Xét
                    </>
                  )}
                </button>
              ) : (
                <>
                  <button
                    onClick={addToBatch}
                    className="flex-1 px-4 py-2 font-medium text-gray-700 bg-white rounded-md border border-gray-300 transition-colors hover:bg-gray-50"
                  >
                    Thêm vào danh sách
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 font-medium text-gray-700 bg-gray-100 rounded-md transition-colors hover:bg-gray-200"
                  >
                    Làm mới
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Result Display */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {batchMode ? 'Danh Sách Học Sinh' : 'Nhận Xét Được Tạo'}
            </h3>
          </div>
          <div className="px-6 py-4">
            {!batchMode ? (
              /* Single feedback display */
              <div>
                {feedback ? (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex gap-3 items-start">
                      <ChatBubbleLeftEllipsisIcon className="flex-shrink-0 mt-1 w-5 h-5 text-blue-600" />
                      <div>
                        <h4 className="mb-2 font-medium text-blue-900">
                          Nhận xét cho {formData.student_name}:
                        </h4>
                        <p className="leading-relaxed text-gray-700">{feedback}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <ChatBubbleLeftEllipsisIcon className="mx-auto mb-4 w-12 h-12 text-gray-300" />
                    <p>Nhận xét sẽ hiển thị ở đây sau khi tạo</p>
                  </div>
                )}
              </div>
            ) : (
              /* Batch mode display */
              <div>
                {batchStudents.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        {batchStudents.length} học sinh
                      </span>
                      <button
                        onClick={generateBatchFeedback}
                        disabled={loading}
                        className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md transition-colors hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        {loading ? (
                          <>
                            <svg className="mr-2 -ml-1 w-4 h-4 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Đang tạo...
                          </>
                        ) : (
                          'Tạo nhận xét hàng loạt'
                        )}
                      </button>
                    </div>
                    
                    <div className="overflow-y-auto space-y-3 max-h-96">
                      {batchStudents.map((student, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg border">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium">{student.student_name}</h5>
                            <button
                              onClick={() => removeFromBatch(index)}
                              className="p-1 text-red-600 rounded hover:text-red-700"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="mb-2 text-sm text-gray-600">
                            Điểm: {student.score}/10 ({student.score_trend}) | 
                            Chuyên cần: {student.attendance_rate}%
                          </div>
                          {student.feedback && (
                            <div className="p-2 text-sm bg-white rounded border">
                              <strong>Nhận xét:</strong> {student.feedback}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <DocumentTextIcon className="mx-auto mb-4 w-12 h-12 text-gray-300" />
                    <p>Thêm học sinh vào danh sách để tạo nhận xét hàng loạt</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIFeedback; 