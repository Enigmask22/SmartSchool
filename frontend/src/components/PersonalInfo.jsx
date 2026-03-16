import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { SimpleDatePicker } from "./ui/simple-date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  User,
  Mail,
  Phone,
  Key,
  GraduationCap,
  School,
  BookOpen,
  Edit3,
  Save,
  X,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import api from "@/services/api";
import logger from "@/utils/logger";

const PersonalInfo = () => {
  const { user } = useContext(AuthContext);
  const [personalData, setPersonalData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [homeroomClasses, setHomeroomClasses] = useState([]);
  const [subjectClasses, setSubjectClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  // Password change states
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Load personal data
  useEffect(() => {
    loadPersonalData();
  }, [user]);

  const loadPersonalData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load personal info (includes user, teacher, homeroom classes, subject classes)
      const personalResponse = await api.getPersonalInfo();
      if (personalResponse.success) {
        const data = personalResponse.data;

        // Set user data
        setUserData(data.user);

        // Set teacher data
        if (data.teacher) {
          setPersonalData(data.teacher);
          setEditData({
            full_name: data.teacher.full_name || data.user.full_name || "",
            email: data.teacher.email || data.user.email || "",
            phone: data.teacher.phone || "",
            date_of_birth: data.teacher.date_of_birth || "",
            gender: data.teacher.gender || "Nam",
          });
        } else {
          // If no teacher data, use user data
          setEditData({
            full_name: data.user.full_name || "",
            email: data.user.email || "",
            phone: "",
            date_of_birth: "",
            gender: "Nam",
          });
        }

        // Set homeroom classes
        setHomeroomClasses(data.homeroom_classes || []);

        // Set subject classes
        setSubjectClasses(data.subject_classes || []);
      }
    } catch (error) {
      logger.error("Error loading personal data:", error);
      setError("Không thể tải thông tin cá nhân");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({
      full_name: personalData.full_name || "",
      email: personalData.email || "",
      phone: personalData.phone || "",
      date_of_birth: personalData.date_of_birth || "",
      gender: personalData.gender || "Nam",
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({
      full_name: personalData.full_name || "",
      email: personalData.email || "",
      phone: personalData.phone || "",
      date_of_birth: personalData.date_of_birth || "",
      gender: personalData.gender || "Nam",
    });
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Update teacher profile
      const updateData = {
        full_name: editData.full_name,
        email: editData.email,
        phone: editData.phone,
        date_of_birth: editData.date_of_birth,
        gender: editData.gender,
      };

      const response = await api.updateTeacherProfile(updateData);

      if (response.success) {
        setPersonalData(response.data);
        setIsEditing(false);
        setSuccess("Cập nhật thông tin thành công");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.message || "Cập nhật thông tin thất bại");
      }
    } catch (error) {
      logger.error("Error updating personal data:", error);
      setError("Có lỗi xảy ra khi cập nhật thông tin");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      setPasswordLoading(true);
      setError(null);
      setSuccess(null);

      // Validate passwords
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError("Mật khẩu mới và xác nhận mật khẩu không khớp");
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setError("Mật khẩu mới phải có ít nhất 6 ký tự");
        return;
      }

      const response = await api.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (response.success) {
        setSuccess("Đổi mật khẩu thành công");
        setShowPasswordChange(false);
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.message || "Đổi mật khẩu thất bại");
      }
    } catch (error) {
      logger.error("Error changing password:", error);
      setError("Có lỗi xảy ra khi đổi mật khẩu");
    } finally {
      setPasswordLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  if (loading && !personalData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="ml-2 text-gray-600">Đang tải thông tin...</span>
      </div>
    );
  }

  if (!personalData && !userData) {
    return (
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          Không thể tải thông tin cá nhân. Vui lòng thử lại sau.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Thông tin cá nhân
          </h1>
          <p className="mt-1 text-gray-600">
            Quản lý thông tin cá nhân và tài khoản
          </p>
        </div>
        {!isEditing && (
          <Button
            onClick={handleEdit}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            Chỉnh sửa
          </Button>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Thông tin cá nhân
            </CardTitle>
            <CardDescription>Thông tin cơ bản của tài khoản</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name">Họ và tên</Label>
              {isEditing ? (
                <Input
                  id="full_name"
                  value={editData.full_name}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      full_name: e.target.value,
                    }))
                  }
                  placeholder="Nhập họ và tên"
                />
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-md bg-gray-50">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-900">
                    {personalData?.full_name ||
                      userData?.full_name ||
                      "Chưa cập nhật"}
                  </span>
                </div>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={editData.email}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="Nhập email"
                />
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-md bg-gray-50">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-900">
                    {personalData?.email || userData?.email || "Chưa cập nhật"}
                  </span>
                </div>
              )}
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <div className="flex items-center gap-2 p-3 rounded-md bg-gray-50">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-gray-900">
                  {userData?.username || user?.username || "Chưa cập nhật"}
                </span>
                <Badge variant="secondary" className="ml-auto">
                  Chỉ xem
                </Badge>
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              {isEditing ? (
                <Input
                  id="phone"
                  type="tel"
                  value={editData.phone}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="Nhập số điện thoại"
                />
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-md bg-gray-50">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-900">
                    {personalData?.phone || "Chưa cập nhật"}
                  </span>
                </div>
              )}
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Ngày sinh</Label>
              {isEditing ? (
                <div className="w-full">
                  <SimpleDatePicker
                    value={editData.date_of_birth}
                    onChange={(date) =>
                      setEditData((prev) => ({ ...prev, date_of_birth: date }))
                    }
                    placeholder="Chọn ngày sinh"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-md bg-gray-50">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-900">
                    {personalData?.date_of_birth
                      ? new Date(personalData.date_of_birth).toLocaleDateString(
                          "vi-VN"
                        )
                      : "Chưa cập nhật"}
                  </span>
                </div>
              )}
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label htmlFor="gender">Giới tính</Label>
              {isEditing ? (
                <Select
                  value={editData.gender}
                  onValueChange={(value) =>
                    setEditData((prev) => ({ ...prev, gender: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn giới tính" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nam">Nam</SelectItem>
                    <SelectItem value="Nữ">Nữ</SelectItem>
                    <SelectItem value="Khác">Khác</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-md bg-gray-50">
                  <User className="w-4 h-4 text-gray-500" />
                  <Badge
                    variant="outline"
                    className={
                      personalData?.gender === "Nam"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : personalData?.gender === "Nữ"
                        ? "bg-pink-50 text-pink-700 border-pink-200"
                        : "bg-gray-50 text-gray-700 border-gray-200"
                    }
                  >
                    {personalData?.gender || "Chưa cập nhật"}
                  </Badge>
                </div>
              )}
            </div>

            {/* Teacher Code */}
            <div className="space-y-2">
              <Label htmlFor="teacher_code">Mã giáo viên</Label>
              <div className="flex items-center gap-2 p-3 rounded-md bg-gray-50">
                <GraduationCap className="w-4 h-4 text-gray-500" />
                <span className="text-gray-900">
                  {personalData?.teacher_code || "Chưa cập nhật"}
                </span>
                <Badge variant="secondary" className="ml-auto">
                  Chỉ xem
                </Badge>
              </div>
            </div>

            {/* Edit Actions */}
            {isEditing && (
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveEdit}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Lưu thay đổi
                </Button>
                <Button
                  onClick={handleCancelEdit}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Hủy
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Bảo mật tài khoản
            </CardTitle>
            <CardDescription>
              Thay đổi mật khẩu để bảo vệ tài khoản
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showPasswordChange ? (
              <Button
                onClick={() => setShowPasswordChange(true)}
                variant="outline"
                className="flex items-center w-full gap-2"
              >
                <Key className="w-4 h-4" />
                Đổi mật khẩu
              </Button>
            ) : (
              <div className="space-y-4">
                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="current_password">Mật khẩu hiện tại</Label>
                  <div className="relative">
                    <Input
                      id="current_password"
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }))
                      }
                      placeholder="Nhập mật khẩu hiện tại"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility("current")}
                    >
                      {showPasswords.current ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="new_password">Mật khẩu mới</Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      placeholder="Nhập mật khẩu mới"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility("new")}
                    >
                      {showPasswords.new ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">
                    Xác nhận mật khẩu mới
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      placeholder="Nhập lại mật khẩu mới"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility("confirm")}
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Password Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handlePasswordChange}
                    disabled={passwordLoading}
                    className="flex items-center gap-2"
                  >
                    {passwordLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Đổi mật khẩu
                  </Button>
                  <Button
                    onClick={() => {
                      setShowPasswordChange(false);
                      setPasswordData({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                    }}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Hủy
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Teaching Information */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Homeroom Classes */}
        {homeroomClasses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="w-5 h-5" />
                Lớp chủ nhiệm
              </CardTitle>
              <CardDescription>
                Danh sách lớp bạn đang chủ nhiệm
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {homeroomClasses.map((classItem, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-blue-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                        <School className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {classItem.class_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          Khối {classItem.grade}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {classItem.total_students || 0} học sinh
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Teaching Classes */}
        {subjectClasses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Lớp giảng dạy
              </CardTitle>
              <CardDescription>
                Danh sách lớp và môn học bạn đang giảng dạy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {subjectClasses.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 border border-green-200 rounded-lg bg-green-50"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                        <BookOpen className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {item.subjects?.subject_name || "N/A"}
                        </p>
                        <p className="text-sm text-gray-600">
                          {item.subjects?.subject_code || "N/A"}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-green-800 bg-green-100"
                      >
                        {item.subjects?.subject_code || "N/A"}
                      </Badge>
                    </div>
                    <div className="ml-13">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Lớp:</span>{" "}
                        {item.classes?.class_name || "N/A"} - Khối{" "}
                        {item.classes?.grade || "N/A"}
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Trạng thái:</span>
                        <Badge variant="outline" className="ml-1">
                          {item.is_active ? "Đang dạy" : "Tạm dừng"}
                        </Badge>
                      </p>
                      {item.semester && (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Học kỳ:</span>{" "}
                          {item.semester}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* No Teaching Info */}
      {homeroomClasses.length === 0 && subjectClasses.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <School className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              Chưa có thông tin giảng dạy
            </h3>
            <p className="text-gray-600">
              Bạn chưa được phân công chủ nhiệm lớp hoặc giảng dạy môn học nào.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PersonalInfo;
