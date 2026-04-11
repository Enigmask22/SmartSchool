import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SimpleDatePicker } from '../../ui/simple-date-picker';

interface FormFieldRendererProps {
  field: string;
  formData: any;
  item?: any;
  isEdit?: boolean;
  onChangeHandler: (field: string, value: any) => void;
  activeTab?: string;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  onGeneratePassword?: () => void;
  // Data sources
  teachers?: any[];
  subjects?: any[];
  classes?: any[];
  users?: any[];
  homeroomTeachers?: any[];
  filteredTeachers?: any[];
  academicYears?: string[];
}

const getFieldLabel = (field: string): string => {
  const labelMap: Record<string, string> = {
    password: 'Mật khẩu',
    full_name: 'Họ tên',
    username: 'Tên đăng nhập',
    email: 'Email',
    role: 'Vai trò',
    teacher_code: 'Mã giáo viên',
    subject_code: 'Mã môn học',
    subject_name: 'Tên môn học',
    class_name: 'Tên lớp',
    room_number: 'Số phòng',
    academic_year: 'Năm học',
    teacher_id: 'Giáo viên',
    subject_id: 'Môn học',
    class_id: 'Lớp học',
    homeroom_teacher_id: 'Giáo viên chủ nhiệm',
    phone: 'Số điện thoại',
    date_of_birth: 'Ngày sinh',
    gender: 'Giới tính',
    description: 'Mô tả',
    is_mandatory: 'Môn bắt buộc',
    grade: 'Khối',
    semester: 'Học kỳ',
  };
  return labelMap[field] || field.replace(/_/g, ' ');
};

const isRequiredField = (field: string): boolean => {
  const optionalFields = ['description', 'phone', 'homeroom_teacher_id', 'user_id', 'username'];
  return !optionalFields.includes(field);
};

export const FormFieldRenderer: React.FC<FormFieldRendererProps> = ({
  field,
  formData,
  item,
  isEdit = false,
  onChangeHandler,
  activeTab,
  showPassword = false,
  onTogglePassword,
  onGeneratePassword,
  teachers = [],
  subjects = [],
  classes = [],
  users = [],
  homeroomTeachers = [],
  filteredTeachers = [],
  academicYears = [],
}) => {
  const fieldLabel = getFieldLabel(field);
  const isRequired = isRequiredField(field);

  return (
    <div key={field}>
      <label className="block mb-2 text-sm font-semibold text-gray-800">
        {fieldLabel}
        {isRequired ? ' *' : ''}
      </label>

      {field === 'role' ? (
        <Select
          value={formData[field] ?? item?.[field] ?? ''}
          onValueChange={(value) => onChangeHandler(field, value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Chọn vai trò" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Quản trị viên</SelectItem>
            <SelectItem value="homeroom_teacher">Giáo viên chủ nhiệm</SelectItem>
            <SelectItem value="teacher">Giáo viên</SelectItem>
          </SelectContent>
        </Select>
      ) : field === 'teacher_id' ? (
        <Select
          value={(formData[field] ?? item?.[field] ?? '')?.toString()}
          onValueChange={(value) =>
            onChangeHandler(field, value ? parseInt(value) : null)
          }
          disabled={activeTab === 'class_subjects' && !formData.subject_id}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                activeTab === 'class_subjects'
                  ? !formData.subject_id
                    ? 'Vui lòng chọn môn học trước'
                    : filteredTeachers && filteredTeachers.length === 0
                    ? 'Không có giáo viên nào dạy môn này'
                    : 'Chọn giáo viên'
                  : 'Chọn giáo viên'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {activeTab === 'class_subjects'
              ? filteredTeachers && filteredTeachers.length > 0
                ? filteredTeachers.map((t: any) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.full_name} ({t.teacher_code})
                    </SelectItem>
                  ))
                : null
              : teachers.map((t: any) => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {t.full_name} ({t.teacher_code})
                  </SelectItem>
                ))}
          </SelectContent>
        </Select>
      ) : field === 'subject_id' ? (
        <Select
          value={(formData[field] ?? item?.[field] ?? '')?.toString()}
          onValueChange={(value) =>
            onChangeHandler(field, value ? parseInt(value) : null)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Chọn môn học" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s: any) => (
              <SelectItem key={s.id} value={s.id.toString()}>
                {s.subject_name} ({s.subject_code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field === 'user_id' ? (
        <Select
          value={(formData[field] ?? item?.[field] ?? '')?.toString()}
          onValueChange={(value) =>
            onChangeHandler(field, value ? parseInt(value) : null)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Chọn người dùng" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u: any) => (
              <SelectItem key={u.id} value={u.id.toString()}>
                {u.full_name} ({u.username})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field === 'class_id' ? (
        <Select
          value={(formData[field] ?? item?.[field] ?? '')?.toString()}
          onValueChange={(value) => onChangeHandler(field, parseInt(value))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Chọn lớp học" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c: any) => (
              <SelectItem key={c.id} value={c.id.toString()}>
                {c.class_name} ({c.academic_year})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field === 'homeroom_teacher_id' ? (
        <Select
          value={(formData[field] ?? item?.[field] ?? '')?.toString()}
          onValueChange={(value) =>
            onChangeHandler(field, value ? parseInt(value) : null)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Chọn giáo viên" />
          </SelectTrigger>
          <SelectContent>
            {homeroomTeachers.map((t: any) => (
              <SelectItem key={t.id} value={t.id.toString()}>
                {t.full_name} ({t.teacher_code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field === 'gender' ? (
        <Select
          value={
            formData[field] ??
            (item?.[field] && item[field] !== '-' ? item[field] : 'Nam')
          }
          onValueChange={(value) => onChangeHandler(field, value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Chọn giới tính" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Nam">Nam</SelectItem>
            <SelectItem value="Nữ">Nữ</SelectItem>
            <SelectItem value="-">Khác</SelectItem>
          </SelectContent>
        </Select>
      ) : field === 'date_of_birth' ? (
        <div className="w-full">
          <SimpleDatePicker
            value={
              formData[field] ??
              (item?.[field] && item[field] !== '-' ? item[field] : '')
            }
            onChange={(date) => onChangeHandler(field, date)}
            placeholder="Chọn ngày sinh"
          />
        </div>
      ) : field === 'academic_year' ? (
        <Select
          value={formData[field] ?? item?.[field] ?? ''}
          onValueChange={(value) => onChangeHandler(field, value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Chọn năm học" />
          </SelectTrigger>
          <SelectContent>
            {academicYears.length > 0 ? (
              academicYears.map((year: string) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))
            ) : null}
          </SelectContent>
        </Select>
      ) : field === 'semester' ? (
        <Select
          value={formData[field] ?? item?.[field] ?? ''}
          onValueChange={(value) => onChangeHandler(field, value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Chọn học kỳ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Học kỳ 1</SelectItem>
            <SelectItem value="2">Học kỳ 2</SelectItem>
          </SelectContent>
        </Select>
      ) : field === 'grade' ? (
        <Select
          value={formData[field] ?? item?.[field] ?? ''}
          onValueChange={(value) => onChangeHandler(field, value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Chọn khối" />
          </SelectTrigger>
          <SelectContent>
            {[10, 11, 12].map((grade) => (
              <SelectItem key={grade} value={grade.toString()}>
                Khối {grade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field === 'description' ? (
        <textarea
          value={formData[field] ?? item?.[field] ?? ''}
          onChange={(e) => onChangeHandler(field, e.target.value)}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          rows={3}
        />
      ) : field === 'is_mandatory' ? (
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData[field] ?? item?.[field] ?? false}
            onChange={(e) => onChangeHandler(field, e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Môn này là bắt buộc</span>
        </label>
      ) : field === 'password' && isEdit ? (
        <div className="flex items-center w-full h-10 px-3 py-2 text-sm border rounded-md border-input bg-muted text-muted-foreground">
          Mật khẩu không thể thay đổi ở đây. Người dùng có thể tự đổi mật khẩu trong phần cài đặt.
        </div>
      ) : (
        <div className="relative">
          <Input
            type={
              field.includes('email')
                ? 'email'
                : field.includes('phone')
                ? 'tel'
                : field === 'password'
                ? showPassword
                  ? 'text'
                  : 'password'
                : 'text'
            }
            value={
              formData[field] ??
              (item?.[field] && item[field] !== '-' ? item[field] : '')
            }
            onChange={(e) => onChangeHandler(field, e.target.value)}
            placeholder={
              field === 'username'
                ? 'ho_va_ten'
                : field === 'phone'
                ? 'Nhập số điện thoại'
                : field === 'teacher_code'
                ? 'Nhập mã giáo viên'
                : ''
            }
            required={isRequired}
          />
          {field === 'password' && !isEdit && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onTogglePassword?.()}
                className="h-auto p-0 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onGeneratePassword?.()}
                className="h-auto p-0 text-gray-500 hover:text-gray-700"
              >
                <span className="text-xs">Tạo</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
