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

  // Sidebar collapse states
  const [chatSidebarCollapsed, setChatSidebarCollapsed] = useState(false);
  const [learnSidebarCollapsed, setLearnSidebarCollapsed] = useState(false);

  // Learn mode state
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [contentType, setContentType] = useState<"recordings" | "materials">("materials");
  
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
          embedUrl: "https://share.fireflies.ai/embed/meetings/01KB6J9WXW8YAXJDWBH07AY4A8"
        },
        { 
          id: "rec-2", 
          moduleId: "module-1", 
          title: "LC Group Call 11/20", 
          duration: "~45 min", 
          completed: false, 
          description: "Weekly group call discussion",
          embedUrl: "https://share.fireflies.ai/embed/meetings/01KAHZD1SWVAN3J5X6WX6BDHMA"
        },
        { 
          id: "rec-3", 
          moduleId: "module-1", 
          title: "LC Group Call 11/13", 
          duration: "~45 min", 
          completed: false, 
          description: "Weekly group call discussion",
          embedUrl: "https://share.fireflies.ai/embed/meetings/01K9ZZ0RCWY3Y36E6PBAMSTNWB"
        },
        { 
          id: "rec-4", 
          moduleId: "module-1", 
          title: "LC Group Call 11/6", 
          duration: "~45 min", 
          completed: false, 
          description: "Weekly group call discussion",
          embedUrl: "https://share.fireflies.ai/embed/meetings/01K9DXB7TGMMGXECZ6C265MFES"
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
        { id: "mat-1", moduleId: "course-1", title: "Introduction to the Platform", duration: "5:30", completed: true, description: "Welcome to the platform! Learn the basics and get oriented with the key features." },
        { id: "mat-2", moduleId: "course-1", title: "Setting Up Your Workspace", duration: "8:45", completed: false, description: "Step-by-step guide to configuring your workspace for optimal productivity." },
        { id: "mat-3", moduleId: "course-1", title: "Understanding the Interface", duration: "12:20", completed: false, description: "Deep dive into the user interface and navigation patterns." },
      ],
    },
    {
      id: "course-2",
      title: "Core Concepts",
      lessons: [
        { id: "mat-4", moduleId: "course-2", title: "Working with Projects", duration: "15:10", completed: false, description: "Learn how to create, manage, and organize projects effectively." },
        { id: "mat-5", moduleId: "course-2", title: "Advanced Features", duration: "18:30", completed: false, description: "Explore powerful advanced features to enhance your workflow." },
        { id: "mat-6", moduleId: "course-2", title: "Collaboration Tools", duration: "10:45", completed: false, description: "Master team collaboration and communication features." },
      ],
    },
    {
      id: "course-3",
      title: "Advanced Topics",
      lessons: [
        { id: "mat-7", moduleId: "course-3", title: "Automation & Workflows", duration: "22:15", completed: false, description: "Automate repetitive tasks and build custom workflows." },
        { id: "mat-8", moduleId: "course-3", title: "Integration Strategies", duration: "14:50", completed: false, description: "Connect with external tools and services seamlessly." },
        { id: "mat-9", moduleId: "course-3", title: "Best Practices", duration: "16:30", completed: false, description: "Learn industry best practices and optimization techniques." },
      ],
    },
  ]);

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
          />
        </div>
      )}
    </div>
  );
};

export default Index;