import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

const SchoolDaysConfig = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [nextReset, setNextReset] = useState(null);

  // State cho form edit
  const [editingConfigs, setEditingConfigs] = useState({
    '10': { default_days_per_week: 5, temporary_days_per_week: null },
    '11': { default_days_per_week: 5, temporary_days_per_week: null },
    '12': { default_days_per_week: 5, temporary_days_per_week: null }
  });

  useEffect(() => {
    loadConfigs();
    loadNextResetTime();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response = await ApiService.getSchoolDaysConfigs();
      
      // Nếu không có config, thử initialize
      if (response.success && (!response.data || response.data.length === 0)) {
        console.log('No configs found, initializing...');
        const initResponse = await ApiService.initializeSchoolDaysConfigs();
        
        if (initResponse.success) {
          // Reload configs sau khi initialize
          response = await ApiService.getSchoolDaysConfigs();
        } else {
          setError(initResponse.message || 'Không thể khởi tạo cấu hình');
          return;
        }
      }
      
      if (response.success) {
        setConfigs(response.data || []);
        
        // Cập nhật editingConfigs với dữ liệu từ database
        const newEditingConfigs = { ...editingConfigs };
        
        response.data?.forEach(config => {
          newEditingConfigs[config.grade] = {
            default_days_per_week: config.default_days_per_week,
            temporary_days_per_week: config.temporary_days_per_week
          };
        });
        
        // Đảm bảo tất cả 3 khối đều có cấu hình
        ['10', '11', '12'].forEach(grade => {
          if (!response.data?.find(c => c.grade === grade)) {
            newEditingConfigs[grade] = {
              default_days_per_week: 5,
              temporary_days_per_week: null
            };
          }
        });
        
        setEditingConfigs(newEditingConfigs);
      } else {
        setError('Không thể tải cấu hình: ' + (response.message || 'Lỗi không xác định'));
      }
    } catch (error) {
      console.error('Error loading configs:', error);
      setError('Lỗi khi tải cấu hình: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadNextResetTime = async () => {
    try {
      const response = await ApiService.getNextSundayReset();
      if (response.success) {
        setNextReset(response.data);
      }
    } catch (error) {
      console.error('Error loading next reset time:', error);
    }
  };

  const handleConfigChange = (grade, field, value) => {
    setEditingConfigs(prev => ({
      ...prev,
      [grade]: {
        ...prev[grade],
        [field]: value === '' ? null : parseInt(value)
      }
    }));
  };

  const handleSaveConfigs = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Chuẩn bị dữ liệu cho batch update
      const configsArray = [];
      const grades = ['10', '11', '12'];

      grades.forEach(grade => {
        const config = editingConfigs[grade];
        if (config.default_days_per_week && config.default_days_per_week >= 1 && config.default_days_per_week <= 7) {
          configsArray.push({
            default_days_per_week: config.default_days_per_week,
            temporary_days_per_week: config.temporary_days_per_week
          });
        }
      });

      if (configsArray.length !== 3) {
        setError('Vui lòng nhập số ngày hợp lệ (1-7) cho tất cả các khối');
        return;
      }

      // Gọi API batch update
      const response = await ApiService.batchUpdateSchoolDaysConfigs(configsArray, grades);
      
      if (response.success) {
        setSuccessMessage('Lưu cấu hình thành công!');
        await loadConfigs(); // Reload data
        
        // Auto hide success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.message || 'Lỗi khi lưu cấu hình');
      }
    } catch (error) {
      console.error('Error saving configs:', error);
      setError('Lỗi khi lưu cấu hình: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyTemporary = async (grade) => {
    try {
      const config = editingConfigs[grade];
      
      if (!config.temporary_days_per_week) {
        setError(`Khối ${grade} chưa có cấu hình tạm thời`);
        return;
      }

      if (config.temporary_days_per_week < 1 || config.temporary_days_per_week > 7) {
        setError(`Số ngày tạm thời không hợp lệ: ${config.temporary_days_per_week}`);
        return;
      }

      // Gửi giá trị temporary trực tiếp, không cần lưu trước!
      const response = await ApiService.applyTemporaryConfig(grade, config.temporary_days_per_week);
      
      if (response.success) {
        setSuccessMessage(`Áp dụng cấu hình tạm thời ${config.temporary_days_per_week} ngày cho khối ${grade} thành công!`);
        await loadConfigs(); // Reload data
        
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.message || 'Lỗi khi áp dụng cấu hình tạm thời');
      }
    } catch (error) {
      console.error('Error applying temporary config:', error);
      setError('Lỗi khi áp dụng cấu hình tạm thời: ' + error.message);
    }
  };

  const handleResetToDefault = async () => {
    if (!window.confirm('Bạn có chắc muốn reset tất cả khối về cấu hình mặc định?')) {
      return;
    }

    try {
      const response = await ApiService.resetAllToDefault();
      
      if (response.success) {
        setSuccessMessage('Reset tất cả khối về cấu hình mặc định thành công!');
        await loadConfigs(); // Reload data
        
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.message || 'Lỗi khi reset cấu hình');
      }
    } catch (error) {
      console.error('Error resetting configs:', error);
      setError('Lỗi khi reset cấu hình: ' + error.message);
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '-';
    
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const getCurrentWeekDays = (grade) => {
    const config = configs.find(c => c.grade === grade);
    return config?.current_week_days || editingConfigs[grade]?.default_days_per_week || 5;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Đang tải cấu hình...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Cấu hình số ngày học theo tuần
        </h2>
        <p className="text-gray-600">
          Quản lý số ngày học mặc định và tạm thời cho từng khối. 
          Hệ thống sẽ tự động reset về cấu hình mặc định vào 00:00 chủ nhật hàng tuần.
        </p>
      </div>

      {/* Thông tin reset tiếp theo */}
      {nextReset && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">⏰ Thông tin Reset Tự động</h3>
          <div className="text-sm text-blue-700">
            <p><strong>Reset tiếp theo:</strong> {formatDateTime(nextReset.next_reset)}</p>
            <p><strong>Còn lại:</strong> {nextReset.days_remaining} ngày ({nextReset.hours_remaining} giờ)</p>
          </div>
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Cấu hình cho từng khối */}
      <div className="grid gap-6 md:grid-cols-3">
        {['10', '11', '12'].map(grade => {
          const config = editingConfigs[grade];
          const currentWeekDays = getCurrentWeekDays(grade);
          
          return (
            <div key={grade} className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                Khối {grade}
              </h3>
              
              {/* Hiển thị số ngày hiện tại */}
              <div className="bg-gray-50 p-3 rounded-lg mb-4 text-center">
                <p className="text-sm text-gray-600">Số ngày học tuần này</p>
                <p className="text-2xl font-bold text-blue-600">{currentWeekDays} ngày</p>
              </div>

              {/* Số ngày học mặc định */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số ngày học mặc định *
                </label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={config.default_days_per_week || ''}
                  onChange={(e) => handleConfigChange(grade, 'default_days_per_week', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ví dụ: 5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Sẽ được auto reset vào chủ nhật
                </p>
              </div>

              {/* Số ngày học tạm thời */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số ngày học tạm thời
                </label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={config.temporary_days_per_week || ''}
                  onChange={(e) => handleConfigChange(grade, 'temporary_days_per_week', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ví dụ: 6"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cho tuần đặc biệt (tùy chọn)
                </p>
              </div>

              {/* Nút áp dụng tạm thời */}
              {config.temporary_days_per_week && (
                <button
                  onClick={() => handleApplyTemporary(grade)}
                  className="w-full mb-2 px-3 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors text-sm"
                >
                  Áp dụng tạm thời ({config.temporary_days_per_week} ngày)
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mt-6">
        <button
          onClick={handleSaveConfigs}
          disabled={saving}
          className={`flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
            saving ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {saving ? 'Đang lưu...' : '💾 Lưu tất cả cấu hình'}
        </button>
        
        <button
          onClick={handleResetToDefault}
          className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
        >
          🔄 Reset về mặc định
        </button>
      </div>

      {/* Ghi chú */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-semibold text-yellow-800 mb-2">📝 Lưu ý:</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• <strong>Số ngày mặc định:</strong> Áp dụng cho tất cả tuần thông thường, cần "Lưu" để persist</li>
          <li>• <strong>Số ngày tạm thời:</strong> Có thể áp dụng ngay lập tức mà không cần lưu trước</li>
          <li>• <strong>Auto reset:</strong> Hệ thống tự động reset về mặc định vào 00:00 chủ nhật hàng tuần</li>
          <li>• <strong>Giá trị hợp lệ:</strong> 1-7 ngày cho tất cả trường</li>
        </ul>
      </div>
    </div>
  );
};

export default SchoolDaysConfig; 