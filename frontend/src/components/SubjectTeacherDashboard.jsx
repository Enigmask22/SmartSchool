import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SubjectTeacherDashboard = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [academicYear] = useState('2024-2025');
  const [semester] = useState('HK1');
  const [selectedTab, setSelectedTab] = useState('overview'); // overview, attention, top, comparison

  useEffect(() => {
    fetchAnalytics();
  }, [academicYear, semester]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.getTeacherDashboardAnalytics(academicYear, semester);
      if (response.success) {
        setAnalytics(response.data);
      } else {
        console.error('Failed to fetch analytics:', response.message);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-2xl border-2 border-red-200 shadow-lg">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-2xl">⚠️</span>
          </div>
          <p className="text-red-600 font-medium">Không thể tải dữ liệu phân tích. Vui lòng thử lại.</p>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const performanceData = Object.entries(analytics.performance_groups || {}).map(([key, value]) => ({
    name: value.label,
    count: value.count,
    percentage: value.percentage,
    color: value.color
  }));

  const distributionData = Object.entries(analytics.score_distribution || {}).map(([range, count]) => ({
    range,
    count
  }));

  const COLORS = ['#059669', '#2563EB', '#D97706', '#EA580C', '#DC2626'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">📊</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  Dashboard Phân Tích Điểm Số
                </h1>
                <p className="text-gray-600 mt-1">Chào mừng <span className="font-semibold text-blue-600">{user?.full_name}</span></p>
                <div className="flex items-center mt-2 space-x-3 text-sm">
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                    📅 {academicYear}
                  </span>
                  <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-medium">
                    📚 {semester}
                  </span>
                  {analytics.subjects && analytics.subjects.length > 0 && (
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                      📖 {analytics.subjects.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Tổng số lớp dạy</p>
              <h3 className="text-4xl font-bold mt-2 text-blue-600">{analytics.total_classes}</h3>
            </div>
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-3xl">🏫</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-slate-500 hover:shadow-xl transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Tổng số học sinh</p>
              <h3 className="text-4xl font-bold mt-2 text-slate-700">{analytics.total_students}</h3>
              <p className="text-gray-500 text-xs mt-1">
                {analytics.students_with_grades} đã có điểm
              </p>
            </div>
            <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center">
              <span className="text-3xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-emerald-500 hover:shadow-xl transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Điểm trung bình</p>
              <h3 className="text-4xl font-bold mt-2 text-emerald-600">{analytics.overview?.average_score || 0}</h3>
              <p className="text-gray-500 text-xs mt-1">
                Cao nhất: {analytics.overview?.highest_score || 0}
              </p>
            </div>
            <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center">
              <span className="text-3xl">📈</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-amber-500 hover:shadow-xl transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Tỷ lệ đạt</p>
              <h3 className="text-4xl font-bold mt-2 text-amber-600">{analytics.overview?.pass_rate || 0}%</h3>
              <p className="text-gray-500 text-xs mt-1">
                {analytics.overview?.pass_count || 0}/{analytics.students_with_grades} học sinh
              </p>
            </div>
            <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center">
              <span className="text-3xl">✅</span>
            </div>
          </div>
        </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-lg p-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`flex-1 min-w-fit px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                selectedTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="mr-2">📊</span>
              Tổng quan
            </button>
            <button
              onClick={() => setSelectedTab('attention')}
              className={`flex-1 min-w-fit px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                selectedTab === 'attention'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="mr-2">⚠️</span>
              Học sinh cần quan tâm
            </button>
            <button
              onClick={() => setSelectedTab('top')}
              className={`flex-1 min-w-fit px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                selectedTab === 'top'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="mr-2">🏆</span>
              Học sinh xuất sắc
            </button>
            <button
              onClick={() => setSelectedTab('comparison')}
              className={`flex-1 min-w-fit px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                selectedTab === 'comparison'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="mr-2">📉</span>
              So sánh lớp
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {selectedTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Groups - Pie Chart */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">🎯</span>
                Phân nhóm học lực
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={performanceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {performanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [`${value} học sinh (${props.payload.percentage}%)`, 'Số lượng']}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Legend */}
              <div className="mt-4 space-y-2">
                {performanceData.map((group, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: group.color }}></div>
                      <span className="font-medium text-gray-700">{group.name}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-600">{group.count} HS</span>
                      <span className="font-bold text-gray-800">{group.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Score Distribution - Bar Chart */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">📊</span>
                Phân bố điểm số
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={distributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="range" 
                    tick={{ fill: '#6B7280' }}
                    axisLine={{ stroke: '#9CA3AF' }}
                  />
                  <YAxis 
                    tick={{ fill: '#6B7280' }}
                    axisLine={{ stroke: '#9CA3AF' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="count" 
                    fill="#2563EB" 
                    name="Số học sinh"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-slate-50 rounded-lg border border-blue-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Điểm cao nhất</p>
                    <p className="text-2xl font-bold text-green-600">{analytics.overview?.highest_score || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Điểm trung bình</p>
                    <p className="text-2xl font-bold text-blue-600">{analytics.overview?.average_score || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Điểm thấp nhất</p>
                    <p className="text-2xl font-bold text-red-600">{analytics.overview?.lowest_score || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'attention' && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-pink-500 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <span className="mr-2">⚠️</span>
                Học sinh cần quan tâm ({analytics.students_need_attention?.length || 0} học sinh)
              </h3>
              <p className="text-red-100 text-sm mt-1">
                Danh sách học sinh có điểm yếu và kém cần được hỗ trợ thêm
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">STT</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mã HS</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Họ và tên</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lớp</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Điểm TB</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Phân loại</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.students_need_attention && analytics.students_need_attention.length > 0 ? (
                    analytics.students_need_attention.map((student, index) => (
                      <tr key={index} className="hover:bg-red-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-blue-600">{student.student_id}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{student.student_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            {student.class_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-3 py-1 inline-flex text-sm leading-5 font-bold rounded-full ${
                            student.final_grade < 3.5 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {student.final_grade || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            student.category === 'Kém' ? 'bg-red-200 text-red-900' : 'bg-orange-200 text-orange-900'
                          }`}>
                            {student.category}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-3xl">🎉</span>
                          </div>
                          <p className="text-gray-600 font-medium">Tuyệt vời! Không có học sinh nào cần quan tâm đặc biệt</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedTab === 'top' && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-blue-500 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <span className="mr-2">🏆</span>
                Top học sinh xuất sắc ({analytics.top_students?.length || 0} học sinh)
              </h3>
              <p className="text-green-100 text-sm mt-1">
                Danh sách học sinh có thành tích học tập xuất sắc
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Hạng</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mã HS</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Họ và tên</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lớp</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Điểm TB</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.top_students && analytics.top_students.length > 0 ? (
                    analytics.top_students.map((student, index) => (
                      <tr key={index} className="hover:bg-green-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {index === 0 && <span className="text-2xl mr-2">🥇</span>}
                            {index === 1 && <span className="text-2xl mr-2">🥈</span>}
                            {index === 2 && <span className="text-2xl mr-2">🥉</span>}
                            <span className="text-sm font-bold text-gray-900">{index + 1}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-blue-600">{student.student_id}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{student.student_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {student.class_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="px-4 py-2 inline-flex text-lg leading-5 font-bold rounded-full bg-gradient-to-r from-green-400 to-blue-500 text-white shadow-md">
                            {student.final_grade || 0}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-3xl">📚</span>
                          </div>
                          <p className="text-gray-600 font-medium">Chưa có học sinh xuất sắc</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedTab === 'comparison' && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <span className="mr-2">📉</span>
                So sánh kết quả giữa các lớp
              </h3>
              <p className="text-blue-100 text-sm mt-1">
                Phân tích và so sánh thành tích học tập của các lớp
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Hạng</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lớp</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Sĩ số</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">ĐTB</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Cao nhất</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Thấp nhất</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Tỷ lệ đạt</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.class_comparison && analytics.class_comparison.length > 0 ? (
                    analytics.class_comparison.map((classData, index) => (
                      <tr key={index} className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-gray-900">{index + 1}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 inline-flex text-sm leading-5 font-bold rounded-full bg-blue-100 text-blue-800">
                            {classData.class_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm text-gray-900">{classData.student_count}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="px-3 py-1 inline-flex text-sm leading-5 font-bold rounded-full bg-purple-100 text-purple-800">
                            {classData.average_score}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm font-semibold text-green-600">{classData.highest_score}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm font-semibold text-red-600">{classData.lowest_score}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full"
                                style={{ width: `${classData.pass_rate}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-bold text-gray-900">{classData.pass_rate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-3xl">📊</span>
                          </div>
                          <p className="text-gray-600 font-medium">Chưa có dữ liệu để so sánh</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectTeacherDashboard;

