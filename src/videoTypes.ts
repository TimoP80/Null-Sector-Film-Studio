export type VideoJobStatus = 'queued' | 'generating' | 'completed' | 'failed' | 'cancelled';

export interface ShotMotionSpecification {
  cameraMovement?: string;
  cameraSpeed?: string;
  cameraDirection?: string;
  lens?: string;
  framing?: string;
  subjectMovement?: string;
  facialMovement?: string;
  environmentalMovement?: string;
  lightingMovement?: string;
  atmosphere?: string;
  motionStrength?: number;
  duration?: number;
  startFrame?: string;
  endFrame?: string;
  negativeMotionInstructions?: string;
}

export interface VideoCapabilities {
  imageToVideo: boolean;
  textToVideo: boolean;
  referenceImages: boolean;
  startFrame: boolean;
  endFrame: boolean;
  audioGeneration: boolean;
  supportedResolutions: string[];
  supportedAspectRatios: string[];
  minDuration?: number;
  maxDuration?: number;
}

export interface ImageToVideoRequest {
  projectId?: string;
  sceneId?: string;
  shotId?: string;
  sourceImage?: string;
  prompt: string;
  motion?: ShotMotionSpecification;
  modelId?: string;
  seed?: number;
  duration?: number;
  resolution?: string;
  aspectRatio?: string;
  negativePrompt?: string;
  endFrame?: string;
  references?: string[];
}

export interface VideoGenerationJob {
  id: string;
  projectId?: string;
  sceneId?: string;
  shotId?: string;
  providerId: string;
  modelId: string;
  status: VideoJobStatus;
  sourceImage: string;
  prompt: string;
  duration?: number;
  resolution?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  progress?: number;
  outputPath?: string;
  providerJobId?: string;
  error?: string;
  takeId?: string;
  motionSpecification?: ShotMotionSpecification;
  generationParameters?: Record<string, unknown>;
}

export interface ImageToVideoProvider {
  id: string;
  name: string;
  getCapabilities(): VideoCapabilities;
  generate(request: ImageToVideoRequest): Promise<VideoGenerationJob>;
  getJobStatus(jobId: string): Promise<VideoGenerationJob>;
  cancel(jobId: string): Promise<void>;
}
