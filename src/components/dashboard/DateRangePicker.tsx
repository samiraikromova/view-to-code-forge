import { useState } from "react";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
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
  const [showCustom, setShowCustom] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(dateRange);

  const currentPreset = timePresets.find((p) => p.value === selectedPreset) || timePresets[4];

  const handlePresetClick = (preset: TimePreset) => {
    if (preset.value === "custom") {
      setShowCustom(true);
    } else {
      onPresetChange(preset);
      setShowCustom(false);
      setIsOpen(false);
    }
  };

  const handleApply = () => {
    if (tempRange && onDateRangeChange) {
      onDateRangeChange(tempRange);
      onPresetChange({ label: "Custom", value: "custom" });
    }
    setIsOpen(false);
    setShowCustom(false);
  };

  const handleCancel = () => {
    setShowCustom(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setShowCustom(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
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
        className="!w-auto p-0 bg-popover border-border z-50" 
        align="end"
        sideOffset={4}
      >
        <div className="flex w-fit">
          {/* Preset list - compact */}
          <div className="py-1">
            {timePresets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  "block px-3 py-1.5 text-sm text-left transition-colors whitespace-nowrap",
                  selectedPreset === preset.value
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom date picker - compact calendars */}
          {showCustom && (
            <div className="border-l border-border p-1.5">
              <div className="text-[10px] text-muted-foreground mb-1">Custom Range</div>
              <div className="flex gap-0.5">
                <Calendar
                  mode="single"
                  selected={tempRange?.from}
                  onSelect={(date) =>
                    date && setTempRange((prev) => ({ ...prev, from: date, to: prev?.to || date }))
                  }
                  className="p-0.5 pointer-events-auto scale-[0.85] origin-top-left [&_td]:p-0 [&_th]:p-0 [&_button]:h-6 [&_button]:w-6 [&_button]:text-[10px] [&_.rdp-caption]:text-xs [&_.rdp-head_button]:text-[10px]"
                />
                <Calendar
                  mode="single"
                  selected={tempRange?.to}
                  onSelect={(date) =>
                    date && setTempRange((prev) => ({ ...prev, from: prev?.from || date, to: date }))
                  }
                  className="p-0.5 pointer-events-auto scale-[0.85] origin-top-left [&_td]:p-0 [&_th]:p-0 [&_button]:h-6 [&_button]:w-6 [&_button]:text-[10px] [&_.rdp-caption]:text-xs [&_.rdp-head_button]:text-[10px]"
                />
              </div>
              <div className="flex justify-end gap-1 mt-1">
                <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button size="sm" className="h-6 text-[10px] px-2" onClick={handleApply}>
                  Apply
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
