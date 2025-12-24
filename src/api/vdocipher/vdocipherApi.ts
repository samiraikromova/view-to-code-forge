// VdoCipher OTP API service for secure video playback

const VDOCIPHER_API_SECRET = import.meta.env.VITE_VDOCIPHER_API_SECRET || ''

export interface OtpResponse {
  otp: string
  playbackInfo: string
  error?: string
}

export async function getVideoOtp(videoId: string): Promise<OtpResponse> {
  if (!VDOCIPHER_API_SECRET) {
    return { otp: '', playbackInfo: '', error: 'VdoCipher API secret not configured' }
  }

  try {
    const response = await fetch(`https://dev.vdocipher.com/api/videos/${videoId}/otp`, {
      method: 'POST',
      headers: {
        'Authorization': `Apisecret ${VDOCIPHER_API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ttl: 300, // 5 minutes
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('VdoCipher OTP error:', errorText)
      return { otp: '', playbackInfo: '', error: 'Failed to get video OTP' }
    }

    const data = await response.json()
    return {
      otp: data.otp,
      playbackInfo: data.playbackInfo,
    }
  } catch (error) {
    console.error('VdoCipher OTP exception:', error)
    return { otp: '', playbackInfo: '', error: 'Network error occurred' }
  }
}
