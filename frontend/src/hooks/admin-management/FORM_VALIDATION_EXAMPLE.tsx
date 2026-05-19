/**
 * Example: How to integrate useFormValidation hook with admin forms
 * 
 * This example shows how to use the useFormValidation hook with the User creation form.
 * Apply this pattern to all admin management forms (Teachers, Classes, Subjects, etc.)
 */

// import { useState, useEffect, useCallback } from 'react';
// import { useFormValidation } from '@/hooks/admin-management/useFormValidation';
// import api from '@/utils/api';
// import { toast } from 'sonner';

/**
 * User form component with validation
 */
// export function UserFormExample() {
//   const [formData, setFormData] = useState({
//     email: '',
//     username: '',
//     password: '',
//     full_name: '',
//     role: 'student',
//   });

//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [isEditing, setIsEditing] = useState(false);

//   // Initialize validation hook
//   const validation = useFormValidation();

//   // Initialize required fields on mount
//   useEffect(() => {
//     validation.initializeRequiredFields([
//       'email',
//       'username',
//       'password',
//       'full_name',
//       'role',
//     ]);
//   }, []);

//   /**
//    * Handle field change
//    * - Mark field as touched so we can show validation
//    * - Clear existing error for this field (user is fixing it)
//    */
//   const handleFieldChange = useCallback(
//     (field: string, value: any) => {
//       setFormData((prev) => ({
//         ...prev,
//         [field]: value,
//       }));

//       // Mark field as touched for smart error display
//       validation.markFieldTouched(field);

//       // Clear error when user starts typing (provides immediate feedback)
//       validation.clearFieldError(field);
//     },
//     [validation]
//   );

//   /**
//    * Validate required fields before submitting
//    */
//   const validateBeforeSubmit = useCallback((): boolean => {
//     return validation.validateRequired(formData);
//   }, [validation, formData]);

//   /**
//    * Create new user
//    */
//   const handleCreateUser = useCallback(async () => {
//     // Clear all previous errors
//     validation.clearAllErrors();

//     // Validate required fields
//     if (!validateBeforeSubmit()) {
//       toast.error('Vui lòng điền tất cả các trường bắt buộc');
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       const response = await api.post('/admin/users', formData);

//       if (response.success) {
//         // Success - clear form and validation
//         validation.reset();
//         setFormData({
//           email: '',
//           username: '',
//           password: '',
//           full_name: '',
//           role: 'student',
//         });

//         toast.success('Tạo người dùng thành công');
//         // TODO: Close modal, refresh list, etc.
//       } else {
//         // Backend validation error - parse field errors
//         validation.handleApiResponse(response);
        
//         // Show global error if no field errors
//         if (validation.formError) {
//           toast.error(validation.formError);
//         }
//       }
//     } catch (error) {
//       // Network or server error
//       validation.handleError(error);
      
//       if (validation.formError) {
//         toast.error(validation.formError);
//       } else {
//         toast.error('Lỗi khi tạo người dùng');
//       }
//     } finally {
//       setIsSubmitting(false);
//     }
//   }, [formData, validation, validateBeforeSubmit]);

//   /**
//    * Update existing user
//    */
//   const handleUpdateUser = useCallback(
//     async (userId: number) => {
//       // Clear all previous errors
//       validation.clearAllErrors();

//       // Validate required fields
//       if (!validateBeforeSubmit()) {
//         toast.error('Vui lòng điền tất cả các trường bắt buộc');
//         return;
//       }

//       setIsSubmitting(true);

//       try {
//         const response = await api.put(`/admin/users/${userId}`, formData);

//         if (response.success) {
//           validation.reset();
//           toast.success('Cập nhật người dùng thành công');
//         } else {
//           validation.handleApiResponse(response);
//           if (validation.formError) {
//             toast.error(validation.formError);
//           }
//         }
//       } catch (error) {
//         validation.handleError(error);
//         if (validation.formError) {
//           toast.error(validation.formError);
//         } else {
//           toast.error('Lỗi khi cập nhật người dùng');
//         }
//       } finally {
//         setIsSubmitting(false);
//       }
//     },
//     [formData, validation, validateBeforeSubmit]
//   );

//   /**
//    * Render field with validation
//    */
//   const renderField = (field: string, label: string, type = 'text') => {
//     const hasError = validation.shouldShowFieldError(field);
//     const errorMessage = validation.getFieldErrorMessage(field);
//     const isRequired = validation.isFieldRequired(field);

//     return (
//       <div key={field} className="mb-4">
//         <label className="block text-sm font-medium mb-2">
//           {label}
//           {isRequired && <span className="text-red-500 ml-1">*</span>}
//         </label>

//         <input
//           type={type}
//           value={formData[field]}
//           onChange={(e) => handleFieldChange(field, e.target.value)}
//           onBlur={() => validation.markFieldTouched(field)}
//           placeholder={`Nhập ${label}`}
//           className={`w-full px-3 py-2 border rounded-md ${
//             hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
//           }`}
//           disabled={isSubmitting}
//         />

//         {hasError && (
//           <p className="text-red-500 text-sm mt-1">{errorMessage}</p>
//         )}
//       </div>
//     );
//   };

//   /**
//    * Render select field with validation
//    */
//   const renderSelectField = (field: string, label: string, options: { value: string; label: string }[]) => {
//     const hasError = validation.shouldShowFieldError(field);
//     const errorMessage = validation.getFieldErrorMessage(field);
//     const isRequired = validation.isFieldRequired(field);

//     return (
//       <div key={field} className="mb-4">
//         <label className="block text-sm font-medium mb-2">
//           {label}
//           {isRequired && <span className="text-red-500 ml-1">*</span>}
//         </label>

//         <select
//           value={formData[field]}
//           onChange={(e) => handleFieldChange(field, e.target.value)}
//           onBlur={() => validation.markFieldTouched(field)}
//           className={`w-full px-3 py-2 border rounded-md ${
//             hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
//           }`}
//           disabled={isSubmitting}
//         >
//           <option value="">-- Chọn --</option>
//           {options.map((opt) => (
//             <option key={opt.value} value={opt.value}>
//               {opt.label}
//             </option>
//           ))}
//         </select>

//         {hasError && (
//           <p className="text-red-500 text-sm mt-1">{errorMessage}</p>
//         )}
//       </div>
//     );
//   };

//   return (
//     <div className="p-6">
//       <h2 className="text-2xl font-bold mb-6">
//         {isEditing ? 'Cập nhật người dùng' : 'Tạo người dùng mới'}
//       </h2>

//       {/* Global form error */}
//       {validation.formError && (
//         <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md text-red-700">
//           {validation.formError}
//         </div>
//       )}

//       {/* Form fields */}
//       <form>
//         {renderField('email', 'Email', 'email')}
//         {renderField('username', 'Tên đăng nhập')}
//         {renderField('password', 'Mật khẩu', 'password')}
//         {renderField('full_name', 'Họ và tên')}
//         {renderSelectField('role', 'Vai trò', [
//           { value: 'admin', label: 'Quản trị viên' },
//           { value: 'teacher', label: 'Giáo viên' },
//           { value: 'student', label: 'Học sinh' },
//         ])}

//         {/* Submit buttons */}
//         <div className="flex gap-2 mt-6">
//           <button
//             onClick={isEditing ? () => handleUpdateUser(1) : handleCreateUser}
//             disabled={isSubmitting}
//             className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
//           >
//             {isSubmitting ? 'Đang xử lý...' : isEditing ? 'Cập nhật' : 'Tạo mới'}
//           </button>
//           <button
//             onClick={() => {
//               validation.resetAll();
//               setFormData({
//                 email: '',
//                 username: '',
//                 password: '',
//                 full_name: '',
//                 role: 'student',
//               });
//             }}
//             disabled={isSubmitting}
//             className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
//           >
//             Hủy
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// }

/**
 * Key takeaways for implementing in your forms:
 * 
 * 1. Initialize hook and required fields on mount
 * 2. Call markFieldTouched when field is focused/changed
 * 3. Call clearFieldError when user starts fixing a field
 * 4. Call validateRequired before form submission
 * 5. Call handleApiResponse when API returns error
 * 6. Use shouldShowFieldError to conditionally show errors
 * 7. Use getFieldErrorMessage to display error text
 * 8. Use isFieldRequired to show required indicator (*)
 * 
 * This pattern ensures:
 * - Errors only show after user interaction (better UX)
 * - Errors clear immediately as user fixes them (immediate feedback)
 * - Backend validation errors are properly displayed (field-level)
 * - Form state is properly reset after successful submission
 */
