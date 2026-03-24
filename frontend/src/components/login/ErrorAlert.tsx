/**
 * ErrorAlert - Error message display component
 */
import { AlertCircle } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
}

export function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <div className="flex items-center space-x-2 p-4 bg-red-50 rounded-lg border border-red-200">
      <AlertCircle className="w-5 h-5 text-red-500" />
      <p className="text-sm text-red-800">{message}</p>
    </div>
  );
}
