import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatInterface } from "@/components/chat/ChatInterface";

interface Chat {
  id: string;
  title: string;
  starred: boolean;
}

const Index = () => {
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
    </div>
  );
};

export default Index;