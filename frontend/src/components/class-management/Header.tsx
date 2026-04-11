import { GraduationCap } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { PageHeaderControls } from '@/components/common/PageHeader/PageHeaderControls';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface HeaderProps {
  selectedAcademicYear: string | null;
  setSelectedAcademicYear: (value: string) => void;
  selectedGrade: string | null;
  setSelectedGrade: (value: string) => void;
  academicYears: string[];
  loading?: boolean;
}

const Header = ({
  selectedAcademicYear,
  setSelectedAcademicYear,
  selectedGrade,
  setSelectedGrade,
  academicYears,
  loading = false,
}: HeaderProps) => {
  // Build controls section
  const controls = (
    <PageHeaderControls spacing="md">
      {/* Academic Year Selection */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Năm học</label>
        <Select
          value={selectedAcademicYear || 'none'}
          onValueChange={(value) =>
            setSelectedAcademicYear(value === 'none' ? '' : value)
          }
          disabled={loading}
        >
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Chọn năm học" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Chọn năm học</SelectItem>
            {academicYears.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grade Selection */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">Khối</label>
        <Select
          value={selectedGrade || '10'}
          onValueChange={setSelectedGrade}
          disabled={loading}
        >
          <SelectTrigger className="w-full sm:w-[120px]">
            <SelectValue placeholder="Chọn khối" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">Khối 10</SelectItem>
            <SelectItem value="11">Khối 11</SelectItem>
            <SelectItem value="12">Khối 12</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </PageHeaderControls>
  );

  return (
    <PageHeader
      title="Quản lý học sinh"
      description="Quản lý học sinh và lớp học trong hệ thống"
      icon={
        <div className="flex items-center justify-center w-16 h-16 shadow-md rounded-xl bg-blue-600 flex-shrink-0">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
      }
    >
      {controls}
    </PageHeader>
  );
};

export default Header;
