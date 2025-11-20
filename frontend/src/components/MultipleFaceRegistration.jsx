import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, XCircle, Loader2, Camera, AlertCircle, RefreshCw, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import logger from "@/utils/logger";

// API Configuration
const API_BASE_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:8000/api';

const MultipleFaceRegistration = ({ student, onClose, onSuccess }) => {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length > 10) {
      alert('Tối đa 10 ảnh mỗi lần');
      return;
    }
    
    const fileObjects = selectedFiles.map((file, index) => ({
      file,
      id: Date.now() + index,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      status: 'pending'
    }));
    
    setFiles(prev => [...prev, ...fileObjects]);
  };

  const removeFile = (fileId) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      const removedFile = prev.find(f => f.id === fileId);
      if (removedFile?.previewUrl) {
        URL.revokeObjectURL(removedFile.previewUrl);
      }
      return updated;
    });
  };

  const submitRegistration = async () => {
    if (files.length === 0) return;
    
    setLoading(true);
    setResults([]);
    
    try {
      const formData = new FormData();
      files.forEach(fileObj => {
        formData.append('files', fileObj.file);
      });
      
      const response = await fetch(`${API_BASE_URL}/ai/register-multiple/${student.id}`, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        setResults(result.data.results || []);
        
        // Update file statuses
        setFiles(prev => prev.map((file, index) => ({
          ...file,
          status: result.data.results[index]?.success ? 'success' : 'error',
          message: result.data.results[index]?.message || ''
        })));
        
        // Show success message
        const successCount = result.data.successful_registrations;
        const totalCount = result.data.total_images;
        alert(`Đăng ký thành công ${successCount}/${totalCount} ảnh cho ${student.full_name}!`);
        
        if (onSuccess) onSuccess();
      } else {
        alert(`Lỗi: ${result.message}`);
      }
    } catch (error) {
      logger.error('Error registering multiple faces:', error);
      alert('Có lỗi xảy ra khi đăng ký nhiều khuôn mặt');
    } finally {
      setLoading(false);
    }
  };

  const cleanup = () => {
    files.forEach(file => {
      if (file.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
    });
    setFiles([]);
    setResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Camera className="w-6 h-6 text-primary" />
            <span>Đăng ký hình ảnh cho {student.full_name}</span>
          </DialogTitle>
          <DialogDescription>
            Tải lên nhiều ảnh khuôn mặt để cải thiện độ chính xác nhận diện
          </DialogDescription>
        </DialogHeader>

        {/* Instructions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg">
              <AlertCircle className="w-5 h-5 text-primary" />
              <span>Hướng dẫn chụp ảnh để đạt độ chính xác 90%+</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3 text-primary">Góc độ:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Nhìn thẳng (2-3 ảnh)</li>
                  <li>• Nghiêng trái 15-30° (1-2 ảnh)</li>
                  <li>• Nghiêng phải 15-30° (1-2 ảnh)</li>
                  <li>• Hơi ngước/cúi (1-2 ảnh)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-3 text-primary">Biểu cảm & Ánh sáng:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Cười tự nhiên (2-3 ảnh)</li>
                  <li>• Không cười (2-3 ảnh)</li>
                  <li>• Ánh sáng tự nhiên</li>
                  <li>• Khoảng cách 0.5-2m</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Selection */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {files.length === 0 ? (
              <div className="text-center">
                <div className="border-2 border-dashed border-primary/30 rounded-lg p-12">
                  <Camera className="w-16 h-16 mx-auto mb-4 text-primary/60" />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    size="lg"
                    className="mb-3"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    Chọn 5-10 ảnh khuôn mặt
                  </Button>
                  <p className="text-muted-foreground">
                    Chọn nhiều ảnh với góc độ và biểu cảm khác nhau
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-lg flex items-center space-x-2">
                    <Upload className="w-5 h-5 text-primary" />
                    <span>Đã chọn {files.length} ảnh</span>
                    {files.length >= 5 && (
                      <Badge variant="default" className="bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Đủ số lượng
                      </Badge>
                    )}
                    {files.length < 5 && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Nên có ít nhất 5 ảnh
                      </Badge>
                    )}
                  </h3>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    size="sm"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Thêm ảnh
                  </Button>
                </div>
              
                {/* Image Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                  {files.map((fileObj) => (
                    <div key={fileObj.id} className="relative group">
                      <img
                        src={fileObj.previewUrl}
                        alt={fileObj.name}
                        className="w-full h-32 object-cover rounded-lg border-2 border-border"
                      />
                      
                      {/* Remove button */}
                      <Button
                        onClick={() => removeFile(fileObj.id)}
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      
                      {/* Status indicator */}
                      {fileObj.status !== 'pending' && (
                        <div className={`absolute bottom-0 left-0 right-0 text-xs p-2 text-center rounded-b-lg ${
                          fileObj.status === 'success' 
                            ? 'bg-green-500 text-white' 
                            : 'bg-red-500 text-white'
                        }`}>
                          {fileObj.status === 'success' ? (
                            <div className="flex items-center justify-center space-x-1">
                              <CheckCircle className="w-3 h-3" />
                              <span>Thành công</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-1">
                              <XCircle className="w-3 h-3" />
                              <span>Thất bại</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* File name */}
                      <p className="text-xs text-muted-foreground mt-1 truncate" title={fileObj.name}>
                        {fileObj.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <span>Kết quả đăng ký</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div key={index} className={`flex items-center gap-3 p-3 rounded-lg ${
                    result.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <div className="flex-1">
                      <span className="font-medium">Ảnh {index + 1}:</span>
                      <span className="ml-2">{result.message}</span>
                      {result.detection_score && (
                        <span className="ml-2 text-sm opacity-75">
                          (Độ tin cậy: {(result.detection_score * 100).toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <DialogFooter>
          <Button
            onClick={handleClose}
            variant="outline"
          >
            Đóng
          </Button>
          
          {files.length > 0 && (
            <>
              <Button
                onClick={() => {
                  cleanup();
                }}
                variant="secondary"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Chọn lại
              </Button>
              
              <Button
                onClick={submitRegistration}
                disabled={loading || files.length === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Đăng ký {files.length} ảnh
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MultipleFaceRegistration; 