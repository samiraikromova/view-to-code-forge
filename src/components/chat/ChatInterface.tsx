import { useState, useRef, useEffect } from "react";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { Project } from "./ChatHeader";
import { FileText, X, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
const mockProjects: Project[] = [{
  id: "cb4",
  name: "CB4",
  icon: "🧠",
  description: "Vector search integration with personal knowledge base"
}, {
  id: "copywriting",
  name: "Copywriting Assistant",
  icon: "✍️",
  description: "Generate engaging copy for marketing materials"
}, {
  id: "contract",
  name: "Contract Writer",
  icon: "📄",
  description: "Generate professional contracts and legal documents"
}, {
  id: "sales-review",
  name: "Sales Call Review",
  icon: "📞",
  description: "Analyze and summarize sales call transcripts"
}, {
  id: "ad-writing",
  name: "Ad Writing",
  icon: "📢",
  description: "Create compelling ad copy for various platforms"
}, {
  id: "image-gen",
  name: "Image Ad Generator",
  icon: "🎨",
  description: "Generate images for advertisements"
}, {
  id: "hooks",
  name: "AI Hooks Generator",
  icon: "🎣",
  description: "Create attention-grabbing hooks for content"
}, {
  id: "documentation",
  name: "Documentation",
  icon: "📚",
  description: "Generate and manage technical documentation"
}];
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
  "1": [{
    id: "1",
    role: "user",
    content: "Can you help me brainstorm marketing campaign ideas for our new product launch?",
    timestamp: "2:30 PM"
  }, {
    id: "2",
    role: "assistant",
    content: "I'd be happy to help you brainstorm marketing campaign ideas! To give you the most relevant suggestions, could you tell me a bit more about:\n\n1. What type of product are you launching?\n2. Who is your target audience?\n3. What's your approximate marketing budget?\n4. What channels are you considering (social media, email, paid ads, etc.)?\n\nOnce I understand these details, I can provide tailored campaign ideas that align with your goals.",
    timestamp: "2:30 PM"
  }, {
    id: "3",
    role: "user",
    content: "It's a video editing software for content creators. Budget is around $10k for the first month.",
    timestamp: "2:32 PM"
  }, {
    id: "4",
    role: "assistant",
    content: "Great! With a video editing software for content creators and a $10k monthly budget, here are some campaign ideas:\n\n**1. Creator Showcase Campaign**\n- Partner with 5-10 micro-influencers to create \"before/after\" videos\n- Show their editing workflow transformation\n- Budget: ~$4k for influencer fees\n\n**2. \"Edit Like a Pro\" Tutorial Series**\n- Create YouTube tutorials showcasing unique features\n- Short-form content for TikTok/Instagram Reels\n- Budget: ~$2k for production\n\n**3. Free Trial + Community Challenge**\n- 14-day free trial with a editing challenge\n- Winners get featured + 1-year free subscription\n- Budget: ~$2k for prizes and promotion\n\n**4. Paid Social Ads**\n- Targeted Facebook/Instagram ads to video creators\n- Retargeting campaigns for website visitors\n- Budget: ~$2k\n\nWould you like me to elaborate on any of these ideas?",
    timestamp: "2:33 PM"
  }]
};
export function ChatInterface({
  chatId,
  onNewChat
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedModel, setSelectedModel] = useState("claude-opus-4");
  const [extendedThinking, setExtendedThinking] = useState(false);
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [externalFiles, setExternalFiles] = useState<File[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatId && mockMessages[chatId]) {
      setMessages(mockMessages[chatId]);
    } else {
      setMessages([]);
    }
  }, [chatId]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages]);

  // Handle scroll to show/hide scroll-to-bottom button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
      setShowScrollButton(isScrolledUp);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Global drag and drop handlers
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragCounter(prev => prev + 1);
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDraggingGlobal(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragCounter(prev => {
        const newCounter = prev - 1;
        if (newCounter === 0) {
          setIsDraggingGlobal(false);
        }
        return newCounter;
      });
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingGlobal(false);
      setDragCounter(0);
      
      const droppedFiles = Array.from(e.dataTransfer?.files || []);
      if (droppedFiles.length > 0) {
        setExternalFiles(droppedFiles);
      }
    };

    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDrop);
    };
  }, []);
  const handleSelectProject = (project: Project | null) => {
    setSelectedProject(project);
  };
  const handleSendMessage = async (content: string, files?: File[]) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
      })
    };
    setMessages(prev => [...prev, newMessage]);
    setIsStreaming(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "This is a demo response. In the full version, this would be connected to Claude AI for intelligent responses based on the selected project and model.",
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit"
        })
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsStreaming(false);
    }, 1000);
  };
  const isEmpty = messages.length === 0;
  return <div className="flex h-full flex-1 flex-col min-h-0 overflow-hidden relative">
      {/* Global drag and drop overlay */}
      {isDraggingGlobal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-2xl border-2 border-dashed border-accent/50 bg-accent/5 p-8">
              <FileText className="h-16 w-16 text-accent" />
            </div>
            <p className="text-lg text-muted-foreground">Drop files here to add to chat</p>
          </div>
        </div>
      )}
      {isEmpty ? <div className="flex flex-1 flex-col items-center justify-center px-4 transition-all duration-700 ease-out animate-fade-in">
          <h1 className="mb-16 bg-gradient-to-r from-[hsl(290,30%,55%)] to-[hsl(310,47%,25%)] bg-clip-text text-5xl font-medium text-transparent animate-scale-in">
            Hello, Cam
          </h1>
          
          <div className="w-full max-w-2xl transition-all duration-500 ease-out">
            <ChatInput onSendMessage={handleSendMessage} disabled={isStreaming} selectedProject={selectedProject} onSelectProject={handleSelectProject} selectedModel={selectedModel} onSelectModel={setSelectedModel} extendedThinking={extendedThinking} onToggleExtendedThinking={() => setExtendedThinking(!extendedThinking)} isEmptyState={true} externalFiles={externalFiles} onExternalFilesProcessed={() => setExternalFiles([])} />
          </div>

          <div style={{
        animationDelay: '0.2s'
      }} className="mt-8 flex flex-wrap max-w-xl animate-fade-in justify-center mx-0 gap-[6px] px-[8px]">
            {mockProjects.map(project => <button key={project.id} onClick={() => setSelectedProject(project)} className={`flex items-center justify-center text-center rounded-lg border px-3 py-2 transition-all duration-200 whitespace-nowrap ${selectedProject?.id === project.id ? "border-accent bg-accent/10 text-muted-foreground" : "border-border/30 bg-surface/50 hover:bg-surface-hover text-muted-foreground"}`}>
                <span className="text-xs">{project.name}</span>
              </button>)}
          </div>
        </div> : <div className="flex flex-1 flex-col min-h-0 overflow-hidden animate-fade-in relative">
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto relative">
            <MessageList messages={messages} isStreaming={isStreaming} />
            <div ref={messagesEndRef} />
            
            {/* Gradient fade overlay */}
            <div 
              className="sticky bottom-0 left-0 right-0 h-24 pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, transparent, hsl(var(--background)))'
              }}
            />
          </div>
          
          {/* Scroll to bottom button */}
          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-44 left-1/2 -translate-x-1/2 h-10 w-10 rounded-full bg-surface border border-border shadow-lg flex items-center justify-center hover:bg-surface-hover transition-all animate-fade-in z-10"
            >
              <ArrowDown className="h-5 w-5 text-muted-foreground" />
            </button>
          )}

          <div className="shrink-0 transition-all duration-500 ease-out">
            <ChatInput onSendMessage={handleSendMessage} disabled={isStreaming} selectedProject={selectedProject} onSelectProject={handleSelectProject} selectedModel={selectedModel} onSelectModel={setSelectedModel} extendedThinking={extendedThinking} onToggleExtendedThinking={() => setExtendedThinking(!extendedThinking)} externalFiles={externalFiles} onExternalFilesProcessed={() => setExternalFiles([])} />
          </div>
        </div>}
    </div>;
}