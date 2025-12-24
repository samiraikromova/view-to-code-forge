// API service for chat operations
// This replaces Next.js API routes with direct Supabase/n8n calls

import { supabase } from '@/lib/supabase'

const N8N_CHAT_WEBHOOK = 'https://n8n.leveragedcreator.ai/webhook/cb4-chat'
const N8N_IMAGE_WEBHOOK = 'https://n8n.leveragedcreator.ai/webhook/generate-image'

export interface ChatRequestPayload {
  message: string
  userId: string
  projectId: string
  projectSlug: string
  model: string
  threadId: string | null
  fileUrls?: Array<{ url: string; name: string; type?: string; size?: number }>
  systemPrompt?: string
  conversationHistory: Array<{ role: string; content: string }>
}

export interface ChatApiResponse {
  reply?: string
  output?: string
  error?: string
}

export async function sendChatToN8N(payload: ChatRequestPayload): Promise<ChatApiResponse> {
  try {
    const response = await fetch(N8N_CHAT_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: payload.message,
        userId: payload.userId,
        projectId: payload.projectId,
        projectSlug: payload.projectSlug,
        model: payload.model,
        threadId: payload.threadId,
        fileUrls: payload.fileUrls || [],
        systemPrompt: payload.systemPrompt || '',
        conversationHistory: payload.conversationHistory,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Chat API error:', errorText)
      return { error: 'Failed to process message' }
    }

    return await response.json()
  } catch (error) {
    console.error('Chat API exception:', error)
    return { error: 'Network error occurred' }
  }
}

export async function fetchUserThreads(userId: string, projectId?: string) {
  let query = supabase
    .from('chat_threads')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch threads:', error)
    return []
  }

  return data || []
}

export async function deleteThread(threadId: string) {
  // First delete all messages in the thread
  await supabase.from('messages').delete().eq('thread_id', threadId)
  
  // Then delete the thread
  const { error } = await supabase.from('chat_threads').delete().eq('id', threadId)
  
  if (error) {
    console.error('Failed to delete thread:', error)
    return false
  }
  
  return true
}

export async function updateThreadTitle(threadId: string, title: string) {
  const { error } = await supabase
    .from('chat_threads')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', threadId)

  if (error) {
    console.error('Failed to update thread title:', error)
    return false
  }

  return true
}

export async function starThread(threadId: string, starred: boolean) {
  const { error } = await supabase
    .from('chat_threads')
    .update({ starred, updated_at: new Date().toISOString() })
    .eq('id', threadId)

  if (error) {
    console.error('Failed to star thread:', error)
    return false
  }

  return true
}
