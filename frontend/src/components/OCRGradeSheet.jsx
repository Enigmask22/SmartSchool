import React, { useState } from 'react';
import api from '../services/api';

const OCRGradeSheet = ({ 
  selectedClassSubject, 
  academicYear, 
  semester, 
  onImportSuccess 
}) => {
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  // Queue management states
  const [requestId, setRequestId] = useState(null);
  const [ocrStatus, setOcrStatus] = useState(null); // 'queued', 'processing', 'completed', 'failed'
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [queuePosition, setQueuePosition] = useState(null);

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('❌ Vui lòng chọn file ảnh (jpg, png, etc.)');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('❌ File ảnh quá lớn! Vui lòng chọn ảnh nhỏ hơn 10MB.');
      return;
    }

    setSelectedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    event.target.value = ''; // Reset input
  };

  // Poll status của OCR request
  const pollOCRStatus = async (reqId) => {
    try {
      const response = await api.getOCRStatus(reqId);
      
      if (response.success) {
        const status = response.data.status;
        setOcrStatus(status);
        setProgress(response.data.progress || 0);
        setStatusMessage(response.data.message || '');
        
        if (status === 'queued') {
          setQueuePosition(response.data.position_in_queue);
          // Continue polling
          setTimeout(() => pollOCRStatus(reqId), 3000); // Poll every 3 seconds
        } else if (status === 'processing') {
          setQueuePosition(null);
          // Continue polling
          setTimeout(() => pollOCRStatus(reqId), 2000); // Poll every 2 seconds when processing
        } else if (status === 'completed') {
          // Parse completed!
          const result = response.data.result;
          setParsedData(result);
          setParsing(false);
          setUploading(false);
          
          if (result.total_valid === 0) {
            alert('⚠️ Không tìm thấy dữ liệu hợp lệ trong ảnh!\n\n' + 
                  'Vui lòng kiểm tra:\n' +
                  '- Ảnh có đủ sáng và rõ nét\n' +
                  '- Bảng điểm có đúng format (id, họ và tên, điểm)');
          } else if (result.total_errors > 0) {
            alert(`⚠️ Phân tích thành công nhưng có ${result.total_errors} lỗi!\n\n` +
                  `✅ Tìm thấy: ${result.total_valid} học sinh hợp lệ\n` +
                  `❌ Lỗi: ${result.total_errors} dòng`);
          } else {
            alert(`✅ Phân tích bảng điểm thành công!\n\n` +
                  `Tìm thấy ${result.total_valid} học sinh.`);
          }
        } else if (status === 'failed') {
          // Failed
          setParsing(false);
          setUploading(false);
          alert('❌ Lỗi khi xử lý ảnh: ' + (response.data.error || 'Unknown error'));
        }
      } else {
        throw new Error(response.message || 'Failed to get status');
      }
    } catch (error) {
      console.error('Error polling OCR status:', error);
      setParsing(false);
      setUploading(false);
      alert('❌ Lỗi khi kiểm tra trạng thái OCR!');
    }
  };

  const handleUploadAndParse = async () => {
    if (!selectedImage) {
      alert('❌ Vui lòng chọn ảnh bảng điểm!');
      return;
    }

    try {
      setUploading(true);
      setParsing(true);
      setOcrStatus('uploading');
      setProgress(0);
      setStatusMessage('Đang upload ảnh...');

      const formData = new FormData();
      formData.append('file', selectedImage);

      const response = await api.parseGradeSheetOCR(formData);

      if (response.success) {
        // Get request_id and start polling
        const reqId = response.data.request_id;
        setRequestId(reqId);
        setOcrStatus(response.data.status); // Should be 'queued'
        setQueuePosition(response.data.position_in_queue);
        setStatusMessage('Đã thêm vào hàng chờ...');
        
        // Start polling status
        setTimeout(() => pollOCRStatus(reqId), 2000); // Start polling after 2s
      } else {
        alert('❌ Lỗi khi upload ảnh: ' + response.message);
        setUploading(false);
        setParsing(false);
      }

    } catch (error) {
      console.error('Error uploading OCR:', error);
      
      // Check if queue is full (HTTP 503)
      if (error.response && error.response.status === 503) {
        alert('⚠️ Hệ thống đang quá tải!\n\nHàng chờ đã đầy. Vui lòng thử lại sau vài phút.');
      } else {
        alert('❌ Lỗi khi xử lý ảnh! Vui lòng thử lại.');
      }
      
      setUploading(false);
      setParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedData || !parsedData.parsed_rows || parsedData.parsed_rows.length === 0) {
      alert('❌ Không có dữ liệu để import!');
      return;
    }

    try {
      setUploading(true);

      // Convert parsed data to import format
      const grades = parsedData.parsed_rows.map(row => ({
        student_id: row.student_id,
        diem_thuong_xuyen: row.diem_thuong_xuyen,
        diem_thi_giua_ki: row.diem_thi_giua_ki,
        diem_thi_cuoi_ki: row.diem_thi_cuoi_ki
      }));

      const importPayload = {
        class_subject_id: selectedClassSubject.id,
        academic_year: academicYear,
        semester: semester,
        grades: grades
      };

      const response = await api.bulkImportGrades(importPayload);

      if (response.success) {
        alert(`✅ ${response.message}\n\n` +
              `Thành công: ${response.data.success_count} bản ghi` +
              (response.data.error_count > 0 ? `\nLỗi: ${response.data.error_count} bản ghi` : ''));

        // Reset and close
        handleCloseModal();
        
        // Callback to refresh data
        if (onImportSuccess) {
          onImportSuccess();
        }
      } else {
        alert('❌ Lỗi khi import điểm: ' + response.message);
      }

    } catch (error) {
      console.error('Error importing grades from OCR:', error);
      alert('❌ Lỗi khi import điểm!');
    } finally {
      setUploading(false);
    }
  };

  const handleExportToExcel = async () => {
    if (!parsedData || !parsedData.parsed_rows || parsedData.parsed_rows.length === 0) {
      alert('❌ Không có dữ liệu để export!');
      return;
    }

    try {
      await api.exportParsedOCRToExcel({ parsed_rows: parsedData.parsed_rows });
      alert('✅ Tải file Excel thành công!');
    } catch (error) {
      console.error('Error exporting OCR data:', error);
      alert('❌ Lỗi khi export file!');
    }
  };

  const handleCloseModal = () => {
    setShowOCRModal(false);
    setParsedData(null);
    setSelectedImage(null);
    setImagePreview(null);
    
    // Reset queue states
    setRequestId(null);
    setOcrStatus(null);
    setProgress(0);
    setStatusMessage('');
    setQueuePosition(null);
  };

  return (
    <>
      {/* OCR Button */}
      <button
        onClick={() => setShowOCRModal(true)}
        className="flex items-center px-4 py-2 space-x-2 font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-sm transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-md"
        title="Upload ảnh bảng điểm viết tay để tự động nhận dạng"
      >
        <span>📸</span>
        <span>OCR - Nhập điểm từ ảnh</span>
      </button>

      {/* OCR Modal */}
      {showOCRModal && (
        <div className="flex fixed inset-0 z-50 justify-center items-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 text-white bg-gradient-to-r from-indigo-600 to-purple-600">
              <div>
                <h3 className="text-xl font-bold">📸 OCR - Nhận dạng bảng điểm viết tay</h3>
                <p className="mt-1 text-sm text-indigo-100">
                  Upload ảnh chụp bảng điểm để tự động nhận dạng và nhập điểm
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 text-white rounded-full transition-colors hover:bg-white hover:bg-opacity-20"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-6">
              {!parsedData ? (
                // Upload Section
                <div className="space-y-6">
                  {/* Instructions */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="mb-2 font-semibold text-blue-900">📋 Hướng dẫn:</h4>
                    <ul className="space-y-1 text-sm list-disc list-inside text-blue-800">
                      <li>Chụp ảnh bảng điểm rõ nét, đủ sáng</li>
                      <li>Bảng điểm phải có các cột: <strong>id, ho_va_ten, diem_thuong_xuyen, diem_thi_giua_ki, diem_thi_cuoi_ki</strong></li>
                      <li>Viết tay hoặc in đều được hỗ trợ</li>
                      <li>Định dạng ảnh: JPG, PNG (tối đa 10MB)</li>
                    </ul>
                  </div>

                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="p-4 rounded-lg border-2 border-gray-300 border-dashed">
                      <p className="mb-2 text-sm font-medium text-gray-700">Ảnh đã chọn:</p>
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="mx-auto max-w-full max-h-96 rounded-lg shadow-md"
                      />
                      <p className="mt-2 text-xs text-center text-gray-500">
                        {selectedImage.name} ({(selectedImage.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    </div>
                  )}

                  {/* Upload Button */}
                  <div className="flex flex-col items-center space-y-4">
                    <label className="flex justify-center items-center px-6 py-4 space-x-3 w-full max-w-md font-medium text-white bg-indigo-600 rounded-lg shadow-md transition-colors cursor-pointer hover:bg-indigo-700 hover:shadow-lg">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{selectedImage ? 'Chọn ảnh khác' : 'Chọn ảnh bảng điểm'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>

                    {selectedImage && !parsing && (
                      <button
                        onClick={handleUploadAndParse}
                        disabled={uploading}
                        className={`flex items-center space-x-3 px-8 py-4 rounded-lg font-bold text-lg shadow-lg transition-all w-full max-w-md justify-center ${
                          uploading 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 hover:shadow-xl'
                        }`}
                      >
                        <span>🚀</span>
                        <span>Phân tích bảng điểm</span>
                      </button>
                    )}

                    {/* Progress Display */}
                    {parsing && (
                      <div className="mt-6 space-y-4 w-full max-w-md">
                        {/* Status Card */}
                        <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200 shadow-md">
                          {/* Status Header */}
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center space-x-3">
                              {ocrStatus === 'queued' && (
                                <>
                                  <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                                  <span className="font-semibold text-yellow-700">⏳ Đang trong hàng chờ</span>
                                </>
                              )}
                              {ocrStatus === 'processing' && (
                                <>
                                  <svg className="w-5 h-5 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <span className="font-semibold text-indigo-700">🔄 Đang xử lý OCR</span>
                                </>
                              )}
                            </div>
                            <span className="text-2xl font-bold text-indigo-600">{progress}%</span>
                          </div>

                          {/* Progress Bar */}
                          <div className="overflow-hidden mb-4 w-full h-3 bg-gray-200 rounded-full">
                            <div 
                              className="h-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>

                          {/* Status Message */}
                          <p className="mb-2 text-sm font-medium text-gray-700">{statusMessage}</p>

                          {/* Queue Position */}
                          {queuePosition !== null && (
                            <div className="p-3 mt-3 bg-yellow-50 rounded-md border border-yellow-200">
                              <p className="text-xs text-yellow-800">
                                📍 Vị trí trong hàng chờ: <strong className="text-lg">#{queuePosition}</strong>
                              </p>
                            </div>
                          )}

                          {/* Info */}
                          <p className="mt-3 text-xs italic text-gray-500">
                            💡 Bạn có thể đóng cửa sổ này. Hệ thống sẽ tự động xử lý.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Results Section
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm font-medium text-green-700">✅ Hợp lệ</p>
                      <p className="text-3xl font-bold text-green-900">{parsedData.total_valid}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm font-medium text-red-700">❌ Lỗi</p>
                      <p className="text-3xl font-bold text-red-900">{parsedData.total_errors}</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-blue-700">📊 Tổng</p>
                      <p className="text-3xl font-bold text-blue-900">{parsedData.total_parsed}</p>
                    </div>
                  </div>

                  {/* Errors Display */}
                  {parsedData.validation_errors && parsedData.validation_errors.length > 0 && (
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <h4 className="mb-2 font-semibold text-red-900">⚠️ Lỗi validation:</h4>
                      <div className="overflow-y-auto max-h-32">
                        <ul className="space-y-1 text-sm text-red-800">
                          {parsedData.validation_errors.map((error, idx) => (
                            <li key={idx} className="flex items-start space-x-2">
                              <span className="text-red-500">•</span>
                              <span>Row {error.row}: {error.error}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* OCR Errors */}
                  {parsedData.ocr_errors && parsedData.ocr_errors.length > 0 && (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h4 className="mb-2 font-semibold text-yellow-900">⚠️ Cảnh báo OCR:</h4>
                      <div className="overflow-y-auto max-h-32">
                        <ul className="space-y-1 text-sm text-yellow-800">
                          {parsedData.ocr_errors.map((error, idx) => (
                            <li key={idx} className="flex items-start space-x-2">
                              <span className="text-yellow-500">•</span>
                              <span>{error}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Data Table */}
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <div className="overflow-x-auto max-h-96">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="sticky top-0 bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">STT</th>
                            <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Mã SV</th>
                            <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Họ và tên</th>
                            <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Lớp</th>
                            <th className="px-4 py-3 text-xs font-medium text-center text-gray-500 uppercase">ĐTX</th>
                            <th className="px-4 py-3 text-xs font-medium text-center text-gray-500 uppercase">ĐGK</th>
                            <th className="px-4 py-3 text-xs font-medium text-center text-gray-500 uppercase">ĐCK</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {parsedData.parsed_rows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{idx + 1}</td>
                              <td className="px-4 py-3 text-sm font-medium text-indigo-600">{row.student_id}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {row.full_name}
                                {row.ocr_name && row.ocr_name !== row.full_name && (
                                  <span className="block text-xs text-gray-500">OCR: {row.ocr_name}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{row.class_name}</td>
                              <td className="px-4 py-3 text-sm text-center">
                                {row.diem_thuong_xuyen !== null ? (
                                  <span className="font-medium text-blue-600">{row.diem_thuong_xuyen}</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-center">
                                {row.diem_thi_giua_ki !== null ? (
                                  <span className="font-medium text-blue-600">{row.diem_thi_giua_ki}</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-center">
                                {row.diem_thi_cuoi_ki !== null ? (
                                  <span className="font-medium text-blue-600">{row.diem_thi_cuoi_ki}</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setParsedData(null);
                        setSelectedImage(null);
                        setImagePreview(null);
                      }}
                      className="px-4 py-2 font-medium text-gray-700 bg-gray-200 rounded-lg transition-colors hover:bg-gray-300"
                    >
                      ← Phân tích ảnh khác
                    </button>

                    <div className="flex space-x-3">
                      <button
                        onClick={handleExportToExcel}
                        className="flex items-center px-4 py-2 space-x-2 font-medium text-white bg-green-600 rounded-lg shadow-sm transition-colors hover:bg-green-700 hover:shadow-md"
                      >
                        <span>📥</span>
                        <span>Tải Excel</span>
                      </button>

                      <button
                        onClick={handleConfirmImport}
                        disabled={uploading || !parsedData.parsed_rows || parsedData.parsed_rows.length === 0}
                        className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-bold transition-all shadow-md hover:shadow-lg ${
                          uploading || !parsedData.parsed_rows || parsedData.parsed_rows.length === 0
                            ? 'bg-gray-400 cursor-not-allowed text-white'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                        }`}
                      >
                        {uploading ? (
                          <>
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Đang import...</span>
                          </>
                        ) : (
                          <>
                            <span>✅</span>
                            <span>Xác nhận import</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OCRGradeSheet;

