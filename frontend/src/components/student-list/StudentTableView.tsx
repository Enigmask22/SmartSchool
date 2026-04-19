import {
  Users,
  GraduationCap,
  Mail,
  Phone,
  X,
  CheckCircle2,
  Edit,
  BarChart3,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudentEdit } from "@/hooks/student-list/useStudentEdit";
import { useStudentSubjects } from "@/hooks/student-list/useStudentSubjects";
import {
  EditStudentModal,
  SubjectSelectionModal,
} from "./modals";

interface Student {
  id: number;
  full_name: string;
  student_id: string;
  email?: string;
  phone?: string;
  class_name: string;
  grade?: string;
  is_active?: boolean;
}

interface StudentTableViewProps {
  paginatedStudents: Student[];
  filteredStudents: Student[];
  searchTerm: string;
  selectedClass: string;
  startIndex: number;
  restoreLoading: boolean;
  fetchStudents: () => void;
  onEdit?: (student: Student) => void;
  onViewScores: (student: Student) => void;
  onFeedback: (student: Student) => void;
  onSelectSubjects?: (student: Student) => void;
  onUploadMultiple?: (student: Student) => void;
  onRestore?: (student: Student) => void;
  loading?: boolean;
}

export function StudentTableView({
  paginatedStudents,
  filteredStudents,
  searchTerm,
  selectedClass,
  startIndex,
  restoreLoading,
  fetchStudents,
  onEdit,
  onViewScores,
  onFeedback,
  onSelectSubjects,
  onRestore,
  loading = false,
}: StudentTableViewProps) {
  // Local modal state for view component
  const [editModalOpen, setEditModalOpen] = useState(false);
  //const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<Student | null>(null);

  // Initialize hooks for modal data management
  const edit = useStudentEdit(fetchStudents, () => {}, () => {});
  //const multipleFace = useMultipleFaceRegistration(fetchStudents, selectedStudentForModal);
  const subjects = useStudentSubjects({ setStudents: () => {} });

  // Handle edit button click
  const handleEditClick = (student: Student) => {
    setSelectedStudentForModal(student);
    edit.handleEdit(student);
    setEditModalOpen(true);
    onEdit?.(student);
  };

  // Handle upload multiple click
  // const handleUploadClick = (student: Student) => {
  //   setSelectedStudentForModal(student);
  //   multipleFace.setSelectedStudentForMultiple(student);
  //   setFaceModalOpen(true);
  //   onUploadMultiple?.(student);
  // };

  // Handle select subjects click
  const handleSubjectClick = (student: Student) => {
    setSelectedStudentForModal(student);
    subjects.handleSubjectSelection(student);
    setSubjectModalOpen(true);
    onSelectSubjects?.(student);
  };

  // Show no data message only when not loading and no students
  if (filteredStudents.length === 0 && !loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-muted">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-foreground">
            {searchTerm || selectedClass
              ? "Không tìm thấy học sinh nào"
              : "Chưa có học sinh nào"}
          </h3>
          <p className="text-muted-foreground">
            {searchTerm || selectedClass
              ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
              : "Hãy thêm học sinh mới để bắt đầu"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] text-center">STT</TableHead>
                  <TableHead>HỌC SINH</TableHead>
                  <TableHead className="text-center">LỚP</TableHead>
                  <TableHead className="text-center">EMAIL</TableHead>
                  <TableHead className="text-center">SĐT</TableHead>
                  <TableHead className="text-center">KHỐI</TableHead>
                  <TableHead className="text-center">TRẠNG THÁI</TableHead>
                  <TableHead className="text-center">TÙY CHỌN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  // Show skeleton rows when loading
                  Array.from({ length: 6 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-center">
                        <Skeleton className="h-4 w-4 mx-auto" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16 mx-auto rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32 mx-auto" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24 mx-auto" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12 mx-auto" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20 mx-auto rounded-full" />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Skeleton className="h-8 w-8 rounded" />
                          <Skeleton className="h-8 w-8 rounded" />
                          <Skeleton className="h-8 w-8 rounded" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  // Show actual data when not loading
                  paginatedStudents.map((student, index) => (
                <TableRow
                  key={student.id}
                  className={`${
                    student.is_active === false
                      ? "bg-destructive/5 opacity-75"
                      : "hover:bg-muted/50"
                  }`}
                >
                  {/* STT */}
                  <TableCell className="font-medium text-center">
                    {startIndex + index + 1}
                  </TableCell>

                  {/* Student Info */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${
                          student.is_active === false
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        {student.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <div className="font-medium">{student.full_name}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {student.student_id}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Class */}
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 w-fit mx-auto"
                    >
                      <GraduationCap className="w-3 h-3" />
                      {student.class_name || "N/A"}
                    </Badge>
                  </TableCell>

                  {/* Email */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate max-w-[200px]">
                        {student.email || "Chưa có"}
                      </span>
                    </div>
                  </TableCell>

                  {/* Phone */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      {student.phone || "Chưa có"}
                    </div>
                  </TableCell>

                  {/* Grade */}
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="mx-auto">
                      Khối {student.grade || "N/A"}
                    </Badge>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="text-center">
                    {student.is_active === false ? (
                      <Badge
                        variant="destructive"
                        className="flex items-center gap-1 w-fit mx-auto"
                      >
                        <X className="w-3 h-3" />
                        Đã xóa
                      </Badge>
                    ) : (
                      <Badge
                        variant="success"
                        className="flex items-center gap-1 w-fit mx-auto bg-green-500 text-white hover:bg-green-600"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Đang học
                      </Badge>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {student.is_active === false ? (
                        <Button
                          onClick={() => onRestore?.(student)}
                          disabled={restoreLoading}
                          size="sm"
                          variant="outline"
                          className="text-xs"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Khôi phục
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={() => handleEditClick(student)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => onViewScores(student)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            title="Xem điểm số"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => onFeedback(student)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            title="Tạo nhận xét"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleSubjectClick(student)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            title="Chọn môn học"
                          >
                            <GraduationCap className="w-4 h-4" />
                          </Button>
                          {/* <Button
                            onClick={() => handleUploadClick(student)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            title="Upload ảnh"
                          >
                            <Images className="w-4 h-4" />
                          </Button> */}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
                ))
                )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    {/* Modals */}
    <EditStudentModal
      open={editModalOpen}
      onOpenChange={setEditModalOpen}
      selectedStudent={edit.selectedStudentForEdit || undefined}
      editForm={edit.editForm}
      editLoading={edit.editLoading}
      isHomeroomTeacher={false}
      onFormChange={edit.handleEditFormChange}
      onAddParentContact={edit.addParentContactRow}
      onRemoveParentContact={edit.removeParentContactRow}
      onUpdateParentContactField={edit.updateParentContactField}
      onSubmit={edit.submitEditForm}
      onClose={() => {
        setEditModalOpen(false);
        edit.closeEditModal();
      }}
    />

    {/* <FaceRegistrationModal
      open={faceModalOpen}
      onOpenChange={setFaceModalOpen}
      selectedStudent={multipleFace.selectedStudentForMultiple || undefined}
      showMultipleModal={faceModalOpen}
      setShowMultipleModal={setFaceModalOpen}
      selectedStudentForMultiple={multipleFace.selectedStudentForMultiple || undefined}
      setSelectedStudentForMultiple={multipleFace.setSelectedStudentForMultiple}
      fetchStudents={fetchStudents}
    /> */}

    <SubjectSelectionModal
      open={subjectModalOpen}
      onOpenChange={setSubjectModalOpen}
      selectedStudent={subjects.selectedStudentForSubject || undefined}
      availableSubjects={subjects.availableSubjects}
      selectedSubjects={(subjects.selectedSubjects as any) || { core_subjects: [], elective_subjects: [] }}
      onToggleSubject={((subjectId: string | number, type?: string) => {
        subjects.toggleSubjectSelection(String(subjectId), type || "core_subjects");
      }) as any}
      loading={subjects.subjectLoading}
      onSave={subjects.saveSubjectSelection}
      onClose={() => {
        setSubjectModalOpen(false);
        subjects.closeSubjectModal();
      }}
    />
    </>
  );
}
