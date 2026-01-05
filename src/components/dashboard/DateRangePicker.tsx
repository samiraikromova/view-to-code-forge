import { useState } from "react";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { timePresets } from "@/lib/dashboardUtils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  const [tempRange, setTempRange] = useState<DateRange | undefined>(dateRange);

  const currentPreset = timePresets.find((p) => p.value === selectedPreset) || timePresets[0];

  const handlePresetClick = (preset: TimePreset) => {
    onPresetChange(preset);
    setIsOpen(false);
  };

  const handleApply = () => {
    if (tempRange && onDateRangeChange) {
      onDateRangeChange(tempRange);
    }
    setIsOpen(false);
  };

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
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {/* Preset list */}
          <div className="border-r border-border p-2 space-y-1">
            {timePresets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  "w-full px-3 py-1.5 text-sm text-left rounded-md transition-colors",
                  selectedPreset === preset.value
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom date picker */}
          <div className="p-3">
            <div className="text-xs text-muted-foreground mb-2">Custom Range</div>
            <div className="flex gap-2">
              <Calendar
                mode="single"
                selected={tempRange?.from}
                onSelect={(date) =>
                  date && setTempRange((prev) => ({ ...prev, from: date, to: prev?.to || date }))
                }
                className="pointer-events-auto"
              />
              <Calendar
                mode="single"
                selected={tempRange?.to}
                onSelect={(date) =>
                  date && setTempRange((prev) => ({ ...prev, from: prev?.from || date, to: date }))
                }
                className="pointer-events-auto"
              />
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
