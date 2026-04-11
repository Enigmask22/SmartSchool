// React already imported by JSX transform
import { BarChart3, Zap } from 'lucide-react';

interface StatisticsPanelProps {
  totalRecognitions: number;
  uniqueStudents: number;
  runningTime: number;
  isConnected: boolean;
  cooldownPeriod: number;
  totalRecognitionsToday: number;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const StatisticsPanel = ({
  totalRecognitions,
  uniqueStudents,
  runningTime,
  isConnected,
  cooldownPeriod,
  totalRecognitionsToday,
}: StatisticsPanelProps) => {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {/* Recognition Stats Card */}
      <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-md rounded-2xl border-blue-500 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Thống kê nhận diện</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Tổng nhận diện:</span>
                <span className="text-2xl font-bold text-blue-600">
                  {totalRecognitions}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Học sinh unique:</span>
                <span className="text-xl font-bold text-green-600">
                  {uniqueStudents}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Thời gian chạy:</span>
                <span className="text-sm font-bold text-purple-600">
                  {formatDuration(runningTime)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center bg-blue-100 w-14 h-14 rounded-xl flex-shrink-0">
            <BarChart3 className="text-blue-600 w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Today's Statistics Card */}
      <div className="p-6 transition-shadow duration-200 bg-white border-l-4 shadow-md rounded-2xl border-cyan-500 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Thống kê hôm nay</p>
            <p className="text-xs text-gray-500 mt-1">Phiên hiện tại</p>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Tổng điểm danh:</span>
                <span className="text-2xl font-bold text-green-600">
                  {totalRecognitionsToday}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Thời gian chờ:</span>
                <span className="text-lg font-bold text-cyan-600">
                  {cooldownPeriod}s
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center bg-cyan-100 w-14 h-14 rounded-xl flex-shrink-0">
            <BarChart3 className="text-cyan-600 w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Connection Status Card */}
      <div className={`p-6 transition-shadow duration-200 bg-white border-l-4 shadow-md rounded-2xl ${isConnected ? 'border-green-500' : 'border-red-500'} hover:shadow-lg`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Trạng thái hệ thống</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 pr-1">Kết nối:</span>
                <span className={`text-lg font-bold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {isConnected ? 'Bình thường' : 'Mất kết nối'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Trạng thái:</span>
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {isConnected ? 'Sẵn sàng' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          <div className={`flex items-center justify-center w-14 h-14 rounded-xl flex-shrink-0 ${isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
            <Zap className={`w-7 h-7 ${isConnected ? 'text-green-600' : 'text-red-600'}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPanel;
