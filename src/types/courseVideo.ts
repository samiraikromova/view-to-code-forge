export interface CourseVideo {
  id: string;
  title: string;
  description: string | null;
  vdocipher_id: string | null;
  fireflies_embed_url: string | null;
  category: 'course' | 'call_recording';
  module: string;
  duration: string | null;
  duration_formatted: string | null;
  thumbnail_url: string | null;
  transcript_url: string | null;
  transcript_id: string | null;
  transcript_text: string | null;
  overview: string | null;
  keywords: string[] | null;
  call_date: string | null;
  speaker_count: number | null;
  conversation_turns: number | null;
  file_size_kb: number | null;
  order_index: number;
  access_type: 'free' | 'tier_required' | 'purchase_required' | 'unlock_required';
  required_tier: string | null;
  product_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonFile {
  id: string;
  lesson_id: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  storage_path: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface TranscriptData {
  metadata?: {
    title?: string;
    date?: string;
    duration_formatted?: string;
  };
  transcript?: Array<{
    speaker: string;
    text: string;
  }>;
  summary?: {
    overview?: string;
    keywords?: string[];
  };
}
