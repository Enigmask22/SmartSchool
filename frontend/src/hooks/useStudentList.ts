import { useState, useEffect, useRef, useContext, useCallback } from "react";
import ApiService from "@/utils/api";
import { AuthContext } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import ExcelJS from "exceljs";
import logger from "@/utils/logger";
import { toast } from "sonner";

// API Configuration
const API_BASE_URL =
  import.meta.env.VITE_APP_API_URL || "http://localhost:8000/api";

export const useStudentList = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const isHomeroomTeacher = authContext?.isHomeroomTeacher;
  const { academicYear, semester } = useSystemSettings();

  // Basic student data states
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [confirmState, setConfirmState] = useState<Record<string, any>>({ open: false });

  // Academic year and semester states
  const [homeroomClasses, setHomeroomClasses] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("HK1");
  const [availableSemesters] = useState(["HK1", "HK2", "CN"]);
  const classesReqIdRef = useRef(0);

  // Face registration states
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [selectedStudentForFace, setSelectedStudentForFace] = useState<any>(null);
  const [faceRegistrationLoading, setFaceRegistrationLoading] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [registrationMode, setRegistrationMode] = useState("camera");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Multiple face registration states
  const [multipleFiles, setMultipleFiles] = useState<Array<{ file: File; id: number; name: string; previewUrl: string; status: string }>>([]);
  const [multipleResults, setMultipleResults] = useState<any[]>([]);
  const [showMultipleModal, setShowMultipleModal] = useState(false);
  const [selectedStudentForMultiple, setSelectedStudentForMultiple] =
    useState<any>(null);

  // Edit student states
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<any>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Filter and view states
  const [showInactive, setShowInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [viewMode, setViewMode] = useState("grid");

  // Subject import states
  const [showSubjectImportModal, setShowSubjectImportModal] = useState(false);
  const [subjectImportFile, setSubjectImportFile] = useState<File | null>(null);
  const [subjectImportLoading, setSubjectImportLoading] = useState(false);

  // View scores states
  const [showScoresModal, setShowScoresModal] = useState(false);
  const [selectedStudentForScores, setSelectedStudentForScores] =
    useState<any>(null);
  const [studentScores, setStudentScores] = useState<any[]>([]);
  const [scoresLoading, setScoresLoading] = useState(false);

  // Feedback states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedStudentForFeedback, setSelectedStudentForFeedback] =
    useState<any>(null);
  const [feedbackForm, setFeedbackForm] = useState<Record<string, any>>({
    student_name: "",
    score: "",
    top_subjects: [],
    weak_subjects: [],
    attendance_rate: "100",
    subject: "",
    notes: "",
  });
  const [generatedFeedback, setGeneratedFeedback] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);

  // Score trend analysis states
  const [_scoreTrendData, set_scoreTrendData] = useState<any>(null);
  const [_trendError, set_trendError] = useState("");
  const [hasScoreData, setHasScoreData] = useState(false);

  // Subject selection states
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [selectedStudentForSubject, setSelectedStudentForSubject] =
    useState<any>(null);
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Record<string, any[]>>({
    core_subjects: [],
    elective_subjects: [],
  });
  const [subjectLoading, setSubjectLoading] = useState(false);

  // Email report card states
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailSending, _setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multipleFileInputRef = useRef<HTMLInputElement>(null);

  // Helper function for confirm dialog
  const openConfirm = useCallback((config) =>
    setConfirmState({ open: true, variant: "destructive", confirmText: "Xác nhận", ...config }), []);

  const closeConfirm = useCallback(() =>
    setConfirmState((prev) => ({ ...prev, open: false })), []);

  // Cleanup camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Handle video loaded event
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVideoReady = () => {
      setCameraReady(true);
      setCameraError(null);
    };

    const handleVideoError = () => {
      setCameraReady(false);
      setCameraError("Camera không thể khởi động");
    };

    video.addEventListener("loadedmetadata", handleVideoReady);
    video.addEventListener("error", handleVideoError);

    return () => {
      video.removeEventListener("loadedmetadata", handleVideoReady);
      video.removeEventListener("error", handleVideoError);
    };
  }, [showFaceModal, registrationMode]);

  // Initial load via bootstrap
  useEffect(() => {
    const loadBootstrap = async () => {
      try {
        setLoading(true);
        const resp = await ApiService.request(
          `/homeroom/bootstrap${
            selectedAcademicYear
              ? `?academic_year=${encodeURIComponent(selectedAcademicYear)}`
              : ""
          }`,
        );
        if (resp.success && resp.data) {
          const { academic_years, year, classes, selected_class, students } =
            resp.data;
          setAcademicYears(academic_years || []);
          if (!selectedAcademicYear && year) setSelectedAcademicYear(year);
          const classNames = (classes || [])
            .map((c) => c.class_name)
            .filter(Boolean)
            .sort();
          setHomeroomClasses(classes || []);
          setAvailableClasses(classNames);
          if (selected_class?.class_name)
            setSelectedClass(selected_class.class_name);
          setStudents(Array.isArray(students) ? students : []);
        }
      } catch (e) {
        logger.error("Bootstrap load error", e);
      } finally {
        setLoading(false);
      }
    };
    loadBootstrap();
  }, []);

  // When academic year changes
  useEffect(() => {
    if (!isHomeroomTeacher) return;
    const run = async () => {
      try {
        setClassesLoading(true);
        const resp = await ApiService.request(
          `/homeroom/bootstrap${
            selectedAcademicYear
              ? `?academic_year=${encodeURIComponent(selectedAcademicYear)}`
              : ""
          }`,
        );
        if (resp.success && resp.data) {
          const { classes, selected_class } = resp.data;
          const classNames = (classes || [])
            .map((c) => c.class_name)
            .filter(Boolean)
            .sort();
          setHomeroomClasses(classes || []);
          setAvailableClasses(classNames);
          const exists =
            selected_class?.class_name &&
            classNames.includes(selected_class.class_name);
          setSelectedClass(
            exists ? selected_class.class_name : classNames[0] || "all",
          );
        }
      } catch (e) {
        logger.error("Bootstrap year change error", e);
      } finally {
        setClassesLoading(false);
      }
    };
    run();
  }, [selectedAcademicYear]);

  // When selected class changes
  useEffect(() => {
    fetchStudents();
  }, [selectedClass]);

  // Fetch students
  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;

      if (isHomeroomTeacher) {
        if (!selectedClass || selectedClass === "all") {
          logger.debug(
            "🚫 No class selected for homeroom teacher, skipping fetch",
          );
          setStudents([]);
          setLoading(false);
          return;
        }
        const found = homeroomClasses.find(
          (c) => c.class_name === selectedClass,
        );
        const classId = found?.id;
        response = await ApiService.request(
          classId
            ? `/homeroom/students?class_id=${classId}`
            : `/homeroom/students?class_name=${encodeURIComponent(
                selectedClass,
              )}&academic_year=${encodeURIComponent(selectedAcademicYear)}`,
        );
      } else {
        response = await ApiService.getStudents({});
      }

      logger.debug("Students API response:", response);

      if (response.success && response.data) {
        setStudents(Array.isArray(response.data) ? response.data : []);
      } else {
        logger.warn("Invalid response structure:", response);
        setStudents([]);
      }
    } catch (error) {
      logger.error("Error fetching students:", error);
      setError(
        "Không thể tải danh sách học sinh từ server. Hiển thị dữ liệu mẫu.",
      );

      // Mock data fallback
      setStudents([
        {
          id: 1,
          student_id: "250001",
          full_name: "Nguyễn Văn An",
          class_name: "10A1",
          grade: "10",
          email: "an.nguyen@student.edu.vn",
          phone: "0123456789",
          gender: "Nam",
        },
        {
          id: 2,
          student_id: "250002",
          full_name: "Trần Thị Bình",
          class_name: "10A1",
          grade: "10",
          email: "binh.tran@student.edu.vn",
          phone: "0123456790",
          gender: "Nữ",
        },
        {
          id: 3,
          student_id: "250003",
          full_name: "Lê Minh Châu",
          class_name: "10A2",
          grade: "10",
          email: "chau.le@student.edu.vn",
          phone: "0123456791",
          gender: "Nữ",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort students
  const filteredStudents = Array.isArray(students)
    ? students
        .filter((student) => {
          const matchesSearch =
            student.full_name
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            student.student_id
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase());
          const matchesClass =
            selectedClass === "all" ||
            selectedClass === "" ||
            student.class_name === selectedClass;

          let matchesActiveStatus = true;
          if (showInactive) {
            matchesActiveStatus = student.is_active === false;
          } else {
            matchesActiveStatus = student.is_active !== false;
          }

          return matchesSearch && matchesClass && matchesActiveStatus;
        })
        .sort((a, b) => {
          const aId = parseInt(a.student_id) || 0;
          const bId = parseInt(b.student_id) || 0;
          return aId - bId;
        })
    : [];

  // Calculate pagination
  const totalStudents = filteredStudents.length;
  const totalPages = Math.ceil(totalStudents / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedClass, showInactive]);

  // Fetch available classes
  const fetchAvailableClasses = async (yearOverride: string | null = null) => {
    try {
      setClassesLoading(true);
      const reqId = ++classesReqIdRef.current;
      logger.debug("👤 User role check:", {
        user,
        isHomeroomTeacher: isHomeroomTeacher,
        userRole: user?.role,
      });

      if (isHomeroomTeacher) {
        logger.debug("📚 Fetching homeroom classes...");
        const yearsResp = await ApiService.request("/homeroom/academic-years");
        if (yearsResp.success) setAcademicYears(yearsResp.data || []);
        let year = yearOverride ?? selectedAcademicYear;
        if (!year) {
          const defaultYearResp = await ApiService.request(
            "/homeroom/default-academic-year",
          );
          const defaultYear = defaultYearResp.success
            ? defaultYearResp.data
            : "";
          year = defaultYear || yearsResp.data?.[0] || "";
          setSelectedAcademicYear(year);
        }

        const classesResponse = await ApiService.request(
          `/homeroom/classes${
            year ? `?academic_year=${encodeURIComponent(year)}` : ""
          }`,
        );

        if (reqId !== classesReqIdRef.current) return;
        if (classesResponse.success && classesResponse.data) {
          const list = classesResponse.data;
          setHomeroomClasses(list);
          const classNames = list
            .map((c) => c.class_name)
            .filter(Boolean)
            .sort();
          setAvailableClasses(classNames);
          const currentInList = classNames.includes(selectedClass);
          if (!selectedClass || selectedClass === "all" || !currentInList) {
            setSelectedClass(classNames[0] || "all");
          }
        } else {
          setHomeroomClasses([]);
          setAvailableClasses([]);
        }
      } else {
        logger.debug("📚 Fetching admin classes filtered by academic year...");
        const year = yearOverride ?? selectedAcademicYear;
        const classesResp = await ApiService.getClassesAdmin(year);
        if (reqId !== classesReqIdRef.current) return;
        if (classesResp.success && Array.isArray(classesResp.data)) {
          const classNames = classesResp.data
            .map((c) => c.class_name)
            .filter(Boolean)
            .sort();
          setAvailableClasses(classNames);
        } else {
          logger.warn("📚 Invalid admin classes response:", classesResp);
          setAvailableClasses([]);
        }
      }
    } catch (error) {
      logger.error("Error fetching available classes:", error);
      const fallbackClasses = Array.isArray(students)
        ? [
            ...new Set(
              students.map((student) => student.class_name).filter(Boolean),
            ),
          ].sort()
        : [];
      logger.debug("📚 Using fallback classes:", fallbackClasses);
      setAvailableClasses(fallbackClasses);
    } finally {
      setClassesLoading(false);
    }
  };

  // Face registration functions
  const startFaceRegistration = async (student: any) => {
    setSelectedStudentForFace(student);
    setShowFaceModal(true);
    setCapturedImage(null);
    setUploadedImage(null);
    setRegistrationMode("camera");
    setCameraReady(false);
    setCameraError(null);

    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      setCameraStream(stream);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      logger.error("Error accessing camera:", error);
      setCameraError(
        "Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.",
      );
      setRegistrationMode("upload");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error("Camera chưa sẵn sàng. Vui lòng thử lại.");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState < 2) {
      toast.error("Video chưa sẵn sàng. Vui lòng đợi một chút và thử lại.");
      return;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error("Camera chưa sẵn sàng. Vui lòng thử lại.");
      return;
    }

    try {
      const context = canvas.getContext("2d");
      if (!context) {
        toast.error("Canvas context not available. Please try again.");
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.8);
      setCapturedImage(imageDataUrl);
    } catch (error) {
      logger.error("Error capturing photo:", error);
      toast.error("Có lỗi khi chụp ảnh. Vui lòng thử lại.");
    }
  };

  const resetCamera = async () => {
    setCameraReady(false);
    setCameraError(null);

    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      setCameraStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      setCameraStream(stream);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      logger.error("Error restarting camera:", error);
      setCameraError(
        "Không thể khởi động lại camera. Vui lòng kiểm tra quyền truy cập.",
      );
    }
  };

  const handleImageUpload = (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh (JPG, PNG, etc.)");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setUploadedImage({ file, previewUrl });
    setCapturedImage(null);
  };

  const submitFaceRegistration = async () => {
    if ((!capturedImage && !uploadedImage) || !selectedStudentForFace) return;

    setFaceRegistrationLoading(true);
    try {
      let response;

      if (registrationMode === "upload" && uploadedImage) {
        const formData = new FormData();
        formData.append("file", uploadedImage.file);

        response = await fetch(
          `${API_BASE_URL}/ai/register/${selectedStudentForFace.id}`,
          {
            method: "POST",
            body: formData,
          },
        );
      } else if (capturedImage) {
        const base64Image = capturedImage.split(",")[1];

        response = await fetch(
          `${API_BASE_URL}/ai/register-base64/${selectedStudentForFace.id}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              image_base64: base64Image,
              confidence_threshold: 0.6,
            }),
          },
        );
      }

      const result = await response.json();

      if (result.success) {
        toast.success(
          `Đăng ký khuôn mặt thành công cho ${selectedStudentForFace.full_name}!`,
        );
        closeFaceModal();
        fetchStudents();
      } else {
        toast.error(`Lỗi: ${result.message}`);
      }
    } catch (error) {
      logger.error("Error registering face:", error);
      toast.error("Có lỗi xảy ra khi đăng ký khuôn mặt");
    } finally {
      setFaceRegistrationLoading(false);
    }
  };

  const closeFaceModal = () => {
    setShowFaceModal(false);
    setSelectedStudentForFace(null);
    setCapturedImage(null);
    setUploadedImage(null);
    setRegistrationMode("camera");
    setCameraReady(false);
    setCameraError(null);

    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      setCameraStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (uploadedImage?.previewUrl) {
      URL.revokeObjectURL(uploadedImage.previewUrl);
    }

    multipleFiles.forEach((file) => {
      if (file.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
    });
    setMultipleFiles([]);
    setMultipleResults([]);

    if (multipleFileInputRef.current) {
      multipleFileInputRef.current.value = "";
    }
  };

  const handleMultipleFileSelect = (event: any) => {
    const files = Array.from(event.target.files);
    if (files.length > 10) {
      toast.error("Tối đa 10 ảnh mỗi lần");
      return;
    }

    const fileObjects = files.map((file, index) => ({
      file: file as File,
      id: index,
      name: (file as File).name,
      previewUrl: URL.createObjectURL(file as File),
      status: "pending",
    }));

    setMultipleFiles(fileObjects);
  };

  const removeMultipleFile = (fileId: number) => {
    setMultipleFiles((prev) => {
      const updated = prev.filter((f) => f.id !== fileId);
      const removedFile = prev.find((f) => f.id === fileId);
      if (removedFile) {
        URL.revokeObjectURL(removedFile.previewUrl);
      }
      return updated;
    });
  };

  const submitMultipleFaceRegistration = async () => {
    if (multipleFiles.length === 0 || !selectedStudentForFace) return;

    setFaceRegistrationLoading(true);
    setMultipleResults([]);

    try {
      const formData = new FormData();
      multipleFiles.forEach((fileObj) => {
        formData.append("files", fileObj.file);
      });

      const response = await fetch(
        `${API_BASE_URL}/ai/register-multiple/${selectedStudentForFace.id}`,
        {
          method: "POST",
          body: formData,
        },
      );

      const result = await response.json();

      if (result.success) {
        setMultipleResults(result.data.results || []);
        toast.success(
          `Đăng ký thành công ${result.data.successful_registrations}/${result.data.total_images} ảnh cho ${selectedStudentForFace.full_name}!`,
        );

        setMultipleFiles((prev) =>
          prev.map((file, index) => ({
            ...file,
            status: result.data.results[index]?.success ? "success" : "error",
            message: result.data.results[index]?.message || "",
          })),
        );

        fetchStudents();
      } else {
        toast.error(`Lỗi: ${result.message}`);
      }
    } catch (error) {
      logger.error("Error registering multiple faces:", error);
      toast.error("Có lỗi xảy ra khi đăng ký nhiều khuôn mặt");
    } finally {
      setFaceRegistrationLoading(false);
    }
  };

  // Edit student functions
  const handleEdit = (student: any) => {
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
  };

  const handleEditFormChange = (field: string, value: any) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addParentContactRow = () => {
    setEditForm((prev) => ({
      ...prev,
      parent_contacts: [
        ...(prev.parent_contacts || []),
        { relation: "parent", name: "", phone: "" },
      ],
    }));
  };

  const removeParentContactRow = (index: number) => {
    setEditForm((prev) => ({
      ...prev,
      parent_contacts: (prev.parent_contacts || []).filter(
        (_, i) => i !== index,
      ),
    }));
  };

  const updateParentContactField = (
    index: number,
    field: string,
    value: string,
  ) => {
    setEditForm((prev) => {
      const list = [...(prev.parent_contacts || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, parent_contacts: list };
    });
  };

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

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedStudentForEdit(null);
    setEditForm({});
  };

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

  // View scores function
  const handleViewScores = async (student: any) => {
    setSelectedStudentForScores(student);
    setShowScoresModal(true);
    setScoresLoading(true);
    setStudentScores([]);

    try {
      const response = await ApiService.getStudentScores(
        student.id,
        selectedAcademicYear,
        selectedSemester,
      );

      if (response.success) {
        setStudentScores(response.data?.scores || []);
      } else {
        logger.error("Failed to fetch scores:", response.message);
        setStudentScores([]);
      }
    } catch (error) {
      logger.error("Error fetching student scores:", error);
      setStudentScores([
        {
          subject_name: "Toán",
          class_name: student.class_name,
          academic_year: academicYear,
          semester: semester,
          score_data: {
            Diem_thuong_xuyen: { Diem: 8.5, He_so: 1 },
            Diem_thi_giua_ki: { Diem: 9.0, He_so: 2 },
            Diem_thi_cuoi_ki: { Diem: 8.0, He_so: 3 },
          },
          final_score: 8.4,
          teacher_name: "Nguyễn Thị Lan",
        },
        {
          subject_name: "Ngữ Văn",
          class_name: student.class_name,
          academic_year: academicYear,
          semester: semester,
          score_data: {
            Diem_mieng: { Diem: 7.5, He_so: 1 },
            Diem_15_phut: { Diem: 8.0, He_so: 1 },
            Diem_1_tiet: { Diem: 8.5, He_so: 2 },
            Diem_cuoi_ki: { Diem: 8.0, He_so: 3 },
          },
          final_score: 8.1,
          teacher_name: "Trần Văn Nam",
        },
      ]);
    } finally {
      setScoresLoading(false);
    }
  };

  const closeScoresModal = () => {
    setShowScoresModal(false);
    setSelectedStudentForScores(null);
    setStudentScores([]);
  };

  // Feedback functions - Part 1 (rest will be in separate section due to token limits)
  const handleFeedbackClick = async (student: any) => {
    setSelectedStudentForFeedback(student);
    setGeneratedFeedback("");
    setFeedbackError("");
    setFeedbackSuccess(false);
    set_scoreTrendData(null);
    set_trendError("");
    setHasScoreData(false);

    let initialForm: Record<string, any> = {
      student_name: student.full_name,
      score: "",
      top_subjects: [] as string[],
      weak_subjects: [] as string[],
      attendance_rate: "100",
      subject: "",
      notes: "",
    };

    try {
      logger.debug(
        "🎯 Fetching scores for feedback form for student:",
        student,
      );
      const scoresResponse = await ApiService.getStudentScores(
        student.id,
        selectedAcademicYear,
        selectedSemester,
      );
      logger.debug("📊 Scores response for feedback:", scoresResponse);

      if (scoresResponse.success && scoresResponse.data) {
        const responseData = scoresResponse.data;
        const scores = responseData.scores;
        logger.debug("📋 Full response data:", responseData);
        logger.debug("📋 Scores array:", scores);
        logger.debug("📏 Scores array length:", scores?.length);
        logger.debug("🔍 First score object:", scores?.[0]);

        if (Array.isArray(scores) && scores.length > 0) {
          const validScores = scores.filter(
            (score) =>
              score.final_score !== null && score.final_score !== undefined,
          );
          logger.debug("✅ Valid scores with final_score:", validScores);

          if (validScores.length > 0) {
            const avgScore = (
              validScores.reduce(
                (sum, score) => sum + (score.final_score || 0),
                0,
              ) / validScores.length
            ).toFixed(1);
            logger.debug("📊 Calculated average score for feedback:", avgScore);

            initialForm.score = avgScore;
            setHasScoreData(true);

            const sortedScores = [...validScores]
              .map((g) => ({
                subject: g.subject_name,
                score:
                  typeof g.final_score === "string"
                    ? parseFloat(g.final_score)
                    : g.final_score,
              }))
              .filter((g) => typeof g.score === "number" && !isNaN(g.score));

            const byDesc = [...sortedScores].sort((a, b) => b.score - a.score);
            const byAsc = [...sortedScores].sort((a, b) => a.score - b.score);

            initialForm.top_subjects = byDesc
              .slice(0, 3)
              .map((g) => `${g.subject} (${g.score})`);
            initialForm.weak_subjects = byAsc
              .filter((g) => g.score < 8.0)
              .slice(0, 3)
              .map((g) => `${g.subject} (${g.score})`);
          } else {
            logger.debug("⚠️ No valid final_score found in scores");
            setHasScoreData(false);
          }
        } else {
          logger.debug(
            "⚠️ No scores found for student - not an array or empty",
          );
          logger.debug("📋 Scores type:", typeof scores);
          logger.debug("📋 Is array:", Array.isArray(scores));
          setHasScoreData(false);
        }
      } else {
        logger.debug("❌ Failed to fetch scores:", scoresResponse);
        setHasScoreData(false);
      }
    } catch (error) {
      logger.error("Error fetching student scores:", error);
      setHasScoreData(false);
    }

    try {
      const token = localStorage.getItem("access_token");
      const commentResponse = await fetch(
        `${API_BASE_URL}/feedback/comments/${student.id}?semester=${selectedSemester}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (commentResponse.ok) {
        const commentResult = await commentResponse.json();
        if (commentResult.success && commentResult.data) {
          setGeneratedFeedback(commentResult.data.description);
          logger.debug("✅ Loaded existing comment:", commentResult.data);
        }
      }
    } catch (error) {
      logger.error("Error loading comment:", error);
    }

    logger.debug("📝 Setting feedback form:", initialForm);
    setFeedbackForm(initialForm);
    setShowFeedbackModal(true);
  };

  const closeFeedbackModal = () => {
    setShowFeedbackModal(false);
    setSelectedStudentForFeedback(null);
    setFeedbackForm({
      student_name: "",
      score: "",
      top_subjects: [],
      weak_subjects: [],
      attendance_rate: "100",
      subject: "",
      notes: "",
    });
    setGeneratedFeedback("");
    setFeedbackError("");
    setFeedbackSuccess(false);
    set_scoreTrendData(null);
    set_trendError("");
  };

  const handleFeedbackFormChange = (field: string, value: any) => {
    setFeedbackForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setFeedbackError("");
    setFeedbackSuccess(false);
  };

  const validateFeedbackForm = () => {
    const { student_name, score, attendance_rate } = feedbackForm;

    if (!student_name.trim()) {
      setFeedbackError("Vui lòng nhập tên học sinh");
      return false;
    }

    const scoreNum = parseFloat(score);
    if (!hasScoreData) {
      setFeedbackError("Cần có dữ liệu điểm của học sinh để tạo nhận xét");
      return false;
    }
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
      setFeedbackError("Điểm số phải từ 0 đến 10");
      return false;
    }

    const attendanceNum = parseInt(attendance_rate);
    if (isNaN(attendanceNum) || attendanceNum < 0 || attendanceNum > 100) {
      setFeedbackError("Tỷ lệ chuyên cần phải từ 0 đến 100%");
      return false;
    }

    return true;
  };

  const generateFeedback = async () => {
    if (!validateFeedbackForm()) return;

    setFeedbackLoading(true);
    setFeedbackError("");
    setGeneratedFeedback("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/feedback/generate-feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            student_name: feedbackForm.student_name,
            score: parseFloat(feedbackForm.score),
            top_subjects: feedbackForm.top_subjects || [],
            weak_subjects: feedbackForm.weak_subjects || [],
            attendance_rate: parseInt(feedbackForm.attendance_rate),
            subject: feedbackForm.subject || null,
            notes: feedbackForm.notes,
          }),
        },
      );

      const result = await response.json();

      if (result.success) {
        setGeneratedFeedback(result.feedback);
        setFeedbackSuccess(true);
      } else {
        setFeedbackError(result.error || "Không thể tạo nhận xét");
      }
    } catch (err) {
      logger.error("Error generating feedback:", err);
      setFeedbackError("Lỗi kết nối server. Vui lòng thử lại.");
    } finally {
      setFeedbackLoading(false);
    }
  };

  const saveComment = async () => {
    if (!generatedFeedback || !selectedStudentForFeedback) {
      setFeedbackError("Không có nhận xét để lưu");
      return;
    }

    setSmsLoading(true);
    setFeedbackError("");

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE_URL}/feedback/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          student_id: selectedStudentForFeedback.id,
          description: generatedFeedback,
          semester: selectedSemester,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setFeedbackSuccess(true);
        setFeedbackError("");
        logger.info("✅ Đã lưu nhận xét thành công");
      } else {
        setFeedbackError(result.message || "Không thể lưu nhận xét");
      }
    } catch (error) {
      logger.error("Error saving comment:", error);
      setFeedbackError("Lỗi kết nối server khi lưu nhận xét");
    } finally {
      setSmsLoading(false);
    }
  };

  // Subject functions
  const fetchAvailableSubjects = async () => {
    try {
      logger.debug("🔍 Fetching subjects from API...");
      const response = await ApiService.getSubjectsForSelection();
      logger.debug("📦 API Response:", response);

      if (response.success && response.data) {
        logger.debug("✅ Setting subjects from API:", response.data);
        setAvailableSubjects(response.data);
      } else {
        logger.warn("⚠️ API response invalid, using fallback");
        throw new Error("Invalid API response");
      }
    } catch (error) {
      logger.error("❌ Error fetching subjects:", error);
      logger.debug("📋 Using fallback subject data");
      setAvailableSubjects([
        { subject_code: "TOAN", subject_name: "Toán" },
        { subject_code: "VAN", subject_name: "Ngữ Văn" },
        { subject_code: "ANH", subject_name: "Tiếng Anh" },
        { subject_code: "LY", subject_name: "Vật Lý" },
        { subject_code: "HOA", subject_name: "Hóa Học" },
        { subject_code: "SINH", subject_name: "Sinh Học" },
        { subject_code: "SU", subject_name: "Lịch Sử" },
        { subject_code: "DIA", subject_name: "Địa Lý" },
        { subject_code: "GDCD", subject_name: "Giáo Dục Công Dân" },
        { subject_code: "CNTT", subject_name: "Tin Học" },
        { subject_code: "CONG_NGHE", subject_name: "Công Nghệ" },
      ]);
    }
  };

  const handleSubjectSelection = (student: any) => {
    setSelectedStudentForSubject(student);

    logger.debug("=== DEBUG SUBJECT SELECTION ===");
    logger.debug("Student data:", student);
    logger.debug("Subject selected:", student.subject_selected);
    logger.debug("Subject selected type:", typeof student.subject_selected);

    if (student.subject_selected) {
      let subjectData = student.subject_selected;
      if (typeof subjectData === "string") {
        try {
          subjectData = JSON.parse(subjectData);
        } catch (e) {
          logger.error("Error parsing subject_selected:", e);
          subjectData = null;
        }
      }

      if (subjectData && typeof subjectData === "object") {
        logger.debug("Setting selected subjects:", subjectData);
        setSelectedSubjects(subjectData);
      } else {
        const mandatorySubjects = availableSubjects
          .filter((s) => s.is_mandatory)
          .map((s) => s.subject_code);
        setSelectedSubjects({
          core_subjects: mandatorySubjects,
          elective_subjects: [],
        });
      }
    } else {
      const mandatorySubjects = availableSubjects
        .filter((s) => s.is_mandatory)
        .map((s) => s.subject_code);
      setSelectedSubjects({
        core_subjects: mandatorySubjects,
        elective_subjects: [],
      });
    }

    setShowSubjectModal(true);
    fetchAvailableSubjects();
  };

  const toggleSubjectSelection = (subjectCode: string, type: string) => {
    setSelectedSubjects((prev) => {
      const currentSubjects = prev[type] || [];
      const isSelected = currentSubjects.includes(subjectCode);

      if (isSelected) {
        return {
          ...prev,
          [type]: currentSubjects.filter((code) => code !== subjectCode),
        };
      } else {
        const mandatoryCount = availableSubjects.filter(
          (s) => s.is_mandatory,
        ).length;
        const maxSubjects = type === "core_subjects" ? mandatoryCount : 4;
        if (currentSubjects.length >= maxSubjects) {
          toast.error(
            `Tối đa ${maxSubjects} môn ${
              type === "core_subjects" ? "chính" : "tự chọn"
            }`,
          );
          return prev;
        }
        return {
          ...prev,
          [type]: [...currentSubjects, subjectCode],
        };
      }
    });
  };

  const saveSubjectSelection = async () => {
    if (!selectedStudentForSubject) return;

    setSubjectLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/students/${selectedStudentForSubject.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject_selected: selectedSubjects,
          }),
        },
      );

      if (response.ok) {
        toast.success("Lưu môn học thành công!");
        setShowSubjectModal(false);

        setStudents((prevStudents) =>
          prevStudents.map((student) =>
            student.id === selectedStudentForSubject.id
              ? { ...student, subject_selected: selectedSubjects }
              : student,
          ),
        );
      } else {
        const errorData = await response.json();
        toast.error(`Lỗi khi lưu môn học: ${errorData.detail || "Unknown error"}`);
      }
    } catch (error) {
      logger.error("Error saving subject selection:", error);
      toast.error("Có lỗi xảy ra khi lưu môn học");
    } finally {
      setSubjectLoading(false);
    }
  };

  const closeSubjectModal = () => {
    setShowSubjectModal(false);
    setSelectedStudentForSubject(null);
    const mandatorySubjects = availableSubjects
      .filter((s) => s.is_mandatory)
      .map((s) => s.subject_code);
    setSelectedSubjects({
      core_subjects: mandatorySubjects,
      elective_subjects: [],
    });
  };

  // Export and Email functions
  const exportAllComments = async () => {
    if (!selectedClass || selectedClass === "all") {
      toast.error("Vui lòng chọn lớp để tải nhận xét");
      return;
    }

    try {
      const found = homeroomClasses.find((c) => c.class_name === selectedClass);
      const classId = found?.id;

      if (!classId) {
        toast.error("Không tìm thấy thông tin lớp");
        return;
      }

      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${API_BASE_URL}/feedback/comments/class/${classId}?semester=${selectedSemester}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        toast.error("Lỗi khi lấy nhận xét từ server");
        return;
      }

      const result = await response.json();

      if (!result.success || !result.data || result.data.length === 0) {
        toast.error("Lớp này chưa có nhận xét nào");
        return;
      }

      // Download comments as text
      const commentsText = result.data
        .map(
          (c: any) =>
            `Học sinh: ${c.student_name || c.student_code}\nNhận xét: ${c.description}\n---\n`,
        )
        .join("\n");

      const blob = new Blob([commentsText], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Nhan_xet_${selectedClass}_${selectedSemester}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Đã tải nhận xét thành công!");
    } catch (error) {
      logger.error("Error exporting comments:", error);
      toast.error("Lỗi khi tải nhận xét: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const downloadSubjectTemplate = async () => {
    if (!selectedClass || selectedClass === "all") {
      toast.error("Vui lòng chọn lớp để tải mẫu nhập môn học");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${API_BASE_URL}/homeroom/export-subject-template/${selectedClass}?academic_year=${selectedAcademicYear}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Lỗi khi tải file mẫu");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Mau_nhap_mon_hoc_${selectedClass}_${selectedAcademicYear}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Đã tải file mẫu thành công!");
    } catch (error) {
      logger.error("Error downloading subject template:", error);
      toast.error("Lỗi khi tải file mẫu: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const handleSubjectImport = async () => {
    if (!subjectImportFile) {
      toast.error("Vui lòng chọn file để import");
      return;
    }

    if (!selectedClass || selectedClass === "all") {
      toast.error("Vui lòng chọn lớp để import môn học");
      return;
    }

    setSubjectImportLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      const formData = new FormData();
      formData.append("file", subjectImportFile);

      const response = await fetch(
        `${API_BASE_URL}/homeroom/import-subjects/${selectedClass}?academic_year=${selectedAcademicYear}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Lỗi khi import file");
      }

      const result = await response.json();

      if (result.success) {
        toast.success(
          `✅ ${result.message}\n\n` +
            `• Số học sinh đã cập nhật: ${result.total_updated}\n` +
            (result.total_errors > 0
              ? `• Số lỗi: ${result.total_errors}\n${
                  result.errors?.join("\n") || ""
                }`
              : ""),
        );

        setSubjectImportFile(null);
        setShowSubjectImportModal(false);
        fetchStudents();
      } else {
        throw new Error(result.message || "Import thất bại");
      }
    } catch (error) {
      logger.error("Error importing subjects:", error);
      toast.error("Lỗi khi import file: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setSubjectImportLoading(false);
    }
  };

  const exportStudentReportCard = async () => {
    if (!selectedStudentForFeedback) {
      toast.error("Không có thông tin học sinh!");
      return;
    }

    try {
      const student = selectedStudentForFeedback;

      // Fetch scores if not already loaded
      let scores = studentScores;
      if (!scores || scores.length === 0) {
        const response = await ApiService.getStudentScores(
          student.id,
          selectedAcademicYear,
          selectedSemester,
        );
        if (response.success && response.data?.scores) {
          scores = response.data.scores;
        } else {
          toast.warning(
            "⚠️ Không tìm thấy điểm của học sinh. Phiếu điểm sẽ chỉ hiển thị thông tin và nhận xét.",
          );
          scores = [];
        }
      }

      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Phiếu điểm");

      // Page setup for A4 and fit-to-width
      worksheet.pageSetup = {
        paperSize: 9, // A4
        orientation: "portrait",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.3,
          right: 0.3,
          top: 0.5,
          bottom: 0.5,
          header: 0.2,
          footer: 0.2,
        },
        horizontalCentered: true,
      };

      // Set column widths
      worksheet.columns = [
        { width: 15 }, // A - Môn học
        { width: 18 }, // B - Điểm thường xuyên
        { width: 8 }, // C - GK
        { width: 8 }, // D - CK
        { width: 10 }, // E - TBM HK
      ];

      let currentRow = 1;

      // Title
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const titleCell = worksheet.getCell(`A${currentRow}`);
      titleCell.value = "PHIẾU ĐIỂM HỌC SINH";
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      currentRow += 2;

      // Teacher name (placeholder - will be filled later)
      worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = `Giáo viên chủ nhiệm: `;
      currentRow++;

      // Class
      worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = `Lớp: ${
        student.class_name || ""
      }`;
      currentRow++;

      // Academic year and semester
      worksheet.getCell(`A${currentRow}`).value = `Năm học: ${academicYear}`;
      const semesterCell = worksheet.getCell(`E${currentRow}`);
      semesterCell.value = `Học kỳ: ${semester}`;
      semesterCell.alignment = { horizontal: "right", vertical: "middle" };
      currentRow += 2;

      // Student info
      worksheet.getCell(`A${currentRow}`).value =
        `Học sinh: ${student.full_name}`;
      const studentIdCell = worksheet.getCell(`E${currentRow}`);
      studentIdCell.value = `Mã số: ${student.student_id}`;
      studentIdCell.alignment = { horizontal: "right", vertical: "middle" };
      currentRow += 2;

      // Scores section
      if (scores.length > 0) {
        // Section title
        worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
        const scoreTitleCell = worksheet.getCell(`A${currentRow}`);
        scoreTitleCell.value = "BẢNG ĐIỂM TỔNG KẾT";
        scoreTitleCell.font = { bold: true, size: 11 };
        scoreTitleCell.alignment = { horizontal: "center", vertical: "middle" };
        currentRow += 2;

        // Calculate overall average
        const validScores = scores.filter(
          (g: any) => g.final_score !== null && g.final_score !== undefined,
        );
        const overallAverage =
          validScores.length > 0
            ? (
                validScores.reduce((sum: number, g: any) => sum + g.final_score, 0) /
                validScores.length
              ).toFixed(2)
            : "N/A";

        worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value =
          `Điểm trung bình học kỳ: ${overallAverage}`;
        currentRow += 2;

        // Table headers
        const headerRow = worksheet.getRow(currentRow);
        headerRow.values = [
          "Môn học",
          "Điểm thường xuyên",
          "GK",
          "CK",
          "TBM HK",
        ];
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE8E8E8" },
        };

        ["A", "B", "C", "D", "E"].forEach((col) => {
          const cell = worksheet.getCell(`${col}${currentRow}`);
          cell.alignment = { horizontal: "left", vertical: "middle" };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
        currentRow++;

        // Helper functions
        // Note: getCellScore helper kept for potential future use in score formatting

        // Score data rows
        scores.forEach((score: any) => {
          const dataRow = worksheet.getRow(currentRow);
          dataRow.values = [
            score.subject_name || "N/A",
            "",
            "",
            "",
            score.final_score ?? "",
          ];

          ["A", "B", "C", "D", "E"].forEach((col) => {
            const cell = worksheet.getCell(`${col}${currentRow}`);
            cell.alignment = { horizontal: "left", vertical: "middle" };
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          });

          currentRow++;
        });

        currentRow++;
      }

      // Comments section
      currentRow += 2;
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
      const commentTitleCell = worksheet.getCell(`A${currentRow}`);
      commentTitleCell.value = "NHẬN XÉT CỦA GIÁO VIÊN";
      commentTitleCell.font = { bold: true, size: 11 };
      commentTitleCell.alignment = { horizontal: "center", vertical: "middle" };
      const remarksTitleRow = currentRow;
      currentRow += 2;

      // Feedback text with wrapping
      const feedbackText = generatedFeedback || "Chưa có nhận xét";
      const wrapText = (text: string, maxLength = 70) => {
        const words = text.split(" ");
        const lines: string[] = [];
        let currentLine = "";

        words.forEach((word) => {
          if ((currentLine + word).length <= maxLength) {
            currentLine += (currentLine ? " " : "") + word;
          } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          }
        });
        if (currentLine) lines.push(currentLine);

        return lines;
      };

      const feedbackLines = wrapText(feedbackText);
      feedbackLines.forEach((line) => {
        worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
        const feedbackCell = worksheet.getCell(`A${currentRow}`);
        feedbackCell.value = line;
        feedbackCell.alignment = {
          horizontal: "center",
          vertical: "top",
          wrapText: true,
        };
        worksheet.getRow(currentRow).height = 18;
        currentRow++;
      });
      const remarksEndRow = currentRow - 1;

      // Apply border
      for (let r = remarksTitleRow; r <= remarksEndRow; r++) {
        for (let c = 1; c <= 5; c++) {
          const cell = worksheet.getCell(r, c);
          const border: any = {};
          if (r === remarksTitleRow) border.top = { style: "thin" };
          if (r === remarksEndRow) border.bottom = { style: "thin" };
          if (c === 1) border.left = { style: "thin" };
          if (c === 5) border.right = { style: "thin" };
          cell.border = { ...cell.border, ...border };
        }
      }

      // Signature section
      currentRow += 3;
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      worksheet.mergeCells(`D${currentRow}:E${currentRow}`);
      const sigLeftTitle = worksheet.getCell(`A${currentRow}`);
      sigLeftTitle.value = "Giáo viên chủ nhiệm";
      sigLeftTitle.font = { bold: true };
      sigLeftTitle.alignment = { horizontal: "left", vertical: "middle" };
      const sigRightTitle = worksheet.getCell(`D${currentRow}`);
      sigRightTitle.value = "Phụ huynh";
      sigRightTitle.font = { bold: true };
      sigRightTitle.alignment = { horizontal: "right", vertical: "middle" };
      currentRow++;

      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      worksheet.mergeCells(`D${currentRow}:E${currentRow}`);
      const sigLeftNote = worksheet.getCell(`A${currentRow}`);
      sigLeftNote.value = "(Ký và ghi rõ họ tên)";
      sigLeftNote.alignment = { horizontal: "left", vertical: "middle" };
      const sigRightNote = worksheet.getCell(`D${currentRow}`);
      sigRightNote.value = "(Ký và ghi rõ họ tên)";
      sigRightNote.alignment = { horizontal: "right", vertical: "middle" };

      // Generate and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `PhieuDiem_${student.student_id}_${student.full_name}_${selectedAcademicYear}_${selectedSemester}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success("Xuất phiếu điểm thành công!");
    } catch (error) {
      logger.error("Error exporting report card:", error);
      toast.error(
        "Lỗi khi xuất phiếu điểm: " + (error instanceof Error ? error.message : "Unknown error"),
      );
    }
  };
  const openEmailDialog = () => {
    if (!selectedStudentForFeedback) return;
    setEmailRecipient(
      selectedStudentForFeedback.received_email ||
        selectedStudentForFeedback.email ||
        "",
    );
    setEmailError("");
    setEmailSuccess(false);
    setShowEmailDialog(true);
  };
  const closeEmailDialog = () => {
    setShowEmailDialog(false);
    setEmailError("");
    setEmailSuccess(false);
  };
  const handleSendEmailReportCard = async () => {};

  // Return all states and functions
  return {
    // Student data
    students,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    selectedClass,
    setSelectedClass,
    availableClasses,
    classesLoading,
    
    // Academic year
    homeroomClasses,
    academicYears,
    selectedAcademicYear,
    setSelectedAcademicYear,
    selectedSemester,
    setSelectedSemester,
    availableSemesters,

    // Face registration
    showFaceModal,
    setShowFaceModal,
    selectedStudentForFace,
    setSelectedStudentForFace,
    faceRegistrationLoading,
    cameraStream,
    capturedImage,
    setCapturedImage,
    uploadedImage,
    setUploadedImage,
    registrationMode,
    setRegistrationMode,
    cameraReady,
    cameraError,

    // Multiple face
    multipleFiles,
    multipleResults,
    setMultipleFiles,
    setMultipleResults,
    showMultipleModal,
    setShowMultipleModal,
    selectedStudentForMultiple,
    setSelectedStudentForMultiple,

    // Edit student
    showEditModal,
    setShowEditModal,
    selectedStudentForEdit,
    editForm,
    editLoading,
    restoreLoading,

    // View states
    showInactive,
    setShowInactive,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    viewMode,
    setViewMode,

    // Pagination
    filteredStudents,
    paginatedStudents,
    totalStudents,
    totalPages,
    startIndex,
    endIndex,

    // Subject import
    showSubjectImportModal,
    setShowSubjectImportModal,
    subjectImportFile,
    setSubjectImportFile,
    subjectImportLoading,

    // Scores
    showScoresModal,
    setShowScoresModal,
    selectedStudentForScores,
    studentScores,
    scoresLoading,

    // Feedback
    showFeedbackModal,
    setShowFeedbackModal,
    selectedStudentForFeedback,
    feedbackForm,
    setFeedbackForm,
    generatedFeedback,
    setGeneratedFeedback,
    feedbackLoading,
    feedbackError,
    feedbackSuccess,
    smsLoading,
    hasScoreData,

    // Subject selection
    showSubjectModal,
    setShowSubjectModal,
    selectedStudentForSubject,
    availableSubjects,
    selectedSubjects,
    subjectLoading,

    // Email dialog
    showEmailDialog,
    setShowEmailDialog,
    emailRecipient,
    setEmailRecipient,
    emailSending,
    emailError,
    emailSuccess,

    // Refs
    videoRef,
    canvasRef,
    fileInputRef,
    multipleFileInputRef,

    // Confirm dialog
    confirmState,
    openConfirm,
    closeConfirm,

    // Functions
    fetchStudents,
    fetchAvailableClasses,
    startFaceRegistration,
    capturePhoto,
    resetCamera,
    handleImageUpload,
    submitFaceRegistration,
    closeFaceModal,
    handleMultipleFileSelect,
    removeMultipleFile,
    submitMultipleFaceRegistration,
    handleEdit,
    handleEditFormChange,
    addParentContactRow,
    removeParentContactRow,
    updateParentContactField,
    submitEditForm,
    closeEditModal,
    handleRestore,
    handleViewScores,
    closeScoresModal,
    handleFeedbackClick,
    closeFeedbackModal,
    handleFeedbackFormChange,
    validateFeedbackForm,
    generateFeedback,
    saveComment,
    exportAllComments,
    downloadSubjectTemplate,
    handleSubjectImport,
    exportStudentReportCard,
    fetchAvailableSubjects,
    handleSubjectSelection,
    toggleSubjectSelection,
    saveSubjectSelection,
    closeSubjectModal,
    openEmailDialog,
    closeEmailDialog,
    handleSendEmailReportCard,
  };
};
