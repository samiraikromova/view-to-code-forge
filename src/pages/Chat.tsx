import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { LearnSidebar, Module, Lesson } from "@/components/learn/LearnSidebar";
import { LearnInterface } from "@/components/learn/LearnInterface";
import { useAuth } from "@/hooks/useAuth";
import { fetchUserThreads } from "@/api/chat/chatApi";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { CourseVideo } from "@/types/courseVideo";

interface Chat {
  id: string;
  title: string;
  starred: boolean;
}

const Chat = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<"chat" | "learn">("chat");
  const [chatId, setChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);

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
        title: thread.title || 'Untitled Chat',
        starred: thread.starred || false,
      }));
      setChats(mappedChats);
    } catch (error) {
      console.error('Failed to load threads:', error);
      toast.error('Failed to load chat history');
    } finally {
      setThreadsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Sidebar collapse states
  const [chatSidebarCollapsed, setChatSidebarCollapsed] = useState(false);
  const [learnSidebarCollapsed, setLearnSidebarCollapsed] = useState(false);

  // Learn mode state
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [contentType, setContentType] = useState<"recordings" | "materials">("materials");
  const [transcriptForNewChat, setTranscriptForNewChat] = useState<File | null>(null);
  const [pendingTranscriptInfo, setPendingTranscriptInfo] = useState<{
    name: string;
    url: string;
    recordingTitle: string;
  } | null>(null);
  
  // Call Recordings Data from Supabase
  const [recordingsData, setRecordingsData] = useState<Module[]>([]);
  const [materialsData, setMaterialsData] = useState<Module[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);

  // Fetch course videos from Supabase
  useEffect(() => {
    const fetchCourseVideos = async () => {
      setVideosLoading(true);
      
      const { data, error } = await supabase
        .from('course_videos')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching course videos:', error);
        toast.error('Failed to load course content');
        setVideosLoading(false);
        return;
      }

      if (data) {
        // Separate call recordings and course materials
        const recordings = data.filter((v: CourseVideo) => v.category === 'call_recording');
        const materials = data.filter((v: CourseVideo) => v.category === 'course');

        // Group recordings by module (month)
        const recordingsGrouped = groupVideosByModule(recordings);
        setRecordingsData(recordingsGrouped);

        // Group materials by module
        const materialsGrouped = groupVideosByModule(materials);
        setMaterialsData(materialsGrouped);
      }
      
      setVideosLoading(false);
    };

    fetchCourseVideos();
  }, []);

  // Handle transcript loading from URL params (Ask AI flow)
  useEffect(() => {
    const openTranscript = searchParams.get('openTranscript');
    
    if (openTranscript === 'true') {
      const pendingTranscript = sessionStorage.getItem('pendingTranscriptFile');
      
      if (pendingTranscript) {
        const transcriptInfo = JSON.parse(pendingTranscript);
        setPendingTranscriptInfo(transcriptInfo);
        sessionStorage.removeItem('pendingTranscriptFile');
        // Clear the URL param
        setSearchParams({});
      }
    }
  }, [searchParams, setSearchParams]);

  // Load transcript when pending info is set
  useEffect(() => {
    if (pendingTranscriptInfo) {
      loadTranscriptFile(pendingTranscriptInfo);
      setPendingTranscriptInfo(null);
    }
  }, [pendingTranscriptInfo]);

  const loadTranscriptFile = async (transcriptInfo: {
    name: string;
    url: string;
    recordingTitle: string;
  }) => {
    try {
      const response = await fetch(transcriptInfo.url);
      const transcriptData = await response.json();
      
      const formattedTranscript = formatTranscriptForChat(transcriptData, transcriptInfo.recordingTitle);
      
      const blob = new Blob([formattedTranscript], { type: 'text/plain' });
      const file = new File([blob], transcriptInfo.name, { type: 'text/plain' });
      
      setTranscriptForNewChat(file);
      toast.success('Transcript loaded successfully');
    } catch (error) {
      console.error('Error loading transcript:', error);
      toast.error('Failed to load transcript');
    }
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
      formatted += `## Keywords\n${transcriptData.summary.keywords.join(', ')}\n\n`;
    }
    
    formatted += `## Transcript\n\n`;
    
    if (transcriptData.transcript) {
      transcriptData.transcript.forEach((entry: any) => {
        formatted += `**${entry.speaker}:** ${entry.text}\n\n`;
      });
    }
    
    return formatted;
  };

  const groupVideosByModule = (videos: CourseVideo[]): Module[] => {
    const moduleMap = new Map<string, Lesson[]>();
    
    videos.forEach(video => {
      const moduleTitle = video.module || 'Uncategorized';
      
      if (!moduleMap.has(moduleTitle)) {
        moduleMap.set(moduleTitle, []);
      }
      
      const lesson: Lesson = {
        id: video.id,
        moduleId: moduleTitle,
        title: video.title,
        duration: video.duration_formatted || video.duration || '',
        completed: false,
        description: video.description || '',
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
    
    // Convert to array and sort modules (newest first for recordings)
    const modules: Module[] = [];
    moduleMap.forEach((lessons, title) => {
      modules.push({
        id: title.toLowerCase().replace(/\s+/g, '-'),
        title,
        lessons
      });
    });
    
    return modules;
  };

  const handleNewChat = () => {
    setChatId(null);
  };

  const handleChatCreated = (title: string) => {
    const newId = Date.now().toString();
    const newChat: Chat = { id: newId, title, starred: false };
    setChats((prev) => [newChat, ...prev]);
    setChatId(newId);
  };

  const handleSelectChat = (id: string) => {
    setChatId(id);
  };

  // Learn mode handlers
  const handleSelectLesson = (id: string) => setLessonId(id);

  const handleToggleComplete = (id: string) => {
    const updateLessons = (modules: Module[]) =>
      modules.map((mod) => ({
        ...mod,
        lessons: mod.lessons.map((l) =>
          l.id === id ? { ...l, completed: !l.completed } : l
        ),
      }));

    if (contentType === "recordings") {
      setRecordingsData(updateLessons);
    } else {
      setMaterialsData(updateLessons);
    }
  };

  const handleContentTypeChange = (type: "recordings" | "materials") => {
    setContentType(type);
    setLessonId(null);
  };

  const handleAskAIAboutVideo = (lessonId: string) => {
    const currentData = contentType === "recordings" ? recordingsData : materialsData;
    const lesson = currentData.flatMap((m) => m.lessons).find((l) => l.id === lessonId);
    
    if (lesson?.transcriptUrl) {
      // For recordings with transcript URL - use Ask AI flow
      sessionStorage.setItem('pendingTranscriptFile', JSON.stringify({
        name: `${lesson.title.replace(/\s+/g, '_')}_transcript.txt`,
        url: lesson.transcriptUrl,
        recordingTitle: lesson.title
      }));
      
      setMode("chat");
      setChatId(null);
      // Trigger the transcript loading
      setSearchParams({ openTranscript: 'true' });
    } else if (lesson?.overview || lesson?.description) {
      // Fallback: use overview or description as transcript content
      const content = lesson.overview || lesson.description || '';
      const blob = new Blob([content], { type: "text/plain" });
      const file = new File([blob], `${lesson.title.replace(/\s+/g, "_")}_notes.txt`, {
        type: "text/plain",
      });
      setTranscriptForNewChat(file);
      setMode("chat");
      setChatId(null);
    }
  };

  const currentData = contentType === "recordings" ? recordingsData : materialsData;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {mode === "chat" ? (
        <>
          <Sidebar
            currentChatId={chatId}
            onChatSelect={handleSelectChat}
            onNewChat={handleNewChat}
            chats={chats}
            setChats={setChats}
            isCollapsed={chatSidebarCollapsed}
            onCollapsedChange={setChatSidebarCollapsed}
            mode={mode}
            onModeChange={setMode}
          />
          <div className="flex-1 flex flex-col min-w-0">
            <ChatInterface
              chatId={chatId}
              onNewChat={handleNewChat}
              onCreateChat={handleChatCreated}
              transcriptFile={transcriptForNewChat}
              onTranscriptFileProcessed={() => setTranscriptForNewChat(null)}
            />
          </div>
        </>
      ) : (
        <>
          <LearnSidebar
            modules={currentData}
            currentLessonId={lessonId}
            onLessonSelect={handleSelectLesson}
            onToggleLessonComplete={handleToggleComplete}
            isCollapsed={learnSidebarCollapsed}
            onCollapsedChange={setLearnSidebarCollapsed}
            mode={mode}
            onModeChange={setMode}
            contentType={contentType}
            onContentTypeChange={handleContentTypeChange}
          />
          <div className="flex-1 flex flex-col min-w-0">
            <LearnInterface
              lessonId={lessonId}
              modules={currentData}
              contentType={contentType}
              onAskAI={handleAskAIAboutVideo}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Chat;
