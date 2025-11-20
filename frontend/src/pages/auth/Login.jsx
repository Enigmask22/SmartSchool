import React, { useState, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import ForgotPassword from "./ForgotPassword";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { School, AlertCircle, Loader2 } from "lucide-react";

const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(""); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await login(formData.username, formData.password);
      
      // Redirect based on role
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        // Teachers go to dashboard selector
        navigate('/select-dashboard');
      }
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  // Nếu đang hiển thị forgot password
  if (showForgotPassword) {
    return (
      <ForgotPassword onBackToLogin={() => setShowForgotPassword(false)} />
    );
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen p-4 bg-center bg-no-repeat bg-cover"
      style={{
        backgroundImage: "url(/background_login.png)",
      }}
    >
      {/* Overlay để làm mờ background */}
      <div className="absolute inset-0 bg-black/40"></div>

      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-blue-600 rounded-full">
            <School className="w-8 h-8 text-white" />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-white">SynapseS</h1>
          <p className="mt-2 text-sm text-white/90">
            Đăng nhập để truy cập hệ thống quản lý trường học
          </p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Đăng nhập</CardTitle>
            <CardDescription>
              Nhập thông tin tài khoản để tiếp tục
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="flex items-center p-4 space-x-2 border border-red-200 rounded-lg bg-red-50">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="text-sm font-medium text-gray-700"
                >
                  Username
                </label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="ho_va_ten.ten_truong.ten_tinh"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700"
                >
                  Mật khẩu
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Nhập mật khẩu"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang đăng nhập...
                  </>
                ) : (
                  "Đăng nhập"
                )}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Quên mật khẩu?
                </Button>
              </div>
            </form>

            {/* Demo accounts */}
            {/* <div className="pt-6 mt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="mb-3 text-xs text-gray-500">Tài khoản demo:</p>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="p-2 rounded-lg bg-gray-50">
                    <strong>Admin:</strong> admin.chuyen_le_quy_don.tphcm / password
                  </div>
                  <div className="p-2 rounded-lg bg-gray-50">
                    <strong>Giáo viên:</strong> nguyen_thi_lan.chuyen_le_quy_don.tphcm / password
                  </div>
                </div>
              </div>
            </div> */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
