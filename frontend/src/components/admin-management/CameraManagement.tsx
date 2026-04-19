import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Search,
  Play,
  Square,
  Camera,
  CheckCircle,
  XCircle,
  Loader,
} from "lucide-react";
import api from "@/utils/api";
import logger from "@/utils/logger";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Camera {
  camera_id: string;
  name: string;
  source: string;
  location: string;
  description?: string;
  enabled: boolean;
  fps: number;
  width?: string | null;
  height?: string | null;
  username?: string | null;
  password?: string | null;
  status?: string;
  frame_count?: number;
}

interface FormData {
  name: string;
  source: string;
  location: string;
  description: string;
  enabled: boolean;
  fps: number | string;
  width: string;
  height: string;
  username: string;
  password: string;
}

interface ConfirmState {
  open: boolean;
  title?: string;
  description?: string;
  onConfirm?: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  confirmText?: string;
  cancelText?: string;
}

interface ApiError {
  message?: string;
  response?: {
    data?: {
      detail?: string;
      message?: string;
    };
  };
}

interface UrlValidation {
  valid: boolean;
  fixedUrl?: string;
  error?: string;
}

const CameraManagement = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false });

  const openConfirm = useCallback((config: Partial<ConfirmState>) =>
    setConfirmState({ open: true, variant: "destructive", confirmText: "Xác nhận", ...config }), []);

  const closeConfirm = useCallback(() =>
    setConfirmState((prev) => ({ ...prev, open: false })), []);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<FormData>({
    name: "",
    source: "",
    location: "",
    description: "",
    enabled: true,
    fps: 60,
    width: "",
    height: "",
    username: "",
    password: "",
  });

  useEffect(() => {
    loadCameras();
    // Refresh mỗi 5 giây để cập nhật status
    const interval = setInterval(loadCameras, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadCameras = async () => {
    try {
      setLoading(true);
      setError(null);
      logger.info("Loading cameras from API: /cameras/");
      const response = await api.get("/cameras/");
      logger.info("API response for cameras:", response);

      // Handle different response formats
      if (response.success) {
        setCameras(response.data || []);
      } else if (response.data && response.data.success) {
        setCameras(response.data.data || []);
      } else {
        setCameras([]);
        setError(
          response.message ||
            response.data?.message ||
            "Lỗi tải danh sách camera"
        );
      }
    } catch (err) {
      logger.error("Error loading cameras:", err);
      console.error("Full error when loading cameras:", err);
      const apiError = err as ApiError;
      const errorMessage =
        apiError?.message ||
        apiError?.response?.data?.detail ||
        "Không thể tải danh sách camera";
      setError(errorMessage);
      setCameras([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      name: "",
      source: "",
      location: "",
      description: "",
      enabled: true,
      fps: 60,
      width: "",
      height: "",
      username: "",
      password: "",
    });
    setEditingCamera(null);
    setShowAddForm(true);
  };

  const handleEdit = (camera: Camera) => {
    setFormData({
      name: camera.name || "",
      source: camera.source || "",
      location: camera.location || "",
      description: camera.description || "",
      enabled: camera.enabled ?? true,
      fps: camera.fps || 60,
      width: (camera.width || "").toString(),
      height: (camera.height || "").toString(),
      username: camera.username || "",
      password: camera.password || "",
    });
    setEditingCamera(camera);
    setShowAddForm(true);
  };

  const handleDelete = (cameraId: string) => {
    openConfirm({
      title: "Xóa camera",
      description: "Bạn có chắc chắn muốn xóa camera này?",
      confirmText: "Xóa",
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.delete(`/cameras/${cameraId}`);
          await loadCameras();
        } catch (err) {
          logger.error("Error deleting camera:", err);
          toast.error("Không thể xóa camera");
        }
      },
    });
  };

  const handleStart = async (cameraId: string) => {
    try {
      await api.post(`/cameras/${cameraId}/start`);
      await loadCameras();
    } catch (err) {
      logger.error("Error starting camera:", err);
      toast.error("Không thể bắt đầu camera");
    }
  };

  const handleStop = async (cameraId: string) => {
    try {
      await api.post(`/cameras/${cameraId}/stop`);
      await loadCameras();
    } catch (err) {
      logger.error("Error stopping camera:", err);
      toast.error("Không thể dừng camera");
    }
  };

  const validateUrl = (url: string): UrlValidation => {
    // Nếu là số (webcam index), hợp lệ
    if (/^\d+$/.test(url.trim())) {
      return { valid: true };
    }

    // Kiểm tra URL format
    try {
      // Sửa lỗi thiếu dấu : giữa IP và port
      let fixedUrl = url.trim();

      // Nếu có pattern như "192.168.1.119.8080" (thiếu :), sửa thành "192.168.1.119:8080"
      const ipPortPattern = /^http:\/\/\d+\.\d+\.\d+\.\d+\.\d+$/;
      if (ipPortPattern.test(fixedUrl)) {
        fixedUrl = fixedUrl.replace(/\.(\d+)$/, ":$1");
      }

      // Nếu thiếu protocol, thêm http://
      if (!fixedUrl.startsWith("http://") && !fixedUrl.startsWith("https://")) {
        fixedUrl = `http://${fixedUrl}`;
      }

      new URL(fixedUrl); // Validate URL
      return { valid: true, fixedUrl };
    } catch (e) {
      return {
        valid: false,
        error: "URL không hợp lệ. Ví dụ: http://192.168.1.100:8080/video",
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate URL
    const urlValidation = validateUrl(formData.source);
    if (!urlValidation.valid) {
      toast.warning(urlValidation.error);
      return;
    }

    // Sửa URL nếu cần
    const dataToSubmit = {
      ...formData,
      source: urlValidation.fixedUrl || formData.source.trim(),
    };

    // Convert empty strings to null/undefined for optional fields when submitting
    const submitData: any = { ...dataToSubmit };
    if (submitData.width === "") submitData.width = null;
    if (submitData.height === "") submitData.height = null;
    if (submitData.username === "") submitData.username = null;
    if (submitData.password === "") submitData.password = null;

    try {
      setLoading(true);
      logger.info("Submitting camera data:", submitData);

      const endpoint = editingCamera
        ? `/cameras/${editingCamera.camera_id}`
        : "/cameras/";

      logger.info(`Calling API: ${editingCamera ? "PUT" : "POST"} ${endpoint}`);

      const response = editingCamera
        ? await api.put(endpoint, submitData)
        : await api.post(endpoint, submitData);

      logger.info("API response:", response);

      if (response.success || response.data) {
        setShowAddForm(false);
        setError(null);
        await loadCameras();
      } else {
        throw new Error(response.message || "Có lỗi xảy ra");
      }
    } catch (err) {
      logger.error("Error saving camera:", err);
      console.error("Full error object:", err);
      const apiError = err as ApiError;
      const errorMessage =
        apiError?.message ||
        apiError?.response?.data?.detail ||
        apiError?.response?.data?.message ||
        `Không thể ${editingCamera ? "cập nhật" : "tạo"} camera`;
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (camera) => {
    const status = camera.status || "inactive";
    const isConnected = camera.is_connected || false;

    if (status === "active" && isConnected) {
      return (
        <Badge className="bg-green-500">
          <CheckCircle className="w-3 h-3 mr-1" />
          Đang hoạt động
        </Badge>
      );
    } else if (status === "connecting") {
      return (
        <Badge className="bg-yellow-500">
          <Loader className="w-3 h-3 mr-1 animate-spin" />
          Đang kết nối
        </Badge>
      );
    } else if (status === "error") {
      return (
        <Badge className="bg-red-500">
          <XCircle className="w-3 h-3 mr-1" />
          Lỗi
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline">
          <XCircle className="w-3 h-3 mr-1" />
          Chưa kích hoạt
        </Badge>
      );
    }
  };

  const filteredCameras = cameras.filter(
    (camera) =>
      camera.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      camera.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      camera.source?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 shadow-md">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                <Camera className="w-6 h-6" />
                Quản lý Camera
              </CardTitle>
              <CardDescription>
                Quản lý các camera kết nối cho hệ thống điểm danh đa luồng
              </CardDescription>
            </div>
            <Button onClick={handleAdd} className="bg-primary">
              <Plus className="w-4 h-4 mr-2" />
              Thêm Camera
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm camera (tên, vị trí, source)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 mb-4 text-red-700 bg-red-100 border border-red-400 rounded">
              {error}
            </div>
          )}

          {/* Table */}
          {loading && cameras.length === 0 ? (
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center relative py-3">TÊN CAMERA<div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" /></TableHead>
                    <TableHead className="text-center relative py-3">SOURCE/URL<div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" /></TableHead>
                    <TableHead className="text-center relative py-3">VỊ TRÍ<div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" /></TableHead>
                    <TableHead className="text-center relative py-3">TRẠNG THÁI<div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" /></TableHead>
                    <TableHead className="text-center relative py-3">FPS<div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" /></TableHead>
                    <TableHead className="text-center relative py-3">SỐ FRAME<div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" /></TableHead>
                    <TableHead className="text-center relative py-3">TÙY CHỌN</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, index) => (
                    <TableRow key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                      <TableCell className="relative"><div className="h-4 rounded animate-pulse bg-muted"></div><div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200"></div></TableCell>
                      <TableCell className="relative"><div className="h-4 rounded animate-pulse bg-muted"></div><div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200"></div></TableCell>
                      <TableCell className="relative"><div className="h-4 rounded animate-pulse bg-muted"></div><div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200"></div></TableCell>
                      <TableCell className="relative"><div className="h-4 rounded animate-pulse bg-muted"></div><div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200"></div></TableCell>
                      <TableCell className="relative"><div className="h-4 rounded animate-pulse bg-muted"></div><div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200"></div></TableCell>
                      <TableCell className="relative"><div className="h-4 rounded animate-pulse bg-muted"></div><div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200"></div></TableCell>
                      <TableCell className="relative flex justify-center"><div className="flex space-x-2"><div className="w-8 h-8 rounded animate-pulse bg-muted"></div><div className="w-8 h-8 rounded animate-pulse bg-muted"></div></div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : filteredCameras.length === 0 ? (
            <div className="py-8 text-center">
              <Camera className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchTerm
                  ? "Không tìm thấy camera nào"
                  : "Chưa có camera nào. Hãy thêm camera mới."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center relative py-3">TÊN CAMERA<div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" /></TableHead>
                    <TableHead className="text-center relative py-3">SOURCE/URL<div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" /></TableHead>
                    <TableHead className="text-center relative py-3">VỊ TRÍ<div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" /></TableHead>
                    <TableHead className="text-center relative py-3">TRẠNG THÁI<div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" /></TableHead>
                    <TableHead className="text-center relative py-3">FPS<div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" /></TableHead>
                    <TableHead className="text-center relative py-3">SỐ FRAME<div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" /></TableHead>
                    <TableHead className="text-center">TÙY CHỌN</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCameras.map((camera, index) => (
                    <TableRow key={camera.camera_id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                      <TableCell className="font-medium relative text-center">
                        {camera.name}
                        <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" />
                      </TableCell>
                      <TableCell className="relative text-center">
                        <code className="px-2 py-1 text-xs rounded bg-muted">
                          {camera.source}
                        </code>
                        <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" />
                      </TableCell>
                      <TableCell className="relative text-center">{camera.location || "-"}<div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" /></TableCell>
                      <TableCell className="relative text-center">{getStatusBadge(camera)}<div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" /></TableCell>
                      <TableCell className="relative text-center">{camera.fps} fps<div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" /></TableCell>
                      <TableCell className="relative text-center">{camera.frame_count || 0}<div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-gray-200" /></TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {camera.status === "active" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStop(camera.camera_id)}
                            >
                              <Square className="w-3 h-3 mr-1" />
                              Dừng
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStart(camera.camera_id)}
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Bắt đầu
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-primary hover:bg-primary/10"
                            onClick={() => handleEdit(camera)}
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(camera.camera_id)}
                            title="Xóa"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCamera ? "Cập nhật Camera" : "Thêm Camera Mới"}
            </DialogTitle>
            <DialogDescription>
              {editingCamera
                ? "Cập nhật thông tin camera"
                : "Thêm camera mới vào hệ thống"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label>Tên Camera *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ví dụ: Camera Điện Thoại 1"
                  required
                />
              </div>

              <div>
                <Label>Source/URL *</Label>
                <Input
                  value={formData.source}
                  onChange={(e) =>
                    setFormData({ ...formData, source: e.target.value })
                  }
                  placeholder="http://192.168.1.100:8080/video hoặc 0, 1 (cho webcam)"
                  required
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  URL camera IP hoặc số thứ tự webcam (0, 1, 2...)
                </p>
              </div>

              <div>
                <Label>Vị trí</Label>
                <Input
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="Ví dụ: Cổng vào chính"
                />
              </div>

              <div>
                <Label>Mô tả</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Mô tả về camera..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>FPS</Label>
                  <Input
                    type="number"
                    value={formData.fps === "" ? "" : formData.fps}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Cho phép xóa trống để nhập số mới
                      if (value === "") {
                        setFormData({ ...formData, fps: "" });
                      } else {
                        const numValue = parseInt(value);
                        if (
                          !isNaN(numValue) &&
                          numValue >= 1 &&
                          numValue <= 60
                        ) {
                          setFormData({ ...formData, fps: numValue });
                        }
                      }
                    }}
                    onBlur={() => {
                      // Khi blur, nếu trống thì set về default 60
                      if (formData.fps === "" || formData.fps === null) {
                        setFormData({ ...formData, fps: 60 });
                      }
                    }}
                    min={1}
                    max={60}
                  />
                </div>

                <div>
                  <Label>Bật Camera</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={(e) =>
                        setFormData({ ...formData, enabled: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm">
                      {formData.enabled ? "Bật" : "Tắt"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Chiều rộng (Width)</Label>
                  <Input
                    type="number"
                    value={formData.width}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        width: e.target.value,
                      })
                    }
                    placeholder="1280"
                  />
                </div>

                <div>
                  <Label>Chiều cao (Height)</Label>
                  <Input
                    type="number"
                    value={formData.height}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        height: e.target.value,
                      })
                    }
                    placeholder="720"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Username (nếu cần)</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    placeholder="admin"
                  />
                </div>

                <div>
                  <Label>Password (nếu cần)</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="password"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Hủy
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Đang lưu..." : editingCamera ? "Cập nhật" : "Tạo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog {...confirmState} title={confirmState.title || ""} onCancel={closeConfirm} />
    </div>
  );
};

export default CameraManagement;
