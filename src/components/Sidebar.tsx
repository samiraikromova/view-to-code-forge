import { MessageSquare, Plus, User } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";

interface Chat {
  id: string;
  title: string;
  timestamp: string;
}

const mockChats: Chat[] = [
  { id: "1", title: "Marketing campaign ideas", timestamp: "2 hours ago" },
  { id: "2", title: "Video script review", timestamp: "Yesterday" },
  { id: "3", title: "Client proposal draft", timestamp: "2 days ago" },
  { id: "4", title: "Social media strategy", timestamp: "3 days ago" },
  { id: "5", title: "Ad copy variations", timestamp: "1 week ago" },
];

interface SidebarProps {
  currentChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
}

export function Sidebar({ currentChatId, onChatSelect, onNewChat }: SidebarProps) {
  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-surface">
      {/* User Profile */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
          <User className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-sm font-medium text-foreground">Cameron</p>
          <p className="truncate text-xs text-muted-foreground">50,993 credits</p>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Chat History */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 pb-3">
          {mockChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onChatSelect(chat.id)}
              className={cn(
                "flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-colors",
                currentChatId === chat.id
                  ? "bg-surface-hover text-foreground"
                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              )}
            >
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">{chat.title}</p>
                <p className="truncate text-xs opacity-70">{chat.timestamp}</p>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}