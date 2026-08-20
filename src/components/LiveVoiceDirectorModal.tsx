import React, { useState, useEffect, useRef } from 'react';
import { FilmProject } from '../types/film';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Radio, 
  Sparkles, 
  X, 
  RotateCcw, 
  Play, 
  Square,
  Flame,
  Film,
  Camera,
  Layers,
  MessageSquare
} from 'lucide-react';

interface LiveVoiceDirectorModalProps {
  project: FilmProject;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: string) => void;
}

interface TranscriptItem {
  id: string;
  sender: 'user' | 'director';
  text: string;
  timestamp: string;
}

export const LiveVoiceDirectorModal: React.FC<LiveVoiceDirectorModalProps> = ({
  project,
  isOpen,
  onClose,
  onNavigateToTab,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDirectorSpeaking, setIsDirectorSpeaking] = useState(false);
  const [mode, setMode] = useState<'open_mic' | 'push_to_talk'>('open_mic');
  const [isPushActive, setIsPushActive] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([
    {
      id: 'init',
      sender: 'director',
      text: `Live Voice Director ready. I am tracking "${project.title}" with ${project.scenes.length} scenes and ${project.shots.length} shots. Speak to me directly about shot framing, pacing, or scene blocking.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [directorLevel, setDirectorLevel] = useState<number>(0);
  const [textInput, setTextInput] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Connect / Disconnect WebSocket & Mic
  const connectLive = async () => {
    if (wsRef.current) return;
    setIsConnecting(true);

    try {
      // 1. Setup Web Audio for output (24kHz standard for Live API)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 24000 });
      audioContextRef.current = audioCtx;
      nextPlayTimeRef.current = audioCtx.currentTime;

      // 2. Setup Mic capture at 16kHz
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // Audio recording processor (convert to 16kHz PCM)
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isMuted || (mode === 'push_to_talk' && !isPushActive)) {
          setMicLevel(0);
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);
        
        // Calculate mic level for visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += Math.abs(inputData[i]);
        }
        const avg = sum / inputData.length;
        setMicLevel(Math.min(1, avg * 8));

        // Convert float32 to int16 PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Convert to base64
        const buffer = pcm16.buffer;
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Audio = btoa(binary);

        // Send to WebSocket
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'audio_chunk',
              audio: base64Audio,
            })
          );
        }
      };

      source.connect(processor);
      processor.connect(inputCtx.destination);

      // 3. Connect WebSocket to backend /api/live
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'audio' && msg.audio) {
            playAudioChunk(msg.audio);
          } else if (msg.type === 'transcript' && msg.text) {
            setTranscripts((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.sender === msg.sender && Date.now() - parseInt(last.id.split('_')[1] || '0') < 4000) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: last.text + ' ' + msg.text },
                ];
              }
              return [
                ...prev,
                {
                  id: `tr_${Date.now()}`,
                  sender: msg.sender || 'director',
                  text: msg.text,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ];
            });
          } else if (msg.type === 'interrupted') {
            stopAllAudio();
            setIsDirectorSpeaking(false);
            setDirectorLevel(0);
          } else if (msg.type === 'turnComplete') {
            setTimeout(() => {
              setIsDirectorSpeaking(false);
              setDirectorLevel(0);
            }, 500);
          }
        } catch (e) {
          console.error('Error handling WS message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;
      };

      ws.onerror = (e) => {
        console.warn('WS error:', e);
        setIsConnected(false);
        setIsConnecting(false);
      };
    } catch (err: any) {
      console.error('Could not connect live mic:', err);
      setIsConnecting(false);
      alert(`Microphone access error: ${err.message || 'Please check mic permissions.'}`);
    }
  };

  const disconnectLive = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    stopAllAudio();
    setIsConnected(false);
    setIsConnecting(false);
    setIsDirectorSpeaking(false);
    setMicLevel(0);
    setDirectorLevel(0);
  };

  const playAudioChunk = (base64Audio: string) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    try {
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);

      const buffer = ctx.createBuffer(1, pcm16.length, 24000);
      const channelData = buffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < pcm16.length; i++) {
        channelData[i] = pcm16[i] / 32768.0;
        sum += Math.abs(channelData[i]);
      }

      setDirectorLevel(Math.min(1, (sum / pcm16.length) * 6));
      setIsDirectorSpeaking(true);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startTime = Math.max(now, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + buffer.duration;

      activeSourcesRef.current.push(source);
      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
        if (activeSourcesRef.current.length === 0) {
          setIsDirectorSpeaking(false);
          setDirectorLevel(0);
        }
      };
    } catch (e) {
      console.warn('Error playing audio chunk:', e);
    }
  };

  const stopAllAudio = () => {
    activeSourcesRef.current.forEach((s) => {
      try {
        s.stop();
        s.disconnect();
      } catch (e) {}
    });
    activeSourcesRef.current = [];
    if (audioContextRef.current) {
      nextPlayTimeRef.current = audioContextRef.current.currentTime;
    }
  };

  const handleSendText = (textToSend?: string) => {
    const q = textToSend || textInput;
    if (!q.trim()) return;

    setTranscripts((prev) => [
      ...prev,
      {
        id: `usr_${Date.now()}`,
        sender: 'user',
        text: q,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'text_input',
          text: q,
        })
      );
    }

    if (!textToSend) setTextInput('');
  };

  // Auto connect when opened
  useEffect(() => {
    if (isOpen && !isConnected && !isConnecting) {
      connectLive();
    }
    return () => {
      if (!isOpen && isConnected) {
        disconnectLive();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const quickDirectorPrompts = [
    'How should we block Scene 4 for maximum tension?',
    'Review lighting continuity between Scene 1 and 2',
    'Suggest lens selection for the character close-up',
    'How can we improve the pacing of the rough cut?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[88vh] bg-[#0A0A0C] border border-[#26262B] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-neutral-100 font-sans">
        {/* Header */}
        <div className="h-16 bg-[#111115] border-b border-[#26262B] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Radio className={`w-5 h-5 ${isConnected ? 'animate-pulse text-amber-400' : 'text-neutral-500'}`} />
              {isConnected && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#111115]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-100">Live Voice Director</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                  gemini-3.1-flash-live-preview
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono">
                  Voice: Zephyr (24kHz)
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Real-time spoken dialogue with your virtual Hollywood Director & Continuity Supervisor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isConnected ? (
              <button
                onClick={disconnectLive}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Disconnect</span>
              </button>
            ) : (
              <button
                onClick={connectLive}
                disabled={isConnecting}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isConnecting ? 'Connecting...' : 'Connect Live Voice'}</span>
              </button>
            )}

            <button
              onClick={() => {
                disconnectLive();
                onClose();
              }}
              className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visual Director Stage / Waveform Display */}
        <div className="h-56 bg-gradient-to-b from-[#111115] via-[#0E0E12] to-[#0A0A0C] border-b border-[#222226] p-6 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Background Glows */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-around opacity-30">
            <div className={`w-64 h-64 rounded-full blur-3xl transition-all duration-300 ${isDirectorSpeaking ? 'bg-amber-500/40 scale-125' : 'bg-amber-500/10 scale-90'}`} />
            <div className={`w-64 h-64 rounded-full blur-3xl transition-all duration-300 ${micLevel > 0.1 ? 'bg-cyan-500/40 scale-125' : 'bg-cyan-500/10 scale-90'}`} />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            {/* Director Audio Orb */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
                  isDirectorSpeaking 
                    ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.35)] scale-105' 
                    : 'bg-neutral-900 border-neutral-700'
                }`}>
                  <Film className={`w-8 h-8 ${isDirectorSpeaking ? 'text-amber-300 animate-bounce' : 'text-neutral-500'}`} />
                </div>
                {isDirectorSpeaking && (
                  <span className="absolute -bottom-2 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-black uppercase tracking-wider">
                    Speaking
                  </span>
                )}
              </div>
              <div>
                <div className="text-sm font-bold text-neutral-200">Director Audio Output</div>
                <div className="text-xs text-neutral-400">
                  {isDirectorSpeaking ? 'Streaming 24kHz synthesized speech' : 'Listening for your input...'}
                </div>
                {/* Director Waveform bars */}
                <div className="flex items-end gap-1 h-6 mt-2">
                  {[40, 70, 90, 60, 100, 80, 50, 95, 75, 45, 85, 65].map((h, i) => (
                    <div
                      key={i}
                      className={`w-1.5 rounded-full transition-all duration-75 ${
                        isDirectorSpeaking ? 'bg-amber-400' : 'bg-neutral-800'
                      }`}
                      style={{
                        height: isDirectorSpeaking ? `${Math.max(6, h * directorLevel)}px` : '4px',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* User Microphone Status */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-bold text-neutral-200">Your Microphone</div>
                <div className="text-xs text-neutral-400">
                  {isMuted ? 'Mic Muted' : mode === 'push_to_talk' && !isPushActive ? 'Hold button to speak' : 'Active 16kHz audio stream'}
                </div>
                {/* User Mic Waveform bars */}
                <div className="flex items-end justify-end gap-1 h-6 mt-2">
                  {[50, 80, 60, 95, 70, 100, 65, 85, 45, 90, 75, 55].map((h, i) => (
                    <div
                      key={i}
                      className={`w-1.5 rounded-full transition-all duration-75 ${
                        micLevel > 0.05 ? 'bg-cyan-400' : 'bg-neutral-800'
                      }`}
                      style={{
                        height: micLevel > 0.05 ? `${Math.max(6, h * micLevel)}px` : '4px',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
                  micLevel > 0.1 
                    ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.35)] scale-105' 
                    : isMuted 
                    ? 'bg-rose-500/10 border-rose-500/30' 
                    : 'bg-neutral-900 border-neutral-700'
                }`}>
                  {isMuted ? (
                    <MicOff className="w-8 h-8 text-rose-400" />
                  ) : (
                    <Mic className={`w-8 h-8 ${micLevel > 0.1 ? 'text-cyan-300' : 'text-neutral-400'}`} />
                  )}
                </div>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`absolute -bottom-2 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    isMuted ? 'bg-rose-500 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {isMuted ? 'UNMUTE' : 'MUTE'}
                </button>
              </div>
            </div>
          </div>

          {/* Mode Selector & Push to Talk Controls */}
          <div className="relative z-10 flex items-center justify-between pt-3 border-t border-[#222226]">
            <div className="flex items-center gap-2 bg-[#17171C] p-1 rounded-xl border border-neutral-800 text-xs">
              <button
                onClick={() => setMode('open_mic')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  mode === 'open_mic' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Continuous Open Mic
              </button>
              <button
                onClick={() => setMode('push_to_talk')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  mode === 'push_to_talk' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Push-to-Talk
              </button>
            </div>

            {mode === 'push_to_talk' && (
              <button
                onMouseDown={() => setIsPushActive(true)}
                onMouseUp={() => setIsPushActive(false)}
                onTouchStart={() => setIsPushActive(true)}
                onTouchEnd={() => setIsPushActive(false)}
                className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all select-none ${
                  isPushActive 
                    ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.6)] scale-95' 
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                }`}
              >
                {isPushActive ? 'Transmitting Audio (Release to Send)' : 'Hold Space / Click to Speak'}
              </button>
            )}

            <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Direct Audio Link Active</span>
            </div>
          </div>
        </div>

        {/* Live Conversation Transcript Feed */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#0A0A0C]">
          {transcripts.map((t) => {
            const isDir = t.sender === 'director';
            return (
              <div
                key={t.id}
                className={`flex gap-3 max-w-2xl ${isDir ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${
                  isDir ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}>
                  {isDir ? 'DIR' : 'YOU'}
                </div>
                <div className={`p-4 rounded-2xl text-xs leading-relaxed border ${
                  isDir 
                    ? 'bg-[#141418] border-[#26262D] text-neutral-200 rounded-tl-none' 
                    : 'bg-cyan-950/40 border-cyan-900/50 text-cyan-100 rounded-tr-none'
                }`}>
                  <div className="flex items-center justify-between gap-4 mb-1 text-[10px] text-neutral-500">
                    <span className="font-semibold text-neutral-400">{isDir ? 'AI Director (Zephyr)' : 'You'}</span>
                    <span>{t.timestamp}</span>
                  </div>
                  <p>{t.text}</p>
                </div>
              </div>
            );
          })}
          <div ref={transcriptEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-6 py-2 bg-[#0E0E12] border-t border-[#222226] flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] uppercase font-bold text-neutral-500 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> Prompts:
          </span>
          {quickDirectorPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendText(q)}
              className="text-xs px-3 py-1 rounded-full bg-[#1A1A20] hover:bg-[#252530] text-neutral-300 hover:text-white border border-[#2D2D38] whitespace-nowrap transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Text Fallback Input Bar */}
        <div className="p-4 bg-[#111115] border-t border-[#26262B] flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendText();
              }}
              placeholder="Type or speak to the Director in real time..."
              className="w-full bg-[#1A1A20] border border-[#2A2A35] rounded-xl px-4 py-2.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          <button
            onClick={() => handleSendText()}
            disabled={!textInput.trim()}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
          >
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
