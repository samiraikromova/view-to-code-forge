import { useState, useRef, ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DelayedTooltipProps {
  children: ReactNode;
  content: ReactNode;
  delay?: number;
  side?: "top" | "right" | "bottom" | "left";
}

export function DelayedTooltip({
  children,
  content,
  delay = 500,
  side = "top",
}: DelayedTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(false);
  };

  return (
    <TooltipProvider>
      <Tooltip open={isOpen}>
        <TooltipTrigger asChild>
          <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent side={side} className="bg-popover text-popover-foreground">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
