import { FilmProject, Shot, ProviderStatus } from '../types/film';

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
      imageProvider: { name: 'Gemini Imagen / Flash Image', available: true, model: 'gemini-3.1-flash-lite-image' },
      videoProvider: { name: 'Veo Video Generator (Veo 3.1)', available: true, model: 'veo-3.1-lite-generate-preview' },
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
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Image generation failed');
    }
    return data.imageUrl;
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
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Image editing failed');
    }
    return data.imageUrl;
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

  public static async generateVideo(prompt: string, durationSec = 4, shotId?: string, keyframeUrl?: string): Promise<any> {
    const res = await fetch('/api/video/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, durationSec, shotId, keyframeUrl }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Video generation failed');
    }
    return data;
  }
}
