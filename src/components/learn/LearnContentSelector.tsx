import { cn } from "@/lib/utils";

interface LearnContentSelectorProps {
  contentType: "recordings" | "materials";
  onContentTypeChange: (type: "recordings" | "materials") => void;
}

export function LearnContentSelector({ contentType, onContentTypeChange }: LearnContentSelectorProps) {
  return (
    <div className="inline-flex items-center rounded-lg bg-surface/60 border border-border/50 p-1">
      <button
        onClick={() => onContentTypeChange("recordings")}
        className={cn(
          "px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 hover:scale-105",
          contentType === "recordings"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-surface/80"
        )}
      >
        Call Recordings
      </button>
      <button
        onClick={() => onContentTypeChange("materials")}
        className={cn(
          "px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 hover:scale-105",
          contentType === "materials"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-surface/80"
        )}
      >
        Course Material
      </button>
    </div>
  );
}
