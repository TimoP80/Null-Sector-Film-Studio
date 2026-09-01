export interface VideoMetadata {
  sizeBytes?: number;
  durationSec?: number;
  width?: number;
  height?: number;
  frameRate?: number;
  codec?: string;
  format?: string;
  verifiedBy?: 'ffprobe' | 'http';
}

export interface VideoVerificationResult {
  valid: boolean;
  error?: string;
  metadata?: VideoMetadata;
}

export const verifyVideoOutput = async (url: string, baseUrl?: string): Promise<VideoVerificationResult> => {
  if (!url || !(/^(\/api\/assets\/|\/api\/local-video(?:\/|$)|https?:\/\/)/.test(url))) return { valid: false, error: 'Video output URL is missing or unsafe.' };
  // In the browser, relative asset URLs resolve against the page origin. Node
  // (tests, CLI) has no such origin, so callers may pass an explicit base.
  const resolve = (target: string) => (baseUrl ? new URL(target, baseUrl).toString() : target);
  try {
    const response = await fetch(resolve(url), { method: 'HEAD' });
    if (!response.ok) return { valid: false, error: `Video output is not available (HTTP ${response.status}).` };
    const sizeBytes = Number(response.headers.get('content-length') || 0);
    const type = response.headers.get('content-type') || '';
    if (sizeBytes <= 0) return { valid: false, error: 'Video output is empty.' };
    if (!(type.startsWith('video/') || type === 'image/webp')) return { valid: false, error: 'Video output has an unsupported media type.' };
    const metadataResponse = await fetch(resolve(`/api/assets/video-metadata?url=${encodeURIComponent(url)}`));
    if (metadataResponse.ok) {
      const metadata = await metadataResponse.json() as { valid?: boolean; verifiedBy?: string; metadata?: VideoMetadata };
      if (metadata.valid === false) return { valid: false, error: 'Video output failed FFmpeg stream validation.' };
      return { valid: true, metadata: { sizeBytes, ...(metadata.metadata || {}), verifiedBy: metadata.verifiedBy as 'ffprobe' | undefined } };
    }
    // Development installs may not have ffprobe on PATH. Keep the strict HTTP
    // validation result, while leaving the verification source explicit.
    return { valid: true, metadata: { sizeBytes, verifiedBy: 'http' } };
  } catch (error) { return { valid: false, error: error instanceof Error ? error.message : 'Video output verification failed.' }; }
};
