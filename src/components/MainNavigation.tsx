import { cn } from "@/lib/utils";

type NavigationMode = "dashboard" | "chat" | "learn";

interface NavItem {
  id: NavigationMode;
  label: string;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "chat", label: "Chat" },
  { id: "learn", label: "Learn" },
];

interface MainNavigationProps {
  currentMode: NavigationMode;
  onModeChange: (mode: NavigationMode) => void;
}

export function MainNavigation({ currentMode, onModeChange }: MainNavigationProps) {
  return (
    <nav className="flex items-center gap-6">
      {navItems.map((item) => {
        const isActive = currentMode === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onModeChange(item.id)}
            className={cn(
              "text-sm font-medium transition-all duration-200",
              isActive
                ? "text-foreground drop-shadow-[0_0_8px_hsl(var(--foreground)/0.4)]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

export type { NavigationMode };
