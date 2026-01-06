import { useState, useRef, useEffect } from "react";
import { LayoutDashboard, MessageCircle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

type NavigationMode = "dashboard" | "chat" | "learn";

interface NavItem {
  id: NavigationMode;
  icon: typeof LayoutDashboard;
  label: string;
}

const navItems: NavItem[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "chat", icon: MessageCircle, label: "Chat" },
  { id: "learn", icon: Lightbulb, label: "Learn" },
];

interface DelayedTooltipProps {
  children: React.ReactNode;
  content: string;
  show: boolean;
}

const DelayedTooltip: React.FC<DelayedTooltipProps> = ({ children, content, show }) => {
  return (
    <div className="relative flex items-center">
      {children}
      {show && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-foreground whitespace-nowrap shadow-xl z-50 animate-fade-in">
          {content}
          <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-surface border-t border-l border-border transform rotate-45"></div>
        </div>
      )}
    </div>
  );
};

interface MainNavigationProps {
  currentMode: NavigationMode;
  onModeChange: (mode: NavigationMode) => void;
}

export function MainNavigation({ currentMode, onModeChange }: MainNavigationProps) {
  const [hoveredItem, setHoveredItem] = useState<NavigationMode | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });

  // Calculate pill position based on active item
  useEffect(() => {
    const calculatePillPosition = () => {
      if (navRef.current) {
        const activeIndex = navItems.findIndex((item) => item.id === currentMode);
        const buttons = navRef.current.querySelectorAll("button");
        if (buttons[activeIndex]) {
          const button = buttons[activeIndex] as HTMLElement;
          setPillStyle({
            left: button.offsetLeft,
            width: button.offsetWidth,
          });
        }
      }
    };
    
    // Calculate immediately
    calculatePillPosition();
    
    // Recalculate after a short delay to handle layout shifts
    const timeout = setTimeout(calculatePillPosition, 50);
    return () => clearTimeout(timeout);
  }, [currentMode]);

  const handleMouseEnter = (itemId: NavigationMode) => {
    if (itemId === currentMode) return;
    setHoveredItem(itemId);
    timerRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setHoveredItem(null);
    setShowTooltip(false);
  };

  return (
    <div
      ref={navRef}
      className="relative flex items-center gap-1 p-1 rounded-full bg-surface/60 border border-border/50 backdrop-blur-md"
    >
      {/* Sliding pill indicator */}
      <div
        className="absolute h-[calc(100%-8px)] rounded-full bg-primary/80 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(155,107,158,0.4)]"
        style={{
          left: pillStyle.left,
          width: pillStyle.width,
        }}
      />

      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentMode === item.id;
        const isHovered = hoveredItem === item.id;

        return (
          <DelayedTooltip
            key={item.id}
            content={item.label}
            show={isHovered && showTooltip && !isActive}
          >
            <button
              onClick={() => onModeChange(item.id)}
              onMouseEnter={() => handleMouseEnter(item.id)}
              onMouseLeave={handleMouseLeave}
              className={cn(
                "relative z-10 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200",
                isActive
                  ? "text-primary-foreground scale-110"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-hover/50"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-all duration-200",
                  isActive && "stroke-[2.5]"
                )}
              />
            </button>
          </DelayedTooltip>
        );
      })}
    </div>
  );
}

export type { NavigationMode };
