import { OTPInput } from './OTPInput';

interface Step2FormProps {
  formData: { otp: string; otpEmail: string };
  loading: boolean;
  otpInputs: React.RefObject<HTMLInputElement>[];
  onOTPChange: (index: number, value: string) => void;
  onOTPKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onOTPPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onBackClick: () => void;
}

export function Step2Form({
  formData,
  loading,
  otpInputs,
  onOTPChange,
  onOTPKeyDown,
  onOTPPaste,
  onSubmit,
  onBackClick,
}: Step2FormProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Nhập mã OTP</h2>
        <p className="mt-2 text-sm text-white/90">
          Mã OTP đã được gửi đến <strong className="text-white">{formData.otpEmail}</strong>
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label className="block mb-3 text-sm font-medium text-gray-700">
            Mã OTP (6 số)
          </label>
          <div className="flex justify-center space-x-3">
            {Array.from({ length: 6 }, (_, index) => (
              <OTPInput
                key={index}
                value={formData.otp[index] || ''}
                onChange={(value) => onOTPChange(index, value)}
                onKeyDown={(e) => onOTPKeyDown(index, e)}
                onPaste={onOTPPaste}
                inputRef={otpInputs[index]}
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
            onClick={onBackClick}
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
}
