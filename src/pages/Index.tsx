import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatInterface } from "@/components/chat/ChatInterface";

const Index = () => {
  const [chatId, setChatId] = useState<string | null>(null);

  const handleNewChat = () => {
    setChatId(null);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar currentChatId={chatId} onChatSelect={setChatId} onNewChat={handleNewChat} />
      <ChatInterface chatId={chatId} onNewChat={handleNewChat} />
    </div>
  );
};

export default Index;