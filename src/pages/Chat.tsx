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
      
      // Fetch videos and user progress in parallel
      const [videosResult, progressResult] = await Promise.all([
        supabase
          .from('course_videos')
          .select('*')
          .order('order_index', { ascending: true }),
        supabase
          .from('user_video_progress')
          .select('video_id, completed')
          .eq('user_id', user.id)
      ]);

      if (videosResult.error) {
        console.error('Error fetching course videos:', videosResult.error);
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

      if (videosResult.data) {
        // Separate call recordings and course materials
        const recordings = videosResult.data.filter((v: CourseVideo) => v.category === 'call_recording');
        const materials = videosResult.data.filter((v: CourseVideo) => v.category === 'course');

        // Group recordings by module (month)
        const recordingsGrouped = groupVideosByModule(recordings, progressMap);
        setRecordingsData(recordingsGrouped);

        // Group materials by module
        const materialsGrouped = groupVideosByModule(materials, progressMap);
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

  const groupVideosByModule = (videos: CourseVideo[], progressMap: Map<string, boolean>): Module[] => {
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
        completed: progressMap.get(video.id) || false,
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
        
        // Store in file_uploads table (thread_id and message_id will be null initially)
        const { error: dbError } = await supabase
          .from('file_uploads')
          .insert({
            filename: filename,
            file_path: filePath,
            file_type: 'text/plain',
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
              onVideoComplete={handleVideoComplete}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Chat;
