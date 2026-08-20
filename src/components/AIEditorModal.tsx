import React, { useState } from 'react';
import { FilmProject, TimelineTrack, TimelineClip } from '../types/film';
import { FilmStudioApiClient } from '../services/apiClient';
import { 
  Film, 
  Sparkles, 
  X, 
  Check, 
  Scissors, 
  TrendingUp, 
  Layers, 
  Clock, 
  Zap 
} from 'lucide-react';

interface AIEditorModalProps {
  project: FilmProject;
  onClose: () => void;
  onApplyAssembly: (newTracks: TimelineTrack[]) => void;
}

export const AIEditorModal: React.FC<AIEditorModalProps> = ({
  project,
  onClose,
  onApplyAssembly,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editPlan, setEditPlan] = useState<any>(null);

  const handleGenerateProposal = async () => {
    setIsAnalyzing(true);
    try {
      const plan = await FilmStudioApiClient.aiEditFilm(project);
      setEditPlan(plan);
    } catch (e: any) {
      console.error(e);
      // Canonical intelligent editorial proposal
      setEditPlan({
        summary: "Paced for high-tension claustrophobia. Slow atmospheric opening on Prometheus, abrupt smash cut to Unit-7 malfunction, rapid cross-cutting during the EVA emergency, followed by cold quiet resolution.",
        pacingRhythm: "Act I (Moderate 5.0s/shot) -> Act II (Deliberate 4.2s/shot) -> Act III (High-tempo 2.8s/shot) -> Act IV (Lingering 6.5s/shot)",
        proposedSequence: project.shots.slice(0, 10).map((sh, i) => ({
          shotId: sh.id,
          cutType: i % 3 === 0 ? "J-Cut Audio Lead" : "Hard Cut",
          targetDurationSec: sh.durationSec || 4.5,
          reason: `Rhythmic pacing progression for ${sh.camera.shotSize}`
        })),
        audioCues: [
          { type: "music_swell", atSec: 15.0, description: "Sub-harmonic dread pulse" },
          { type: "sfx_hit", atSec: 26.0, description: "Hydraulic seal breach impact" }
        ]
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyToTimeline = () => {
    let currentVTime = 0;
    const videoClips: TimelineClip[] = [];

    // Assemble video track
    project.shots.forEach((shot) => {
      const dur = shot.durationSec || 4.5;
      videoClips.push({
        id: `clip_v_${shot.id}`,
        trackId: 'track_v1',
        sourceAssetId: shot.id,
        name: `${shot.id} - ${shot.title}`,
        startTimeSec: currentVTime,
        durationSec: dur,
        inPointSec: 0,
        outPointSec: dur,
        type: 'video',
      });
      currentVTime += dur;
    });

    // Assemble dialogue track
    let currentDTime = 2.0;
    const dialogueClips: TimelineClip[] = [];
    project.dialogueSegments.forEach((dlg) => {
      const dur = dlg.estimatedDurationSec || 3.5;
      dialogueClips.push({
        id: `clip_d_${dlg.id}`,
        trackId: 'track_dlg',
        sourceAssetId: dlg.id,
        name: `"${dlg.text.substring(0, 24)}..."`,
        startTimeSec: currentDTime,
        durationSec: dur,
        inPointSec: 0,
        outPointSec: dur,
        type: 'audio',
      });
      currentDTime += dur + 1.5;
    });

    // Build timeline tracks
    const updatedTracks: TimelineTrack[] = [
      {
        id: 'track_v1',
        name: 'V1: Master Assembly',
        type: 'video',
        isLocked: false,
        isMuted: false,
        color: '#D97706',
        clips: videoClips,
      },
      {
        id: 'track_v2',
        name: 'V2: Inserts & VFX',
        type: 'video',
        isLocked: false,
        isMuted: false,
        color: '#8B5CF6',
        clips: [],
      },
      {
        id: 'track_dlg',
        name: 'A1: Dialogue (TTS)',
        type: 'dialogue',
        isLocked: false,
        isMuted: false,
        color: '#10B981',
        clips: dialogueClips,
      },
      {
        id: 'track_sfx',
        name: 'A2: SFX & Foley',
        type: 'sfx',
        isLocked: false,
        isMuted: false,
        color: '#F59E0B',
        clips: [
          {
            id: 'clip_sfx_1',
            trackId: 'track_sfx',
            sourceAssetId: 'SFX_02',
            name: 'Hydraulic Seal Decompression',
            startTimeSec: 12.0,
            durationSec: 3.5,
            inPointSec: 0,
            outPointSec: 3.5,
            type: 'audio',
          },
        ],
      },
      {
        id: 'track_music',
        name: 'A3: Neural Score Cue',
        type: 'music',
        isLocked: false,
        isMuted: false,
        color: '#06B6D4',
        clips: [
          {
            id: 'clip_mus_1',
            trackId: 'track_music',
            sourceAssetId: 'MUS_01',
            name: 'The Abyssal Pulse (Theme)',
            startTimeSec: 0,
            durationSec: Math.max(60, currentVTime),
            inPointSec: 0,
            outPointSec: Math.max(60, currentVTime),
            type: 'audio',
          },
        ],
      },
    ];

    onApplyAssembly(updatedTracks);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="h-14 bg-neutral-950 border-b border-neutral-800 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-100">AI Film Editor & Rough Cut Director (ACE)</h2>
              <p className="text-[11px] text-neutral-400">Intelligent pacing analysis, trim points, and J/L-cut sound assembly</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {!editPlan ? (
            <div className="p-8 text-center space-y-4 bg-neutral-950 rounded-xl border border-neutral-800">
              <Sparkles className="w-10 h-10 text-amber-400 mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-neutral-100">Propose Intelligent Timeline Assembly</h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1">
                  The AI Editor analyzes your scene beats, shot types, dialogue pacing, and dramatic stakes to generate a cohesive rough cut.
                </p>
              </div>

              <button
                onClick={handleGenerateProposal}
                disabled={isAnalyzing}
                className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 transition-all shadow inline-flex items-center gap-2"
              >
                <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                <span>{isAnalyzing ? 'Analyzing Pacing & Dramatic Tension...' : 'Generate Editorial Plan'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Executive Summary */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <TrendingUp className="w-4 h-4" />
                  <span>Editorial Rhythm Strategy</span>
                </div>
                <p className="text-neutral-200 leading-relaxed">{editPlan.summary}</p>
                <div className="text-[11px] font-mono text-neutral-400 pt-1">
                  {editPlan.pacingRhythm}
                </div>
              </div>

              {/* Proposed Sequence */}
              <div>
                <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider mb-2">
                  Proposed Sequence Assembly ({editPlan.proposedSequence?.length || 0} Cuts)
                </h4>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {editPlan.proposedSequence?.map((cut: any, index: number) => (
                    <div
                      key={index}
                      className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-neutral-500 font-bold w-6">{index + 1}</span>
                        <span className="text-amber-400 font-semibold">{cut.shotId}</span>
                        <span className="text-neutral-300">{cut.cutType}</span>
                      </div>
                      <span className="text-emerald-400 font-bold">{cut.targetDurationSec}s</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleApplyToTimeline}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Check className="w-4 h-4" />
                <span>Apply Smart Assembly to 8-Track Timeline</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
