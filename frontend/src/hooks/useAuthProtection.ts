/**
 * useAuthProtection - Reusable Authentication Protection Hook
 * Protects routes by redirecting to login if user is not authenticated
 * 
 * Reusable across multiple protected pages/components
 */

import { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '@/contexts/AuthContext';

/**
 * useAuthProtection Hook
 * Protects a route by requiring authentication
 * 
 * Features:
 * - Redirects to login if user is not authenticated
 * - Uses replace: true to prevent back navigation to login
 * - Works on component mount
 * 
 * Usage:
 * ```
 * export function ProtectedPage() {
 *   useAuthProtection();
 *   // Rest of component can assume user is authenticated
 * }
 * ```
 * 
 * @returns void (side effect only - performs redirect or nothing)
 */
export const useAuthProtection = (): void => {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login if user is not authenticated
    if (!authContext?.isAuthenticated?.()) {
      navigate('/login', { replace: true });
    }
  }, [authContext, navigate]);
};
