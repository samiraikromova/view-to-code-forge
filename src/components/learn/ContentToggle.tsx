import { cn } from "@/lib/utils";

interface ContentToggleProps {
  contentType: "recordings" | "materials";
  onContentTypeChange: (type: "recordings" | "materials") => void;
  isCollapsed: boolean;
}

export const ContentToggle = ({ contentType, onContentTypeChange, isCollapsed }: ContentToggleProps) => {
  if (isCollapsed) return null;

  return (
    <div className="p-3">
      <div className="bg-surface/50 rounded-full p-1 flex gap-1 border border-border/30">
        <button
          onClick={() => onContentTypeChange("recordings")}
          className={cn(
            "flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
            contentType === "recordings"
              ? "bg-accent/20 text-accent"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Call Recordings
        </button>
        <button
          onClick={() => onContentTypeChange("materials")}
          className={cn(
            "flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
            contentType === "materials"
              ? "bg-accent/20 text-accent"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Course Material
        </button>
      </div>
    </div>
  );
};
