import { FilmProject, Shot, ProviderStatus } from '../types/film';
import { classifyProviderError, ProviderError, ProviderErrorInfo } from '../utils/providerErrors';

type ApiRecord = Record<string, unknown>;

const asApiRecord = (value: unknown): ApiRecord =>
  value && typeof value === 'object' ? value as ApiRecord : {};

const getApiErrorMessage = (data: unknown, fallback: string): string => {
  const record = asApiRecord(data);
  const error = typeof record.error === 'string' ? record.error : fallback;
  const details = typeof record.details === 'string' ? record.details : '';
  return details ? `${error}: ${details}` : error;
};

const getProviderError = (
  data: unknown,
  fallback: string,
  provider: string,
  responseStatus: number
): ProviderError => {
  const record = asApiRecord(data);
  const details = typeof record.details === 'string' ? record.details : getApiErrorMessage(data, fallback);
  const model = typeof record.model === 'string' ? record.model : undefined;
  const info: ProviderErrorInfo = classifyProviderError(
    responseStatus,
    `${typeof record.code === 'string' ? record.code : ''} ${details}`
  );
  return new ProviderError(fallback, {
    provider,
    model,
    details,
    httpStatus: responseStatus,
    info,
  });
};

const readImageResponse = async (
  res: Response,
  fallback: string,
  provider = 'Gemini image generation'
): Promise<string> => {
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ProviderError(`${fallback} (HTTP ${res.status})`, {
      provider,
      httpStatus: res.status,
      info: classifyProviderError(res.status),
    });
  }

  const record = asApiRecord(data);
  if (!res.ok || record.success !== true) {
    throw getProviderError(data, `${fallback} (HTTP ${res.status})`, provider, res.status);
  }

  const imageUrl = record.imageUrl;
  if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
    throw new ProviderError(`${fallback}: server returned no generated image data`, {
      provider,
      httpStatus: res.status,
      info: classifyProviderError(res.status, 'missing generated image data'),
    });
  }
  return imageUrl;
};

type VideoGenerationResult = {
  videoUrl: string;
  provider: string;
  model: string;
  durationSec: number;
  shotId?: string;
  operationId?: string;
  status: 'COMPLETED';
  mimeType?: string;
  outputFormat?: 'webp' | 'mp4';
};

export interface LocalImageGenerationResult {
  success: boolean;
  imageUrl: string;
  images?: Array<{ imageUrl: string; mimeType: string; sizeBytes: number }>;
  provider?: string;
  model?: string;
  ckptName?: string;
  seed?: number;
  resolution?: string;
  dimensions?: string;
  operationId?: string;
  vramWarning?: string;
  backend?: string;
}

// Strict local image response: requires success:true AND a real imageUrl from the
// persisted asset store — never a placeholder or proxy URL.
const readLocalImageResponse = async (res: Response): Promise<LocalImageGenerationResult> => {
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ProviderError(`Local image generation failed (HTTP ${res.status})`, {
      provider: 'Local image generation (ComfyUI)',
      httpStatus: res.status,
      info: classifyProviderError(res.status),
    });
  }

  const record = asApiRecord(data);
  if (!res.ok || record.success !== true) {
    throw getProviderError(data, `Local image generation failed (HTTP ${res.status})`, 'Local image generation (ComfyUI)', res.status);
  }

  const imageUrl = record.imageUrl;
  if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
    throw new ProviderError('Local image generation failed: server returned no generated image', {
      provider: 'Local image generation (ComfyUI)',
      httpStatus: res.status,
      info: classifyProviderError(res.status, 'missing generated image URL'),
    });
  }
  if (!imageUrl.startsWith('/api/assets/')) {
    throw new ProviderError('Local image generation failed: server returned a non-durable image URL', {
      provider: 'Local image generation (ComfyUI)',
      httpStatus: res.status,
      info: classifyProviderError(res.status, 'non-durable image URL'),
    });
  }

  const images = Array.isArray(record.images)
    ? (record.images as Array<{ imageUrl: string; mimeType: string; sizeBytes: number }>).filter(i => typeof i.imageUrl === 'string' && i.imageUrl.startsWith('/api/assets/'))
    : undefined;

  return {
    success: true,
    imageUrl,
    images: images && images.length > 0 ? images : undefined,
    provider: typeof record.provider === 'string' ? record.provider : 'Local Image (ComfyUI)',
    model: typeof record.model === 'string' ? record.model : undefined,
    ckptName: typeof record.ckptName === 'string' ? record.ckptName : undefined,
    seed: typeof record.seed === 'number' ? record.seed : undefined,
    resolution: typeof record.resolution === 'string' ? record.resolution : undefined,
    dimensions: typeof record.dimensions === 'string' ? record.dimensions : undefined,
    operationId: typeof record.operationId === 'string' ? record.operationId : undefined,
    vramWarning: typeof record.vramWarning === 'string' ? record.vramWarning : undefined,
    backend: typeof record.backend === 'string' ? record.backend : 'ComfyUI',
  };
};

const readVideoResponse = async (res: Response): Promise<VideoGenerationResult> => {
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ProviderError(`Video generation failed (HTTP ${res.status})`, {
      provider: 'Veo video generation',
      httpStatus: res.status,
      info: classifyProviderError(res.status),
    });
  }

  const record = asApiRecord(data);
  if (!res.ok || record.success !== true) {
    throw getProviderError(data, `Video generation failed (HTTP ${res.status})`, 'Veo video generation', res.status);
  }

  const videoUrl = record.videoUrl;
  if (typeof videoUrl !== 'string' || !videoUrl.trim()) {
    throw new ProviderError('Video generation failed: server returned no generated video URL', {
      provider: 'Veo video generation',
      httpStatus: res.status,
      info: classifyProviderError(res.status, 'missing generated video URL'),
    });
  }
  if (/commondatastorage\.googleapis\.com\/gtv-videos-bucket\/sample\//i.test(videoUrl)) {
    throw new ProviderError('Video generation failed: server returned a sample video URL', {
      provider: 'Veo video generation',
      httpStatus: res.status,
      info: classifyProviderError(res.status, 'sample video URL'),
    });
  }

  const provider = typeof record.provider === 'string' ? record.provider : 'Veo Video Generator';
  const model = typeof record.model === 'string' ? record.model : 'unknown';
  const durationSec = typeof record.durationSec === 'number' ? record.durationSec : 0;
  const mimeType = typeof record.mimeType === 'string' ? record.mimeType : undefined;
  const outputFormat = record.outputFormat === 'webp' || record.outputFormat === 'mp4' ? record.outputFormat : undefined;
  if (record.status !== 'COMPLETED') {
    throw new Error('Video generation failed: provider did not report completion');
  }

  return {
    videoUrl,
    provider,
    model,
    durationSec,
    mimeType,
    outputFormat,
    shotId: typeof record.shotId === 'string' ? record.shotId : undefined,
    operationId: typeof record.operationId === 'string' ? record.operationId : undefined,
    status: 'COMPLETED',
  };
};

export class FilmStudioApiClient {
  public static async getProviderStatus(): Promise<ProviderStatus> {
    try {
      const res = await fetch('/api/providers/status');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Could not fetch provider status', e);
    }
    return {
      imageProvider: { name: 'Nano Banana 2 (Gemini 3.1 Flash Image)', available: false, model: 'gemini-3.1-flash-image' },
      videoProvider: { name: 'Veo Video Generator (Veo 3.1)', available: false, configured: false, model: 'veo-3.1-generate-preview' },
      ttsProvider: { name: 'Gemini Flash Audio TTS Engine', available: true, model: 'gemini-3.1-flash-tts-preview' },
      musicProvider: { name: 'Lyria Audio & Neural Cue Engine', available: true, model: 'lyria-3-clip-preview' },
      audioProvider: { name: 'Web Audio Cinematic Synthesizer', available: true, model: 'cinema-audio-engine-v2' },
    };
  }

  public static async analyzeScreenplay(screenplayText: string): Promise<any> {
    const res = await fetch('/api/gemini/analyze-screenplay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ screenplayText }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Screenplay analysis failed');
    }
    return data.data;
  }

  public static async generateShotsForScene(scene: any, characters: any[], location: any, projectTitle: string): Promise<Shot[]> {
    const res = await fetch('/api/gemini/generate-shots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scene, characters, location, projectTitle }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Shot generation failed');
    }
    return data.shots;
  }

  public static async generateImage(
    prompt: string, 
    aspectRatio = '16:9', 
    imageSize = '1K',
    referenceImageBase64?: string,
    model: string = 'gemini-3.1-flash-image'
  ): Promise<string> {
    const res = await fetch('/api/gemini/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, aspectRatio, imageSize, referenceImageBase64, model }),
    });
    return readImageResponse(res, 'Image generation failed');
  }

  public static async editImage(
    prompt: string,
    imageBase64: string,
    mimeType = 'image/jpeg',
    aspectRatio = '16:9',
    imageSize = '1K',
    model: string = 'gemini-3.1-flash-image'
  ): Promise<string> {
    const res = await fetch('/api/gemini/edit-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, imageBase64, mimeType, aspectRatio, imageSize, model }),
    });
    return readImageResponse(res, 'Image editing failed', 'Gemini image editing');
  }

  public static async generateMusic(options: {
    prompt: string;
    type?: 'clip' | 'pro' | 'full';
    genre?: string;
    mood?: string;
    tempoBpm?: number;
    referenceImageBase64?: string;
    sceneId?: string;
    shotId?: string;
  }): Promise<{
    audioUrl: string;
    audioBase64: string;
    mimeType: string;
    lyrics?: string;
    model: string;
    durationSec: number;
    genre: string;
    mood: string;
    tempoBpm: number;
    sceneId?: string;
    shotId?: string;
  }> {
    const res = await fetch('/api/gemini/generate-music', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Music generation failed');
    }
    return data;
  }

  public static async generateTTS(
    text: string, 
    voiceName: string = 'Kore', 
    emotion: string = 'restrained',
    delivery?: string
  ): Promise<{ 
    audioUrl: string; 
    audioData: string; 
    mimeType: string; 
    durationSec: number; 
    voiceName: string; 
    emotion: string;
    text?: string;
  }> {
    const res = await fetch('/api/gemini/generate-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceName, emotion, delivery }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'TTS generation failed');
    }
    const mimeType = data.mimeType || 'audio/wav';
    const audioUrl = data.audioUrl || `data:${mimeType};base64,${data.audioData}`;
    return { 
      audioUrl,
      audioData: data.audioData, 
      mimeType,
      durationSec: data.durationSec || 3.0,
      voiceName: data.voiceName || voiceName,
      emotion: data.emotion || emotion,
      text: data.text || text
    };
  }

  public static async askAIAssistant(message: string, projectContext: FilmProject, history: any[] = []): Promise<string> {
    const res = await fetch('/api/gemini/ai-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, projectContext, conversationHistory: history }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Assistant request failed');
    }
    return data.reply;
  }

  public static async aiEditFilm(project: FilmProject): Promise<any> {
    const res = await fetch('/api/gemini/ai-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'AI edit proposal failed');
    }
    return data.editPlan;
  }

  public static async generatePromptSuite(shot: any, characters: any[], location: any, style: any, projectTitle: string): Promise<any> {
    const res = await fetch('/api/gemini/generate-prompt-suite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shot, characters, location, style, projectTitle }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Prompt suite generation failed');
    }
    return data.prompts;
  }

  public static async auditContinuity(project: FilmProject): Promise<any> {
    const res = await fetch('/api/gemini/continuity-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Continuity audit failed');
    }
    return data.audit;
  }

  public static async generateVideo(
    prompt: string,
    durationSec = 4,
    shotId?: string,
    keyframeUrl?: string
  ): Promise<VideoGenerationResult> {
    const res = await fetch('/api/video/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, durationSec, shotId, keyframeUrl }),
    });
    return readVideoResponse(res);
  }

  public static async generateLocalImage(
    prompt: string,
    options: {
      aspectRatio?: string;
      imageSize?: string;
      resolution?: string;
      referenceImageBase64?: string;
      referenceMimeType?: string;
      seed?: number;
      negativePrompt?: string;
      steps?: number;
      cfg?: number;
      sampler?: string;
      scheduler?: string;
      batchSize?: number;
      denoise?: number;
    } = {}
  ): Promise<LocalImageGenerationResult> {
    const res = await fetch('/api/image/generate-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, ...options }),
    });
    return readLocalImageResponse(res);
  }

  public static async getLocalImageStatus(): Promise<unknown> {
    const res = await fetch('/api/local-image/status');
    if (!res.ok) throw new Error('Local image status check failed');
    return res.json();
  }

  public static async generateLocalVideo(
    prompt: string,
    durationSec = 4,
    shotId?: string,
    keyframeUrl?: string,
    aspectRatio = '16:9',
    resolution?: string,
    seed?: number,
    outputFormat: 'webp' | 'mp4' | 'auto' = 'auto'
  ): Promise<VideoGenerationResult> {
    const res = await fetch('/api/video/generate-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, durationSec, shotId, keyframeUrl, aspectRatio, resolution, seed, outputFormat }),
    });
    return readVideoResponse(res);
  }

  public static async getLocalVideoStatus(): Promise<unknown> {
    const res = await fetch('/api/local-video/status');
    if (!res.ok) throw new Error('Local video status check failed');
    return res.json();
  }

  public static async generateImageToVideo(request: {
    prompt: string;
    sourceImage: string;
    durationSec?: number;
    provider?: 'local' | 'runway' | 'wan' | 'seedance' | 'kling';
    shotId?: string;
    endFrame?: string;
  }): Promise<VideoGenerationResult> {
    if (!request.provider || request.provider === 'local') {
      return FilmStudioApiClient.generateLocalVideo(
        request.prompt,
        request.durationSec || 4,
        request.shotId,
        request.sourceImage,
      );
    }
    throw new Error(`${request.provider} image-to-video provider is not configured in this build`);
  }
}
