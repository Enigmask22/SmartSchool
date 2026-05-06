import { useState, useEffect } from "react";
import {
  Settings,
  Calendar,
  Clock,
  BookOpen,
  Save,
  Download,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import api from "@/utils/api";
import { ACADEMIC_YEAR_OPTIONS } from "@/utils/constants";

interface Setting {
  setting_key: string;
  setting_value: string;
  [key: string]: any;
}

interface SettingsMap {
  academic_year?: Setting;
  semester?: Setting;
  attendance_cutoff_time?: Setting;
  [key: string]: Setting | undefined;
}

interface FormData {
  academic_year: string;
  semester: string;
  attendance_cutoff_time: string;
}

const SystemSettings = () => {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    academic_year: "",
    semester: "",
    attendance_cutoff_time: "",
  });
  const [cutoffHour, setCutoffHour] = useState("00");
  const [cutoffMinute, setCutoffMinute] = useState("00");

  // Load settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.request("/admin/system-settings", {
        method: "GET",
      });

      if (response.success) {
        // Chuyển đổi array thành object để dễ xử lý
        const settingsMap: SettingsMap = {};
        response.data.forEach((setting: Setting) => {
          settingsMap[setting.setting_key] = setting;
        });
        setSettings(settingsMap);

        // Set form data
        setFormData({
          academic_year: settingsMap.academic_year?.setting_value || "",
          semester: settingsMap.semester?.setting_value || "",
          attendance_cutoff_time:
            settingsMap.attendance_cutoff_time?.setting_value || "",
        });

        // Sync hour/minute state from loaded value
        const timeVal =
          settingsMap.attendance_cutoff_time?.setting_value || "00:00";
        const [h, m] = timeVal.split(":");
        setCutoffHour(h?.padStart(2, "0") || "00");
        setCutoffMinute(m?.padStart(2, "0") || "00");
      } else {
        setError(response.message || "Không thể tải cấu hình");
      }
    } catch (err) {
      setError("Lỗi khi tải cấu hình: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async (settingKey: keyof FormData) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await api.request(
        `/admin/system-settings/${settingKey}`,
        {
          method: "PUT",
          body: JSON.stringify({
            setting_value: formData[settingKey],
          }),
        }
      );

      if (response.success) {
        setSuccess(`Cập nhật ${settingKey} thành công!`);
        await loadSettings();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.message || "Không thể cập nhật cấu hình");
      }
    } catch (err) {
      setError("Lỗi khi cập nhật: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const promises = Object.keys(formData).map((key) =>
        api.request(`/admin/system-settings/${key}`, {
          method: "PUT",
          body: JSON.stringify({
            setting_value: formData[key as keyof FormData],
          }),
        })
      );

      const results = await Promise.all(promises);
      const allSuccess = results.every((r) => r.success);

      if (allSuccess) {
        setSuccess("Cập nhật tất cả cấu hình thành công!");
        await loadSettings();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError("Một số cấu hình không thể cập nhật");
      }
    } catch (err) {
      setError("Lỗi khi cập nhật: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  // Whenever hour/minute changes, update combined time string
  useEffect(() => {
    const next = `${cutoffHour}:${cutoffMinute}`;
    setFormData((prev) => ({ ...prev, attendance_cutoff_time: next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cutoffHour, cutoffMinute]);

  const hours = Array.from({ length: 24 }, (_, i) => `${i}`.padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => `${i}`.padStart(2, "0"));

  // ===== Dayoffs per grade (10/11/12) =====
  const grades = [10, 11, 12];
  const currentYear = new Date().getFullYear();
  const [dayoffYear, setDayoffYear] = useState<{ [key: number]: number }>({
    10: currentYear,
    11: currentYear,
    12: currentYear,
  });
  const [dayoffMonth, setDayoffMonth] = useState<{ [key: number]: number }>({
    10: new Date().getMonth() + 1,
    11: new Date().getMonth() + 1,
    12: new Date().getMonth() + 1,
  });
  const [dayoffDays, setDayoffDays] = useState<{ [key: number]: Set<number> }>({
    10: new Set(),
    11: new Set(),
    12: new Set(),
  });
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const loadDayoffConfig = async (g: number) => {
    try {
      const y = dayoffYear[g];
      const m = dayoffMonth[g];
      const resp = await api.request(
        `/admin/dayoffs?year=${y}&month=${m}&grade=${g}`
      );
      if (resp.success && resp.data && resp.data.length > 0) {
        const list = resp.data[0].dayoffs_list || [];
        setDayoffDays((prev) => ({ ...prev, [g]: new Set(list) }));
      } else {
        setDayoffDays((prev) => ({ ...prev, [g]: new Set() }));
      }
    } catch (e) {
      // ignore
    }
  };

  const saveDayoffConfig = async (g: number) => {
    try {
      setSaving(true);
      const y = dayoffYear[g];
      const m = dayoffMonth[g];
      const list = Array.from(dayoffDays[g]).sort((a, b) => (a as number) - (b as number));
      const resp = await api.request(`/admin/dayoffs`, {
        method: "POST",
        body: JSON.stringify({
          year: y,
          month: m,
          grade: g,
          dayoffs_list: list,
        }),
      });
      if (resp.success) setSuccess(`Lưu ngày nghỉ khối ${g} thành công`);
      else setError(resp.message || `Không thể lưu ngày nghỉ khối ${g}`);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(`Lỗi khi lưu ngày nghỉ khối ${g}: ${errorMessage}`);
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(null), 2500);
    }
  };

  // Auto-load dayoff config for all grades when component mounts
  useEffect(() => {
    // Load config for all grades (10, 11, 12) after initial render
    // Small delay to ensure state (dayoffYear, dayoffMonth) is initialized
    const timer = setTimeout(() => {
      grades.forEach((g) => {
        loadDayoffConfig(g);
      });
    }, 100);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const renderDayoffSection = (g: number) => {
    const yearOptions = [currentYear - 1, currentYear, currentYear + 1];
    const selected = dayoffDays[g] || new Set();
    const toggleDay = (d: number) => {
      setDayoffDays((prev) => {
        const setCopy = new Set(prev[g] || []);
        if (setCopy.has(d)) setCopy.delete(d);
        else setCopy.add(d);
        return { ...prev, [g]: setCopy };
      });
    };
    return (
      <Card className="transition-shadow hover:shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">
            Quản lý ngày nghỉ - Khối {g}
          </CardTitle>
          <CardDescription>Chọn năm, tháng và các ngày nghỉ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Năm</Label>
              <Select
                value={String(dayoffYear[g])}
                onValueChange={(v) => {
                  setDayoffYear((p) => ({ ...p, [g]: parseInt(v, 10) }));
                  setTimeout(() => loadDayoffConfig(g), 0);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tháng</Label>
              <Select
                value={String(dayoffMonth[g])}
                onValueChange={(v) => {
                  setDayoffMonth((p) => ({ ...p, [g]: parseInt(v, 10) }));
                  setTimeout(() => loadDayoffConfig(g), 0);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Chọn ngày nghỉ</Label>
            <div className="grid grid-cols-7 gap-2 mt-2">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant={selected.has(d) ? "default" : "outline"}
                  className={`h-9 ${selected.has(d) ? "bg-primary text-primary-foreground" : ""
                    }`}
                  onClick={() => toggleDay(d)}
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap justify-between gap-2">
            {/* <Button variant="outline" onClick={() => loadDayoffConfig(g)}>
              <Download className="w-4 h-4 mr-2" />
              Tải cấu hình
            </Button> */}
            <Button onClick={() => saveDayoffConfig(g)} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              Lưu ngày nghỉ khối {g}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center text-2xl font-bold">
                  <Settings className="w-8 h-8 mr-3" />
                  Cài đặt hệ thống
                </CardTitle>
                <CardDescription className="mt-2 text-sm">
                  Quản lý năm học, học kỳ và thời gian điểm danh
                </CardDescription>
              </div>
              <Button onClick={loadSettings} variant="outline" disabled={true}>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Làm mới
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Settings Cards Grid */}
        <div className="space-y-4">
          {/* Academic Year Card */}
          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                Năm học
              </CardTitle>
              <CardDescription>Năm học hiện tại của hệ thống</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="academic_year">Năm học</Label>
                <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
                <p className="text-xs text-muted-foreground">
                  Định dạng: YYYY-YYYY (VD: 2024-2025)
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted space-y-2">
                <div className="h-3 w-56 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <Button disabled={true} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                Lưu năm học
              </Button>
            </CardContent>
          </Card>

          {/* Semester Card */}
          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <BookOpen className="w-5 h-5 mr-2 text-green-600" />
                Học kỳ
              </CardTitle>
              <CardDescription>Học kỳ hiện tại đang diễn ra</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="semester">Học kỳ</Label>
                <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
                <p className="text-xs text-muted-foreground">
                  Chọn học kỳ hiện tại (HK1, HK2, hoặc HK3)
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted space-y-2">
                <div className="h-3 w-56 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <Button disabled={true} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                Lưu học kỳ
              </Button>
            </CardContent>
          </Card>

          {/* Attendance Cutoff Time Card */}
          <Card className="transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Clock className="w-5 h-5 mr-2 text-orange-600" />
                Giờ điểm danh
              </CardTitle>
              <CardDescription>Thời gian giới hạn để điểm danh</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Giờ điểm danh (HH:MM)</Label>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
                  <span className="font-semibold">:</span>
                  <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Học sinh đến sau giờ này sẽ bị tính là đi muộn
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted space-y-2">
                <div className="h-3 w-56 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <Button disabled={true} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                Lưu giờ điểm danh
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Save All Button */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Lưu tất cả thay đổi</h3>
                <p className="text-sm text-muted-foreground">
                  Cập nhật tất cả các cấu hình cùng một lúc
                </p>
              </div>
              <Button disabled={true} size="lg" className="px-8">
                <div className="w-4 h-4 mr-2 border-2 border-current rounded-full animate-spin border-t-transparent"></div>
                Đang lưu...
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 mt-0.5 text-blue-600" />
              <div>
                <h4 className="font-semibold text-blue-900">Lưu ý quan trọng</h4>
                <ul className="mt-2 space-y-1 text-sm text-blue-800">
                  <li>• Năm học nên theo định dạng YYYY-YYYY (VD: 2024-2025)</li>
                  <li>
                    • Học kỳ có 3 giá trị: HK1 (Học kỳ 1), HK2 (Học kỳ 2), HK3
                    (Học kỳ hè)
                  </li>
                  <li>
                    • Giờ điểm danh nên đặt theo giờ vào học chính thức của trường
                    (VD: 07:15)
                  </li>
                  <li>
                    • Các thay đổi sẽ ảnh hưởng đến toàn bộ hệ thống ngay lập tức
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dayoffs per grade */}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          {[10, 11, 12].map((g) => (
            <Card key={g} className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">
                  Quản lý ngày nghỉ - Khối {g}
                </CardTitle>
                <CardDescription>Chọn năm, tháng và các ngày nghỉ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Năm</Label>
                    <div className="h-10 w-full bg-gray-200 rounded animate-pulse mt-2"></div>
                  </div>
                  <div>
                    <Label>Tháng</Label>
                    <div className="h-10 w-full bg-gray-200 rounded animate-pulse mt-2"></div>
                  </div>
                </div>

                <div>
                  <Label>Chọn ngày nghỉ</Label>
                  <div className="grid grid-cols-7 gap-2 mt-2">
                    {Array.from({ length: 21 }, (_, i) => i + 1).map((d) => (
                      <div
                        key={d}
                        className="h-9 bg-gray-200 rounded animate-pulse"
                      ></div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap justify-between gap-2">
                  <Button variant="outline" disabled={true}>
                    <Download className="w-4 h-4 mr-2" />
                    Tải cấu hình
                  </Button>
                  <Button disabled={true}>
                    <Save className="w-4 h-4 mr-2" />
                    Lưu ngày nghỉ khối {g}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center text-2xl font-bold">
                <Settings className="w-8 h-8 mr-3" />
                Cài đặt hệ thống
              </CardTitle>
              <CardDescription className="mt-2 text-sm">
                Quản lý năm học, học kỳ và thời gian điểm danh
              </CardDescription>
            </div>
            <Button onClick={loadSettings} variant="outline" disabled={loading}>
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Làm mới
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-600">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Settings Cards - Single Column Band Layout */}
      <div className="space-y-4">
        {/* Academic Year */}
        <Card className="transition-shadow hover:shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:gap-6">
              {/* Left: Title & Description */}
              <div className="flex-shrink-0 mb-4 md:mb-0 md:w-48">
                <CardTitle className="flex items-center text-lg mb-1">
                  <Calendar className="w-5 h-5 mr-2 text-blue-600 flex-shrink-0" />
                  Năm học
                </CardTitle>
                <CardDescription className="text-xs">Năm học hiện tại của hệ thống</CardDescription>
              </div>

              {/* Middle: Select */}
              <div className="mb-4 md:mb-0">
                <Select
                  value={formData.academic_year}
                  onValueChange={(v) => handleChange("academic_year", v)}
                >
                  <SelectTrigger className="w-[160px] text-sm">
                    <SelectValue placeholder="Chọn năm học" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_YEAR_OPTIONS.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Middle-Right: Updated At */}
              <div className="flex-1 mb-4 md:mb-0 md:text-right">
                {settings.academic_year && (
                  <p className="text-xs text-muted-foreground">
                    Cập nhật:{" "}
                    {new Date(settings.academic_year.updated_at).toLocaleString(
                      "vi-VN"
                    )}
                  </p>
                )}
              </div>

              {/* Right: Button */}
              <div className="flex-shrink-0">
                <Button
                  onClick={() => handleSave("academic_year")}
                  disabled={
                    saving ||
                    formData.academic_year === settings.academic_year?.setting_value
                  }
                  size="sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Lưu
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Semester */}
        <Card className="transition-shadow hover:shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:gap-6">
              {/* Left: Title & Description */}
              <div className="flex-shrink-0 mb-4 md:mb-0 md:w-48">
                <CardTitle className="flex items-center text-lg mb-1">
                  <BookOpen className="w-5 h-5 mr-2 text-green-600 flex-shrink-0" />
                  Học kỳ
                </CardTitle>
                <CardDescription className="text-xs">Học kỳ hiện tại đang diễn ra</CardDescription>
              </div>

              {/* Middle: Select & Format */}
              <div className="mb-4 md:mb-0">
                <div className="flex items-center gap-3">
                  <div className="max-w-xs">
                    <Select
                      value={formData.semester || ""}
                      onValueChange={(v) => handleChange("semester", v)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Chọn học kỳ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HK1">Học kỳ 1</SelectItem>
                        <SelectItem value="HK2">Học kỳ 2</SelectItem>
                        <SelectItem value="HK3">Học kỳ 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    (HK1, HK2, HK3)
                  </p>
                </div>
              </div>

              {/* Middle-Right: Updated At */}
              <div className="flex-1 mb-4 md:mb-0 md:text-right">
                {settings.semester && (
                  <p className="text-xs text-muted-foreground">
                    Cập nhật:{" "}
                    {new Date(settings.semester.updated_at).toLocaleString(
                      "vi-VN"
                    )}
                  </p>
                )}
              </div>

              {/* Right: Button */}
              <div className="flex-shrink-0">
                <Button
                  onClick={() => handleSave("semester")}
                  disabled={
                    saving || formData.semester === settings.semester?.setting_value
                  }
                  size="sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Lưu
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Cutoff Time */}
        <Card className="transition-shadow hover:shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:gap-6">
              {/* Left: Title & Description */}
              <div className="flex-shrink-0 mb-4 md:mb-0 md:w-48">
                <CardTitle className="flex items-center text-lg mb-1">
                  <Clock className="w-5 h-5 mr-2 text-orange-600 flex-shrink-0" />
                  Giờ điểm danh
                </CardTitle>
                <CardDescription className="text-xs">Thời gian giới hạn để điểm danh</CardDescription>
              </div>

              {/* Middle: Time Selectors & Format */}
              <div className="mb-4 md:mb-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Select
                      value={cutoffHour}
                      onValueChange={(v) => setCutoffHour(v)}
                    >
                      <SelectTrigger className="w-16 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {hours.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="font-semibold">:</span>
                    <Select
                      value={cutoffMinute}
                      onValueChange={(v) => setCutoffMinute(v)}
                    >
                      <SelectTrigger className="w-16 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {minutes.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    (HH:MM)
                  </p>
                </div>
              </div>

              {/* Middle-Right: Updated At */}
              <div className="flex-1 mb-4 md:mb-0 md:text-right">
                {settings.attendance_cutoff_time && (
                  <p className="text-xs text-muted-foreground">
                    Cập nhật:{" "}
                    {new Date(
                      settings.attendance_cutoff_time.updated_at
                    ).toLocaleString("vi-VN")}
                  </p>
                )}
              </div>

              {/* Right: Button */}
              <div className="flex-shrink-0">
                <Button
                  onClick={() => handleSave("attendance_cutoff_time")}
                  disabled={
                    saving ||
                    formData.attendance_cutoff_time ===
                    settings.attendance_cutoff_time?.setting_value
                  }
                  size="sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Lưu
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save All Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Lưu tất cả thay đổi</h3>
              <p className="text-sm text-muted-foreground">
                Cập nhật tất cả các cấu hình cùng một lúc
              </p>
            </div>
            <Button
              onClick={handleSaveAll}
              disabled={saving}
              size="lg"
              className="px-8"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Lưu tất cả
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 mt-0.5 text-blue-600" />
            <div>
              <h4 className="font-semibold text-blue-900">Lưu ý quan trọng</h4>
              <ul className="mt-2 space-y-1 text-sm text-blue-800">
                <li>• Năm học nên theo định dạng YYYY-YYYY (VD: 2024-2025)</li>
                <li>
                  • Học kỳ có 3 giá trị: HK1 (Học kỳ 1), HK2 (Học kỳ 2), HK3
                  (Học kỳ hè)
                </li>
                <li>
                  • Giờ điểm danh nên đặt theo giờ vào học chính thức của trường
                  (VD: 07:15)
                </li>
                <li>
                  • Các thay đổi sẽ ảnh hưởng đến toàn bộ hệ thống ngay lập tức
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dayoffs per grade */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {grades.map((g) => (
          <div key={g}>{renderDayoffSection(g)}</div>
        ))}
      </div>
    </div>
  );
};

export default SystemSettings;
