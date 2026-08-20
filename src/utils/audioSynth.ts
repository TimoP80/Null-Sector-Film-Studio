// Real browser Web Audio synth for cinematic SFX, ambience, music cue previews, and dialogue playback

class CinemaAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: (AudioNode | { stop: () => void })[] = [];

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public stopAll() {
    this.activeNodes.forEach(node => {
      try {
        if ('stop' in node && typeof node.stop === 'function') {
          node.stop();
        } else if ('disconnect' in node && typeof node.disconnect === 'function') {
          node.disconnect();
        }
      } catch (e) {
        // ignore already stopped
      }
    });
    this.activeNodes = [];
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  public playSubBassDrone(durationSec = 4, freq = 55) {
    const ctx = this.initContext();
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.85, ctx.currentTime + durationSec);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 0.5, ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(160, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(80, ctx.currentTime + durationSec);

    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    osc.start();
    osc2.start();
    osc.stop(ctx.currentTime + durationSec);
    osc2.stop(ctx.currentTime + durationSec);

    this.activeNodes.push(osc, osc2);
  }

  public playAirlockHiss(durationSec = 3) {
    const ctx = this.initContext();
    const bufferSize = ctx.sampleRate * durationSec;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + durationSec);
    filter.Q.setValueAtTime(3, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    noise.start();
    noise.stop(ctx.currentTime + durationSec);
    this.activeNodes.push(noise);
  }

  public playQuantumPulse(durationSec = 2) {
    const ctx = this.initContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + durationSec);

    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start();
    osc.stop(ctx.currentTime + durationSec);
    this.activeNodes.push(osc);
  }

  public playRadioStatic(durationSec = 2.5) {
    const ctx = this.initContext();
    const bufferSize = ctx.sampleRate * durationSec;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (Math.sin(i / 300) > 0 ? 0.8 : 0.2);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1800, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationSec);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    noise.start();
    noise.stop(ctx.currentTime + durationSec);
    this.activeNodes.push(noise);
  }

  public playCinematicRiser(durationSec = 4) {
    const ctx = this.initContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + durationSec);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + durationSec * 0.9);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start();
    osc.stop(ctx.currentTime + durationSec);
    this.activeNodes.push(osc);
  }

  public playHeartbeat(durationSec = 3) {
    const ctx = this.initContext();
    const now = ctx.currentTime;
    const beats = [0, 0.25, 1.0, 1.25, 2.0, 2.25];

    beats.forEach(delay => {
      if (delay < durationSec) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(70, now + delay);
        osc.frequency.exponentialRampToValueAtTime(35, now + delay + 0.15);

        gain.gain.setValueAtTime(0.7, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + delay);
        osc.stop(now + delay + 0.2);
        this.activeNodes.push(osc);
      }
    });
  }

  public playMusicChordProgression(genre: string, mood: string, durationSec = 6) {
    const ctx = this.initContext();
    const chords = [
      [146.83, 174.61, 220.00, 261.63], // Dm7
      [130.81, 164.81, 196.00, 246.94], // Cmaj7 / Dm
      [116.54, 146.83, 174.61, 220.00], // Bbmaj7
      [110.00, 138.59, 164.81, 220.00], // A7
    ];

    const chordDuration = durationSec / chords.length;
    const now = ctx.currentTime;

    chords.forEach((chord, idx) => {
      const startTime = now + idx * chordDuration;
      chord.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = mood.toLowerCase().includes('electronic') ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450 + idx * 80, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + chordDuration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(startTime);
        osc.stop(startTime + chordDuration);
        this.activeNodes.push(osc);
      });
    });
  }

  public playSFXByCategory(category: string, name?: string) {
    const cat = category.toLowerCase();
    if (cat.includes('ambience') || cat.includes('machinery')) {
      this.playSubBassDrone(4, 60);
    } else if (cat.includes('impact') || cat.includes('weapon')) {
      this.playQuantumPulse(1.5);
    } else if (cat.includes('environmental') || cat.includes('airlock')) {
      this.playAirlockHiss(3);
    } else if (cat.includes('riser')) {
      this.playCinematicRiser(4);
    } else if (cat.includes('footstep') || cat.includes('tension')) {
      this.playHeartbeat(3);
    } else {
      this.playRadioStatic(2);
    }
  }

  // Client-side PCM-to-WAV converter for raw 16-bit PCM arrays or Base64 strings
  public pcmToWavDataUrl(pcmBase64: string, sampleRate = 24000, channels = 1, bitsPerSample = 16): string {
    try {
      const rawBinary = atob(pcmBase64.replace(/^data:audio\/[a-z0-9;\-=_]+;base64,/, ''));
      const pcmLength = rawBinary.length;
      const buffer = new ArrayBuffer(44 + pcmLength);
      const view = new DataView(buffer);

      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

      // RIFF chunk descriptor
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + pcmLength, true);
      writeString(8, 'WAVE');

      // fmt subchunk
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM format
      view.setUint16(22, channels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * channels * (bitsPerSample / 8), true);
      view.setUint16(32, channels * (bitsPerSample / 8), true);
      view.setUint16(34, bitsPerSample, true);

      // data subchunk
      writeString(36, 'data');
      view.setUint32(40, pcmLength, true);

      // Write PCM samples
      const pcmBytes = new Uint8Array(buffer, 44);
      for (let i = 0; i < pcmLength; i++) {
        pcmBytes[i] = rawBinary.charCodeAt(i);
      }

      const blob = new Blob([buffer], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error('Failed to convert PCM to WAV:', e);
      return `data:audio/wav;base64,${pcmBase64}`;
    }
  }

  public speakDialogue(text: string, voiceName?: string, emotion?: string, onEnd?: () => void) {
    if (!('speechSynthesis' in window)) return;
    this.stopAll();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    // Select suitable voice
    if (voiceName) {
      const match = voices.find(v => v.name.toLowerCase().includes(voiceName.toLowerCase()));
      if (match) utterance.voice = match;
    }

    if (emotion?.toLowerCase().includes('whisper') || emotion?.toLowerCase().includes('restrained')) {
      utterance.volume = 0.7;
      utterance.rate = 0.88;
      utterance.pitch = 0.95;
    } else if (emotion?.toLowerCase().includes('urgent') || emotion?.toLowerCase().includes('panic')) {
      utterance.volume = 1.0;
      utterance.rate = 1.18;
      utterance.pitch = 1.1;
    } else {
      utterance.volume = 0.9;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
    }

    if (onEnd) {
      utterance.onend = () => onEnd();
      utterance.onerror = () => onEnd();
    }

    window.speechSynthesis.speak(utterance);
  }

  public playAudioUrl(url: string, onEnded?: () => void): HTMLAudioElement {
    this.stopAll();
    let playableUrl = url;

    // If it's raw PCM, wrap in WAV
    if (url.startsWith('data:audio/pcm') || url.includes('audio/pcm')) {
      const base64Part = url.split(',')[1] || '';
      playableUrl = this.pcmToWavDataUrl(base64Part, 24000);
    }

    const audio = new Audio(playableUrl);
    audio.play().catch(err => {
      console.warn('Audio element play failed, trying Web Audio API:', err);
    });

    if (onEnded) {
      audio.onended = () => onEnded();
      audio.onerror = () => onEnded();
    }

    this.activeNodes.push({ stop: () => {
      audio.pause();
      audio.currentTime = 0;
    }});

    return audio;
  }

  public playBase64Audio(base64Data: string, mimeType = 'audio/wav', onEnded?: () => void) {
    try {
      this.stopAll();
      let audioUrl = '';
      if (mimeType.includes('pcm')) {
        audioUrl = this.pcmToWavDataUrl(base64Data, 24000);
      } else {
        audioUrl = `data:${mimeType};base64,${base64Data}`;
      }
      return this.playAudioUrl(audioUrl, onEnded);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }
  public playCinematicSFX(category: string, name?: string) {
    this.playSFXByCategory(category, name);
  }

  public playMusicDrone(mood: string, intensity = 0.5) {
    this.playSubBassDrone(6, 45);
    this.playMusicChordProgression('orchestral', mood, 8);
  }

  public stopAllMusic() {
    this.stopAll();
  }
}

export const cinemaAudio = new CinemaAudioEngine();
