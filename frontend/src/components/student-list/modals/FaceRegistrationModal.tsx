import MultipleFaceRegistration from "../MultipleFaceRegistration";

interface FaceRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudent?: { id: number; full_name: string; [key: string]: any };
  showMultipleModal: boolean;
  setShowMultipleModal: (show: boolean) => void;
  selectedStudentForMultiple?: { id: number; full_name: string; [key: string]: any };
  setSelectedStudentForMultiple: (student: any) => void;
  fetchStudents: () => void;
}

export function FaceRegistrationModal({
  open,
  onOpenChange,
  selectedStudent,
  setShowMultipleModal,
  setSelectedStudentForMultiple,
  fetchStudents,
}: FaceRegistrationModalProps) {
  if (!open || !selectedStudent) {
    return null;
  }

  return (
    <MultipleFaceRegistration
      student={selectedStudent}
      onClose={() => {
        setShowMultipleModal(false);
        setSelectedStudentForMultiple(null);
        onOpenChange(false);
      }}
      onSuccess={() => {
        fetchStudents();
      }}
    />
  );
}
