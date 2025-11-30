import { Play } from "lucide-react";
import { Lesson } from "./LearnSidebar";

interface VideoPlayerProps {
  lesson: Lesson;
}

export const VideoPlayer = ({ lesson }: VideoPlayerProps) => {
  return (
    <div className="space-y-6">
      {/* Video Container */}
      <div className="relative w-full aspect-video bg-surface rounded-2xl overflow-hidden border border-border">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
              <Play className="h-10 w-10 text-accent fill-accent" />
            </div>
            <p className="text-sm text-muted-foreground">Video player placeholder</p>
          </div>
        </div>
      </div>

      {/* Lesson Info */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            {lesson.title}
          </h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{lesson.duration}</span>
            {lesson.completed && (
              <span className="text-accent">• Completed</span>
            )}
          </div>
        </div>

        <div className="prose prose-sm max-w-none">
          <p className="text-muted-foreground">
            {lesson.description || "This is a placeholder for the lesson description and additional materials. You can add transcripts, notes, resources, and other content here."}
          </p>
        </div>
      </div>
    </div>
  );
};
