export interface LessonFileItem {
  name: string;
  url: string;
  type: string;
  size?: number;
}

export interface CourseVideo {
  id: string;
  title: string;
  description: string | null;
  vdocipher_id: string | null;
  fireflies_embed_url: string | null;
  fireflies_video_url: string | null; // Direct mp4 URL from Fireflies CDN
  category: 'course' | 'call_recording';
  module: string; // Legacy field, kept for backward compatibility
  module_id: string | null; // Foreign key to modules table
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
  files: LessonFileItem[] | null;
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
