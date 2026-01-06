import { Video, BookOpen } from "lucide-react";
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
          "flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
          contentType === "recordings"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Video className="w-4 h-4" />
        Call Recordings
      </button>
      <button
        onClick={() => onContentTypeChange("materials")}
        className={cn(
          "flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
          contentType === "materials"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <BookOpen className="w-4 h-4" />
        Course Material
      </button>
    </div>
  );
}
