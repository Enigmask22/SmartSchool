/**
 * ForgotPassword.jsx - Password Recovery Page Component
 * 
 * Main forgot password page component
 * - Manages 3-step password recovery flow via useForgotPassword hook
 * - Displays error/success messages  
 * - Handles step navigation
 */

import { Card, CardContent } from '@/components/ui/card';
import { useForgotPassword } from '@/hooks/useForgotPassword';
import {
  ForgotPasswordHeader,
  ErrorAlert,
  SuccessAlert,
  Step1Form,
  Step2Form,
  Step3Form,
} from '@/components/forgot-password';


/**
 * ForgotPassword - 3-step password recovery component
 * 
 * Step 1: Enter username and email to receive OTP
 * Step 2: Enter 6-digit OTP code
 * Step 3: Set new password
 */
export function ForgotPassword() {
  const {
    step,
    formData,
    loading,
    error,
    success,
    otpInputs,
    handleInputChange,
    handleOTPChange,
    handleOTPKeyDown,
    handleOTPPaste,
    handleStep1Submit,
    handleStep2Submit,
    handleStep3Submit,
    goToStep,
  } = useForgotPassword();

  return (
    <div
      className="flex justify-center items-center p-4 min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/background_login.png)',
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/40"></div>

      <div className="relative z-10 space-y-8 w-full max-w-md">
        {/* Header */}
        <ForgotPasswordHeader />

        {/* Form */}
        <Card>
          <CardContent className="p-6">
            {/* Error Message */}
            {error && <ErrorAlert message={error} />}

            {/* Success Message */}
            {success && <SuccessAlert message={success} />}

            {/* Step 1: Username and Email */}
            {step === 1 && (
              <Step1Form
                formData={formData}
                loading={loading}
                onInputChange={handleInputChange}
                onSubmit={handleStep1Submit}
                onBackClick={() => window.location.href = '/login'}
              />
            )}

            {/* Step 2: OTP Verification */}
            {step === 2 && (
              <Step2Form
                formData={formData}
                loading={loading}
                otpInputs={otpInputs}
                onOTPChange={handleOTPChange}
                onOTPKeyDown={handleOTPKeyDown}
                onOTPPaste={handleOTPPaste}
                onSubmit={handleStep2Submit}
                onBackClick={() => goToStep(1)}
              />
            )}

            {/* Step 3: New Password */}
            {step === 3 && (
              <Step3Form
                formData={formData}
                loading={loading}
                onInputChange={handleInputChange}
                onSubmit={handleStep3Submit}
                onBackClick={() => goToStep(2)}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ForgotPassword;
