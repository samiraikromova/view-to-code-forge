import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageList } from "./MessageList";
import { ChatInput, ImageGenerationSettings } from "./ChatInput";
import { Project } from "./ChatHeader";
import { FileText, Lock, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { UpgradeDialog } from "./UpgradeDialog";
import { FreeTrialModal, SubscribeModal } from "@/components/payments";
import { SubscriptionTier } from "@/types/subscription";
import { useAuth } from "@/hooks/useAuth";
import { useAccess } from "@/hooks/useAccess";
import { supabase } from "@/lib/supabase";
import { sendChatMessage, estimateTokens, calculateChatCost, calculateImageCost } from "@/lib/n8n";
import { generateImageViaAPI } from "@/api/generate-image/imageApi";
import { toast } from "@/hooks/use-toast";

interface FileAttachment {
  url: string;
  name: string;
  type?: string;
  size?: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  files?: FileAttachment[];
}

// No default project - user must select one to use project-specific features

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
  const [selectedModel, setSelectedModel] = useState("claude-haiku-4");
  const [extendedThinking, setExtendedThinking] = useState(false);
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [externalFiles, setExternalFiles] = useState<File[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [chatFiles, setChatFiles] = useState<Record<string, File[]>>({});
  // Store already-uploaded file attachments (URLs) to send with subsequent messages
  const [uploadedAttachments, setUploadedAttachments] = useState<FileAttachment[]>([]);
  const [userTier, setUserTier] = useState<SubscriptionTier>("starter");
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const { hasChatAccess, needsTrial, needsSubscription, trialExpired, refreshAccess } = useAccess();
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

  // Set user tier from profile with proper mapping
  useEffect(() => {
    if (profile?.subscription_tier) {
      // Map tier values from database to UI tiers
      const tierMap: Record<string, SubscriptionTier> = {
        'free': 'free',
        'tier1': 'starter',
        'starter': 'starter',
        'tier2': 'pro',
        'pro': 'pro'
      };
      setUserTier(tierMap[profile.subscription_tier] || 'free');
    }
  }, [profile]);

  // Load messages for existing chat and auto-select its project
  useEffect(() => {
    if (chatId && user) {
      loadMessages(chatId);
      // Fetch thread's project and auto-select it
      loadThreadProject(chatId);
    } else {
      setMessages([]);
      setCurrentThreadId(null);
      // Clear uploaded attachments when starting a new chat
      setUploadedAttachments([]);
    }
    if (chatId && externalFiles.length > 0) {
      setExternalFiles([]);
    }
  }, [chatId, user]);

  // Load thread's project from database
  const loadThreadProject = async (threadId: string) => {
    const { data: thread } = await supabase
      .from('chat_threads')
      .select('project_id')
      .eq('id', threadId)
      .single();

    if (thread?.project_id && projects.length > 0) {
      const project = projects.find(p => p.id === thread.project_id);
      if (project) {
        setSelectedProject(project);
        if ('systemPrompt' in project) {
          setSystemPrompt((project as any).systemPrompt || "");
        }
      }
    }
  };

  const loadMessages = async (threadId: string) => {
    // Fetch messages
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    // Fetch file uploads for this thread
    const { data: fileUploads } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('thread_id', threadId);

    if (messagesData) {
      const mapped = messagesData.map(m => {
        // Get files for this message from file_uploads table
        const messageFiles = fileUploads?.filter(f => f.message_id === m.id).map(f => {
          const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(f.file_path);
          return {
            url: urlData?.publicUrl || '',
            name: f.filename,
            type: f.file_type,
            size: f.file_size
          };
        }) || [];

        return {
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date(m.created_at).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit"
          }),
          files: messageFiles.length > 0 ? messageFiles : undefined
        };
      });
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

  // Handle deleting an image from a message
  const handleDeleteImage = (imageUrl: string) => {
    // Remove the image URL from any message that contains it
    setMessages(prev => prev.map(msg => {
      if (msg.content.includes(imageUrl)) {
        // Remove the URL from the content
        const newContent = msg.content
          .split('\n')
          .filter(line => !line.includes(imageUrl))
          .join('\n');
        return { ...msg, content: newContent };
      }
      return msg;
    }).filter(msg => msg.content.trim().length > 0));
    
    toast({
      title: 'Image deleted',
      description: 'The image has been removed from the chat.',
    });
  };

  // Helper to get proper MIME type
  const getMimeType = (file: File): string => {
    // Use the browser-detected type if available
    if (file.type && file.type !== 'application/octet-stream') {
      return file.type;
    }
    // Fallback to extension-based detection
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const mimeMap: Record<string, string> = {
      // Images
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
      'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml',
      'ico': 'image/x-icon', 'bmp': 'image/bmp',
      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Text/Code
      'txt': 'text/plain', 'csv': 'text/csv', 'json': 'application/json',
      'xml': 'application/xml', 'html': 'text/html', 'css': 'text/css',
      'js': 'application/javascript', 'ts': 'application/typescript',
      'md': 'text/markdown',
      // Archives
      'zip': 'application/zip', 'rar': 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      // Audio/Video
      'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'mp4': 'video/mp4',
      'webm': 'video/webm', 'avi': 'video/x-msvideo',
    };
    return mimeMap[ext] || 'application/octet-stream';
  };

  const uploadFiles = async (files: File[], threadId?: string, messageId?: string): Promise<FileAttachment[]> => {
    if (!user) return [];
    const uploaded: FileAttachment[] = [];
    
    for (const file of files) {
      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const mimeType = getMimeType(file);
      
      const { error: uploadErr } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file, { 
          cacheControl: '3600', 
          upsert: false,
          contentType: mimeType 
        });

      if (uploadErr) {
        console.error('Upload error:', uploadErr);
        continue;
      }

      const { data } = supabase.storage.from('chat-files').getPublicUrl(filePath);
      if (data?.publicUrl) {
        // Record in file_uploads table with proper file type
        await supabase.from('file_uploads').insert({
          thread_id: threadId || null,
          message_id: messageId || null,
          filename: file.name,
          file_path: filePath,
          file_type: mimeType,
          file_size: file.size,
        });

        uploaded.push({
          url: data.publicUrl,
          name: file.name,
          type: mimeType,
          size: file.size
        });
      }
    }
    return uploaded;
  };

  const handleSendMessage = async (content: string, files?: File[], imageSettings?: ImageGenerationSettings) => {
    if (!user) {
      console.warn('No user found - should be authenticated');
      return;
    }

    // Check chat access - show trial or subscribe modal if needed
    if (!hasChatAccess) {
      if (needsTrial()) {
        setShowTrialModal(true);
        return;
      } else if (needsSubscription()) {
        setShowSubscribeModal(true);
        return;
      }
      // No access and no way to get it shown
      toast({
        title: 'Chat Locked',
        description: 'Please subscribe to use the AI chat.',
        variant: 'destructive'
      });
      return;
    }
    
    // Check if this is an image generation request
    const isImageGeneration = selectedProject?.name?.toLowerCase().includes('image') && 
                              selectedProject?.name?.toLowerCase().includes('generator') &&
                              imageSettings !== undefined;

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

    // Upload new files first (with thread_id, message_id will be updated after message is saved)
    let newFileObjs: FileAttachment[] = [];
    if (files && files.length > 0) {
      newFileObjs = await uploadFiles(files, activeThreadId);
      // Store newly uploaded attachments for future messages
      setUploadedAttachments(prev => [...prev, ...newFileObjs]);
    }
    
    // Combine newly uploaded files with previously uploaded attachments for n8n
    const allFileObjs = [...uploadedAttachments, ...newFileObjs];

    const newMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
      }),
      files: newFileObjs.length > 0 ? newFileObjs : undefined
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

      // Save user message to Supabase
      // Try with files first, fallback to without files if column doesn't exist
      let savedUserMsg: any = null;
      let userMsgError: any = null;

      // First try without files column (safer)
      const insertData: any = {
        thread_id: activeThreadId,
        role: 'user',
        content: content,
        model: selectedModel,
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(insertData)
        .select()
        .single();

      savedUserMsg = data;
      userMsgError = error;

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

      // Update file_uploads with the message_id now that we have it (only for newly uploaded files)
      if (newFileObjs.length > 0 && savedUserMsg?.id) {
        for (const fileObj of newFileObjs) {
          // Extract file_path from URL
          const urlParts = fileObj.url.split('/chat-files/');
          const filePath = urlParts.length > 1 ? decodeURIComponent(urlParts[1]) : null;
          if (filePath) {
            await supabase
              .from('file_uploads')
              .update({ message_id: savedUserMsg.id })
              .eq('file_path', filePath);
          }
        }
      }

      // Build conversation history for context
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      let aiReply = '';
      let cost = 0;

      // Get the effective project - use selected project or empty (direct Claude chat)
      const effectiveProject = selectedProject;
      const effectiveProjectId = effectiveProject?.id || '';
      const effectiveProjectSlug = effectiveProject?.slug || 'You are helpful AI Assistant';
      
      console.log('📤 Sending message with project:', { 
        selectedProject: selectedProject?.name, 
        effectiveProjectSlug, 
        effectiveProjectId 
      });

      if (isImageGeneration && imageSettings) {
        // Handle image generation - API handles saving to DB
        const imageResult = await generateImageViaAPI({
          message: content,
          userId: user.id,
          projectId: effectiveProjectId,
          projectSlug: effectiveProjectSlug,
          quality: imageSettings.quality,
          numImages: imageSettings.numImages,
          aspectRatio: imageSettings.aspectRatio,
          threadId: activeThreadId,
          isImageGeneration: true
        });

        if (imageResult.error) {
          throw new Error(imageResult.error);
        }

        // Update thread ID if created by API
        if (imageResult.threadId && !activeThreadId) {
          activeThreadId = imageResult.threadId;
          setCurrentThreadId(activeThreadId);
        }

        // Build response with image URLs - API already saved to DB
        if (imageResult.imageUrls && imageResult.imageUrls.length > 0) {
          aiReply = imageResult.imageUrls.join('\n');
        } else if (imageResult.isTextResponse && imageResult.message) {
          aiReply = imageResult.message;
        } else {
          aiReply = 'Image generation completed but no images were returned.';
        }

        // Cost already deducted by API - just update UI
        cost = imageResult.cost || 0;
        refreshProfile();

        // Add assistant message to UI directly (already saved to DB by API)
        const aiResponse: Message = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: aiReply,
          timestamp: new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit"
          })
        };
        setMessages(prev => [...prev, aiResponse]);
        setIsStreaming(false);
        return; // Exit early - don't duplicate DB saves
      } else {
        // Handle regular chat
        const n8nResult = await sendChatMessage({
          message: content,
          userId: user.id,
          projectId: effectiveProjectId,
          projectSlug: effectiveProjectSlug,
          model: selectedModel,
          threadId: activeThreadId,
          fileUrls: allFileObjs,
          systemPrompt: systemPrompt || effectiveProject?.systemPrompt || '',
          conversationHistory,
          userContext: {
            businessName: profile?.business_name,
            address: profile?.address
          }
        });

        aiReply = n8nResult.reply || n8nResult.output || 'No response received';

        // Calculate chat cost
        const inputTokens = estimateTokens(
          systemPrompt +
          conversationHistory.map(m => m.content).join('\n') +
          content
        );
        const outputTokens = estimateTokens(aiReply);
        cost = calculateChatCost(selectedModel, inputTokens, outputTokens);
      }

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
          model: isImageGeneration ? 'Ideogram' : selectedModel,
          tokens_input: 0,
          tokens_output: 0,
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
          model: isImageGeneration ? 'Ideogram' : selectedModel,
          tokens_used: 0,
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

  // Show loading state while projects are loading
  if (projectsLoading) {
    return (
      <div className="flex h-full flex-1 flex-col min-h-0 overflow-hidden relative items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading chat...</p>
        </div>
      </div>
    );
  }
  
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
          <h1 className="mb-16 bg-gradient-to-r from-[#a85db8] to-[#8e4b9b] bg-clip-text text-5xl font-medium text-transparent animate-scale-in">
            Hello, {profile?.name?.split(' ')[0] || 'there'}
          </h1>
          
          <div className="w-full max-w-2xl transition-all duration-500 ease-out">
            <ChatInput 
              onSendMessage={handleSendMessage} 
              disabled={projectsLoading}
              isStreaming={isStreaming}
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
              projects={projects}
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
                isStreaming={isStreaming}
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
                projects={projects}
              />
            </div>
          </div>
        </div>
      ) : <div className="flex flex-1 flex-col min-h-0 overflow-hidden animate-fade-in relative">
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto relative">
            <MessageList messages={messages} isStreaming={isStreaming} onDeleteImage={handleDeleteImage} />
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
              disabled={false}
              isStreaming={isStreaming}
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
              projects={projects}
            />
          </div>
        </div>}

      {/* Modals */}
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        currentTier={userTier}
      />

      <FreeTrialModal
        isOpen={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        userId={user?.id || ''}
        onSuccess={() => refreshAccess()}
      />

      <SubscribeModal
        isOpen={showSubscribeModal}
        onClose={() => setShowSubscribeModal(false)}
        trialExpired={trialExpired}
      />
    </div>;
}