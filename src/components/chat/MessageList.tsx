import { Message } from "./Message";
import { Bot } from "lucide-react";

interface MessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface MessageListProps {
  messages: MessageData[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-foreground">Ready to create something amazing?</h2>
          <p className="text-sm text-muted-foreground">
            Select a project and start chatting with your AI assistant
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-[720px] space-y-6">
        {messages.map((message) => (
          <div key={message.id} className="animate-fade-in">
            <Message message={message} />
          </div>
        ))}
        {isStreaming && (
          <div className="flex items-center gap-1 px-4 py-3 animate-fade-in">
            <div className="h-2 w-2 animate-pulse rounded-full bg-accent" />
            <div className="h-2 w-2 animate-pulse rounded-full bg-accent delay-75" />
            <div className="h-2 w-2 animate-pulse rounded-full bg-accent delay-150" />
          </div>
        )}
      </div>
    </div>
  );
}
