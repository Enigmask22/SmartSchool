import { useState, useEffect } from "react";
import { usePersonalInfoData } from "@/hooks/profile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, User } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { PersonalInfoSection } from "@/components/profile/PersonalInfoSection";
import { PasswordSection } from "@/components/profile/PasswordSection";
import { TeachingInfoSection } from "@/components/profile/TeachingInfoSection";

const PersonalInfo = () => {
  // Load personal info data via hook (with progressive loading)
  const personalInfo = usePersonalInfoData();

  // Page-level error/success management for combining both hooks
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);

  // Auto-clear messages
  useEffect(() => {
    if (pageSuccess) {
      const timer = setTimeout(() => setPageSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [pageSuccess]);

  useEffect(() => {
    if (pageError) {
      const timer = setTimeout(() => setPageError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [pageError]);

  // Initial data load error
  if (!personalInfo.loading && !personalInfo.personalData && !personalInfo.userData) {
    return (
      <div className="min-h-screen p-6 bg-background space-y-6">
        {/* Header */}
        <PageHeader
          title="Thông tin cá nhân"
          description="Quản lý thông tin cá nhân và tài khoản"
          icon={
            <div className="flex items-center justify-center w-16 h-16 shadow-md rounded-xl bg-blue-600 flex-shrink-0">
              <User className="w-8 h-8 text-white" />
            </div>
          }
        />

        {/* Error Alert */}
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Không thể tải thông tin cá nhân. Vui lòng thử lại sau.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <PageHeader
        title="Thông tin cá nhân"
        description="Quản lý thông tin cá nhân và tài khoản"
        icon={
          <div className="flex items-center justify-center w-16 h-16 shadow-md rounded-xl bg-blue-600 flex-shrink-0">
            <User className="w-8 h-8 text-white" />
          </div>
        }
      />

      {/* Success/Error Messages */}
      {(personalInfo.successMessage || pageSuccess) && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {personalInfo.successMessage || pageSuccess}
          </AlertDescription>
        </Alert>
      )}

      {(personalInfo.error || pageError) && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {personalInfo.error || pageError}
          </AlertDescription>
        </Alert>
      )}

      {/* Personal Info & Password - Side by side with independent loading */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Personal Info Section */}
        <PersonalInfoSection
          personalData={personalInfo.personalData}
          userData={personalInfo.userData}
          loading={personalInfo.loading}
          updating={personalInfo.updating}
          onSave={personalInfo.updateTeacherProfile}
        />

        {/* Password Section - Independent loading and management */}
        <PasswordSection
          onError={setPageError}
          onSuccess={setPageSuccess}
        />
      </div>

      {/* Teaching Info Section — only for teachers/homeroom teachers */}
      {personalInfo.userData?.role !== 'admin' && (
      <TeachingInfoSection
        homeroomClasses={personalInfo.homeroomClasses}
        subjectClasses={personalInfo.subjectClasses}
        loading={personalInfo.loading}
      />
      )}
    </div>
  );
};

export default PersonalInfo;
