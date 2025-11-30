import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatInterface } from "@/components/chat/ChatInterface";

const Index = () => {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar
        currentChatId={currentChatId}
        onChatSelect={setCurrentChatId}
        onNewChat={() => setCurrentChatId(null)}
      />
      <ChatInterface chatId={currentChatId} onNewChat={() => setCurrentChatId(null)} />
    </div>
  );
};

export default Index;