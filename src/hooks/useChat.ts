import { useState, useCallback } from 'react'
import { supabase, Message, ChatThread } from '@/lib/supabase'
import { sendChatMessage, estimateTokens, calculateChatCost } from '@/lib/n8n'
import { toast } from '@/hooks/use-toast'

interface UseChatOptions {
  userId: string
  projectId: string
  projectSlug: string
  systemPrompt?: string
}

export function useChat({ userId, projectId, projectSlug, systemPrompt = '' }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('Claude Sonnet 4.5')

  const loadThreads = useCallback(async () => {
    const { data } = await supabase
      .from('chat_threads')
      .select('*')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (data) setThreads(data)
  }, [userId, projectId])

  const loadMessages = useCallback(async (threadId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    if (data) setMessages(data)
  }, [])

  const createThread = async (title: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('chat_threads')
      .insert({
        user_id: userId,
        project_id: projectId,
        title: title.substring(0, 50),
        model: selectedModel,
      })
      .select()
      .single()

    if (error) {
      console.error('Thread creation failed:', error)
      toast({
        title: 'Error',
        description: 'Failed to create chat thread',
        variant: 'destructive'
      })
      return null
    }

    return data?.id || null
  }

  const switchThread = async (threadId: string) => {
    setCurrentThreadId(threadId)
    await loadMessages(threadId)
  }

  const createNewChat = () => {
    setCurrentThreadId(null)
    setMessages([])
  }

  const deleteThread = async (threadId: string) => {
    await supabase.from('chat_threads').delete().eq('id', threadId)
    if (currentThreadId === threadId) {
      createNewChat()
    }
    await loadThreads()
  }

  const renameThread = async (threadId: string, newTitle: string) => {
    const { error } = await supabase
      .from('chat_threads')
      .update({ title: newTitle.trim() })
      .eq('id', threadId)

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to rename chat',
        variant: 'destructive'
      })
    } else {
      await loadThreads()
    }
  }

  const uploadFiles = async (files: File[]): Promise<Array<{ url: string; name: string; type?: string; size?: number }>> => {
    const uploaded: Array<{ url: string; name: string; type?: string; size?: number }> = []
    
    for (const file of files) {
      const filePath = `${userId}/${Date.now()}-${file.name}`
      const { error: uploadErr } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file, { cacheControl: '3600', upsert: false })

      if (uploadErr) {
        console.error('Upload error:', uploadErr)
        continue
      }

      const { data } = supabase.storage.from('chat-files').getPublicUrl(filePath)
      if (data?.publicUrl) {
        uploaded.push({
          url: data.publicUrl,
          name: file.name,
          type: file.type,
          size: file.size
        })
      }
    }
    return uploaded
  }

  const sendMessage = async (
    messageText: string, 
    files: File[] = [],
    onCreditsUpdate?: (newCredits: number) => void
  ) => {
    if (!messageText.trim() && files.length === 0) return

    setLoading(true)

    // Display content with file names
    const displayContent = messageText + (files.length ? `\n\nAttached: ${files.map(f => f.name).join(", ")}` : "")
    const tempId = `tmp-${Date.now()}`

    // Add user message optimistically
    setMessages(prev => [...prev, {
      id: tempId,
      role: 'user',
      content: displayContent,
      created_at: new Date().toISOString(),
      thread_id: currentThreadId || ''
    }])

    try {
      // Upload files if any
      let fileObjs: any[] = []
      if (files.length > 0) {
        fileObjs = await uploadFiles(files)
      }

      // Create thread if needed
      let activeThreadId = currentThreadId
      if (!activeThreadId) {
        activeThreadId = await createThread(messageText)
        if (!activeThreadId) {
          setLoading(false)
          return
        }
        setCurrentThreadId(activeThreadId)
      }

      // Get conversation history
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }))

      // Save user message to Supabase
      const { data: userMessage, error: userMsgError } = await supabase
        .from('messages')
        .insert({
          thread_id: activeThreadId,
          role: 'user',
          content: messageText,
          model: selectedModel,
        })
        .select()
        .single()

      if (userMsgError) {
        console.error('Failed to save user message:', userMsgError)
        toast({
          title: 'Error',
          description: 'Failed to save message',
          variant: 'destructive'
        })
        setLoading(false)
        return
      }

      // Update temp message with real ID
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, id: userMessage.id } : m
      ))

      // Call n8n webhook
      const n8nResult = await sendChatMessage({
        message: messageText,
        userId,
        projectId,
        projectSlug,
        model: selectedModel,
        threadId: activeThreadId,
        fileUrls: fileObjs,
        systemPrompt,
        conversationHistory
      })

      const aiReply = n8nResult.reply || n8nResult.output || 'No response'

      // Calculate and deduct credits
      const inputTokens = estimateTokens(
        systemPrompt +
        conversationHistory.map(m => m.content).join('\n') +
        messageText
      )
      const outputTokens = estimateTokens(aiReply)
      const cost = calculateChatCost(selectedModel, inputTokens, outputTokens)

      // Deduct credits via RLS-protected update
      const { data: userData } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single()

      if (userData) {
        const newCredits = Number(userData.credits) - cost
        await supabase
          .from('users')
          .update({
            credits: newCredits,
            last_credit_update: new Date().toISOString()
          })
          .eq('id', userId)

        // Log usage
        await supabase.from('usage_logs').insert({
          user_id: userId,
          model: selectedModel,
          tokens_input: inputTokens,
          tokens_output: outputTokens,
          estimated_cost: cost,
        })

        if (onCreditsUpdate) {
          onCreditsUpdate(newCredits)
        }
      }

      // Save assistant message
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
        .single()

      // Add assistant message to UI
      setMessages(prev => [...prev, {
        id: assistantMessage?.id || `ai-${Date.now()}`,
        role: 'assistant',
        content: aiReply,
        created_at: new Date().toISOString(),
        thread_id: activeThreadId
      }])

      // Refresh threads list
      await loadThreads()

    } catch (error) {
      console.error('Send message error:', error)
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return {
    messages,
    threads,
    currentThreadId,
    loading,
    selectedModel,
    setSelectedModel,
    loadThreads,
    loadMessages,
    switchThread,
    createNewChat,
    deleteThread,
    renameThread,
    sendMessage
  }
}
