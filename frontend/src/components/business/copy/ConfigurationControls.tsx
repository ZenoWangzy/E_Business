'use client';

/**
 * ConfigurationControls Component
 * 
 * Shared configuration controls for copy generation:
 * - Tone selection (professional, casual, playful, luxury)
 * - Audience selection (B2B, B2C, Technical)
 * - Length selection (short, medium, long)
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    useCopyConfig,
    useCopyActions,
    type ToneType,
    type AudienceType,
    type LengthType,
} from '@/hooks/useCopyStudio';

export interface ConfigurationControlsProps {
    disabled?: boolean;
}

const toneOptions: { value: ToneType; label: string }[] = [
    { value: 'professional', label: '专业' },
    { value: 'casual', label: '休闲' },
    { value: 'playful', label: '活泼' },
    { value: 'luxury', label: '奢华' },
];

const audienceOptions: { value: AudienceType; label: string }[] = [
    { value: 'b2b', label: 'B2B 企业' },
    { value: 'b2c', label: 'B2C 消费者' },
    { value: 'technical', label: '技术专家' },
];

const lengthOptions: { value: LengthType; label: string }[] = [
    { value: 'short', label: '简短' },
    { value: 'medium', label: '中等' },
    { value: 'long', label: '详细' },
];

export function ConfigurationControls({ disabled = false }: ConfigurationControlsProps) {
    const config = useCopyConfig();
    const { setGenerationConfig } = useCopyActions();

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Tone Selection */}
            <div className="space-y-2">
                <Label htmlFor="tone-select">语气风格</Label>
                <Select
                    value={config.tone}
                    onValueChange={(value: ToneType) => setGenerationConfig({ tone: value })}
                    disabled={disabled}
                >
                    <SelectTrigger id="tone-select" data-testid="tone-select">
                        <SelectValue placeholder="选择语气" />
                    </SelectTrigger>
                    <SelectContent>
                        {toneOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Audience Selection */}
            <div className="space-y-2">
                <Label htmlFor="audience-select">目标受众</Label>
                <Select
                    value={config.audience}
                    onValueChange={(value: AudienceType) => setGenerationConfig({ audience: value })}
                    disabled={disabled}
                >
                    <SelectTrigger id="audience-select" data-testid="audience-select">
                        <SelectValue placeholder="选择受众" />
                    </SelectTrigger>
                    <SelectContent>
                        {audienceOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Length Selection */}
            <div className="space-y-2">
                <Label htmlFor="length-select">内容长度</Label>
                <Select
                    value={config.length}
                    onValueChange={(value: LengthType) => setGenerationConfig({ length: value })}
                    disabled={disabled}
                >
                    <SelectTrigger id="length-select" data-testid="length-select">
                        <SelectValue placeholder="选择长度" />
                    </SelectTrigger>
                    <SelectContent>
                        {lengthOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
