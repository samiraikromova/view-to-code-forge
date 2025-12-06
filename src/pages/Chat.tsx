import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { LearnSidebar, Module } from "@/components/learn/LearnSidebar";
import { LearnInterface } from "@/components/learn/LearnInterface";

interface Chat {
  id: string;
  title: string;
  starred: boolean;
}

const Chat = () => {
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
  
  // Call Recordings Data
  const [recordingsData, setRecordingsData] = useState<Module[]>([
    {
      id: "module-1",
      title: "November 2025",
      lessons: [
        { 
          id: "rec-1", 
          moduleId: "module-1", 
          title: "LC Group Call 11/28", 
          duration: "~45 min", 
          completed: false, 
          description: "Weekly group call discussion",
          transcript: "[Paste transcript content from Fireflies here]",
          embedUrl: "https://share.fireflies.ai/embed/meetings/01KB6J9WXW8YAXJDWBH07AY4A8"
        },
      ],
    },
  ]);

  // Course Materials Data
  const [materialsData, setMaterialsData] = useState<Module[]>([
    {
      id: "course-1",
      title: "Getting Started",
      lessons: [
        { 
          id: "mat-1", 
          moduleId: "course-1", 
          title: "Introduction to the Platform", 
          duration: "5:30", 
          completed: true, 
          description: "Welcome to the platform! Learn the basics.",
          summary: "Platform overview and key features.",
          transcript: "Welcome everyone to this introduction..."
        },
      ],
    },
  ]);

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
    
    if (lesson?.transcript) {
      const blob = new Blob([lesson.transcript], { type: "text/plain" });
      const file = new File([blob], `${lesson.title.replace(/\s+/g, "_")}_transcript.txt`, {
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
