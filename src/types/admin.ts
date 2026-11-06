export type UserRole = 'user' | 'admin' | 'super_admin';
export type PlanTier = 'free' | 'plus' | 'pro';
export type UserStatus = 'active' | 'suspended' | 'banned';
export type SubscriptionProvider = 'stripe' | 'paypal' | 'lemon_squeezy' | 'none';

export interface UserUsageTracking {
  daily_ai_capacity_used?: number;
  tts_characters_used_monthly?: number;
  rewarded_bonus?: number;
  last_daily_reset?: string;
  last_monthly_reset?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  display_name?: string;
  role: UserRole;
  is_admin: boolean;
  status: UserStatus;
  country?: string;
  currency?: string;
  created_at: string;
  last_sign_in_at?: string;
  current_plan: PlanTier;
  plan?: PlanTier;
  subscription_status: 'active' | 'canceled' | 'past_due' | 'suspended' | 'none' | string;
  subscription_provider: SubscriptionProvider;
  stripe_customer_id?: string;
  paypal_subscription_id?: string;
  subscription_start?: string;
  subscription_end?: string;
  user_usage_tracking?: UserUsageTracking | UserUsageTracking[] | null;
  usage: {
    chat_today: number;
    image_generation_today: number;
    image_edit_today: number;
    document_analysis_today?: number;
    daily_ai_capacity_used: number; // in capacity units
    daily_ai_capacity_limit: number;
    tts_characters_used_monthly: number;
    tts_characters_limit_monthly: number;
    rewarded_bonus: number;
  };
}

export type ReservationStatus = 'reserved' | 'completed' | 'refunded';

export interface CapacityReservation {
  reservation_id: string;
  user_id: string;
  user_email: string;
  feature: 'gemini_chat' | 'image_gen' | 'image_edit' | 'video_render' | 'tts_speech' | 'doc_ocr' | string;
  cost: number;
  status: ReservationStatus;
  created_at: string;
  metadata?: {
    model?: string;
    character_count?: number;
    prompt_tokens?: number;
    dimensions?: string;
    duration_seconds?: number;
  };
}

export interface VideoQueueItem {
  id: string;
  user_id: string;
  user_email: string;
  tier: 'creative' | 'super_creative' | string;
  engine: 'luma_dream_machine' | 'runway_gen3' | 'kling_1_5' | 'minimax_hailuo' | string;
  prompt: string;
  aspect_ratio: '16:9' | '9:16' | '1:1' | string;
  input_image_preview?: string;
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  progress: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  refunded: boolean;
}

export interface VoiceSessionItem {
  session_id: string;
  user_id: string;
  user_email: string;
  voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede' | string;
  status: 'connected' | 'reconnecting' | 'terminating';
  duration_seconds: number;
  credits_consumed: number;
  client_ip: string;
  client_region: string;
  audio_protocol: 'WebRTC' | 'WebSocket';
  started_at: string;
}

export interface PlanLimitConfig {
  tier: PlanTier;
  daily_chat_limit: number;
  image_generation_limit: number;
  image_edit_limit: number;
  document_ai_ocr_limit: number;
  monthly_tts_character_allowance: number;
  max_single_tts_generation_caps: number;
  parallel_video_slots: number;
  max_context_tokens: number;
}

export interface GlobalBroadcastConfig {
  maintenance_mode: boolean;
  announcement_enabled: boolean;
  priority: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  action_url?: string;
  expires_at?: string;
  updated_at: string;
  updated_by: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id?: string;
  admin_email: string;
  action: string;
  target_user_id?: string;
  details: Record<string, any>;
  ip_address: string;
  created_at: string;
}

export interface SecurityAnomaly {
  id: string;
  type: 'SSRF_BLOCK' | 'DUPLICATE_RESERVATION' | 'TOKEN_REVOCATION_FAILURE' | 'RATE_LIMIT_BURST' | string;
  source_ip: string;
  endpoint: string;
  user_id?: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

export interface ProviderHealth {
  provider: string;
  model_or_service: string;
  status: 'nominal' | 'degraded' | 'outage';
  latency_ms: number;
  last_ping: string;
  uptime_pct_30d: number;
}

export interface DashboardMetrics {
  total_users: number;
  active_plus_users: number;
  active_pro_users: number;
  estimated_mrr: number;
  provider_breakdown: {
    stripe: number;
    paypal: number;
    lemon_squeezy: number;
  };
  daily_capacity_burn: {
    consumed_today: number;
    total_allowance: number;
    burn_rate_pct: number;
  };
  monthly_tts_burn: {
    consumed_characters: number;
    total_monthly_pool: number;
  };
  feature_breakdown?: {
    chat: number;
    image_generation: number;
    edits: number;
    document_analysis: number;
  };
  active_video_renders: number;
  active_voice_sessions: number;
}
