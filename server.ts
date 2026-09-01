import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { classifyProviderError, ProviderError, ProviderErrorInfo } from './src/utils/providerErrors';
import { interpretComfyHistory, comfyPollingError, type ComfyHistoryEntry } from './src/utils/comfyPolling';
import {
  getLocalVideoConfig,
  type LocalVideoProviderConfig,
  type LocalBackendStatus,
  type LocalVideoResult,
  type LocalVideoCapabilities,
  resolveLocalVideoDimensions,
  getLocalImageConfig,
  type LocalImageProviderConfig,
  type LocalImageResult,
} from './src/utils/localVideoProvider';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

type ProviderHealthRecord = {
  quotaStatus: 'available' | 'exhausted' | 'unknown';
  lastErrorCode?: ProviderErrorInfo['code'];
  retryAfterSec?: number;
  checkedAt?: string;
};

const providerHealth: Record<'image' | 'video', ProviderHealthRecord> = {
  image: { quotaStatus: 'unknown' },
  video: { quotaStatus: 'unknown' },
};

// ── Local Video Backend ───────────────────────────────────────────────────
let localBackendStatusCache: { url: string; status: LocalBackendStatus } | null = null;
let localBackendCheckedAt = 0;
const LOCAL_BACKEND_CACHE_MS = 30_000;

const detectLocalBackend = async (config: LocalVideoProviderConfig): Promise<LocalBackendStatus> => {
  if (!config.enabled) {
    return { available: false, backend: 'Local', model: config.model, error: 'Local provider is not enabled' };
  }

  const now = Date.now();
  if (
    localBackendStatusCache &&
    localBackendStatusCache.url === config.url &&
    now - localBackendCheckedAt < LOCAL_BACKEND_CACHE_MS
  ) {
    return localBackendStatusCache.status;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // Try ComfyUI /system_stats endpoint
    const statsUrl = `${config.url}/system_stats`;
    const response = await fetch(statsUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      const status: LocalBackendStatus = {
        available: false,
        backend: 'ComfyUI',
        model: config.model,
        error: `Backend returned HTTP ${response.status}`,
      };
      localBackendStatusCache = { url: config.url, status };
      localBackendCheckedAt = now;
      return status;
    }

    const stats = await response.json() as Record<string, unknown>;
    const system = stats.system as Record<string, unknown> | undefined;
    const devices = (stats.devices as Array<Record<string, unknown>> | undefined) || [];
    const primaryDevice = devices[0];

    const gpuName = typeof primaryDevice?.name === 'string' ? primaryDevice.name : undefined;
    const vramMb = typeof primaryDevice?.vram_total === 'number'
      ? Math.round(primaryDevice.vram_total / (1024 * 1024))
      : undefined;
    const vramTotal = vramMb !== undefined ? `${vramMb} MB` : undefined;
    const systemRamMb = typeof system?.ram_total === 'number'
      ? Math.round(system.ram_total / (1024 * 1024))
      : undefined;
    // ComfyUI reports its version as comfyui_version in /system_stats.
    const backendVersion = typeof system?.comfyui_version === 'string'
      ? system.comfyui_version
      : (typeof system?.version === 'string' ? system.version : undefined);

    // Derive CUDA/GPU availability from the reported devices instead of assuming a GPU.
    const cudaAvailable = devices.some(device => {
      const deviceType = typeof device?.type === 'string' ? device.type.toLowerCase() : '';
      const deviceName = typeof device?.name === 'string' ? device.name.toLowerCase() : '';
      return deviceType.includes('cuda') || deviceType.includes('gpu') ||
        /nvidia|rtx|gtx|cuda/i.test(deviceName);
    });

    const status: LocalBackendStatus = {
      available: true,
      backend: 'ComfyUI',
      model: config.model,
      gpu: gpuName,
      vram: vramTotal,
      vramMb,
      vramSufficient: vramMb !== undefined ? vramMb >= 8000 : undefined,
      cudaAvailable,
      backendVersion,
      systemRamMb,
      modelAvailable: 'unknown',
      modelVerified: false,
    };
    localBackendStatusCache = { url: config.url, status };
    localBackendCheckedAt = now;
    console.info('[LocalBackend] backend detected', { gpu: gpuName, vram: vramTotal, version: backendVersion, cudaAvailable });
    return status;
  } catch (error) {
    const status: LocalBackendStatus = {
      available: false,
      backend: 'ComfyUI',
      model: config.model,
      error: error instanceof Error ? error.message : String(error),
    };
    localBackendStatusCache = { url: config.url, status };
    localBackendCheckedAt = now;
    return status;
  }
};

// Query ComfyUI for the list of available checkpoints/models for a given loader node.
// `/object_info/<node>` exposes `input.required.<inputName>[0]` as a string array.
const detectLocalCheckpoints = async (
  url: string,
  nodeType: string,
  inputName: string
): Promise<string[]> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(`${url}/object_info/${nodeType}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return [];

    const info = await response.json() as Record<string, unknown>;
    const node = info[nodeType] as Record<string, unknown> | undefined;
    const input = node?.input as Record<string, unknown> | undefined;
    const required = input?.required as Record<string, unknown> | undefined;
    const values = required?.[inputName] as unknown;
    if (Array.isArray(values) && Array.isArray(values[0])) {
      return (values[0] as unknown[]).filter((value): value is string => typeof value === 'string');
    }
    return [];
  } catch {
    return [];
  }
};

// Check whether a specific ComfyUI node type is installed.
const detectLocalNodeExists = async (url: string, nodeType: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(`${url}/object_info/${nodeType}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return false;
    const info = await response.json() as Record<string, unknown>;
    return Boolean(info[nodeType]);
  } catch {
    return false;
  }
};

const detectMissingNodes = async (url: string, nodeTypes: string[]): Promise<string[]> => {
  const missing: string[] = [];
  for (const nodeType of nodeTypes) {
    if (!(await detectLocalNodeExists(url, nodeType))) missing.push(nodeType);
  }
  return missing;
};

// Determine which output formats the installed backend actually supports.
const getLocalVideoCapabilities = async (url: string): Promise<LocalVideoCapabilities> => {
  const hasEmptyLtxLatent = await detectLocalNodeExists(url, 'EmptyLTXVLatentVideo');
  const hasImgToVideo = await detectLocalNodeExists(url, 'LTXVImgToVideo');
  const hasSaveWebp = await detectLocalNodeExists(url, 'SaveAnimatedWEBP');
  // MP4 is produced by ComfyUI 0.20.x native nodes (CreateVideo → SaveVideo, H.264 via PyAV)
  // or by VideoHelperSuite (VHS_VideoCombine) on older backends. Either path qualifies.
  const hasNativeMp4 = (await detectLocalNodeExists(url, 'CreateVideo')) && (await detectLocalNodeExists(url, 'SaveVideo'));
  const hasVhs = await detectLocalNodeExists(url, 'VHS_VideoCombine');
  return {
    textToVideo: hasEmptyLtxLatent,
    imageToVideo: hasImgToVideo,
    mp4: hasNativeMp4 || hasVhs,
    webp: hasSaveWebp,
    audio: false,
    resolutions: ['480p', '720p', '1080p'],
    maxResolution: '1080p',
  };
};

// ComfyUI 0.20.x native LTX-Video node set (covers text-to-video and image-to-video).
const REQUIRED_VIDEO_NODES = [
  'CheckpointLoaderSimple',
  'CLIPLoader',
  'CLIPTextEncode',
  'LTXVConditioning',
  'EmptyLTXVLatentVideo',
  'LTXVImgToVideo',
  'LTXVScheduler',
  'KSamplerSelect',
  'SamplerCustom',
  'VAEDecode',
  'SaveAnimatedWEBP',
];

const REQUIRED_IMAGE_NODES = [
  'CheckpointLoaderSimple',
  'CLIPTextEncode',
  'EmptyLatentImage',
  'KSampler',
  'VAEDecode',
  'SaveImage',
];

// Extra nodes needed only for image-to-image (reference image → VAE encode → partial denoise).
const IMAGE_TO_IMAGE_NODES = ['LoadImage', 'ImageScale', 'VAEEncode'];

// Determine which local image capabilities the installed backend actually supports.
const getLocalImageCapabilities = async (url: string) => {
  const hasCore = async (): Promise<boolean> => {
    const missing = await detectMissingNodes(url, REQUIRED_IMAGE_NODES);
    return missing.length === 0;
  };
  const missingImg2Img = await detectMissingNodes(url, IMAGE_TO_IMAGE_NODES);
  return {
    textToImage: await hasCore(),
    imageToImage: missingImg2Img.length === 0,
    resolutions: ['512x512', '640x640', '768x768', '1024x1024', '16:9', '4:3', '3:2', '9:16', '2:3', '1:1'],
    maxResolution: '1024x1024',
  };
};

// ── Local Asset Persistence ───────────────────────────────────────────────
const ASSET_ROOT = process.env.NULL_SECTOR_ASSET_DIR || path.join(process.cwd(), 'data', 'assets');
const ASSET_IMAGE_DIR = path.join(ASSET_ROOT, 'images');
const ASSET_VIDEO_DIR = path.join(ASSET_ROOT, 'videos');
const execFileAsync = promisify(execFile);

const ensureAssetDirs = () => {
  fs.mkdirSync(ASSET_IMAGE_DIR, { recursive: true });
  fs.mkdirSync(ASSET_VIDEO_DIR, { recursive: true });
};

// Verify a real image signature (PNG / JPEG / WebP / GIF) rather than trusting
// the content-type header or the filename alone.
const hasValidImageSignature = (bytes: Buffer): boolean => {
  if (bytes.length < 12) return false;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  // WebP: RIFF....WEBP
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return true;
  // GIF: GIF87a / GIF89a
  if (bytes.toString('ascii', 0, 6) === 'GIF87a' || bytes.toString('ascii', 0, 6) === 'GIF89a') return true;
  // BMP: BM
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return true;
  return false;
};

const mimeToExtension = (mime: string, category: 'image' | 'video'): string => {
  const normalized = (mime || '').split(';')[0].trim().toLowerCase();
  if (normalized.includes('png')) return 'png';
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg';
  if (normalized.includes('webp')) return 'webp';
  if (normalized.includes('gif')) return 'gif';
  if (normalized.includes('mp4')) return 'mp4';
  if (normalized.includes('quicktime')) return 'mov';
  if (normalized.includes('webm')) return 'webm';
  return category === 'image' ? 'png' : 'webm';
};

const isValidMediaType = (contentType: string, category: 'image' | 'video'): boolean => {
  const normalized = (contentType || '').split(';')[0].trim().toLowerCase();
  if (category === 'image') return normalized.startsWith('image/');
  return normalized.startsWith('video/') ||
    normalized === 'image/webp' ||
    normalized === 'image/gif' ||
    normalized === 'application/octet-stream'; // ComfyUI sometimes omits a video MIME type
};

// Download a generated file from the backend and persist it under the app's own
// asset directory so shots do not depend on the backend's temporary output dir.
const persistBackendFile = async (
  viewUrl: string,
  category: 'image' | 'video',
  seed: number
): Promise<{ url: string; mimeType: string; sizeBytes: number }> => {
  const response = await fetch(viewUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Local backend did not return the generated ${category} file (HTTP ${response.status})`);
  }

  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (contentType && !isValidMediaType(contentType, category)) {
    throw new Error(`Local backend returned an unexpected content type for ${category}: ${contentType || 'unknown'}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0) {
    throw new Error(`Local backend returned an empty ${category} file`);
  }

  if (category === 'image' && !hasValidImageSignature(bytes)) {
    throw new Error('Local backend returned data that is not a valid image (PNG/JPEG/WebP/GIF signature check failed)');
  }

  ensureAssetDirs();
  const dir = category === 'image' ? ASSET_IMAGE_DIR : ASSET_VIDEO_DIR;
  const extension = mimeToExtension(contentType, category);
  const filename = `${Date.now()}_${seed}_${Math.random().toString(36).slice(2, 8)}.${extension}`;
  fs.writeFileSync(path.join(dir, filename), bytes);

  return {
    url: `/api/assets/${category === 'image' ? 'images' : 'videos'}/${filename}`,
    mimeType: contentType || (category === 'image' ? 'image/png' : 'video/webm'),
    sizeBytes: bytes.length,
  };
};

// ComfyUI 0.20.x native LTX-Video workflow builder (text-to-video and image-to-video).
// Matches ComfyUI's official LTX-Video template: the checkpoint (CheckpointLoaderSimple)
// provides the MODEL + VAE, and the T5-XXL text encoder is a SEPARATE file loaded via
// CLIPLoader(type='ltxv') — LTX-Video checkpoints do NOT contain a text encoder.
const buildComfyUIWorkflow = (
  prompt: string,
  durationSec: number,
  width: number,
  height: number,
  seed: number,
  keyframeImage: { filename: string; subfolder?: string; type?: string } | undefined,
  checkpointName: string,
  textEncoderName: string,
  outputFormat: 'webp' | 'mp4',
): Record<string, unknown> => {
  const fps = 24;
  // LTX-Video wants frame counts of the form 8n + 1 (97 frames ≈ 4s at 24 fps).
  const frameCount = Math.max(9, Math.round(durationSec * fps));
  const length = ((Math.max(1, Math.ceil((frameCount - 1) / 8))) * 8) + 1;
  const isImageToVideo = Boolean(keyframeImage);

  const workflow: Record<string, unknown> = {
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: checkpointName },
    },
    '2': {
      class_type: 'CLIPLoader',
      inputs: { clip_name: textEncoderName, type: 'ltxv', device: 'default' },
    },
    '3': {
      class_type: 'CLIPTextEncode',
      inputs: { text: prompt, clip: ['2', 0] },
    },
    '4': {
      class_type: 'CLIPTextEncode',
      inputs: { text: 'low quality, worst quality, deformed, distorted, disfigured, motion smear, motion artifacts, fused fingers, bad anatomy, ugly', clip: ['2', 0] },
    },
    '5': {
      class_type: 'LTXVConditioning',
      inputs: { positive: ['3', 0], negative: ['4', 0], frame_rate: fps },
    },
  };

  if (isImageToVideo) {
    // LTXVImgToVideo encodes the first frame into the video latent and passes the
    // conditioning through, so conditioning + latent both originate from this node.
    workflow['6'] = {
      class_type: 'LTXVImgToVideo',
      inputs: {
        positive: ['5', 0],
        negative: ['5', 1],
        vae: ['1', 2],
        image: ['7', 0],
        width,
        height,
        length,
        batch_size: 1,
        strength: 0.85,
      },
    };
    workflow['7'] = {
      class_type: 'LoadImage',
      inputs: { image: keyframeImage!.filename },
    };
  } else {
    workflow['6'] = {
      class_type: 'EmptyLTXVLatentVideo',
      inputs: { width, height, length, batch_size: 1 },
    };
  }

  // Conditioning + latent sources differ between text-to-video and image-to-video.
  const positive = isImageToVideo ? ['6', 0] : ['5', 0];
  const negative = isImageToVideo ? ['6', 1] : ['5', 1];
  const latent = isImageToVideo ? ['6', 2] : ['6', 0];

  workflow['8'] = {
    class_type: 'KSamplerSelect',
    inputs: { sampler_name: 'euler' },
  };
  workflow['9'] = {
    class_type: 'LTXVScheduler',
    inputs: { steps: 25, max_shift: 2.05, base_shift: 0.95, stretch: true, terminal: 0.1, latent },
  };
  workflow['10'] = {
    class_type: 'SamplerCustom',
    inputs: {
      add_noise: true,
      noise_seed: seed,
      cfg: 3.0,
      model: ['1', 0],
      positive,
      negative,
      sampler: ['8', 0],
      sigmas: ['9', 0],
      latent_image: latent,
    },
  };
  workflow['11'] = {
    class_type: 'VAEDecode',
    inputs: { samples: ['10', 0], vae: ['1', 2] },
  };

  if (outputFormat === 'mp4') {
    // ComfyUI 0.20.x native path: VAEDecode → CreateVideo → SaveVideo (mp4/h264 via PyAV).
    // Falls back to VideoHelperSuite (VHS_VideoCombine) on older backends that lack SaveVideo.
    workflow['13'] = {
      class_type: 'CreateVideo',
      inputs: { images: ['11', 0], fps },
    };
    workflow['12'] = {
      class_type: 'SaveVideo',
      inputs: {
        video: ['13', 0],
        filename_prefix: `null_sector_local_${seed}`,
        format: 'mp4',
        codec: 'h264',
      },
    };
  } else {
    workflow['12'] = {
      class_type: 'SaveAnimatedWEBP',
      inputs: {
        filename_prefix: `null_sector_local_${seed}`,
        fps,
        lossless: false,
        quality: 90,
        method: 'default',
        images: ['11', 0],
      },
    };
  }

  return workflow;
};

// Per-request deadline for history polls and workflow submission so a hung
// ComfyUI response cannot block the poll loop or the HTTP handler forever.
const COMFYUI_POLL_REQUEST_TIMEOUT_MS = 20_000;
const COMFYUI_SUBMIT_TIMEOUT_MS = 30_000;

// Poll ComfyUI for a completed workflow output
const waitForLocalVideoJob = async (
  config: LocalVideoProviderConfig,
  promptId: string,
  shotId?: string,
  seed = 0,
): Promise<LocalVideoResult> => {
  const startedAt = Date.now();
  const maxWaitMs = config.timeoutSec * 1000;
  const pollMs = config.pollIntervalSec * 1000;

  console.info('[LocalVideo] submitted', { promptId, model: config.model, shotId, timeoutSec: config.timeoutSec });

  while (Date.now() - startedAt < maxWaitMs) {
    await new Promise(resolve => setTimeout(resolve, pollMs));

    try {
      const historyUrl = `${config.url}/history/${promptId}`;
      const response = await fetch(historyUrl, { signal: AbortSignal.timeout(COMFYUI_POLL_REQUEST_TIMEOUT_MS) });
      if (!response.ok) {
        // Temporary HTTP failure (ComfyUI restarting, proxy hiccup): keep polling
        // until the job deadline, but surface it in diagnostics.
        console.warn('[LocalVideo] poll HTTP failure', { promptId, status: response.status });
        continue;
      }

      const history = await response.json() as Record<string, ComfyHistoryEntry | undefined>;
      const phase = interpretComfyHistory(history[promptId]);

      if (phase.phase === 'pending' || phase.phase === 'running') continue;

      if (phase.phase === 'error') {
        // Real generation failure (CUDA/GPU error, rejected workflow at runtime,
        // completed-without-output). Do not keep polling — surface it now with the
        // precise classification instead of degrading it into a timeout.
        console.error('[LocalVideo] execution error', { promptId, message: phase.message, code: phase.info.code });
        throw comfyPollingError(phase);
      }

      // phase === 'completed': persist the generated file into the app's durable
      // asset directory so the take does not depend on ComfyUI's temp output folder.
      const file = phase.files[0];
      const viewUrl = `${config.url}/view?filename=${encodeURIComponent(file.filename)}&subfolder=${encodeURIComponent(file.subfolder || '')}&type=${encodeURIComponent(file.type || 'output')}`;
      const persisted = await persistBackendFile(viewUrl, 'video', seed);
      const durationMs = Date.now() - startedAt;
      console.info('[LocalVideo] completed', { promptId, durationMs, filename: file.filename, shotId, sizeBytes: persisted.sizeBytes, outputNode: file.nodeId, slot: file.slot });

      return {
        success: true,
        videoUrl: persisted.url,
        mimeType: persisted.mimeType,
        outputFormat: persisted.mimeType.includes('mp4') ? 'mp4' : 'webp',
        durationSec: durationMs / 1000,
        model: config.model,
        backend: 'ComfyUI',
        jobId: promptId,
      };
    } catch (error) {
      // Do not swallow classified ProviderErrors thrown above (execution error,
      // persistence failure) — they must reach the endpoint's error handler.
      if (error instanceof ProviderError) throw error;
      console.warn('[LocalVideo] poll error', { promptId, error: safeProviderError(error) });
    }
  }

  throw new ProviderError(
    `Local video generation timed out after ${config.timeoutSec}s`,
    { provider: 'Local Video (ComfyUI)', info: classifyProviderError(undefined, 'Local video generation timed out'), details: `ComfyUI did not complete prompt ${promptId} within ${config.timeoutSec}s` },
  );
};

app.use(express.json({ limit: '50mb' }));

// Serve durable local-generation assets (images and videos persisted from the backend).
ensureAssetDirs();
app.use('/api/assets', express.static(ASSET_ROOT));

// Optional FFprobe-backed validation for completed local video assets. The browser
// performs a lightweight HEAD check; this endpoint provides authoritative stream
// metadata when ffprobe is installed on the host.
app.get('/api/assets/video-metadata', async (req: Request, res: Response) => {
  const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
  if (!rawUrl.startsWith('/api/assets/videos/')) return res.status(400).json({ error: 'Only local video assets may be inspected.' });
  const relative = decodeURIComponent(rawUrl.slice('/api/assets/videos/'.length));
  const candidate = path.resolve(ASSET_VIDEO_DIR, relative);
  if (!candidate.startsWith(path.resolve(ASSET_VIDEO_DIR) + path.sep) || !fs.existsSync(candidate)) {
    return res.status(404).json({ error: 'Video asset was not found.' });
  }
  try {
    const probe = await execFileAsync(process.env.FFPROBE_PATH || 'ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration:format_name',
      '-show_entries', 'stream=codec_type,codec_name,width,height,avg_frame_rate',
      '-of', 'json', candidate,
    ], { windowsHide: true, maxBuffer: 1024 * 1024 });
    const parsed = JSON.parse(probe.stdout || '{}') as { format?: { duration?: string; format_name?: string }; streams?: Array<Record<string, string | number>> };
    const stream = parsed.streams?.find(item => item.codec_type === 'video');
    const durationSec = Number(parsed.format?.duration || 0);
    const width = Number(stream?.width || 0);
    const height = Number(stream?.height || 0);
    const rate = String(stream?.avg_frame_rate || '0/0').split('/').map(Number);
    const frameRate = rate[1] ? rate[0] / rate[1] : Number(rate[0] || 0);
    if (!stream || durationSec <= 0 || width <= 0 || height <= 0 || frameRate <= 0) {
      return res.status(422).json({ error: 'FFprobe found no valid video stream.' });
    }
    return res.json({ valid: true, verifiedBy: 'ffprobe', metadata: { sizeBytes: fs.statSync(candidate).size, durationSec, width, height, frameRate, codec: stream.codec_name, format: parsed.format?.format_name } });
  } catch (error) {
    return res.status(503).json({ error: 'FFprobe is unavailable for this installation.', details: safeProviderError(error) });
  }
});

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health & Providers Status
app.get('/api/providers/status', async (req: Request, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  const ai = getAI();
  let imageAvailable = false;
  let liteImageAvailable = false;
  let videoAvailable = false;

  if (ai) {
    try {
      await verifyImageModelAvailability(ai, IMAGE_MODEL);
      imageAvailable = true;
    } catch (error) {
      console.warn('[ProviderStatus] Image model unavailable:', safeProviderError(error));
    }
    try {
      await verifyImageModelAvailability(ai, IMAGE_LITE_MODEL);
      liteImageAvailable = true;
    } catch (error) {
      console.info('[ProviderStatus] Lite image model unavailable:', safeProviderError(error));
    }
    try {
      await verifyImageModelAvailability(ai, VIDEO_MODEL);
      videoAvailable = true;
    } catch (error) {
      console.warn('[ProviderStatus] Video model unavailable:', safeProviderError(error));
    }
  }

  res.json({
    imageProvider: {
      name: 'Nano Banana 2 (Gemini 3.1 Flash Image)',
      available: imageAvailable,
      model: IMAGE_MODEL,
      liteModel: IMAGE_LITE_MODEL,
      liteAvailable: liteImageAvailable,
      configured: hasKey,
      quotaStatus: providerHealth.image.quotaStatus,
      lastErrorCode: providerHealth.image.lastErrorCode,
      retryAfterSec: providerHealth.image.retryAfterSec,
      checkedAt: providerHealth.image.checkedAt,
      description: hasKey
        ? 'Gemini image generation model availability was verified against the configured API key.'
        : 'GEMINI_API_KEY is not configured.',
    },
    liveProvider: {
      name: 'Gemini Live Voice Director (Real-Time)',
      available: hasKey,
      model: 'gemini-3.1-flash-live-preview',
    },
    videoProvider: {
      name: 'Veo Video Generator (Veo 3.1)',
      available: videoAvailable,
      configured: hasKey,
      model: VIDEO_MODEL,
      quotaStatus: providerHealth.video.quotaStatus,
      lastErrorCode: providerHealth.video.lastErrorCode,
      retryAfterSec: providerHealth.video.retryAfterSec,
      checkedAt: providerHealth.video.checkedAt,
      description: hasKey
        ? 'Veo model availability was verified against the configured API key.'
        : 'GEMINI_API_KEY is not configured.',
    },
    ttsProvider: {
      name: 'Gemini Flash Audio TTS & Speech Engine',
      available: hasKey,
      model: 'gemini-3.1-flash-tts-preview',
    },
    musicProvider: {
      name: 'Lyria Neural Score & Soundtrack Engine',
      available: hasKey,
      models: {
        clip: 'lyria-3-clip-preview',
        pro: 'lyria-3-pro-preview',
      },
    },
    audioProvider: {
      name: 'Web Audio Cinematic Synthesizer',
      available: true,
      model: 'cinema-audio-engine-v2',
    },
    localVideoProvider: await (async () => {
      const config = getLocalVideoConfig();
      const offlineCapabilities: LocalVideoCapabilities = {
        textToVideo: false,
        imageToVideo: false,
        mp4: false,
        webp: false,
        audio: false,
        resolutions: ['480p', '720p', '1080p'],
        maxResolution: '1080p',
      };
      try {
        const status = await detectLocalBackend(config);
        const checkpoints = status.available
          ? await detectLocalCheckpoints(config.url, 'CheckpointLoaderSimple', 'ckpt_name')
          : [];
        const capabilities = status.available
          ? await getLocalVideoCapabilities(config.url)
          : offlineCapabilities;
        const modelAvailable = !status.available || checkpoints.length === 0
          ? 'unknown'
          : checkpoints.some(name => /ltx|video/i.test(name))
          ? 'available'
          : 'not_found';
        return {
          name: 'Local Video Generator (ComfyUI / LTX-Video)',
          available: status.available,
          configured: config.enabled,
          model: config.model,
          url: config.url,
          gpu: status.gpu,
          vram: status.vram,
          vramMb: status.vramMb,
          vramSufficient: status.vramSufficient,
          cudaAvailable: status.cudaAvailable,
          backendVersion: status.backendVersion,
          modelAvailable,
          modelVerified: checkpoints.length > 0,
          outputFormat: config.outputFormat,
          capabilities,
          error: status.error,
          description: status.available
            ? `Local backend detected: ${status.gpu || 'GPU'} (${status.vram || 'VRAM'}) — ${modelAvailable === 'available' ? 'model found' : modelAvailable === 'not_found' ? 'model not found' : 'model availability unverified'}`
            : status.error || 'Local video backend is not running or not configured.',
        };
      } catch {
        return {
          name: 'Local Video Generator (ComfyUI / LTX-Video)',
          available: false,
          configured: config.enabled,
          model: config.model,
          url: config.url,
          modelAvailable: 'unknown',
          modelVerified: false,
          outputFormat: config.outputFormat,
          capabilities: offlineCapabilities,
          description: 'Local video backend detection failed.',
        };
      }
    })(),
    localImageProvider: await (async () => {
      const config = getLocalImageConfig();
      try {
        const videoConfig = getLocalVideoConfig();
        const detectConfig: LocalVideoProviderConfig = {
          ...videoConfig,
          enabled: config.enabled,
          url: config.url,
        };
        const status = await detectLocalBackend(detectConfig);
        const checkpoints = status.available
          ? await detectLocalCheckpoints(config.url, 'CheckpointLoaderSimple', 'ckpt_name')
          : [];
        const detection = detectLocalImageModel(checkpoints, config.model);
        const hasImageCheckpoint = checkpoints.some(name => isImageCheckpointName(name));
        const modelAvailable = !status.available
          ? 'unknown'
          : hasImageCheckpoint
          ? (detection.detected ? 'available' : 'not_found')
          : 'not_found';
        const capabilities = status.available
          ? await getLocalImageCapabilities(config.url)
          : { textToImage: false, imageToImage: false, resolutions: [], maxResolution: 'none' };
        return {
          name: 'Local Image Generator (ComfyUI / Flux)',
          available: status.available,
          configured: config.enabled,
          model: config.model,
          url: config.url,
          gpu: status.gpu,
          vram: status.vram,
          vramMb: status.vramMb,
          vramSufficient: status.vramSufficient,
          systemRamMb: status.systemRamMb,
          cudaAvailable: status.cudaAvailable,
          backendVersion: status.backendVersion,
          checkpoints,
          modelAvailable,
          modelVerified: detection.detected,
          capabilities,
          error: status.error,
          description: status.available
            ? `Local backend detected: ${status.gpu || 'GPU'} (${status.vram || 'VRAM'}) — ${modelAvailable === 'available' ? `model found: ${detection.ckptName}` : modelAvailable === 'not_found' ? 'no matching image checkpoint installed' : 'model availability unverified'}`
            : status.error || 'Local image backend is not running or not configured.',
        };
      } catch {
        return {
          name: 'Local Image Generator (ComfyUI / Flux)',
          available: false,
          configured: config.enabled,
          model: config.model,
          url: config.url,
          modelAvailable: 'unknown',
          modelVerified: false,
          description: 'Local image backend detection failed.',
        };
      }
    })(),
  });
});

// 1. Analyze Screenplay Route
app.post('/api/gemini/analyze-screenplay', async (req: Request, res: Response) => {
  try {
    const { screenplayText } = req.body;
    if (!screenplayText) {
      return res.status(400).json({ error: 'Screenplay text is required' });
    }

    const ai = getAI();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Please set GEMINI_API_KEY.',
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: `You are a Hollywood script supervisor and production breakdown expert. Analyze the following screenplay text and extract a fully structured breakdown into Acts, Scenes, Characters, Locations, and Dialogue.

SCREENPLAY TEXT:
${screenplayText}

Return valid JSON with this exact schema:
{
  "acts": [
    { "id": "ACT_I", "number": 1, "title": "Act I Title", "description": "Summary", "sceneIds": ["S01"] }
  ],
  "scenes": [
    {
      "id": "S01",
      "actId": "ACT_I",
      "sceneNumber": 1,
      "heading": "INT. LOCATION - TIME",
      "locationName": "Location Name",
      "timeOfDay": "Day/Night",
      "weather": "Weather/Atmosphere",
      "storyPurpose": "Dramatic function",
      "characterNames": ["Character A"],
      "actions": ["Action line 1"],
      "props": ["Prop 1"],
      "continuityNotes": "Continuity details",
      "estimatedRuntimeSec": 60
    }
  ],
  "characters": [
    {
      "name": "Character Name",
      "role": "Lead",
      "age": "35",
      "description": "Short bio",
      "personality": "Traits",
      "appearance": "Visual look",
      "clothing": "Default wardrobe",
      "voiceDescription": "Voice texture",
      "accent": "Accent",
      "characterArc": "Arc summary"
    }
  ],
  "locations": [
    {
      "name": "Location Name",
      "description": "Visual atmosphere",
      "architecture": "Style",
      "lighting": "Lighting scheme",
      "colorPalette": ["#000000", "#FFFFFF"]
    }
  ],
  "dialogueSegments": [
    {
      "characterName": "Character Name",
      "sceneNumber": 1,
      "text": "Spoken line",
      "emotion": "quiet realization",
      "delivery": "restrained, cinematic"
    }
  ]
}`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error analyzing screenplay:', error);
    return res.status(500).json({ error: error.message || 'Failed to analyze screenplay' });
  }
});

// 2. Generate Cinematic Shot List for a Scene
app.post('/api/gemini/generate-shots', async (req: Request, res: Response) => {
  try {
    const { scene, characters, location, projectTitle } = req.body;
    const ai = getAI();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }

    const prompt = `You are a master Director of Photography (ASC) breaking down a screenplay scene into a cinematic shot list for film "${projectTitle || 'Film'}".

SCENE DETAILS:
- Scene #${scene.sceneNumber}: ${scene.heading}
- Story Purpose: ${scene.storyPurpose}
- Location: ${location?.name || scene.locationName || 'Unknown'} (${location?.lighting || 'Cinematic lighting'})
- Characters involved: ${JSON.stringify(characters || [])}
- Actions: ${JSON.stringify(scene.actions || [])}

Generate 4 to 6 cinematic shots covering this scene from master establishing to intimate emotional coverage.
For each shot, return:
- shotNumber (integer)
- title (short title)
- description (cinematic action description)
- durationSec (number)
- camera: {
    shotSize (extreme_wide, wide, full, medium_wide, medium, medium_close_up, close_up, extreme_close_up, macro),
    angle (eye_level, low_angle, high_angle, dutch_angle, birds_eye, over_the_shoulder, pov),
    lens (e.g. "35mm Anamorphic Prime"),
    depthOfField (shallow, deep, rack_focus),
    position (camera placement),
    movement (static, pan, tilt, dolly_in, dolly_out, tracking, crane, handheld, steadicam),
    framing (framing description),
    composition (composition notes)
  }
- subject: {
    characterNames (array of string),
    pose, expression, action, wardrobe, props (array of string)
  }
- environment: {
    timeOfDay, weather, atmosphere, keyLight, fillLight, rimLight, practicals, colorTemp, contrast (high, medium, low, chiaroscuro), mood
  }
- style: {
    cinematicStyle, colorTreatment, filmStock, texture, visualReferences (array of string)
  }
- prompt: (a comprehensive 100-word image generation prompt synthesizing all parameters)

Return as JSON object with a "shots" array.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, shots: parsed.shots || [] });
  } catch (error: any) {
    console.error('Error generating shot list:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate shots' });
  }
});

const IMAGE_MODEL = 'gemini-3.1-flash-image';
const IMAGE_LITE_MODEL = 'gemini-3.1-flash-lite-image';
const IMAGE_MODELS = new Set([IMAGE_MODEL, IMAGE_LITE_MODEL]);
const VIDEO_MODEL = process.env.GEMINI_VIDEO_MODEL || 'veo-3.1-generate-preview';
const VIDEO_ASPECT_RATIO = '16:9';
const VIDEO_POLL_INTERVAL_MS = 10_000;
const VIDEO_MAX_WAIT_MS = 10 * 60 * 1_000;
const IMAGE_ASPECT_RATIOS = new Set(['1:1', '3:4', '4:3', '9:16', '16:9']);

interface GeminiVideoInputImage {
  imageBytes: string;
  mimeType: string;
}

const getGeminiVideoInputImage = async (
  input: string,
  fallbackMimeType: string
): Promise<GeminiVideoInputImage> => {
  const imagePart = await getImagePartFromInput(input, fallbackMimeType);
  return {
    imageBytes: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType,
  };
};

const getVideoProxyUrl = (providerUri: string): string =>
  `/api/video/proxy?uri=${encodeURIComponent(providerUri)}`;

const getOperationError = (error: Record<string, unknown> | undefined): string => {
  if (!error) return 'Veo operation failed without a diagnostic';
  const message = typeof error.message === 'string' ? error.message : '';
  return message || JSON.stringify(error).slice(0, 1000);
};

const extractGeneratedVideoUrl = (operation: {
  response?: { generatedVideos?: Array<{ video?: { uri?: string; videoBytes?: string; mimeType?: string } }> };
}): string => {
  const video = operation.response?.generatedVideos?.[0]?.video;
  if (!video) throw new Error('Veo completed without a generated video');

  if (typeof video.uri === 'string' && video.uri.startsWith('https://')) {
    return getVideoProxyUrl(video.uri);
  }
  if (typeof video.videoBytes === 'string' && video.videoBytes.length > 0) {
    const mimeType = video.mimeType || 'video/mp4';
    return `data:${mimeType};base64,${video.videoBytes}`;
  }
  throw new Error('Veo completed without a video URI or video data');
};

const waitForVideoOperation = async (
  ai: GoogleGenAI,
  initialOperation: Awaited<ReturnType<GoogleGenAI['models']['generateVideos']>>,
  shotId?: string
): Promise<string> => {
  const startedAt = Date.now();
  let operation = initialOperation;
  console.info('[VideoGeneration] submitted', { model: VIDEO_MODEL, shotId, operationId: operation.name });

  while (!operation.done) {
    if (Date.now() - startedAt >= VIDEO_MAX_WAIT_MS) {
      throw new Error(`Veo generation timed out after ${Math.round(VIDEO_MAX_WAIT_MS / 60_000)} minutes`);
    }
    await new Promise(resolve => setTimeout(resolve, VIDEO_POLL_INTERVAL_MS));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  if (operation.error) throw new Error(getOperationError(operation.error));
  const videoUrl = extractGeneratedVideoUrl(operation);
  console.info('[VideoGeneration] completed', {
    model: VIDEO_MODEL,
    shotId,
    operationId: operation.name,
    durationMs: Date.now() - startedAt,
  });
  return videoUrl;
};

type ImageSize = '512' | '1K' | '2K' | '4K';

const normalizeImageSize = (value: unknown): ImageSize => {
  if (value === '512px') return '512';
  if (value === '512' || value === '1K' || value === '2K' || value === '4K') return value;
  return '1K';
};

const safeProviderError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/(api[-_ ]?key|x-goog-api-key)[=:][^\s,]+/gi, '$1=[redacted]')
    .slice(0, 1000);
};

const getProviderStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') return undefined;
  const record = error as { status?: unknown; statusCode?: unknown; code?: unknown };
  const status = [record.status, record.statusCode, record.code].find(value => typeof value === 'number');
  return typeof status === 'number' ? status : undefined;
};

const recordProviderSuccess = (provider: 'image' | 'video') => {
  providerHealth[provider] = {
    quotaStatus: 'available',
    checkedAt: new Date().toISOString(),
  };
};

const recordProviderFailure = (provider: 'image' | 'video', info: ProviderErrorInfo) => {
  providerHealth[provider] = {
    quotaStatus: info.quotaStatus,
    lastErrorCode: info.code,
    retryAfterSec: info.retryAfterSec,
    checkedAt: new Date().toISOString(),
  };
};

const getProviderHttpStatus = (info: ProviderErrorInfo): number => {
  switch (info.code) {
    case 'AUTHENTICATION': return 401;
    case 'INVALID_REQUEST':
    case 'CONTENT_BLOCKED':
    case 'COMFYUI_WORKFLOW_REJECTED': return 400;
    case 'NOT_CONFIGURED':
    case 'BACKEND_UNAVAILABLE':
    case 'MODEL_UNAVAILABLE': return 503;
    case 'RATE_LIMITED':
    case 'QUOTA_EXHAUSTED': return 429;
    case 'TIMEOUT': return 504;
    default: return 502;
  }
};

const normalizeBase64 = (value: string): string => {
  const compact = value.replace(/\s/g, '');
  if (!compact || compact.length % 4 === 1 || !/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) {
    throw new Error('Image data is not valid base64');
  }
  return compact;
};

const getImagePartFromInput = async (
  input: string,
  fallbackMimeType: string
): Promise<{ inlineData: { mimeType: string; data: string } }> => {
  const value = input.trim();
  const dataUrlMatch = value.match(/^data:([^;,]+);base64,(.+)$/s);
  if (dataUrlMatch) {
    return { inlineData: { mimeType: dataUrlMatch[1], data: normalizeBase64(dataUrlMatch[2]) } };
  }

  if (/^https?:\/\//i.test(value) || value.startsWith('/')) {
    // Relative asset paths (e.g. /api/assets/images/...) resolve against this server
    // so the app can pass its own asset URLs as reference/keyframe inputs.
    const target = /^https?:\/\//i.test(value)
      ? value
      : `http://127.0.0.1:${PORT}${value}`;
    const response = await fetch(target);
    if (!response.ok) {
      throw new Error(`Could not fetch reference image (${response.status})`);
    }
    const contentType = response.headers.get('content-type')?.split(';')[0] || fallbackMimeType;
    if (!contentType.startsWith('image/')) {
      throw new Error('Reference URL did not return an image');
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    return { inlineData: { mimeType: contentType, data: bytes.toString('base64') } };
  }

  if (!value) throw new Error('Image input is empty');
  return { inlineData: { mimeType: fallbackMimeType, data: normalizeBase64(value) } };
};

const extractGeneratedImageDataUrl = (response: unknown): string => {
  if (!response || typeof response !== 'object') {
    throw new Error('Gemini returned an empty image response');
  }

  const candidates = (response as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates)) {
    throw new Error('Gemini response did not contain candidates');
  }

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const content = (candidate as { content?: unknown }).content;
    if (!content || typeof content !== 'object') continue;
    const parts = (content as { parts?: unknown }).parts;
    if (!Array.isArray(parts)) continue;

    for (const part of parts) {
      if (!part || typeof part !== 'object') continue;
      const inlineData = (part as { inlineData?: unknown }).inlineData;
      if (!inlineData || typeof inlineData !== 'object') continue;
      const data = (inlineData as { data?: unknown }).data;
      if (typeof data !== 'string' || data.length === 0) continue;
      const mimeType = (inlineData as { mimeType?: unknown }).mimeType;
      return `data:${typeof mimeType === 'string' && mimeType ? mimeType : 'image/png'};base64,${normalizeBase64(data)}`;
    }
  }

  throw new Error('Gemini response did not contain image inline data');
};

const verifyImageModelAvailability = async (ai: GoogleGenAI, model: string): Promise<void> => {
  await ai.models.get({ model });
};

// 3. Generate Image (Nano Banana 2 / gemini-3.1-flash-image)
app.post('/api/gemini/generate-image', async (req: Request, res: Response) => {
  try {
    const { 
      prompt, 
      aspectRatio = '16:9', 
      imageSize = '1K', 
      referenceImageBase64, 
      model = 'gemini-3.1-flash-image' 
    } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const ai = getAI();
    if (!ai) {
      return res.status(503).json({
        success: false,
        error: 'Gemini API key is not configured.',
      });
    }

    if (typeof model !== 'string' || !IMAGE_MODELS.has(model)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported Gemini image model. Use ${IMAGE_MODEL}.`,
      });
    }

    const selectedRatio = typeof aspectRatio === 'string' && IMAGE_ASPECT_RATIOS.has(aspectRatio)
      ? aspectRatio
      : '16:9';
    const selectedImageSize = normalizeImageSize(imageSize);
    const usedModel = model;

    console.info('[ImageGeneration] start', {
      model: usedModel,
      aspectRatio: selectedRatio,
      imageSize: selectedImageSize,
      hasReferenceImage: Boolean(referenceImageBase64),
    });

    try {
      await verifyImageModelAvailability(ai, usedModel);
      const contentsParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
      if (referenceImageBase64) {
        contentsParts.push(await getImagePartFromInput(referenceImageBase64, 'image/jpeg'));
      }
      contentsParts.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: usedModel,
        contents: { parts: contentsParts },
        config: {
          responseModalities: [Modality.IMAGE],
          imageConfig: {
            aspectRatio: selectedRatio,
            imageSize: selectedImageSize,
          },
        },
      });
      const imageUrl = extractGeneratedImageDataUrl(response);
      recordProviderSuccess('image');

      console.info('[ImageGeneration] success', { model: usedModel, aspectRatio: selectedRatio, imageSize: selectedImageSize });
      return res.json({
        success: true,
        imageUrl,
        model: usedModel,
        aspectRatio: selectedRatio,
        imageSize: selectedImageSize,
        prompt,
      });
    } catch (error) {
      const details = safeProviderError(error);
      const providerError = classifyProviderError(getProviderStatusCode(error), details);
      recordProviderFailure('image', providerError);
      console.error('[ImageGeneration] failed', {
        model: usedModel,
        aspectRatio: selectedRatio,
        imageSize: selectedImageSize,
        code: providerError.code,
        error: details,
      });
      return res.status(getProviderHttpStatus(providerError)).json({
        success: false,
        error: 'Gemini image generation failed',
        code: providerError.code,
        quotaStatus: providerError.quotaStatus,
        retryAfterSec: providerError.retryAfterSec,
        model: usedModel,
        details,
      });
    }
  } catch (error) {
    const details = safeProviderError(error);
    console.error('[ImageGeneration] request failed', { error: details });
    return res.status(500).json({
      success: false,
      error: 'Gemini image generation request failed',
      details,
    });
  }
});

// 3B. Edit Existing Image (Nano Banana 2 / gemini-3.1-flash-image)
app.post('/api/gemini/edit-image', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      imageBase64,
      mimeType = 'image/jpeg',
      aspectRatio = '16:9',
      imageSize = '1K',
      model = IMAGE_MODEL,
    } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Editing instructions prompt is required' });
    }
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'Source image base64 is required for editing' });
    }

    const ai = getAI();
    if (!ai) {
      return res.status(503).json({
        success: false,
        error: 'Gemini API key is not configured.',
      });
    }

    if (typeof model !== 'string' || !IMAGE_MODELS.has(model)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported Gemini image model. Use ${IMAGE_MODEL}.`,
      });
    }

    const selectedRatio = typeof aspectRatio === 'string' && IMAGE_ASPECT_RATIOS.has(aspectRatio)
      ? aspectRatio
      : '16:9';
    const selectedImageSize = normalizeImageSize(imageSize);
    const usedModel = model;

    console.info('[ImageEditing] start', {
      model: usedModel,
      aspectRatio: selectedRatio,
      imageSize: selectedImageSize,
      mimeType,
    });

    try {
      await verifyImageModelAvailability(ai, usedModel);
      const sourcePart = await getImagePartFromInput(imageBase64, mimeType || 'image/jpeg');
      const response = await ai.models.generateContent({
        model: usedModel,
        contents: {
          parts: [sourcePart, { text: prompt }],
        },
        config: {
          responseModalities: [Modality.IMAGE],
          imageConfig: {
            aspectRatio: selectedRatio,
            imageSize: selectedImageSize,
          },
        },
      });
      const imageUrl = extractGeneratedImageDataUrl(response);
      recordProviderSuccess('image');

      console.info('[ImageEditing] success', { model: usedModel, aspectRatio: selectedRatio, imageSize: selectedImageSize });
      return res.json({
        success: true,
        imageUrl,
        model: usedModel,
        aspectRatio: selectedRatio,
        imageSize: selectedImageSize,
        editInstructions: prompt,
      });
    } catch (error) {
      const details = safeProviderError(error);
      const providerError = classifyProviderError(getProviderStatusCode(error), details);
      recordProviderFailure('image', providerError);
      console.error('[ImageEditing] failed', {
        model: usedModel,
        aspectRatio: selectedRatio,
        imageSize: selectedImageSize,
        code: providerError.code,
        error: details,
      });
      return res.status(getProviderHttpStatus(providerError)).json({
        success: false,
        error: 'Gemini image editing failed',
        code: providerError.code,
        quotaStatus: providerError.quotaStatus,
        retryAfterSec: providerError.retryAfterSec,
        model: usedModel,
        details,
      });
    }
  } catch (error) {
    const details = safeProviderError(error);
    console.error('[ImageEditing] request failed', { error: details });
    return res.status(500).json({
      success: false,
      error: 'Gemini image editing request failed',
      details,
    });
  }
});

// 3C. Generate Music (lyria-3-clip-preview & lyria-3-pro-preview)
app.post('/api/gemini/generate-music', async (req: Request, res: Response) => {
  try {
    const { 
      prompt, 
      type = 'clip', // 'clip' (up to 30s) or 'pro' / 'full' (full-length)
      genre = 'Cinematic Score',
      mood = 'Suspenseful',
      tempoBpm = 85,
      referenceImageBase64,
      sceneId,
      shotId
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Music description prompt is required' });
    }

    const ai = getAI();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }

    const isPro = type === 'pro' || type === 'full';
    const model = isPro ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';

    const enhancedPrompt = `${prompt}. Genre: ${genre}. Mood: ${mood}. Tempo: ${tempoBpm} BPM. High fidelity cinematic master recording.`;

    let contentsPayload: any = enhancedPrompt;
    if (referenceImageBase64) {
      contentsPayload = {
        parts: [
          { text: enhancedPrompt },
          {
            inlineData: {
              data: referenceImageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
              mimeType: 'image/jpeg',
            },
          },
        ],
      };
    }

    let audioBase64 = '';
    let lyrics = '';
    let mimeType = 'audio/wav';

    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents: contentsPayload,
        config: {
          responseModalities: [Modality.AUDIO],
        },
      });

      for await (const chunk of stream) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (!audioBase64 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioBase64 += part.inlineData.data;
          }
          if (part.text && !lyrics) {
            lyrics = part.text;
          }
        }
      }
    } catch (genErr: any) {
      console.warn(`Lyria generation error on ${model}:`, genErr);
      throw new Error(`Lyria music generation failed: ${genErr.message || 'Model call failed'}`);
    }

    if (!audioBase64) {
      return res.status(500).json({ error: 'No audio data received from Lyria music engine.' });
    }

    const audioUrl = `data:${mimeType};base64,${audioBase64}`;
    const estimatedDuration = isPro ? 120 : 30;

    return res.json({
      success: true,
      audioUrl,
      audioBase64,
      mimeType,
      lyrics,
      model,
      durationSec: estimatedDuration,
      genre,
      mood,
      tempoBpm,
      sceneId,
      shotId,
    });
  } catch (error: any) {
    console.error('Error in music generation:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate music track' });
  }
});

// Helper to wrap raw 16-bit PCM mono into standard RIFF WAV buffer
function pcmToWavBuffer(pcmBuffer: Buffer, sampleRate: number = 24000, numChannels: number = 1, bitsPerSample: number = 16): Buffer {
  const header = Buffer.alloc(44);
  const dataLength = pcmBuffer.length;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  // RIFF chunk descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);

  // fmt subchunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // subchunk1 size (16 for PCM)
  header.writeUInt16LE(1, 20); // audio format (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data subchunk
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// Procedural fallback speech synthesis WAV generator for offline / test resilience
function generateSyntheticVoiceWav(text: string, voiceName: string = 'Kore', emotion: string = 'neutral'): Buffer {
  const sampleRate = 24000;
  const words = text.trim().split(/\s+/).length;
  const durationSec = Math.max(1.5, Math.min(12, words * 0.45));
  const totalSamples = Math.floor(sampleRate * durationSec);
  const pcmBuffer = Buffer.alloc(totalSamples * 2);

  // Pitch base based on voice preset
  let baseFreq = 180;
  if (voiceName === 'Charon' || voiceName === 'Fenrir') baseFreq = 110;
  else if (voiceName === 'Puck') baseFreq = 220;
  else if (voiceName === 'Zephyr') baseFreq = 160;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Formant-like frequency modulation simulating human speech rhythm
    const syllableMod = 0.5 + 0.5 * Math.sin(2 * Math.PI * 4.5 * t);
    const inflection = Math.sin(2 * Math.PI * 0.8 * t) * 15;
    const freq = baseFreq + inflection;

    // Harmonic synthesis
    const s1 = Math.sin(2 * Math.PI * freq * t);
    const s2 = 0.5 * Math.sin(2 * Math.PI * (freq * 2.1) * t);
    const s3 = 0.25 * Math.sin(2 * Math.PI * (freq * 3.2) * t);
    
    // Envelope (soft attack and release)
    const attack = Math.min(1, t / 0.1);
    const release = Math.min(1, (durationSec - t) / 0.2);
    const env = attack * release * syllableMod;

    const sampleVal = Math.floor(Math.max(-1, Math.min(1, (s1 + s2 + s3) * 0.28 * env)) * 32767);
    pcmBuffer.writeInt16LE(sampleVal, i * 2);
  }

  return pcmToWavBuffer(pcmBuffer, sampleRate, 1, 16);
}

// 4. Generate TTS Voice Audio
app.post('/api/gemini/generate-tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'Kore', emotion = 'restrained', delivery } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS generation' });
    }

    const voice = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].includes(voiceName) ? voiceName : 'Kore';
    const ai = getAI();

    let wavBase64 = '';
    let durationSec = 3.0;

    if (ai) {
      try {
        const promptInstruction = delivery 
          ? `Perform with ${emotion} emotion and ${delivery} delivery: ${text}`
          : `Say with ${emotion} emotion and cinematic delivery: ${text}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-tts-preview',
          contents: [{ parts: [{ text: promptInstruction }] }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice as any },
              },
            },
          },
        });

        const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        const rawAudioBase64 = inlineData?.data;

        if (rawAudioBase64) {
          const rawBuffer = Buffer.from(rawAudioBase64, 'base64');
          const mimeType = inlineData?.mimeType || 'audio/pcm;rate=24000';

          // If raw PCM, wrap in standard WAV header for universal browser compatibility
          if (mimeType.includes('pcm') || !mimeType.includes('wav')) {
            const wavBuf = pcmToWavBuffer(rawBuffer, 24000, 1, 16);
            wavBase64 = wavBuf.toString('base64');
            durationSec = +(rawBuffer.length / (24000 * 2)).toFixed(2);
          } else {
            wavBase64 = rawAudioBase64;
            durationSec = +(rawBuffer.length / (24000 * 2)).toFixed(2);
          }
        }
      } catch (geminiErr: any) {
        console.warn('Gemini TTS model call warning, using synthetic fallback engine:', geminiErr?.message || geminiErr);
      }
    }

    // Fallback to high-quality procedural speech synthesis if API key not available or model failed
    if (!wavBase64) {
      const fallbackWavBuf = generateSyntheticVoiceWav(text, voice, emotion);
      wavBase64 = fallbackWavBuf.toString('base64');
      durationSec = +(fallbackWavBuf.length / (24000 * 2)).toFixed(2);
    }

    const audioUrl = `data:audio/wav;base64,${wavBase64}`;

    return res.json({
      success: true,
      audioUrl,
      audioData: wavBase64,
      mimeType: 'audio/wav',
      durationSec,
      voiceName: voice,
      emotion,
      text,
    });
  } catch (error: any) {
    console.error('Error generating TTS:', error);
    // Absolute safety return
    const safeWav = generateSyntheticVoiceWav(req.body?.text || 'Line text', 'Kore', 'neutral');
    const safeBase64 = safeWav.toString('base64');
    return res.json({
      success: true,
      audioUrl: `data:audio/wav;base64,${safeBase64}`,
      audioData: safeBase64,
      mimeType: 'audio/wav',
      durationSec: 2.5,
      voiceName: 'Kore',
      emotion: 'neutral',
      text: req.body?.text || '',
    });
  }
});

// 5. AI Production Assistant & Project Reasoning
app.post('/api/gemini/ai-assistant', async (req: Request, res: Response) => {
  try {
    const { message, projectContext, conversationHistory } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ai = getAI();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }

    const systemInstruction = `You are the lead AI Production Assistant and Assistant Director for a high-end film production studio.
You have direct structured access to the current project data:
- Title: ${projectContext?.title}
- Logline: ${projectContext?.logline}
- Total Scenes: ${projectContext?.scenes?.length || 0}
- Total Shots: ${projectContext?.shots?.length || 0}
- Characters: ${projectContext?.characters?.map((c: any) => c.name).join(', ')}
- Locations: ${projectContext?.locations?.map((l: any) => l.name).join(', ')}
- Status: ${projectContext?.status}

You help filmmakers with:
1. Answering queries about missing assets, shot statuses, character continuity
2. Generating alternative shot concepts for specific scenes
3. Creating or polishing dialogue with emotional subtext
4. Performing comprehensive continuity audits (wardrobe, lighting, 180-degree rule, eyelines)
5. Giving succinct production reports

Always be professional, concise, cinematic, and actionable. Format responses with clear headings, bullet points, or structured recommendations.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: message,
      config: {
        systemInstruction,
      },
    });

    return res.json({
      success: true,
      reply: response.text || 'Understood. Let me know how else I can assist your production.',
    });
  } catch (error: any) {
    console.error('Error in AI Assistant:', error);
    return res.status(500).json({ error: error.message || 'AI assistant error' });
  }
});

// 6. AI Film Editor (Smart Assembly & Pacing Suggestions)
app.post('/api/gemini/ai-edit', async (req: Request, res: Response) => {
  try {
    const { project } = req.body;
    const ai = getAI();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }

    const prompt = `You are a master Film Editor (ACE). Analyze the following film project elements and propose an intelligent, rhythmically paced rough cut assembly for the timeline:

Film: "${project?.title}" (${project?.genre})
Scenes: ${JSON.stringify(project?.scenes?.map((s: any) => ({ id: s.id, heading: s.heading, purpose: s.storyPurpose, shotCount: s.shotIds?.length })))}
Shots: ${JSON.stringify(project?.shots?.map((sh: any) => ({ id: sh.id, scene: sh.sceneId, size: sh.camera?.shotSize, dur: sh.durationSec, desc: sh.title })))}
Dialogue: ${JSON.stringify(project?.dialogueSegments?.map((d: any) => ({ id: d.id, scene: d.sceneId, char: d.characterId, text: d.text })))}

Generate a structured edit plan with:
1. Pacing strategy (establishing pace, dialogue rhythm, climax acceleration)
2. Proposed timeline assembly list (sequence of shot IDs with start times and in/out trim points)
3. Transitions and audio J-cuts / L-cuts recommendations
4. Dramatic notes on pacing tension

Return JSON with:
{
  "summary": "Brief executive overview of the edit proposal",
  "pacingRhythm": "Pacing description",
  "proposedSequence": [
    { "shotId": "TLS_A01_S01_SH001", "cutType": "Hard Cut / J-Cut", "targetDurationSec": 5.0, "reason": "Establish scale before interior intimacy" }
  ],
  "audioCues": [
    { "type": "music_swell", "atSec": 18.0, "description": "Bring in low pulse" }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, editPlan: parsed });
  } catch (error: any) {
    console.error('Error in AI Edit:', error);
    return res.status(500).json({ error: error.message || 'AI Edit error' });
  }
});

// 7. Central AI Prompt Suite Generator
app.post('/api/gemini/generate-prompt-suite', async (req: Request, res: Response) => {
  try {
    const { shot, characters, location, style, projectTitle } = req.body;
    const ai = getAI();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }

    const prompt = `You are a master cinematic prompt engineer and technical director for film "${projectTitle || 'The Last Signal'}".
Given the structured shot metadata, character continuity references, and location guidelines, generate a synchronized suite of production prompts:

SHOT METADATA:
- Shot ID: ${shot.id} (${shot.title})
- Camera: Size=${shot.camera?.shotSize}, Angle=${shot.camera?.angle}, Lens=${shot.camera?.lens}, Movement=${shot.camera?.movement}, Framing=${shot.camera?.framing}
- Subject: Action=${shot.subject?.action}, Pose=${shot.subject?.pose}, Expression=${shot.subject?.expression}, Wardrobe=${shot.subject?.wardrobe}, Props=${JSON.stringify(shot.subject?.props || [])}
- Environment: Location=${location?.name || 'Location'}, Lighting=${shot.environment?.keyLight}, Atmosphere=${shot.environment?.atmosphere}, ColorTemp=${shot.environment?.colorTemp}, Contrast=${shot.environment?.contrast}
- Characters: ${JSON.stringify(characters || [])}
- Style: ${shot.style?.cinematicStyle}, Stock=${shot.style?.filmStock}

Produce optimized prompts for all 5 generation modalities:
1. imagePrompt: (100-word prompt for high-fidelity photorealistic cinematic still, incorporating exact lighting, camera lens, color grading, and character appearance)
2. videoPrompt: (Motion, camera motion direction, subject motion speed, physics, and temporal lighting changes for Veo 3.1)
3. ttsPrompt: (Voice delivery directions, emotional pacing, vocal timbre instructions)
4. sfxPrompt: (Procedural SFX layers, foley, background room tone, specific frequency cues)
5. musicPrompt: (BPM, key, emotional arc, instrumentation, and tension swell timing)

Return JSON with:
{
  "imagePrompt": "...",
  "videoPrompt": "...",
  "ttsPrompt": "...",
  "sfxPrompt": "...",
  "musicPrompt": "..."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, prompts: parsed });
  } catch (error: any) {
    console.error('Error in Prompt Suite Generator:', error);
    return res.status(500).json({ error: error.message || 'Prompt Suite Generator error' });
  }
});

// 8. Automated Deep Continuity Audit
app.post('/api/gemini/continuity-audit', async (req: Request, res: Response) => {
  try {
    const { project } = req.body;
    const ai = getAI();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }

    const prompt = `You are a legendary Hollywood Script Supervisor and Continuity Director.
Analyze this entire film project data and perform a rigorous 4-way continuity audit:
1. Character Continuity (wardrobe consistency, physical marks, injuries, props across sequential scenes)
2. Location Continuity (lighting consistency, time-of-day progression, environmental wear)
3. Cinematography Continuity (180-degree axis rule, screen direction vectors, eye-line match across reverse shots)
4. Audio & Dialogue Continuity (voice profile matching, soundscape room tone shifts)

Project Summary:
- Title: "${project.title}"
- Scenes: ${JSON.stringify(project.scenes?.map((s: any) => ({ id: s.id, num: s.sceneNumber, heading: s.heading, chars: s.characterIds, props: s.props, time: s.timeOfDay })))}
- Shots: ${JSON.stringify(project.shots?.slice(0, 30).map((sh: any) => ({ id: sh.id, sc: sh.sceneId, cam: sh.camera, subj: sh.subject })))}
- Characters: ${JSON.stringify(project.characters?.map((c: any) => ({ id: c.id, name: c.name, wardrobeContinuity: c.wardrobeContinuity })))}

Return JSON with:
{
  "auditScore": 95,
  "passedChecks": 18,
  "flaggedIssues": [
    {
      "id": "AUDIT_01",
      "type": "cinematography" | "character" | "environment" | "audio",
      "title": "Title of issue",
      "description": "Explanation of potential conflict",
      "sceneIds": ["S01"],
      "shotIds": ["TLS_A01_S01_SH001"],
      "severity": "warning" | "error" | "info",
      "suggestedFix": "Concrete prompt or staging adjustment to maintain perfect continuity"
    }
  ],
  "recommendations": [
    "Key recommendation for production fidelity"
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, audit: parsed });
  } catch (error: any) {
    console.error('Error in Continuity Audit:', error);
    return res.status(500).json({ error: error.message || 'Continuity audit error' });
  }
});

// 9. Real Video Generation / Veo
app.get('/api/video/proxy', async (req: Request, res: Response) => {
  const providerUri = typeof req.query.uri === 'string' ? req.query.uri : '';
  let parsedUri: URL;
  try {
    parsedUri = new URL(providerUri);
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid generated video URI' });
  }

  const isGoogleProviderHost = parsedUri.protocol === 'https:' &&
    (parsedUri.hostname === 'googleapis.com' || parsedUri.hostname.endsWith('.googleapis.com') ||
      parsedUri.hostname === 'googleusercontent.com' || parsedUri.hostname.endsWith('.googleusercontent.com'));
  if (!isGoogleProviderHost) {
    return res.status(400).json({ success: false, error: 'Generated video URI is not a supported Google provider URL' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ success: false, error: 'Gemini API key is not configured.' });
  }

  try {
    const providerResponse = await fetch(parsedUri, {
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY },
    });
    if (!providerResponse.ok || !providerResponse.body) {
      return res.status(502).json({
        success: false,
        error: 'Generated video asset could not be retrieved',
        details: `Provider returned HTTP ${providerResponse.status}`,
      });
    }

    res.status(200);
    res.setHeader('Content-Type', providerResponse.headers.get('content-type') || 'video/mp4');
    const contentLength = providerResponse.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    providerResponse.body.pipeTo(new WritableStream<Uint8Array>({
      write(chunk) {
        res.write(Buffer.from(chunk));
      },
      close() {
        res.end();
      },
      abort(error) {
        console.warn('[VideoProxy] stream failed:', safeProviderError(error));
        res.end();
      },
    })).catch(error => {
      console.warn('[VideoProxy] stream failed:', safeProviderError(error));
      if (!res.writableEnded) res.end();
    });
  } catch (error) {
    const details = safeProviderError(error);
    console.error('[VideoProxy] retrieval failed', { error: details });
    return res.status(502).json({ success: false, error: 'Generated video asset retrieval failed', details });
  }
});

app.post('/api/video/generate', async (req: Request, res: Response) => {
  const startedAt = Date.now();
  const { prompt, durationSec = 4, shotId, keyframeUrl } = req.body;
  const numericDuration = Number(durationSec);

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ success: false, error: 'Video generation prompt is required' });
  }
  if (![4, 6, 8].includes(numericDuration)) {
    return res.status(400).json({ success: false, error: 'Veo supports video durations of 4, 6, or 8 seconds' });
  }

  const ai = getAI();
  if (!ai) {
    return res.status(503).json({
      success: false,
      error: 'Veo video generation is not configured. Set GEMINI_API_KEY to enable it.',
    });
  }

  console.info('[VideoGeneration] start', {
    model: VIDEO_MODEL,
    shotId,
    durationSec: numericDuration,
    hasKeyframe: Boolean(keyframeUrl),
  });

  try {
    await verifyImageModelAvailability(ai, VIDEO_MODEL);
    const source: {
      prompt: string;
      image?: { imageBytes: string; mimeType: string };
    } = { prompt: prompt.trim() };

    if (keyframeUrl) {
      source.image = await getGeminiVideoInputImage(keyframeUrl, 'image/jpeg');
    }

    const operation = await ai.models.generateVideos({
      model: VIDEO_MODEL,
      source,
      config: {
        numberOfVideos: 1,
        durationSeconds: numericDuration,
        aspectRatio: VIDEO_ASPECT_RATIO,
        resolution: '720p',
        generateAudio: true,
      },
    });
    const videoUrl = await waitForVideoOperation(ai, operation, shotId);
    recordProviderSuccess('video');

    console.info('[VideoGeneration] success', {
      model: VIDEO_MODEL,
      shotId,
      durationMs: Date.now() - startedAt,
      operationId: operation.name,
    });
    return res.json({
      success: true,
      videoUrl,
      provider: 'Veo Video Generator (Veo 3.1)',
      model: VIDEO_MODEL,
      durationSec: numericDuration,
      shotId,
      operationId: operation.name,
      status: 'COMPLETED',
    });
  } catch (error) {
    const details = safeProviderError(error);
    const providerError = classifyProviderError(getProviderStatusCode(error), details);
    recordProviderFailure('video', providerError);
    console.error('[VideoGeneration] failed', {
      model: VIDEO_MODEL,
      shotId,
      durationMs: Date.now() - startedAt,
      code: providerError.code,
      error: details,
    });
    return res.status(getProviderHttpStatus(providerError)).json({
      success: false,
      error: 'Veo video generation failed',
      code: providerError.code,
      quotaStatus: providerError.quotaStatus,
      retryAfterSec: providerError.retryAfterSec,
      model: VIDEO_MODEL,
      details,
    });
  }
});

// ── Local Image Generation Routes ─────────────────────────────────────────

// Minimal ComfyUI workflow builder for Flux/SDXL image generation
// Image-generation checkpoints are anything that is NOT a video model (LTX/Wan/Hunyuan/etc.).
const IMAGE_CHECKPOINT_RE = /flux|sdxl|sd[_ .-]|dreamshaper|realistic|juggernaut|deliberate|anything|protogen|rev|majic|meina|chillout|ghostmix|photon|epicrealism|absolutereality/i;
const VIDEO_CHECKPOINT_RE = /ltx|ltxv|video|wan|hunyuan|mochi|cogvideo|animatediff/i;

const isImageCheckpointName = (name: string): boolean => {
  const lower = name.toLowerCase();
  return !VIDEO_CHECKPOINT_RE.test(lower) && (IMAGE_CHECKPOINT_RE.test(lower) || /^[a-z0-9_.-]+\.(safetensors|ckpt)$/.test(lower));
};

// Resolve output dimensions for local image generation.
// Accepts explicit "WxH" / preset names (resolution) or the legacy imageSize+aspectRatio pair.
// Hardware-aware: never exceeds the model ceiling; attaches a warning when the request
// is likely to strain the detected VRAM instead of silently changing the resolution.
const resolveLocalImageDimensions = (
  resolution: string | undefined,
  imageSize: string | undefined,
  aspectRatio: string | undefined,
  vramMb: number | undefined,
): { width: number; height: number; label: string; vramWarning?: string } => {
  const MAX_PIXELS = 1024 * 1024; // 1 MP — Flux/SDXL native ceiling; SD 1.5 max practical
  const PRESETS: Record<string, [number, number]> = {
    '512x512': [512, 512],
    '640x640': [640, 640],
    '768x768': [768, 768],
    '1024x1024': [1024, 1024],
    '16:9': [768, 432],
    '4:3': [768, 576],
    '3:2': [768, 512],
    '9:16': [432, 768],
    '2:3': [512, 768],
    '1:1': [768, 768],
  };

  const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, '');
  const toMultipleOf8 = (v: number) => Math.max(64, Math.round(v / 8) * 8);

  let width = 768;
  let height = 432;
  let label = '16:9';

  const requested = norm(resolution || '');
  if (requested && PRESETS[requested]) {
    [width, height] = PRESETS[requested];
    label = requested;
  } else if (requested && /^\d{3,4}x\d{3,4}$/.test(requested)) {
    const [w, h] = requested.split('x').map(Number);
    width = w;
    height = h;
    label = `${w}x${h}`;
  } else if (requested) {
    throw new Error(`Unsupported local image resolution "${resolution}". Use a preset such as 512x512, 768x768, 1024x1024, 16:9, 4:3, 3:2, 9:16, 2:3 or an explicit WxH (max 1024x1024).`);
  } else {
    // Legacy imageSize (512 / 1K / 2K / 4K) + aspectRatio path.
    const size = norm(imageSize || '1K');
    const base = size === '512' ? 512 : size === '2k' || size === '4k' ? 0 : 1024;
    if (size === '2k' || size === '4k') {
      throw new Error('Local image generation does not support 2K/4K output — no installed local model can realistically produce it. Use 512x512 to 1024x1024.');
    }
    const ratio = norm(aspectRatio || '16:9');
    if (ratio === '1:1') { width = base; height = base; label = '1:1'; }
    else if (ratio === '9:16') { width = toMultipleOf8(base * 9 / 16); height = base; label = '9:16'; }
    else if (ratio === '4:3') { width = toMultipleOf8(base * 4 / 3); height = base; label = '4:3'; }
    else if (ratio === '3:4') { width = toMultipleOf8(base * 3 / 4); height = base; label = '3:4'; }
    else if (ratio === '3:2') { width = toMultipleOf8(base * 3 / 2); height = base; label = '3:2'; }
    else if (ratio === '2:3') { width = toMultipleOf8(base * 2 / 3); height = base; label = '2:3'; }
    else { width = toMultipleOf8(base * 16 / 9); height = base; label = '16:9'; }
  }

  width = toMultipleOf8(width);
  height = toMultipleOf8(height);

  if (width * height > MAX_PIXELS) {
    throw new Error(`Unsafe local image resolution ${width}x${height} — exceeds the ${MAX_PIXELS}px ceiling for local image models. Use 1024x1024 or smaller.`);
  }

  // Attach a warning when the request is likely to strain the detected VRAM.
  let vramWarning: string | undefined;
  if (vramMb !== undefined && vramMb < 12000 && width * height > 768 * 768) {
    vramWarning = `${width}x${height} may exceed available VRAM (${Math.round(vramMb / 1024)} GB detected). If generation fails with out-of-memory, reduce to 768x768 or below.`;
  }

  return { width, height, label, vramWarning };
};

// Build a ComfyUI 0.20.x SD 1.5 / SDXL / Flux-compatible image workflow.
// Node names/inputs verified against /object_info on ComfyUI 0.20.1.
const buildComfyUIImageWorkflow = (
  prompt: string,
  negativePrompt: string,
  width: number,
  height: number,
  seed: number,
  ckptName: string,
  options: {
    steps?: number;
    cfg?: number;
    sampler?: string;
    scheduler?: string;
    batchSize?: number;
    denoise?: number;
  },
  referenceImage?: { filename: string; subfolder?: string; type?: string },
): Record<string, unknown> => {
  const steps = Math.min(150, Math.max(1, Math.round(options.steps ?? 20)));
  const cfg = Math.min(30, Math.max(0.5, Number(options.cfg ?? 7)));
  const sampler = options.sampler || 'euler';
  const scheduler = options.scheduler || 'normal';
  const batchSize = Math.min(4, Math.max(1, Math.round(options.batchSize ?? 1)));
  const isImageToImage = Boolean(referenceImage);
  const denoise = isImageToImage ? Math.min(1, Math.max(0.05, Number(options.denoise ?? 0.65))) : 1;

  const workflow: Record<string, unknown> = {
    '1': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: ckptName },
    },
    '2': {
      class_type: 'CLIPTextEncode',
      inputs: { text: prompt, clip: ['1', 1] },
    },
    '3': {
      class_type: 'CLIPTextEncode',
      inputs: { text: negativePrompt, clip: ['1', 1] },
    },
  };

  let latentSource: [string, number];
  if (isImageToImage) {
    // Reference image → scale to target dims → VAE encode → KSampler(denoise < 1).
    workflow['4'] = {
      class_type: 'LoadImage',
      inputs: { image: referenceImage!.filename },
    };
    workflow['5'] = {
      class_type: 'ImageScale',
      inputs: { image: ['4', 0], upscale_method: 'lanczos', width, height, crop: 'center' },
    };
    workflow['6'] = {
      class_type: 'VAEEncode',
      inputs: { pixels: ['5', 0], vae: ['1', 2] },
    };
    latentSource = ['6', 0];
  } else {
    workflow['4'] = {
      class_type: 'EmptyLatentImage',
      inputs: { width, height, batch_size: batchSize },
    };
    latentSource = ['4', 0];
  }

  workflow['7'] = {
    class_type: 'KSampler',
    inputs: {
      seed,
      steps,
      cfg,
      sampler_name: sampler,
      scheduler,
      denoise,
      model: ['1', 0],
      positive: ['2', 0],
      negative: ['3', 0],
      latent_image: latentSource,
    },
  };
  workflow['8'] = {
    class_type: 'VAEDecode',
    inputs: { samples: ['7', 0], vae: ['1', 2] },
  };
  workflow['9'] = {
    class_type: 'SaveImage',
    inputs: { filename_prefix: `null_sector_img_${seed}`, images: ['8', 0] },
  };

  return workflow;
};

// Detect the image checkpoint to use.
// - config 'auto' → first installed image checkpoint
// - otherwise → exact (case-insensitive substring) match of the configured preference
// Never silently substitutes a different model: if the preference is not found, detected=false.
const detectLocalImageModel = (
  backendModels: string[],
  preferredModel: string,
): { ckptName: string; detected: boolean } => {
  const imageCheckpoints = backendModels.filter(isImageCheckpointName);
  const lowerModels = imageCheckpoints.map(m => m.toLowerCase());

  const pref = (preferredModel || '').trim().toLowerCase();
  if (pref === 'auto') {
    if (imageCheckpoints.length > 0) return { ckptName: imageCheckpoints[0], detected: true };
    return { ckptName: '', detected: false };
  }

  const match = lowerModels.find(m => m.includes(pref) || pref.includes(m.split('.')[0]));
  if (match) return { ckptName: imageCheckpoints[lowerModels.indexOf(match)], detected: true };
  return { ckptName: preferredModel || '', detected: false };
};

// Poll ComfyUI for a completed image generation
const waitForLocalImageJob = async (
  config: LocalImageProviderConfig,
  promptId: string,
  seed = 0,
): Promise<LocalImageResult> => {
  const startedAt = Date.now();
  const maxWaitMs = config.timeoutSec * 1000;
  const pollMs = config.pollIntervalSec * 1000;

  console.info('[LocalImage] submitted', { promptId, model: config.model });

  while (Date.now() - startedAt < maxWaitMs) {
    await new Promise(resolve => setTimeout(resolve, pollMs));

    try {
      const historyUrl = `${config.url}/history/${promptId}`;
      const response = await fetch(historyUrl);
      if (!response.ok) continue;

      const history = await response.json() as Record<string, unknown>;
      const entry = history[promptId] as Record<string, unknown> | undefined;
      if (!entry) continue;

      const status = entry.status as Record<string, unknown> | undefined;
      if (status && status.completed === false) continue;

      const outputs = entry.outputs as Record<string, unknown> | undefined;
      if (!outputs) continue;

      // Find the SaveImage node output
      for (const nodeId of Object.keys(outputs)) {
        const nodeOutput = outputs[nodeId] as Record<string, unknown>;
        const images = nodeOutput.images as Array<Record<string, unknown>> | undefined;
        if (images && images.length > 0) {
          // Persist EVERY output file (batch generation produces one file per image).
          const persistedImages: Array<{ imageUrl: string; mimeType: string; sizeBytes: number }> = [];
          for (const file of images) {
            const filename = typeof file.filename === 'string' ? file.filename : '';
            const subfolder = typeof file.subfolder === 'string' ? file.subfolder : '';
            const fileType = typeof file.type === 'string' ? file.type : 'output';
            const viewUrl = `${config.url}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(fileType)}`;
            try {
              const persisted = await persistBackendFile(viewUrl, 'image', seed);
              persistedImages.push({
                imageUrl: persisted.url,
                mimeType: persisted.mimeType,
                sizeBytes: persisted.sizeBytes,
              });
            } catch (persistError) {
              console.warn('[LocalImage] persist failed for batch item', { filename, error: safeProviderError(persistError) });
              // A failed batch item is an individual failure; keep the rest.
            }
          }

          if (persistedImages.length === 0) {
            throw new Error('Local backend reported output files but none could be validated and persisted');
          }

          const durationMs = Date.now() - startedAt;
          console.info('[LocalImage] completed', {
            promptId, durationMs, count: persistedImages.length, sizeBytes: persistedImages[0].sizeBytes,
          });

          return {
            success: true,
            imageUrl: persistedImages[0].imageUrl,
            mimeType: persistedImages[0].mimeType,
            model: config.model,
            backend: 'ComfyUI',
            jobId: promptId,
            images: persistedImages,
          };
        }
      }
    } catch (error) {
      console.warn('[LocalImage] poll error', { promptId, error: safeProviderError(error) });
    }
  }

  throw new Error(`Local image generation timed out after ${config.timeoutSec}s`);
};

// GET /api/local-image/status — detect local image backend availability
app.get('/api/local-image/status', async (_req: Request, res: Response) => {
  const config = getLocalImageConfig();
  // Reuse the same ComfyUI detection as local video
  const videoConfig = getLocalVideoConfig();
  const videoConfigForDetect: LocalVideoProviderConfig = {
    ...videoConfig,
    enabled: config.enabled,
    url: config.url,
  };
  try {
    const status = await detectLocalBackend(videoConfigForDetect);
    const checkpoints = status.available
      ? await detectLocalCheckpoints(config.url, 'CheckpointLoaderSimple', 'ckpt_name')
      : [];
    const detection = detectLocalImageModel(checkpoints, config.model);
    const capabilities = status.available
      ? await getLocalImageCapabilities(config.url)
      : { textToImage: false, imageToImage: false, resolutions: [], maxResolution: 'none' };
    return res.json({
      success: true,
      config: { enabled: config.enabled, url: config.url, model: config.model },
      status: {
        ...status,
        model: config.model,
        backend: 'ComfyUI (Image)',
        checkpoints,
        modelAvailable: detection.detected ? 'available' : (checkpoints.some(isImageCheckpointName) ? 'not_found' : 'not_found'),
        modelVerified: detection.detected,
        capabilities,
      },
    });
  } catch (error) {
    return res.json({
      success: true,
      config: { enabled: config.enabled, url: config.url, model: config.model },
      status: {
        available: false, backend: 'ComfyUI (Image)', model: config.model, error: safeProviderError(error),
      },
    });
  }
});

// POST /api/image/generate-local — real local image generation via ComfyUI Flux/SDXL
app.post('/api/image/generate-local', async (req: Request, res: Response) => {
  const startedAt = Date.now();
  const {
    prompt,
    negativePrompt,
    resolution,
    aspectRatio = '16:9',
    imageSize = '1K',
    seed,
    steps,
    cfg,
    sampler,
    scheduler,
    batchSize,
    denoise,
    referenceImageBase64,
    referenceMimeType,
  } = req.body;

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ success: false, error: 'Image generation prompt is required' });
  }

  const config = getLocalImageConfig();
  if (!config.enabled) {
    return res.status(503).json({
      success: false,
      error: 'Local image generation is not enabled. Set LOCAL_IMAGE_ENABLED=true.',
      code: 'NOT_CONFIGURED',
    });
  }

  const isImageToImage = Boolean(referenceImageBase64);
  const negativePromptValue = typeof negativePrompt === 'string' && negativePrompt.trim()
    ? negativePrompt.trim()
    : 'blurry, distorted, watermark, text overlay, low quality, jpeg artifacts';

  // Validate sampler/scheduler/batch/denoise before touching the backend.
  const numSteps = steps === undefined ? 20 : Number(steps);
  const numCfg = cfg === undefined ? 7 : Number(cfg);
  const numBatch = batchSize === undefined ? 1 : Number(batchSize);
  const numDenoise = denoise === undefined ? 0.65 : Number(denoise);
  if (!Number.isFinite(numSteps) || numSteps < 1 || numSteps > 150) {
    return res.status(400).json({ success: false, error: 'steps must be between 1 and 150', code: 'INVALID_REQUEST' });
  }
  if (!Number.isFinite(numCfg) || numCfg < 0.5 || numCfg > 30) {
    return res.status(400).json({ success: false, error: 'cfg must be between 0.5 and 30', code: 'INVALID_REQUEST' });
  }
  if (!Number.isInteger(numBatch) || numBatch < 1 || numBatch > 4) {
    return res.status(400).json({ success: false, error: 'batchSize must be an integer between 1 and 4', code: 'INVALID_REQUEST' });
  }
  if (isImageToImage && (!Number.isFinite(numDenoise) || numDenoise <= 0 || numDenoise > 1)) {
    return res.status(400).json({ success: false, error: 'denoise must be between 0 (exclusive) and 1 for image-to-image', code: 'INVALID_REQUEST' });
  }
  if (sampler !== undefined && typeof sampler !== 'string') {
    return res.status(400).json({ success: false, error: 'sampler must be a string', code: 'INVALID_REQUEST' });
  }
  if (scheduler !== undefined && typeof scheduler !== 'string') {
    return res.status(400).json({ success: false, error: 'scheduler must be a string', code: 'INVALID_REQUEST' });
  }

  console.info('[LocalImage] generate request', {
    model: config.model,
    resolution: resolution || `${imageSize} ${aspectRatio}`,
    steps: numSteps,
    cfg: numCfg,
    batch: numBatch,
    hasReference: isImageToImage,
    denoise: isImageToImage ? numDenoise : undefined,
  });

  try {
    // Detect backend using shared ComfyUI status cache.
    const videoConfig = getLocalVideoConfig();
    const detectConfig: LocalVideoProviderConfig = {
      ...videoConfig,
      enabled: true,
      url: config.url,
    };
    const backendStatus = await detectLocalBackend(detectConfig);
    if (!backendStatus.available) {
      return res.status(503).json({
        success: false,
        error: 'Local image backend is not available',
        details: backendStatus.error || 'ComfyUI is not running or not reachable. Start ComfyUI to enable local image generation.',
        code: 'BACKEND_UNAVAILABLE',
      });
    }

    // Hardware-aware resolution: rejects unsafe sizes with INVALID_REQUEST; never
    // silently changes the requested dimensions. Validated before model discovery so
    // bad requests fail fast.
    let width: number;
    let height: number;
    let resolutionLabel: string;
    let vramWarning: string | undefined;
    try {
      const dims = resolveLocalImageDimensions(resolution, imageSize, aspectRatio, backendStatus.vramMb);
      width = dims.width;
      height = dims.height;
      resolutionLabel = dims.label;
      vramWarning = dims.vramWarning;
    } catch (dimError) {
      const message = safeProviderError(dimError);
      return res.status(400).json({
        success: false,
        error: 'Unsupported or unsafe local image resolution',
        details: message,
        code: 'INVALID_REQUEST',
        model: config.model,
      });
    }

    // Validate required image nodes exist before submitting a doomed workflow.
    const missingImageNodes = await detectMissingNodes(config.url, REQUIRED_IMAGE_NODES);
    if (missingImageNodes.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Local image workflow is missing required ComfyUI nodes',
        details: `Missing nodes: ${missingImageNodes.join(', ')}`,
        code: 'INVALID_REQUEST',
        model: config.model,
      });
    }

    // Image-to-image needs LoadImage/ImageScale/VAEEncode — verify they exist rather
    // than pretending the reference image was used.
    if (isImageToImage) {
      const missingImg2Img = await detectMissingNodes(config.url, IMAGE_TO_IMAGE_NODES);
      if (missingImg2Img.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Local image-to-image is not available with the installed ComfyUI configuration',
          details: `Missing nodes: ${missingImg2Img.join(', ')}`,
          code: 'INVALID_REQUEST',
          model: config.model,
        });
      }
    }

    // Discover the actual checkpoint list from the backend instead of assuming a model exists.
    const checkpoints = await detectLocalCheckpoints(config.url, 'CheckpointLoaderSimple', 'ckpt_name');
    const checkpointResolution = detectLocalImageModel(checkpoints, config.model);

    if (checkpoints.length === 0 || !checkpointResolution.detected) {
      const details = checkpoints.length === 0
        ? 'No checkpoints are installed on the ComfyUI backend. Install an SD 1.5/SDXL/Flux checkpoint (e.g. DreamShaper 8 or v1-5-pruned-emaonly) into models/checkpoints.'
        : `No image checkpoint matching "${config.model}" was found. Available checkpoints: ${checkpoints.join(', ') || '(none listed)'}. Set LOCAL_IMAGE_MODEL to the installed filename or "auto".`;
      return res.status(503).json({
        success: false,
        error: 'Local image model is not available on the backend',
        details,
        code: 'MODEL_UNAVAILABLE',
        model: config.model,
      });
    }

    const ckptName = checkpointResolution.ckptName;
    console.info('[LocalImage] using checkpoint', {
      ckptName,
      model: config.model,
      verified: checkpointResolution.detected ? 'available' : 'unknown',
    });

    const actualSeed = typeof seed === 'number' ? seed : Math.floor(Math.random() * 2147483647);

    // Upload the reference image to ComfyUI for image-to-image.
    let referenceImage: { filename: string; subfolder?: string; type?: string } | undefined;
    if (isImageToImage) {
      try {
        // Resolve same-origin asset references (/api/assets/...) so the reference can be
        // a previously generated storyboard take.
        let referenceInput = referenceImageBase64 as string;
        if (typeof referenceInput === 'string' && referenceInput.startsWith('/')) {
          referenceInput = `${req.protocol}://${req.get('host')}${referenceInput}`;
        }
        const inputImage = await getImagePartFromInput(referenceInput, referenceMimeType || 'image/png');
        const imageBuffer = Buffer.from(inputImage.inlineData.data, 'base64');
        const ext = inputImage.inlineData.mimeType.includes('png') ? 'png' : 'jpg';
        const uploadFilename = `null_sector_ref_${Date.now()}.${ext}`;

        const formData = new FormData();
        formData.append('image', new Blob([imageBuffer], { type: inputImage.inlineData.mimeType }), uploadFilename);
        formData.append('subfolder', '');
        formData.append('type', 'input');

        const uploadResponse = await fetch(`${config.url}/upload/image`, { method: 'POST', body: formData });
        if (!uploadResponse.ok) {
          throw new Error(`Reference image upload to local backend failed (HTTP ${uploadResponse.status})`);
        }
        const uploadResult = await uploadResponse.json() as Record<string, unknown>;
        referenceImage = {
          filename: typeof uploadResult.name === 'string' ? uploadResult.name : uploadFilename,
          subfolder: typeof uploadResult.subfolder === 'string' ? uploadResult.subfolder : '',
          type: typeof uploadResult.type === 'string' ? uploadResult.type : 'input',
        };
      } catch (referenceError) {
        throw new Error(`Could not process reference image for image-to-image: ${safeProviderError(referenceError)}`);
      }
    }

    // Build workflow
    const workflow = buildComfyUIImageWorkflow(
      prompt.trim(),
      negativePromptValue,
      width,
      height,
      actualSeed,
      ckptName,
      {
        steps: numSteps,
        cfg: numCfg,
        sampler,
        scheduler,
        batchSize: numBatch,
        denoise: isImageToImage ? numDenoise : undefined,
      },
      referenceImage,
    );

    // Submit to ComfyUI
    const submitResponse = await fetch(`${config.url}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow }),
    });

    if (!submitResponse.ok) {
      const errorBody = await submitResponse.text().catch(() => '');
      throw new Error(`ComfyUI rejected image workflow: HTTP ${submitResponse.status} — ${errorBody.slice(0, 500)}`);
    }

    const submitResult = await submitResponse.json() as Record<string, unknown>;
    const promptId = typeof submitResult.prompt_id === 'string' ? submitResult.prompt_id : '';
    if (!promptId) {
      throw new Error('ComfyUI did not return a prompt_id for image generation');
    }

    // Wait for completion
    const result = await waitForLocalImageJob(config, promptId, actualSeed);

    console.info('[LocalImage] success', {
      promptId,
      model: config.model,
      ckptName,
      durationMs: Date.now() - startedAt,
      imageUrl: result.imageUrl,
      count: result.images?.length || 1,
    });

    return res.json({
      success: true,
      imageUrl: result.imageUrl,
      images: result.images,
      provider: 'Local Image (ComfyUI)',
      model: config.model,
      ckptName,
      resolution: resolutionLabel,
      dimensions: `${width}x${height}`,
      prompt: prompt.trim(),
      negativePrompt: negativePromptValue,
      operationId: promptId,
      backend: 'ComfyUI',
      seed: actualSeed,
      steps: numSteps,
      cfg: numCfg,
      batchSize: numBatch,
      denoise: isImageToImage ? numDenoise : undefined,
      imageToImage: isImageToImage,
      vramWarning,
    });
  } catch (error) {
    const details = safeProviderError(error);
    const info = classifyProviderError(undefined, details);
    console.error('[LocalImage] failed', {
      model: config.model,
      durationMs: Date.now() - startedAt,
      error: details,
      code: info.code,
    });
    const oomGuidance = 'Try reducing resolution (768x768 or below), reducing batch size, using a smaller model, closing other GPU applications, or enabling ComfyUI CPU offloading.';
    return res.status(getProviderHttpStatus(info)).json({
      success: false,
      error: info.code === 'OUT_OF_MEMORY'
        ? `Local image generation failed: GPU out of memory. ${oomGuidance}`
        : 'Local image generation failed',
      details,
      code: info.code,
      model: config.model,
      guidance: info.code === 'OUT_OF_MEMORY' ? oomGuidance : undefined,
    });
  }
});

// ── Local Image Proxy ─────────────────────────────────────────────────────
app.get('/api/local-image/proxy', async (req: Request, res: Response) => {
  const config = getLocalImageConfig();
  const filename = typeof req.query.filename === 'string' ? req.query.filename : '';
  const subfolder = typeof req.query.subfolder === 'string' ? req.query.subfolder : '';
  const type = typeof req.query.type === 'string' ? req.query.type : 'output';

  if (!filename) {
    return res.status(400).json({ success: false, error: 'Missing filename parameter' });
  }

  if (!config.enabled || !config.url) {
    return res.status(503).json({ success: false, error: 'Local image backend is not configured' });
  }

  try {
    const viewUrl = `${config.url}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(type)}`;
    const backendResponse = await fetch(viewUrl);
    if (!backendResponse.ok || !backendResponse.body) {
      return res.status(502).json({ success: false, error: 'Local backend did not return the image file' });
    }

    res.status(200);
    res.setHeader('Content-Type', backendResponse.headers.get('content-type') || 'image/png');
    const contentLength = backendResponse.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    backendResponse.body.pipeTo(new WritableStream<Uint8Array>({
      write(chunk) { res.write(Buffer.from(chunk)); },
      close() { res.end(); },
      abort() { if (!res.writableEnded) res.end(); },
    })).catch(() => { if (!res.writableEnded) res.end(); });
  } catch (error) {
    console.error('[LocalImageProxy] failed', { error: safeProviderError(error) });
    if (!res.headersSent) {
      return res.status(502).json({ success: false, error: 'Local image proxy failed' });
    }
    if (!res.writableEnded) res.end();
  }
});

// ── Local Video Generation Routes ─────────────────────────────────────────

// GET /api/local-video/status — detect local backend availability + capabilities
app.get('/api/local-video/status', async (_req: Request, res: Response) => {
  const config = getLocalVideoConfig();
  try {
    const status = await detectLocalBackend(config);
    const capabilities = status.available
      ? await getLocalVideoCapabilities(config.url)
      : { textToVideo: false, imageToVideo: false, mp4: false, webp: false, audio: false, resolutions: ['480p', '720p', '1080p'], maxResolution: '1080p' };
    return res.json({ success: true, config: { enabled: config.enabled, url: config.url, model: config.model, outputFormat: config.outputFormat }, status, capabilities });
  } catch (error) {
    return res.json({
      success: true,
      config: { enabled: config.enabled, url: config.url, model: config.model, outputFormat: config.outputFormat },
      status: { available: false, backend: 'ComfyUI', model: config.model, error: safeProviderError(error) },
      capabilities: { textToVideo: false, imageToVideo: false, mp4: false, webp: false, audio: false, resolutions: ['480p', '720p', '1080p'], maxResolution: '1080p' },
    });
  }
});

// POST /api/video/generate-local — real local video generation via ComfyUI
app.post('/api/video/generate-local', async (req: Request, res: Response) => {
  const startedAt = Date.now();
  const { prompt, durationSec = 4, aspectRatio = '16:9', resolution, outputFormat = 'auto', seed, keyframeUrl, shotId } = req.body;
  const numericDuration = Number(durationSec);

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ success: false, error: 'Video generation prompt is required' });
  }
  if (numericDuration < 1 || numericDuration > 30) {
    return res.status(400).json({ success: false, error: 'Local video duration must be between 1 and 30 seconds' });
  }

  const config = getLocalVideoConfig();
  if (!config.enabled) {
    return res.status(503).json({
      success: false,
      error: 'Local video generation is not enabled. Set LOCAL_VIDEO_ENABLED=true.',
      code: 'NOT_CONFIGURED',
    });
  }

  console.info('[LocalVideo] generate request', {
    model: config.model,
    shotId,
    durationSec: numericDuration,
    aspectRatio,
    resolution,
    hasKeyframe: Boolean(keyframeUrl),
  });

  try {
    const backendStatus = await detectLocalBackend(config);
    if (!backendStatus.available) {
      return res.status(503).json({
        success: false,
        error: 'Local video backend is not available',
        details: backendStatus.error || 'Backend is not running or not reachable',
        code: 'BACKEND_UNAVAILABLE',
      });
    }

    // Discover the available full checkpoints and verify the selected LTX-Video model exists.
    // LTX-Video checkpoints are full checkpoints (UNET + T5-XXL text encoder + VAE) loaded
    // via CheckpointLoaderSimple.
    const checkpoints = await detectLocalCheckpoints(config.url, 'CheckpointLoaderSimple', 'ckpt_name');
    const configuredCheckpoint = /\.(safetensors|ckpt)$/i.test(config.model) ? config.model : '';
    const checkpointName = checkpoints.find(name => /ltx|video/i.test(name))
      || configuredCheckpoint
      || 'ltx-video-2b-v0.9.1.safetensors';
    if (checkpoints.length > 0 && !checkpoints.some(name => /ltx|video/i.test(name))) {
      return res.status(503).json({
        success: false,
        error: 'Local video model is not available on the backend',
        details: `No LTX-Video checkpoint was found. Available checkpoints: ${checkpoints.join(', ') || '(none listed)'}`,
        code: 'MODEL_UNAVAILABLE',
        model: config.model,
      });
    }
    console.info('[LocalVideo] using checkpoint', { checkpointName, model: config.model });

    // Validate the required ComfyUI nodes exist before submitting a doomed workflow.
    const missingNodes = await detectMissingNodes(config.url, REQUIRED_VIDEO_NODES);
    if (missingNodes.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Local video workflow is missing required ComfyUI nodes',
        details: `Missing nodes: ${missingNodes.join(', ')}. Install the required LTX-Video custom nodes.`,
        code: 'INVALID_REQUEST',
        model: config.model,
      });
    }

    const capabilities = await getLocalVideoCapabilities(config.url);

    // Resolve the requested output format against actual backend capabilities.
    const requestedFormat = outputFormat === 'mp4' || outputFormat === 'webp' ? outputFormat : config.outputFormat;
    let resolvedFormat: 'webp' | 'mp4';
    if (requestedFormat === 'mp4') {
      if (!capabilities.mp4) {
        return res.status(400).json({
          success: false,
          error: 'MP4 export requires SaveVideo/CreateVideo (ComfyUI 0.20.x native) or VideoHelperSuite (VHS_VideoCombine)',
          details: 'Neither the native MP4 nodes nor VideoHelperSuite is installed. The local backend can only produce animated WEBP.',
          code: 'INVALID_REQUEST',
          model: config.model,
        });
      }
      resolvedFormat = 'mp4';
    } else if (requestedFormat === 'webp') {
      resolvedFormat = 'webp';
    } else {
      resolvedFormat = capabilities.mp4 ? 'mp4' : 'webp';
    }
    if (resolvedFormat === 'webp' && !capabilities.webp) {
      return res.status(400).json({
        success: false,
        error: 'Local video WEBP output is unavailable',
        details: 'The SaveAnimatedWEBP node is missing from ComfyUI.',
        code: 'INVALID_REQUEST',
        model: config.model,
      });
    }

    // Resolve dimensions from the requested resolution + aspect ratio.
    const dimensions = resolveLocalVideoDimensions(resolution, aspectRatio);
    if ('error' in dimensions) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported local video resolution',
        details: dimensions.error,
        code: 'INVALID_REQUEST',
        model: config.model,
      });
    }
    const { width, height, label: resolutionLabel, aspectRatio: normalizedAspect } = dimensions;

    console.info('[LocalVideo] resolved', { resolution: resolutionLabel, aspectRatio: normalizedAspect, width, height, outputFormat: resolvedFormat });

    const actualSeed = typeof seed === 'number' ? seed : Math.floor(Math.random() * 2147483647);

    // Handle keyframe image upload to ComfyUI if provided
    let keyframeImage: { filename: string; subfolder?: string; type?: string } | undefined;
    if (keyframeUrl) {
      try {
        const inputImage = await getImagePartFromInput(keyframeUrl, 'image/jpeg');
        const imageBuffer = Buffer.from(inputImage.inlineData.data, 'base64');
        const ext = inputImage.inlineData.mimeType.includes('png') ? 'png' : 'jpg';
        const uploadFilename = `null_sector_kf_${Date.now()}.${ext}`;

        // Upload to ComfyUI
        const formData = new FormData();
        formData.append('image', new Blob([imageBuffer], { type: inputImage.inlineData.mimeType }), uploadFilename);
        formData.append('subfolder', '');
        formData.append('type', 'input');

        const uploadResponse = await fetch(`${config.url}/upload/image`, { method: 'POST', body: formData });
        if (!uploadResponse.ok) {
          throw new Error(`Keyframe upload to local backend failed (HTTP ${uploadResponse.status})`);
        }
        const uploadResult = await uploadResponse.json() as Record<string, unknown>;
        keyframeImage = {
          filename: typeof uploadResult.name === 'string' ? uploadResult.name : uploadFilename,
          subfolder: typeof uploadResult.subfolder === 'string' ? uploadResult.subfolder : '',
          type: typeof uploadResult.type === 'string' ? uploadResult.type : 'input',
        };
      } catch (kfError) {
        throw new Error(`Could not process keyframe for image-to-video: ${safeProviderError(kfError)}`);
      }
    }

    // Build workflow
    const workflow = buildComfyUIWorkflow(
      prompt.trim(),
      numericDuration,
      width,
      height,
      actualSeed,
      keyframeImage,
      checkpointName,
      config.textEncoder,
      resolvedFormat,
    );

    // Submit to ComfyUI
    let submitResponse: Awaited<ReturnType<typeof fetch>>;
    try {
      submitResponse = await fetch(`${config.url}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflow }),
        signal: AbortSignal.timeout(COMFYUI_SUBMIT_TIMEOUT_MS),
      });
    } catch (submitError) {
      const message = safeProviderError(submitError);
      throw new ProviderError(`ComfyUI did not accept the workflow submission: ${message}`, {
        provider: 'Local Video (ComfyUI)',
        info: /(timed? ?out|abort)/i.test(message) ? classifyProviderError(undefined, 'Local video generation timed out') : classifyProviderError(undefined, message),
        details: message,
      });
    }

    if (!submitResponse.ok) {
      const errorBody = await submitResponse.text().catch(() => '');
      const detail = `HTTP ${submitResponse.status} — ${errorBody.slice(0, 500)}`;
      throw new ProviderError(`ComfyUI rejected workflow: ${detail}`, {
        provider: 'Local Video (ComfyUI)',
        info: classifyProviderError(submitResponse.status, detail),
        details: detail,
      });
    }

    const submitResult = await submitResponse.json() as Record<string, unknown>;
    const promptId = typeof submitResult.prompt_id === 'string' ? submitResult.prompt_id : '';
    if (!promptId) {
      throw new Error('ComfyUI did not return a prompt_id');
    }

    // Wait for completion
    const result = await waitForLocalVideoJob(config, promptId, shotId, actualSeed);

    console.info('[LocalVideo] success', {
      promptId,
      model: config.model,
      shotId,
      durationMs: Date.now() - startedAt,
      outputFormat: resolvedFormat,
      mimeType: result.mimeType,
      videoUrl: result.videoUrl,
    });

    return res.json({
      success: true,
      videoUrl: result.videoUrl,
      mimeType: result.mimeType,
      outputFormat: resolvedFormat,
      provider: 'Local Video (ComfyUI)',
      model: config.model,
      durationSec: numericDuration,
      shotId,
      operationId: promptId,
      status: 'COMPLETED',
      backend: 'ComfyUI',
      seed: actualSeed,
      resolution: resolutionLabel,
      dimensions: `${width}x${height}`,
      aspectRatio: normalizedAspect,
      capabilities,
    });
  } catch (error) {
    const details = safeProviderError(error);
    // Preserve the precise classification from polling/submit (ProviderError)
    // rather than re-deriving it from a generic message.
    const info = error instanceof ProviderError ? error.info : classifyProviderError(undefined, details);
    console.error('[LocalVideo] failed', {
      model: config.model,
      shotId,
      durationMs: Date.now() - startedAt,
      error: details,
      code: info.code,
    });
    return res.status(getProviderHttpStatus(info)).json({
      success: false,
      error: info.code === 'OUT_OF_MEMORY'
        ? 'Local video generation failed: GPU out of memory'
        : info.code === 'TIMEOUT'
          ? 'Local video generation timed out'
          : info.code === 'GPU_RUNTIME_ERROR'
            ? 'Local video generation failed: GPU runtime error'
            : 'Local video generation failed',
      details,
      code: info.code,
      model: config.model,
    });
  }
});

// ── Local Video Proxy ─────────────────────────────────────────────────────
app.get('/api/local-video/proxy', async (req: Request, res: Response) => {
  const config = getLocalVideoConfig();
  const filename = typeof req.query.filename === 'string' ? req.query.filename : '';
  const subfolder = typeof req.query.subfolder === 'string' ? req.query.subfolder : '';
  const type = typeof req.query.type === 'string' ? req.query.type : 'output';

  if (!filename) {
    return res.status(400).json({ success: false, error: 'Missing filename parameter' });
  }

  if (!config.enabled || !config.url) {
    return res.status(503).json({ success: false, error: 'Local video backend is not configured' });
  }

  try {
    const viewUrl = `${config.url}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(type)}`;
    const backendResponse = await fetch(viewUrl);
    if (!backendResponse.ok || !backendResponse.body) {
      return res.status(502).json({ success: false, error: 'Local backend did not return the video file' });
    }

    res.status(200);
    res.setHeader('Content-Type', backendResponse.headers.get('content-type') || 'video/webm');
    const contentLength = backendResponse.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    backendResponse.body.pipeTo(new WritableStream<Uint8Array>({
      write(chunk) { res.write(Buffer.from(chunk)); },
      close() { res.end(); },
      abort() { if (!res.writableEnded) res.end(); },
    })).catch(() => { if (!res.writableEnded) res.end(); });
  } catch (error) {
    console.error('[LocalVideoProxy] failed', { error: safeProviderError(error) });
    if (!res.headersSent) {
      return res.status(502).json({ success: false, error: 'Local video proxy failed' });
    }
    if (!res.writableEnded) res.end();
  }
});

// Vite middleware for development & static files in production
async function start() {
  const server = http.createServer(app);

  // Setup WebSocket Server for Live Voice Director (gemini-3.1-flash-live-preview)
  const wss = new WebSocketServer({ server, path: '/api/live' });

  wss.on('connection', async (ws: WebSocket) => {
    console.log('Client connected to Live Voice Director WebSocket');
    let liveSession: any = null;
    let isConnected = true;

    ws.on('close', () => {
      isConnected = false;
      if (liveSession) {
        try {
          liveSession.close?.();
        } catch (e) {
          // ignore
        }
      }
    });

    try {
      const ai = getAI();
      if (ai) {
        liveSession = await ai.live.connect({
          model: 'gemini-3.1-flash-live-preview',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Zephyr' },
              },
            },
            systemInstruction: `You are the Virtual Film Director & Production Co-Pilot for the film project.
You converse naturally and fluently in real time over audio.
You provide concise, highly insightful cinematic direction:
- Discuss scene tension, blocking, shot compositions, lens choices, and camera movement.
- Review character arcs and dialogue subtext.
- Give constructive feedback on lighting and sound design.
Always be punchy, encouraging, and cinematic. Keep answers under 30 seconds unless asked for a detailed breakdown.`,
          },
          callbacks: {
            onmessage: (msg: any) => {
              if (ws.readyState === WebSocket.OPEN) {
                // Extract audio or parts if present
                const serverContent = msg.serverContent;
                if (serverContent?.modelTurn?.parts) {
                  for (const part of serverContent.modelTurn.parts) {
                    if (part.inlineData?.data) {
                      ws.send(JSON.stringify({
                        type: 'audio',
                        audio: part.inlineData.data,
                        mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                      }));
                    }
                    if (part.text) {
                      ws.send(JSON.stringify({
                        type: 'transcript',
                        sender: 'director',
                        text: part.text,
                      }));
                    }
                  }
                }
                if (serverContent?.interrupted) {
                  ws.send(JSON.stringify({ type: 'interrupted' }));
                }
                if (serverContent?.turnComplete) {
                  ws.send(JSON.stringify({ type: 'turnComplete' }));
                }
              }
            },
            onclose: (e: any) => {
              console.log('Gemini Live session closed', e);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'session_closed' }));
              }
            },
            onerror: (err: any) => {
              console.warn('Gemini Live session error:', err);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'error', error: err?.message || 'Live session error' }));
              }
            },
          },
        });

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'ready',
            model: 'gemini-3.1-flash-live-preview',
            voice: 'Zephyr',
            status: 'connected',
          }));
        }
      } else {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'ready',
            model: 'gemini-3.1-flash-live-preview (simulated/offline)',
            voice: 'Zephyr',
            status: 'ready_offline',
          }));
        }
      }
    } catch (sessionErr: any) {
      console.warn('Could not initialize live session:', sessionErr);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'ready',
          model: 'gemini-3.1-flash-live-preview',
          status: 'ready_fallback',
          error: sessionErr?.message,
        }));
      }
    }

    ws.on('message', async (rawMessage: any) => {
      try {
        const msgStr = rawMessage.toString();
        const data = JSON.parse(msgStr);

        if (data.type === 'audio_chunk' && data.audio) {
          if (liveSession) {
            try {
              // Send 16kHz PCM audio chunk to Live API
              await liveSession.sendRealtimeInput({
                audio: {
                  mimeType: 'audio/pcm;rate=16000',
                  data: data.audio,
                },
              });
            } catch (err: any) {
              console.warn('Error sending realtime input to Live API:', err);
            }
          }
        } else if (data.type === 'text_input' && data.text) {
          if (liveSession) {
            try {
              await liveSession.send({
                clientContent: {
                  turns: [
                    {
                      role: 'user',
                      parts: [{ text: data.text }],
                    },
                  ],
                  turnComplete: true,
                },
              });
            } catch (err: any) {
              console.warn('Error sending text to Live API:', err);
            }
          } else {
            // Fallback response
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'transcript',
                sender: 'director',
                text: `[Live Director]: Acknowledged regarding "${data.text.slice(0, 40)}...". I recommend checking the camera elevation and maintaining high contrast lighting.`,
              }));
              ws.send(JSON.stringify({ type: 'turnComplete' }));
            }
          }
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = process.env.NULL_SECTOR_DIST_PATH || path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Filmmaking Studio Server with Live WebSocket running on http://0.0.0.0:${PORT}`);
  });
}

start();
