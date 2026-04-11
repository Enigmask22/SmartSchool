/**
 * usePasswordVisibility - Reusable Password Toggle Hook
 * Extracted as common UI behavior
 * Can be used in any password field component
 */

import { useState } from 'react';

export interface UsePasswordVisibilityReturn {
  isVisible: boolean;
  toggle: () => void;
}

/**
 * usePasswordVisibility Hook
 * Manages password visibility state for toggle functionality
 * 
 * Usage in PasswordField component:
 * ```
 * const { isVisible, toggle } = usePasswordVisibility();
 * <input type={isVisible ? 'text' : 'password'} />
 * <button onClick={toggle}>Show/Hide</button>
 * ```
 * 
 * @returns {UsePasswordVisibilityReturn} Visibility state and toggle function
 */
export const usePasswordVisibility = (): UsePasswordVisibilityReturn => {
  const [isVisible, setIsVisible] = useState(false);

  const toggle = () => setIsVisible(prev => !prev);

  return {
    isVisible,
    toggle
  };
};
