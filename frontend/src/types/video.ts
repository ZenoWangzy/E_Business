/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Video Studio Types
 * Type definitions for video generation and TTS configuration.
 *
 * Story关联: Story 4.1: Video Studio UI & Story 4.4: TTS Integration
 *
 * [INPUT]:
 * - Video Mode: 'creative-ad' or 'functional-intro'
 * - Duration: 15 or 30 seconds
 * - Music: Background music selection
 * - TTS Config: Voice ID, speed, volume
 *
 * [LINK]:
 * - 使用组件 -> @/components/business/VideoStudio
 * - 后端API -> /api/v1/video/*
 *
 * [OUTPUT]: Video configuration, player config, audio track config
 * [POS]: /frontend/src/types/video.ts
 *
 * [PROTOCOL]:
 * 1. Mode selection determines prompt template style
 * 2. Duration options limited to 15s or 30s
 * 3. Voice options from OpenAI TTS (nova, alloy, echo, shimmer)
 * 4. All configuration uses camelCase frontend convention
 *
 * === END HEADER ===
 */

// Mode Selection Types
export type VideoMode = 'creative-ad' | 'functional-intro';
export type VideoDuration = 15 | 30;
export type BackgroundMusic = 'upbeat-corporate' | 'relaxed-ambient' | 'modern-tech' | 'classic-motivational';

// Video Configuration
export interface VideoConfig {
    mode: VideoMode;
    duration: VideoDuration;
    music: BackgroundMusic;
}

// Mode Options with Accessibility Labels
export interface VideoModeOption {
    value: VideoMode;
    label: string;
    ariaLabel: string;
    description: string;
}

export const VIDEO_MODE_OPTIONS: VideoModeOption[] = [
    {
        value: 'creative-ad',
        label: '创意广告',
        ariaLabel: 'Creative Ad mode - Create engaging promotional content',
        description: '生成引人注目的广告，包含动态视觉效果和有说服力的信息',
    },
    {
        value: 'functional-intro',
        label: '功能介绍',
        ariaLabel: 'Functional Intro mode - Create professional introductions',
        description: '制作简洁专业的产品介绍视频，适合品牌展示',
    },
];

// Duration Options
export interface DurationOption {
    value: VideoDuration;
    label: string;
}

export const DURATION_OPTIONS: DurationOption[] = [
    { value: 15, label: '15 秒' },
    { value: 30, label: '30 秒' },
];

// Music Options
export interface MusicOption {
    value: BackgroundMusic;
    label: string;
    description: string;
}

export const MUSIC_OPTIONS: MusicOption[] = [
    { value: 'upbeat-corporate', label: '欢快商务', description: '积极向上的企业风格' },
    { value: 'relaxed-ambient', label: '轻松环境', description: '舒缓放松的背景音乐' },
    { value: 'modern-tech', label: '现代科技', description: '科技感十足的电子音乐' },
    { value: 'classic-motivational', label: '经典励志', description: '充满激情的励志曲调' },
];

// Default Configuration
export const DEFAULT_VIDEO_CONFIG: VideoConfig = {
    mode: 'creative-ad',
    duration: 15,
    music: 'upbeat-corporate',
};

// ---------- Story 4.4: Video Preview & TTS Types ----------

export interface AudioTrackConfig {
    voiceId: string;
    speed: number;
    volume: number;
}

export interface VideoPlayerConfig {
    id: string;
    projectId: string;
    title: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    videoUrl?: string;
    duration?: number;
    progress: number;
    quality: '720p' | '1080p' | '4K';
    audioTrack?: {
        voiceId: string;
        speed: number;
        createdAt: string;
    };
}

export const VOICE_OPTIONS = [
    { value: 'nova', label: 'Nova (女性, 自然)' },
    { value: 'alloy', label: 'Alloy (中性, 清晰)' },
    { value: 'echo', label: 'Echo (男性, 沉稳)' },
    { value: 'shimmer', label: 'Shimmer (女性, 活力)' },
] as const;

export const DEFAULT_AUDIO_CONFIG: AudioTrackConfig = {
    voiceId: 'nova',
    speed: 1.0,
    volume: 1.0,
};

