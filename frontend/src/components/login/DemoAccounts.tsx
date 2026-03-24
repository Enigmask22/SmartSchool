/**
 * DemoAccounts - Demo credentials display
 */

export function DemoAccounts() {
  return (
    <div className="pt-6 mt-6 border-t border-gray-200">
      <div className="text-center">
        <p className="mb-3 text-xs text-gray-500">Tài khoản demo:</p>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="p-2 bg-gray-50 rounded-lg">
            <strong>Admin:</strong> admin.chuyen_le_quy_don.tphcm / password
          </div>
          <div className="p-2 bg-gray-50 rounded-lg">
            <strong>Giáo viên:</strong> nguyen_thi_lan.chuyen_le_quy_don.tphcm / password
          </div>
        </div>
      </div>
    </div>
  );
}
