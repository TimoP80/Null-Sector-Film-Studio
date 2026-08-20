import React, { useState, useRef, useEffect } from 'react';
import { FilmProject, StudioBranding } from '../types/film';
import {
  Film,
  Play,
  Square,
  Sparkles,
  Download,
  Sliders,
  Volume2,
  Tv,
  Check,
  RefreshCw,
  Layers
} from 'lucide-react';
import { cinemaAudio } from '../utils/audioSynth';

interface StudioBrandingWorkspaceProps {
  project: FilmProject;
  onUpdateProject: (updated: FilmProject) => void;
}

export const StudioBrandingWorkspace: React.FC<StudioBrandingWorkspaceProps> = ({
  project,
  onUpdateProject
}) => {
  const branding: StudioBranding = project.studioBranding || {
    studioName: 'NULL SECTOR FILM STUDIOS',
    titleCard: 'THE LAST SIGNAL',
    subtitle: 'A DEEP SPACE HARD SCI-FI PRODUCTION',
    tagline: 'IN THE DEAD ZONE, SOUND HAS SYNTAX',
    animationStyle: 'signal_distortion',
    soundStinger: 'quantum_riser',
    durationSec: 4
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const animationFrameRef = useRef<number | null>(null);

  const handleUpdate = (patch: Partial<StudioBranding>) => {
    onUpdateProject({
      ...project,
      studioBranding: { ...branding, ...patch }
    });
  };

  const playStingerAudio = () => {
    if (branding.soundStinger === 'deep_pulse') {
      cinemaAudio.playSubBassDrone(branding.durationSec, 50);
    } else if (branding.soundStinger === 'quantum_riser') {
      cinemaAudio.playCinematicRiser(branding.durationSec);
    } else if (branding.soundStinger === 'radio_static') {
      cinemaAudio.playRadioStatic(branding.durationSec);
    } else if (branding.soundStinger === 'analog_synthesizer') {
      cinemaAudio.playMusicDrone('mysterious', 0.8);
    }
  };

  const handlePlayAnimation = () => {
    if (isPlaying) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      cinemaAudio.stopAll();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    setAnimationProgress(0);
    playStingerAudio();

    const startTime = performance.now();
    const totalMs = branding.durationSec * 1000;

    const loop = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / totalMs, 1);
      setAnimationProgress(progress);

      renderCanvas(progress);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(loop);
      } else {
        setIsPlaying(false);
      }
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  };

  // Canvas renderer
  const renderCanvas = (prog: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);

    const style = branding.animationStyle;

    if (style === 'signal_distortion') {
      // Background noise
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = `rgba(56, 189, 248, ${Math.random() * 0.08})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 4, 1);
      }

      // Signal wave
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x < w; x += 10) {
        const y = h / 2 + Math.sin(x * 0.02 + prog * 20) * (40 * (1 - prog));
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Text with glitch shift
      const glitchOffset = prog < 0.8 && Math.random() > 0.85 ? (Math.random() - 0.5) * 8 : 0;

      // Studio
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.fillText(branding.studioName, w / 2 + glitchOffset, h / 2 - 40);

      // Title Card
      ctx.font = 'bold 36px monospace';
      ctx.fillStyle = prog > 0.3 ? '#38bdf8' : '#0e7490';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 12 * prog;
      ctx.fillText(branding.titleCard, w / 2, h / 2 + 10);
      ctx.shadowBlur = 0;

      // Subtitle
      ctx.font = '12px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(branding.subtitle, w / 2, h / 2 + 45);

      // CRT Scanlines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1);
      }
    } else if (style === 'cinematic_push') {
      const scale = 1 + prog * 0.15;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(scale, scale);

      // Glow flare
      const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 300);
      gradient.addColorStop(0, `rgba(59, 130, 246, ${0.4 * prog})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(-w / 2, -h / 2, w, h);

      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.letterSpacing = '4px';
      ctx.fillText(branding.studioName, 0, -35);

      ctx.font = 'bold 38px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(255,255,255,0.7)';
      ctx.shadowBlur = 15;
      ctx.fillText(branding.titleCard, 0, 10);
      ctx.shadowBlur = 0;

      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(branding.tagline, 0, 45);

      ctx.restore();
    } else if (style === 'particle_burst') {
      // Floating star dust
      for (let i = 0; i < 80; i++) {
        const px = (Math.sin(i + prog * 5) * 0.5 + 0.5) * w;
        const py = (Math.cos(i * 1.5 + prog * 4) * 0.5 + 0.5) * h;
        ctx.fillStyle = `rgba(245, 158, 11, ${Math.random() * 0.7})`;
        ctx.fillRect(px, py, 2, 2);
      }

      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = '#d97706';
      ctx.textAlign = 'center';
      ctx.fillText(branding.studioName, w / 2, h / 2 - 35);

      ctx.font = 'bold 36px serif';
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 15 * prog;
      ctx.fillText(branding.titleCard, w / 2, h / 2 + 10);
      ctx.shadowBlur = 0;

      ctx.font = '13px monospace';
      ctx.fillStyle = '#fef3c7';
      ctx.fillText(branding.subtitle, w / 2, h / 2 + 45);
    } else {
      // Generic fallback
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText(branding.studioName, w / 2, h / 2 - 30);

      ctx.font = 'bold 34px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(branding.titleCard, w / 2, h / 2 + 10);

      ctx.font = '12px monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText(branding.subtitle, w / 2, h / 2 + 40);
    }
  };

  useEffect(() => {
    renderCanvas(1);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [branding]);

  const handleCaptureKeyframe = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${branding.titleCard.toLowerCase().replace(/\s+/g, '_')}_title_card.png`;
    a.click();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto font-mono p-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-amber-950/80 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white uppercase tracking-wider">Studio Branding & Title Card Engine</h1>
              <p className="text-xs text-slate-400">
                Procedural cinematic intro sequences, studio vanity cards, signal overlays, and audio stingers
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCaptureKeyframe}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export Title Frame
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Canvas Preview Player */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="relative aspect-video bg-black rounded-lg border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={1280}
              height={720}
              className="w-full h-full object-contain"
            />

            {/* Play Overlay Button */}
            {!isPlaying && (
              <button
                onClick={handlePlayAnimation}
                className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-cyan-600/80 hover:bg-cyan-500 text-white flex items-center justify-center backdrop-blur-sm shadow-xl transition-all hover:scale-105"
              >
                <Play className="w-7 h-7 fill-current ml-1" />
              </button>
            )}

            {/* Bottom Progress Overlay */}
            {isPlaying && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900">
                <div
                  className="h-full bg-cyan-400 transition-all"
                  style={{ width: `${animationProgress * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Player controls */}
          <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePlayAnimation}
                className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5"
              >
                {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                {isPlaying ? 'Stop Preview' : 'Play Sequence'}
              </button>
            </div>

            <div className="text-slate-400 font-mono">
              Duration: {branding.durationSec}s | Animation: {branding.animationStyle}
            </div>
          </div>
        </div>

        {/* Right Column: Customization Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Title Sequence Parameters
            </h3>

            <div>
              <label className="block text-slate-400 mb-1">Studio Vanity Name:</label>
              <input
                type="text"
                value={branding.studioName}
                onChange={e => handleUpdate({ studioName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Main Film Title Card:</label>
              <input
                type="text"
                value={branding.titleCard}
                onChange={e => handleUpdate({ titleCard: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Subtitle / Production Credit:</label>
              <input
                type="text"
                value={branding.subtitle}
                onChange={e => handleUpdate({ subtitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Film Tagline / Logline Quote:</label>
              <input
                type="text"
                value={branding.tagline}
                onChange={e => handleUpdate({ tagline: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-slate-400 mb-1">Visual Shader Style:</label>
                <select
                  value={branding.animationStyle}
                  onChange={e => handleUpdate({ animationStyle: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="signal_distortion">Signal Distortion / CRT</option>
                  <option value="cinematic_push">Cinematic Push / Flare</option>
                  <option value="particle_burst">Particle Star Dust</option>
                  <option value="cyberpunk_scanline">Cyberpunk Scanlines</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Audio Stinger FX:</label>
                <select
                  value={branding.soundStinger}
                  onChange={e => handleUpdate({ soundStinger: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="quantum_riser">Quantum Riser (Rise to Drop)</option>
                  <option value="deep_pulse">Sub-Bass Drone Pulse</option>
                  <option value="radio_static">Radio Static Burst</option>
                  <option value="analog_synthesizer">Synthesizer Mystery Chord</option>
                  <option value="none">Muted / Silent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Duration: {branding.durationSec}s</label>
              <input
                type="range"
                min={2}
                max={10}
                step={1}
                value={branding.durationSec}
                onChange={e => handleUpdate({ durationSec: Number(e.target.value) })}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
