import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { SimpleDatePicker } from "@/components/ui/simple-date-picker";

interface Student {
  id?: number;
  student_id?: string;
}

interface EditForm {
  full_name?: string;
  email?: string;
  phone?: string;
  received_email?: string;
  class_name?: string;
  grade?: string;
  gender?: string;
  date_of_birth?: string;
  address?: string;
  parent_contacts?: Array<{
    relation?: string;
    name?: string;
    phone?: string;
  }>;
}

interface EditStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudent?: Student;
  editForm: EditForm;
  editLoading: boolean;
  isHomeroomTeacher: boolean;
  onFormChange: (field: string, value: any) => void;
  onAddParentContact: () => void;
  onRemoveParentContact: (index: number) => void;
  onUpdateParentContactField: (index: number, field: string, value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function EditStudentModal({
  open,
  onOpenChange,
  selectedStudent,
  editForm,
  editLoading,
  isHomeroomTeacher,
  onFormChange,
  onAddParentContact,
  onRemoveParentContact,
  onUpdateParentContactField,
  onSubmit,
  onClose,
}: EditStudentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Sửa thông tin học sinh</DialogTitle>
          <DialogDescription />
        </DialogHeader>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Mã học sinh (Không thể thay đổi)
              </label>
              <input
                type="text"
                value={selectedStudent?.student_id || ""}
                className="w-full px-3 py-2 text-gray-500 border border-gray-300 rounded-lg bg-gray-50"
                readOnly
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Họ và tên *
              </label>
              <input
                type="text"
                value={editForm.full_name || ""}
                onChange={(e) =>
                  onFormChange("full_name", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: Nguyễn Văn An"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={editForm.email || ""}
                onChange={(e) =>
                  onFormChange("email", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: student@example.com"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Số điện thoại
              </label>
              <input
                type="tel"
                value={editForm.phone || ""}
                onChange={(e) =>
                  onFormChange("phone", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: 0123456789"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Email phụ huynh (nhận phiếu điểm)
              </label>
              <input
                type="email"
                value={editForm.received_email || ""}
                onChange={(e) =>
                  onFormChange("received_email", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: phuhuynh@example.com"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Lớp
              </label>
              <input
                type="text"
                value={editForm.class_name || ""}
                onChange={(e) =>
                  onFormChange("class_name", e.target.value)
                }
                readOnly={isHomeroomTeacher}
                disabled={isHomeroomTeacher}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: 10A1"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Khối
              </label>
              <Select
                value={editForm.grade || "none"}
                onValueChange={(value) =>
                  onFormChange(
                    "grade",
                    value === "none" ? "" : value,
                  )
                }
                disabled={isHomeroomTeacher}
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
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Giới tính
              </label>
              <Select
                value={editForm.gender || "Nam"}
                onValueChange={(value) =>
                  onFormChange("gender", value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nam">Nam</SelectItem>
                  <SelectItem value="Nữ">Nữ</SelectItem>
                  <SelectItem value="Khác">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Ngày sinh
              </label>
              <SimpleDatePicker
                value={editForm.date_of_birth || ""}
                onChange={(value) =>
                  onFormChange("date_of_birth", value)
                }
                placeholder="Chọn ngày sinh"
                className="w-full"
              />
            </div>

            {/* Parent Contacts */}
            <div className="col-span-2">
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
                    onClick={onAddParentContact}
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

                {/* Contact Cards */}
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
                          onClick={() => onRemoveParentContact(idx)}
                          className="w-8 h-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div>
                          <label className="block mb-1 text-xs font-medium text-gray-600">
                            Mối quan hệ
                          </label>
                          <Select
                            value={c.relation || "parent"}
                            onValueChange={(value) =>
                              onUpdateParentContactField(
                                idx,
                                "relation",
                                value,
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="parent">
                                Phụ huynh
                              </SelectItem>
                              <SelectItem value="father">Bố</SelectItem>
                              <SelectItem value="mother">Mẹ</SelectItem>
                              <SelectItem value="guardian">
                                Người giám hộ
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="block mb-1 text-xs font-medium text-gray-600">
                            Họ và tên
                          </label>
                          <Input
                            type="text"
                            value={c.name || ""}
                            onChange={(e) =>
                              onUpdateParentContactField(
                                idx,
                                "name",
                                e.target.value,
                              )
                            }
                            placeholder="Nhập họ tên"
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block mb-1 text-xs font-medium text-gray-600">
                            Số điện thoại
                          </label>
                          <Input
                            type="tel"
                            value={c.phone || ""}
                            onChange={(e) =>
                              onUpdateParentContactField(
                                idx,
                                "phone",
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

                  {(editForm.parent_contacts || []).length === 0 && (
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
            </div>
          </div>

          <div className="col-span-2">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Địa chỉ
            </label>
            <textarea
              value={editForm.address || ""}
              onChange={(e) =>
                onFormChange("address", e.target.value)
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="VD: 123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
            />
          </div>

          <div className="flex justify-end pt-4 space-x-3 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={onSubmit}
              disabled={editLoading}
            >
              {editLoading ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
