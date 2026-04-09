interface Step1FormProps {
  formData: { username: string; otpEmail: string };
  loading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onBackClick: () => void;
}

export function Step1Form({
  formData,
  loading,
  onInputChange,
  onSubmit,
  onBackClick,
}: Step1FormProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Quên mật khẩu?</h2>
        <p className="mt-2 text-sm text-gray-600">
          Nhập username đăng nhập và email nhận OTP để đặt lại mật khẩu
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
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
              onChange={onInputChange}
              className="block px-3 py-2 w-full placeholder-gray-400 rounded-md border border-gray-300 appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="nguyen_van_an"
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
              onChange={onInputChange}
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
            onClick={onBackClick}
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
}
