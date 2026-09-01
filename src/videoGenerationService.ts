import { ImageToVideoProvider, ImageToVideoRequest, VideoGenerationJob } from './videoTypes';

export class VideoGenerationService {
  constructor(private readonly providers: Map<string, ImageToVideoProvider>) {}

  async queue(request: ImageToVideoRequest, providerId: string): Promise<VideoGenerationJob> {
    if (!request.prompt.trim()) throw new Error('A motion prompt is required');
    if (!request.sourceImage?.trim()) throw new Error('A source image is required for image-to-video');
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Video provider "${providerId}" is not registered`);
    const capabilities = provider.getCapabilities();
    if (!capabilities.imageToVideo) throw new Error(`${provider.name} does not support image-to-video`);
    if (request.endFrame && !capabilities.endFrame) throw new Error(`${provider.name} does not support end frames`);
    if (request.references?.length && !capabilities.referenceImages) throw new Error(`${provider.name} does not support reference images`);
    return provider.generate(request);
  }
}
