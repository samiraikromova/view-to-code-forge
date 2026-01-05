import { useState, useEffect, useRef } from "react";
import { Play, Download, MessageSquare, Calendar, Clock, Users } from "lucide-react";
import { Lesson } from "./LearnSidebar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface VideoPlayerProps {
  lesson: Lesson;
  contentType: "recordings" | "materials";
  onAskAI?: (lessonId: string) => void;
  onVideoComplete?: (lessonId: string) => void;
}

export const VideoPlayer = ({ lesson, contentType, onAskAI, onVideoComplete }: VideoPlayerProps) => {
  const { user } = useAuth();
  const [videoOtp, setVideoOtp] = useState<string | null>(null);
  const [playbackInfo, setPlaybackInfo] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasMarkedComplete = useRef(false);

  // Fetch OTP when lesson changes
  useEffect(() => {
    hasMarkedComplete.current = false; // Reset on lesson change
    
    const fetchOtp = async () => {
      if (!lesson.vdocipherId) return;
      
      setVideoLoading(true);
      setVideoError(null);
      
      try {
        const { data, error } = await supabase.functions.invoke('vdocipher-otp', {
          body: { videoId: lesson.vdocipherId }
        });
        
        if (error) {
          console.error('Error fetching OTP:', error);
          setVideoError('Failed to load video');
          return;
        }
        
        if (data.error) {
          console.error('VdoCipher error:', data.error);
          setVideoError(data.error);
          return;
        }
        
        setVideoOtp(data.otp);
        setPlaybackInfo(data.playbackInfo);
      } catch (err) {
        console.error('Error fetching video OTP:', err);
        setVideoError('Failed to load video');
      } finally {
        setVideoLoading(false);
      }
    };
    
    fetchOtp();
  }, [lesson.vdocipherId, lesson.id]);

  // Listen for VdoCipher video end event via postMessage
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // VdoCipher sends messages when video events occur
      if (event.data && typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          // Check if video ended (progress >= 95%)
          if (data.event === 'progress' && data.currentTime && data.duration) {
            const progress = (data.currentTime / data.duration) * 100;
            if (progress >= 95 && !hasMarkedComplete.current && !lesson.completed) {
              hasMarkedComplete.current = true;
              await markVideoComplete();
            }
          }
          // Also check for 'ended' event
          if (data.event === 'ended' && !hasMarkedComplete.current && !lesson.completed) {
            hasMarkedComplete.current = true;
            await markVideoComplete();
          }
        } catch {
          // Not JSON, ignore
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [lesson.id, lesson.completed, user?.id]);

  const markVideoComplete = async () => {
    if (!user?.id) return;
    
    const { error } = await supabase
      .from('user_video_progress')
      .upsert({
        user_id: user.id,
        video_id: lesson.id,
        completed: true,
        completed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,video_id'
      });

    if (!error) {
      toast.success('Video marked as complete!');
      onVideoComplete?.(lesson.id);
    }
  };

  const handleDownloadTranscript = () => {
    if (lesson.transcriptUrl) {
      // Open the Google Drive URL directly - it will handle the download
      window.open(lesson.transcriptUrl, '_blank');
      toast.success('Opening transcript for download');
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
        {lesson.vdocipherId && videoOtp && playbackInfo ? (
          <iframe
            ref={iframeRef}
            src={`https://player.vdocipher.com/v2/?otp=${videoOtp}&playbackInfo=${playbackInfo}`}
            className="w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
          />
        ) : lesson.vdocipherId && videoLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto animate-pulse">
                <Play className="h-10 w-10 text-accent fill-accent" />
              </div>
              <p className="text-sm text-muted-foreground">Loading video...</p>
            </div>
          </div>
        ) : lesson.vdocipherId && videoError ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
                <Play className="h-10 w-10 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground">{videoError}</p>
            </div>
          </div>
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

        {/* Description/Notes with Enhanced Markdown Styling - renamed to Call Summary */}
        {lesson.description && (
          <div className="rounded-xl border border-border bg-surface/30 p-6">
            <h3 className="text-base font-semibold text-foreground mb-4 pb-2 border-b border-border/50">
              Call Summary
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
