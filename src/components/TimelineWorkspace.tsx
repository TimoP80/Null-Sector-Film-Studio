import React, { useState, useEffect, useRef } from 'react';
import { FilmProject, TimelineTrack, TimelineClip } from '../types/film';
import { cinemaAudio } from '../utils/audioSynth';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  Film, 
  Scissors, 
  Volume2, 
  Layers, 
  Sparkles, 
  ZoomIn, 
  ZoomOut,
  Maximize2,
  Trash2,
  Sliders
} from 'lucide-react';

interface TimelineWorkspaceProps {
  project: FilmProject;
  onUpdateTracks: (tracks: TimelineTrack[]) => void;
  onOpenAIEditor: () => void;
}

export const TimelineWorkspace: React.FC<TimelineWorkspaceProps> = ({
  project,
  onUpdateTracks,
  onOpenAIEditor,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(15); // pixels per second
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  // Total project runtime calculation based on max clip end time
  const totalDurationSec = Math.max(
    60,
    ...project.timelineTracks.flatMap(t => t.clips.map(c => c.startTimeSec + c.durationSec))
  );

  // Format SMPTE timecode (HH:MM:SS:FF at 24fps)
  const formatSMPTE = (sec: number) => {
    const totalFrames = Math.floor(sec * 24);
    const frames = totalFrames % 24;
    const totalSecs = Math.floor(sec);
    const seconds = totalSecs % 60;
    const minutes = Math.floor(totalSecs / 60) % 60;
    const hours = Math.floor(totalSecs / 3600);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  // Playback Loop
  useEffect(() => {
    if (isPlaying) {
      // Trigger ambient audio preview
      cinemaAudio.playMusicDrone('cold suspense', 0.6);

      const step = (timestamp: number) => {
        if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
        const delta = (timestamp - lastTimestampRef.current) / 1000;
        lastTimestampRef.current = timestamp;

        setCurrentTimeSec(prev => {
          const next = prev + delta;
          if (next >= totalDurationSec) {
            setIsPlaying(false);
            cinemaAudio.stopAllMusic();
            return 0;
          }
          return next;
        });

        animationFrameRef.current = requestAnimationFrame(step);
      };

      animationFrameRef.current = requestAnimationFrame(step);
    } else {
      lastTimestampRef.current = null;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      cinemaAudio.stopAllMusic();
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      cinemaAudio.stopAllMusic();
    };
  }, [isPlaying, totalDurationSec]);

  // Current active shot under playhead
  const currentVideoTrack = project.timelineTracks.find(t => t.type === 'video');
  const activeVideoClip = currentVideoTrack?.clips.find(
    c => currentTimeSec >= c.startTimeSec && currentTimeSec < (c.startTimeSec + c.durationSec)
  );
  const activeShot = project.shots.find(s => s.id === activeVideoClip?.sourceAssetId);

  // Active dialogue line
  const dialogueTrack = project.timelineTracks.find(t => t.type === 'dialogue');
  const activeDialogueClip = dialogueTrack?.clips.find(
    c => currentTimeSec >= c.startTimeSec && currentTimeSec < (c.startTimeSec + c.durationSec)
  );

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0A0A0B] text-[#E0E0E0]">
      {/* Top Preview Canvas & Program Monitor */}
      <div className="h-72 bg-[#050505] border-b border-[#222225] flex items-center justify-center p-4 gap-6 shrink-0">
        {/* 16:9 Program Monitor Frame */}
        <div className="h-full aspect-video bg-[#000000] rounded-sm border border-[#2A2A2D] overflow-hidden relative shadow-2xl flex items-center justify-center">
          {activeShot?.storyboardImageUrl ? (
            <img 
              src={activeShot.storyboardImageUrl} 
              alt={activeShot.title} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="flex flex-col items-center text-[#555558]">
              <Film className="w-10 h-10 mb-2 text-[#333336]" />
              <span className="text-[10px] font-mono tracking-wider uppercase">NO ACTIVE PROGRAM FRAME</span>
            </div>
          )}

          {/* Subtitle / Dialogue Overlay */}
          {activeDialogueClip && (
            <div className="absolute bottom-4 inset-x-6 text-center">
              <span className="bg-black/90 px-3 py-1 rounded-sm text-[#CBA135] font-mono text-[11px] border border-[#2A2A2D] shadow-lg">
                {activeDialogueClip.name}
              </span>
            </div>
          )}

          {/* Recording / Telemetry HUD */}
          <div className="absolute top-2.5 left-2.5 bg-black/80 px-2 py-0.5 rounded-sm font-mono text-[10px] text-[#CBA135] border border-[#2A2A2D] flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-red-500 animate-pulse' : 'bg-[#666]'}`} />
            <span>{isPlaying ? 'PLAY' : 'PAUSE'} {formatSMPTE(currentTimeSec)}</span>
          </div>

          <div className="absolute top-2.5 right-2.5 bg-black/80 px-2 py-0.5 rounded-sm font-mono text-[9px] text-[#8E9299] border border-[#2A2A2D]">
            {activeShot?.id || 'PROGRAM_OUT'}
          </div>
        </div>

        {/* Master Transport & AI Editor Controls */}
        <div className="w-80 flex flex-col justify-between h-full py-1 panel p-3.5 bg-[#151619] border border-[#2A2A2D]">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#8E9299]">SMPTE TIMECODE</span>
              <span className="font-mono text-[#CBA135] font-bold text-sm">{formatSMPTE(currentTimeSec)}</span>
            </div>
            <div className="text-[10px] text-[#666] font-mono">
              24.00 FPS • 8 MASTER TRACKS
            </div>
          </div>

          {/* Transport buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentTimeSec(0)}
              className="p-2 rounded-sm bg-[#0E0E10] hover:bg-[#1E1F24] text-[#8E9299] hover:text-[#E0E0E0] border border-[#222225] transition-colors"
              title="Return to Start"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex-1 py-1.5 rounded-sm bg-[#CBA135] hover:bg-[#DFB548] text-black font-bold font-mono text-xs flex items-center justify-center gap-2 shadow transition-colors"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>

            <button
              onClick={() => setCurrentTimeSec(totalDurationSec)}
              className="p-2 rounded-sm bg-[#0E0E10] hover:bg-[#1E1F24] text-[#8E9299] hover:text-[#E0E0E0] border border-[#222225] transition-colors"
              title="Jump to End"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* AI Rough Cut Button */}
          <button
            onClick={onOpenAIEditor}
            className="w-full py-1.5 rounded-sm bg-[#0E0E10] hover:bg-[#1E1F24] text-[#CBA135] border border-[#CBA135]/40 hover:border-[#CBA135] text-[11px] font-mono font-medium flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#CBA135]" />
            <span className="uppercase tracking-wider">AI Edit Rough Cut</span>
          </button>
        </div>
      </div>

      {/* Timeline Controls & Ruler Header */}
      <div className="h-9 bg-[#0E0E10] border-b border-[#222225] px-4 flex items-center justify-between shrink-0 text-xs text-[#8E9299] font-mono">
        <div className="flex items-center gap-4">
          <span className="font-bold text-[#E0E0E0] uppercase tracking-wider text-[11px]">8-TRACK DATA TIMELINE</span>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setZoomLevel(prev => Math.max(5, prev - 3))}
              className="p-1 rounded-sm hover:bg-[#1E1F24] text-[#8E9299] hover:text-[#FFFFFF]"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setZoomLevel(prev => Math.min(40, prev + 3))}
              className="p-1 rounded-sm hover:bg-[#1E1F24] text-[#8E9299] hover:text-[#FFFFFF]"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="text-[10px] font-mono text-[#666]">
          DURATION: <strong className="text-[#CBA135]">{Math.round(totalDurationSec)}s</strong>
        </div>
      </div>

      {/* Multi-Track Canvas & Scrubber */}
      <div className="flex-1 overflow-x-auto overflow-y-auto relative bg-[#050505] select-none scroll-hide">
        <div 
          className="min-w-full relative" 
          style={{ width: `${Math.max(1200, totalDurationSec * zoomLevel + 200)}px` }}
        >
          {/* Time Ruler */}
          <div className="h-6 bg-[#0E0E10] border-b border-[#222225] relative flex items-end">
            {Array.from({ length: Math.ceil(totalDurationSec / 5) + 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute border-l border-[#2A2A2D] h-3 text-[9px] font-mono text-[#666] pl-1"
                style={{ left: `${i * 5 * zoomLevel + 160}px` }}
              >
                {formatSMPTE(i * 5).substring(3, 8)}
              </div>
            ))}
          </div>

          {/* Red Playhead Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#CBA135] z-20 pointer-events-none shadow-lg"
            style={{ left: `${currentTimeSec * zoomLevel + 160}px` }}
          >
            <div className="w-2.5 h-2.5 bg-[#CBA135] rotate-45 -translate-x-1 -translate-y-1 shadow" />
          </div>

          {/* Tracks List */}
          <div className="divide-y divide-[#1A1A1D]">
            {project.timelineTracks.map((track) => (
              <div key={track.id} className="flex h-11 relative group hover:bg-[#0E0E10]/40 transition-colors">
                {/* Track Header */}
                <div className="w-40 bg-[#0E0E10] border-r border-[#222225] px-2.5 py-1.5 flex items-center justify-between shrink-0 sticky left-0 z-10 font-mono">
                  <div className="flex items-center gap-2 truncate">
                    <span 
                      className="w-2 h-2 rounded-sm shrink-0" 
                      style={{ backgroundColor: track.color }} 
                    />
                    <span className="font-bold text-[11px] text-[#E0E0E0] truncate">{track.name}</span>
                  </div>
                  <span className="text-[8px] font-mono text-[#666] uppercase">{track.type}</span>
                </div>

                {/* Clips Container */}
                <div 
                  className="flex-1 relative h-full bg-[#080809]"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    setCurrentTimeSec(Math.max(0, clickX / zoomLevel));
                  }}
                >
                  {track.clips.map((clip) => {
                    const isSelected = selectedClipId === clip.id;
                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClipId(clip.id);
                        }}
                        className={`absolute top-1 bottom-1 rounded-sm px-2 flex items-center justify-between text-xs font-mono truncate border cursor-pointer transition-all shadow-sm ${
                          isSelected
                            ? 'border-[#CBA135] ring-1 ring-[#CBA135] text-[#FFFFFF]'
                            : 'border-white/10 hover:border-white/30 text-[#E0E0E0]'
                        }`}
                        style={{
                          left: `${clip.startTimeSec * zoomLevel}px`,
                          width: `${Math.max(24, clip.durationSec * zoomLevel)}px`,
                          backgroundColor: `${track.color}33`,
                        }}
                      >
                        <span className="truncate font-semibold text-[10px]">{clip.name}</span>
                        <span className="text-[8px] opacity-70 ml-1 shrink-0">{clip.durationSec}s</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
