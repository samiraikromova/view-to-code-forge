import { useState, useRef, useEffect } from "react";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ChatInterfaceProps {
  chatId: string | null;
  onNewChat: () => void;
}

const mockMessages: Record<string, Message[]> = {
  "1": [
    {
      id: "1",
      role: "user",
      content: "Can you help me brainstorm marketing campaign ideas for our new product launch?",
      timestamp: "2:30 PM",
    },
    {
      id: "2",
      role: "assistant",
      content: "I'd be happy to help you brainstorm marketing campaign ideas! To give you the most relevant suggestions, could you tell me a bit more about:\n\n1. What type of product are you launching?\n2. Who is your target audience?\n3. What's your approximate marketing budget?\n4. What channels are you considering (social media, email, paid ads, etc.)?\n\nOnce I understand these details, I can provide tailored campaign ideas that align with your goals.",
      timestamp: "2:30 PM",
    },
    {
      id: "3",
      role: "user",
      content: "It's a video editing software for content creators. Budget is around $10k for the first month.",
      timestamp: "2:32 PM",
    },
    {
      id: "4",
      role: "assistant",
      content: "Great! With a video editing software for content creators and a $10k monthly budget, here are some campaign ideas:\n\n**1. Creator Showcase Campaign**\n- Partner with 5-10 micro-influencers to create \"before/after\" videos\n- Show their editing workflow transformation\n- Budget: ~$4k for influencer fees\n\n**2. \"Edit Like a Pro\" Tutorial Series**\n- Create YouTube tutorials showcasing unique features\n- Short-form content for TikTok/Instagram Reels\n- Budget: ~$2k for production\n\n**3. Free Trial + Community Challenge**\n- 14-day free trial with a editing challenge\n- Winners get featured + 1-year free subscription\n- Budget: ~$2k for prizes and promotion\n\n**4. Paid Social Ads**\n- Targeted Facebook/Instagram ads to video creators\n- Retargeting campaigns for website visitors\n- Budget: ~$2k\n\nWould you like me to elaborate on any of these ideas?",
      timestamp: "2:33 PM",
    },
  ],
};

export function ChatInterface({ chatId, onNewChat }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatId && mockMessages[chatId]) {
      setMessages(mockMessages[chatId]);
    } else {
      setMessages([]);
    }
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (content: string, files?: File[]) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsStreaming(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "This is a demo response. In the full version, this would be connected to Claude AI for intelligent responses based on the selected project and model.",
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsStreaming(false);
    }, 1000);
  };

  return (
    <div className="flex h-full flex-1 flex-col">
      <ChatHeader />
      <MessageList messages={messages} isStreaming={isStreaming} />
      <div ref={messagesEndRef} />
      <ChatInput onSendMessage={handleSendMessage} disabled={isStreaming} />
    </div>
  );
}