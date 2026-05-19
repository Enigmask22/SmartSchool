import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SimpleDatePicker } from '@/components/ui/simple-date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Edit3,
  Save,
  X,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { PersonalInfoSkeleton } from './PersonalInfoSkeleton';

interface PersonalInfoSectionProps {
  personalData: any;
  userData: any;
  loading: boolean;
  updating: boolean;
  onSave: (data: Record<string, any>) => Promise<void>;
}

export const PersonalInfoSection = ({
  personalData,
  userData,
  loading,
  updating,
  onSave,
}: PersonalInfoSectionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const isAdmin = userData?.role === 'admin';
  const [editData, setEditData] = useState<Record<string, any>>({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: 'Nam',
  });

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({
      full_name: personalData?.full_name || '',
      email: personalData?.email || '',
      phone: personalData?.phone || '',
      date_of_birth: personalData?.date_of_birth || '',
      gender: personalData?.gender || 'Nam',
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    const updateData = {
      full_name: editData.full_name,
      email: editData.email,
      phone: editData.phone,
      date_of_birth: editData.date_of_birth,
      gender: editData.gender,
    };

    await onSave(updateData);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between flex-row">
        <div>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Thông tin cá nhân
          </CardTitle>
          <CardDescription>Thông tin cơ bản của tài khoản</CardDescription>
        </div>
        {!isEditing && !loading && !isAdmin && (
          <Button
            onClick={handleEdit}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            Chỉnh sửa
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !personalData ? (
          <PersonalInfoSkeleton />
        ) : (
          <>
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
                  disabled={updating}
                />
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-md bg-gray-50">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-900">
                    {personalData?.full_name ||
                      userData?.full_name ||
                      'Chưa cập nhật'}
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
                  disabled={updating}
                />
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-md bg-gray-50">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-900">
                    {personalData?.email || userData?.email || 'Chưa cập nhật'}
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
                  {userData?.username || 'Chưa cập nhật'}
                </span>
                <Badge variant="secondary" className="ml-auto">
                  Chỉ xem
                </Badge>
              </div>
            </div>

            {/* Phone — teacher only */}
            {!isAdmin && (
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
                  disabled={updating}
                />
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-md bg-gray-50">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-900">
                    {personalData?.phone || 'Chưa cập nhật'}
                  </span>
                </div>
              )}
            </div>
            )}

            {/* Date of Birth — teacher only */}
            {!isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Ngày sinh</Label>
              {isEditing ? (
                <SimpleDatePicker
                  value={editData.date_of_birth}
                  onChange={(date) =>
                    setEditData((prev) => ({
                      ...prev,
                      date_of_birth: date,
                    }))
                  }
                  placeholder="Chọn ngày sinh"
                />
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-md bg-gray-50">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-900">
                    {personalData?.date_of_birth
                      ? new Date(personalData.date_of_birth).toLocaleDateString(
                          'vi-VN'
                        )
                      : 'Chưa cập nhật'}
                  </span>
                </div>
              )}
            </div>
            )}

            {/* Gender — teacher only */}
            {!isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="gender">Giới tính</Label>
              {isEditing ? (
                <Select
                  value={editData.gender}
                  onValueChange={(value) =>
                    setEditData((prev) => ({ ...prev, gender: value }))
                  }
                  disabled={updating}
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
                      personalData?.gender === 'Nam'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : personalData?.gender === 'Nữ'
                        ? 'bg-pink-50 text-pink-700 border-pink-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }
                  >
                    {personalData?.gender || 'Chưa cập nhật'}
                  </Badge>
                </div>
              )}
            </div>
            )}

            {/* Teacher Code — teacher only */}
            {!isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="teacher_code">Mã giáo viên</Label>
              <div className="flex items-center gap-2 p-3 rounded-md bg-gray-50">
                <GraduationCap className="w-4 h-4 text-gray-500" />
                <span className="text-gray-900">
                  {personalData?.teacher_code || 'Chưa cập nhật'}
                </span>
                <Badge variant="secondary" className="ml-auto">
                  Chỉ xem
                </Badge>
              </div>
            </div>
            )}

            {/* Role badge — admin only */}
            {isAdmin && (
              <div className="space-y-2">
                <Label>Vai trò</Label>
                <div className="flex items-center gap-2 p-3 rounded-md bg-gray-50">
                  <ShieldCheck className="w-4 h-4 text-purple-500" />
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200" variant="outline">
                    Quản trị viên
                  </Badge>
                </div>
              </div>
            )}

            {/* Edit Actions */}
            {isEditing && (
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveEdit}
                  disabled={updating}
                  className="flex items-center gap-2"
                >
                  {updating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Lưu thay đổi
                </Button>
                <Button
                  onClick={handleCancelEdit}
                  variant="outline"
                  disabled={updating}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Hủy
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
