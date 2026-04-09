import React from 'react';
import { X, Save, Eye, EyeOff} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen } from 'lucide-react';
import { SimpleDatePicker } from '../ui/simple-date-picker';
import { useAdminForm } from '@/hooks/admin-management/useAdminForm';

interface AdminManagementFormProps {
  hook: any;
  teacherSubjectHook?: any;
  scoreColumnHook?: any;
  isEdit?: boolean;
  item?: any;
  onSubmit?: (formData: any) => void;
  onCancel?: () => void;
}

export const AdminManagementForm: React.FC<AdminManagementFormProps> = ({
  hook,
  teacherSubjectHook,
  scoreColumnHook,
  isEdit = false,
  item = null,
  onSubmit,
  onCancel,
}) => {
  const form = useAdminForm();
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(form.formData);
    } else if (isEdit) {
      hook.handleUpdate(item.id, form.formData);
    } else {
      hook.handleCreate(form.formData);
    }
    // Close form after submission
    form.resetForm();
    if (onCancel) onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {hook.currentConfig?.fields
        ?.filter((field: string) => {
          if (hook.activeTab === 'score_settings' && field === 'score_column_config') {
            return false;
          }
          return true;
        })
        .map((field: string) => (
          <div key={field}>
            <label className="block mb-2 text-sm font-semibold text-gray-800">
              {field === 'password'
                ? 'Mật khẩu'
                : field === 'full_name'
                ? 'Họ tên'
                : field === 'username'
                ? 'Tên đăng nhập'
                : field === 'email'
                ? 'Email'
                : field === 'role'
                ? 'Vai trò'
                : field === 'teacher_code'
                ? 'Mã giáo viên'
                : field === 'subject_code'
                ? 'Mã môn học'
                : field === 'subject_name'
                ? 'Tên môn học'
                : field === 'class_name'
                ? 'Tên lớp'
                : field === 'room_number'
                ? 'Số phòng'
                : field === 'academic_year'
                ? 'Năm học'
                : field === 'teacher_id'
                ? 'Giáo viên'
                : field === 'subject_id'
                ? 'Môn học'
                : field === 'class_id'
                ? 'Lớp học'
                : field === 'homeroom_teacher_id'
                ? 'Giáo viên chủ nhiệm'
                : field === 'phone'
                ? 'Số điện thoại'
                : field === 'date_of_birth'
                ? 'Ngày sinh'
                : field === 'gender'
                ? 'Giới tính'
                : field === 'description'
                ? 'Mô tả'
                : field === 'is_mandatory'
                ? 'Môn bắt buộc'
                : field === 'grade'
                ? 'Khối'
                : field === 'semester'
                ? 'Học kỳ'
                : field.replace(/_/g, ' ')}
              {field !== 'description' &&
              field !== 'phone' &&
              field !== 'homeroom_teacher_id' &&
              field !== 'user_id' &&
              field !== 'username'
                ? ' *'
                : ''}
            </label>

            {field === 'role' ? (
              <Select
                value={form.formData[field] ?? item?.[field] ?? ''}
                onValueChange={(value) => form.handleChange(field, value)}
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
                value={(form.formData[field] ?? item?.[field] ?? '')?.toString()}
                onValueChange={(value) =>
                  form.handleChange(field, value ? parseInt(value) : null)
                }
                disabled={hook.activeTab === 'class_subjects' && !(form.formData as any).subject_id}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      hook.activeTab === 'class_subjects' && !(form.formData as any).subject_id
                        ? 'Vui lòng chọn môn học trước'
                        : 'Chọn giáo viên'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {hook.activeTab === 'class_subjects' && hook.filteredTeachers.length > 0
                    ? hook.filteredTeachers.map((t: any) => (
                        <SelectItem key={t.id} value={t.id.toString()}>
                          {t.full_name} ({t.teacher_code})
                        </SelectItem>
                      ))
                    : hook.teachers.map((t: any) => (
                        <SelectItem key={t.id} value={t.id.toString()}>
                          {t.full_name} ({t.teacher_code})
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            ) : field === 'subject_id' ? (
              <>
                <Select
                  value={(form.formData[field] ?? item?.[field] ?? '')?.toString()}
                  onValueChange={(value) =>
                    form.handleChange(field, value ? parseInt(value) : null)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn môn học" />
                  </SelectTrigger>
                  <SelectContent>
                    {hook.subjects.map((s: any) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.subject_name} ({s.subject_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hook.activeTab === 'score_settings' && isEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      scoreColumnHook?.setShowColumnForm(false);
                      scoreColumnHook?.setEditingColumnKey(null);
                      scoreColumnHook?.setColumnFormData({
                        key: '',
                        label: '',
                        he_so: 1,
                        hasSubColumns: false,
                        subColumns: [],
                      });
                    }}
                    className="w-full mt-2"
                  >
                    Cấu hình cột điểm
                  </Button>
                )}
              </>
            ) : field === 'user_id' ? (
              <Select
                value={(form.formData[field] ?? item?.[field] ?? '')?.toString()}
                onValueChange={(value) =>
                  form.handleChange(field, value ? parseInt(value) : null)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn người dùng" />
                </SelectTrigger>
                <SelectContent>
                  {hook.users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.full_name} ({u.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field === 'class_id' ? (
              <Select
                value={(form.formData[field] ?? item?.[field] ?? '')?.toString()}
                onValueChange={(value) => form.handleChange(field, parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn lớp học" />
                </SelectTrigger>
                <SelectContent>
                  {hook.classes.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.class_name} ({c.academic_year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field === 'homeroom_teacher_id' ? (
              <Select
                value={(form.formData[field] ?? item?.[field] ?? '')?.toString()}
                onValueChange={(value) =>
                  form.handleChange(field, value ? parseInt(value) : null)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn giáo viên" />
                </SelectTrigger>
                <SelectContent>
                  {hook.homeroomTeachers.map((t: any) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.full_name} ({t.teacher_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field === 'gender' ? (
              <Select
                value={
                  form.formData[field] ??
                  (item?.[field] && item[field] !== '-' ? item[field] : 'Nam')
                }
                onValueChange={(value) => form.handleChange(field, value)}
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
                    form.formData[field] ??
                    (item?.[field] && item[field] !== '-' ? item[field] : '')
                  }
                  onChange={(date) => form.handleChange(field, date)}
                  placeholder="Chọn ngày sinh"
                />
              </div>
            ) : field === 'semester' ? (
              <Select
                value={form.formData[field] ?? item?.[field] ?? ''}
                onValueChange={(value) => form.handleChange(field, value)}
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
                value={form.formData[field] ?? item?.[field] ?? ''}
                onValueChange={(value) => form.handleChange(field, value)}
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
            ) : field.includes('description') ? (
              <textarea
                value={form.formData[field] ?? item?.[field] ?? ''}
                onChange={(e) => form.handleChange(field, e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                rows={3}
              />
            ) : field === 'is_mandatory' ? (
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.formData[field] ?? item?.[field] ?? false}
                  onChange={(e) => form.handleChange(field, e.target.checked)}
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
                      ? form.showPassword
                        ? 'text'
                        : 'password'
                      : 'text'
                  }
                  value={
                    form.formData[field] ??
                    (item?.[field] && item[field] !== '-' ? item[field] : '')
                  }
                  onChange={(e) => form.handleChange(field, e.target.value)}
                  placeholder={
                    field === 'username'
                      ? 'ho_va_ten'
                      : field === 'phone'
                      ? 'Nhập số điện thoại'
                      : field === 'teacher_code'
                      ? 'Nhập mã giáo viên'
                      : ''
                  }
                  required={
                    field !== 'description' &&
                    field !== 'phone' &&
                    field !== 'homeroom_teacher_id' &&
                    field !== 'user_id' &&
                    field !== 'username'
                  }
                />
                {field === 'password' && !isEdit && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => form.setShowPassword(!form.showPassword)}
                      className="h-auto p-0 text-gray-500 hover:text-gray-700"
                    >
                      {form.showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={form.handleGeneratePassword}
                      className="h-auto p-0 text-gray-500 hover:text-gray-700"
                    >
                      <span className="text-xs">Tạo</span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* {field === 'username' && (
              <p className="mt-1 text-xs text-gray-500">
                Tùy chọn. Format: tên.school.province (VD:
                nguyen_thi_lan.chuyen_le_quy_don.tphcm)
              </p>
            )} */}
          </div>
        ))}

      {/* Multi-select môn học cho teachers */}
      {hook.activeTab === 'teachers' && teacherSubjectHook && (
        <div className="pt-4 mt-4 border-t border-gray-200">
          <label className="block mb-3 text-sm font-semibold text-gray-800">
            <BookOpen className="inline-block w-4 h-4 mr-1 mb-0.5" />
            Môn học phụ trách
          </label>
          <p className="mb-3 text-xs text-gray-600">
            Chọn các môn học mà giáo viên này sẽ giảng dạy (có thể chọn nhiều môn)
          </p>
          <div className="grid grid-cols-2 gap-2 p-3 overflow-y-auto rounded-md bg-gray-50 max-h-60">
            {hook.subjects.map((subject: any) => (
              <label key={subject.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={teacherSubjectHook.selectedSubjects.includes(subject.id)}
                  onChange={() => {
                    teacherSubjectHook.setSelectedSubjects((prev: any[]) =>
                      prev.includes(subject.id)
                        ? prev.filter((id) => id !== subject.id)
                        : [...prev, subject.id]
                    );
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{subject.subject_name}</span>
              </label>
            ))}
          </div>
          {teacherSubjectHook.selectedSubjects.length > 0 && (
            <p className="mt-2 text-xs text-green-600">
              ✓ Đã chọn {teacherSubjectHook.selectedSubjects.length} môn học
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end pt-6 mt-8 space-x-4 border-t border-border">
        <Button
          type="button"
          variant="outline"
          className="text-red-600 border-red-600 hover:text-red-700 hover:border-red-700 hover:bg-red-50"
          onClick={() => {
            form.resetForm();
            if (onCancel) onCancel();
          }}
        >
          <X className="w-4 h-4 mr-2" />
          Hủy
        </Button>
        <Button type="submit">
          <Save className="w-4 h-4 mr-2" />
          {isEdit ? 'Cập nhật' : 'Tạo mới'}
        </Button>
      </div>
    </form>
  );
};