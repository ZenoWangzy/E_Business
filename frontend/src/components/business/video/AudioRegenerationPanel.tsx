'use client';

/**
 * AudioRegenerationPanel Component
 * Story 4.4: Video Preview & TTS Integration
 * 
 * Panel for controlling TTS audio regeneration settings.
 */

import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import {
    AudioTrackConfig,
    VOICE_OPTIONS,
    DEFAULT_AUDIO_CONFIG,
} from '@/types/video';

export interface AudioRegenerationPanelProps {
    projectId: string;
    currentConfig?: AudioTrackConfig;
    onRegenerate: (config: AudioTrackConfig) => Promise<void>;
    isRegenerating?: boolean;
}

export function AudioRegenerationPanel({
    projectId,
    currentConfig = DEFAULT_AUDIO_CONFIG,
    onRegenerate,
    isRegenerating = false,
}: AudioRegenerationPanelProps) {
    const [voiceId, setVoiceId] = useState(currentConfig.voiceId);
    const [speed, setSpeed] = useState(currentConfig.speed);
    const [volume, setVolume] = useState(currentConfig.volume);

    const handleRegenerate = async () => {
        await onRegenerate({
            voiceId,
            speed,
            volume,
        });
    };

    const hasChanges =
        voiceId !== currentConfig.voiceId ||
        speed !== currentConfig.speed ||
        volume !== currentConfig.volume;

    /**
     * Calculate estimated cost based on OpenAI TTS pricing.
     * OpenAI TTS-1 charges ~$0.015 per 1000 characters.
     * Base estimate: 500 chars for ~30s video at 1.0x speed.
     * Faster speed = fewer chars needed for same duration.
     */
    const calculateEstimatedCost = (speedMultiplier: number): number => {
        const baseChars = 500; // Estimated chars for 30s script
        const adjustedChars = baseChars / speedMultiplier;
        const costPerThousandChars = 0.015;
        return (adjustedChars / 1000) * costPerThousandChars;
    };

    return (
        <Card className="p-4 space-y-4 bg-neutral-900 border-neutral-800">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                    音频配置
                </h3>
                {hasChanges && (
                    <span className="text-xs text-violet-400">
                        * 有未保存的更改
                    </span>
                )}
            </div>

            {/* Voice Selection */}
            <div className="space-y-2">
                <label
                    htmlFor="voice-select"
                    className="text-xs font-medium text-neutral-300"
                >
                    AI 声音
                </label>
                <Select
                    value={voiceId}
                    onValueChange={setVoiceId}
                    disabled={isRegenerating}
                >
                    <SelectTrigger
                        id="voice-select"
                        className="bg-neutral-800 border-neutral-700"
                    >
                        <SelectValue placeholder="选择声音" />
                    </SelectTrigger>
                    <SelectContent>
                        {VOICE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Speed Control */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label
                        htmlFor="speed-slider"
                        className="text-xs font-medium text-neutral-300"
                    >
                        播放速度
                    </label>
                    <span className="text-xs text-neutral-400">{speed}x</span>
                </div>
                <Slider
                    id="speed-slider"
                    value={[speed]}
                    onValueChange={(value) => setSpeed(value[0])}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    disabled={isRegenerating}
                    className="w-full"
                    aria-label="调整播放速度"
                />
                <div className="flex justify-between text-xs text-neutral-500">
                    <span>0.5x</span>
                    <span>2.0x</span>
                </div>
            </div>

            {/* Volume Control */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label
                        htmlFor="volume-slider"
                        className="text-xs font-medium text-neutral-300"
                    >
                        音量
                    </label>
                    <span className="text-xs text-neutral-400">
                        {Math.round(volume * 100)}%
                    </span>
                </div>
                <Slider
                    id="volume-slider"
                    value={[volume]}
                    onValueChange={(value) => setVolume(value[0])}
                    min={0}
                    max={1}
                    step={0.05}
                    disabled={isRegenerating}
                    className="w-full"
                    aria-label="调整音量"
                />
                <div className="flex justify-between text-xs text-neutral-500">
                    <span>0%</span>
                    <span>100%</span>
                </div>
            </div>

            {/* Regenerate Button */}
            <Button
                onClick={handleRegenerate}
                disabled={!hasChanges || isRegenerating}
                className="w-full"
                variant="default"
            >
                <RefreshCw
                    className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`}
                />
                {isRegenerating ? '正在重新生成...' : '重新生成音频'}
            </Button>

            {/* Cost Estimation - Dynamic based on estimated text length */}
            <div className="text-xs text-neutral-500 text-center">
                预计费用: ~${calculateEstimatedCost(speed).toFixed(3)}
            </div>

            {/* Screen Reader Status */}
            <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
            >
                {isRegenerating
                    ? '正在重新生成音频'
                    : hasChanges
                        ? '音频配置已修改'
                        : '音频配置未修改'}
            </div>
        </Card>
    );
}
