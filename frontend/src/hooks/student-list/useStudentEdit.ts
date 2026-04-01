import { useState, useCallback } from "react";
import { toast } from "sonner";
import logger from "@/utils/logger";

const API_BASE_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:8000/api";

export const useStudentEdit = (
  fetchStudents: () => void,
  openConfirm: (config: any) => void,
  closeConfirm: () => void,
) => {
  // Edit student states
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<any>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Edit student functions
  const handleEdit = useCallback((student: any) => {
    setSelectedStudentForEdit(student);
    const contacts = Array.isArray(student.parent_contacts)
      ? student.parent_contacts
      : [
          {
            relation: "parent",
            name:
              (student.parent_contacts && student.parent_contacts[0]?.name) ||
              "",
            phone:
              (student.parent_contacts && student.parent_contacts[0]?.phone) ||
              "",
          },
        ];
    setEditForm({
      full_name: student.full_name || "",
      email: student.email || "",
      phone: student.phone || "",
      received_email: student.received_email || "",
      class_name: student.class_name || "",
      grade: student.grade || "",
      date_of_birth: student.date_of_birth || "",
      address: student.address || "",
      parent_contacts: contacts,
      gender: student.gender || "Nam",
    });
    setShowEditModal(true);
  }, []);

  const handleEditFormChange = useCallback((field: string, value: any) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const addParentContactRow = useCallback(() => {
    setEditForm((prev) => ({
      ...prev,
      parent_contacts: [
        ...(prev.parent_contacts || []),
        { relation: "parent", name: "", phone: "" },
      ],
    }));
  }, []);

  const removeParentContactRow = useCallback((index: number) => {
    setEditForm((prev) => ({
      ...prev,
      parent_contacts: (prev.parent_contacts || []).filter(
        (_, i) => i !== index,
      ),
    }));
  }, []);

  const updateParentContactField = useCallback(
    (index: number, field: string, value: string) => {
      setEditForm((prev) => {
        const list = [...(prev.parent_contacts || [])];
        list[index] = { ...list[index], [field]: value };
        return { ...prev, parent_contacts: list };
      });
    },
    [],
  );

  const submitEditForm = async () => {
    if (!selectedStudentForEdit || !editForm.full_name.trim()) {
      toast.error("Vui lòng nhập đầy đủ thông tin bắt buộc");
      return;
    }

    const nullableFields = ["received_email"];
    const cleanFormData: any = {};
    Object.keys(editForm).forEach((key) => {
      const value = editForm[key];
      if (nullableFields.includes(key)) {
        cleanFormData[key] = value && value.trim() !== "" ? value.trim() : null;
      } else if (value !== "" && value !== null && value !== undefined) {
        cleanFormData[key] = value;
      }
    });

    if (Array.isArray(cleanFormData.parent_contacts)) {
      cleanFormData.parent_contacts = cleanFormData.parent_contacts
        .map((c: any) => ({
          relation: c.relation || "parent",
          name: (c.name && c.name.trim()) || null,
          phone: (c.phone && c.phone.trim()) || null,
        }))
        .filter((c: any) => c.name || c.phone);
      if (cleanFormData.parent_contacts.length === 0) {
        delete cleanFormData.parent_contacts;
      }
    }

    const hasParentName =
      typeof cleanFormData.parent_name === "string" &&
      cleanFormData.parent_name.trim() !== "";
    const hasParentPhone =
      typeof cleanFormData.parent_phone === "string" &&
      cleanFormData.parent_phone.trim() !== "";
    if (!cleanFormData.parent_contacts && (hasParentName || hasParentPhone)) {
      cleanFormData.parent_contacts = [
        {
          relation: "parent",
          name: hasParentName ? cleanFormData.parent_name : null,
          phone: hasParentPhone ? cleanFormData.parent_phone : null,
        },
      ];
    }
    delete cleanFormData.parent_name;
    delete cleanFormData.parent_phone;

    setEditLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/students/${selectedStudentForEdit.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cleanFormData),
        },
      );

      if (response.ok) {
        toast.success("Cập nhật thông tin học sinh thành công!");
        await fetchStudents();
        setShowEditModal(false);
        setSelectedStudentForEdit(null);
        setEditForm({});
      } else {
        const errorData = await response.json();
        logger.error("API Error Response:", errorData);
        throw new Error(
          `Failed to update student: ${response.status} - ${JSON.stringify(
            errorData,
          )}`,
        );
      }
    } catch (error) {
      logger.error("Error updating student:", error);
      toast.error("Có lỗi xảy ra khi cập nhật thông tin học sinh");
    } finally {
      setEditLoading(false);
    }
  };

  const closeEditModal = useCallback(() => {
    setShowEditModal(false);
    setSelectedStudentForEdit(null);
    setEditForm({});
  }, []);

  const handleRestore = (student: any) => {
    logger.debug("Restore button clicked for student:", student);

    openConfirm({
      title: "Khôi phục học sinh",
      description: `Bạn có chắc chắn muốn khôi phục học sinh ${student.full_name}?`,
      confirmText: "Khôi phục",
      variant: "default",
      onConfirm: async () => {
        closeConfirm();
        setRestoreLoading(true);
        try {
          logger.debug("Sending restore request for student ID:", student.id);
          const response = await fetch(`${API_BASE_URL}/students/${student.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: true }),
          });

          logger.debug("Restore response status:", response.status);

          if (response.ok) {
            const result = await response.json();
            logger.debug("Restore successful:", result);
            toast.success("Khôi phục học sinh thành công!");
            fetchStudents();
          } else {
            const errorData = await response.json();
            logger.error("API Error Response:", errorData);
            toast.error(`Lỗi khi khôi phục: ${errorData.detail || "Unknown error"}`);
          }
        } catch (error: any) {
          logger.error("Error restoring student:", error);
          toast.error("Có lỗi xảy ra khi khôi phục học sinh: " + error.message);
        } finally {
          setRestoreLoading(false);
        }
      },
    });
  };

  return {
    // States
    showEditModal,
    setShowEditModal,
    selectedStudentForEdit,
    setSelectedStudentForEdit,
    editForm,
    setEditForm,
    editLoading,
    restoreLoading,

    // Functions
    handleEdit,
    handleEditFormChange,
    addParentContactRow,
    removeParentContactRow,
    updateParentContactField,
    submitEditForm,
    closeEditModal,
    handleRestore,
  };
};
