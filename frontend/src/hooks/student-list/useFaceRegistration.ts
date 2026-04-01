import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import logger from "@/utils/logger";

const API_BASE_URL = import.meta.env.VITE_APP_API_URL || "http://localhost:8000/api";

export const useFaceRegistration = (
  fetchStudents: () => void,
) => {
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

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Face registration functions
  const startFaceRegistration = useCallback(async (student: any) => {
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
  }, [cameraStream]);

  const capturePhoto = useCallback(() => {
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
  }, []);

  const resetCamera = useCallback(async () => {
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
  }, [cameraStream]);

  const handleImageUpload = useCallback((event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh (JPG, PNG, etc.)");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setUploadedImage({ file, previewUrl });
    setCapturedImage(null);
  }, []);

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

  const closeFaceModal = useCallback(() => {
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
  }, [uploadedImage, cameraStream]);

  return {
    // States
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

    // Refs
    videoRef,
    canvasRef,
    fileInputRef,

    // Functions
    startFaceRegistration,
    capturePhoto,
    resetCamera,
    handleImageUpload,
    submitFaceRegistration,
    closeFaceModal,
  };
};
