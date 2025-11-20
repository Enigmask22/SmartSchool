import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Search,
  Play,
  Square,
  Video,
  Camera,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader,
} from "lucide-react";
import api from "@/services/api";
import logger from "@/utils/logger";
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
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

const CameraManagement = () => {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingCamera, setEditingCamera] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    source: "",
    location: "",
    description: "",
    enabled: true,
    fps: 30,
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
      const errorMessage =
        err.message ||
        err.response?.data?.detail ||
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
      fps: 30,
      width: "",
      height: "",
      username: "",
      password: "",
    });
    setEditingCamera(null);
    setShowAddForm(true);
  };

  const handleEdit = (camera) => {
    setFormData({
      name: camera.name || "",
      source: camera.source || "",
      location: camera.location || "",
      description: camera.description || "",
      enabled: camera.enabled ?? true,
      fps: camera.fps || 30,
      width: camera.width || "",
      height: camera.height || "",
      username: camera.username || "",
      password: camera.password || "",
    });
    setEditingCamera(camera);
    setShowAddForm(true);
  };

  const handleDelete = async (cameraId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa camera này?")) {
      return;
    }

    try {
      await api.delete(`/cameras/${cameraId}`);
      await loadCameras();
    } catch (err) {
      logger.error("Error deleting camera:", err);
      alert("Không thể xóa camera");
    }
  };

  const handleStart = async (cameraId) => {
    try {
      await api.post(`/cameras/${cameraId}/start`);
      await loadCameras();
    } catch (err) {
      logger.error("Error starting camera:", err);
      alert("Không thể bắt đầu camera");
    }
  };

  const handleStop = async (cameraId) => {
    try {
      await api.post(`/cameras/${cameraId}/stop`);
      await loadCameras();
    } catch (err) {
      logger.error("Error stopping camera:", err);
      alert("Không thể dừng camera");
    }
  };

  const validateUrl = (url) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate URL
    const urlValidation = validateUrl(formData.source);
    if (!urlValidation.valid) {
      alert(urlValidation.error);
      return;
    }

    // Sửa URL nếu cần
    const dataToSubmit = {
      ...formData,
      source: urlValidation.fixedUrl || formData.source.trim(),
    };

    // Convert empty strings to null for optional fields
    if (dataToSubmit.width === "") dataToSubmit.width = null;
    if (dataToSubmit.height === "") dataToSubmit.height = null;
    if (dataToSubmit.username === "") dataToSubmit.username = null;
    if (dataToSubmit.password === "") dataToSubmit.password = null;

    try {
      setLoading(true);
      logger.info("Submitting camera data:", dataToSubmit);

      const endpoint = editingCamera
        ? `/cameras/${editingCamera.camera_id}`
        : "/cameras/";

      logger.info(`Calling API: ${editingCamera ? "PUT" : "POST"} ${endpoint}`);

      const response = editingCamera
        ? await api.put(endpoint, dataToSubmit)
        : await api.post(endpoint, dataToSubmit);

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
      const errorMessage =
        err.message ||
        err.response?.data?.detail ||
        err.response?.data?.message ||
        `Không thể ${editingCamera ? "cập nhật" : "tạo"} camera`;
      alert(errorMessage);
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
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
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
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Table */}
          {loading && cameras.length === 0 ? (
            <div className="text-center py-8">
              <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Đang tải...</p>
            </div>
          ) : filteredCameras.length === 0 ? (
            <div className="text-center py-8">
              <Camera className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchTerm
                  ? "Không tìm thấy camera nào"
                  : "Chưa có camera nào. Hãy thêm camera mới."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên Camera</TableHead>
                    <TableHead>Source/URL</TableHead>
                    <TableHead>Vị trí</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>FPS</TableHead>
                    <TableHead>Frame Count</TableHead>
                    <TableHead>Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCameras.map((camera) => (
                    <TableRow key={camera.camera_id}>
                      <TableCell className="font-medium">
                        {camera.name}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {camera.source}
                        </code>
                      </TableCell>
                      <TableCell>{camera.location || "-"}</TableCell>
                      <TableCell>{getStatusBadge(camera)}</TableCell>
                      <TableCell>{camera.fps} fps</TableCell>
                      <TableCell>{camera.frame_count || 0}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
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
                            onClick={() => handleEdit(camera)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(camera.camera_id)}
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
                <p className="text-xs text-muted-foreground mt-1">
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
                    value={formData.fps}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fps: parseInt(e.target.value) || 30,
                      })
                    }
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
                        width: e.target.value ? parseInt(e.target.value) : "",
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
                        height: e.target.value ? parseInt(e.target.value) : "",
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
    </div>
  );
};

export default CameraManagement;
