import { Loader2, X } from 'lucide-react';
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

interface EditFormData {
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
  parent_name?: string;
  parent_phone?: string;
}

interface StudentData {
  id: number;
  student_id: string;
  full_name: string;
  email: string;
  phone: string;
  received_email?: string;
  class_name: string;
  grade: string | number;
  date_of_birth: string;
  address: string;
  parent_contacts: ParentContact[];
  gender: string;
  is_active: boolean;
}

interface EditStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudentForEdit: StudentData | null;
  editForm: Partial<EditFormData>;
  editLoading: boolean;
  onFormChange: (field: string, value: unknown) => void;
  addParentContactRowEdit: () => void;
  removeParentContactRowEdit: (index: number) => void;
  updateParentContactFieldEdit: (
    index: number,
    field: string,
    value: string,
  ) => void;
  onSubmit: () => void;
  onClose: () => void;
}

const EditStudentModal = ({
  open,
  onOpenChange,
  selectedStudentForEdit,
  editForm,
  editLoading,
  onFormChange,
  addParentContactRowEdit,
  removeParentContactRowEdit,
  updateParentContactFieldEdit,
  onSubmit,
  onClose,
}: EditStudentModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Sửa thông tin học sinh</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin học sinh trong hệ thống
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="edit-student-id">
                Mã học sinh (Không thể thay đổi)
              </Label>
              <Input
                id="edit-student-id"
                type="text"
                value={selectedStudentForEdit?.student_id || ''}
                className="text-muted-foreground bg-muted"
                readOnly
              />
            </div>

            <div>
              <Label htmlFor="edit-full-name">Họ và tên *</Label>
              <Input
                id="edit-full-name"
                type="text"
                value={editForm.full_name || ''}
                onChange={(e) =>
                  onFormChange('full_name', e.target.value)
                }
                placeholder="VD: Nguyễn Văn An"
              />
            </div>

            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email || ''}
                onChange={(e) =>
                  onFormChange('email', e.target.value)
                }
                placeholder="VD: student@example.com"
              />
            </div>

            <div>
              <Label htmlFor="edit-phone">Số điện thoại</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={editForm.phone || ''}
                onChange={(e) =>
                  onFormChange('phone', e.target.value)
                }
                placeholder="VD: 0123456789"
              />
            </div>

            <div>
              <Label htmlFor="edit-received-email">
                Email phụ huynh (nhận phiếu điểm)
              </Label>
              <Input
                id="edit-received-email"
                type="email"
                value={editForm.received_email || ''}
                onChange={(e) =>
                  onFormChange('received_email', e.target.value)
                }
                placeholder="VD: phuhuynh@example.com"
              />
            </div>

            <div>
              <Label htmlFor="edit-class-name">Lớp</Label>
              <Input
                id="edit-class-name"
                type="text"
                value={editForm.class_name || ''}
                onChange={(e) =>
                  onFormChange('class_name', e.target.value)
                }
                placeholder="VD: 10A1"
              />
            </div>

            <div>
              <Label htmlFor="edit-grade">Khối</Label>
              <Select
                value={editForm.grade || 'none'}
                onValueChange={(value) =>
                  onFormChange('grade', value === 'none' ? '' : value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn khối" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Chọn khối</SelectItem>
                  <SelectItem value="10">Khối 10</SelectItem>
                  <SelectItem value="11">Khối 11</SelectItem>
                  <SelectItem value="12">Khối 12</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-gender">Giới tính</Label>
              <Select
                value={editForm.gender || 'Nam'}
                onValueChange={(value) =>
                  onFormChange('gender', value)
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
            </div>

            <div>
              <Label htmlFor="edit-date-of-birth">Ngày sinh</Label>
              <SimpleDatePicker
                value={editForm.date_of_birth || ''}
                onChange={(value) =>
                  onFormChange('date_of_birth', value)
                }
                placeholder="Chọn ngày sinh"
                className="w-full"
              />
            </div>
          </div>

          {/* Parent Contacts for Edit */}
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
                onClick={addParentContactRowEdit}
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
              {(editForm.parent_contacts || []).map((c, idx) => (
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
                      onClick={() => removeParentContactRowEdit(idx)}
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
                          updateParentContactFieldEdit(idx, 'relation', value)
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
                          updateParentContactFieldEdit(
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
                          updateParentContactFieldEdit(
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
            </div>
          </div>

          <div>
            <Label htmlFor="edit-address">Địa chỉ</Label>
            <textarea
              id="edit-address"
              value={editForm.address || ''}
              onChange={(e) =>
                onFormChange('address', e.target.value)
              }
              rows={3}
              className="w-full px-3 py-2 border rounded-lg border-input focus:outline-none focus:ring-2 focus:ring-ring bg-background"
              placeholder="VD: 123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="button"
              onClick={onSubmit}
              disabled={editLoading}
            >
              {editLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang cập nhật...
                </>
              ) : (
                'Cập nhật'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditStudentModal;
