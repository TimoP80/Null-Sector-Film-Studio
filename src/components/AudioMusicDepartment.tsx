import React, { useState, useRef } from 'react';
import { FilmProject, SFXCue, MusicCue } from '../types/film';
import { FilmStudioApiClient } from '../services/apiClient';
import { cinemaAudio } from '../utils/audioSynth';
import { 
  Volume2, 
  Music, 
  Play, 
  Square, 
  Plus, 
  Sparkles, 
  Radio, 
  Sliders,
  Activity,
  Layers,
  Download,
  Check,
  Disc,
  Upload,
  Clock,
  Zap,
  CheckCircle2,
  Trash2
} from 'lucide-react';

interface AudioMusicDepartmentProps {
  project: FilmProject;
  onUpdateSFX: (sfx: SFXCue) => void;
  onUpdateMusic: (music: MusicCue) => void;
}

export const AudioMusicDepartment: React.FC<AudioMusicDepartmentProps> = ({
  project,
  onUpdateSFX,
  onUpdateMusic,
}) => {
  const [activeTab, setActiveTab] = useState<'sfx' | 'music' | 'lyria_studio'>('lyria_studio');
  const [playingSfxId, setPlayingSfxId] = useState<string | null>(null);
  const [playingMusicId, setPlayingMusicId] = useState<string | null>(null);

  // Lyria Generation State
  const [lyriaPrompt, setLyriaPrompt] = useState(
    'Intense cinematic sci-fi tension cue, deep sub-bass drone, pulsating modular synthesizer, dissonant string swells, building toward sudden silence.'
  );
  const [lyriaModelType, setLyriaModelType] = useState<'clip' | 'pro'>('clip');
  const [genre, setGenre] = useState('Cinematic Sci-Fi Score');
  const [mood, setMood] = useState('Suspenseful & Atmospheric');
  const [tempoBpm, setTempoBpm] = useState(72);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTrack, setGeneratedTrack] = useState<{
    audioUrl: string;
    model: string;
    lyrics?: string;
    durationSec: number;
    title: string;
  } | null>(null);

  const [isPlayingGenerated, setIsPlayingGenerated] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handlePlaySFX = (cue: SFXCue) => {
    setPlayingSfxId(cue.id);
    cinemaAudio.playCinematicSFX(cue.category);
    setTimeout(() => {
      setPlayingSfxId(null);
    }, (cue.durationSec * 1000) || 2000);
  };

  const handlePlayMusic = (cue: MusicCue) => {
    if (playingMusicId === cue.id) {
      cinemaAudio.stopAllMusic();
      setPlayingMusicId(null);
    } else {
      cinemaAudio.stopAllMusic();
      setPlayingMusicId(cue.id);
      cinemaAudio.playMusicDrone(cue.mood, cue.intensity);
    }
  };

  const handleGenerateLyria = async () => {
    if (!lyriaPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const result = await FilmStudioApiClient.generateMusic({
        prompt: lyriaPrompt,
        type: lyriaModelType,
        genre,
        mood,
        tempoBpm,
      });

      const newTrack = {
        audioUrl: result.audioUrl,
        model: result.model,
        lyrics: result.lyrics,
        durationSec: result.durationSec,
        title: `${genre} - ${mood} (${lyriaModelType === 'pro' ? 'Full Track' : '30s Clip'})`,
      };

      setGeneratedTrack(newTrack);
      setSuccessNotice(`Music cue generated with ${result.model}!`);
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (e: any) {
      console.error('Lyria generation error:', e);
      alert(`Music generation error: ${e.message || 'Check API key or prompt.'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToProjectCues = () => {
    if (!generatedTrack) return;
    const newCue: MusicCue = {
      id: `MUS_LYRIA_${Date.now().toString().slice(-4)}`,
      title: generatedTrack.title,
      description: lyriaPrompt,
      mood: mood.toLowerCase().includes('dark') ? 'dark_drone' : 'tension_pulse',
      bpm: tempoBpm,
      key: 'D Minor',
      instruments: ['Lyria Neural Synthesizer', 'Sub-bass', 'Orchestral Strings'],
      intensity: 0.85,
      durationSec: generatedTrack.durationSec,
    };
    onUpdateMusic(newCue);
    setSuccessNotice(`Added "${newCue.title}" to Project Soundtrack Library!`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const lyriaPresets = [
    { label: 'Deep Space Tension Drone', prompt: 'Deep sub-bass drone, distant radio frequency static, eerie cello sustain, slow breathing pulse.', genre: 'Atmospheric Drone', bpm: 60, mood: 'Claustrophobic' },
    { label: 'Hans Zimmer Climax Swell', prompt: 'Monumental brass swell, driving 16th note synth arpeggios, massive taiko drum impacts.', genre: 'Epic Orchestral', bpm: 120, mood: 'Urgent & Heroic' },
    { label: 'Cyberpunk Neon Stalker', prompt: 'Dark analog synth bassline, crisp electro snare, detuned lead melody, retro-futuristic atmosphere.', genre: 'Dark Synthwave', bpm: 105, mood: 'Relentless' },
    { label: 'Melancholic Piano & Strings', prompt: 'Intimate felt piano motif in minor key, warm weeping solo cello, subtle ambient vinyl texture.', genre: 'Cinematic Minimalist', bpm: 65, mood: 'Emotional & Tragic' },
    { label: 'Alien Signal Pulse', prompt: 'Granular synthesizer textures, microtonal bleeps, rhythmic sub-bass thumps mimicking a heartbeat.', genre: 'Experimental Sci-Fi', bpm: 75, mood: 'Unsettling' },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0A0A0D] text-neutral-100 font-sans">
      {/* Header */}
      <div className="h-14 bg-[#101014] border-b border-[#222228] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-neutral-100">Sound Design & Neural Score Department</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                Lyria 3 (Clip & Pro)
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Generate full orchestral compositions, 30s tension cues, and procedural Web Audio foley
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-[#16161C] rounded-xl p-1 border border-neutral-800 text-xs">
          <button
            onClick={() => setActiveTab('lyria_studio')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'lyria_studio'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Lyria Music Studio</span>
          </button>
          <button
            onClick={() => setActiveTab('music')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'music'
                ? 'bg-neutral-800 text-cyan-300 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span>Score Library ({project.musicCues.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('sfx')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'sfx'
                ? 'bg-neutral-800 text-amber-300 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>SFX Library ({project.sfxCues.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'lyria_studio' ? (
          /* ================= LYRIA 3 GENERATOR STUDIO ================= */
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Settings Panel */}
              <div className="lg:col-span-7 bg-[#121216] border border-[#24242C] rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-[#24242C] pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      Lyria Neural Score Composer
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Synthesize cinematic film scores with Lyria 3 model architecture
                    </p>
                  </div>

                  {/* Clip vs Pro Toggle */}
                  <div className="flex bg-[#1A1A22] rounded-xl p-1 border border-neutral-700 text-xs">
                    <button
                      onClick={() => setLyriaModelType('clip')}
                      className={`px-3 py-1 rounded-lg font-medium transition-all ${
                        lyriaModelType === 'clip'
                          ? 'bg-cyan-500 text-black font-bold shadow'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <span>lyria-3-clip-preview</span>
                      <span className="text-[9px] block opacity-80">(Up to 30s)</span>
                    </button>
                    <button
                      onClick={() => setLyriaModelType('pro')}
                      className={`px-3 py-1 rounded-lg font-medium transition-all ${
                        lyriaModelType === 'pro'
                          ? 'bg-cyan-500 text-black font-bold shadow'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <span>lyria-3-pro-preview</span>
                      <span className="text-[9px] block opacity-80">(Full Track)</span>
                    </button>
                  </div>
                </div>

                {/* Score Description Prompt */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Musical Theme & Instrumentation Prompt
                  </label>
                  <textarea
                    value={lyriaPrompt}
                    onChange={(e) => setLyriaPrompt(e.target.value)}
                    rows={4}
                    placeholder="Describe instruments, harmonic progression, emotional tension, and dramatic timing..."
                    className="w-full bg-[#181820] border border-[#2B2B38] rounded-xl p-3 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-cyan-400 transition-colors resize-none leading-relaxed"
                  />
                </div>

                {/* 1-Click Cinematic Presets */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Cinematic Mood Presets
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {lyriaPresets.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setLyriaPrompt(p.prompt);
                          setGenre(p.genre);
                          setMood(p.mood);
                          setTempoBpm(p.bpm);
                        }}
                        className="p-2.5 rounded-xl bg-[#181820] hover:bg-[#22222C] border border-[#282834] text-left transition-colors"
                      >
                        <div className="text-xs font-bold text-neutral-200">{p.label}</div>
                        <div className="text-[10px] text-cyan-400 font-mono mt-0.5">{p.bpm} BPM · {p.genre}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Granular Sliders (BPM, Mood, Genre) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#24242C]">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                      Tempo (BPM): <span className="text-cyan-400 font-mono">{tempoBpm}</span>
                    </label>
                    <input
                      type="range"
                      min="40"
                      max="160"
                      value={tempoBpm}
                      onChange={(e) => setTempoBpm(Number(e.target.value))}
                      className="w-full accent-cyan-400 bg-neutral-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                      Genre
                    </label>
                    <input
                      type="text"
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      className="w-full bg-[#181820] border border-[#2B2B38] rounded-lg px-2.5 py-1.5 text-xs text-neutral-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                      Emotional Arc
                    </label>
                    <input
                      type="text"
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                      className="w-full bg-[#181820] border border-[#2B2B38] rounded-lg px-2.5 py-1.5 text-xs text-neutral-200"
                    />
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerateLyria}
                  disabled={isGenerating || !lyriaPrompt.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Music className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>
                    {isGenerating 
                      ? `Synthesizing Score with ${lyriaModelType === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview'}...` 
                      : `Generate Score Track (${lyriaModelType === 'pro' ? 'Full Track' : '30s Clip'})`}
                  </span>
                </button>
              </div>

              {/* Right Output & Audition Player Stage */}
              <div className="lg:col-span-5 bg-[#121216] border border-[#24242C] rounded-2xl p-6 flex flex-col justify-between space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2 mb-4">
                    <Disc className="w-4 h-4 text-cyan-400" />
                    Audition Master Player
                  </h3>

                  {generatedTrack ? (
                    <div className="space-y-4">
                      {/* Audio Card */}
                      <div className="p-5 rounded-2xl bg-[#181820] border border-[#2C2C3A] space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {generatedTrack.model}
                          </span>
                          <span className="text-xs font-mono text-neutral-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-neutral-500" />
                            {generatedTrack.durationSec}s
                          </span>
                        </div>

                        <div>
                          <div className="text-base font-bold text-neutral-100">{generatedTrack.title}</div>
                          <div className="text-xs text-neutral-400 mt-1 line-clamp-2">{lyriaPrompt}</div>
                        </div>

                        {/* HTML5 Audio element */}
                        <audio
                          ref={audioPlayerRef}
                          src={generatedTrack.audioUrl}
                          onPlay={() => setIsPlayingGenerated(true)}
                          onPause={() => setIsPlayingGenerated(false)}
                          onEnded={() => setIsPlayingGenerated(false)}
                          className="w-full h-10 rounded-lg accent-cyan-400"
                          controls
                        />

                        {/* Animated Waveform Indicator */}
                        <div className="flex items-end justify-between h-8 px-2 py-1 bg-[#101015] rounded-xl border border-[#22222C]">
                          {[25, 45, 80, 60, 100, 75, 40, 90, 65, 30, 85, 95, 50, 70, 45, 60, 85, 35, 90, 75, 40].map((h, i) => (
                            <div
                              key={i}
                              className={`w-1 rounded-full transition-all duration-150 ${
                                isPlayingGenerated ? 'bg-cyan-400 animate-pulse' : 'bg-neutral-700'
                              }`}
                              style={{
                                height: isPlayingGenerated ? `${Math.max(4, (h / 100) * 28)}px` : '4px',
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={handleSaveToProjectCues}
                          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          <span>Attach to Project Score Library</span>
                        </button>

                        <button
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = generatedTrack.audioUrl;
                            a.download = `lyria_score_${Date.now()}.wav`;
                            a.click();
                          }}
                          className="w-full py-2.5 bg-[#1E1E28] hover:bg-[#282836] text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700 flex items-center justify-center gap-2 transition-colors"
                        >
                          <Download className="w-4 h-4 text-cyan-400" />
                          <span>Download Master WAV</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-16 text-center text-neutral-500 space-y-3">
                      <Disc className="w-12 h-12 mx-auto text-neutral-700 stroke-[1.5] animate-spin-slow" />
                      <p className="text-sm font-medium">Ready to Synthesize</p>
                      <p className="text-xs text-neutral-600 max-w-xs mx-auto">
                        Select Lyria 3 Clip (30s) or Pro (Full track), craft your prompt, and audition master cues.
                      </p>
                    </div>
                  )}
                </div>

                {successNotice && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successNotice}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'music' ? (
          /* ================= SCORE LIBRARY ================= */
          <div className="space-y-4 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-neutral-200">Neural Score & Music Themes (Project Cues)</h2>
                <p className="text-xs text-neutral-500">Master motifs and soundtrack stems attached to current scenes and timeline.</p>
              </div>
              <button
                onClick={() => setActiveTab('lyria_studio')}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Compose New with Lyria</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.musicCues.map((music) => {
                const isPlaying = playingMusicId === music.id;
                return (
                  <div
                    key={music.id}
                    className="p-5 bg-[#121216] border border-[#24242C] rounded-2xl space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-400">{music.id}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-300 border border-neutral-800">
                          {music.bpm} BPM
                        </span>
                      </div>
                      <span className="text-xs font-mono text-neutral-400">{music.durationSec}s</span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-neutral-100">{music.title}</h3>
                      <p className="text-xs text-neutral-400 mt-1">{music.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-1 text-[10px] text-neutral-400">
                      {music.instruments.map((inst, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-[#181820] border border-neutral-800 text-neutral-300">
                          {inst}
                        </span>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-[#24242C] flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
                        <span>Intensity: {Math.round(music.intensity * 100)}%</span>
                      </div>

                      <button
                        onClick={() => handlePlayMusic(music)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                          isPlaying 
                            ? 'bg-cyan-500 text-neutral-950' 
                            : 'bg-neutral-800 hover:bg-neutral-700 text-cyan-300 border border-cyan-500/40'
                        }`}
                      >
                        {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isPlaying ? 'Stop Cue' : 'Audition Score Motif'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ================= SFX LIBRARY ================= */
          <div className="space-y-4 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-neutral-200">Cinematic Sound Effects & Foley Stems</h2>
                <p className="text-xs text-neutral-500">Real-time Web Audio synthesis engine for atmospheric layers and cinematic impacts.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.sfxCues.map((sfx) => {
                const isPlaying = playingSfxId === sfx.id;
                return (
                  <div
                    key={sfx.id}
                    className="p-4 bg-[#121216] border border-[#24242C] rounded-2xl space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-amber-400">{sfx.id}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-400 border border-neutral-800 uppercase">
                          {sfx.category}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-neutral-100 mt-1">{sfx.name}</h3>
                      <p className="text-xs text-neutral-400 mt-0.5">{sfx.description}</p>
                    </div>

                    <div className="pt-3 border-t border-[#24242C] flex items-center justify-between">
                      <span className="text-xs font-mono text-neutral-500">{sfx.durationSec}s</span>
                      <button
                        onClick={() => handlePlaySFX(sfx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          isPlaying 
                            ? 'bg-amber-500 text-neutral-950' 
                            : 'bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        <Play className={`w-3.5 h-3.5 ${isPlaying ? 'fill-current' : ''}`} />
                        <span>{isPlaying ? 'Auditioning...' : 'Play SFX'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
