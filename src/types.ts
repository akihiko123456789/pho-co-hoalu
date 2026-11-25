export type PageView = 'home' | 'about' | 'explore' | 'gallery' | 'map' | 'admin';

export interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  content: string;
  image_url: string;
  section_order: number;
  is_featured: number;
  created_at: string;
  updated_at: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  caption: string;
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  filename: string;
  mime_type: string;
  content: string;
  is_primary: number;
  chunk_count?: number;
  embedded_count?: number;
  created_at: string;
  updated_at: string;
}

export interface AiConfig {
  id: number;
  model: string;
  system_instruction: string;
  thinking_level: string;
  max_context_chunks: number;
  log_conversations: number;
  updated_at: string;
}

export interface ChatLog {
  id: number;
  session_id: string;
  user_message: string;
  assistant_reply: string;
  sources_used: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
  followUpSuggestions?: string[];
  timestamp: number;
  isError?: boolean;
}

export interface LandmarkPin {
  id: string;
  name: string;
  category: 'trong_khu' | 'ket_hop';
  subtitle: string;
  description: string;
  note: string;
  lat: number;
  lng: number;
  image_url: string;
}
