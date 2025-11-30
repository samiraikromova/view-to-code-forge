import { Play } from "lucide-react";
import { Lesson } from "./LearnSidebar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface VideoPlayerProps {
  lesson: Lesson;
}

export const VideoPlayer = ({ lesson }: VideoPlayerProps) => {
  return (
    <div className="space-y-6">
      {/* Video Container */}
      <div className="relative w-full aspect-video bg-surface rounded-2xl overflow-hidden border border-border">
        {lesson.embedUrl ? (
          <iframe
            src={lesson.embedUrl}
            className="w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
                <Play className="h-10 w-10 text-accent fill-accent" />
              </div>
              <p className="text-sm text-muted-foreground">Video player placeholder</p>
            </div>
          </div>
        )}
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

        {lesson.description && (
          <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-h2:text-lg prose-h2:font-semibold prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-base prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {lesson.description}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
