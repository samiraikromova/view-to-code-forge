import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { Project } from "./ChatHeader";
import { FileText, Lock, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { UpgradeDialog } from "./UpgradeDialog";
import { SubscriptionTier } from "@/types/subscription";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { sendChatMessage, estimateTokens, calculateChatCost } from "@/lib/n8n";
import { toast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ChatInterfaceProps {
  chatId: string | null;
  onNewChat: () => void;
  onCreateChat: (firstMessage: string) => void;
  transcriptFile?: File | null;
  onTranscriptFileProcessed?: () => void;
}

interface SupabaseProject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  system_prompt: string;
  icon: string | null;
  requires_tier2: boolean;
}

export function ChatInterface({
  chatId,
  onNewChat,
  onCreateChat,
  transcriptFile,
  onTranscriptFileProcessed
}: ChatInterfaceProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedModel, setSelectedModel] = useState("claude-opus-4");
  const [extendedThinking, setExtendedThinking] = useState(false);
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [externalFiles, setExternalFiles] = useState<File[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [chatFiles, setChatFiles] = useState<Record<string, File[]>>({});
  const [userTier, setUserTier] = useState<SubscriptionTier>("starter");
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // Get current chat's files
  const currentFiles = chatId ? (chatFiles[chatId] || []) : externalFiles;

  const [projectsLoading, setProjectsLoading] = useState(true);

  // Load projects from Supabase
  useEffect(() => {
    const loadProjects = async () => {
      setProjectsLoading(true);
      console.log('Loading projects from Supabase...');
      
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, slug, description, system_prompt, icon, requires_tier2')
        .eq('coming_soon', false)
        .order('name');

      console.log('Projects response:', { data, error });

      if (error) {
        console.error('Error loading projects:', error);
        toast({
          title: 'Error',
          description: 'Failed to load projects from database',
          variant: 'destructive'
        });
        setProjectsLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const mappedProjects: Project[] = data.map((p: SupabaseProject) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          icon: p.icon || "🤖",
          description: p.description || "",
          isPremium: p.requires_tier2,
          systemPrompt: p.system_prompt
        }));
        setProjects(mappedProjects);
      } else {
        console.log('No projects found in database');
        setProjects([]);
      }
      setProjectsLoading(false);
    };
    loadProjects();
  }, []);

  // Set user tier from profile
  useEffect(() => {
    if (profile?.subscription_tier) {
      setUserTier(profile.subscription_tier as SubscriptionTier);
    }
  }, [profile]);

  // Load messages for existing chat
  useEffect(() => {
    if (chatId && user) {
      loadMessages(chatId);
    } else {
      setMessages([]);
      setCurrentThreadId(null);
    }
    if (chatId && externalFiles.length > 0) {
      setExternalFiles([]);
    }
  }, [chatId, user]);

  const loadMessages = async (threadId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (data) {
      const mapped = data.map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.created_at).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit"
        })
      }));
      setMessages(mapped);
      setCurrentThreadId(threadId);
    }
  };

  // Handle transcript file from Learn mode
  useEffect(() => {
    if (transcriptFile && !chatId) {
      setExternalFiles([transcriptFile]);
      onTranscriptFileProcessed?.();
    }
  }, [transcriptFile, chatId]);
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
      const isScrolledUp = scrollHeight - scrollTop - clientHeight > 50;
      setShowScrollButton(isScrolledUp);
    };

    container.addEventListener("scroll", handleScroll);
    // Check initial state
    handleScroll();
    return () => container.removeEventListener("scroll", handleScroll);
  }, [messages]);

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
        if (chatId) {
          // Add to current chat's files
          setChatFiles(prev => ({
            ...prev,
            [chatId]: [...(prev[chatId] || []), ...droppedFiles]
          }));
        } else {
          // Add to external files for new chat
          setExternalFiles(prev => [...prev, ...droppedFiles]);
        }
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
    if (project?.isPremium && userTier !== "pro") {
      navigate("/settings");
      return;
    }
    setSelectedProject(project);
    // Set system prompt when project is selected
    if (project && 'systemPrompt' in project) {
      setSystemPrompt((project as any).systemPrompt || "");
    }
  };

  const uploadFiles = async (files: File[]): Promise<Array<{ url: string; name: string; type?: string; size?: number }>> => {
    if (!user) return [];
    const uploaded: Array<{ url: string; name: string; type?: string; size?: number }> = [];
    
    for (const file of files) {
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadErr) {
        console.error('Upload error:', uploadErr);
        continue;
      }

      const { data } = supabase.storage.from('chat-files').getPublicUrl(filePath);
      if (data?.publicUrl) {
        uploaded.push({
          url: data.publicUrl,
          name: file.name,
          type: file.type,
          size: file.size
        });
      }
    }
    return uploaded;
  };

  const handleSendMessage = async (content: string, files?: File[]) => {
    if (!user) {
      // User should already be logged in from main page
      console.warn('No user found - should be authenticated');
      return;
    }

    const isFirstMessage = messages.length === 0;
    let activeThreadId = currentThreadId;
    
    // Create thread if first message
    if (!activeThreadId && isFirstMessage) {
      const { data: thread, error: threadError } = await supabase
        .from('chat_threads')
        .insert({
          user_id: user.id,
          project_id: selectedProject?.id || null,
          title: content.substring(0, 50),
          model: selectedModel,
        })
        .select()
        .single();

      if (threadError || !thread) {
        console.error('Thread creation failed:', threadError);
        toast({
          title: 'Error',
          description: 'Failed to create chat thread',
          variant: 'destructive'
        });
        return;
      }

      activeThreadId = thread.id;
      setCurrentThreadId(activeThreadId);
      onCreateChat(content);

      // Transfer external files to the new chat
      if (externalFiles.length > 0) {
        setChatFiles(prev => ({
          ...prev,
          [activeThreadId!]: externalFiles
        }));
        setExternalFiles([]);
      }
    }

    const newMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
      })
    };

    // Add user message optimistically
    if (isFirstMessage) {
      setIsTransitioning(true);
      setTimeout(() => {
        setMessages([newMessage]);
        setIsTransitioning(false);
        setIsStreaming(true);
      }, 600);
    } else {
      setMessages(prev => [...prev, newMessage]);
      setIsStreaming(true);
    }

    try {
      // Upload files if any
      let fileObjs: any[] = [];
      if (files && files.length > 0) {
        fileObjs = await uploadFiles(files);
      }

      // Save user message to Supabase
      const { data: savedUserMsg, error: userMsgError } = await supabase
        .from('messages')
        .insert({
          thread_id: activeThreadId,
          role: 'user',
          content: content,
          model: selectedModel,
        })
        .select()
        .single();

      if (userMsgError) {
        console.error('Failed to save user message:', userMsgError);
        toast({
          title: 'Error',
          description: 'Failed to save message',
          variant: 'destructive'
        });
        setIsStreaming(false);
        return;
      }

      // Update temp message with real ID
      setMessages(prev => prev.map(m => 
        m.id === newMessage.id ? { ...m, id: savedUserMsg.id } : m
      ));

      // Build conversation history for context
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Call n8n webhook
      const n8nResult = await sendChatMessage({
        message: content,
        userId: user.id,
        projectId: selectedProject?.id || 'default',
        projectSlug: selectedProject?.slug || 'default',
        model: selectedModel,
        threadId: activeThreadId,
        fileUrls: fileObjs,
        systemPrompt: systemPrompt,
        conversationHistory
      });

      const aiReply = n8nResult.reply || n8nResult.output || 'No response received';

      // Calculate and deduct credits
      const inputTokens = estimateTokens(
        systemPrompt +
        conversationHistory.map(m => m.content).join('\n') +
        content
      );
      const outputTokens = estimateTokens(aiReply);
      const cost = calculateChatCost(selectedModel, inputTokens, outputTokens);

      // Deduct credits
      const { data: userData } = await supabase
        .from('users')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (userData) {
        const newCredits = Number(userData.credits) - cost;
        await supabase
          .from('users')
          .update({
            credits: newCredits,
            last_credit_update: new Date().toISOString()
          })
          .eq('id', user.id);

        // Log usage
        await supabase.from('usage_logs').insert({
          user_id: user.id,
          model: selectedModel,
          tokens_input: inputTokens,
          tokens_output: outputTokens,
          estimated_cost: cost,
        });

        refreshProfile();
      }

      // Save assistant message to Supabase
      const { data: assistantMessage } = await supabase
        .from('messages')
        .insert({
          thread_id: activeThreadId,
          role: 'assistant',
          content: aiReply,
          model: selectedModel,
          tokens_used: inputTokens + outputTokens,
        })
        .select()
        .single();

      // Add assistant message to UI
      const aiResponse: Message = {
        id: assistantMessage?.id || `ai-${Date.now()}`,
        role: "assistant",
        content: aiReply,
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit"
        })
      };
      setMessages(prev => [...prev, aiResponse]);

    } catch (error) {
      console.error('Send message error:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsStreaming(false);
    }
  };
  
  const handleFilesChange = (files: File[]) => {
    if (chatId) {
      setChatFiles(prev => ({
        ...prev,
        [chatId]: files
      }));
    } else {
      setExternalFiles(files);
    }
  };

  const isEmpty = messages.length === 0 && !isTransitioning;
  const showTransition = isTransitioning;
  
  return <div className="flex h-full flex-1 flex-col min-h-0 overflow-hidden relative">
      {/* Upgrade Dialog */}
      <UpgradeDialog 
        open={showUpgradeDialog} 
        onOpenChange={setShowUpgradeDialog}
        currentTier={userTier}
      />

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
            Hello, {profile?.name?.split(' ')[0] || 'there'}
          </h1>
          
          <div className="w-full max-w-2xl transition-all duration-500 ease-out">
            <ChatInput 
              onSendMessage={handleSendMessage} 
              disabled={isStreaming} 
              selectedProject={selectedProject} 
              onSelectProject={handleSelectProject} 
              selectedModel={selectedModel} 
              onSelectModel={setSelectedModel} 
              extendedThinking={extendedThinking} 
              onToggleExtendedThinking={() => setExtendedThinking(!extendedThinking)} 
              isEmptyState={true} 
              externalFiles={currentFiles} 
              onExternalFilesProcessed={handleFilesChange}
              userTier={userTier}
              onUpgradeClick={() => setShowUpgradeDialog(true)}
            />
          </div>

          {/* Project buttons - OUTSIDE chat input, styled like reference image */}
          <div 
            style={{ animationDelay: '0.2s' }} 
            className="mt-8 flex flex-wrap max-w-2xl animate-fade-in justify-center mx-0 gap-2 px-2"
          >
            {projects.map(project => (
              <button 
                key={project.id} 
                onClick={() => handleSelectProject(project)} 
                className={cn(
                  "flex items-center justify-center text-center rounded-full border px-4 py-2 transition-all duration-200 whitespace-nowrap",
                  selectedProject?.id === project.id 
                    ? "border-accent bg-accent/10 text-foreground"
                    : (project.isPremium && userTier !== "pro")
                      ? "border-border/50 bg-surface/30 text-muted-foreground"
                      : "border-border/30 bg-transparent hover:bg-surface-hover hover:border-border/50 text-muted-foreground"
                )}
              >
                {project.isPremium && userTier !== "pro" && <Lock className="h-3 w-3 mr-1.5 text-muted-foreground" />}
                <span className="text-sm">{project.name}</span>
              </button>
            ))}
          </div>
        </div> : showTransition ? (
        <div className="flex h-full flex-1 flex-col min-h-0 overflow-hidden relative">
          {/* Transitioning state - input animates from center to bottom */}
          <div className="absolute inset-0 flex items-center justify-center animate-[slide-down_0.6s_ease-out_forwards]">
            <div className="w-full max-w-2xl px-4">
              <ChatInput 
                onSendMessage={handleSendMessage} 
                disabled={true}
                selectedProject={selectedProject} 
                onSelectProject={handleSelectProject} 
                selectedModel={selectedModel} 
                onSelectModel={setSelectedModel} 
                extendedThinking={extendedThinking} 
                onToggleExtendedThinking={() => setExtendedThinking(!extendedThinking)} 
                isEmptyState={true} 
                externalFiles={currentFiles} 
                onExternalFilesProcessed={handleFilesChange}
                userTier={userTier}
                onUpgradeClick={() => setShowUpgradeDialog(true)}
              />
            </div>
          </div>
        </div>
      ) : <div className="flex flex-1 flex-col min-h-0 overflow-hidden animate-fade-in relative">
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
          <button
            onClick={scrollToBottom}
            className={cn(
              "absolute bottom-44 left-1/2 -translate-x-1/2 h-10 w-10 rounded-full bg-surface border border-border shadow-lg flex items-center justify-center hover:bg-surface-hover transition-all duration-300 z-10",
              showScrollButton ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
          >
            <ArrowDown className="h-5 w-5 text-muted-foreground" />
          </button>

          <div className="shrink-0 transition-all duration-500 ease-out">
            <ChatInput 
              onSendMessage={handleSendMessage} 
              disabled={isStreaming} 
              selectedProject={selectedProject} 
              onSelectProject={handleSelectProject} 
              selectedModel={selectedModel} 
              onSelectModel={setSelectedModel} 
              extendedThinking={extendedThinking} 
              onToggleExtendedThinking={() => setExtendedThinking(!extendedThinking)} 
              externalFiles={currentFiles} 
              onExternalFilesProcessed={handleFilesChange}
              userTier={userTier}
              onUpgradeClick={() => setShowUpgradeDialog(true)}
            />
          </div>
        </div>}
    </div>;
}