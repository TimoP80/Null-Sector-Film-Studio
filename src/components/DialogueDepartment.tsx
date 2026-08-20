import React, { useState, useRef, useEffect } from 'react';
import { FilmProject, DialogueSegment, DialogueTake } from '../types/film';
import { FilmStudioApiClient } from '../services/apiClient';
import { cinemaAudio } from '../utils/audioSynth';
import { 
  MessageSquareQuote, 
  Volume2, 
  Sparkles, 
  Play, 
  Pause, 
  Square, 
  CheckCircle2, 
  Plus, 
  Mic, 
  Sliders,
  Check,
  Download,
  Trash2,
  Star,
  RefreshCw,
  Layers,
  Radio,
  Clock,
  Film,
  Zap
} from 'lucide-react';

interface DialogueDepartmentProps {
  project: FilmProject;
  onUpdateDialogue: (segment: DialogueSegment) => void;
  onCreateDialogue: (segment: Partial<DialogueSegment>) => void;
  onDeleteDialogue?: (segmentId: string) => void;
}

const PREBUILT_VOICES: Array<{
  name: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  description: string;
  tag: string;
}> = [
  { name: 'Kore', description: 'Warm, expressive, natural narrative lead', tag: 'Lead & Emotive' },
  { name: 'Puck', description: 'Crisp, articulate, sharp, energetic delivery', tag: 'Clear & Direct' },
  { name: 'Charon', description: 'Deep, resonant, baritone authority', tag: 'Gravel & Resonant' },
  { name: 'Fenrir', description: 'Intense, rugged, dramatic texture', tag: 'Dramatic Weight' },
  { name: 'Zephyr', description: 'Soft, atmospheric, ethereal whisper', tag: 'Subtle & Air' },
];

export const DialogueDepartment: React.FC<DialogueDepartmentProps> = ({
  project,
  onUpdateDialogue,
  onCreateDialogue,
  onDeleteDialogue,
}) => {
  const [selectedId, setSelectedId] = useState<string>(project.dialogueSegments[0]?.id || '');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playingTakeId, setPlayingTakeId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [filterCharacter, setFilterCharacter] = useState<string>('ALL');

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const selectedSegment = project.dialogueSegments.find(d => d.id === selectedId) || project.dialogueSegments[0];

  // Stop audio when unmounting or switching segment
  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      cinemaAudio.stopAll();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Update canvas waveform visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = canvas.parentElement?.clientWidth || 400;
    let height = canvas.height = 64;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const numBars = 48;
      const barWidth = (width / numBars) - 2;
      const progress = duration > 0 ? currentTime / duration : 0;

      for (let i = 0; i < numBars; i++) {
        const barProgress = i / numBars;
        const isPast = barProgress <= progress;

        // Waveform shape (dynamic pseudo-spectral curve + live jitter when playing)
        let barHeight = (Math.sin(i * 0.28) * 0.35 + Math.cos(i * 0.15) * 0.25 + 0.45) * (height * 0.7);
        if (isPlayingAudio && isPast) {
          barHeight += Math.sin(Date.now() * 0.01 + i) * 6;
        }
        barHeight = Math.max(4, Math.min(height - 6, barHeight));

        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;

        if (isPast) {
          ctx.fillStyle = isPlayingAudio ? '#10b981' : '#059669'; // Emerald
        } else {
          ctx.fillStyle = '#334155'; // Slate dark
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      if (isPlayingAudio) {
        animationFrameRef.current = requestAnimationFrame(draw);
      }
    };

    draw();
  }, [isPlayingAudio, currentTime, duration, selectedSegment?.id]);

  const handlePlayMasterAudio = (audioUrl?: string, takeId?: string) => {
    const targetUrl = audioUrl || selectedSegment?.audioUrl;
    if (!targetUrl) {
      // If no rendered master audio exists yet, do quick audition
      if (selectedSegment) handleQuickAudition(selectedSegment);
      return;
    }

    if (isPlayingAudio) {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      setIsPlayingAudio(false);
      setPlayingTakeId(null);
      return;
    }

    setIsPlayingAudio(true);
    setPlayingTakeId(takeId || 'master');

    const audio = cinemaAudio.playAudioUrl(targetUrl, () => {
      setIsPlayingAudio(false);
      setPlayingTakeId(null);
      setCurrentTime(0);
    });

    audioElementRef.current = audio;

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || selectedSegment?.durationSec || 3.0);
    };

    audio.onloadedmetadata = () => {
      setDuration(audio.duration || selectedSegment?.durationSec || 3.0);
    };
  };

  const handleQuickAudition = (segment: DialogueSegment) => {
    const character = project.characters.find(c => c.id === segment.characterId);
    const voice = segment.voiceId || character?.prebuiltVoiceName || 'Kore';

    setIsPlayingAudio(true);
    setPlayingTakeId('quick');

    cinemaAudio.speakDialogue(segment.text, voice, segment.emotion, () => {
      setIsPlayingAudio(false);
      setPlayingTakeId(null);
    });
  };

  const handleGenerateTTS = async (segment: DialogueSegment) => {
    setIsGeneratingTTS(true);
    try {
      const character = project.characters.find(c => c.id === segment.characterId);
      const voice = (segment.voiceId || character?.prebuiltVoiceName || 'Kore') as 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
      
      const ttsResult = await FilmStudioApiClient.generateTTS(
        segment.text,
        voice,
        segment.emotion,
        segment.delivery
      );

      const audioUrl = ttsResult.audioUrl;
      const dur = ttsResult.durationSec || 3.0;

      const newTake: DialogueTake = {
        id: `take_d_${Date.now()}`,
        takeNumber: (segment.takes?.length || 0) + 1,
        audioUrl,
        createdAt: new Date().toISOString(),
        approved: true,
        isMaster: true,
      };

      const updatedTakes = [newTake, ...(segment.takes || []).map(t => ({ ...t, isMaster: false }))];

      const updatedSegment: DialogueSegment = {
        ...segment,
        audioUrl,
        durationSec: dur,
        estimatedDurationSec: dur,
        voiceName: voice,
        status: 'approved',
        takes: updatedTakes
      };

      onUpdateDialogue(updatedSegment);

      // Auto play the freshly rendered master audio
      setTimeout(() => {
        handlePlayMasterAudio(audioUrl, newTake.id);
      }, 200);

    } catch (e: any) {
      console.error('Error in handleGenerateTTS:', e);
      handleQuickAudition(segment);
    } finally {
      setIsGeneratingTTS(false);
    }
  };

  const handleBatchRenderAll = async () => {
    const pendingLines = project.dialogueSegments;
    if (pendingLines.length === 0) return;

    setIsBatchGenerating(true);
    setBatchProgress({ current: 0, total: pendingLines.length });

    for (let i = 0; i < pendingLines.length; i++) {
      const segment = pendingLines[i];
      setBatchProgress({ current: i + 1, total: pendingLines.length });
      try {
        const character = project.characters.find(c => c.id === segment.characterId);
        const voice = (segment.voiceId || character?.prebuiltVoiceName || 'Kore') as 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
        
        const ttsResult = await FilmStudioApiClient.generateTTS(
          segment.text,
          voice,
          segment.emotion,
          segment.delivery
        );

        const newTake: DialogueTake = {
          id: `take_d_${Date.now()}_${i}`,
          takeNumber: (segment.takes?.length || 0) + 1,
          audioUrl: ttsResult.audioUrl,
          createdAt: new Date().toISOString(),
          approved: true,
          isMaster: true,
        };

        onUpdateDialogue({
          ...segment,
          audioUrl: ttsResult.audioUrl,
          durationSec: ttsResult.durationSec,
          voiceName: voice,
          status: 'approved',
          takes: [newTake, ...(segment.takes || []).map(t => ({ ...t, isMaster: false }))]
        });
      } catch (err) {
        console.warn('Batch render line error:', err);
      }
    }

    setIsBatchGenerating(false);
  };

  const handleDownloadWav = (audioUrl: string, name: string) => {
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `${name.replace(/[^a-z0-9]/gi, '_')}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredSegments = filterCharacter === 'ALL'
    ? project.dialogueSegments
    : project.dialogueSegments.filter(d => d.characterId === filterCharacter);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-neutral-950 text-neutral-100">
      {/* Header Bar */}
      <div className="h-12 bg-neutral-900/90 border-b border-neutral-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-neutral-200 text-xs font-semibold">
          <MessageSquareQuote className="w-4 h-4 text-emerald-400" />
          <span>Dialogue & Voice Performance Studio</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
            Gemini Flash Audio TTS
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleBatchRenderAll}
            disabled={isBatchGenerating || project.dialogueSegments.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-400 ${isBatchGenerating ? 'animate-spin' : ''}`} />
            <span>
              {isBatchGenerating 
                ? `Rendering (${batchProgress.current}/${batchProgress.total})...` 
                : 'Batch Render All Lines'}
            </span>
          </button>

          <button
            onClick={() => {
              const newSeg: DialogueSegment = {
                id: `DLG_${Date.now().toString().slice(-4)}`,
                sceneId: project.scenes[0]?.id || 'S01',
                characterId: project.characters[0]?.id || 'CHAR_01',
                text: 'We are out of time. Initialize the sequence immediately.',
                emotion: 'resolute urgency',
                delivery: 'controlled cinematic whisper',
                estimatedDurationSec: 3.5,
                voiceName: 'Kore',
                status: 'pending',
                takes: []
              };
              onCreateDialogue(newSeg);
              setSelectedId(newSeg.id);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Dialogue Line</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Script Queue */}
        <div className="w-96 bg-neutral-900/60 border-r border-neutral-800 flex flex-col shrink-0 overflow-hidden">
          {/* Character Filter Bar */}
          <div className="p-3 border-b border-neutral-800 flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
              Script Queue ({project.dialogueSegments.length})
            </span>
            <select
              value={filterCharacter}
              onChange={(e) => setFilterCharacter(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Characters</option>
              {project.characters.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredSegments.map((segment) => {
              const isSelected = segment.id === selectedId;
              const character = project.characters.find(c => c.id === segment.characterId);
              const scene = project.scenes.find(s => s.id === segment.sceneId);
              const isPlaying = isPlayingAudio && (selectedSegment?.id === segment.id);
              const hasAudio = !!segment.audioUrl;

              return (
                <div
                  key={segment.id}
                  onClick={() => setSelectedId(segment.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all space-y-2 ${
                    isSelected
                      ? 'bg-neutral-800/90 border-emerald-500/60 shadow-lg'
                      : 'bg-neutral-950/70 border-neutral-800 hover:bg-neutral-900/80 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                        {character?.name?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-neutral-100">{character?.name || 'Unknown Character'}</div>
                        <div className="text-[10px] font-mono text-neutral-500">Scene #{scene?.sceneNumber || '01'} • {segment.id}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {hasAudio ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Take Ready
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-neutral-900 text-neutral-500 border border-neutral-800">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-neutral-300 font-mono italic line-clamp-2">
                    "{segment.text}"
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1.5 border-t border-neutral-800/60">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-400/90 font-mono">[{segment.emotion}]</span>
                      <span className="text-neutral-500">• Voice: {segment.voiceName || character?.prebuiltVoiceName || 'Kore'}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(segment.id);
                        if (segment.audioUrl) {
                          handlePlayMasterAudio(segment.audioUrl);
                        } else {
                          handleQuickAudition(segment);
                        }
                      }}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        isPlaying && isSelected
                          ? 'bg-emerald-500 text-neutral-950'
                          : 'bg-neutral-800 text-cyan-400 hover:bg-neutral-700'
                      }`}
                    >
                      {isPlaying && isSelected ? (
                        <>
                          <Square className="w-2.5 h-2.5 fill-current" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-2.5 h-2.5" />
                          <span>{hasAudio ? 'Audition' : 'Preview'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Line Inspector & Audition Deck */}
        {selectedSegment ? (
          <div className="flex-1 overflow-y-auto p-6 bg-neutral-950 space-y-6">
            {/* Top Card: Line Metadata & Master Audio Audition Deck */}
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 space-y-6 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/30">
                      {selectedSegment.id}
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">
                      Scene #{project.scenes.find(s => s.id === selectedSegment.sceneId)?.sceneNumber || '01'}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-neutral-100 mt-1">
                    {project.characters.find(c => c.id === selectedSegment.characterId)?.name}
                  </h2>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => handleQuickAudition(selectedSegment)}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-2 transition-all"
                  >
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                    <span>Quick Voice Test</span>
                  </button>

                  <button
                    onClick={() => handleGenerateTTS(selectedSegment)}
                    disabled={isGeneratingTTS}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 flex items-center gap-2 shadow-lg hover:shadow-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 ${isGeneratingTTS ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingTTS ? 'Synthesizing Performance...' : 'Render Master TTS Take'}</span>
                  </button>
                </div>
              </div>

              {/* Spoken Dialogue Text Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-neutral-400 uppercase tracking-wider text-[10px] font-bold">
                    Spoken Dialogue Line (Screenplay Text)
                  </label>
                  <span className="text-[10px] font-mono text-neutral-500">
                    Est. Duration: ~{selectedSegment.estimatedDurationSec || ((selectedSegment.text.length * 0.065).toFixed(1))}s
                  </span>
                </div>
                <textarea
                  value={selectedSegment.text}
                  onChange={(e) => onUpdateDialogue({ ...selectedSegment, text: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-neutral-100 font-mono text-sm leading-relaxed focus:border-emerald-500 focus:outline-none"
                  rows={3}
                />
              </div>

              {/* Master Audio Take Player / Waveform Deck */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Radio className={`w-4 h-4 ${selectedSegment.audioUrl ? 'text-emerald-400' : 'text-neutral-600'}`} />
                    <span className="font-bold text-neutral-200">
                      {selectedSegment.audioUrl ? 'Master Audio Take Deck (WAV)' : 'No Rendered Master Take Yet'}
                    </span>
                    {selectedSegment.audioUrl && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                        24kHz 16-Bit Studio Audio
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedSegment.audioUrl && (
                      <button
                        onClick={() => handleDownloadWav(selectedSegment.audioUrl!, `${selectedSegment.id}_Master_Take`)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 text-xs transition-colors"
                        title="Download standard WAV audio file"
                      >
                        <Download className="w-3 h-3 text-cyan-400" />
                        <span>Download .WAV</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Canvas Waveform Display */}
                <div className="w-full h-16 bg-neutral-900/90 rounded-lg overflow-hidden relative border border-neutral-800 flex items-center px-3">
                  <canvas ref={canvasRef} className="w-full h-full" />
                  {!selectedSegment.audioUrl && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-500 bg-neutral-950/60 backdrop-blur-[1px]">
                      Click "Render Master TTS Take" to synthesize full neural performance
                    </div>
                  )}
                </div>

                {/* Playback Controls & Timecode */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handlePlayMasterAudio(selectedSegment.audioUrl)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isPlayingAudio && playingTakeId === 'master'
                          ? 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400'
                          : 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700 border border-neutral-700'
                      }`}
                    >
                      {isPlayingAudio && playingTakeId === 'master' ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      )}
                    </button>

                    <div>
                      <div className="text-xs font-mono font-bold text-neutral-200">
                        {formatSeconds(currentTime)} / {formatSeconds(duration || selectedSegment.durationSec || 3.0)}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        Voice: <strong className="text-neutral-300">{selectedSegment.voiceName || 'Kore'}</strong> • Subtext: [{selectedSegment.emotion}]
                      </div>
                    </div>
                  </div>

                  {selectedSegment.audioUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                        <Check className="w-3.5 h-3.5" /> Approved Master Audio
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Voice Timbre & Performance Delivery Config */}
              <div className="space-y-4 pt-2 border-t border-neutral-800">
                <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Voice Timbre & Performance Direction</span>
                </div>

                {/* Voice Preset Selector Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {PREBUILT_VOICES.map((v) => {
                    const isSelectedVoice = (selectedSegment.voiceName || 'Kore') === v.name;
                    return (
                      <div
                        key={v.name}
                        onClick={() => {
                          onUpdateDialogue({ ...selectedSegment, voiceName: v.name });
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all text-left ${
                          isSelectedVoice
                            ? 'bg-emerald-950/40 border-emerald-500/70 shadow'
                            : 'bg-neutral-950 border-neutral-800 hover:bg-neutral-900 text-neutral-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold ${isSelectedVoice ? 'text-emerald-400' : 'text-neutral-200'}`}>
                            {v.name}
                          </span>
                          {isSelectedVoice && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <div className="text-[10px] text-neutral-400 leading-snug">{v.description}</div>
                        <div className="mt-2 text-[9px] font-mono text-neutral-500 bg-neutral-900 px-1.5 py-0.5 rounded inline-block">
                          {v.tag}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Emotion & Delivery Subtext */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-neutral-400 uppercase tracking-wider text-[10px] font-bold">
                      Emotional Subtext Prompt
                    </label>
                    <input
                      type="text"
                      value={selectedSegment.emotion}
                      onChange={(e) => onUpdateDialogue({ ...selectedSegment, emotion: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 focus:border-emerald-500 focus:outline-none"
                      placeholder="e.g. quiet realization, controlled dread, cold sarcasm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-neutral-400 uppercase tracking-wider text-[10px] font-bold">
                      Delivery Cadence & Acoustics
                    </label>
                    <input
                      type="text"
                      value={selectedSegment.delivery}
                      onChange={(e) => onUpdateDialogue({ ...selectedSegment, delivery: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 focus:border-emerald-500 focus:outline-none"
                      placeholder="e.g. restrained cinematic whisper, hurried breath, close-mic"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Takes History Card */}
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-neutral-200">
                    Rendered Takes History ({selectedSegment.takes?.length || 0})
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-neutral-500">
                  Switch or audition alternative neural performances
                </span>
              </div>

              {selectedSegment.takes && selectedSegment.takes.length > 0 ? (
                <div className="space-y-2">
                  {selectedSegment.takes.map((take, idx) => {
                    const isMaster = take.audioUrl === selectedSegment.audioUrl || take.isMaster;
                    const isPlayingTake = isPlayingAudio && playingTakeId === take.id;

                    return (
                      <div
                        key={take.id}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                          isMaster
                            ? 'bg-neutral-950 border-emerald-500/50 shadow'
                            : 'bg-neutral-950/70 border-neutral-800/80 hover:bg-neutral-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handlePlayMasterAudio(take.audioUrl, take.id)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                              isPlayingTake
                                ? 'bg-emerald-500 text-neutral-950'
                                : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                            }`}
                          >
                            {isPlayingTake ? (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-neutral-200">Take #{take.takeNumber || idx + 1}</span>
                              {isMaster && (
                                <span className="text-[9px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold uppercase">
                                  Master
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-neutral-500">
                              {new Date(take.createdAt).toLocaleTimeString()} • {take.durationSec ? `${take.durationSec}s` : 'WAV Format'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDownloadWav(take.audioUrl, `${selectedSegment.id}_Take_${take.takeNumber || idx + 1}`)}
                            className="p-1.5 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                            title="Download WAV"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {!isMaster && (
                            <button
                              onClick={() => {
                                onUpdateDialogue({
                                  ...selectedSegment,
                                  audioUrl: take.audioUrl,
                                  takes: selectedSegment.takes?.map(t => ({
                                    ...t,
                                    isMaster: t.id === take.id
                                  }))
                                });
                              }}
                              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-emerald-950 hover:text-emerald-400 border border-neutral-700 text-[10px] font-semibold text-neutral-300 transition-colors"
                            >
                              Make Master
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-neutral-500 text-xs bg-neutral-950/40 rounded-xl border border-dashed border-neutral-800">
                  No previous takes recorded for this line. Click "Render Master TTS Take" above to record Take #1.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

