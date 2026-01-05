'use client';

/**
 * VideoPlayerPreview Component
 * Story 4.4: Video Preview & TTS Integration
 *
 * Enhanced video preview with HTML5 video player and audio regeneration controls.
 * Implements keyboard accessibility and full video playback functionality.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
    VideoConfig,
    VideoPlayerConfig,
    AudioTrackConfig,
    DEFAULT_AUDIO_CONFIG,
    VIDEO_MODE_OPTIONS,
    MUSIC_OPTIONS,
} from '@/types/video';
import { AudioRegenerationPanel } from './AudioRegenerationPanel';

export interface VideoPlayerPreviewProps {
    config: VideoConfig;
    videoData?: VideoPlayerConfig;
    onAudioRegenerate?: (config: AudioTrackConfig) => Promise<void>;
    isRegeneratingAudio?: boolean;
}

export function VideoPlayerPreview({
    config,
    videoData,
    onAudioRegenerate,
    isRegeneratingAudio = false
}: VideoPlayerPreviewProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState<number>(config.duration);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [showAudioPanel, setShowAudioPanel] = useState(false);

    const modeOption = VIDEO_MODE_OPTIONS.find(o => o.value === config.mode);
    const musicOption = MUSIC_OPTIONS.find(o => o.value === config.music);
    const videoUrl = videoData?.videoUrl;

    const currentAudioConfig: AudioTrackConfig | undefined = videoData?.audioTrack
        ? {
            voiceId: videoData.audioTrack.voiceId,
            speed: videoData.audioTrack.speed,
            volume: DEFAULT_AUDIO_CONFIG.volume,
        }
        : undefined;

    // Update duration when video loads or videoData changes
    useEffect(() => {
        if (videoData?.duration) {
            setDuration(videoData.duration);
        } else {
            setDuration(config.duration);
        }
    }, [videoData, config.duration]);

    const handlePlayPause = useCallback(async () => {
        if (!videoRef.current) return;

        try {
            if (isPlaying) {
                await videoRef.current.pause();
            } else {
                await videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        } catch (error) {
            console.error('Video playback error:', error);
            setHasError(true);
        }
    }, [isPlaying]);

    const handleSeek = useCallback((value: number[]) => {
        if (!videoRef.current) return;

        const newTime = value[0];
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    }, []);

    const handleSkipBack = useCallback(() => {
        if (!videoRef.current) return;

        const newTime = Math.max(0, videoRef.current.currentTime - 5);
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    }, []);

    const handleSkipForward = useCallback(() => {
        if (!videoRef.current) return;

        const newTime = Math.min(duration, videoRef.current.currentTime + 5);
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    }, [duration]);

    const handleVolumeChange = useCallback((value: number[]) => {
        if (!videoRef.current) return;

        const newVolume = value[0];
        videoRef.current.volume = newVolume;
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
    }, []);

    const handleMuteToggle = useCallback(() => {
        if (!videoRef.current) return;

        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    }, [isMuted]);

    // Video event handlers
    const handleTimeUpdate = useCallback(() => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    }, []);

    const handleLoadedMetadata = useCallback(() => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            setHasError(false);
        }
    }, []);

    const handleLoadedData = useCallback(() => {
        setIsBuffering(false);
    }, []);

    const handleWaiting = useCallback(() => {
        setIsBuffering(true);
    }, []);

    const handleCanPlay = useCallback(() => {
        setIsBuffering(false);
    }, []);

    const handleError = useCallback(() => {
        setHasError(true);
        setIsBuffering(false);
        console.error('Video loading error');
    }, []);

    const handleAudioRegenerate = useCallback(async (audioConfig: AudioTrackConfig) => {
        if (onAudioRegenerate) {
            await onAudioRegenerate(audioConfig);
        }
    }, [onAudioRegenerate]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-semibold text-white">
                        视频预览
                    </h1>
                    {videoData && (
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                                videoData.status === 'completed' ? 'bg-green-500' :
                                videoData.status === 'processing' ? 'bg-yellow-500 animate-pulse' :
                                videoData.status === 'failed' ? 'bg-red-500' :
                                'bg-gray-500'
                            }`} />
                            <span className="text-sm text-neutral-400">
                                {videoData.status === 'processing' ? `处理中 ${Math.round(videoData.progress)}%` :
                                 videoData.status === 'completed' ? '已完成' :
                                 videoData.status === 'failed' ? '失败' : '等待中'}
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-sm text-neutral-400">
                        {modeOption?.label} · {duration}秒
                    </div>
                    {videoData?.videoUrl && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAudioPanel(!showAudioPanel)}
                            className="text-violet-400 hover:text-violet-300"
                        >
                            {showAudioPanel ? '隐藏音频' : '音频配置'}
                        </Button>
                    )}
                </div>
            </div>

            {/* Video Preview Area */}
            <div
                role="region"
                aria-label="Video preview"
                data-testid="video-preview-area"
                className="flex-1 bg-neutral-900 rounded-lg border border-neutral-800 relative overflow-hidden min-h-[300px]"
            >
                {videoUrl ? (
                    <video
                        ref={videoRef}
                        className="w-full h-full object-contain"
                        crossOrigin="anonymous"
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onLoadedData={handleLoadedData}
                        onWaiting={handleWaiting}
                        onCanPlay={handleCanPlay}
                        onError={handleError}
                        playsInline
                    >
                        <source src={videoUrl} type="video/mp4" />
                        您的浏览器不支持视频播放。
                    </video>
                ) : (
                    /* Placeholder Content */
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center p-6">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-neutral-800 flex items-center justify-center">
                                <Play className="h-10 w-10 text-neutral-400" aria-hidden="true" />
                            </div>
                            <h2 className="text-lg font-medium text-white mb-2">
                                视频预览区域
                            </h2>
                            <p className="text-sm text-neutral-400 max-w-md">
                                选择模式和配置后，AI 生成的视频将在此处预览。
                                当前模式：<span className="text-violet-400">{modeOption?.label}</span>
                            </p>

                            {/* Config Summary */}
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                <span className="px-2 py-1 rounded bg-neutral-800 text-xs text-neutral-300">
                                    {config.duration}秒
                                </span>
                                <span className="px-2 py-1 rounded bg-neutral-800 text-xs text-neutral-300">
                                    {musicOption?.label}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading/Buffering Overlay */}
                {(isBuffering || videoData?.status === 'processing') && videoUrl && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-sm text-white">
                                {isBuffering ? '缓冲中...' : `处理中 ${Math.round(videoData?.progress || 0)}%`}
                            </p>
                        </div>
                    </div>
                )}

                {/* Error Overlay */}
                {hasError && (
                    <div className="absolute inset-0 bg-red-900 bg-opacity-20 flex items-center justify-center">
                        <div className="text-center p-4">
                            <p className="text-red-400">视频加载失败</p>
                        </div>
                    </div>
                )}

                {/* Fullscreen Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 bg-black bg-opacity-50 hover:bg-opacity-70"
                    aria-label="全屏预览"
                    data-testid="fullscreen-button"
                    disabled={!videoUrl}
                >
                    <Maximize2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Timeline Controls */}
            <div
                role="region"
                aria-label="Video timeline controls"
                className="mt-4 space-y-3"
            >
                {/* Progress Bar */}
                <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-400 w-10 text-right">
                        {formatTime(currentTime)}
                    </span>
                    <Slider
                        value={[currentTime]}
                        onValueChange={handleSeek}
                        max={duration}
                        step={0.1}
                        className="flex-1"
                        aria-label="Video timeline scrubber"
                        aria-valuemin={0}
                        aria-valuemax={duration}
                        aria-valuenow={currentTime}
                        aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
                        data-testid="timeline-slider"
                    />
                    <span className="text-xs text-neutral-400 w-10">
                        {formatTime(duration)}
                    </span>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        {/* Skip Back Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleSkipBack}
                            aria-label="后退 5 秒"
                            data-testid="skip-back-button"
                            disabled={!videoUrl}
                        >
                            <SkipBack className="h-4 w-4" />
                        </Button>

                        {/* Play/Pause Button */}
                        <Button
                            variant={videoUrl ? "default" : "ghost"}
                            size="icon"
                            onClick={handlePlayPause}
                            aria-label={isPlaying ? '暂停' : '播放'}
                            aria-pressed={isPlaying}
                            data-testid="play-pause-button"
                            className="h-10 w-10"
                            disabled={!videoUrl}
                        >
                            {isBuffering ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : isPlaying ? (
                                <Pause className="h-5 w-5" />
                            ) : (
                                <Play className="h-5 w-5" />
                            )}
                        </Button>

                        {/* Skip Forward Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleSkipForward}
                            aria-label="前进 5 秒"
                            data-testid="skip-forward-button"
                            disabled={!videoUrl}
                        >
                            <SkipForward className="h-4 w-4" />
                        </Button>

                        {/* Volume Control */}
                        <div className="flex items-center gap-2 px-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleMuteToggle}
                                aria-label={isMuted ? '取消静音' : '静音'}
                                aria-pressed={isMuted}
                                disabled={!videoUrl}
                            >
                                {isMuted || volume === 0 ? (
                                    <VolumeX className="h-4 w-4" />
                                ) : (
                                    <Volume2 className="h-4 w-4" />
                                )}
                            </Button>
                            <Slider
                                value={[isMuted ? 0 : volume]}
                                onValueChange={handleVolumeChange}
                                max={1}
                                step={0.05}
                                className="w-20"
                                aria-label="音量控制"
                                aria-valuemin={0}
                                aria-valuemax={1}
                                aria-valuenow={isMuted ? 0 : volume}
                                disabled={!videoUrl}
                            />
                        </div>
                    </div>

                    {/* Duration Display */}
                    <div className="text-xs text-neutral-400">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                </div>
            </div>

            {/* Audio Regeneration Panel */}
            {showAudioPanel && videoData && (
                <div className="mt-4">
                    <AudioRegenerationPanel
                        projectId={videoData.projectId}
                        currentConfig={currentAudioConfig}
                        onRegenerate={handleAudioRegenerate}
                        isRegenerating={isRegeneratingAudio}
                    />
                </div>
            )}

            {/* Screen Reader Announcements */}
            <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
                data-testid="player-status"
            >
                {hasError ? '视频加载失败' :
                 isBuffering ? '缓冲中...' :
                 videoData?.status === 'processing' ? `正在处理 ${Math.round(videoData.progress)}%` :
                 isPlaying ? '正在播放' : '已暂停'}，
                当前时间 {formatTime(currentTime)}，总时长 {formatTime(duration)}
            </div>

            {/* Keyboard Help Text */}
            <div id="video-help-text" className="sr-only">
                使用方向键控制时间轴，空格键播放或暂停
                {videoUrl && '，显示音频配置按钮可以重新生成音频'}
            </div>
        </div>
    );
}
