# Story 4.4: Video Preview & TTS Integration

Status: ready-for-dev

## Story

**As a** User,
**I want** to preview the generated video and independently verify/regenerate the voiceover,
**So that** I can ensure the audio quality and timing matches my expectations before final export.

## Acceptance Criteria

### AC1: Video Player & Playback
**Given** A generated video is available
**When** I view the Video Studio preview panel
**Then** I should see the HTML5 video player loaded with the rendered MP4
**And** Standard controls (Play/Pause, Seek, Volume) should work accessible
**And** The player should handle buffering state gracefully
**And** If the video is still processing, I should see a polling/progress state

### AC2: Independent TTS Regeneration
**Given** I am previewing a video
**When** I am unsatisfied with the voiceover (e.g., wrong pronunciation or tone)
**Then** I should be able to click "Regenerate Audio"
**And** I should be able to select a different voice option
**And** The system should trigger a re-synthesis of the audio track without re-generating the visual storyboard (unless timing changes significantly)
**And** The video should update with the new audio track once ready

### AC3: Audio-Visual Sync Verification
**Given** The video is playing
**When** The TTS audio is spoken
**Then** It should coincide with the correct visual scenes defined in the storyboard
**And** I should be able to toggle captions (if generated) to verify script accuracy

### AC4: Download & Export
**Given** I am satisfied with the preview
**When** I click "Download"
**Then** The file should download to my local machine with a descriptive filename
**And** The system should log the download event for analytics

### AC5: Accessibility
**Given** I am using a screen reader
**When** I interact with the video player
**Then** All controls should be keyboard accessible
**And** The player status (playing/paused) should be announced

## Tasks / Subtasks

### 1. Database Models & Dependencies
- [ ] **Create Video Models** - Create `backend/app/models/video.py`:
  - [ ] Add `VideoProject` model (extends existing `BaseModel`)
  - [ ] Add `Video` model with fields:
    ```python
    class Video(BaseModel):
        id: str = Field(default_factory=lambda: str(uuid.uuid4()))
        project_id: str = Field(foreign_key="videoproject.id")
        title: str
        status: VideoStatus  # PENDING, PROCESSING, COMPLETED, FAILED
        video_url: str = Field(nullable=True)  # MinIO URL
        duration: float = Field(nullable=True)  # seconds
        file_size: int = Field(nullable=True)  # bytes
        quality: VideoQuality = VideoQuality.HD_1080
        task_id: str = Field(nullable=True)  # Celery task ID
        progress: int = Field(default=0)  # 0-100
        error_message: str = Field(nullable=True)
        created_at: datetime
        updated_at: datetime
    ```
  - [ ] Add `VideoAudioTrack` model for TTS versions
  - [ ] Run Alembic migration: `alembic revision --autogenerate -m "Add video models"`

- [ ] **Add Dependencies** - Update `backend/pyproject.toml`:
  ```toml
  [project.dependencies]
  ffmpeg-python = "^0.2.0"
  edge-tts = "^6.1.0"  # Alternative TTS provider
  ```

### 2. Video Service Implementation
- [ ] **Create VideoService** - Create `backend/app/services/video_service.py`:
  - [ ] Implement `VideoService` class (pattern: reference `image_service.py`)
  - [ ] Implement `regenerate_audio_track(project_id, params)`:
    ```python
    async def regenerate_audio_track(self, project_id: str, params: AudioRegenerationParams) -> Dict[str, Any]:
        # 1. Load video project and current video
        # 2. Generate new TTS using OpenAI/Edge TTS
        # 3. Apply AgentVibes audio processing pipeline
        # 4. Mix with background music if exists
        # 5. Use FFmpeg fast remux if duration compatible (<10% change)
        # 6. Upload to MinIO and update database
        # 7. Emit Redis progress updates
    ```
  - [ ] Implement video quality presets (720p, 1080p, 4K)
  - [ ] Add cost tracking for API usage
  - [ ] Implement caching for regenerated audio

### 3. API Endpoints
- [ ] **Create Video Endpoints** - Create `backend/app/api/v1/endpoints/video.py`:
  - [ ] Add `GET /video/{project_id}` - Get video project details
  - [ ] Add `POST /video/{project_id}/regenerate-audio`:
    ```python
    @router.post("/{project_id}/regenerate-audio")
    async def regenerate_audio(
        project_id: str,
        params: AudioRegenerationParams,  # voice_id, speed, volume
        db: AsyncSession = Depends(get_db_context),
        current_user: User = Depends(get_current_user)
    ) -> Dict[str, Any]:
        # Returns task_id for async processing
    ```
  - [ ] Add `GET /video/{project_id}/progress/{task_id}` - Poll progress
  - [ ] Add `GET /video/{video_id}/download` - Download with descriptive filename
  - [ ] Implement error handling for FFmpeg failures
  - [ ] Add rate limiting for audio regeneration

### 4. Celery Task Integration
- [ ] **Create Video Tasks** - Create `backend/app/tasks/video_processing.py`:
  - [ ] Implement `audio_regeneration_task` (pattern: reference `image_generation.py`)
  - [ ] Use video-specific queue: `@celery_app.task(queue='video_generation')`
  - [ ] Implement timeout: soft_time_limit=300, hard_time_limit=330
  - [ ] Add progress tracking with Redis pub/sub:
    ```python
    await redis_client.publish(f"task_updates:{task_id}", json.dumps({
        "status": "processing",
        "progress": 75,
        "message": "Regenerating audio track...",
        "timestamp": datetime.utcnow().isoformat()
    }))
    ```

### 5. Frontend Video Player Component
- [ ] **Create VideoPlayerPreview** - Create `frontend/src/components/video/VideoPlayerPreview.tsx`:
  - [ ] Use shadcn/ui components: `Card`, `Button`, `Progress`, `Select`
  - [ ] Implement HTML5 video player with controls
  - [ ] Add accessibility: ARIA labels, keyboard navigation
  - [ ] Integrate with MinIO URLs: `crossOrigin="anonymous"`
  - [ ] Add buffering states and error handling

- [ ] **Audio Regeneration UI**:
  - [ ] Add voice selection dropdown (OpenAI voices: nova, alloy, echo, etc.)
  - [ ] Add speed control slider (0.5x - 2.0x)
  - [ ] Add "Regenerate Audio" button with loading state
  - [ ] Implement real-time progress updates via WebSocket/SSE
  - [ ] Add cost estimation display

### 6. Video Configuration Integration
- [ ] **Define videoConfig Interface** - Create `frontend/src/types/video.ts`:
  ```typescript
  export interface VideoConfig {
    id: string;
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
  ```

- [ ] **Integrate with Story 4-3 Output**:
  - [ ] Load rendered MP4 URL from Story 4-3 completion
  - [ ] Display video metadata from database
  - [ ] Handle different quality versions for streaming

### 7. Testing & Validation
- [ ] **Unit Tests**:
  - [ ] Test `VideoService.regenerate_audio_track` with mock data
  - [ ] Test video endpoint authentication and validation
  - [ ] Test FFmpeg remuxing with different audio formats
  - [ ] Test Redis progress emission

- [ ] **Integration Tests**:
  - [ ] Test complete audio regeneration flow
  - [ ] Test MinIO upload/download with workspaces
  - [ ] Test Celery task execution and error handling

- [ ] **E2E Tests**:
  - [ ] Verify flow: Generate → Preview → Regenerate Audio → Download
  - [ ] Test accessibility with screen readers
  - [ ] Test video playback on different browsers

### 8. Performance Optimization
- [ ] **Video Streaming**:
  - [ ] Implement adaptive bitrate streaming if bandwidth low
  - [ ] Add video preload options for better UX
  - [ ] Cache frequently accessed videos

- [ ] **Audio Processing**:
  - [ ] Cache generated TTS audio files
  - [ ] Implement background music presets
  - [ ] Optimize FFmpeg parameters for faster remuxing

## Dev Notes

### Technical Implementation Guide

#### 1. Audio Regeneration Flow (Leveraging Existing Infrastructure)

**Reference**: Build on AgentVibes audio processing system at `.claude/hooks/audio-processor.sh`

```python
# Audio regeneration pipeline leveraging existing patterns
async def regenerate_audio_with_pipeline(self, project_id: str, params: AudioRegenerationParams):
    # Step 1: Generate TTS (OpenAI or Edge TTS)
    tts_audio = await self.generate_tts(params.script, params.voice_id, params.speed)

    # Step 2: Apply AgentVibes audio processing
    processed_audio = await self.apply_audio_effects(
        tts_audio,
        effects_config=".claude/config/audio-effects.cfg",
        voice_personality=params.voice_id
    )

    # Step 3: Mix with background music (if exists in video config)
    if video.background_music:
        final_audio = await self.mix_audio_tracks(processed_audio, video.background_music)

    # Step 4: Fast remux with existing video
    output_path = await self.fast_remux_video(video.file_path, final_audio)

    # Step 5: Upload to MinIO using existing storage service
    new_url = await storage_service.upload_file(
        file_path=output_path,
        workspace_id=project.workspace_id,
        folder=f"videos/{project.id}/"
    )

    return new_url
```

#### 2. FFmpeg Integration (Performance Optimized)

**Dependencies**: Add to `backend/pyproject.toml`:
```toml
ffmpeg-python = "^0.2.0"
```

**Fast Remux Implementation**:
```python
import ffmpeg

async def fast_remux_video(self, video_path: str, new_audio_path: str) -> str:
    """
    Replace audio track without re-encoding video
    Much faster than full re-encoding (30x speedup)
    """
    output_path = video_path.replace('.mp4', '_remuxed.mp4')

    try:
        # Check duration compatibility
        video_duration = await self.get_video_duration(video_path)
        audio_duration = await self.get_audio_duration(new_audio_path)

        # If duration difference > 10%, flag for visual re-sync
        if abs(video_duration - audio_duration) / video_duration > 0.1:
            logger.warning(f"Duration mismatch: video={video_duration}s, audio={audio_duration}s")
            # Trigger visual re-sync workflow

        # Fast remux - copy video stream, replace audio
        (
            ffmpeg
            .input(video_path)
            .input(new_audio_path)
            .output(
                output_path,
                vcodec='copy',  # Don't re-encode video
                acodec='aac',    # Encode audio to AAC
                map='0:v:0',     # Map video from first input
                map='1:a:0',     # Map audio from second input
                movflags='faststart'  # Optimize for streaming
            )
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )

        return output_path

    except ffmpeg.Error as e:
        logger.error(f"FFmpeg remux failed: {e.stderr.decode()}")
        raise AudioProcessingError(f"Failed to remux video: {str(e)}")
```

#### 3. Storage Integration (MinIO Pattern)

**Reference**: Reuse `backend/app/services/storage_service.py` patterns

```python
from app.services.storage_service import StorageService

class VideoService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.storage = StorageService()

    async def save_video(self, video_file: str, project_id: str) -> str:
        """
        Save video to MinIO with workspace isolation
        Returns: public URL for video
        """
        # Get workspace for proper isolation
        project = await self.get_project(project_id)

        # Upload using existing storage service
        result = await self.storage.upload_file(
            file_path=video_file,
            workspace_id=project.workspace_id,
            folder=f"videos/{project_id}/",
            public=True  # For frontend access
        )

        return result['download_url']
```

#### 4. Celery Task Pattern (Existing Infrastructure)

**Reference**: Build on `backend/app/tasks/image_generation.py` patterns

```python
from celery import current_app
from app.core.celery_app import celery_app
from app.services.video_service import VideoService

@celery_app.task(
    name="app.tasks.video.regenerate_audio_task",
    bind=True,
    queue='video_generation',
    soft_time_limit=300,  # 5 minutes
    hard_time_limit=330,
    autoretry_for=(AudioProcessingError,),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=3
)
def regenerate_audio_task(self, task_id: str, project_id: str, params: dict):
    """
    Async task for audio regeneration
    Follows established patterns from image generation
    """
    video_service = VideoService(db=None)  # Will be set in task

    async def run_task():
        try:
            # Emit progress start
            await emit_task_progress(task_id, 0, "Starting audio regeneration...")

            # Load project
            project = await video_service.get_project(project_id)
            if not project:
                raise ValueError(f"Project {project_id} not found")

            # Emit progress
            await emit_task_progress(task_id, 10, "Generating TTS audio...")

            # Regenerate audio
            new_url = await video_service.regenerate_audio_track(project_id, params)

            # Emit completion
            await emit_task_progress(task_id, 100, "Audio regeneration complete!")

            return {
                "video_url": new_url,
                "status": "completed"
            }

        except Exception as e:
            # Emit error
            await emit_task_error(task_id, str(e))
            raise

    # Run async task
    return asyncio.run(run_task())

async def emit_task_progress(task_id: str, progress: int, message: str):
    """Emit progress to Redis channel"""
    import redis.asyncio as redis
    redis_client = await redis.from_url(settings.REDIS_URL)

    await redis_client.publish(f"task_updates:{task_id}", json.dumps({
        "status": "processing",
        "progress": progress,
        "message": message,
        "timestamp": datetime.utcnow().isoformat()
    }))
```

#### 5. Frontend Integration (shadcn/ui Components)

**File**: `frontend/src/components/video/VideoPlayerPreview.tsx`

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

interface VideoPlayerPreviewProps {
  projectId: string;
  videoConfig: VideoConfig;
  onAudioRegenerate?: (params: AudioRegenerationParams) => void;
}

export const VideoPlayerPreview: React.FC<VideoPlayerPreviewProps> = ({
  projectId,
  videoConfig,
  onAudioRegenerate
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // WebSocket for real-time progress
  useEffect(() => {
    if (videoConfig.task_id) {
      const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/task/${videoConfig.task_id}`);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.progress !== undefined) {
          setProgress(data.progress);
        }
      };

      return () => ws.close();
    }
  }, [videoConfig.task_id]);

  const handleRegenerateAudio = async () => {
    setIsRegenerating(true);
    try {
      await onAudioRegenerate?.({
        voice_id: selectedVoice,
        speed: audioSpeed,
        volume: audioVolume
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{videoConfig.title}</span>
          <Badge variant={videoConfig.status === 'completed' ? 'default' : 'secondary'}>
            {videoConfig.status}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Video Player */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            src={videoConfig.video_url}
            crossOrigin="anonymous"
            className="w-full h-full"
            controls
            aria-label={`Video preview: ${videoConfig.title}`}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          >
            Your browser does not support the video tag.
          </video>

          {/* Loading overlay */}
          {videoConfig.status === 'processing' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <Progress value={progress} className="w-48 mb-2" />
                <p className="text-sm">Processing... {progress}%</p>
              </div>
            </div>
          )}
        </div>

        {/* Audio Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Voice</label>
            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nova">Nova (Female)</SelectItem>
                <SelectItem value="alloy">Alloy (Neutral)</SelectItem>
                <SelectItem value="echo">Echo (Male)</SelectItem>
                <SelectItem value="fable">Fable (British)</SelectItem>
                <SelectItem value="onyx">Onyx (Deep Male)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Speed: {audioSpeed}x</label>
            <Slider
              value={[audioSpeed]}
              onValueChange={(value) => setAudioSpeed(value[0])}
              min={0.5}
              max={2.0}
              step={0.1}
              className="mt-2"
            />
          </div>

          <div>
            <Button
              onClick={handleRegenerateAudio}
              disabled={isRegenerating}
              className="w-full"
            >
              {isRegenerating ? 'Regenerating...' : 'Regenerate Audio'}
            </Button>
          </div>
        </div>

        {/* Download Button */}
        {videoConfig.status === 'completed' && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.open(`/api/v1/video/${videoConfig.id}/download`)}
          >
            Download Video
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
```

#### 6. Cost Tracking & Analytics

```python
# In VideoService
async def track_api_usage(self, project_id: str, api_provider: str, cost: float):
    """
    Track API usage for cost management
    """
    usage_record = {
        "project_id": project_id,
        "api_provider": api_provider,
        "cost": cost,
        "timestamp": datetime.utcnow()
    }

    # Save to analytics table or send to tracking service
    await self.db.execute(
        insert(api_usage_table).values(**usage_record)
    )
```

### References
- [Architecture: AI Task & Communication](file:///Users/ZenoWang/Documents/project/E_Business/docs/architecture.md#ai-task--communication)
- [Epic 4 Requirements](file:///Users/ZenoWang/Documents/project/E_Business/docs/epics.md#epic-4-multimedia---ai-video-studio)
- [AgentVibes Audio Processing](../../../.claude/hooks/audio-processor.sh)
- [Storage Service Patterns](../../../backend/app/services/storage_service.py)
- [Celery Task Patterns](../../../backend/app/tasks/image_generation.py)
- [Frontend Component Library](../../../frontend/src/components/ui/)

## Dev Agent Record

### Validation Improvements Applied
- ✅ Added comprehensive database schema definitions (VideoProject, Video, VideoAudioTrack models)
- ✅ Specified exact API endpoint routes and request/response formats
- ✅ Defined videoConfig interface with all required fields
- ✅ Added specific file paths for all components to be created/modified
- ✅ Included dependency requirements (ffmpeg-python, edge-tts)
- ✅ Referenced existing AgentVibes audio processing pipeline
- ✅ Built on established Celery task patterns from image generation
- ✅ Included MinIO storage service integration details
- ✅ Added FFmpeg error handling specifications
- ✅ Defined comprehensive progress tracking mechanisms
- ✅ Added video quality settings and caching strategies
- ✅ Included cost tracking for external API usage
- ✅ Added bandwidth optimization and accessibility requirements

### Key Architecture Decisions Documented
1. **Reuse Existing Infrastructure**: Building on AgentVibes, storage service, and Celery patterns
2. **Performance Optimization**: FFmpeg fast remux for audio-only regeneration (30x speedup)
3. **Workspace Isolation**: Following MinIO storage patterns with workspace segregation
4. **Async Processing**: Using established Redis pub/sub pattern for progress updates
5. **Cost Management**: Tracking API usage for TTS and external services

### Completion Notes List
- [ ] Created video database models with Alembic migration
- [ ] Implemented VideoService with regenerate_audio_track method
- [ ] Created video API endpoints with authentication and validation
- [ ] Built Celery task for async audio regeneration
- [ ] Developed VideoPlayerPreview component with shadcn/ui
- [ ] Integrated with AgentVibes audio processing pipeline
- [ ] Implemented FFmpeg fast remuxing for performance
- [ ] Added comprehensive error handling and retry logic
- [ ] Created unit, integration, and E2E tests
- [ ] Verified WCAG 2.1 AA accessibility compliance
