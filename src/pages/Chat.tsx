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

  // Learn mode state
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [contentType, setContentType] = useState<"recordings" | "materials">("materials");
  const [transcriptForNewChat, setTranscriptForNewChat] = useState<File | null>(null);
  
  // Call Recordings Data from Supabase
  const [recordingsData, setRecordingsData] = useState<Module[]>([]);
  const [materialsData, setMaterialsData] = useState<Module[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [userProgress, setUserProgress] = useState<Map<string, boolean>>(new Map());

  // Fetch course videos and user progress from Supabase
  useEffect(() => {
    const fetchCourseVideos = async () => {
      if (!user?.id) return;
      
      setVideosLoading(true);
      
      // Fetch modules, videos and user progress in parallel
      const [modulesResult, videosResult, progressResult] = await Promise.all([
        supabase
          .from('modules')
          .select('*')
          .order('order_index', { ascending: true }),
        supabase
          .from('course_videos')
          .select('*')
          .order('order_index', { ascending: true }),
        supabase
          .from('user_video_progress')
          .select('video_id, completed')
          .eq('user_id', user.id)
      ]);

      if (videosResult.error || modulesResult.error) {
        console.error('Error fetching course data:', videosResult.error || modulesResult.error);
        toast.error('Failed to load course content');
        setVideosLoading(false);
        return;
      }

      // Build progress map
      const progressMap = new Map<string, boolean>();
      if (progressResult.data) {
        progressResult.data.forEach((p: { video_id: string; completed: boolean }) => {
          progressMap.set(p.video_id, p.completed);
        });
      }
      setUserProgress(progressMap);

      const dbModules = modulesResult.data || [];

      if (videosResult.data) {
        // Separate call recordings and course materials
        const recordings = videosResult.data.filter((v: CourseVideo) => v.category === 'call_recording');
        const materials = videosResult.data.filter((v: CourseVideo) => v.category === 'course');

        // Group recordings by module (month)
        const recordingsGrouped = groupVideosByModule(recordings, progressMap, dbModules);
        setRecordingsData(recordingsGrouped);

        // Group materials by module
        const materialsGrouped = groupVideosByModule(materials, progressMap, dbModules);
        setMaterialsData(materialsGrouped);
      }
      
      setVideosLoading(false);
    };

    fetchCourseVideos();
  }, [user?.id]);


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

  interface DbModule {
    id: string;
    name: string;
    category: 'course' | 'call_recording';
    access_type: 'free' | 'tier_required' | 'purchase_required';
    required_tier: string | null;
    fanbases_product_id: string | null;
    price_cents: number | null;
    order_index: number;
  }

  const groupVideosByModule = (videos: CourseVideo[], progressMap: Map<string, boolean>, dbModules: DbModule[]): Module[] => {
    // Create a map of module_id to module info
    const moduleInfoMap = new Map(dbModules.map(m => [m.id, m]));
    
    // Group videos by module_id
    const moduleMap = new Map<string, { lessons: Lesson[]; moduleInfo?: DbModule }>();
    
    videos.forEach(video => {
      const moduleId = video.module_id || 'uncategorized';
      const moduleInfo = video.module_id ? moduleInfoMap.get(video.module_id) : undefined;
      
      if (!moduleMap.has(moduleId)) {
        moduleMap.set(moduleId, { 
          lessons: [],
          moduleInfo
        });
      }
      
      const lesson: Lesson = {
        id: video.id,
        moduleId: moduleId,
        title: video.title,
        duration: video.duration_formatted || video.duration || '',
        completed: progressMap.get(video.id) || false,
        description: video.description || '',
        vdocipherId: video.vdocipher_id || undefined,
        transcriptUrl: video.transcript_url || undefined,
        overview: video.overview || undefined,
        keywords: video.keywords || undefined,
        callDate: video.call_date || undefined,
        speakerCount: video.speaker_count || undefined,
        durationFormatted: video.duration_formatted || undefined,
        accessType: moduleInfo?.access_type || 'free',
        productId: moduleInfo?.fanbases_product_id || undefined,
      };
      
      moduleMap.get(moduleId)!.lessons.push(lesson);
    });
    
    // Convert to array and sort modules
    const modules: Module[] = [];
    moduleMap.forEach((data, moduleId) => {
      const title = data.moduleInfo?.name || 'Uncategorized';
      modules.push({
        id: moduleId,
        title,
        lessons: data.lessons,
        accessType: data.moduleInfo?.access_type as any || 'free',
        productId: data.moduleInfo?.fanbases_product_id || undefined,
        priceCents: data.moduleInfo?.price_cents || undefined,
        fanbasesProductId: data.moduleInfo?.fanbases_product_id || undefined,
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

  const handleToggleComplete = async (id: string) => {
    if (!user?.id) return;
    
    const currentCompleted = userProgress.get(id) || false;
    const newCompleted = !currentCompleted;
    
    // Optimistic update
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
    setUserProgress(prev => new Map(prev).set(id, newCompleted));

    // Upsert to database
    const { error } = await supabase
      .from('user_video_progress')
      .upsert({
        user_id: user.id,
        video_id: id,
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null
      }, {
        onConflict: 'user_id,video_id'
      });

    if (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to update progress');
      // Revert on error
      setUserProgress(prev => new Map(prev).set(id, currentCompleted));
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
      toast.error('Please log in to use this feature');
      return;
    }
    
    const currentData = contentType === "recordings" ? recordingsData : materialsData;
    const lesson = currentData.flatMap((m) => m.lessons).find((l) => l.id === lessonId);
    
    if (lesson?.transcriptUrl) {
      try {
        toast.info('Downloading transcript...');
        
        // Fetch the transcript from the URL (Google Drive)
        const response = await fetch(lesson.transcriptUrl);
        if (!response.ok) {
          throw new Error('Failed to download transcript from source');
        }
        const transcriptData = await response.json();
        
        // Format the transcript for chat
        const formattedTranscript = formatTranscriptForChat(transcriptData, lesson.title);
        
        // Create a file from the transcript
        const filename = `${lesson.title.replace(/\s+/g, '_')}_transcript.txt`;
        const blob = new Blob([formattedTranscript], { type: 'text/plain' });
        const file = new File([blob], filename, { type: 'text/plain' });
        
        toast.info('Uploading transcript to storage...');
        
        // Upload to Supabase storage
        const filePath = `${user.id}/${Date.now()}-${filename}`;
        const { error: uploadError } = await supabase.storage
          .from('chat-files')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error('Failed to upload transcript');
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(filePath);
        
        if (!urlData?.publicUrl) {
          throw new Error('Failed to get transcript URL');
        }
        
        // Store in file_uploads table with proper MIME type
        const mimeType = filename.endsWith('.json') ? 'application/json' : 
                         filename.endsWith('.md') ? 'text/markdown' : 'text/plain';
        const { error: dbError } = await supabase
          .from('file_uploads')
          .insert({
            filename: filename,
            file_path: filePath,
            file_type: mimeType,
            file_size: file.size
          });
        
        if (dbError) {
          console.error('DB error:', dbError);
          // Don't fail - file is uploaded, just log the error
        }
        
        toast.success('Transcript ready for chat');
        
        // Pass file to chat - it will be sent to n8n with the first message
        setTranscriptForNewChat(file);
        setMode("chat");
        setChatId(null);
      } catch (error) {
        console.error('Error loading transcript:', error);
        toast.error('Failed to load transcript');
      }
    } else if (lesson?.overview || lesson?.description) {
      // Fallback: use overview or description as transcript content
      const content = lesson.overview || lesson.description || '';
      const filename = `${lesson.title.replace(/\s+/g, "_")}_notes.txt`;
      const blob = new Blob([content], { type: "text/plain" });
      const file = new File([blob], filename, { type: "text/plain" });
      
      // Upload fallback content to storage too
      try {
        const filePath = `${user.id}/${Date.now()}-${filename}`;
        await supabase.storage
          .from('chat-files')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });
      } catch (e) {
        console.error('Failed to upload notes file:', e);
      }
      
      setTranscriptForNewChat(file);
      setMode("chat");
      setChatId(null);
    }
  };

  const handleVideoComplete = (lessonId: string) => {
    // Update local state when video completes
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
    setUserProgress(prev => new Map(prev).set(lessonId, true));
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
            onRefreshChats={loadThreads}
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
  );
};

export default Chat;
