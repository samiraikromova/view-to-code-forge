import { useState, useEffect, useRef } from "react";
import { Play, ExternalLink, MessageSquare, Calendar, Clock, Users, Download, FileText, File, Image, FileSpreadsheet, Presentation, Lock, Loader2 } from "lucide-react";
import { Lesson, LessonFileItem } from "./LearnSidebar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

// Convert Google Drive URLs to direct download links
const getDirectDownloadUrl = (url: string): string => {
  // Check if it's a Google Drive link
  const drivePatterns = [
    /https:\/\/drive\.google\.com\/file\/d\/([^/]+)/,
    /https:\/\/drive\.google\.com\/open\?id=([^&]+)/,
    /https:\/\/docs\.google\.com\/document\/d\/([^/]+)/,
    /https:\/\/docs\.google\.com\/spreadsheets\/d\/([^/]+)/,
    /https:\/\/docs\.google\.com\/presentation\/d\/([^/]+)/,
  ];
  
  for (const pattern of drivePatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }
  }
  
  return url;
};

interface VideoPlayerProps {
  lesson: Lesson;
  contentType: "recordings" | "materials";
  onAskAI?: (lessonId: string) => void;
  onVideoComplete?: (lessonId: string) => void;
  isLocked?: boolean;
  fanbasesProductId?: string;
  fanbasesCheckoutUrl?: string;
  modulePriceCents?: number;
}

export const VideoPlayer = ({ 
  lesson, 
  contentType, 
  onAskAI, 
  onVideoComplete,
  isLocked = false,
  fanbasesProductId,
  fanbasesCheckoutUrl,
  modulePriceCents
}: VideoPlayerProps) => {
  const { user } = useAuth();
  const [videoOtp, setVideoOtp] = useState<string | null>(null);
  const [playbackInfo, setPlaybackInfo] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasMarkedComplete = useRef(false);

  // Use price directly from props (from modules table)

  // Fetch OTP when lesson changes (only for VdoCipher videos)
  useEffect(() => {
    hasMarkedComplete.current = false; // Reset on lesson change
    
    // If using Fireflies video (mp4) or embed, skip VdoCipher OTP fetch
    if (lesson.firefliesEmbedUrl || lesson.firefliesVideoUrl) {
      setVideoLoading(false);
      setVideoError(null);
      setVideoOtp(null);
      setPlaybackInfo(null);
      return;
    }
    
    const fetchOtp = async () => {
      if (!lesson.vdocipherId) return;
      
      setVideoLoading(true);
      setVideoError(null);
      
      try {
        console.log('Fetching OTP for video:', lesson.vdocipherId);
        
        const { data, error } = await supabase.functions.invoke('vdocipher-otp', {
          body: { videoId: lesson.vdocipherId }
        });
        
        console.log('Edge function response:', { data, error });
        
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
        // Generate playbackInfo client-side as base64-encoded JSON
        const playbackInfoObj = { videoId: lesson.vdocipherId };
        const generatedPlaybackInfo = btoa(JSON.stringify(playbackInfoObj));
        setPlaybackInfo(data.playbackInfo || generatedPlaybackInfo);
      } catch (err) {
        console.error('Error fetching video OTP:', err);
        setVideoError('Failed to load video');
      } finally {
        setVideoLoading(false);
      }
    };
    
    fetchOtp();
  }, [lesson.vdocipherId, lesson.firefliesEmbedUrl, lesson.id]);

  const markVideoComplete = async () => {
    if (!user?.id) return;
    
    console.log('Marking video complete:', lesson.id);
    
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

    if (error) {
      console.error('Error marking video complete:', error);
      toast.error('Failed to save progress');
    } else {
      console.log('Video marked complete successfully');
      toast.success('Video marked as complete!');
      onVideoComplete?.(lesson.id);
    }
  };

  // Listen for VdoCipher video end event via postMessage
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // VdoCipher sends messages when video events occur
      if (event.data && typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          console.log('VdoCipher event:', data.event, data);
          
          // Check if video ended (progress >= 95%)
          if (data.event === 'progress' && data.currentTime && data.duration) {
            const progress = (data.currentTime / data.duration) * 100;
            if (progress >= 95 && !hasMarkedComplete.current) {
              console.log('Video progress >= 95%, marking complete');
              hasMarkedComplete.current = true;
              await markVideoComplete();
            }
          }
          // Also check for 'ended' event
          if (data.event === 'ended' && !hasMarkedComplete.current) {
            console.log('Video ended event received, marking complete');
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
  }, [lesson.id, user?.id, onVideoComplete]);

  const handleDownloadTranscript = () => {
    // Try transcriptText first, then transcriptUrl
    if (lesson.transcriptText) {
      const blob = new Blob([lesson.transcriptText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${lesson.title.replace(/[^a-z0-9]/gi, '_')}_transcript.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Transcript downloaded');
    } else if (lesson.transcriptUrl) {
      window.open(lesson.transcriptUrl, '_blank');
      toast.success('Opening transcript');
    } else {
      toast.error('No transcript available');
    }
  };

  const handleAskAI = () => {
    if (onAskAI) {
      onAskAI(lesson.id);
      // Toast is handled by the parent component after processing
    }
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return <FileText className="h-4 w-4" />;
    if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg') || type.includes('gif')) return <Image className="h-4 w-4" />;
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('xls')) return <FileSpreadsheet className="h-4 w-4" />;
    if (type.includes('presentation') || type.includes('ppt')) return <Presentation className="h-4 w-4" />;
    if (type.includes('doc') || type.includes('word')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
        {/* Locked Module Overlay */}
        {isLocked ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="text-center space-y-4 p-6">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Lock className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">This Module is Locked</h3>
                <p className="text-sm text-muted-foreground">Unlock to access all lessons in this module</p>
              </div>
              {fanbasesCheckoutUrl && (
                <Button
                  onClick={() => {
                    setUnlockLoading(true);
                    window.open(fanbasesCheckoutUrl, '_blank');
                    // Reset loading after a short delay since we're opening new tab
                    setTimeout(() => setUnlockLoading(false), 2000);
                  }}
                  className="gap-2"
                  disabled={unlockLoading}
                >
                  {unlockLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Unlock for {modulePriceCents ? `$${(modulePriceCents / 100).toFixed(0)}` : 'Purchase'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        ) : null}
        
        {/* Fireflies direct mp4 video */}
        {!isLocked && lesson.firefliesVideoUrl ? (
          <video
            controls
            className="w-full h-full"
            src={lesson.firefliesVideoUrl}
            playsInline
            onEnded={() => {
              if (!hasMarkedComplete.current) {
                console.log('Native video ended, marking complete');
                hasMarkedComplete.current = true;
                markVideoComplete();
              }
            }}
            onTimeUpdate={(e) => {
              const video = e.currentTarget;
              const progress = (video.currentTime / video.duration) * 100;
              if (progress >= 95 && !hasMarkedComplete.current) {
                console.log('Native video progress >= 95%, marking complete');
                hasMarkedComplete.current = true;
                markVideoComplete();
              }
            }}
          >
            Your browser does not support the video tag.
          </video>
        ) : !isLocked && lesson.firefliesEmbedUrl ? (
          <iframe
            src={lesson.firefliesEmbedUrl}
            className="w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        ) : !isLocked && lesson.vdocipherId && videoOtp && playbackInfo ? (
          <iframe
            ref={iframeRef}
            src={`https://player.vdocipher.com/v2/?otp=${videoOtp}&playbackInfo=${playbackInfo}`}
            className="w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
          />
        ) : !isLocked && lesson.vdocipherId && videoLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto animate-pulse">
                <Play className="h-10 w-10 text-accent fill-accent" />
              </div>
              <p className="text-sm text-muted-foreground">Loading video...</p>
            </div>
          </div>
        ) : !isLocked && lesson.vdocipherId && videoError ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mx-auto">
                <Play className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Video unavailable</p>
              <p className="text-xs text-muted-foreground/70">This video will be available soon</p>
            </div>
          </div>
        ) : !isLocked ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
                <Play className="h-10 w-10 text-accent fill-accent" />
              </div>
              <p className="text-sm text-muted-foreground">Video will be available soon</p>
            </div>
          </div>
        ) : null}
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


        {/* Downloadable Files */}
        {lesson.files && lesson.files.length > 0 && (
          <div className="rounded-xl border border-border bg-surface/50 p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Resources</h3>
            <div className="space-y-2">
              {lesson.files.map((file, index) => (
                <button
                  key={index}
                  onClick={async () => {
                    try {
                      const response = await fetch(file.url);
                      const blob = await response.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = file.name;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      toast.success('File downloaded');
                    } catch (error) {
                      console.error('Download error:', error);
                      toast.error('Failed to download file');
                    }
                  }}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface transition-colors group w-full text-left"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-accent">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                </button>
              ))}
            </div>
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
