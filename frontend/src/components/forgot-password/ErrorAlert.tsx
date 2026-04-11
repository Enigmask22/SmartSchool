import { AlertCircle } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
}

export function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <div className="p-4 mb-4 bg-destructive/10 rounded-md border border-destructive/20">
      <div className="flex">
        <AlertCircle className="w-5 h-5 text-destructive" />
        <div className="ml-3">
          <p className="text-sm text-destructive">{message}</p>
        </div>
      </div>
    </div>
  );
}
