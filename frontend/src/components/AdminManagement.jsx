import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Search,
  Users,
  Download,
  Shuffle,
  Eye,
  EyeOff,
  User,
  GraduationCap,
  BookOpen,
  School,
  UserCheck,
  Building,
  FileX,
  Settings,
} from "lucide-react";
import api from "../services/api";
import logger from "../utils/logger";
import { SimpleDatePicker } from "./ui/simple-date-picker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import SystemSettings from "./SystemSettings";
import SchoolDaysConfig from "./SchoolDaysConfig";

const AdminManagement = () => {
  const [activeTab, setActiveTab] = useState("users");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // Soft delete state
  const [showDeleted, setShowDeleted] = useState(false);

  // Reference data cho dropdowns
  const [teachers, setTeachers] = useState([]);
  const [homeroomTeachers, setHomeroomTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);

  // Filtered teachers based on selected subject (for subject_teachers tab)
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [subjectTeachersData, setSubjectTeachersData] = useState([]); // Dữ liệu từ bảng subject_teachers

  // Teacher subjects state (for integrated subject management in teachers tab)
  const [selectedSubjects, setSelectedSubjects] = useState([]); // Danh sách môn học được chọn cho giáo viên
  const [teacherSubjects, setTeacherSubjects] = useState({}); // Map teacher_id -> [subject_ids]

  // Import từ Users modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userSubjects, setUserSubjects] = useState({}); // Map user_id -> [subject_ids] cho import
  const [importLoading, setImportLoading] = useState(false);

  // Configuration cho từng tab
  const tabConfig = {
    users: {
      title: "Quản lý người dùng",
      fields: ["email", "username", "full_name", "password", "role"],
      displayFields: [
        "id",
        "email",
        "username",
        "full_name",
        "role",
        "is_active",
      ],
      endpoint: "/admin/users",
    },
    teachers: {
      title: "Quản lý giáo viên",
      fields: [
        "teacher_code",
        "full_name",
        "email",
        "phone",
        "date_of_birth",
        "gender",
      ],
      displayFields: [
        "id",
        "teacher_code",
        "full_name",
        "email",
        "phone",
        "date_of_birth",
        "gender",
        "subjects", // Thêm cột môn học
        "is_active",
      ],
      endpoint: "/admin/teachers",
    },
    subjects: {
      title: "Quản lý môn học",
      fields: ["subject_code", "subject_name", "description"],
      displayFields: [
        "id",
        "subject_code",
        "subject_name",
        "description",
        "is_active",
      ],
      endpoint: "/admin/subjects",
    },
    classes: {
      title: "Quản lý lớp học",
      fields: [
        "class_name",
        "grade",
        "homeroom_teacher_id",
        "room_number",
        "academic_year",
      ],
      displayFields: [
        "id",
        "class_name",
        "grade",
        "homeroom_teacher",
        "room_number",
        "academic_year",
        "total_students",
      ],
      endpoint: "/admin/classes",
    },
    subject_teachers: {
      title: "Quản lý giáo viên - môn học",
      fields: ["teacher_id", "subject_id", "academic_year"], // Giữ nguyên: giáo viên trước, môn học sau
      displayFields: [
        "id",
        "teacher_name",
        "subject_name",
        "academic_year",
        "is_active",
      ],
      endpoint: "/admin/subject-teachers",
    },
    class_subjects: {
      title: "Quản lý lớp - môn học",
      fields: [
        "class_id",
        "subject_id",
        "teacher_id",
        "academic_year",
        "semester",
      ],
      displayFields: [
        "id",
        "class_name",
        "subject_name",
        "teacher_name",
        "academic_year",
        "semester",
        "is_active",
      ],
      endpoint: "/admin/class-subjects",
    },
  };

  const tabs = [
    { id: "users", label: "Người dùng", icon: User },
    { id: "teachers", label: "Giáo viên", icon: GraduationCap },
    { id: "subjects", label: "Môn học", icon: BookOpen },
    { id: "classes", label: "Lớp học", icon: School },
    // { id: "subject_teachers", label: "GV-Môn học", icon: UserCheck }, // Đã tích hợp vào tab Giáo viên
    { id: "class_subjects", label: "GV-Lớp học", icon: Building },
    { id: "system_settings", label: "Cấu hình thời gian", icon: Settings },
    { id: "school_config", label: "Cấu hình học tập", icon: School },
  ];

  const currentConfig = tabConfig[activeTab];

  // Function để generate password
  const generatePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setFormData((prev) => ({ ...prev, password: newPassword }));
  };

  const loadData = useCallback(async () => {
    if (!currentConfig?.endpoint) return;

    setLoading(true);
    setError(null);
    try {
      // Thêm query param cho các endpoints có hỗ trợ server-side filtering
      let endpoint = currentConfig.endpoint;
      const tabsWithServerFiltering = [
        "subjects",
        "subject_teachers",
        "class_subjects",
      ];

      if (tabsWithServerFiltering.includes(activeTab) && showDeleted) {
        endpoint = `${endpoint}?show_deleted=true`;
      }

      const response = await api.request(endpoint);
      if (response.success) {
        let items = response.data || [];

        // No data normalization - keep raw data for form editing
        // Display formatting will be handled in render

        // Filter theo trạng thái active/inactive
        if (tabsWithServerFiltering.includes(activeTab)) {
          // Các tabs có server-side filtering
          if (showDeleted) {
            items = items.filter((item) => item.is_active === false);
          } else {
            items = items.filter((item) => item.is_active !== false);
          }
        } else {
          // Các tabs khác dùng client-side filtering
          if (showDeleted) {
            items = items.filter((item) => item.is_active === false);
          } else {
            items = items.filter((item) => item.is_active !== false);
          }
        }

        setData(items);
      } else {
        setError(response.message || "Không thể tải dữ liệu");
      }
    } catch (err) {
      setError("Lỗi khi tải dữ liệu: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [currentConfig?.endpoint, showDeleted, activeTab]);

  // Load reference data cho dropdowns
  const loadReferenceData = useCallback(async () => {
    try {
      const [
        teachersRes,
        homeroomTeachersRes,
        subjectsRes,
        classesRes,
        usersRes,
        subjectTeachersRes,
      ] = await Promise.all([
        api.request("/admin/teachers"),
        api.request("/admin/teachers/homeroom"),
        api.request("/admin/subjects"),
        api.request("/admin/classes"),
        api.request("/admin/users"),
        api.request("/admin/subject-teachers"), // Load subject_teachers data
      ]);

      if (teachersRes.success) setTeachers(teachersRes.data || []);
      if (homeroomTeachersRes.success)
        setHomeroomTeachers(homeroomTeachersRes.data || []);
      if (subjectsRes.success) setSubjects(subjectsRes.data || []);
      if (classesRes.success) setClasses(classesRes.data || []);
      if (usersRes.success) setUsers(usersRes.data || []);
      if (subjectTeachersRes.success) {
        setSubjectTeachersData(subjectTeachersRes.data || []);

        // Build teacherSubjects map (teacher_id -> [subject_ids])
        const teacherSubjectsMap = {};
        (subjectTeachersRes.data || []).forEach((st) => {
          if (st.is_active !== false) {
            if (!teacherSubjectsMap[st.teacher_id]) {
              teacherSubjectsMap[st.teacher_id] = [];
            }
            teacherSubjectsMap[st.teacher_id].push(st.subject_id);
          }
        });
        setTeacherSubjects(teacherSubjectsMap);
      }
    } catch (err) {
      logger.error("Error loading reference data:", err);
    }
  }, []);

  // Load dữ liệu khi đổi tab
  useEffect(() => {
    // Load data trước, sau đó mới load reference data để tránh race condition
    const loadAllData = async () => {
      await loadData();
      // Chỉ load reference data cho các tabs cần dropdown/mapping
      if (
        activeTab === "teachers" ||
        activeTab === "class_subjects" ||
        activeTab === "subject_teachers"
      ) {
        await loadReferenceData();
      }
    };

    loadAllData();
  }, [activeTab, loadData, loadReferenceData]);

  // Auto-filter teachers when editing class_subjects with existing subject_id
  useEffect(() => {
    if (
      activeTab === "class_subjects" &&
      formData.subject_id &&
      subjectTeachersData.length > 0 &&
      teachers.length > 0
    ) {
      const teachersForSubject = subjectTeachersData
        .filter(
          (st) =>
            st.subject_id === formData.subject_id && st.is_active !== false
        )
        .map((st) => st.teacher_id);

      const filtered = teachers.filter((t) =>
        teachersForSubject.includes(t.id)
      );
      setFilteredTeachers(filtered);
    }
  }, [activeTab, formData.subject_id, subjectTeachersData, teachers]);

  // Load môn học của giáo viên khi edit trong tab teachers
  useEffect(() => {
    if (activeTab === "teachers" && editingItem) {
      // editingItem là id của giáo viên
      const teacherSubjectIds = teacherSubjects[editingItem] || [];
      setSelectedSubjects(teacherSubjectIds);
    } else if (activeTab === "teachers" && showAddForm) {
      // Reset khi thêm mới
      setSelectedSubjects([]);
    }
  }, [activeTab, editingItem, showAddForm, teacherSubjects]);

  const handleCreate = async (data) => {
    if (!currentConfig?.endpoint) return;

    try {
      // Xử lý đặc biệt cho teachers: tạo teacher + subject_teachers
      if (activeTab === "teachers") {
        // Lọc chỉ các field được phép create
        const allowedFields = [
          "teacher_code",
          "full_name",
          "email",
          "phone",
          "date_of_birth",
          "gender",
          "user_id",
          "subject_specialization",
        ];
        const cleanData = {};

        allowedFields.forEach((field) => {
          if (
            field in data &&
            data[field] !== undefined &&
            data[field] !== null &&
            data[field] !== ""
          ) {
            cleanData[field] = data[field];
          }
        });

        logger.debug("Clean data to send:", cleanData);

        // Validate required fields
        if (!cleanData.full_name) {
          setError("Vui lòng nhập họ tên giáo viên");
          return;
        }

        // 1. Tạo teacher trước
        const teacherResponse = await api.request(currentConfig.endpoint, {
          method: "POST",
          body: JSON.stringify(cleanData),
        });

        if (!teacherResponse.success) {
          setError(teacherResponse.message || "Không thể tạo giáo viên");
          return;
        }

        const newTeacher = teacherResponse.data;
        const newTeacherId = newTeacher.id;

        // 2. Tạo các subject_teachers nếu có môn học được chọn
        if (selectedSubjects.length > 0) {
          const currentYear = new Date().getFullYear();
          const academicYear = `${currentYear}-${currentYear + 1}`;

          const subjectTeacherPromises = selectedSubjects.map((subjectId) =>
            api.request("/admin/subject-teachers", {
              method: "POST",
              body: JSON.stringify({
                teacher_id: newTeacherId,
                subject_id: subjectId,
                academic_year: academicYear,
                is_active: true,
              }),
            })
          );

          await Promise.all(subjectTeacherPromises);
        }

        setShowAddForm(false);
        setFormData({});
        setSelectedSubjects([]);
        loadData();
        loadReferenceData(); // Reload để cập nhật teacherSubjects map
        alert(
          `Tạo giáo viên thành công${
            selectedSubjects.length > 0
              ? ` và phân công ${selectedSubjects.length} môn học!`
              : "!"
          }`
        );
      } else {
        // Xử lý bình thường cho các tab khác
        const response = await api.request(currentConfig.endpoint, {
          method: "POST",
          body: JSON.stringify(data),
        });

        if (response.success) {
          setShowAddForm(false);
          setFormData({});
          loadData();
          alert("Tạo thành công!");
        } else {
          setError(response.message || "Không thể tạo bản ghi");
        }
      }
    } catch (err) {
      setError("Lỗi khi tạo: " + err.message);
    }
  };

  const handleUpdate = async (id, data) => {
    if (!currentConfig?.endpoint) return;

    try {
      logger.debug("Updating with id:", id, "data:", data);

      // Xử lý đặc biệt cho teachers: update teacher + subject_teachers
      if (activeTab === "teachers") {
        // Lọc chỉ các field được phép update, loại bỏ các field hệ thống
        const allowedFields = [
          "teacher_code",
          "full_name",
          "email",
          "phone",
          "date_of_birth",
          "gender",
          "user_id",
          "is_active",
        ];
        const cleanData = {};

        allowedFields.forEach((field) => {
          if (field in data) {
            cleanData[field] = data[field];
          }
        });

        // 1. Update teacher trước
        const teacherResponse = await api.request(
          `${currentConfig.endpoint}/${id}`,
          {
            method: "PUT",
            body: JSON.stringify(cleanData),
          }
        );

        if (!teacherResponse.success) {
          setError(teacherResponse.message || "Không thể cập nhật giáo viên");
          return;
        }

        // 2. Xử lý subject_teachers
        // Lấy danh sách môn học hiện tại của giáo viên
        const currentSubjectIds = teacherSubjects[id] || [];

        // Tìm môn học cần thêm và môn học cần xóa
        const subjectsToAdd = selectedSubjects.filter(
          (sid) => !currentSubjectIds.includes(sid)
        );
        const subjectsToRemove = currentSubjectIds.filter(
          (sid) => !selectedSubjects.includes(sid)
        );

        const currentYear = new Date().getFullYear();
        const academicYear = `${currentYear}-${currentYear + 1}`;

        // Thêm môn học mới
        if (subjectsToAdd.length > 0) {
          const addPromises = subjectsToAdd.map((subjectId) =>
            api.request("/admin/subject-teachers", {
              method: "POST",
              body: JSON.stringify({
                teacher_id: id,
                subject_id: subjectId,
                academic_year: academicYear,
                is_active: true,
              }),
            })
          );
          await Promise.all(addPromises);
        }

        // Xóa môn học (soft delete)
        if (subjectsToRemove.length > 0) {
          // Tìm subject_teacher_ids cần xóa
          const subjectTeachersToDelete = subjectTeachersData.filter(
            (st) =>
              st.teacher_id === id &&
              subjectsToRemove.includes(st.subject_id) &&
              st.is_active !== false
          );

          const deletePromises = subjectTeachersToDelete.map((st) =>
            api.request(`/admin/subject-teachers/${st.id}`, {
              method: "DELETE",
            })
          );
          await Promise.all(deletePromises);
        }

        setEditingItem(null);
        setFormData({});
        setSelectedSubjects([]);
        loadData();
        loadReferenceData(); // Reload để cập nhật teacherSubjects map
        alert(`Cập nhật giáo viên thành công!`);
      } else {
        // Xử lý bình thường cho các tab khác
        const response = await api.request(`${currentConfig.endpoint}/${id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });

        if (response.success) {
          setEditingItem(null);
          setFormData({});
          loadData();
          alert("Cập nhật thành công!");
        } else {
          setError(response.message || "Không thể cập nhật");
        }
      }
    } catch (err) {
      setError("Lỗi khi cập nhật: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!currentConfig?.endpoint) return;

    if (!window.confirm("Bạn có chắc muốn xóa tạm thời bản ghi này?")) return;

    try {
      const response = await api.request(`${currentConfig.endpoint}/${id}`, {
        method: "DELETE",
      });

      if (response.success) {
        loadData();
        alert(
          'Xóa tạm thời thành công! Bạn có thể khôi phục trong tab "Đã xóa tạm thời".'
        );
      } else {
        setError(response.message || "Không thể xóa");
      }
    } catch (err) {
      setError("Lỗi khi xóa: " + err.message);
    }
  };

  const handleRestore = async (id) => {
    if (!currentConfig?.endpoint) return;

    if (!window.confirm("Bạn có chắc muốn khôi phục bản ghi này?")) return;

    try {
      const response = await api.request(
        `${currentConfig.endpoint}/${id}/restore`,
        {
          method: "POST",
        }
      );

      if (response.success) {
        loadData();
        alert("Khôi phục thành công!");
      } else {
        setError(response.message || "Không thể khôi phục");
      }
    } catch (err) {
      setError("Lỗi khi khôi phục: " + err.message);
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!currentConfig?.endpoint) return;

    if (
      !window.confirm(
        "⚠️ CẢNH BÁO: Bạn có CHẮC CHẮN muốn xóa VĨNH VIỄN bản ghi này?\n\nHành động này KHÔNG THỂ HOÀN TÁC!"
      )
    )
      return;

    try {
      const response = await api.request(
        `${currentConfig.endpoint}/${id}/permanent`,
        {
          method: "DELETE",
        }
      );

      if (response.success) {
        loadData();
        alert("Xóa vĩnh viễn thành công!");
      } else {
        setError(response.message || "Không thể xóa vĩnh viễn");
      }
    } catch (err) {
      setError("Lỗi khi xóa vĩnh viễn: " + err.message);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      return updated;
    });

    // Khi chọn môn học ở tab class_subjects, filter danh sách giáo viên
    // Chỉ hiển thị giáo viên đã được phân công dạy môn học đó
    if (field === "subject_id" && activeTab === "class_subjects") {
      // Reset teacher_id khi thay đổi môn học
      setFormData((prev) => ({ ...prev, [field]: value, teacher_id: null }));

      if (value) {
        // Lọc giáo viên đã được phân công dạy môn này (từ subject_teachers)
        logger.debug("=== DEBUG: Filter Teachers for Subject ===");
        logger.debug("Selected subject_id:", value);
        logger.debug("subjectTeachersData:", subjectTeachersData);

        const teachersForSubject = subjectTeachersData
          .filter(
            (st) => st.subject_id === parseInt(value) && st.is_active !== false
          )
          .map((st) => st.teacher_id);

        logger.debug("teachersForSubject (IDs):", teachersForSubject);
        logger.debug("All teachers:", teachers);

        const filtered = teachers.filter((t) =>
          teachersForSubject.includes(t.id)
        );

        logger.debug("Filtered teachers:", filtered);
        setFilteredTeachers(filtered);
      } else {
        setFilteredTeachers([]);
      }
    }
  };

  // Load available users for import
  const loadAvailableUsers = async () => {
    try {
      const response = await api.request("/admin/users/teachers");
      if (response.success) {
        setAvailableUsers(response.data || []);
      } else {
        setError(response.message || "Không thể tải danh sách users");
      }
    } catch (err) {
      setError("Lỗi khi tải danh sách users: " + err.message);
    }
  };

  // Handle import teachers from users
  const handleImportTeachers = async () => {
    if (selectedUserIds.length === 0) {
      alert("Vui lòng chọn ít nhất một user để tạo giáo viên");
      return;
    }

    setImportLoading(true);
    try {
      // 1. Tạo giáo viên từ users
      const response = await api.request("/admin/teachers/import-from-users", {
        method: "POST",
        body: JSON.stringify(selectedUserIds),
      });

      if (response.success) {
        const createdTeachers = response.data;

        // 2. Tạo subject_teachers cho những giáo viên có môn học được chọn
        const currentYear = new Date().getFullYear();
        const academicYear = `${currentYear}-${currentYear + 1}`;

        const subjectTeacherPromises = [];

        createdTeachers.forEach((teacher) => {
          const subjectIds = userSubjects[teacher.user_id] || [];

          subjectIds.forEach((subjectId) => {
            subjectTeacherPromises.push(
              api.request("/admin/subject-teachers", {
                method: "POST",
                body: JSON.stringify({
                  teacher_id: teacher.id,
                  subject_id: subjectId,
                  academic_year: academicYear,
                  is_active: true,
                }),
              })
            );
          });
        });

        if (subjectTeacherPromises.length > 0) {
          await Promise.all(subjectTeacherPromises);
        }

        setShowImportModal(false);
        setSelectedUserIds([]);
        setUserSubjects({}); // Reset subject selections
        loadData(); // Reload teachers list
        loadReferenceData(); // Reload để cập nhật teacherSubjects map

        const totalSubjects = Object.values(userSubjects).reduce(
          (sum, subjects) => sum + subjects.length,
          0
        );
        alert(
          `Tạo thành công ${createdTeachers.length} giáo viên${
            totalSubjects > 0 ? ` và phân công ${totalSubjects} môn học!` : "!"
          }`
        );
      } else {
        setError(response.message || "Không thể tạo giáo viên");
      }
    } catch (err) {
      setError("Lỗi khi tạo giáo viên: " + err.message);
    } finally {
      setImportLoading(false);
    }
  };

  // Handle user selection
  const handleUserSelect = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Handle select all users
  const handleSelectAllUsers = () => {
    if (selectedUserIds.length === availableUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(availableUsers.map((user) => user.id));
    }
  };

  // Handle toggle subject for a user in import modal
  const handleUserSubjectToggle = (userId, subjectId) => {
    setUserSubjects((prev) => {
      const currentSubjects = prev[userId] || [];
      const newSubjects = currentSubjects.includes(subjectId)
        ? currentSubjects.filter((id) => id !== subjectId)
        : [...currentSubjects, subjectId];

      return {
        ...prev,
        [userId]: newSubjects,
      };
    });
  };

  const filteredData = data.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return Object.values(item).some((value) =>
      String(value).toLowerCase().includes(searchLower)
    );
  });

  const renderForm = (isEdit = false, item = null) => {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isEdit) {
            handleUpdate(item.id, formData);
          } else {
            handleCreate(formData);
          }
        }}
        className="space-y-4"
      >
        {currentConfig?.fields?.map((field) => (
          <div key={field}>
            <label className="block mb-2 text-sm font-semibold text-gray-800">
              {field === "password"
                ? "Mật khẩu"
                : field === "full_name"
                ? "Họ tên"
                : field === "username"
                ? "Tên đăng nhập"
                : field === "email"
                ? "Email"
                : field === "role"
                ? "Vai trò"
                : field === "teacher_code"
                ? "Mã giáo viên"
                : field === "subject_code"
                ? "Mã môn học"
                : field === "subject_name"
                ? "Tên môn học"
                : field === "class_name"
                ? "Tên lớp"
                : field === "room_number"
                ? "Số phòng"
                : field === "academic_year"
                ? "Năm học"
                : field === "teacher_id"
                ? "Giáo viên"
                : field === "subject_id"
                ? "Môn học"
                : field === "class_id"
                ? "Lớp học"
                : field === "homeroom_teacher_id"
                ? "Giáo viên chủ nhiệm"
                : field === "phone"
                ? "Số điện thoại"
                : field === "date_of_birth"
                ? "Ngày sinh"
                : field === "gender"
                ? "Giới tính"
                : field === "description"
                ? "Mô tả"
                : field === "grade"
                ? "Khối"
                : field === "semester"
                ? "Học kỳ"
                : field.replace(/_/g, " ")}
              {field !== "description" &&
              field !== "phone" &&
              field !== "homeroom_teacher_id" &&
              field !== "user_id" &&
              field !== "username"
                ? " *"
                : ""}
            </label>

            {field === "role" ? (
              <select
                value={formData[field] || item?.[field] || ""}
                onChange={(e) => handleChange(field, e.target.value)}
                className="flex w-full h-10 px-3 py-2 text-sm border rounded-md border-input bg-background ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="">Chọn vai trò</option>
                <option value="teacher">Giáo viên</option>
                <option value="homeroom_teacher">Giáo viên chủ nhiệm</option>
              </select>
            ) : field === "teacher_id" ? (
              <select
                value={formData[field] || item?.[field] || ""}
                onChange={(e) =>
                  handleChange(
                    field,
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                className="flex w-full h-10 px-3 py-2 text-sm border rounded-md border-input bg-background ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
                disabled={
                  activeTab === "class_subjects" && !formData.subject_id
                }
              >
                <option value="">
                  {activeTab === "class_subjects" && !formData.subject_id
                    ? "Vui lòng chọn môn học trước"
                    : "Chọn giáo viên"}
                </option>
                {(activeTab === "class_subjects"
                  ? filteredTeachers
                  : teachers
                ).map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.teacher_code} - {teacher.full_name}
                  </option>
                ))}
              </select>
            ) : field === "subject_id" ? (
              <select
                value={formData[field] || item?.[field] || ""}
                onChange={(e) =>
                  handleChange(
                    field,
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                className="flex w-full h-10 px-3 py-2 text-sm border rounded-md border-input bg-background ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="">Chọn môn học</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.subject_code} - {subject.subject_name}
                  </option>
                ))}
              </select>
            ) : field === "class_id" ? (
              <select
                value={formData[field] || item?.[field] || ""}
                onChange={(e) => handleChange(field, parseInt(e.target.value))}
                className="flex w-full h-10 px-3 py-2 text-sm border rounded-md border-input bg-background ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="">Chọn lớp</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class_name} - {cls.grade}
                  </option>
                ))}
              </select>
            ) : field === "homeroom_teacher_id" ? (
              <select
                value={formData[field] || item?.[field] || ""}
                onChange={(e) =>
                  handleChange(
                    field,
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                className="flex w-full h-10 px-3 py-2 text-sm border rounded-md border-input bg-background ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Chọn GVCN (tùy chọn)</option>
                {homeroomTeachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.teacher_code} - {teacher.full_name}
                  </option>
                ))}
              </select>
            ) : field === "gender" ? (
              <Select
                value={
                  formData[field] ||
                  (item?.[field] && item[field] !== "-" ? item[field] : "Nam")
                }
                onValueChange={(value) => handleChange(field, value)}
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
            ) : field === "date_of_birth" ? (
              <div className="w-full">
                <SimpleDatePicker
                  value={
                    formData[field] ||
                    (item?.[field] && item[field] !== "-" ? item[field] : "")
                  }
                  onChange={(date) => handleChange(field, date)}
                  placeholder="Chọn ngày sinh"
                />
              </div>
            ) : field === "user_id" ? (
              <select
                value={formData[field] || item?.[field] || ""}
                onChange={(e) =>
                  handleChange(
                    field,
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                className="flex w-full h-10 px-3 py-2 text-sm border rounded-md border-input bg-background ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Chọn người dùng (tùy chọn)</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email} - {user.full_name}
                  </option>
                ))}
              </select>
            ) : field === "semester" ? (
              <select
                value={formData[field] || item?.[field] || ""}
                onChange={(e) => handleChange(field, e.target.value)}
                className="flex w-full h-10 px-3 py-2 text-sm border rounded-md border-input bg-background ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="">Chọn học kỳ</option>
                <option value="HK1">Học kỳ 1</option>
                <option value="HK2">Học kỳ 2</option>
                <option value="HK3">Học kỳ 3</option>
              </select>
            ) : field === "grade" ? (
              <select
                value={formData[field] || item?.[field] || ""}
                onChange={(e) => handleChange(field, e.target.value)}
                className="flex w-full h-10 px-3 py-2 text-sm border rounded-md border-input bg-background ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="">Chọn khối</option>
                <option value="10">Khối 10</option>
                <option value="11">Khối 11</option>
                <option value="12">Khối 12</option>
              </select>
            ) : field.includes("description") ? (
              <textarea
                value={formData[field] || item?.[field] || ""}
                onChange={(e) => handleChange(field, e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                rows="3"
              />
            ) : field === "password" && isEdit ? (
              // Bỏ trường password khi edit
              <div className="flex items-center w-full h-10 px-3 py-2 text-sm border rounded-md border-input bg-muted text-muted-foreground">
                Mật khẩu không thể thay đổi ở đây. Người dùng có thể tự đổi mật
                khẩu trong phần cài đặt.
              </div>
            ) : (
              <div className="relative">
                <Input
                  type={
                    field.includes("email")
                      ? "email"
                      : field.includes("phone")
                      ? "tel"
                      : field === "password"
                      ? showPassword
                        ? "text"
                        : "password"
                      : "text"
                  }
                  value={
                    formData[field] ||
                    (item?.[field] && item[field] !== "-" ? item[field] : "")
                  }
                  onChange={(e) => handleChange(field, e.target.value)}
                  placeholder={
                    field === "username"
                      ? "ho_va_ten.ten_truong.ten_tinh"
                      : field === "phone"
                      ? "Nhập số điện thoại"
                      : field === "teacher_code"
                      ? "Nhập mã giáo viên"
                      : ""
                  }
                  required={
                    field !== "description" &&
                    field !== "phone" &&
                    field !== "homeroom_teacher_id" &&
                    field !== "user_id" &&
                    field !== "username"
                  }
                />
                {field === "password" && !isEdit && (
                  <div className="absolute flex space-x-1 transform -translate-y-1/2 right-2 top-1/2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGeneratePassword}
                      className="w-6 h-6 p-0 text-green-700 hover:bg-green-100"
                      title="Tạo mật khẩu tự động"
                    >
                      <Shuffle className="w-3 h-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="w-6 h-6 p-0 text-blue-700 hover:bg-blue-100"
                      title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-3 h-3" />
                      ) : (
                        <Eye className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {field === "username" && (
              <p className="mt-1 text-xs text-gray-500">
                Tùy chọn. Format: tên.school.province (VD:
                nguyen_thi_lan.chuyen_le_quy_don.tphcm)
              </p>
            )}
          </div>
        ))}

        {/* Multi-select môn học cho teachers */}
        {activeTab === "teachers" && (
          <div className="pt-4 mt-4 border-t border-gray-200">
            <label className="block mb-3 text-sm font-semibold text-gray-800">
              <BookOpen className="inline-block w-4 h-4 mr-1 mb-0.5" />
              Môn học phụ trách
            </label>
            <p className="mb-3 text-xs text-gray-600">
              Chọn các môn học mà giáo viên này sẽ giảng dạy (có thể chọn nhiều
              môn)
            </p>
            <div className="grid grid-cols-2 gap-2 p-3 overflow-y-auto rounded-md bg-gray-50 max-h-60">
              {subjects.map((subject) => (
                <label
                  key={subject.id}
                  className="flex items-center p-2 space-x-2 transition-colors rounded cursor-pointer hover:bg-white"
                >
                  <input
                    type="checkbox"
                    checked={selectedSubjects.includes(subject.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSubjects([...selectedSubjects, subject.id]);
                      } else {
                        setSelectedSubjects(
                          selectedSubjects.filter((id) => id !== subject.id)
                        );
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    {subject.subject_code} - {subject.subject_name}
                  </span>
                </label>
              ))}
            </div>
            {selectedSubjects.length > 0 && (
              <p className="mt-2 text-xs text-green-600">
                ✓ Đã chọn {selectedSubjects.length} môn học
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end pt-6 mt-8 space-x-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (isEdit) {
                setEditingItem(null);
              } else {
                setShowAddForm(false);
              }
              setFormData({});
              setShowPassword(false);
            }}
          >
            <X className="w-4 h-4 mr-2" />
            Hủy
          </Button>
          <Button type="submit">
            <Save className="w-4 h-4 mr-2" />
            {isEdit ? "Cập nhật" : "Tạo mới"}
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div className="min-h-screen p-6 bg-background">
      {/* Header Section */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-4xl font-bold text-primary">
              Quản trị hệ thống
            </CardTitle>
            <CardDescription className="text-lg">
              Quản lý người dùng, lớp học, môn học và cấu hình hệ thống
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Enhanced Tabs */}
      <div className="mb-8">
        <Card>
          <CardContent className="p-0">
            <nav className="flex space-x-0 overflow-x-auto">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-4 font-medium text-sm transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-primary hover:bg-muted"
                  }`}
                >
                  <tab.icon className="w-5 h-5 mr-3" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="w-2 h-2 ml-2 rounded-full animate-pulse bg-primary-foreground"></div>
                  )}
                </Button>
              ))}
            </nav>
          </CardContent>
        </Card>
      </div>

      {/* Conditional Content - System Settings, School Config hoặc Table-based Content */}
      {activeTab === "system_settings" ? (
        <SystemSettings />
      ) : activeTab === "school_config" ? (
        <SchoolDaysConfig />
      ) : (
        <>
          {/* Enhanced Content */}
          <Card>
            {/* Enhanced Header */}
            <CardHeader className="bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold">
                    {currentConfig?.title || "Quản lý"}
                  </CardTitle>
                  <CardDescription>
                    Quản lý và cấu hình dữ liệu hệ thống
                  </CardDescription>
                </div>
                <div className="flex space-x-3">
                  {activeTab === "teachers" && (
                    <Button
                      onClick={() => {
                        setShowImportModal(true);
                        loadAvailableUsers();
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Import từ Users
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setShowAddForm(true);
                      // Khởi tạo formData với giá trị mặc định cho teachers
                      if (activeTab === "teachers") {
                        setFormData({ gender: "Nam" });
                      } else {
                        setFormData({});
                      }
                    }}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Thêm mới
                  </Button>
                </div>
              </div>

              {/* Enhanced Search */}
              <div className="flex items-center justify-between gap-4 mt-6">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute w-5 h-5 transform -translate-y-1/2 left-4 top-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12"
                  />
                </div>

                {/* Checkbox hiển thị đã xóa - chỉ hiện cho Users, Teachers và Subjects */}
                {(activeTab === "users" ||
                  activeTab === "teachers" ||
                  activeTab === "subjects" ||
                  activeTab === "subject_teachers" ||
                  activeTab === "class_subjects") && (
                  <div className="flex items-center px-4 py-2 space-x-2 rounded-lg bg-muted">
                    <input
                      type="checkbox"
                      id="showDeleted"
                      checked={showDeleted}
                      onChange={(e) => setShowDeleted(e.target.checked)}
                      className="w-4 h-4 border-gray-300 rounded text-primary focus:ring-primary"
                    />
                    <label
                      htmlFor="showDeleted"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Hiển thị đã xóa tạm thời
                    </label>
                  </div>
                )}
              </div>
            </CardHeader>

            {/* Enhanced Add Form */}
            {showAddForm && (
              <CardContent className="border-b bg-muted/30">
                <div className="mb-4">
                  <h3 className="mb-2 text-lg font-semibold">Thông tin mới</h3>
                  <p className="text-sm text-muted-foreground">
                    Nhập thông tin để tạo bản ghi mới
                  </p>
                </div>
                {renderForm()}
              </CardContent>
            )}

            {/* Enhanced Table */}
            <CardContent>
              {loading ? (
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {currentConfig?.displayFields?.map((field) => (
                          <TableHead key={field}>
                            <div className="h-4 rounded animate-pulse bg-muted"></div>
                          </TableHead>
                        ))}
                        <TableHead>
                          <div className="h-4 rounded animate-pulse bg-muted"></div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...Array(5)].map((_, index) => (
                        <TableRow key={index}>
                          {currentConfig?.displayFields?.map((field) => (
                            <TableCell key={field}>
                              <div className="h-4 rounded animate-pulse bg-muted"></div>
                            </TableCell>
                          ))}
                          <TableCell>
                            <div className="flex space-x-2">
                              <div className="w-8 h-8 rounded animate-pulse bg-muted"></div>
                              <div className="w-8 h-8 rounded animate-pulse bg-muted"></div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : error ? (
                <div className="py-16 text-center">
                  <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10">
                    <span className="text-2xl text-destructive">⚠️</span>
                  </div>
                  <p className="mb-4 font-medium text-destructive">{error}</p>
                  <Button onClick={loadData}>Thử lại</Button>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-muted">
                    <FileX className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-muted-foreground">
                    Không có dữ liệu
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {currentConfig?.displayFields?.map((field) => (
                          <TableHead key={field}>
                            {field === "username"
                              ? "USERNAME"
                              : field === "full_name"
                              ? "HỌ TÊN"
                              : field === "is_active"
                              ? "TRẠNG THÁI"
                              : field === "subjects"
                              ? "MÔN HỌC PHỤ TRÁCH"
                              : field === "subject_code"
                              ? "MÃ MÔN HỌC"
                              : field === "subject_name"
                              ? "TÊN MÔN HỌC"
                              : field === "description"
                              ? "MÔ TẢ"
                              : field === "class_name"
                              ? "TÊN LỚP"
                              : field === "grade"
                              ? "KHỐI"
                              : field === "homeroom_teacher"
                              ? "GIÁO VIÊN CHỦ NHIỆM"
                              : field === "room_number"
                              ? "SỐ PHÒNG"
                              : field === "academic_year"
                              ? "NĂM HỌC"
                              : field === "total_students"
                              ? "TỔNG SỐ HỌC SINH"
                              : field === "teacher_name"
                              ? "TÊN GIÁO VIÊN"
                              : field === "semester"
                              ? "HỌC KỲ"
                              : field === "date_of_birth"
                              ? "NGÀY SINH"
                              : field === "gender"
                              ? "GIỚI TÍNH"
                              : field === "phone"
                              ? "SDT"
                              : field.replace(/_/g, " ").toUpperCase()}
                          </TableHead>
                        ))}
                        <TableHead>THAO TÁC</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((item, index) => (
                        <React.Fragment key={item.id}>
                          <TableRow
                            className={
                              index % 2 === 0 ? "bg-background" : "bg-muted/50"
                            }
                          >
                            {currentConfig?.displayFields?.map((field) => (
                              <TableCell key={field}>
                                {field === "subjects" ? (
                                  // Hiển thị môn học của giáo viên
                                  <div className="flex flex-wrap gap-1">
                                    {(() => {
                                      const teacherSubjectIds =
                                        teacherSubjects[item.id] || [];
                                      if (teacherSubjectIds.length === 0) {
                                        return (
                                          <span className="text-xs italic text-gray-400">
                                            Chưa phân công
                                          </span>
                                        );
                                      }
                                      return teacherSubjectIds.map(
                                        (subjectId) => {
                                          const subject = subjects.find(
                                            (s) => s.id === subjectId
                                          );
                                          return subject ? (
                                            <Badge
                                              key={subjectId}
                                              variant="outline"
                                              className="text-xs text-blue-700 border-blue-200 bg-blue-50"
                                            >
                                              {subject.subject_code}
                                            </Badge>
                                          ) : null;
                                        }
                                      );
                                    })()}
                                  </div>
                                ) : field === "date_of_birth" ? (
                                  // Hiển thị ngày sinh với format đẹp
                                  item[field] && item[field] !== "-" ? (
                                    new Date(item[field]).toLocaleDateString(
                                      "vi-VN"
                                    )
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )
                                ) : field === "gender" ? (
                                  // Hiển thị giới tính với màu
                                  item[field] && item[field] !== "-" ? (
                                    <Badge
                                      variant="outline"
                                      className={
                                        item[field] === "Nam"
                                          ? "bg-blue-50 text-blue-700 border-blue-200"
                                          : item[field] === "Nữ"
                                          ? "bg-pink-50 text-pink-700 border-pink-200"
                                          : "bg-gray-50 text-gray-700 border-gray-200"
                                      }
                                    >
                                      {item[field]}
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )
                                ) : typeof item[field] === "boolean" ? (
                                  item[field] ? (
                                    <Badge
                                      variant="default"
                                      className="text-green-800 bg-green-100"
                                    >
                                      Có
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive">Không</Badge>
                                  )
                                ) : field === "role" ? (
                                  // Hiển thị label tiếng Việt cho role
                                  <Badge
                                    variant="outline"
                                    className={
                                      item[field] === "admin"
                                        ? "bg-purple-50 text-purple-700 border-purple-200"
                                        : item[field] === "homeroom_teacher"
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : "bg-green-50 text-green-700 border-green-200"
                                    }
                                  >
                                    {item[field] === "admin"
                                      ? "Quản trị viên"
                                      : item[field] === "homeroom_teacher"
                                      ? "Giáo viên chủ nhiệm"
                                      : item[field] === "teacher"
                                      ? "Giáo viên"
                                      : item[field]}
                                  </Badge>
                                ) : field === "teacher_code" ||
                                  field === "phone" ||
                                  field === "email" ? (
                                  // Các trường text đặc biệt - hiển thị với màu xám nếu là "-"
                                  <span
                                    className={
                                      item[field] === "-"
                                        ? "text-gray-400 italic"
                                        : ""
                                    }
                                  >
                                    {item[field] ?? "-"}
                                  </span>
                                ) : (
                                  item[field] ?? "-"
                                )}
                              </TableCell>
                            ))}
                            <TableCell>
                              <div className="flex space-x-2">
                                {showDeleted ? (
                                  // Buttons cho items đã xóa
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRestore(item.id)}
                                      className="text-green-600 border-green-200 hover:bg-green-50"
                                      title="Khôi phục"
                                    >
                                      <Save className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handlePermanentDelete(item.id)
                                      }
                                      className="text-red-600 border-red-200 hover:bg-red-50"
                                      title="Xóa vĩnh viễn"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                ) : (
                                  // Buttons bình thường
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditingItem(item.id);

                                        // Khởi tạo formData với giá trị mặc định cho teachers
                                        if (activeTab === "teachers") {
                                          logger.debug(
                                            ">>> EDIT TEACHER CLICKED"
                                          );
                                          logger.debug(
                                            ">>> Original item:",
                                            item
                                          );
                                          logger.debug(
                                            ">>> item.gender:",
                                            item.gender
                                          );
                                          logger.debug(
                                            ">>> item.date_of_birth:",
                                            item.date_of_birth
                                          );

                                          const initData = {
                                            ...item,
                                            gender: item.gender || "Nam",
                                            date_of_birth:
                                              item.date_of_birth || "",
                                          };

                                          logger.debug(
                                            ">>> Initialized formData:",
                                            initData
                                          );
                                          setFormData(initData);
                                        } else {
                                          setFormData(item);
                                        }

                                        // Auto-filter teachers for class_subjects when editing
                                        if (
                                          activeTab === "class_subjects" &&
                                          item.subject_id
                                        ) {
                                          const teachersForSubject =
                                            subjectTeachersData
                                              .filter(
                                                (st) =>
                                                  st.subject_id ===
                                                    item.subject_id &&
                                                  st.is_active !== false
                                              )
                                              .map((st) => st.teacher_id);
                                          const filtered = teachers.filter(
                                            (t) =>
                                              teachersForSubject.includes(t.id)
                                          );
                                          setFilteredTeachers(filtered);
                                        }
                                      }}
                                      className="text-primary hover:bg-primary/10"
                                      title="Chỉnh sửa"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDelete(item.id)}
                                      className="text-destructive hover:bg-destructive/10"
                                      title="Xóa tạm thời"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {editingItem === item.id && (
                            <TableRow>
                              <TableCell
                                colSpan={
                                  (currentConfig?.displayFields?.length || 0) +
                                  1
                                }
                                className="bg-muted/30"
                              >
                                <div className="mb-4">
                                  <h3 className="mb-2 text-lg font-semibold">
                                    Chỉnh sửa thông tin
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    Cập nhật thông tin cho bản ghi này
                                  </p>
                                </div>
                                {renderForm(true, item)}
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Import từ Users Modal */}
          <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Import giáo viên từ Users</DialogTitle>
                <DialogDescription>
                  Chọn những user có role teacher hoặc homeroom_teacher để tạo
                  thành giáo viên
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-[60vh] overflow-y-auto">
                {availableUsers.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="font-medium text-gray-500">
                      Không có user nào có thể import
                    </p>
                    <p className="mt-2 text-sm text-gray-400">
                      Tất cả users có role teacher/homeroom_teacher đã được tạo
                      thành giáo viên
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Select All */}
                    <div className="p-3 mb-4 border border-blue-200 rounded-lg bg-blue-50">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            selectedUserIds.length === availableUsers.length &&
                            availableUsers.length > 0
                          }
                          onChange={handleSelectAllUsers}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <span className="ml-3 font-medium text-blue-800">
                          Chọn tất cả ({availableUsers.length} users)
                        </span>
                      </label>
                    </div>

                    {/* Users List */}
                    <div className="space-y-2">
                      {availableUsers.map((user) => {
                        const selectedSubjects = userSubjects[user.id] || [];

                        return (
                          <div
                            key={user.id}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              selectedUserIds.includes(user.id)
                                ? "border-green-500 bg-green-50"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1">
                                <input
                                  type="checkbox"
                                  checked={selectedUserIds.includes(user.id)}
                                  onChange={() => handleUserSelect(user.id)}
                                  className="mt-1 w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <h4 className="font-medium text-gray-900">
                                      {user.full_name}
                                    </h4>
                                    <span
                                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                                        user.role === "teacher"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-purple-100 text-purple-800"
                                      }`}
                                    >
                                      {user.role === "teacher"
                                        ? "Teacher"
                                        : "Homeroom Teacher"}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    {user.email}
                                  </p>
                                  {user.username && (
                                    <p className="text-xs text-gray-500">
                                      @{user.username}
                                    </p>
                                  )}

                                  {/* Subject selection */}
                                  <div className="mt-3">
                                    <label className="block mb-2 text-xs font-semibold text-gray-700">
                                      Chọn môn học (tùy chọn):
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                      {subjects.map((subject) => {
                                        const isSelected =
                                          selectedSubjects.includes(subject.id);
                                        return (
                                          <button
                                            key={subject.id}
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleUserSubjectToggle(
                                                user.id,
                                                subject.id
                                              );
                                            }}
                                            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                              isSelected
                                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                            }`}
                                          >
                                            {subject.subject_code}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    {selectedSubjects.length > 0 && (
                                      <p className="mt-2 text-xs text-green-600">
                                        ✓ Đã chọn {selectedSubjects.length} môn
                                        học
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <p className="text-sm font-medium text-gray-900">
                                  ID: {user.id}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <DialogFooter className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <div>
                    Đã chọn:{" "}
                    <span className="font-semibold text-green-600">
                      {selectedUserIds.length}
                    </span>{" "}
                    users
                  </div>
                  {Object.keys(userSubjects).length > 0 && (
                    <div className="mt-1 text-xs text-blue-600">
                      📚{" "}
                      {Object.values(userSubjects).reduce(
                        (sum, subjects) => sum + subjects.length,
                        0
                      )}{" "}
                      môn học được chọn
                    </div>
                  )}
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowImportModal(false);
                      setSelectedUserIds([]);
                      setUserSubjects({}); // Reset subject selections
                    }}
                  >
                    Hủy
                  </Button>
                  <Button
                    onClick={handleImportTeachers}
                    disabled={selectedUserIds.length === 0 || importLoading}
                  >
                    {importLoading ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                        Đang tạo...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Tạo {selectedUserIds.length} giáo viên
                      </>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default AdminManagement;
