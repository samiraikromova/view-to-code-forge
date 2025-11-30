import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ModeSwitcher } from "@/components/ModeSwitcher";
import { LearnSidebar, Module } from "@/components/learn/LearnSidebar";
import { LearnInterface } from "@/components/learn/LearnInterface";

interface Chat {
  id: string;
  title: string;
  starred: boolean;
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

  // Learn mode state
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [contentType, setContentType] = useState<"recordings" | "materials">("materials");
  const [modules] = useState<Module[]>([
    {
      id: "module-1",
      title: "Getting Started",
      lessons: [
        { id: "lesson-1", moduleId: "module-1", title: "Introduction to the Platform", duration: "5:30", completed: true },
        { id: "lesson-2", moduleId: "module-1", title: "Setting Up Your Workspace", duration: "8:45", completed: false },
        { id: "lesson-3", moduleId: "module-1", title: "Understanding the Interface", duration: "12:20", completed: false },
      ],
    },
    {
      id: "module-2",
      title: "Core Concepts",
      lessons: [
        { id: "lesson-4", moduleId: "module-2", title: "Working with Projects", duration: "15:10", completed: false },
        { id: "lesson-5", moduleId: "module-2", title: "Advanced Features", duration: "18:30", completed: false },
        { id: "lesson-6", moduleId: "module-2", title: "Collaboration Tools", duration: "10:45", completed: false },
      ],
    },
    {
      id: "module-3",
      title: "Advanced Topics",
      lessons: [
        { id: "lesson-7", moduleId: "module-3", title: "Automation & Workflows", duration: "22:15", completed: false },
        { id: "lesson-8", moduleId: "module-3", title: "Integration Strategies", duration: "14:50", completed: false },
        { id: "lesson-9", moduleId: "module-3", title: "Best Practices", duration: "16:30", completed: false },
      ],
    },
  ]);

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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ModeSwitcher currentMode={mode} onModeChange={setMode} />
      
      {mode === "chat" ? (
        <>
          <Sidebar 
            currentChatId={chatId} 
            onChatSelect={setChatId} 
            onNewChat={handleNewChat}
            chats={chats}
            setChats={setChats}
          />
          <ChatInterface 
            chatId={chatId} 
            onNewChat={handleNewChat}
            onCreateChat={handleCreateChat}
          />
        </>
      ) : (
        <>
          <LearnSidebar
            currentLessonId={lessonId}
            onLessonSelect={setLessonId}
            contentType={contentType}
            onContentTypeChange={setContentType}
            modules={modules}
          />
          <LearnInterface
            lessonId={lessonId}
            modules={modules}
            contentType={contentType}
          />
        </>
      )}
    </div>
  );
};

export default Index;