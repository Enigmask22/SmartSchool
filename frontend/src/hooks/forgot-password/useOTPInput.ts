/**
 * useOTPInput - Reusable OTP Input Management Hook
 * Handles 6-digit OTP input behavior with auto-focus and validation
 * 
 * This is a reusable hook that can be used anywhere 6-digit OTP input is needed
 */

import { useRef } from 'react';

export interface UseOTPInputReturn {
  otpInputs: React.RefObject<HTMLInputElement>[];
  handleOTPChange: (index: number, value: string) => string;
  handleOTPKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleOTPPaste: (e: React.ClipboardEvent<HTMLInputElement>) => string | null;
}

/**
 * useOTPInput Hook
 * Manages 6-digit OTP input behavior
 * 
 * Features:
 * - Digit-only validation
 * - Auto-focus to next field on digit entry
 * - Backspace navigation to previous field
 * - Paste support (extracts 6 digits from clipboard)
 * 
 * @returns {UseOTPInputReturn} OTP input handlers and refs
 */
export const useOTPInput = (): UseOTPInputReturn => {
  // Create 6 refs for OTP input fields
  const otpInputs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));

  /**
   * Handle OTP digit input
   * - Only allows single digits
   * - Auto-focuses next field
   * 
   * @param index - Current input field index
   * @param value - Input value
   * @returns Updated OTP string with digit at given index
   */
  const handleOTPChange = (index: number, value: string): string => {
    // Only accept single digit
    if (!/^\d*$/.test(value) || value.length > 1) return '';
    
    // If this is the first call from a specific field, that field gets the digit
    if (value && index < 5 && otpInputs[index + 1].current) {
      otpInputs[index + 1].current?.focus();
    }
    
    return value;
  };

  /**
   * Handle OTP keydown events (backspace navigation)
   * When backspace is pressed on empty field, focus moves to previous field
   * 
   * @param index - Current input field index
   * @param e - Keyboard event
   */
  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>): void => {
    const target = e.currentTarget;
    if (e.key === 'Backspace' && !target.value && index > 0) {
      otpInputs[index - 1].current?.focus();
    }
  };

  /**
   * Handle OTP paste - extract 6 digits from clipboard
   * If clipboard contains exactly 6 digits, fills all fields
   * 
   * @param e - Clipboard event
   * @returns Extracted 6-digit OTP or null if invalid
   */
  const handleOTPPaste = (e: React.ClipboardEvent<HTMLInputElement>): string | null => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData.length === 6) {
      // Focus last field after paste
      otpInputs[5].current?.focus();
      return pastedData;
    }
    
    return null;
  };

  return {
    otpInputs,
    handleOTPChange,
    handleOTPKeyDown,
    handleOTPPaste
  };
};
