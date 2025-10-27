import React, { useState } from 'react';
import { 
  User, 
  FileText, 
  X,
  GraduationCap,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import logger from "../utils/logger";

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
  
  // Grade trend analysis states
  const [gradeTrendData, setGradeTrendData] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState('');

  // Grade trend analysis function
  const fetchGradeTrend = async (studentId, classSubjectId) => {
    setTrendLoading(true);
    setTrendError('');
    setGradeTrendData(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/grades/grade-trend/${studentId}/${classSubjectId}?academic_year=2024-2025&semester=HK1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setGradeTrendData(result.data);
        return result.data;
      } else {
        setTrendError(result.message || 'Không thể phân tích xu hướng điểm');
        return null;
      }
    } catch (error) {
      logger.error('Error fetching grade trend:', error);
      setTrendError('Lỗi kết nối server khi phân tích xu hướng');
      return null;
    } finally {
      setTrendLoading(false);
    }
  };

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
    setGradeTrendData(null);
    setTrendError('');
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
      logger.error('Error generating feedback:', err);
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
      logger.error('Error generating batch feedback:', err);
      setError('Lỗi kết nối server. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 mx-auto space-y-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-center items-center mb-2 text-3xl font-bold">
              <GraduationCap className="mr-3 w-8 h-8 text-primary" />
              AI Tạo Nhận Xét Học Sinh
            </CardTitle>
            <CardDescription>Sử dụng AI Gemini để tạo nhận xét tự động cho học sinh</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center mb-6">
        <Card>
          <CardContent className="p-1">
            <div className="flex">
              <Button
                onClick={() => setBatchMode(false)}
                variant={!batchMode ? "default" : "ghost"}
                className="flex items-center"
              >
                <User className="mr-2 w-4 h-4" />
                Đơn lẻ
              </Button>
              <Button
                onClick={() => setBatchMode(true)}
                variant={batchMode ? "default" : "ghost"}
                className="flex items-center ml-1"
              >
                <FileText className="mr-2 w-4 h-4" />
                Hàng loạt
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <div className="ml-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Alert */}
      {success && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm text-green-800">
                  {batchMode ? 'Tạo nhận xét hàng loạt thành công!' : 'Tạo nhận xét thành công!'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Thông Tin Học Sinh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Student Name */}
            <div>
              <label htmlFor="student_name" className="block mb-1 text-sm font-medium">
                Tên Học Sinh
              </label>
              <Input
                id="student_name"
                type="text"
                value={formData.student_name}
                onChange={(e) => handleInputChange('student_name', e.target.value)}
                placeholder="Nhập tên học sinh"
              />
            </div>

            {/* Score */}
            <div>
              <label htmlFor="score" className="block mb-1 text-sm font-medium">
                Điểm Số (0-10)
              </label>
              <Input
                id="score"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={formData.score}
                onChange={(e) => handleInputChange('score', e.target.value)}
                placeholder="8.5"
              />
            </div>

            {/* Score Trend */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="score_trend" className="block text-sm font-medium">
                  Xu Hướng Điểm Số
                  {trendLoading && (
                    <span className="ml-2 text-xs text-blue-600">
                      <Loader2 className="inline w-3 h-3 animate-spin" />
                      Đang phân tích...
                    </span>
                  )}
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Note: This would need student ID and class subject ID to work
                    // For now, just show a message that this feature needs student context
                    setTrendError('Tính năng này cần được sử dụng từ danh sách học sinh để có đầy đủ thông tin');
                  }}
                  disabled={trendLoading}
                  className="text-xs"
                >
                  🔍 Phân tích AI
                </Button>
              </div>
              <select
                id="score_trend"
                value={formData.score_trend}
                onChange={(e) => handleInputChange('score_trend', e.target.value)}
                className="flex px-3 py-2 w-full h-10 text-sm rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={trendLoading}
              >
                <option value="">Chọn xu hướng</option>
                <option value="tăng">Tăng</option>
                <option value="giảm">Giảm</option>
                <option value="ổn định">Ổn định</option>
              </select>
              
              {/* Grade Trend Analysis Result */}
              {gradeTrendData && (
                <div className="p-3 mt-2 rounded-md border" style={{ backgroundColor: gradeTrendData.color + '10', borderColor: gradeTrendData.color + '40' }}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span 
                        className="px-2 py-1 text-xs font-medium text-white rounded-full"
                        style={{ backgroundColor: gradeTrendData.color }}
                      >
                        {gradeTrendData.label}
                      </span>
                      <span className="text-xs text-gray-600">
                        Độ tin cậy: {Math.round(gradeTrendData.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm" style={{ color: gradeTrendData.color }}>
                    {gradeTrendData.reason}
                  </p>
                </div>
              )}
              
              {/* Trend Error */}
              {trendError && (
                <div className="p-2 mt-2 text-xs text-red-600 bg-red-50 rounded border border-red-200">
                  ⚠️ {trendError}
                </div>
              )}
            </div>

            {/* Attendance Rate */}
            <div>
              <label htmlFor="attendance_rate" className="block mb-1 text-sm font-medium">
                Tỷ Lệ Chuyên Cần (%)
              </label>
              <Input
                id="attendance_rate"
                type="number"
                min="0"
                max="100"
                value={formData.attendance_rate}
                onChange={(e) => handleInputChange('attendance_rate', e.target.value)}
                placeholder="95"
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block mb-1 text-sm font-medium">
                Ghi Chú Thêm (Tùy chọn)
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Ví dụ: Học sinh rất tích cực tham gia hoạt động lớp..."
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {!batchMode ? (
                <Button 
                  onClick={generateFeedback} 
                  disabled={loading}
                  className="flex-1"
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
                      <MessageSquare className="mr-2 w-4 h-4" />
                      Tạo Nhận Xét
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={addToBatch}
                    variant="outline"
                    className="flex-1"
                  >
                    Thêm vào danh sách
                  </Button>
                  <Button
                    onClick={resetForm}
                    variant="outline"
                  >
                    Làm mới
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Result Display */}
        <Card>
          <CardHeader>
            <CardTitle>
              {batchMode ? 'Danh Sách Học Sinh' : 'Nhận Xét Được Tạo'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!batchMode ? (
              /* Single feedback display */
              <div>
                {feedback ? (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex gap-3 items-start">
                      <MessageSquare className="flex-shrink-0 mt-1 w-5 h-5 text-blue-600" />
                      <div>
                        <h4 className="mb-2 font-medium text-blue-900">
                          Nhận xét cho {formData.student_name}:
                        </h4>
                        <p className="leading-relaxed text-muted-foreground">{feedback}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <MessageSquare className="mx-auto mb-4 w-12 h-12 text-muted-foreground/50" />
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
                      <span className="text-sm text-muted-foreground">
                        {batchStudents.length} học sinh
                      </span>
                      <Button
                        onClick={generateBatchFeedback}
                        disabled={loading}
                        size="sm"
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
                      </Button>
                    </div>
                    
                    <div className="overflow-y-auto space-y-3 max-h-96">
                      {batchStudents.map((student, index) => (
                        <Card key={index} className="p-3">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium">{student.student_name}</h5>
                            <Button
                              onClick={() => removeFromBatch(index)}
                              variant="ghost"
                              size="sm"
                              className="p-0 w-6 h-6 text-destructive hover:text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="mb-2 text-sm text-muted-foreground">
                            Điểm: {student.score}/10 ({student.score_trend}) | 
                            Chuyên cần: {student.attendance_rate}%
                          </div>
                          {student.feedback && (
                            <div className="p-2 text-sm rounded border bg-muted">
                              <strong>Nhận xét:</strong> {student.feedback}
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-4 w-12 h-12 text-muted-foreground/50" />
                    <p>Thêm học sinh vào danh sách để tạo nhận xét hàng loạt</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AIFeedback; 