// API service for image generation
// Calls n8n webhook for image generation - matches the route.ts pattern

import { supabase } from '@/lib/supabase'

const N8N_IMAGE_WEBHOOK = 'https://n8n.leveragedcreator.ai/webhook/cb4-chat'

// ✅ MARKUP MULTIPLIER - Charge users 3x actual cost
const MARKUP_MULTIPLIER = 3

export interface ImageGenerationPayload {
  message: string
  userId: string
  projectId: string
  projectSlug: string
  quality: string
  numImages: number
  aspectRatio: string
  threadId: string | null
  isImageGeneration: boolean
  fileUrls?: Array<{ url: string; name: string; type?: string; size?: number }>
}

export interface ImageGenerationResponse {
  imageUrls?: string[]
  isTextResponse?: boolean
  message?: string
  reply?: string
  error?: string
  cost?: number
  remainingCredits?: number
  threadId?: string
}

export async function generateImageViaAPI(payload: ImageGenerationPayload): Promise<ImageGenerationResponse> {
  try {
    console.log('🎨 Image generation request:', { 
      userId: payload.userId, 
      quality: payload.quality, 
      numImages: payload.numImages, 
      aspectRatio: payload.aspectRatio 
    })

    // Check credits first
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('credits')
      .eq('id', payload.userId)
      .single()

    if (userError || !user) {
      console.error('Failed to fetch user credits:', userError)
      return { error: 'Failed to verify credits' }
    }

    // Calculate cost with 3x markup
    const basePricing: Record<string, number> = {
      'TURBO': 0.03,
      'BALANCED': 0.06,
      'QUALITY': 0.09
    }

    const baseCost = basePricing[payload.quality] || 0.06
    const totalCost = baseCost * payload.numImages * MARKUP_MULTIPLIER

    console.log(`💰 Base cost: $${baseCost} x ${payload.numImages} images x ${MARKUP_MULTIPLIER}x markup = $${totalCost.toFixed(4)}`)

    if (Number(user.credits) < totalCost) {
      return { error: 'Insufficient credits. Please top up or upgrade your plan.' }
    }

    let currentThreadId = payload.threadId

    // Create thread if needed
    if (!currentThreadId) {
      const { data: newThread, error: threadError } = await supabase
        .from('chat_threads')
        .insert({
          user_id: payload.userId,
          project_id: payload.projectId,
          title: payload.message.substring(0, 50),
          model: 'Ideogram'
        })
        .select()
        .single()

      if (threadError) {
        console.error('Thread creation failed:', threadError)
        return { error: 'Failed to create chat thread' }
      }

      if (newThread) {
        currentThreadId = newThread.id
      }
    }

    // Save user message
    await supabase.from('messages').insert({
      thread_id: currentThreadId,
      role: 'user',
      content: payload.message,
      model: `Ideogram - ${payload.quality}`
    })

    // Build n8n payload matching the route.ts structure
    const n8nPayload = {
      message: payload.message,
      userId: payload.userId,
      projectId: payload.projectId,
      projectSlug: payload.projectSlug,
      quality: payload.quality,
      numImages: payload.numImages,
      aspectRatio: payload.aspectRatio,
      threadId: currentThreadId,
      isImageGeneration: true,
      fileUrls: payload.fileUrls || []
    }

    console.log('🔄 Calling N8N image webhook with payload:', n8nPayload)

    const response = await fetch(N8N_IMAGE_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Image generation API error:', errorText)
      return { error: 'Image generation failed' }
    }

    const result = await response.json()

    // Deduct credits
    const newCredits = Number(user.credits) - totalCost

    await supabase
      .from('users')
      .update({
        credits: newCredits,
        last_credit_update: new Date().toISOString()
      })
      .eq('id', payload.userId)

    // Log usage
    const { error: usageError } = await supabase.from('usage_logs').insert({
      user_id: payload.userId,
      model: `Ideogram - ${payload.quality}`,
      tokens_input: 0,
      tokens_output: 0,
      estimated_cost: totalCost,
    })

    if (usageError) {
      console.error('❌ Failed to log usage:', usageError)
    }

    // Save assistant message with all images (one message with all URLs)
    if (result.imageUrls && result.imageUrls.length > 0) {
      const uniqueUrls = [...new Set(result.imageUrls)]; // Deduplicate
      await supabase.from('messages').insert({
        thread_id: currentThreadId,
        role: 'assistant',
        content: uniqueUrls.join('\n'),
        model: `Ideogram - ${payload.quality}`
      })
    }

    return {
      imageUrls: result.imageUrls || [],
      cost: totalCost,
      remainingCredits: newCredits,
      threadId: currentThreadId,
      isTextResponse: result.isTextResponse || false,
      message: result.message || result.reply
    }
  } catch (error) {
    console.error('Image generation exception:', error)
    return { error: 'Network error occurred' }
  }
}
