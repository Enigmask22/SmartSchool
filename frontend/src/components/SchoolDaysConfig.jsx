import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Save, RotateCcw, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
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
        <Card className="p-8">
          <CardContent className="flex items-center space-x-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-muted-foreground">Đang tải cấu hình...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-primary" />
            <span>Cấu hình số ngày học theo tuần</span>
          </CardTitle>
          <CardDescription>
            Quản lý số ngày học mặc định và tạm thời cho từng khối. 
            Hệ thống sẽ tự động reset về cấu hình mặc định vào 00:00 chủ nhật hàng tuần.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Thông tin reset tiếp theo */}
      {nextReset && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-primary">
              <Clock className="w-5 h-5" />
              <span>Thông tin Reset Tự động</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reset tiếp theo:</span>
                <span className="font-medium">{formatDateTime(nextReset.next_reset)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Còn lại:</span>
                <Badge variant="default">
                  {nextReset.days_remaining} ngày ({nextReset.hours_remaining} giờ)
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      {error && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex items-center space-x-2 p-4">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {successMessage && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center space-x-2 p-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800">{successMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* Cấu hình cho từng khối */}
      <div className="grid gap-6 md:grid-cols-3">
        {['10', '11', '12'].map(grade => {
          const config = editingConfigs[grade];
          const currentWeekDays = getCurrentWeekDays(grade);
          
          return (
            <Card key={grade}>
              <CardHeader>
                <CardTitle className="text-center">
                  Khối {grade}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Hiển thị số ngày hiện tại */}
                <Card className="bg-muted/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Số ngày học tuần này</p>
                    <p className="text-2xl font-bold text-primary">{currentWeekDays} ngày</p>
                  </CardContent>
                </Card>

                {/* Số ngày học mặc định */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Số ngày học mặc định *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="7"
                    value={config.default_days_per_week || ''}
                    onChange={(e) => handleConfigChange(grade, 'default_days_per_week', e.target.value)}
                    placeholder="Ví dụ: 5"
                  />
                  <p className="text-xs text-muted-foreground">
                    Sẽ được auto reset vào chủ nhật
                  </p>
                </div>

                {/* Số ngày học tạm thời */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Số ngày học tạm thời
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="7"
                    value={config.temporary_days_per_week || ''}
                    onChange={(e) => handleConfigChange(grade, 'temporary_days_per_week', e.target.value)}
                    placeholder="Ví dụ: 6"
                  />
                  <p className="text-xs text-muted-foreground">
                    Cho tuần đặc biệt (tùy chọn)
                  </p>
                </div>

                {/* Nút áp dụng tạm thời */}
                {config.temporary_days_per_week && (
                  <Button
                    onClick={() => handleApplyTemporary(grade)}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    Áp dụng tạm thời ({config.temporary_days_per_week} ngày)
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleSaveConfigs}
              disabled={saving}
              className="flex-1"
              size="lg"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Lưu tất cả cấu hình
                </>
              )}
            </Button>
            
            <Button
              onClick={handleResetToDefault}
              variant="outline"
              size="lg"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset về mặc định
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ghi chú */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-yellow-800">
            <AlertCircle className="w-5 h-5" />
            <span>Lưu ý</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• <strong>Số ngày mặc định:</strong> Áp dụng cho tất cả tuần thông thường, cần "Lưu" để persist</li>
            <li>• <strong>Số ngày tạm thời:</strong> Có thể áp dụng ngay lập tức mà không cần lưu trước</li>
            <li>• <strong>Auto reset:</strong> Hệ thống tự động reset về mặc định vào 00:00 chủ nhật hàng tuần</li>
            <li>• <strong>Giá trị hợp lệ:</strong> 1-7 ngày cho tất cả trường</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default SchoolDaysConfig; 