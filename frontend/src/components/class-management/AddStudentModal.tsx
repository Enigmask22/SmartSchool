import { Plus, Loader2, X, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SimpleDatePicker } from '@/components/ui/simple-date-picker';

interface ParentContact {
  relation: string;
  name: string;
  phone: string;
}

interface StudentFormData {
  full_name: string;
  email: string;
  phone: string;
  received_email: string;
  class_name: string;
  grade: string;
  class_id: number | null;
  date_of_birth: string;
  address: string;
  parent_contacts: ParentContact[];
  gender: string;
}

interface AddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentFormData: StudentFormData;
  studentFormErrors: Record<string, string | null>;
  studentFormLoading: boolean;
  onFormChange: (field: string, value: unknown) => void;
  addParentContactRow: () => void;
  removeParentContactRow: (index: number) => void;
  updateParentContactField: (
    index: number,
    field: string,
    value: string,
  ) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const AddStudentModal = ({
  open,
  onOpenChange,
  studentFormData,
  studentFormErrors,
  studentFormLoading,
  onFormChange,
  addParentContactRow,
  removeParentContactRow,
  updateParentContactField,
  onSubmit,
  onClose,
}: AddStudentModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thêm học sinh mới</DialogTitle>
          <DialogDescription>
            Điền thông tin để đăng ký học sinh mới vào hệ thống
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Họ và tên *</Label>
              <Input
                id="full_name"
                type="text"
                value={studentFormData.full_name}
                onChange={(e) =>
                  onFormChange('full_name', e.target.value)
                }
                className={
                  studentFormErrors.full_name ? 'border-destructive' : ''
                }
                placeholder="VD: Nguyễn Văn An"
              />
              {studentFormErrors.full_name && (
                <p className="text-sm text-destructive">
                  {studentFormErrors.full_name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={studentFormData.email}
                onChange={(e) =>
                  onFormChange('email', e.target.value)
                }
                className={studentFormErrors.email ? 'border-destructive' : ''}
                placeholder="VD: student@example.com"
              />
              {studentFormErrors.email && (
                <p className="text-sm text-destructive">
                  {studentFormErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                type="tel"
                value={studentFormData.phone}
                onChange={(e) =>
                  onFormChange('phone', e.target.value)
                }
                placeholder="VD: 0123456789"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="received_email">
                Email phụ huynh (nhận phiếu điểm)
              </Label>
              <Input
                id="received_email"
                type="email"
                value={studentFormData.received_email}
                onChange={(e) =>
                  onFormChange('received_email', e.target.value)
                }
                placeholder="VD: phuhuynh@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="class_name">Lớp học *</Label>
              <Input
                id="class_name"
                type="text"
                value={studentFormData.class_name}
                onChange={(e) =>
                  onFormChange('class_name', e.target.value)
                }
                disabled
                readOnly
                className={
                  studentFormErrors.class_name ? 'border-destructive' : ''
                }
                placeholder="VD: 10A1"
              />
              {studentFormErrors.class_name && (
                <p className="text-sm text-destructive">
                  {studentFormErrors.class_name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">Khối *</Label>
              <Select
                value={studentFormData.grade || 'none'}
                onValueChange={(value) =>
                  onFormChange(
                    'grade',
                    value === 'none' ? '' : value,
                  )
                }
                disabled
              >
                <SelectTrigger
                  className={
                    studentFormErrors.grade ? 'border-destructive' : ''
                  }
                >
                  <SelectValue placeholder="Chọn khối" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Chọn khối</SelectItem>
                  <SelectItem value="10">Khối 10</SelectItem>
                  <SelectItem value="11">Khối 11</SelectItem>
                  <SelectItem value="12">Khối 12</SelectItem>
                </SelectContent>
              </Select>
              {studentFormErrors.grade && (
                <p className="text-sm text-destructive">
                  {studentFormErrors.grade}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Giới tính</Label>
              <Select
                value={studentFormData.gender}
                onValueChange={(value) =>
                  onFormChange('gender', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nam">Nam</SelectItem>
                  <SelectItem value="Nữ">Nữ</SelectItem>
                  <SelectItem value="Khác">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Ngày sinh</Label>
              <SimpleDatePicker
                value={studentFormData.date_of_birth}
                onChange={(value) =>
                  onFormChange('date_of_birth', value)
                }
                placeholder="Chọn ngày sinh"
                className="w-full"
              />
            </div>
          </div>

          {/* Parent Contacts Section */}
          <div className="p-4 space-y-4 border rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-base font-semibold text-gray-800">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                Thông tin liên hệ phụ huynh
              </label>
              <Button
                type="button"
                onClick={addParentContactRow}
                size="sm"
                className="text-white bg-blue-600 shadow-md hover:bg-blue-700"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Thêm người liên hệ
              </Button>
            </div>

            <div className="pr-2 space-y-3 overflow-y-auto max-h-96">
              {(studentFormData.parent_contacts || []).map((c, idx) => (
                <div
                  key={idx}
                  className="p-4 transition-shadow bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Người liên hệ #{idx + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeParentContactRow(idx)}
                      className="w-8 h-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div>
                      <Label className="mb-1 text-xs font-medium text-gray-600">
                        Mối quan hệ
                      </Label>
                      <Select
                        value={c.relation || 'parent'}
                        onValueChange={(value) =>
                          updateParentContactField(idx, 'relation', value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="parent">Phụ huynh</SelectItem>
                          <SelectItem value="father">Bố</SelectItem>
                          <SelectItem value="mother">Mẹ</SelectItem>
                          <SelectItem value="guardian">
                            Người giám hộ
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="mb-1 text-xs font-medium text-gray-600">
                        Họ và tên
                      </Label>
                      <Input
                        type="text"
                        value={c.name || ''}
                        onChange={(e) =>
                          updateParentContactField(
                            idx,
                            'name',
                            e.target.value,
                          )
                        }
                        placeholder="Nhập họ tên"
                        className="w-full"
                      />
                    </div>

                    <div>
                      <Label className="mb-1 text-xs font-medium text-gray-600">
                        Số điện thoại
                      </Label>
                      <Input
                        type="tel"
                        value={c.phone || ''}
                        onChange={(e) =>
                          updateParentContactField(
                            idx,
                            'phone',
                            e.target.value,
                          )
                        }
                        placeholder="Nhập số điện thoại"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {(studentFormData.parent_contacts || []).length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  <svg
                    className="w-12 h-12 mx-auto mb-2 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <p className="text-sm">Chưa có thông tin liên hệ</p>
                  <p className="mt-1 text-xs">
                    Nhấn nút "Thêm người liên hệ" để bắt đầu
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Địa chỉ</Label>
            <textarea
              id="address"
              value={studentFormData.address}
              onChange={(e) =>
                onFormChange('address', e.target.value)
              }
              rows={3}
              className="w-full px-4 py-3 border rounded-lg border-input focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="VD: 123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
            />
          </div>

          <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-primary" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-primary">
                  <strong>Lưu ý:</strong> Mã học sinh sẽ được hệ thống tự động
                  tạo dựa trên khối học bạn chọn. Khối 10: bắt đầu bằng 25,
                  Khối 11: bắt đầu bằng 24, Khối 12: bắt đầu bằng 23.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onClose();
              }}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={studentFormLoading}>
              {studentFormLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Đang thêm...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  <span>Thêm học sinh</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentModal;
