"use client";

import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import type { CheckinCalendar } from "@/lib/server/dailystreakAction";

interface CalendarModalProps {
  userId: string;
  onClose: () => void;
}

export default function CalendarModal({ userId, onClose }: CalendarModalProps) {
  const [calendar, setCalendar] = useState<CheckinCalendar | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchCalendar();
  }, [userId, currentDate.getFullYear(), currentDate.getMonth() + 1]);

  const fetchCalendar = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/daily-streak?action=calendar&userId=${userId}&year=${currentDate.getFullYear()}&month=${currentDate.getMonth() + 1}`
      );
      const result = await response.json();
      if (result.ok) {
        setCalendar(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch calendar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const getThaiDayNames = () => {
    return ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  };

  const getDayColor = (day: any) => {
    if (day.is_today) return "bg-orange-dark/40 text-brown-medium font-semibold";
    if (day.checked_in) return "bg-brown-lightest text-brown-darkest";
    if (day.is_future) return "bg-gray-100 text-gray-400";
    return "bg-white text-brown-medium";
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    // Adjust for Thai calendar (Sunday = 0)
    return firstDay;
  };

  const renderCalendarDays = () => {
    if (!calendar) return null;

    const firstDay = getFirstDayOfMonth(calendar.year, calendar.month);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square"></div>);
    }

    // Calendar days - FIXED: Changed forEach to map and properly return elements
    const calendarDaysElements = calendar.days.map((day) => (
      <div
        key={day.date}
        className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm cursor-pointer hover:opacity-80 transition-opacity ${getDayColor(day)}`}
      >
        <span className="text-xs font-medium">
          {new Date(day.date).getDate()}
        </span>
        {day.checked_in && (
          <Flame className="w-3 h-3 text-orange-500 mt-1" />
        )}
        {day.is_today && (
          <span className="text-xs mt-1">วันนี้</span>
        )}
      </div>
    ));

    return [...days, ...calendarDaysElements];
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-cream rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-tan-light px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-brown-darkest">
            ปฏิทินเช็คอิน
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-brown-lightest rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-brown-medium" />
          </button>
        </div>

        {/* Calendar Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : calendar ? (
            <div className="space-y-4">
              {/* Month Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 hover:bg-brown-lightest rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-brown-medium" />
                </button>
                
                <h3 className="text-lg font-semibold text-brown-darkest">
                  {calendar.month_name} {calendar.year}
                </h3>
                
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 hover:bg-brown-lightest rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-brown-medium" />
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2">
                {getThaiDayNames().map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-semibold text-brown-medium py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {renderCalendarDays()}
              </div>

              {/* Legend */}
              <div className="border-t pt-4 space-y-2">
                <p className="text-sm font-semibold text-brown-darkest mb-2">
                  คำอธิบาย:
                </p>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-dark rounded"></div>
                    <span className="text-brown-medium">วันนี้</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-brown-lightest rounded"></div>
                    <span className="text-brown-medium">เช็คอินแล้ว</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="text-brown-medium">มีสตรีก</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-brown-medium">ไม่สามารถโหลดข้อมูลปฏิทิน</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-tan-light px-6 py-3 border-t">
          <p className="text-xs text-brown-medium text-center">
            🔥 เช็คอินติดต่อกันเพื่อรักษาสตรีกของคุณ!
          </p>
        </div>
      </div>
    </div>
  );
}
