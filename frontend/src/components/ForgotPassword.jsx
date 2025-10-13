import React, { useState } from 'react';
import api from '../services/api';

const ForgotPassword = ({ onBackToLogin }) => {
  const [step, setStep] = useState(1); // 1: Nhập username, 2: Nhập OTP, 3: Đặt mật khẩu mới
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    username: '',
    otpEmail: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // OTP input refs
  const otpInputs = Array.from({ length: 6 }, () => React.createRef());
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleOTPChange = (index, value) => {
    // Chỉ cho phép nhập số và giới hạn 1 ký tự
    if (!/^\d*$/.test(value) || value.length > 1) return;
    
    const newOTP = formData.otp.split('');
    newOTP[index] = value;
    setFormData(prev => ({
      ...prev,
      otp: newOTP.join('')
    }));
    
    // Tự động chuyển sang ô tiếp theo
    if (value && index < 5) {
      otpInputs[index + 1].current.focus();
    }
    
    setError('');
  };

  const handleOTPKeyDown = (index, e) => {
    // Xử lý phím Backspace
    if (e.key === 'Backspace' && !formData.otp[index] && index > 0) {
      otpInputs[index - 1].current.focus();
    }
  };

  const handleOTPPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData.length === 6) {
      setFormData(prev => ({
        ...prev,
        otp: pastedData
      }));
      
      // Focus vào ô cuối cùng
      otpInputs[5].current.focus();
    }
    
    setError('');
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate
      if (!formData.username || !formData.otpEmail) {
        throw new Error('Vui lòng điền đầy đủ thông tin');
      }
      
      if (!validateEmail(formData.otpEmail)) {
        throw new Error('Email nhận OTP không hợp lệ');
      }

      const response = await api.forgotPassword(formData.username, formData.otpEmail);
      
      if (response.success) {
        setSuccess('Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư (bao gồm thư mục spam)');
        setStep(2);
      } else {
        throw new Error(response.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      setError(err.message || 'Không thể gửi OTP. Vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate OTP
      if (formData.otp.length !== 6) {
        throw new Error('Vui lòng nhập đầy đủ 6 số OTP');
      }

      const response = await api.verifyOTP(formData.username, formData.otp);
      
      if (response.success) {
        setSuccess('Xác thực OTP thành công');
        setStep(3);
      } else {
        throw new Error(response.message || 'OTP không đúng');
      }
    } catch (err) {
      setError(err.message || 'Xác thực OTP thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate passwords
      if (!formData.newPassword || !formData.confirmPassword) {
        throw new Error('Vui lòng điền đầy đủ mật khẩu');
      }
      
      if (formData.newPassword.length < 6) {
        throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        throw new Error('Mật khẩu mới và xác nhận mật khẩu không khớp');
      }

      const response = await api.resetPassword(
        formData.username, 
        formData.otp, 
        formData.newPassword, 
        formData.confirmPassword
      );
      
      if (response.success) {
        setSuccess('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập với mật khẩu mới.');
        
        // Chuyển về trang login sau 2 giây
        setTimeout(() => {
          onBackToLogin();
        }, 2000);
      } else {
        throw new Error(response.message || 'Đặt lại mật khẩu thất bại');
      }
    } catch (err) {
      setError(err.message || 'Đặt lại mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Quên mật khẩu?</h2>
        <p className="mt-2 text-sm text-gray-600">
          Nhập username đăng nhập và email nhận OTP để đặt lại mật khẩu
        </p>
      </div>

      <form onSubmit={handleStep1Submit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Username đăng nhập
          </label>
          <div className="mt-1">
            <input
              id="username"
              name="username"
              type="text"
              required
              value={formData.username}
              onChange={handleInputChange}
              className="block px-3 py-2 w-full placeholder-gray-400 rounded-md border border-gray-300 appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="ho_va_ten.ten_truong.ten_tinh"
            />
          </div>
        </div>

        <div>
          <label htmlFor="otpEmail" className="block text-sm font-medium text-gray-700">
            Email nhận OTP
          </label>
          <div className="mt-1">
            <input
              id="otpEmail"
              name="otpEmail"
              type="email"
              required
              value={formData.otpEmail}
              onChange={handleInputChange}
              className="block px-3 py-2 w-full placeholder-gray-400 rounded-md border border-gray-300 appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="your-email@gmail.com"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Mã OTP sẽ được gửi đến email này
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onBackToLogin}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Quay lại
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md border border-transparent hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang gửi...' : 'Gửi OTP'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Nhập mã OTP</h2>
        <p className="mt-2 text-sm text-gray-600">
          Mã OTP đã được gửi đến <strong>{formData.otpEmail}</strong>
        </p>
      </div>

      <form onSubmit={handleStep2Submit} className="space-y-6">
        <div>
          <label className="block mb-3 text-sm font-medium text-gray-700">
            Mã OTP (6 số)
          </label>
          <div className="flex justify-center space-x-3">
            {Array.from({ length: 6 }, (_, index) => (
              <input
                key={index}
                ref={otpInputs[index]}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={formData.otp[index] || ''}
                onChange={(e) => handleOTPChange(index, e.target.value)}
                onKeyDown={(e) => handleOTPKeyDown(index, e)}
                onPaste={handleOTPPaste}
                className="w-12 h-12 text-lg font-bold text-center rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                autoComplete="off"
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-center text-gray-500">
            Mã OTP có hiệu lực trong 10 phút
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Quay lại
          </button>
          <button
            type="submit"
            disabled={loading || formData.otp.length !== 6}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md border border-transparent hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang xác thực...' : 'Xác thực OTP'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Đặt mật khẩu mới</h2>
        <p className="mt-2 text-sm text-gray-600">
          Nhập mật khẩu mới cho tài khoản <strong>{formData.username}</strong>
        </p>
      </div>

      <form onSubmit={handleStep3Submit} className="space-y-4">
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
            Mật khẩu mới
          </label>
          <div className="mt-1">
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              value={formData.newPassword}
              onChange={handleInputChange}
              className="block px-3 py-2 w-full placeholder-gray-400 rounded-md border border-gray-300 appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Nhập mật khẩu mới"
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Xác nhận mật khẩu mới
          </label>
          <div className="mt-1">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="block px-3 py-2 w-full placeholder-gray-400 rounded-md border border-gray-300 appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Nhập lại mật khẩu mới"
            />
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Quay lại
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md border border-transparent hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="flex justify-center items-center p-4 min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="space-y-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center items-center mx-auto w-16 h-16 bg-indigo-600 rounded-full">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
          SynapseS
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Đặt lại mật khẩu
          </p>
        </div>

        {/* Form */}
        <div className="p-8 bg-white rounded-xl shadow-lg">
          {/* Error Message */}
          {error && (
            <div className="p-4 mb-4 bg-red-50 rounded-md border border-red-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-4 mb-4 bg-green-50 rounded-md border border-green-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step Content */}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
