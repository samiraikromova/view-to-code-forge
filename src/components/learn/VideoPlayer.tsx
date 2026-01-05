import { Play, Download, MessageSquare, Calendar, Clock, Users } from "lucide-react";
import { Lesson } from "./LearnSidebar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface VideoPlayerProps {
  lesson: Lesson;
  contentType: "recordings" | "materials";
  onAskAI?: (lessonId: string) => void;
}

export const VideoPlayer = ({ lesson, contentType, onAskAI }: VideoPlayerProps) => {
  const handleDownloadTranscript = async () => {
    if (lesson.transcriptUrl) {
      // Download from URL
      try {
        const response = await fetch(lesson.transcriptUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${lesson.title.replace(/[^a-zA-Z0-9]/g, '_')}_transcript.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Transcript downloaded');
      } catch (error) {
        console.error('Error downloading transcript:', error);
        toast.error('Failed to download transcript');
      }
    }
  };

  // Parse date from title or callDate
  const getCallDate = () => {
    if (lesson.callDate) {
      return new Date(lesson.callDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    // Try to extract date from title like "LC Group Call 11/28"
    const dateMatch = lesson.title.match(/(\d{1,2})\/(\d{1,2})/);
    if (dateMatch) {
      return `${dateMatch[1]}/${dateMatch[2]}`;
    }
    return null;
  };

  const callDate = getCallDate();

  return (
    <div className="space-y-6">
      {/* Video Container */}
      <div className="relative w-full aspect-video bg-surface rounded-2xl overflow-hidden border border-border">
        {lesson.vdocipherId ? (
          <iframe
            src={`https://player.vdocipher.com/v2/?otp=YOUR_OTP&playbackInfo=YOUR_PLAYBACK_INFO`}
            className="w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
                <Play className="h-10 w-10 text-accent fill-accent" />
              </div>
              <p className="text-sm text-muted-foreground">Video will be available soon</p>
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
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {lesson.durationFormatted && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {lesson.durationFormatted}
              </span>
            )}
            {!lesson.durationFormatted && lesson.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {lesson.duration}
              </span>
            )}
            {callDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {callDate}
              </span>
            )}
            {lesson.speakerCount && (
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {lesson.speakerCount} speakers
              </span>
            )}
            {lesson.completed && (
              <span className="text-accent">• Completed</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {lesson.transcriptUrl && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownloadTranscript}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Transcript
              </Button>
              {onAskAI && (
                <Button 
                  variant="default"
                  size="sm"
                  onClick={() => onAskAI(lesson.id)}
                  className="bg-accent hover:bg-accent/90"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Ask AI About This Video
                </Button>
              )}
            </>
          )}
        </div>

        {/* Overview/Summary for Call Recordings */}
        {lesson.overview && (
          <div className="rounded-xl border border-border bg-surface/50 p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Call Summary</h3>
            <p className="text-sm text-muted-foreground">{lesson.overview}</p>
          </div>
        )}

        {/* Keywords */}
        {lesson.keywords && lesson.keywords.length > 0 && (
          <div className="rounded-xl border border-border bg-surface/50 p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {lesson.keywords.map((keyword, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Description/Notes with Enhanced Markdown Styling */}
        {lesson.description && (
          <div className="rounded-xl border border-border bg-surface/30 p-6">
            <h3 className="text-base font-semibold text-foreground mb-4 pb-2 border-b border-border/50">
              Lesson Notes
            </h3>
            <div className="prose prose-sm max-w-none 
              prose-headings:text-foreground prose-headings:font-semibold
              prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border/30
              prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2
              prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-3
              prose-strong:text-foreground prose-strong:font-semibold
              prose-li:text-muted-foreground prose-li:my-1
              prose-ul:my-2 prose-ul:pl-4
              prose-ol:my-2 prose-ol:pl-4
              prose-a:text-accent prose-a:no-underline hover:prose-a:underline
              prose-code:text-accent prose-code:bg-surface prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
              prose-pre:bg-surface prose-pre:border prose-pre:border-border prose-pre:rounded-lg
              prose-blockquote:border-l-accent prose-blockquote:bg-surface/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
              prose-hr:border-border/50
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {lesson.description}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
