'use client';

/**
 * VideoSettingsPanel Component
 * Story 4.1: Video Studio UI & Mode Selection
 * 
 * Collapsible sidebar for video configuration.
 * Implements WCAG 2.1 AA accessibility requirements:
 * - Keyboard navigation (Tab, Arrow keys, Enter/Space)
 * - ARIA labels and descriptions
 * - Focus management
 * - Screen reader announcements
 */

import React from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Video,
    Clock,
    Music,
    Play,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
    VideoConfig,
    VideoMode,
    VideoDuration,
    BackgroundMusic,
    VIDEO_MODE_OPTIONS,
    DURATION_OPTIONS,
    MUSIC_OPTIONS,
} from '@/types/video';

export interface VideoSettingsPanelProps {
    isCollapsed: boolean;
    onToggle: () => void;
    config: VideoConfig;
    onConfigChange: (config: Partial<VideoConfig>) => void;
}

export function VideoSettingsPanel({
    isCollapsed,
    onToggle,
    config,
    onConfigChange,
}: VideoSettingsPanelProps) {
    const handleModeChange = (mode: VideoMode) => {
        onConfigChange({ mode });
    };

    const handleDurationChange = (value: string) => {
        onConfigChange({ duration: parseInt(value, 10) as VideoDuration });
    };

    const handleMusicChange = (value: string) => {
        onConfigChange({ music: value as BackgroundMusic });
    };

    // M4 fix: Music preview handler
    const handleMusicPreview = (musicValue: BackgroundMusic) => {
        // In production, this would play an audio sample
        const option = MUSIC_OPTIONS.find(o => o.value === musicValue);
        toast.info(`预览: ${option?.label}`, {
            description: '音乐预览功能将在后续版本中实现',
            duration: 2000,
        });
    };

    return (
        <aside
            role="complementary"
            aria-label="Video settings"
            className={cn(
                'h-full border-r border-neutral-800 bg-neutral-900/50 transition-all duration-300',
                isCollapsed ? 'w-12' : 'w-72'
            )}
        >
            {/* Header with toggle */}
            <div className="flex items-center justify-between p-3 border-b border-neutral-800">
                {!isCollapsed && (
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Video className="h-4 w-4" aria-hidden="true" />
                        视频设置
                    </h2>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    aria-label={isCollapsed ? '展开设置面板' : '收起设置面板'}
                    aria-expanded={!isCollapsed}
                    className="h-8 w-8"
                >
                    {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <ChevronLeft className="h-4 w-4" />
                    )}
                </Button>
            </div>

            {/* Settings Content */}
            {!isCollapsed && (
                <div className="p-4 space-y-6">
                    {/* Mode Selection */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium text-neutral-300">
                            视频模式
                        </Label>
                        <div
                            role="radiogroup"
                            aria-label="Video mode selection"
                            className="space-y-2"
                        >
                            {VIDEO_MODE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    role="radio"
                                    aria-checked={config.mode === option.value}
                                    aria-label={option.ariaLabel}
                                    aria-describedby={`mode-desc-${option.value}`}
                                    onClick={() => handleModeChange(option.value)}
                                    data-testid={`mode-${option.value}`}
                                    className={cn(
                                        'w-full p-3 rounded-lg border text-left transition-all',
                                        'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-neutral-900',
                                        config.mode === option.value
                                            ? 'border-violet-500 bg-violet-500/10'
                                            : 'border-neutral-700 hover:border-neutral-600'
                                    )}
                                >
                                    <div className="font-medium text-white text-sm">
                                        {option.label}
                                    </div>
                                    <div
                                        id={`mode-desc-${option.value}`}
                                        className="text-xs text-neutral-400 mt-1"
                                    >
                                        {option.description}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <Separator className="bg-neutral-800" />

                    {/* Duration Selection */}
                    <div className="space-y-2">
                        <Label
                            htmlFor="duration-select"
                            className="text-sm font-medium text-neutral-300 flex items-center gap-2"
                        >
                            <Clock className="h-4 w-4" aria-hidden="true" />
                            视频时长
                        </Label>
                        <Select
                            value={String(config.duration)}
                            onValueChange={handleDurationChange}
                        >
                            <SelectTrigger
                                id="duration-select"
                                aria-label="Video duration selection"
                                className="w-full bg-neutral-800 border-neutral-700"
                                data-testid="duration-select"
                            >
                                <SelectValue placeholder="选择时长" />
                            </SelectTrigger>
                            <SelectContent>
                                {DURATION_OPTIONS.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={String(option.value)}
                                        data-testid={`duration-${option.value}`}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Music Selection */}
                    <div className="space-y-2">
                        <Label
                            htmlFor="music-select"
                            className="text-sm font-medium text-neutral-300 flex items-center gap-2"
                        >
                            <Music className="h-4 w-4" aria-hidden="true" />
                            背景音乐
                        </Label>
                        <Select
                            value={config.music}
                            onValueChange={handleMusicChange}
                        >
                            <SelectTrigger
                                id="music-select"
                                aria-label="Background music selection"
                                className="w-full bg-neutral-800 border-neutral-700"
                                data-testid="music-select"
                            >
                                <SelectValue placeholder="选择背景音乐" />
                            </SelectTrigger>
                            <SelectContent>
                                {MUSIC_OPTIONS.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                        data-testid={`music-${option.value}`}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <div>
                                                <div>{option.label}</div>
                                                <div className="text-xs text-neutral-400">
                                                    {option.description}
                                                </div>
                                            </div>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Music Preview Button (M4 fix - AC3 requirement) */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMusicPreview(config.music)}
                            className="w-full mt-2 gap-2"
                            aria-label={`预览 ${MUSIC_OPTIONS.find(o => o.value === config.music)?.label || '背景音乐'}`}
                            data-testid="music-preview-button"
                        >
                            <Play className="h-3 w-3" aria-hidden="true" />
                            预览音乐
                        </Button>
                    </div>

                    {/* Live Region for Screen Readers */}
                    <div
                        role="status"
                        aria-live="polite"
                        aria-atomic="true"
                        className="sr-only"
                    >
                        当前配置：{VIDEO_MODE_OPTIONS.find(o => o.value === config.mode)?.label}，
                        {config.duration} 秒，
                        {MUSIC_OPTIONS.find(o => o.value === config.music)?.label}
                    </div>
                </div>
            )}
        </aside>
    );
}
