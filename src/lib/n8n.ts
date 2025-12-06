// n8n webhook service for direct calls from frontend
// Your n8n webhooks should be configured to accept CORS requests

const N8N_CHAT_WEBHOOK_URL = import.meta.env.VITE_N8N_CHAT_WEBHOOK_URL || 'https://n8n.leveragedcreator.ai/webhook/cb4-chat'
const N8N_IMAGE_WEBHOOK_URL = import.meta.env.VITE_N8N_IMAGE_WEBHOOK_URL || 'https://n8n.leveragedcreator.ai/webhook/cb4-chat'

export interface ChatPayload {
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

export interface ImagePayload {
  message: string
  userId: string
  projectId: string
  projectSlug: string
  quality: string
  numImages: number
  aspectRatio: string
  threadId: string | null
  isImageGeneration: boolean
}

export interface ChatResponse {
  reply?: string
  output?: string
  error?: string
}

export interface ImageResponse {
  imageUrls?: string[]
  isTextResponse?: boolean
  message?: string
  reply?: string
  error?: string
}

export async function sendChatMessage(payload: ChatPayload): Promise<ChatResponse> {
  const response = await fetch(N8N_CHAT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('N8N webhook failed:', errorText)
    throw new Error('AI processing failed')
  }

  return response.json()
}

export async function generateImage(payload: ImagePayload): Promise<ImageResponse> {
  const response = await fetch(N8N_IMAGE_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('N8N image webhook failed:', errorText)
    throw new Error('Image generation failed')
  }

  return response.json()
}

// Token estimation (same as your backend)
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// Cost calculation with 3x markup (matching your backend)
const MARKUP_MULTIPLIER = 3

export function calculateChatCost(model: string, inputTokens: number, outputTokens: number): number {
  const priceMap: Record<string, { input: number; output: number }> = {
    'Claude Sonnet 4.5': { input: 3.00, output: 15.00 },
    'Claude Haiku 4.5': { input: 0.80, output: 4.00 },
    'Claude Opus 4.1': { input: 15.00, output: 75.00 },
  }

  const costs = priceMap[model] || priceMap['Claude Haiku 4.5']
  const inputCost = (inputTokens / 1_000_000) * costs.input
  const outputCost = (outputTokens / 1_000_000) * costs.output

  return (inputCost + outputCost) * MARKUP_MULTIPLIER
}

export function calculateImageCost(quality: string, numImages: number): number {
  const basePricing: Record<string, number> = {
    'TURBO': 0.03,
    'BALANCED': 0.06,
    'QUALITY': 0.09
  }

  const baseCost = basePricing[quality] || 0.06
  return baseCost * numImages * MARKUP_MULTIPLIER
}
