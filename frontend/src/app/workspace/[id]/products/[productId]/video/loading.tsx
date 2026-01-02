/**
 * Video Studio Loading Skeleton
 * Story 4.1: Video Studio UI & Mode Selection
 */

export default function VideoLoading() {
    return (
        <div className="flex h-screen bg-background" role="status" aria-label="Loading Video Studio">
            {/* Left Rail Skeleton */}
            <div className="w-16 bg-neutral-900 border-r border-neutral-800 animate-pulse" />

            {/* Settings Panel Skeleton */}
            <div className="w-72 bg-neutral-900/50 border-r border-neutral-800 p-4 animate-pulse">
                <div className="h-6 bg-neutral-800 rounded w-3/4 mb-6" />
                <div className="space-y-4">
                    <div className="h-20 bg-neutral-800 rounded" />
                    <div className="h-20 bg-neutral-800 rounded" />
                    <div className="h-10 bg-neutral-800 rounded" />
                    <div className="h-10 bg-neutral-800 rounded" />
                </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="flex-1 p-6 animate-pulse">
                <div className="h-8 bg-neutral-800 rounded w-1/4 mb-4" />
                <div className="aspect-video bg-neutral-800 rounded-lg mb-4" />
                <div className="h-12 bg-neutral-800 rounded" />
            </div>

            <span className="sr-only">正在加载视频工作室...</span>
        </div>
    );
}
