import React, { useState, useRef } from 'react';

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
      
      const response = await fetch(`http://localhost:8000/api/ai/register-multiple/${student.id}`, {
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
      console.error('Error registering multiple faces:', error);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            📸 Đăng ký nhiều ảnh cho {student.full_name}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">🎯 Hướng dẫn chụp ảnh để đạt độ chính xác 90%+</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <h4 className="font-medium mb-1">Góc độ:</h4>
              <ul className="space-y-1">
                <li>• Nhìn thẳng (2-3 ảnh)</li>
                <li>• Nghiêng trái 15-30° (1-2 ảnh)</li>
                <li>• Nghiêng phải 15-30° (1-2 ảnh)</li>
                <li>• Hơi ngước/cúi (1-2 ảnh)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-1">Biểu cảm & Ánh sáng:</h4>
              <ul className="space-y-1">
                <li>• Cười tự nhiên (2-3 ảnh)</li>
                <li>• Không cười (2-3 ảnh)</li>
                <li>• Ánh sáng tự nhiên</li>
                <li>• Khoảng cách 0.5-2m</li>
              </ul>
            </div>
          </div>
        </div>

        {/* File Selection */}
        <div className="mb-6">
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
              <div className="border-2 border-dashed border-green-300 rounded-lg p-12">
                <div className="text-6xl mb-4">📸</div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 text-lg font-medium"
                >
                  Chọn 5-10 ảnh khuôn mặt
                </button>
                <p className="text-gray-600 mt-3">
                  Chọn nhiều ảnh với góc độ và biểu cảm khác nhau
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-lg">
                  Đã chọn {files.length} ảnh
                  {files.length >= 5 && <span className="text-green-600 ml-2">✅ Đủ số lượng</span>}
                  {files.length < 5 && <span className="text-orange-600 ml-2">⚠️ Nên có ít nhất 5 ảnh</span>}
                </h3>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200"
                >
                  + Thêm ảnh
                </button>
              </div>
              
              {/* Image Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                {files.map((fileObj) => (
                  <div key={fileObj.id} className="relative group">
                    <img
                      src={fileObj.previewUrl}
                      alt={fileObj.name}
                      className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                    />
                    
                    {/* Remove button */}
                    <button
                      onClick={() => removeFile(fileObj.id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 text-sm hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                    
                    {/* Status indicator */}
                    {fileObj.status !== 'pending' && (
                      <div className={`absolute bottom-0 left-0 right-0 text-xs p-2 text-center rounded-b-lg ${
                        fileObj.status === 'success' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-red-500 text-white'
                      }`}>
                        {fileObj.status === 'success' ? '✅ Thành công' : '❌ Thất bại'}
                      </div>
                    )}
                    
                    {/* File name */}
                    <p className="text-xs text-gray-600 mt-1 truncate" title={fileObj.name}>
                      {fileObj.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-3">📊 Kết quả đăng ký:</h3>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div key={index} className={`flex items-center gap-3 p-2 rounded ${
                  result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  <span className="text-lg">
                    {result.success ? '✅' : '❌'}
                  </span>
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
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Đóng
          </button>
          
          {files.length > 0 && (
            <>
              <button
                onClick={() => {
                  cleanup();
                }}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                🔄 Chọn lại
              </button>
              
              <button
                onClick={submitRegistration}
                disabled={loading || files.length === 0}
                className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="animate-spin inline-block mr-2">⏳</span>
                    Đang xử lý...
                  </>
                ) : (
                  `✅ Đăng ký ${files.length} ảnh`
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultipleFaceRegistration; 