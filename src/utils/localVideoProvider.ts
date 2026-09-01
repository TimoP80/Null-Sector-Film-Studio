/**
 * Local Video Provider Adapter
 *
 * Abstracts communication with local video generation backends.
 * Primary backend: ComfyUI (supports LTX-Video, SVD, AnimateDiff, etc.)
 * Also supports generic HTTP backends that expose a compatible API.
 *
 * Architecture:
 *   Null Sector → LocalVideoProvider → ComfyUI/Generic Backend → Model → MP4
 */

export type LocalVideoOutputFormat = 'webp' | 'mp4' | 'auto';

export interface LocalVideoCapabilities {
  textToVideo: boolean;
  imageToVideo: boolean;
  mp4: boolean;
  webp: boolean;
  audio: boolean;
  resolutions: string[];
  maxResolution: string;
}

export interface LocalVideoProviderConfig {
  enabled: boolean;
  url: string;
  model: string;
  /** T5-XXL text encoder file (LTX-Video checkpoints do not bundle a text encoder). */
  textEncoder: string;
  workflow?: string;
  timeoutSec: number;
  pollIntervalSec: number;
  outputFormat: LocalVideoOutputFormat;
}

export interface LocalBackendStatus {
  available: boolean;
  backend: string;
  model: string;
  gpu?: string;
  vram?: string;
  vramMb?: number;
  vramSufficient?: boolean;
  cudaAvailable?: boolean;
  backendVersion?: string;
  systemRamMb?: number;
  modelsLoaded?: string[];
  checkpoints?: string[];
  modelAvailable?: 'available' | 'not_found' | 'unknown';
  modelVerified?: boolean;
  error?: string;
}

export interface LocalVideoRequest {
  prompt: string;
  durationSec: number;
  aspectRatio: string;
  resolution?: string;
  outputFormat?: 'webp' | 'mp4' | 'auto';
  seed?: number;
  keyframeBase64?: string;
  keyframeMimeType?: string;
  shotId?: string;
}

export interface LocalVideoJob {
  jobId: string;
  status: 'submitted' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  videoBase64?: string;
  mimeType?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  promptId?: string;
}

export interface LocalVideoResult {
  success: boolean;
  videoUrl: string;
  mimeType: string;
  outputFormat?: 'webp' | 'mp4';
  durationSec: number;
  model: string;
  backend: string;
  jobId?: string;
  seed?: number;
}

export const DEFAULT_LOCAL_VIDEO_CONFIG: LocalVideoProviderConfig = {
  enabled: false,
  url: 'http://127.0.0.1:8188',
  model: 'ltx-video',
  textEncoder: 't5xxl_fp8_e4m3fn.safetensors',
  // Long GPU jobs (image-to-video LTX on an 8 GB GTX 1070) routinely take 10-20
  // minutes; a tight default would abort real jobs after the async work started.
  timeoutSec: 1500,
  pollIntervalSec: 2,
  outputFormat: 'auto',
};

export const getLocalVideoConfig = (): LocalVideoProviderConfig => ({
  enabled: process.env.LOCAL_VIDEO_ENABLED === 'true',
  url: process.env.LOCAL_VIDEO_URL || DEFAULT_LOCAL_VIDEO_CONFIG.url,
  model: process.env.LOCAL_VIDEO_MODEL || DEFAULT_LOCAL_VIDEO_CONFIG.model,
  textEncoder: process.env.LOCAL_VIDEO_TEXT_ENCODER || DEFAULT_LOCAL_VIDEO_CONFIG.textEncoder,
  workflow: process.env.LOCAL_VIDEO_WORKFLOW || undefined,
  timeoutSec: Number(process.env.LOCAL_VIDEO_TIMEOUT_SEC) || DEFAULT_LOCAL_VIDEO_CONFIG.timeoutSec,
  pollIntervalSec: Number(process.env.LOCAL_VIDEO_POLL_INTERVAL_SEC) || DEFAULT_LOCAL_VIDEO_CONFIG.pollIntervalSec,
  outputFormat: normalizeOutputFormat(process.env.LOCAL_VIDEO_OUTPUT_FORMAT),
});

const normalizeOutputFormat = (value: string | undefined): LocalVideoOutputFormat =>
  value === 'mp4' || value === 'webp' || value === 'auto' ? value : DEFAULT_LOCAL_VIDEO_CONFIG.outputFormat;

// ── Resolution & Aspect Ratio Mapping ──────────────────────────────────────
// LTX-Video latent dimensions must be multiples of 32.
export const LOCAL_VIDEO_MULTIPLE = 32;

export const LOCAL_ASPECT_RATIOS: Record<string, [number, number]> = {
  '16:9': [16, 9],
  '16:10': [16, 10],
  '4:3': [4, 3],
  '3:4': [3, 4],
  '1:1': [1, 1],
  '9:16': [9, 16],
  '21:9': [21, 9],
  '2.39:1': [2.39, 1],
  '1.85:1': [1.85, 1],
};

export const clampMultiple = (value: number, multiple: number): number => {
  const clamped = Math.max(multiple, Math.min(2048, value));
  return Math.round(clamped / multiple) * multiple;
};

export type LocalResolutionResult = { label: string; height: number } | { error: string };

export const resolveLocalVideoResolution = (resolution: unknown): LocalResolutionResult => {
  const text = typeof resolution === 'string' ? resolution.toLowerCase() : '';
  if (/\b(4k|8k|uhd)\b|3840|4096|2160|4320|8192/.test(text)) {
    return {
      error: `Resolution "${resolution}" exceeds the local LTX-Video limit (1080p). Select 480p, 720p, or 1080p.`,
    };
  }
  if (/1080|full hd|fhd/.test(text)) return { label: '1080p', height: 1080 };
  if (/480/.test(text)) return { label: '480p', height: 480 };
  if (/2k|2048/.test(text)) return { label: '1080p', height: 1080 };
  if (/720|hd/.test(text)) return { label: '720p', height: 720 };
  return { label: '720p', height: 720 };
};

export type LocalDimensionsResult =
  | { width: number; height: number; label: string; aspectRatio: string }
  | { error: string };

export const resolveLocalVideoDimensions = (resolution: unknown, aspectRatio: unknown): LocalDimensionsResult => {
  const resolutionResult = resolveLocalVideoResolution(resolution);
  if ('error' in resolutionResult) return resolutionResult;

  const ratioText = typeof aspectRatio === 'string' ? aspectRatio : '16:9';
  const ratio = LOCAL_ASPECT_RATIOS[ratioText] || LOCAL_ASPECT_RATIOS['16:9'];
  const width = clampMultiple(Math.round(resolutionResult.height * ratio[0] / ratio[1]), LOCAL_VIDEO_MULTIPLE);
  const height = clampMultiple(resolutionResult.height, LOCAL_VIDEO_MULTIPLE);
  return { width, height, label: resolutionResult.label, aspectRatio: ratioText };
};

// ── Local Image Provider ───────────────────────────────────────────────────

export interface LocalImageProviderConfig {
  enabled: boolean;
  url: string;
  model: string;
  workflow?: string;
  timeoutSec: number;
  pollIntervalSec: number;
}

export interface LocalImageRequest {
  prompt: string;
  aspectRatio?: string;
  imageSize?: string;
  resolution?: string;
  seed?: number;
  negativePrompt?: string;
  steps?: number;
  cfg?: number;
  sampler?: string;
  scheduler?: string;
  batchSize?: number;
  denoise?: number;
  referenceBase64?: string;
  referenceMimeType?: string;
}

export interface LocalImageResult {
  success: boolean;
  imageUrl: string;
  mimeType: string;
  model: string;
  backend: string;
  jobId?: string;
  seed?: number;
  images?: Array<{ imageUrl: string; mimeType: string; sizeBytes: number }>;
}

export const DEFAULT_LOCAL_IMAGE_CONFIG: LocalImageProviderConfig = {
  enabled: false,
  url: 'http://127.0.0.1:8188',
  model: 'flux',
  timeoutSec: 300,
  pollIntervalSec: 1,
};

export const getLocalImageConfig = (): LocalImageProviderConfig => ({
  enabled: process.env.LOCAL_IMAGE_ENABLED === 'true',
  url: process.env.LOCAL_IMAGE_URL || process.env.LOCAL_VIDEO_URL || DEFAULT_LOCAL_IMAGE_CONFIG.url,
  model: process.env.LOCAL_IMAGE_MODEL || DEFAULT_LOCAL_IMAGE_CONFIG.model,
  workflow: process.env.LOCAL_IMAGE_WORKFLOW || undefined,
  timeoutSec: Number(process.env.LOCAL_IMAGE_TIMEOUT_SEC) || DEFAULT_LOCAL_IMAGE_CONFIG.timeoutSec,
  pollIntervalSec: Number(process.env.LOCAL_IMAGE_POLL_INTERVAL_SEC) || DEFAULT_LOCAL_IMAGE_CONFIG.pollIntervalSec,
});
