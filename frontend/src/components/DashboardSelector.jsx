import React, { useState, useEffect } from 'react';
import { GraduationCap, Users, Loader2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import api from '../services/api';
import logger from "../utils/logger";

const DashboardSelector = ({ onSelectDashboard }) => {
  const [hasHomeroomRole, setHasHomeroomRole] = useState(false);
  const [hasSubjectRole, setHasSubjectRole] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserRoles();
  }, []);

  const checkUserRoles = async () => {
    try {
      setLoading(true);
      
      // Kiểm tra xem có phải giáo viên chủ nhiệm không
      try {
        const homeroomResponse = await api.getHomeroomClasses();
        if (homeroomResponse.success && homeroomResponse.data && homeroomResponse.data.length > 0) {
          setHasHomeroomRole(true);
        }
      } catch (error) {
        logger.debug('Không phải giáo viên chủ nhiệm');
      }

      // Kiểm tra xem có phải giáo viên bộ môn không
      try {
        const teacherResponse = await api.getTeacherInfo();
        if (teacherResponse.success && teacherResponse.data) {
          setHasSubjectRole(true);
        }
      } catch (error) {
        logger.debug('Không phải giáo viên bộ môn');
      }
      
    } catch (error) {
      logger.error('Error checking user roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDashboard = (type) => {
    onSelectDashboard(type);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Đang kiểm tra quyền truy cập...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Nếu chỉ có 1 role, tự động chuyển
  if (hasHomeroomRole && !hasSubjectRole) {
    onSelectDashboard('homeroom');
    return null;
  }

  if (hasSubjectRole && !hasHomeroomRole) {
    onSelectDashboard('subject');
    return null;
  }

  // Nếu có cả 2 role, hiển thị lựa chọn
  return (
    <div className="flex justify-center items-center p-6 min-h-screen bg-gray-50">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <Card className="mb-8">
          <CardContent className="p-8 text-center">
            <div className="inline-flex justify-center items-center mb-6 w-20 h-20 bg-primary rounded-full shadow-lg">
              <GraduationCap className="w-10 h-10 text-primary-foreground" />
            </div>
            <CardTitle className="mb-3 text-4xl font-bold text-primary">
              Chọn Dashboard
            </CardTitle>
            <CardDescription className="text-lg">
              Bạn vừa là Giáo viên chủ nhiệm vừa là Giáo viên bộ môn
            </CardDescription>
            <p className="mt-2 text-sm text-muted-foreground">
              Vui lòng chọn dashboard bạn muốn xem
            </p>
          </CardContent>
        </Card>

        {/* Dashboard Options */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Homeroom Teacher Dashboard */}
          {hasHomeroomRole && (
            <Card
              onClick={() => handleSelectDashboard('homeroom')}
              className="overflow-hidden cursor-pointer group hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <CardHeader className="bg-primary text-primary-foreground">
                <div className="flex justify-between items-center">
                  <div className="flex justify-center items-center w-14 h-14 bg-primary-foreground/20 rounded-xl">
                    <Users className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div className="flex justify-center items-center w-8 h-8 bg-primary-foreground/20 rounded-full transition-all group-hover:bg-primary-foreground/30">
                    <ArrowRight className="w-5 h-5 text-primary-foreground" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-primary-foreground">Dashboard Chủ Nhiệm</CardTitle>
                <CardDescription className="text-primary-foreground/80">
                  Quản lý lớp chủ nhiệm của bạn
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-center text-muted-foreground">
                    <span className="mr-2 text-green-500">✓</span>
                    <span className="text-sm">Theo dõi điểm danh học sinh</span>
                  </li>
                  <li className="flex items-center text-muted-foreground">
                    <span className="mr-2 text-green-500">✓</span>
                    <span className="text-sm">Quản lý thông tin học sinh</span>
                  </li>
                  <li className="flex items-center text-muted-foreground">
                    <span className="mr-2 text-green-500">✓</span>
                    <span className="text-sm">Thống kê chuyên cần theo tuần</span>
                  </li>
                  <li className="flex items-center text-muted-foreground">
                    <span className="mr-2 text-green-500">✓</span>
                    <span className="text-sm">Quản lý khuôn mặt AI</span>
                  </li>
                </ul>
              </CardContent>

              <div className="px-6 pb-6">
                <Button className="w-full">
                  Chọn Dashboard Chủ Nhiệm
                </Button>
              </div>
            </Card>
          )}

          {/* Subject Teacher Dashboard */}
          {hasSubjectRole && (
            <Card
              onClick={() => handleSelectDashboard('subject')}
              className="overflow-hidden cursor-pointer group hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <CardHeader className="bg-purple-600 text-white">
                <div className="flex justify-between items-center">
                  <div className="flex justify-center items-center w-14 h-14 bg-white/20 rounded-xl">
                    <GraduationCap className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex justify-center items-center w-8 h-8 bg-white/20 rounded-full transition-all group-hover:bg-white/30">
                    <ArrowRight className="w-5 h-5 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-white">Dashboard Bộ Môn</CardTitle>
                <CardDescription className="text-white/80">
                  Phân tích điểm số các lớp bạn dạy
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-6">
                <ul className="space-y-3">
                  <li className="flex items-center text-muted-foreground">
                    <span className="mr-2 text-green-500">✓</span>
                    <span className="text-sm">Phân tích điểm số chuyên sâu</span>
                  </li>
                  <li className="flex items-center text-muted-foreground">
                    <span className="mr-2 text-green-500">✓</span>
                    <span className="text-sm">Phân nhóm học lực chi tiết</span>
                  </li>
                  <li className="flex items-center text-muted-foreground">
                    <span className="mr-2 text-green-500">✓</span>
                    <span className="text-sm">Học sinh cần quan tâm</span>
                  </li>
                  <li className="flex items-center text-muted-foreground">
                    <span className="mr-2 text-green-500">✓</span>
                    <span className="text-sm">So sánh giữa các lớp</span>
                  </li>
                </ul>
              </CardContent>

              <div className="px-6 pb-6">
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  Chọn Dashboard Bộ Môn
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Footer Note */}
        <Card className="mt-8">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              💡 <span className="font-medium">Lưu ý:</span> Bạn có thể chuyển đổi giữa các dashboard bất cứ lúc nào thông qua menu bên trái
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardSelector;

