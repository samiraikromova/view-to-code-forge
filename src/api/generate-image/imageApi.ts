// API service for image generation
// Calls n8n webhook for image generation

const N8N_IMAGE_WEBHOOK = 'https://n8n.leveragedcreator.ai/webhook/generate-image'

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
}

export interface ImageGenerationResponse {
  imageUrls?: string[]
  isTextResponse?: boolean
  message?: string
  reply?: string
  error?: string
}

export async function generateImageViaAPI(payload: ImageGenerationPayload): Promise<ImageGenerationResponse> {
  try {
    const response = await fetch(N8N_IMAGE_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Image generation API error:', errorText)
      return { error: 'Failed to generate image' }
    }

    return await response.json()
  } catch (error) {
    console.error('Image generation exception:', error)
    return { error: 'Network error occurred' }
  }
}
