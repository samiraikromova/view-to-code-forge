import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Sparkles, RefreshCw, UserIcon, CreditCard, LogOut, TrendingUp, Settings, FileText } from "lucide-react";
import { MainNavigation, NavigationMode } from "@/components/MainNavigation";
import { AmbientBackground } from "@/components/AmbientBackground";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ChatHistoryPanel } from "@/components/chat/ChatHistoryPanel";
import { Sidebar } from "@/components/Sidebar";
import { Module, Lesson } from "@/components/learn/LearnSidebar";
import { LearnInterface } from "@/components/learn/LearnInterface";
import { LearnContentSelector } from "@/components/learn/LearnContentSelector";
import { Dashboard } from "@/pages/Dashboard";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useAccess";
import { fetchUserThreads } from "@/api/chat/chatApi";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { CourseVideo } from "@/types/courseVideo";
import { Button } from "@/components/ui/button";
import { ViewSelector } from "@/components/dashboard/ViewSelector";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { SubscriptionModal } from "@/components/payments/SubscriptionModal";
import type { ViewType, TimePreset } from "@/types/dashboard";

// Convert Google Drive URLs to direct download links
const getDirectDownloadUrl = (url: string): string => {
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

interface Chat {
  id: string;
  title: string;
  starred: boolean;
}

const Main = () => {
  const { user, profile, signOut } = useAuth();
  const { purchasedModules, hasActiveSubscription, checkModuleAccess, refreshAccess } = useAccess();
  const navigate = useNavigate();
  const [mode, setMode] = useState<NavigationMode>("chat");
  const [chatId, setChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Dashboard state (lifted from Dashboard.tsx)
  const [dashboardView, setDashboardView] = useState<ViewType>("metrics");
  const [isGoalBuilderOpen, setIsGoalBuilderOpen] = useState(false);
  const [dashboardPreset, setDashboardPreset] = useState("last30days");
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const userName = profile?.name || profile?.email?.split("@")[0] || "User";
  const userInitial = userName.charAt(0).toUpperCase();
  const userCredits = profile?.credits ?? 0;

  const handleDashboardRefresh = useCallback(() => {
    setDashboardLoading(true);
    setTimeout(() => setDashboardLoading(false), 1000);
  }, []);

  const handleDashboardPresetChange = useCallback((preset: TimePreset) => {
    setDashboardPreset(preset.value);
  }, []);

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
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
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
      
      const [modulesResult, videosResult, progressResult] = await Promise.all([
        supabase
          .from("modules")
          .select("*")
          .order("order_index", { ascending: true }),
        supabase
          .from("course_videos")
          .select("*")
          .order("order_index", { ascending: true }),
        supabase
          .from("user_video_progress")
          .select("video_id, completed")
          .eq("user_id", user.id),
      ]);

      if (videosResult.error || modulesResult.error) {
        console.error("Error fetching course data:", videosResult.error || modulesResult.error);
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

      const dbModules = modulesResult.data || [];

      if (videosResult.data) {
        const recordings = videosResult.data.filter((v: CourseVideo) => v.category === "call_recording");
        const materials = videosResult.data.filter((v: CourseVideo) => v.category === "course");

        setRecordingsData(groupVideosByModule(recordings, progressMap, dbModules));
        setMaterialsData(groupVideosByModule(materials, progressMap, dbModules));
      }
      
      setVideosLoading(false);
    };

    fetchCourseVideos();
  }, [user?.id]);

  interface DbModule {
    id: string;
    name: string;
    category: 'course' | 'call_recording';
    access_type: 'free' | 'tier_required' | 'purchase_required';
    required_tier: string | null;
    fanbases_product_id: string | null;
    order_index: number;
  }

  const groupVideosByModule = (videos: CourseVideo[], progressMap: Map<string, boolean>, dbModules: DbModule[]): Module[] => {
    // Create a map of module_id to module info
    const moduleInfoMap = new Map(dbModules.map(m => [m.id, m]));
    
    // Group videos by module_id
    const moduleMap = new Map<string, { lessons: Lesson[]; moduleInfo?: DbModule }>();
    
    videos.forEach((video) => {
      const moduleId = video.module_id || 'uncategorized';
      const moduleInfo = video.module_id ? moduleInfoMap.get(video.module_id) : undefined;
      
      if (!moduleMap.has(moduleId)) {
        moduleMap.set(moduleId, { lessons: [], moduleInfo });
      }
      
      const lesson: Lesson = {
        id: video.id,
        moduleId: moduleId,
        title: video.title,
        duration: video.duration_formatted || video.duration || "",
        completed: progressMap.get(video.id) || false,
        description: video.description || "",
        vdocipherId: video.vdocipher_id || undefined,
        firefliesEmbedUrl: video.fireflies_embed_url || undefined,
        firefliesVideoUrl: video.fireflies_video_url || 
          (video.fireflies_embed_url?.includes('.mp4') ? video.fireflies_embed_url : undefined),
        transcriptUrl: video.transcript_url || undefined,
        transcriptText: video.transcript_text || undefined,
        overview: video.overview || undefined,
        keywords: video.keywords || undefined,
        callDate: video.call_date || undefined,
        speakerCount: video.speaker_count || undefined,
        durationFormatted: video.duration_formatted || undefined,
        accessType: moduleInfo?.access_type || 'free',
        requiredTier: moduleInfo?.required_tier || undefined,
        productId: moduleInfo?.fanbases_product_id || undefined,
        files: video.files || undefined,
      };
      
      moduleMap.get(moduleId)!.lessons.push(lesson);
    });
    
    const modules: Module[] = [];
    moduleMap.forEach((data, moduleId) => {
      const title = data.moduleInfo?.name || "Uncategorized";
      modules.push({
        id: moduleId,
        title,
        lessons: data.lessons,
        accessType: data.moduleInfo?.access_type as any || 'free',
        productId: data.moduleInfo?.fanbases_product_id || undefined,
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
    setSelectedModuleId(null);
    setLessonId(null);
  };

  const handleModuleSelect = (moduleId: string | null) => {
    setSelectedModuleId(moduleId);
    setLessonId(null);
  };

  const handleAskAIAboutVideo = async (lessonId: string) => {
    if (!user?.id) {
      toast.error("Please log in to use this feature");
      return;
    }
    
    const currentData = contentType === "recordings" ? recordingsData : materialsData;
    const lesson = currentData.flatMap((m) => m.lessons).find((l) => l.id === lessonId);
    
    if (!lesson) {
      toast.error("Lesson not found");
      return;
    }

    // Find the module this lesson belongs to
    const parentModule = currentData.find((m) => m.lessons.some((l) => l.id === lessonId));
    const moduleSlug = parentModule?.id; // Module ID should match internal_reference in fanbases_products

    // Check access: user must own the module OR have an active subscription
    if (moduleSlug) {
      const accessInfo = checkModuleAccess(moduleSlug);
      
      if (!accessInfo.hasAccess && !hasActiveSubscription) {
        // User doesn't have access - show appropriate message
        if (accessInfo.requiresCall) {
          toast.error("This module requires booking a call to access Ask AI");
        } else {
          toast.error("Subscribe or purchase this module to use Ask AI", {
            action: {
              label: "Subscribe",
              onClick: () => setShowSubscriptionModal(true),
            },
          });
        }
        return;
      }
    }
    
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

  const handleAskAIDashboard = useCallback((csvData: string) => {
    const blob = new Blob([csvData], { type: "text/csv" });
    const file = new File([blob], "dashboard_metrics.csv", { type: "text/csv" });
    setTranscriptForNewChat(file);
    setMode("chat");
    setChatId(null);
  }, []);

  const currentData = contentType === "recordings" ? recordingsData : materialsData;

  return (
    <div className="relative flex h-screen w-full bg-background overflow-hidden">
      <AmbientBackground />
      
      {/* Sidebar - Full height, outside main content column */}
      {mode === "chat" && (
        <Sidebar
          currentChatId={chatId}
          onChatSelect={handleSelectChat}
          onNewChat={handleNewChat}
          chats={chats}
          setChats={setChats}
          isCollapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          onRefreshChats={loadThreads}
        />
      )}
      
      {/* Main Content Area */}
      <div className="relative z-10 flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="relative flex items-center justify-between px-6 py-3 min-h-[56px]">
          {/* Left section - Dashboard and Learn */}
          <div className="flex items-center gap-3">
            {(mode === "dashboard" || mode === "learn") && (
              <>
                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:ring-2 hover:ring-primary/50 transition-all flex items-center justify-center flex-shrink-0">
                      {userInitial}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {/* Credit Usage Gauge */}
                    <div className="px-3 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">Credits</span>
                        <span className="text-xs font-medium text-foreground">
                          {userCredits.toFixed(1)} available
                        </span>
                      </div>
                      <Progress value={Math.min(userCredits, 100)} className="h-2" />
                    </div>
                    <DropdownMenuSeparator />
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

                {/* Mode-specific selectors */}
                {mode === "dashboard" && (
                  <>
                    <ViewSelector currentView={dashboardView} onViewChange={setDashboardView} />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDashboardRefresh}
                      className={dashboardLoading ? "animate-spin animate-refresh-glow" : ""}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </>
                )}

                {mode === "learn" && (
                  <LearnContentSelector 
                    contentType={contentType} 
                    onContentTypeChange={handleContentTypeChange} 
                  />
                )}
              </>
            )}
          </div>

          {/* Center: Navigation - Fixed to viewport center */}
          <div className="fixed left-1/2 -translate-x-1/2 top-[18px] z-50">
            <MainNavigation currentMode={mode} onModeChange={handleModeChange} />
          </div>

          {/* Right section - Dashboard and Learn (lesson view) */}
          <div className="flex items-center gap-2">
            {mode === "dashboard" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsGoalBuilderOpen(!isGoalBuilderOpen)}
                  className="gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add Goal
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleAskAIDashboard("")}
                >
                  <Sparkles className="w-4 h-4" />
                  Ask AI
                </Button>

                <DateRangePicker
                  selectedPreset={dashboardPreset}
                  onPresetChange={handleDashboardPresetChange}
                />
              </>
            )}

            {mode === "learn" && selectedModuleId && (() => {
              const module = currentData.find(m => m.id === selectedModuleId);
              const selectedLesson = module?.lessons.find(l => l.id === lessonId) || module?.lessons[0];
              if (!selectedLesson) return null;
              
              // Get transcript file from files array (Google Drive link)
              const transcriptFile = selectedLesson.files?.find(f => 
                f.name.toLowerCase().includes('transcript') || 
                f.type.toLowerCase().includes('doc') ||
                f.type.toLowerCase().includes('pdf') ||
                f.type.toLowerCase().includes('text')
              ) || selectedLesson.files?.[0];
              
              const hasTranscript = transcriptFile || selectedLesson.transcriptUrl;
              
              return (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={!hasTranscript}
                    onClick={() => {
                      const url = transcriptFile?.url || selectedLesson.transcriptUrl;
                      if (url) {
                        window.open(getDirectDownloadUrl(url), '_blank');
                      }
                    }}
                  >
                    <FileText className="w-4 h-4" />
                    Download Transcript
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleAskAIAboutVideo(selectedLesson.id)}
                  >
                    <Sparkles className="w-4 h-4" />
                    Ask AI
                  </Button>
                </>
              );
            })()}
          </div>
        </header>

        {/* Content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {mode === "dashboard" && (
            <Dashboard 
              onAskAI={handleAskAIDashboard}
              currentView={dashboardView}
              isGoalBuilderOpen={isGoalBuilderOpen}
              onGoalBuilderClose={() => setIsGoalBuilderOpen(false)}
              hasActiveSubscription={hasActiveSubscription}
              onSubscribe={() => setShowSubscriptionModal(true)}
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
            <div className="flex-1 flex flex-col min-w-0">
              <LearnInterface
                selectedModuleId={selectedModuleId}
                lessonId={lessonId}
                modules={currentData}
                contentType={contentType}
                isLoading={videosLoading}
                onModuleSelect={handleModuleSelect}
                onLessonSelect={handleSelectLesson}
                onAskAI={handleAskAIAboutVideo}
                onVideoComplete={handleVideoComplete}
              />
            </div>
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

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onSuccess={() => {
          refreshAccess();
          setShowSubscriptionModal(false);
        }}
      />
    </div>
  );
};

export default Main;
