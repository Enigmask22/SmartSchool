import React from 'react';
import { Settings, BarChart3 } from 'lucide-react';

interface NoScoreConfigStateProps {
  onCreateConfig: () => void;
}

const NoScoreConfigState = ({
  onCreateConfig,
}: NoScoreConfigStateProps) => {
  return (
    <div className="py-12 text-center bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 bg-blue-100 rounded-full">
        <BarChart3 className="w-8 h-8" />
      </div>
      <h3 className="mb-2 text-lg font-bold text-gray-800">
        Chưa có cấu hình cột điểm
      </h3>
      <p className="mb-6 text-gray-600">
        Môn học này chưa có cấu hình cột điểm. Hãy tạo cấu hình để bắt đầu
        nhập điểm.
      </p>
      <button
        onClick={onCreateConfig}
        className="inline-flex items-center px-6 py-3 space-x-2 font-medium text-white transition-colors bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 hover:shadow-md"
      >
        <Settings className="w-4 h-4" />
        <span>Tạo cấu hình cột điểm</span>
      </button>
    </div>
  );
};

export default NoScoreConfigState;
