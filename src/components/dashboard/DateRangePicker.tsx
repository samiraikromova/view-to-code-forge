import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { timePresets } from "@/lib/dashboardUtils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TimePreset, DateRange } from "@/types/dashboard";

interface DateRangePickerProps {
  selectedPreset: string;
  dateRange?: DateRange;
  onPresetChange: (preset: TimePreset) => void;
  onDateRangeChange?: (range: DateRange) => void;
  className?: string;
}

export function DateRangePicker({
  selectedPreset,
  dateRange,
  onPresetChange,
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [nextMonth, setNextMonth] = useState(
    new Date(new Date().setMonth(new Date().getMonth() + 1))
  );
  const [selectionStart, setSelectionStart] = useState<Date | null>(
    dateRange?.from || null
  );
  const [selectionEnd, setSelectionEnd] = useState<Date | null>(
    dateRange?.to || null
  );
  const [selectingEnd, setSelectingEnd] = useState(false);

  const currentPreset =
    timePresets.find((p) => p.value === selectedPreset) || timePresets[4];

  useEffect(() => {
    setSelectionStart(dateRange?.from || null);
    setSelectionEnd(dateRange?.to || null);
    setSelectingEnd(false);
  }, [dateRange?.from, dateRange?.to]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDay - i),
      });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i),
      });
    }
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i),
      });
    }
    return days;
  };

  const navigateMonth = (direction: number) => {
    const newCurrent = new Date(currentMonth);
    newCurrent.setMonth(newCurrent.getMonth() + direction);
    setCurrentMonth(newCurrent);

    const newNext = new Date(nextMonth);
    newNext.setMonth(newNext.getMonth() + direction);
    setNextMonth(newNext);
  };

  const handleDayClick = (date: Date) => {
    if (!selectingEnd || !selectionStart) {
      setSelectionStart(date);
      setSelectionEnd(null);
      setSelectingEnd(true);
    } else {
      if (date < selectionStart) {
        setSelectionEnd(selectionStart);
        setSelectionStart(date);
      } else {
        setSelectionEnd(date);
      }
      setSelectingEnd(false);
    }
  };

  const handleApply = () => {
    if (selectionStart && selectionEnd && onDateRangeChange) {
      onDateRangeChange({ from: selectionStart, to: selectionEnd });
      onPresetChange({ label: "Custom", value: "custom" });
    }
    setIsOpen(false);
  };

  const handlePresetClick = (preset: TimePreset) => {
    if (preset.value === "custom") {
      // Set custom preset to show calendar, but stay open
      onPresetChange(preset);
    } else {
      onPresetChange(preset);
      setIsOpen(false);
    }
  };

  const isToday = (date: Date) =>
    date.toDateString() === new Date().toDateString();
  const isInRange = (date: Date) =>
    selectionStart &&
    selectionEnd &&
    date >= selectionStart &&
    date <= selectionEnd;
  const isRangeStart = (date: Date) =>
    selectionStart &&
    date.toDateString() === selectionStart.toDateString();
  const isRangeEnd = (date: Date) =>
    selectionEnd && date.toDateString() === selectionEnd.toDateString();

  const renderCalendar = (month: Date, showPrevNav: boolean) => (
    <div className="w-[240px]">
      <div className="flex items-center justify-between mb-3">
        {showPrevNav ? (
          <button
            onClick={() => navigateMonth(-1)}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-6" />
        )}
        <span className="text-sm font-semibold text-foreground">
          {month.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </span>
        {!showPrevNav ? (
          <button
            onClick={() => navigateMonth(1)}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-6" />
        )}
      </div>
      <div className="grid grid-cols-7 text-center">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day, i) => (
          <div
            key={i}
            className="text-[10px] font-medium py-1 text-muted-foreground"
          >
            {day}
          </div>
        ))}
        {getDaysInMonth(month).map((dayObj, idx) => {
          const inRange =
            isInRange(dayObj.date) &&
            !isRangeStart(dayObj.date) &&
            !isRangeEnd(dayObj.date);
          const isStart = isRangeStart(dayObj.date);
          const isEnd = isRangeEnd(dayObj.date);
          const today = isToday(dayObj.date);

          return (
            <button
              key={idx}
              onClick={() => handleDayClick(dayObj.date)}
              className={cn(
                "h-8 w-full text-xs transition-colors flex items-center justify-center relative hover:bg-muted",
                !dayObj.isCurrentMonth && "text-muted-foreground/40",
                dayObj.isCurrentMonth && "text-foreground",
                (isStart || isEnd) && "bg-accent text-white font-semibold",
                inRange && "bg-accent/30",
                isStart && "rounded-l-md",
                isEnd && "rounded-r-md",
                !isStart && !isEnd && !inRange && "rounded-md"
              )}
            >
              {today && !isStart && !isEnd && (
                <span className="absolute inset-0 border border-primary rounded-md pointer-events-none" />
              )}
              {dayObj.day}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-between gap-2 bg-surface/60 border-border/50 hover:bg-surface",
            className
          )}
        >
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          <span>{currentPreset.label}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-popover border-border z-50"
        align="end"
        sideOffset={4}
      >
        <div className="flex">
          {/* Preset list */}
          <div className="py-2 border-r border-border flex flex-col">
            {timePresets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  "text-left px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap",
                  selectedPreset === preset.value
                    ? "text-white bg-primary/80 border-l-[3px] border-primary"
                    : "text-muted-foreground border-l-[3px] border-transparent hover:bg-muted/50"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom calendar section */}
          {selectedPreset === "custom" && (
            <div className="p-4">
              <div className="flex gap-6">
                {renderCalendar(currentMonth, true)}
                {renderCalendar(nextMonth, false)}
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {selectionStart?.toLocaleDateString() || "Select start"} -{" "}
                  {selectionEnd?.toLocaleDateString() || "Select end"}
                </span>
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleApply}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
