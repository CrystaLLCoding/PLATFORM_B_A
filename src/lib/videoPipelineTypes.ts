export type SpeakerRole = 'host_analyst' | 'cohost_strategist';

export type VisualStyle = 
  | 'cinematic_realistic' 
  | 'isometric_3d' 
  | 'dark_tech_hud' 
  | 'corporate_minimal';

export interface KeyMetricBadge {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

export interface StoryboardScene {
  id: string;
  sceneIndex: number;
  title: string;
  durationSeconds: number;
  speaker: SpeakerRole;
  speakerName: string; // e.g., "Алекс (Аналитик)", "Елена (Стратег)"
  scriptText: string;
  visualPrompt: string;
  cameraAngle: string; // e.g., "Wide angle cinematic 8k", "Close up on financial charts"
  mood: string; // e.g., "Tense discovery", "Calculated breakthrough", "Strategic horizon"
  keyMetricBadge?: KeyMetricBadge;
  imageUrl?: string;
  videoClipUrl?: string;
  audioUrl?: string;
}

export interface VideoPipelineProject {
  caseId: string;
  businessTitle: string;
  visualStyle: VisualStyle;
  status: 'draft' | 'storyboard_ready' | 'generating_media' | 'completed';
  scenes: StoryboardScene[];
  totalDurationSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceSettings {
  provider: 'browser' | 'elevenlabs' | 'openai';
  hostVoiceUri?: string;
  cohostVoiceUri?: string;
  playbackSpeed: number;
}
