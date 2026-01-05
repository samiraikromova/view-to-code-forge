import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ModeSwitcher } from "@/components/ModeSwitcher";
import { LearnSidebar, Module } from "@/components/learn/LearnSidebar";
import { LearnInterface } from "@/components/learn/LearnInterface";
import { supabase } from "@/lib/supabase";

interface Chat {
  id: string;
  title: string;
  starred: boolean;
}

interface TranscriptAttachment {
  file: File;
  lessonTitle: string;
}

const Index = () => {
  const [mode, setMode] = useState<"chat" | "learn">("chat");
  const [chatId, setChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([
    {
      id: "1",
      title: "Marketing campaign ideas",
      starred: false,
    },
    {
      id: "2",
      title: "Video script review",
      starred: false,
    },
    {
      id: "3",
      title: "Product description help",
      starred: false,
    },
  ]);

  // Sidebar collapse states
  const [chatSidebarCollapsed, setChatSidebarCollapsed] = useState(false);
  const [learnSidebarCollapsed, setLearnSidebarCollapsed] = useState(false);

  // Learn mode state
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [contentType, setContentType] = useState<"recordings" | "materials">("materials");
  const [transcriptForNewChat, setTranscriptForNewChat] = useState<File | null>(null);
  
  // Course data from Supabase
  const [recordingsData, setRecordingsData] = useState<Module[]>([]);
  const [materialsData, setMaterialsData] = useState<Module[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);

  // Fetch course_videos from Supabase
  useEffect(() => {
    const fetchCourseVideos = async () => {
      setIsLoadingVideos(true);
      
      const { data, error } = await supabase
        .from('course_videos')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching course videos:', error);
        setIsLoadingVideos(false);
        return;
      }

      if (data) {
        // Separate by category
        const recordings = data.filter(v => v.category === 'call_recording');
        const materials = data.filter(v => v.category === 'course');

        // Group recordings by module (which contains date like "LC Group Call 11/28")
        const recordingsModulesMap = new Map<string, typeof recordings>();
        recordings.forEach(video => {
          // Extract month from module to group by month
          const moduleMatch = video.module.match(/(\d{1,2})\/\d{1,2}/);
          const monthKey = moduleMatch ? getMonthName(parseInt(moduleMatch[1])) : video.module;
          
          if (!recordingsModulesMap.has(monthKey)) {
            recordingsModulesMap.set(monthKey, []);
          }
          recordingsModulesMap.get(monthKey)!.push(video);
        });

        // Convert to Module structure for recordings
        const recordingsModules: Module[] = Array.from(recordingsModulesMap.entries()).map(([monthName, videos], idx) => ({
          id: `recording-module-${idx}`,
          title: monthName,
          lessons: videos.map(v => ({
            id: v.id,
            moduleId: `recording-module-${idx}`,
            title: v.module, // Use module as title (e.g., "LC Group Call 11/28")
            duration: v.duration || "~45 min",
            completed: false,
            description: v.description || "",
            embedUrl: v.vdocipher_id ? `https://player.vdocipher.com/v2/?otp=${v.vdocipher_id}` : undefined,
          }))
        }));

        // Group materials by module
        const materialsModulesMap = new Map<string, typeof materials>();
        materials.forEach(video => {
          if (!materialsModulesMap.has(video.module)) {
            materialsModulesMap.set(video.module, []);
          }
          materialsModulesMap.get(video.module)!.push(video);
        });

        // Convert to Module structure for materials
        const materialsModules: Module[] = Array.from(materialsModulesMap.entries()).map(([moduleName, videos], idx) => ({
          id: `course-module-${idx}`,
          title: moduleName,
          lessons: videos.map(v => ({
            id: v.id,
            moduleId: `course-module-${idx}`,
            title: v.title,
            duration: v.duration || "10:00",
            completed: false,
            description: v.description || "",
            embedUrl: v.vdocipher_id ? `https://player.vdocipher.com/v2/?otp=${v.vdocipher_id}` : undefined,
          }))
        }));

        setRecordingsData(recordingsModules);
        setMaterialsData(materialsModules);
      }

      setIsLoadingVideos(false);
    };

    fetchCourseVideos();
  }, []);

  // Helper function to get month name from month number
  const getMonthName = (month: number): string => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return months[month - 1] || "Unknown";
  };

  // Get current modules based on content type
  const currentModules = contentType === "recordings" ? recordingsData : materialsData;
  const setCurrentModules = contentType === "recordings" ? setRecordingsData : setMaterialsData;

  const handleNewChat = () => {
    setChatId(null);
  };

  const handleCreateChat = (firstMessage: string) => {
    const newChatId = Date.now().toString();
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
    
    const newChat: Chat = {
      id: newChatId,
      title,
      starred: false,
    };
    
    setChats([newChat, ...chats]);
    setChatId(newChatId);
  };

  const handleToggleLessonComplete = (lessonId: string) => {
    setCurrentModules(currentModules.map(module => ({
      ...module,
      lessons: module.lessons.map(lesson =>
        lesson.id === lessonId
          ? { ...lesson, completed: !lesson.completed }
          : lesson
      ),
    })));
  };

  const handleAskAIAboutVideo = (lessonId: string) => {
    const allLessons = currentModules.flatMap(m => m.lessons);
    const lesson = allLessons.find(l => l.id === lessonId);
    
    if (!lesson?.transcript) return;
    
    // Create a File object from the transcript text
    const transcriptFile = new File(
      [lesson.transcript], 
      `${lesson.title.replace(/[^a-zA-Z0-9]/g, '_')}_transcript.txt`,
      { type: 'text/plain' }
    );
    
    // Store the transcript to attach to new chat
    setTranscriptForNewChat(transcriptFile);
    
    // Switch to chat mode and start new chat
    setMode("chat");
    setChatId(null);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {mode === "chat" ? (
        <div className="flex w-full animate-fade-in">
          <Sidebar 
            currentChatId={chatId} 
            onChatSelect={setChatId} 
            onNewChat={handleNewChat}
            chats={chats}
            setChats={setChats}
            isCollapsed={chatSidebarCollapsed}
            onCollapsedChange={setChatSidebarCollapsed}
            mode={mode}
            onModeChange={setMode}
          />
          <ChatInterface 
            chatId={chatId} 
            onNewChat={handleNewChat}
            onCreateChat={handleCreateChat}
            transcriptFile={transcriptForNewChat}
            onTranscriptFileProcessed={() => setTranscriptForNewChat(null)}
          />
        </div>
      ) : (
        <div className="flex w-full animate-fade-in">
          <LearnSidebar
            currentLessonId={lessonId}
            onLessonSelect={setLessonId}
            contentType={contentType}
            onContentTypeChange={setContentType}
            modules={currentModules}
            isCollapsed={learnSidebarCollapsed}
            onCollapsedChange={setLearnSidebarCollapsed}
            mode={mode}
            onModeChange={setMode}
            onToggleLessonComplete={handleToggleLessonComplete}
          />
          <LearnInterface
            lessonId={lessonId}
            modules={currentModules}
            contentType={contentType}
            onAskAI={handleAskAIAboutVideo}
          />
        </div>
      )}
    </div>
  );
};

export default Index;