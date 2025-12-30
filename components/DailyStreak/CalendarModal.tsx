"use client";

import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import type { CheckinCalendar } from "@/types";

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
    if (day.is_today) return "bg-orange-action text-white shadow-md ring-2 ring-orange-200";
    if (day.checked_in) return "bg-green-success/20 text-green-success border border-green-success/30 font-medium";
    if (day.is_future) return "bg-transparent text-gray-300";
    return "bg-white/50 text-brown-medium hover:bg-tan-light/50 border border-transparent";
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

    // Calendar days
    const calendarDaysElements = calendar.days.map((day) => (
      <div
        key={day.date}
        className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all duration-200 ${getDayColor(day)}`}
      >
        <span className={`text-xs ${day.is_today ? 'font-bold' : 'font-medium'}`}>
          {new Date(day.date).getDate()}
        </span>
        {day.checked_in && (
          <Flame className="w-3.5 h-3.5 fill-current mt-0.5" />
        )}
        {day.is_today && (
          <span className="text-[10px] leading-none mt-0.5 font-medium">วันนี้</span>
        )}
      </div>
    ));

    return [...days, ...calendarDaysElements];
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-cream rounded-3xl max-w-sm w-full max-h-[90vh] overflow-hidden shadow-2xl border-4 border-tan-light scale-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between bg-cream pb-2">
          <h2 className="text-2xl font-bold text-brown-900">
            ปฏิทินเช็คอิน
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-tan-light hover:bg-brown-lightest text-brown-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar Content */}
        <div className="px-6 pb-6 pt-2">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded-lg w-1/2 mx-auto"></div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-200 rounded-xl"></div>
                ))}
              </div>
            </div>
          ) : calendar ? (
            <div className="space-y-4">
              {/* Month Navigation */}
              <div className="flex items-center justify-between bg-tan-light/30 p-2 rounded-2xl">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 bg-white hover:bg-white/80 text-brown-800 rounded-xl shadow-sm transition-all active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <h3 className="text-lg font-bold text-brown-800">
                  {calendar.month_name} {calendar.year}
                </h3>

                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 bg-white hover:bg-white/80 text-brown-800 rounded-xl shadow-sm transition-all active:scale-95"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {getThaiDayNames().map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-bold text-brown-medium/70"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {renderCalendarDays()}
              </div>

              {/* Legend - Simplified and Clean */}
              <div className="pt-4 flex justify-center gap-4 text-xs font-medium border-t border-tan-light/50">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-orange-action ring-1 ring-orange-200"></div>
                  <span className="text-brown-800">วันนี้</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-green-success/20 border border-green-success/50"></div>
                  <span className="text-brown-800">เช็คอินแล้ว</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-brown-medium">ไม่สามารถโหลดข้อมูลปฏิทิน</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
