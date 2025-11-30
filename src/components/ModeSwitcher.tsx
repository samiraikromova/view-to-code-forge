import { cn } from "@/lib/utils";

interface ModeSwitcherProps {
  currentMode: "chat" | "learn";
  onModeChange: (mode: "chat" | "learn") => void;
  sidebarCollapsed: boolean;
}

export const ModeSwitcher = ({ currentMode, onModeChange, sidebarCollapsed }: ModeSwitcherProps) => {
  return (
    <div 
      className={cn(
        "fixed top-3 z-50 transition-all duration-300 scale-50",
        sidebarCollapsed ? "left-1/2 -translate-x-1/2" : "left-[calc(50%+80px)] -translate-x-1/2"
      )}
    >
      <div className="bg-surface/80 backdrop-blur-sm rounded-full p-1 flex gap-1 border border-border/50">
        <button
          onClick={() => onModeChange("chat")}
          className={cn(
            "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300",
            currentMode === "chat"
              ? "bg-primary text-primary-foreground shadow-lg"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Chat
        </button>
        <button
          onClick={() => onModeChange("learn")}
          className={cn(
            "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300",
            currentMode === "learn"
              ? "bg-primary text-primary-foreground shadow-lg"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Learn
        </button>
      </div>
    </div>
  );
};
