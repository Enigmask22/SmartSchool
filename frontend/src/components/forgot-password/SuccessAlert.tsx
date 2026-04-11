import { CheckCircle } from 'lucide-react';

interface SuccessAlertProps {
  message: string;
}

export function SuccessAlert({ message }: SuccessAlertProps) {
  return (
    <div className="p-4 mb-4 bg-green-50 rounded-md border border-green-200">
      <div className="flex">
        <CheckCircle className="w-5 h-5 text-green-400" />
        <div className="ml-3">
          <p className="text-sm text-green-800">{message}</p>
        </div>
      </div>
    </div>
  );
}
