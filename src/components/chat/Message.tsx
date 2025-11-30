import { User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface MessageProps {
  message: MessageData;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-secondary" : "bg-primary"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-secondary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-primary-foreground" />
        )}
      </div>
      <div className={cn("flex max-w-[80%] flex-col", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-lg px-4 py-3",
            isUser ? "bg-secondary text-secondary-foreground" : "bg-surface text-foreground"
          )}
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        </div>
        <span className="mt-1 text-xs text-muted-foreground">{message.timestamp}</span>
      </div>
    </div>
  );
}