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
  Camera,
} from "lucide-react";
import api from "@/services/api";
import logger from "@/utils/logger";
import { SimpleDatePicker } from "@/components/ui/simple-date-picker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SystemSettings from "@/components/SystemSettings";
import CameraManagement from "@/components/CameraManagement";
// import SchoolDaysConfig from "./SchoolDaysConfig";

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

  // Score column config state for score_settings tab
  const [scoreColumns, setScoreColumns] = useState([]);
  const [editingColumnKey, setEditingColumnKey] = useState(null);
  const [showColumnForm, setShowColumnForm] = useState(false);
  const [columnFormData, setColumnFormData] = useState({
    key: "",
    label: "",
    he_so: 1,
    hasSubColumns: false,
    subColumns: [],
  });

  // Filters for class_subjects tab
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [filteredClasses, setFilteredClasses] = useState([]);

  // Helper: fetch score settings by subject and populate editor
  const fetchSubjectScoreSettings = useCallback(async (subjectId) => {
    try {
      const res = await api.getScoreConfigBySubject(subjectId);
      if (res && res.success && res.data && res.data.score_column_config) {
        const sc = res.data.score_column_config;
        const columnsArray = Object.entries(sc).map(([key, value]) => ({
          key,
          label: value.label,
          he_so: value.he_so,
          data: value.data || null,
        }));
        setScoreColumns(columnsArray);
        setFormData((prev) => ({ ...prev, score_column_config: sc }));
      }
    } catch (e) {
      // Silent fallback; will rely on joined data if available
    }
  }, []);

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
      fields: ["subject_code", "subject_name", "description", "is_mandatory"],
      displayFields: [
        "id",
        "subject_code",
        "subject_name",
        "description",
        "is_mandatory",
        "score_column_config",
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
      fields: ["teacher_id", "subject_id"], // Giữ nguyên: giáo viên trước, môn học sau
      displayFields: ["id", "teacher_name", "subject_name", "is_active"],
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
    score_settings: {
      title: "Cấu hình cột điểm",
      fields: ["subject_id", "score_column_config"],
      displayFields: ["id", "subject_name", "score_column_config", "is_active"],
      endpoint: "/score-settings",
    },
  };

  const tabs = [
    { id: "users", label: "Người dùng", icon: User },
    { id: "teachers", label: "Giáo viên", icon: GraduationCap },
    { id: "subjects", label: "Môn học", icon: BookOpen },
    { id: "classes", label: "Lớp học", icon: School },
    // { id: "subject_teachers", label: "GV-Môn học", icon: UserCheck }, // Đã tích hợp vào tab Giáo viên
    { id: "class_subjects", label: "Phân công giảng dạy", icon: Building },
    // Đã tích hợp Cấu hình cột điểm vào tab Môn học
    { id: "cameras", label: "Quản lý Camera", icon: Camera },
    { id: "system_settings", label: "Cấu hình thời gian", icon: Settings },
    // { id: "school_config", label: "Cấu hình học tập", icon: School },
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

        // Nếu là tab Môn học, chuẩn hóa dữ liệu grade settings đã join
        if (activeTab === "subjects") {
          items = items.map((s) => ({
            ...s,
            score_column_config: s.score_column_config || null,
          }));
        }

        // Transform data cho score_settings để lấy subject_name từ nested object
        if (activeTab === "score_settings") {
          items = items.map((item) => ({
            ...item,
            subject_name: item.subjects?.subject_name || "-",
            subject_code: item.subjects?.subject_code || "-",
          }));
        }

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

  // Load academic years when entering class_subjects tab
  useEffect(() => {
    if (activeTab === "class_subjects") {
      (async () => {
        try {
          const [yearsRes, defaultYearRes] = await Promise.all([
            api.request("/admin/classes/academic-years"),
            api.request("/admin/classes/default-academic-year"),
          ]);

          if (yearsRes.success) {
            const years = yearsRes.data || [];
            setAcademicYears(years);

            // Set default academic year
            let toSelect = "";
            if (defaultYearRes.success && years.includes(defaultYearRes.data)) {
              toSelect = defaultYearRes.data;
            } else if (years.length > 0) {
              toSelect = years[years.length - 1]; // Chọn năm cuối cùng (năm mới nhất)
            }
            setSelectedAcademicYear(toSelect);
          }
        } catch (e) {
          logger.error("Error loading academic years:", e);
        }
      })();
    } else {
      // Reset filters when leaving class_subjects tab
      setSelectedAcademicYear("");
      setSelectedGrade("");
      setSelectedClassId("");
      setFilteredClasses([]);
    }
  }, [activeTab]);

  // Filter classes when academic year or grade changes
  useEffect(() => {
    if (activeTab === "class_subjects") {
      let filtered = [...classes];

      // Filter by academic year
      if (selectedAcademicYear) {
        filtered = filtered.filter(
          (cls) => cls.academic_year === selectedAcademicYear
        );
      }

      // Filter by grade
      if (selectedGrade) {
        filtered = filtered.filter(
          (cls) => cls.grade.toString() === selectedGrade
        );
      }

      setFilteredClasses(filtered);
    }
  }, [activeTab, classes, selectedAcademicYear, selectedGrade]);

  // Handle initialize all subjects for a class
  const handleInitializeClassSubjects = async () => {
    if (!selectedClassId || !selectedAcademicYear) {
      alert("Vui lòng chọn lớp và năm học!");
      return;
    }

    if (
      !window.confirm(
        `Bạn có chắc chắn muốn khởi tạo tất cả môn học cho lớp này?\n\nHệ thống sẽ tạo phân công giảng dạy cho tất cả ${subjects.length} môn học hiện có.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      // Get current semester (default to HK1)
      const currentSemester = "HK1";

      // Prepare bulk insert data
      const classSubjectsToCreate = subjects
        .filter((subject) => subject.is_active !== false) // Only active subjects
        .map((subject) => ({
          class_id: parseInt(selectedClassId),
          subject_id: subject.id,
          teacher_id: null, // Admin will assign later
          academic_year: selectedAcademicYear,
          semester: currentSemester,
        }));

      if (classSubjectsToCreate.length === 0) {
        alert("Không có môn học nào để khởi tạo!");
        return;
      }

      // Send requests sequentially to avoid overwhelming the server
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const classSubject of classSubjectsToCreate) {
        try {
          const response = await api.request("/admin/class-subjects", {
            method: "POST",
            body: JSON.stringify(classSubject),
          });

          if (response.success) {
            successCount++;
          } else {
            errorCount++;
            errors.push(`${classSubject.subject_id}: ${response.message}`);
          }
        } catch (err) {
          errorCount++;
          errors.push(`${classSubject.subject_id}: ${err.message}`);
        }
      }

      // Show result
      let message = `✅ Khởi tạo thành công ${successCount}/${classSubjectsToCreate.length} môn học!`;

      if (errorCount > 0) {
        message += `\n\n⚠️ Có ${errorCount} môn học bị lỗi hoặc đã tồn tại.`;
        if (errors.length > 0 && errors.length <= 5) {
          message += `\n\nChi tiết lỗi:\n${errors.join("\n")}`;
        }
      }

      alert(message);

      // Reload data
      await loadData();
    } catch (error) {
      logger.error("Error initializing class subjects:", error);
      alert("❌ Lỗi khi khởi tạo môn học: " + error.message);
    } finally {
      setLoading(false);
    }
  };

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
          const subjectTeacherPromises = selectedSubjects.map((subjectId) =>
            api.request("/admin/subject-teachers", {
              method: "POST",
              body: JSON.stringify({
                teacher_id: newTeacherId,
                subject_id: subjectId,
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
        // Sanitize payload cho tab Môn học: chỉ gửi các field hợp lệ, tránh gửi 'id'
        const payload =
          activeTab === "subjects"
            ? {
                subject_code: data.subject_code,
                subject_name: data.subject_name,
                description: data.description ?? null,
                is_mandatory: data.is_mandatory ?? false,
                is_active: true,
              }
            : data;
        const response = await api.request(currentConfig.endpoint, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (response.success) {
          // Nếu là tạo mới môn học và có cấu hình cột điểm → tạo/ cập nhật score_settings
          if (activeTab === "subjects" && data.score_column_config) {
            try {
              const subjectId = response.data?.id;
              if (subjectId) {
                // Kiểm tra đã có settings chưa
                let existing = null;
                try {
                  const getRes = await api.getScoreConfigBySubject(subjectId);
                  if (getRes.success) existing = getRes.data;
                } catch (e) {
                  existing = null;
                }

                if (existing && existing.id) {
                  await api.updateGradeSettings(existing.id, {
                    score_column_config: data.score_column_config,
                    is_active: true,
                  });
                } else {
                  await api.createGradeSettings({
                    subject_id: subjectId,
                    score_column_config: data.score_column_config,
                    is_active: true,
                  });
                }
              }
            } catch (e) {
              console.error("Sync grade settings failed:", e);
            }
          }
          setShowAddForm(false);
          setFormData({});
          loadData();
          alert("Tạo thành công!");
        } else {
          const errorMsg = response.message || "Không thể tạo bản ghi";
          setError(errorMsg);
          alert("❌ " + errorMsg);
        }
      }
    } catch (err) {
      const errorMsg = "Lỗi khi tạo: " + err.message;
      setError(errorMsg);
      alert("❌ " + errorMsg);
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

        // Thêm môn học mới
        if (subjectsToAdd.length > 0) {
          const addPromises = subjectsToAdd.map((subjectId) =>
            api.request("/admin/subject-teachers", {
              method: "POST",
              body: JSON.stringify({
                teacher_id: id,
                subject_id: subjectId,
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
        // Sanitize payload update cho Môn học
        const updatePayload =
          activeTab === "subjects"
            ? {
                subject_code: data.subject_code,
                subject_name: data.subject_name,
                description: data.description ?? null,
                is_mandatory: data.is_mandatory ?? false,
                is_active: data.is_active ?? true,
              }
            : data;
        const response = await api.request(`${currentConfig.endpoint}/${id}`, {
          method: "PUT",
          body: JSON.stringify(updatePayload),
        });

        if (response.success) {
          if (activeTab === "subjects" && data.score_column_config) {
            try {
              let existing = null;
              try {
                const getRes = await api.getScoreConfigBySubject(id);
                if (getRes.success) existing = getRes.data;
              } catch (e) {
                existing = null;
              }
              if (existing && existing.id) {
                await api.updateScoreSettings(id, {
                  score_column_config: data.score_column_config,
                  is_active: true,
                });
              } else {
                await api.createScoreSettings({
                  subject_id: id,
                  score_column_config: data.score_column_config,
                  is_active: true,
                });
              }
            } catch (e) {
              console.error("Sync grade settings failed:", e);
            }
          }
          setEditingItem(null);
          setFormData({});
          loadData();
          alert("Cập nhật thành công!");
        } else {
          const errorMsg = response.message || "Không thể cập nhật";
          setError(errorMsg);
          alert("❌ " + errorMsg);
        }
      }
    } catch (err) {
      const errorMsg = "Lỗi khi cập nhật: " + err.message;
      setError(errorMsg);
      alert("❌ " + errorMsg);
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
    const matchesSearch = Object.values(item).some((value) =>
      String(value).toLowerCase().includes(searchLower)
    );

    // Apply filters for class_subjects tab
    if (activeTab === "class_subjects") {
      let matchesFilters = true;

      // Filter by academic year
      if (selectedAcademicYear && item.academic_year !== selectedAcademicYear) {
        matchesFilters = false;
      }

      // Filter by grade (check class's grade)
      if (selectedGrade) {
        const classData = classes.find((c) => c.id === item.class_id);
        if (!classData || classData.grade.toString() !== selectedGrade) {
          matchesFilters = false;
        }
      }

      // Filter by class
      if (selectedClassId && item.class_id.toString() !== selectedClassId) {
        matchesFilters = false;
      }

      return matchesSearch && matchesFilters;
    }

    return matchesSearch;
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
        {currentConfig?.fields
          ?.filter((field) => {
            // Skip score_column_config vì nó có Visual Editor riêng
            if (
              activeTab === "score_settings" &&
              field === "score_column_config"
            ) {
              return false;
            }
            return true;
          })
          .map((field) => (
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
                  : field === "is_mandatory"
                  ? "Môn bắt buộc"
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
                <Select
                  value={formData[field] || item?.[field] || ""}
                  onValueChange={(value) => handleChange(field, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Giáo viên</SelectItem>
                    <SelectItem value="homeroom_teacher">
                      Giáo viên chủ nhiệm
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : field === "teacher_id" ? (
                <Select
                  value={(formData[field] || item?.[field] || "")?.toString()}
                  onValueChange={(value) =>
                    handleChange(field, value ? parseInt(value) : null)
                  }
                  disabled={
                    activeTab === "class_subjects" && !formData.subject_id
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        activeTab === "class_subjects" && !formData.subject_id
                          ? "Vui lòng chọn môn học trước"
                          : "Chọn giáo viên"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(activeTab === "class_subjects"
                      ? filteredTeachers
                      : teachers
                    ).map((teacher) => (
                      <SelectItem
                        key={teacher.id}
                        value={teacher.id.toString()}
                      >
                        {teacher.teacher_code} - {teacher.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field === "subject_id" ? (
                <>
                  <Select
                    value={(formData[field] || item?.[field] || "")?.toString()}
                    onValueChange={(value) =>
                      handleChange(field, value ? parseInt(value) : null)
                    }
                    disabled={activeTab === "score_settings" && isEdit}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn môn học" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem
                          key={subject.id}
                          value={subject.id.toString()}
                        >
                          {subject.subject_code} - {subject.subject_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activeTab === "score_settings" && isEdit && (
                    <p className="mt-1 text-xs text-amber-600">
                      ⚠️ Môn học không thể thay đổi sau khi tạo
                    </p>
                  )}
                </>
              ) : field === "class_id" ? (
                <Select
                  value={(formData[field] || item?.[field] || "")?.toString()}
                  onValueChange={(value) =>
                    handleChange(field, parseInt(value))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn lớp" />
                  </SelectTrigger>
                  <SelectContent>
                    {(activeTab === "class_subjects"
                      ? filteredClasses
                      : classes
                    ).map((cls) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.class_name} - {cls.grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field === "homeroom_teacher_id" ? (
                <Select
                  value={(formData[field] || item?.[field] || "")?.toString()}
                  onValueChange={(value) =>
                    handleChange(field, value ? parseInt(value) : null)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn GVCN (tùy chọn)" />
                  </SelectTrigger>
                  <SelectContent>
                    {homeroomTeachers.map((teacher) => (
                      <SelectItem
                        key={teacher.id}
                        value={teacher.id.toString()}
                      >
                        {teacher.teacher_code} - {teacher.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Select
                  value={(formData[field] || item?.[field] || "")?.toString()}
                  onValueChange={(value) =>
                    handleChange(field, value ? parseInt(value) : null)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn người dùng (tùy chọn)" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.email} - {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field === "semester" ? (
                <Select
                  value={formData[field] || item?.[field] || ""}
                  onValueChange={(value) => handleChange(field, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn học kỳ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HK1">Học kỳ 1</SelectItem>
                    <SelectItem value="HK2">Học kỳ 2</SelectItem>
                    <SelectItem value="HK3">Học kỳ 3</SelectItem>
                  </SelectContent>
                </Select>
              ) : field === "grade" ? (
                <Select
                  value={formData[field] || item?.[field] || ""}
                  onValueChange={(value) => handleChange(field, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn khối" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">Khối 10</SelectItem>
                    <SelectItem value="11">Khối 11</SelectItem>
                    <SelectItem value="12">Khối 12</SelectItem>
                  </SelectContent>
                </Select>
              ) : field.includes("description") ? (
                <textarea
                  value={formData[field] || item?.[field] || ""}
                  onChange={(e) => handleChange(field, e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  rows="3"
                />
              ) : field === "is_mandatory" ? (
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData[field] || item?.[field] || false}
                    onChange={(e) => handleChange(field, e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Môn học bắt buộc (hiển thị trong môn chính)
                  </span>
                </label>
              ) : field === "password" && isEdit ? (
                // Bỏ trường password khi edit
                <div className="flex items-center w-full h-10 px-3 py-2 text-sm border rounded-md border-input bg-muted text-muted-foreground">
                  Mật khẩu không thể thay đổi ở đây. Người dùng có thể tự đổi
                  mật khẩu trong phần cài đặt.
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

        {/* Score Column Config Editor for score_settings tab */}
        {(activeTab === "score_settings" || activeTab === "subjects") && (
          <div className="p-6 mt-6 space-y-4 border rounded-lg border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Cấu hình cột điểm
                </h3>
                <p className="text-sm text-muted-foreground">
                  Thiết lập các cột điểm và hệ số cho môn học
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setShowColumnForm(true);
                  setEditingColumnKey(null);
                  setColumnFormData({
                    key: "",
                    label: "",
                    he_so: 1,
                    hasSubColumns: false,
                    subColumns: [],
                  });
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Thêm cột điểm
              </Button>
            </div>

            {/* Column Form */}
            {showColumnForm && (
              <div className="p-4 space-y-4 border rounded-lg bg-background">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">
                    {editingColumnKey
                      ? "Chỉnh sửa cột điểm"
                      : "Thêm cột điểm mới"}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowColumnForm(false);
                      setEditingColumnKey(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium">
                      Key (tên trường) *
                    </label>
                    <Input
                      value={columnFormData.key}
                      onChange={(e) =>
                        setColumnFormData({
                          ...columnFormData,
                          key: e.target.value,
                        })
                      }
                      placeholder="VD: Diem_thuong_xuyen"
                      disabled={!!editingColumnKey}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Không dấu, viết liền, dùng _
                    </p>
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium">
                      Label (hiển thị) *
                    </label>
                    <Input
                      value={columnFormData.label}
                      onChange={(e) =>
                        setColumnFormData({
                          ...columnFormData,
                          label: e.target.value,
                        })
                      }
                      placeholder="VD: Điểm thường xuyên"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium">
                      Hệ số *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={columnFormData.he_so}
                      onChange={(e) =>
                        setColumnFormData({
                          ...columnFormData,
                          he_so: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Sub-columns toggle */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="hasSubColumns"
                    checked={columnFormData.hasSubColumns}
                    onChange={(e) => {
                      setColumnFormData({
                        ...columnFormData,
                        hasSubColumns: e.target.checked,
                        subColumns: e.target.checked
                          ? columnFormData.subColumns
                          : [],
                      });
                    }}
                    className="w-4 h-4 border-gray-300 rounded text-primary focus:ring-primary"
                  />
                  <label
                    htmlFor="hasSubColumns"
                    className="text-sm font-medium"
                  >
                    Có cột con (nested columns)
                  </label>
                </div>

                {/* Sub-columns editor */}
                {columnFormData.hasSubColumns && (
                  <div className="p-4 space-y-3 border rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Các cột con</label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setColumnFormData({
                            ...columnFormData,
                            subColumns: [
                              ...columnFormData.subColumns,
                              { key: "", label: "", he_so: 1 },
                            ],
                          });
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Thêm cột con
                      </Button>
                    </div>

                    {columnFormData.subColumns.map((subCol, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-background"
                      >
                        <div>
                          <Input
                            value={subCol.key}
                            onChange={(e) => {
                              const newSubCols = [...columnFormData.subColumns];
                              newSubCols[idx].key = e.target.value;
                              setColumnFormData({
                                ...columnFormData,
                                subColumns: newSubCols,
                              });
                            }}
                            placeholder="Key"
                          />
                        </div>
                        <div>
                          <Input
                            value={subCol.label}
                            onChange={(e) => {
                              const newSubCols = [...columnFormData.subColumns];
                              newSubCols[idx].label = e.target.value;
                              setColumnFormData({
                                ...columnFormData,
                                subColumns: newSubCols,
                              });
                            }}
                            placeholder="Label"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={subCol.he_so}
                            onChange={(e) => {
                              const newSubCols = [...columnFormData.subColumns];
                              newSubCols[idx].he_so =
                                parseInt(e.target.value) || 1;
                              setColumnFormData({
                                ...columnFormData,
                                subColumns: newSubCols,
                              });
                            }}
                            placeholder="Hệ số"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const newSubCols =
                                columnFormData.subColumns.filter(
                                  (_, i) => i !== idx
                                );
                              setColumnFormData({
                                ...columnFormData,
                                subColumns: newSubCols,
                              });
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowColumnForm(false);
                      setEditingColumnKey(null);
                    }}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!columnFormData.key || !columnFormData.label) {
                        alert("Vui lòng nhập đầy đủ Key và Label");
                        return;
                      }

                      const newColumn = {
                        key: columnFormData.key,
                        label: columnFormData.label,
                        he_so: columnFormData.he_so,
                      };

                      if (
                        columnFormData.hasSubColumns &&
                        columnFormData.subColumns.length > 0
                      ) {
                        newColumn.data = {};
                        columnFormData.subColumns.forEach((sub) => {
                          if (sub.key && sub.label) {
                            newColumn.data[sub.key] = {
                              label: sub.label,
                              he_so: sub.he_so,
                            };
                          }
                        });
                      }

                      let updatedColumns;
                      if (editingColumnKey) {
                        // Update existing column
                        updatedColumns = scoreColumns.map((col) =>
                          col.key === editingColumnKey ? newColumn : col
                        );
                      } else {
                        // Add new column
                        updatedColumns = [...scoreColumns, newColumn];
                      }

                      setScoreColumns(updatedColumns);

                      // Convert to score_column_config format
                      const configObj = {};
                      updatedColumns.forEach((col) => {
                        configObj[col.key] = {
                          label: col.label,
                          he_so: col.he_so,
                        };
                        if (col.data) {
                          configObj[col.key].data = col.data;
                        }
                      });

                      setFormData({
                        ...formData,
                        score_column_config: configObj,
                      });

                      setShowColumnForm(false);
                      setEditingColumnKey(null);
                    }}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingColumnKey ? "Cập nhật" : "Thêm"}
                  </Button>
                </div>
              </div>
            )}

            {/* Display existing columns */}
            {scoreColumns.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Các cột điểm hiện tại:
                </label>
                <div className="space-y-2">
                  {scoreColumns.map((column, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border rounded-lg bg-background"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="bg-blue-50">
                            {column.key}
                          </Badge>
                          <span className="font-medium">{column.label}</span>
                          <Badge variant="secondary">
                            Hệ số: {column.he_so}
                          </Badge>
                        </div>
                        {column.data && Object.keys(column.data).length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2 ml-4">
                            {Object.entries(column.data).map(
                              ([subKey, subVal]) => (
                                <Badge
                                  key={subKey}
                                  variant="outline"
                                  className="bg-green-50"
                                >
                                  {subKey}: {subVal.label} (HS: {subVal.he_so})
                                </Badge>
                              )
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingColumnKey(column.key);
                            setColumnFormData({
                              key: column.key,
                              label: column.label,
                              he_so: column.he_so,
                              hasSubColumns: !!column.data,
                              subColumns: column.data
                                ? Object.entries(column.data).map(
                                    ([key, val]) => ({
                                      key,
                                      label: val.label,
                                      he_so: val.he_so,
                                    })
                                  )
                                : [],
                            });
                            setShowColumnForm(true);
                          }}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            const updatedColumns = scoreColumns.filter(
                              (_, i) => i !== idx
                            );
                            setScoreColumns(updatedColumns);

                            // Update formData
                            const configObj = {};
                            updatedColumns.forEach((col) => {
                              configObj[col.key] = {
                                label: col.label,
                                he_so: col.he_so,
                              };
                              if (col.data) {
                                configObj[col.key].data = col.data;
                              }
                            });

                            setFormData({
                              ...formData,
                              score_column_config: configObj,
                            });
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scoreColumns.length === 0 && !showColumnForm && (
              <div className="py-8 text-center text-gray-500 rounded-lg bg-gray-50">
                <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>Chưa có cột điểm nào. Nhấn "Thêm cột điểm" để bắt đầu.</p>
              </div>
            )}
          </div>
        )}

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
              // Reset score columns
              if (activeTab === "score_settings") {
                setScoreColumns([]);
                setShowColumnForm(false);
                setEditingColumnKey(null);
              }
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
              Quản lý hệ thống
            </CardTitle>
            <CardDescription className="text-lg">
              Quản lý người dùng, lớp học, môn học và cấu hình hệ thống
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Enhanced Tabs */}
      <div className="mb-6">
        <div className="relative bg-white rounded-lg shadow-sm border border-gray-200 p-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm 
                    transition-all duration-200 whitespace-nowrap flex-shrink-0
                    ${isActive 
                      ? "bg-blue-600 text-white shadow-sm" 
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }
                  `}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conditional Content - System Settings, Camera Management hoặc Table-based Content */}
      {activeTab === "system_settings" ? (
        <SystemSettings />
      ) : activeTab === "cameras" ? (
        <CameraManagement />
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
                  {activeTab === "class_subjects" && selectedClassId && (
                    <Button
                      onClick={handleInitializeClassSubjects}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Shuffle className="w-5 h-5 mr-2" />
                      Khởi tạo môn học
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setShowAddForm(true);
                      // Khởi tạo formData với giá trị mặc định cho teachers
                      if (activeTab === "teachers") {
                        setFormData({ gender: "Nam" });
                      } else if (activeTab === "score_settings") {
                        setFormData({});
                        setScoreColumns([]);
                      } else if (activeTab === "subjects") {
                        setFormData({});
                        setScoreColumns([]);
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

                {/* Filters for class_subjects tab */}
                {activeTab === "class_subjects" && (
                  <div className="flex items-center gap-3">
                    {/* Academic Year Filter */}
                    <Select
                      value={selectedAcademicYear || "none"}
                      onValueChange={(value) =>
                        setSelectedAcademicYear(value === "none" ? "" : value)
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Năm học" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Năm học</SelectItem>
                        {academicYears.map((y) => (
                          <SelectItem key={y} value={y}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Grade Filter */}
                    <Select
                      value={selectedGrade || "none"}
                      onValueChange={(value) =>
                        setSelectedGrade(value === "none" ? "" : value)
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Khối" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Khối</SelectItem>
                        <SelectItem value="10">Khối 10</SelectItem>
                        <SelectItem value="11">Khối 11</SelectItem>
                        <SelectItem value="12">Khối 12</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Class Filter */}
                    <Select
                      value={selectedClassId || "none"}
                      onValueChange={(value) =>
                        setSelectedClassId(value === "none" ? "" : value)
                      }
                      disabled={!selectedAcademicYear && !selectedGrade}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Lớp học" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Lớp học</SelectItem>
                        {filteredClasses.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id.toString()}>
                            {cls.class_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Checkbox hiển thị đã xóa - chỉ hiện cho Users, Teachers, Subjects, và Grade Settings */}
                {(activeTab === "users" ||
                  activeTab === "teachers" ||
                  activeTab === "subjects" ||
                  activeTab === "classes" ||
                  activeTab === "subject_teachers" ||
                  activeTab === "class_subjects" ||
                  activeTab === "score_settings") && (
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
                              : field === "is_mandatory"
                              ? "BẮT BUỘC"
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
                              : field === "score_column_config"
                              ? "CẤU HÌNH CỘT ĐIỂM"
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
                                ) : field === "is_mandatory" ? (
                                  item[field] ? (
                                    <Badge
                                      variant="outline"
                                      className="inline-flex items-center justify-center px-3 py-1 text-xs text-purple-800 bg-purple-100 border-purple-200 whitespace-nowrap"
                                    >
                                      Môn chính
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="inline-flex items-center justify-center px-3 py-1 text-xs text-gray-800 bg-gray-100 border-gray-200 whitespace-nowrap"
                                    >
                                      Môn tự chọn
                                    </Badge>
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
                                ) : field === "score_column_config" ? (
                                  // Hiển thị score_column_config với badges
                                  <div className="max-w-md">
                                    {item[field] &&
                                    typeof item[field] === "object" ? (
                                      <div className="flex flex-wrap gap-1">
                                        {Object.entries(item[field]).map(
                                          ([key, value]) => (
                                            <div
                                              key={key}
                                              className="flex items-center gap-1"
                                            >
                                              <Badge
                                                variant="outline"
                                                className="text-xs text-purple-700 border-purple-200 bg-purple-50"
                                              >
                                                {value.label} (HS: {value.he_so}
                                                )
                                              </Badge>
                                              {value.data && (
                                                <span className="text-xs text-gray-500">
                                                  [
                                                  {
                                                    Object.keys(value.data)
                                                      .length
                                                  }{" "}
                                                  cột con]
                                                </span>
                                              )}
                                            </div>
                                          )
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-xs italic text-gray-400">
                                        Chưa cấu hình
                                      </span>
                                    )}
                                  </div>
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
                                        } else if (
                                          activeTab === "score_settings"
                                        ) {
                                          // Load score_column_config khi edit score settings
                                          setFormData(item);
                                          if (item.score_column_config) {
                                            const columnsArray = Object.entries(
                                              item.score_column_config
                                            ).map(([key, value]) => ({
                                              key,
                                              label: value.label,
                                              he_so: value.he_so,
                                              data: value.data || null,
                                            }));
                                            setScoreColumns(columnsArray);
                                          } else {
                                            setScoreColumns([]);
                                          }
                                        } else if (activeTab === "subjects") {
                                          setFormData(item);
                                          // Luôn fetch từ backend để đảm bảo dữ liệu mới nhất
                                          fetchSubjectScoreSettings(item.id);
                                          if (item.score_column_config) {
                                            const sc = item.score_column_config;
                                            const columnsArray = Object.entries(
                                              sc
                                            ).map(([key, value]) => ({
                                              key,
                                              label: value.label,
                                              he_so: value.he_so,
                                              data: value.data || null,
                                            }));
                                            setScoreColumns(columnsArray);
                                          } else {
                                            setScoreColumns([]);
                                          }
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
                              <div className="flex items-start flex-1 space-x-3">
                                <input
                                  type="checkbox"
                                  checked={selectedUserIds.includes(user.id)}
                                  onChange={() => handleUserSelect(user.id)}
                                  className="w-4 h-4 mt-1 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
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
                              <div className="ml-4 text-right">
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
