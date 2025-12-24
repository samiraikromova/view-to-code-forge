// n8n Webhook callback handler for CB4 project

export interface N8nChatCallback {
  threadId: string
  response: string
  tokensUsed?: number
  model?: string
}

export function parseN8nCallback(payload: unknown): N8nChatCallback | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const data = payload as Record<string, unknown>
  
  if (!data.threadId || !data.response) {
    console.error('Invalid n8n callback payload')
    return null
  }

  return {
    threadId: String(data.threadId),
    response: String(data.response),
    tokensUsed: typeof data.tokensUsed === 'number' ? data.tokensUsed : undefined,
    model: typeof data.model === 'string' ? data.model : undefined,
  }
}
