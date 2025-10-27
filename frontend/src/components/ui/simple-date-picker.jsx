import * as React from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTHS = [
  "Tháng Một",
  "Tháng Hai",
  "Tháng Ba",
  "Tháng Tư",
  "Tháng Năm",
  "Tháng Sáu",
  "Tháng Bảy",
  "Tháng Tám",
  "Tháng Chín",
  "Tháng Mười",
  "Tháng Mười Một",
  "Tháng Mười Hai",
];

export function SimpleDatePicker({
  value,
  onChange,
  placeholder = "Chọn ngày",
  className,
}) {
  const [open, setOpen] = React.useState(false);

  // Parse value (YYYY-MM-DD) to Date
  const selectedDate = value ? new Date(value + "T00:00:00") : null;

  // Current viewing month/year
  const [viewDate, setViewDate] = React.useState(() => {
    return selectedDate || new Date();
  });

  // Generate year range (from 1950 to current year + 10)
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 1950 + 11 },
    (_, i) => 1950 + i
  );

  const formatDate = (date) => {
    if (!date) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDateClick = (day) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const newDate = new Date(year, month, day);

    // Convert to YYYY-MM-DD
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    onChange(dateStr);
    setOpen(false);
  };

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleMonthChange = (e) => {
    const newMonth = parseInt(e.target.value);
    setViewDate(new Date(viewDate.getFullYear(), newMonth, 1));
  };

  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value);
    setViewDate(new Date(newYear, viewDate.getMonth(), 1));
  };

  const handleToday = () => {
    const today = new Date();
    setViewDate(today);
    const dateStr = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    onChange(dateStr);
    setOpen(false);
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const today = new Date();
    const isToday = (day) => {
      return (
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === day
      );
    };

    const isSelected = (day) => {
      if (!selectedDate) return false;
      return (
        selectedDate.getFullYear() === year &&
        selectedDate.getMonth() === month &&
        selectedDate.getDate() === day
      );
    };

    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-9 w-9" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isTodayDate = isToday(day);
      const isSelectedDate = isSelected(day);

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          className={cn(
            "h-9 w-9 rounded-md text-sm font-normal transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isTodayDate && "bg-accent font-medium",
            isSelectedDate &&
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
          )}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="w-4 h-4 mr-2" />
          {value ? formatDate(selectedDate) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 space-y-3">
          {/* Header with month/year selectors and navigation */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="icon"
              className="flex-shrink-0 h-9 w-9"
              onClick={handlePrevMonth}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="flex gap-2 flex-1 min-w-[240px]">
              {/* Month selector */}
              <select
                value={viewDate.getMonth()}
                onChange={handleMonthChange}
                className="flex-1 min-w-[140px] h-9 py-1 px-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {MONTHS.map((month, index) => (
                  <option key={index} value={index}>
                    {month}
                  </option>
                ))}
              </select>

              {/* Year selector */}
              <select
                value={viewDate.getFullYear()}
                onChange={handleYearChange}
                className="w-[80px] h-9 py-1 px-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="flex-shrink-0 h-9 w-9"
              onClick={handleNextMonth}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {DAYS.map((day) => (
              <div
                key={day}
                className="flex items-center justify-center text-xs font-medium h-9 w-9 text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>

          {/* Footer with Today button */}
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={handleToday}
            >
              Hôm nay
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
