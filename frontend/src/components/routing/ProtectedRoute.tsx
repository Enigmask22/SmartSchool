import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '@/contexts/AuthContext';

const ProtectedRoute = ({ roles }: { roles: string[] }) => {
  const authContext = useContext(AuthContext);

  // Handle case where context is not provided
  if (!authContext) {
    return <Navigate to="/login" replace />;
  }

  const { user, loading, isAdmin, isHomeroomTeacher, isSubjectTeacher } = authContext;

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check permissions
  let hasPermission = false;
  
  if (roles.includes('admin') && isAdmin()) hasPermission = true;
  if (roles.includes('homeroom_teacher') && isHomeroomTeacher()) hasPermission = true;
  if (roles.includes('subject_teacher') && isSubjectTeacher()) hasPermission = true;
  // Generic teacher check
  if (roles.includes('teacher') && (isHomeroomTeacher() || isSubjectTeacher())) hasPermission = true;

  if (!hasPermission) {
    // Redirect to a "Not Authorized" page or the main dashboard
    return <div className="p-8 text-center text-red-500">Bạn không có quyền truy cập trang này.</div>;
  }

  return <Outlet />;
};

export default ProtectedRoute;
