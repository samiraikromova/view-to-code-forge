import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { History, User, Settings, CreditCard, LogOut, Sparkles, TrendingUp, UserIcon, ChevronDown } from "lucide-react";
import { MainNavigation, NavigationMode } from "@/components/MainNavigation";
import { AmbientBackground } from "@/components/AmbientBackground";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ChatHistoryPanel } from "@/components/chat/ChatHistoryPanel";
import { LearnSidebar, Module, Lesson } from "@/components/learn/LearnSidebar";
import { LearnInterface } from "@/components/learn/LearnInterface";
import { Dashboard } from "@/pages/Dashboard";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { fetchUserThreads } from "@/api/chat/chatApi";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { CourseVideo } from "@/types/courseVideo";
import { cn } from "@/lib/utils";

interface Chat {
  id: string;
  title: string;
  starred: boolean;
}

const Main = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<NavigationMode>("chat");
  const [chatId, setChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  // Fetch threads from Supabase on mount and when user changes
  const loadThreads = useCallback(async () => {
    if (!user?.id) {
      setChats([]);
      setThreadsLoading(false);
      return;
    }

    setThreadsLoading(true);
    try {
      const threads = await fetchUserThreads(user.id);
      const mappedChats: Chat[] = threads.map((thread: any) => ({
        id: thread.id,
        title: thread.title || "Untitled Chat",
        starred: thread.starred || false,
      }));
      setChats(mappedChats);
    } catch (error) {
      console.error("Failed to load threads:", error);
      toast.error("Failed to load chat history");
    } finally {
      setThreadsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Learn mode state
  const [learnSidebarCollapsed, setLearnSidebarCollapsed] = useState(false);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [contentType, setContentType] = useState<"recordings" | "materials">("materials");
  const [transcriptForNewChat, setTranscriptForNewChat] = useState<File | null>(null);
  
  // Course data
  const [recordingsData, setRecordingsData] = useState<Module[]>([]);
  const [materialsData, setMaterialsData] = useState<Module[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [userProgress, setUserProgress] = useState<Map<string, boolean>>(new Map());

  // Fetch course videos
  useEffect(() => {
    const fetchCourseVideos = async () => {
      if (!user?.id) return;
      
      setVideosLoading(true);
      
      const [videosResult, progressResult] = await Promise.all([
        supabase
          .from("course_videos")
          .select("*")
          .order("order_index", { ascending: true }),
        supabase
          .from("user_video_progress")
          .select("video_id, completed")
          .eq("user_id", user.id),
      ]);

      if (videosResult.error) {
        console.error("Error fetching course videos:", videosResult.error);
        toast.error("Failed to load course content");
        setVideosLoading(false);
        return;
      }

      const progressMap = new Map<string, boolean>();
      if (progressResult.data) {
        progressResult.data.forEach((p: { video_id: string; completed: boolean }) => {
          progressMap.set(p.video_id, p.completed);
        });
      }
      setUserProgress(progressMap);

      if (videosResult.data) {
        const recordings = videosResult.data.filter((v: CourseVideo) => v.category === "call_recording");
        const materials = videosResult.data.filter((v: CourseVideo) => v.category === "course");

        setRecordingsData(groupVideosByModule(recordings, progressMap));
        setMaterialsData(groupVideosByModule(materials, progressMap));
      }
      
      setVideosLoading(false);
    };

    fetchCourseVideos();
  }, [user?.id]);

  const groupVideosByModule = (videos: CourseVideo[], progressMap: Map<string, boolean>): Module[] => {
    const moduleMap = new Map<string, Lesson[]>();
    
    videos.forEach((video) => {
      const moduleTitle = video.module || "Uncategorized";
      
      if (!moduleMap.has(moduleTitle)) {
        moduleMap.set(moduleTitle, []);
      }
      
      const lesson: Lesson = {
        id: video.id,
        moduleId: moduleTitle,
        title: video.title,
        duration: video.duration_formatted || video.duration || "",
        completed: progressMap.get(video.id) || false,
        description: video.description || "",
        vdocipherId: video.vdocipher_id || undefined,
        transcriptUrl: video.transcript_url || undefined,
        overview: video.overview || undefined,
        keywords: video.keywords || undefined,
        callDate: video.call_date || undefined,
        speakerCount: video.speaker_count || undefined,
        durationFormatted: video.duration_formatted || undefined,
      };
      
      moduleMap.get(moduleTitle)!.push(lesson);
    });
    
    const modules: Module[] = [];
    moduleMap.forEach((lessons, title) => {
      modules.push({
        id: title.toLowerCase().replace(/\s+/g, "-"),
        title,
        lessons,
      });
    });
    
    return modules;
  };

  const formatTranscriptForChat = (transcriptData: any, title: string) => {
    let formatted = `# ${title}\n`;
    
    if (transcriptData.metadata) {
      if (transcriptData.metadata.date) {
        formatted += `Date: ${new Date(transcriptData.metadata.date).toLocaleDateString()}\n`;
      }
      if (transcriptData.metadata.duration_formatted) {
        formatted += `Duration: ${transcriptData.metadata.duration_formatted}\n\n`;
      }
    }
    
    if (transcriptData.summary?.overview) {
      formatted += `## Summary\n${transcriptData.summary.overview}\n\n`;
    }
    
    if (transcriptData.summary?.keywords && transcriptData.summary.keywords.length > 0) {
      formatted += `## Keywords\n${transcriptData.summary.keywords.join(", ")}\n\n`;
    }
    
    formatted += `## Transcript\n\n`;
    
    if (transcriptData.transcript) {
      transcriptData.transcript.forEach((entry: any) => {
        formatted += `**${entry.speaker}:** ${entry.text}\n\n`;
      });
    }
    
    return formatted;
  };

  const handleNewChat = () => setChatId(null);

  const handleChatCreated = (title: string) => {
    const newId = Date.now().toString();
    const newChat: Chat = { id: newId, title, starred: false };
    setChats((prev) => [newChat, ...prev]);
    setChatId(newId);
  };

  const handleSelectChat = (id: string) => setChatId(id);

  // Learn mode handlers
  const handleSelectLesson = (id: string) => setLessonId(id);

  const handleToggleComplete = async (id: string) => {
    if (!user?.id) return;
    
    const currentCompleted = userProgress.get(id) || false;
    const newCompleted = !currentCompleted;
    
    const updateLessons = (modules: Module[]) =>
      modules.map((mod) => ({
        ...mod,
        lessons: mod.lessons.map((l) =>
          l.id === id ? { ...l, completed: newCompleted } : l
        ),
      }));

    if (contentType === "recordings") {
      setRecordingsData(updateLessons);
    } else {
      setMaterialsData(updateLessons);
    }
    setUserProgress((prev) => new Map(prev).set(id, newCompleted));

    const { error } = await supabase.from("user_video_progress").upsert(
      {
        user_id: user.id,
        video_id: id,
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,video_id" }
    );

    if (error) {
      console.error("Error updating progress:", error);
      toast.error("Failed to update progress");
      setUserProgress((prev) => new Map(prev).set(id, currentCompleted));
    }
  };

  const handleContentTypeChange = (type: "recordings" | "materials") => {
    setContentType(type);
    setLessonId(null);
  };

  const handleAskAIAboutVideo = async (lessonId: string) => {
    if (!user?.id) {
      toast.error("Please log in to use this feature");
      return;
    }
    
    const currentData = contentType === "recordings" ? recordingsData : materialsData;
    const lesson = currentData.flatMap((m) => m.lessons).find((l) => l.id === lessonId);
    
    if (lesson?.transcriptUrl) {
      try {
        toast.info("Downloading transcript...");
        
        const response = await fetch(lesson.transcriptUrl);
        if (!response.ok) {
          throw new Error("Failed to download transcript from source");
        }
        const transcriptData = await response.json();
        
        const formattedTranscript = formatTranscriptForChat(transcriptData, lesson.title);
        
        const filename = `${lesson.title.replace(/\s+/g, "_")}_transcript.txt`;
        const blob = new Blob([formattedTranscript], { type: "text/plain" });
        const file = new File([blob], filename, { type: "text/plain" });
        
        toast.info("Uploading transcript to storage...");
        
        const filePath = `${user.id}/${Date.now()}-${filename}`;
        const { error: uploadError } = await supabase.storage
          .from("chat-files")
          .upload(filePath, file, { cacheControl: "3600", upsert: false });
        
        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw new Error("Failed to upload transcript");
        }
        
        const { data: urlData } = supabase.storage.from("chat-files").getPublicUrl(filePath);
        
        if (!urlData?.publicUrl) {
          throw new Error("Failed to get transcript URL");
        }
        
        await supabase.from("file_uploads").insert({
          filename: filename,
          file_path: filePath,
          file_type: "text/plain",
          file_size: file.size,
        });
        
        toast.success("Transcript ready for chat");
        
        setTranscriptForNewChat(file);
        setMode("chat");
        setChatId(null);
      } catch (error) {
        console.error("Error loading transcript:", error);
        toast.error("Failed to load transcript");
      }
    } else if (lesson?.overview || lesson?.description) {
      const content = lesson.overview || lesson.description || "";
      const filename = `${lesson.title.replace(/\s+/g, "_")}_notes.txt`;
      const blob = new Blob([content], { type: "text/plain" });
      const file = new File([blob], filename, { type: "text/plain" });
      
      try {
        const filePath = `${user.id}/${Date.now()}-${filename}`;
        await supabase.storage
          .from("chat-files")
          .upload(filePath, file, { cacheControl: "3600", upsert: false });
      } catch (e) {
        console.error("Failed to upload notes file:", e);
      }
      
      setTranscriptForNewChat(file);
      setMode("chat");
      setChatId(null);
    }
  };

  const handleVideoComplete = (lessonId: string) => {
    const updateLessons = (modules: Module[]) =>
      modules.map((mod) => ({
        ...mod,
        lessons: mod.lessons.map((l) =>
          l.id === lessonId ? { ...l, completed: true } : l
        ),
      }));

    if (contentType === "recordings") {
      setRecordingsData(updateLessons);
    } else {
      setMaterialsData(updateLessons);
    }
    setUserProgress((prev) => new Map(prev).set(lessonId, true));
  };

  const handleModeChange = (newMode: NavigationMode) => {
    // Convert NavigationMode to the legacy format for learn mode
    if (newMode === "learn") {
      setMode("learn");
    } else {
      setMode(newMode);
    }
  };

  const currentData = contentType === "recordings" ? recordingsData : materialsData;
  const userName = profile?.name || profile?.email?.split("@")[0] || "User";
  const userInitial = userName.charAt(0).toUpperCase();
  const userCredits = profile?.credits ?? 0;

  return (
    <div className="relative flex h-screen w-full bg-background overflow-hidden">
      <AmbientBackground />
      
      {/* Main Content Area */}
      <div className="relative z-10 flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-surface/40 backdrop-blur-md">
          {/* Left: History button for chat mode */}
          <div className="w-40">
            {mode === "chat" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistoryPanel(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
            )}
          </div>

          {/* Center: Navigation */}
          <MainNavigation currentMode={mode} onModeChange={handleModeChange} />

          {/* Right: User menu */}
          <div className="w-40 flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/60 border border-border/50 hover:bg-surface-hover transition-colors">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    {userInitial}
                  </div>
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {userCredits.toFixed(2)} credits
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/profile")} className="text-muted-foreground">
                  <UserIcon className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/analytics")} className="text-muted-foreground">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Analytics
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")} className="text-muted-foreground">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")} className="text-muted-foreground">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Upgrade to Pro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/pricing/top-up")} className="text-muted-foreground">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Top up credits
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {mode === "dashboard" && (
            <Dashboard 
              onAskAI={(csvData) => {
                // Create a file from CSV and switch to chat
                const blob = new Blob([csvData], { type: "text/csv" });
                const file = new File([blob], "dashboard_metrics.csv", { type: "text/csv" });
                setTranscriptForNewChat(file);
                setMode("chat");
                setChatId(null);
              }}
            />
          )}
          
          {mode === "chat" && (
            <ChatInterface
              chatId={chatId}
              onNewChat={handleNewChat}
              onCreateChat={handleChatCreated}
              transcriptFile={transcriptForNewChat}
              onTranscriptFileProcessed={() => setTranscriptForNewChat(null)}
            />
          )}
          
          {mode === "learn" && (
            <>
              <LearnSidebar
                modules={currentData}
                currentLessonId={lessonId}
                onLessonSelect={handleSelectLesson}
                onToggleLessonComplete={handleToggleComplete}
                isCollapsed={learnSidebarCollapsed}
                onCollapsedChange={setLearnSidebarCollapsed}
                mode="learn"
                onModeChange={(m) => setMode(m === "learn" ? "learn" : "chat")}
                contentType={contentType}
                onContentTypeChange={handleContentTypeChange}
              />
              <div className="flex-1 flex flex-col min-w-0">
                <LearnInterface
                  lessonId={lessonId}
                  modules={currentData}
                  contentType={contentType}
                  onAskAI={handleAskAIAboutVideo}
                  onVideoComplete={handleVideoComplete}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chat History Panel */}
      <ChatHistoryPanel
        isOpen={showHistoryPanel}
        onClose={() => setShowHistoryPanel(false)}
        chats={chats}
        setChats={setChats}
        currentChatId={chatId}
        onChatSelect={handleSelectChat}
        onNewChat={handleNewChat}
      />
    </div>
  );
};

export default Main;
