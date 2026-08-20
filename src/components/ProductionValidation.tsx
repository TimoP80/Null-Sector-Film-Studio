import React from 'react';
import { FilmProject } from '../types/film';
import { 
  CheckSquare, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  Users, 
  Video, 
  MessageSquareQuote, 
  Image as ImageIcon 
} from 'lucide-react';

interface ProductionValidationProps {
  project: FilmProject;
  onNavigate: (tab: string) => void;
}

export const ProductionValidation: React.FC<ProductionValidationProps> = ({
  project,
  onNavigate,
}) => {
  // Compute validation rules
  const missingStoryboards = project.shots.filter(s => !s.storyboardImageUrl);
  const missingVideos = project.shots.filter(s => !s.videoUrl);
  const unapprovedShots = project.shots.filter(s => s.status !== 'approved');
  const missingCharacterRefs = project.characters.filter(c => !c.masterReferenceImage);
  const missingDialogueAudio = project.dialogueSegments.filter(d => !d.audioUrl && d.status !== 'approved');

  const allPassed = 
    missingStoryboards.length === 0 && 
    missingVideos.length === 0 && 
    missingCharacterRefs.length === 0 && 
    missingDialogueAudio.length === 0;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0A0A0B] text-[#E0E0E0]">
      {/* Header */}
      <div className="h-11 bg-[#0E0E10] border-b border-[#222225] px-4 flex items-center justify-between shrink-0 font-mono">
        <div className="flex items-center gap-2 text-[#E0E0E0] text-xs font-semibold">
          <CheckSquare className="w-4 h-4 text-[#CBA135]" />
          <span className="uppercase tracking-wider">PRODUCTION QUALITY CONTROL & PRE-FLIGHT TELEMETRY</span>
        </div>

        <span className="text-[10px] font-mono text-[#666]">
          OPENMONTAGE QA PROTOCOL v2.4
        </span>
      </div>

      <div className="flex-1 p-5 overflow-y-auto max-w-4xl mx-auto space-y-4 w-full">
        {/* Status Card */}
        <div className={`p-4 rounded-sm border flex items-center justify-between ${
          allPassed 
            ? 'bg-[#122018] border-emerald-500/50' 
            : 'bg-[#151619] border-[#2A2A2D]'
        }`}>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#E0E0E0] font-mono uppercase tracking-wider">
              {allPassed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#CBA135]" />
              )}
              <span>{allPassed ? 'ALL PRODUCTION PROTOCOLS VERIFIED' : 'ACTION ITEMS REQUIRE ATTENTION'}</span>
            </div>
            <p className="text-[11px] text-[#8E9299] mt-1 max-w-xl font-mono">
              Pre-flight telemetry analyzes every frame, character anchor, dialogue vocalization, and audio stem for delivery integrity.
            </p>
          </div>

          <div className="text-right shrink-0 font-mono">
            <span className="text-2xl font-bold text-[#CBA135]">
              {missingStoryboards.length + missingVideos.length + missingCharacterRefs.length + missingDialogueAudio.length}
            </span>
            <div className="text-[9px] uppercase tracking-wider text-[#666]">PENDING NODES</div>
          </div>
        </div>

        {/* Validation Checks List */}
        <div className="space-y-2.5">
          {/* Check 1: Missing Character Master References */}
          <div className="p-3.5 bg-[#151619] border border-[#2A2A2D] rounded-sm flex items-center justify-between font-mono">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-sm ${missingCharacterRefs.length === 0 ? 'bg-[#122018] text-emerald-400 border border-emerald-500/30' : 'bg-[#201B12] text-[#CBA135] border border-[#CBA135]/30'}`}>
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#E0E0E0] uppercase">Character Reference Anchors</h3>
                <p className="text-[10px] text-[#8E9299]">
                  {missingCharacterRefs.length === 0 
                    ? 'All character profiles have locked master portraits.' 
                    : `${missingCharacterRefs.length} character(s) missing master reference images.`}
                </p>
              </div>
            </div>

            {missingCharacterRefs.length > 0 && (
              <button
                onClick={() => onNavigate('CHARACTERS')}
                className="px-2.5 py-1 rounded-sm text-[10px] font-mono font-medium bg-[#0E0E10] hover:bg-[#1E1F24] text-[#CBA135] border border-[#2A2A2D] flex items-center gap-1 uppercase"
              >
                <span>Fix in Characters</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Check 2: Missing Storyboard Frames */}
          <div className="p-3.5 bg-[#151619] border border-[#2A2A2D] rounded-sm flex items-center justify-between font-mono">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-sm ${missingStoryboards.length === 0 ? 'bg-[#122018] text-emerald-400 border border-emerald-500/30' : 'bg-[#201B12] text-[#CBA135] border border-[#CBA135]/30'}`}>
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#E0E0E0] uppercase">Storyboard Keyframes</h3>
                <p className="text-[10px] text-[#8E9299]">
                  {missingStoryboards.length === 0 
                    ? 'All shots have generated visual storyboard keyframes.' 
                    : `${missingStoryboards.length} shot(s) missing visual frames.`}
                </p>
              </div>
            </div>

            {missingStoryboards.length > 0 && (
              <button
                onClick={() => onNavigate('STORYBOARD')}
                className="px-2.5 py-1 rounded-sm text-[10px] font-mono font-medium bg-[#0E0E10] hover:bg-[#1E1F24] text-[#CBA135] border border-[#2A2A2D] flex items-center gap-1 uppercase"
              >
                <span>Generate in Storyboards</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Check 3: Dialogue Synthesis */}
          <div className="p-3.5 bg-[#151619] border border-[#2A2A2D] rounded-sm flex items-center justify-between font-mono">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-sm ${missingDialogueAudio.length === 0 ? 'bg-[#122018] text-emerald-400 border border-emerald-500/30' : 'bg-[#201B12] text-[#CBA135] border border-[#CBA135]/30'}`}>
                <MessageSquareQuote className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#E0E0E0] uppercase">Dialogue Audio Vocalizations (TTS)</h3>
                <p className="text-[10px] text-[#8E9299]">
                  {missingDialogueAudio.length === 0 
                    ? 'All dialogue lines have approved voice stems.' 
                    : `${missingDialogueAudio.length} line(s) awaiting synthesis.`}
                </p>
              </div>
            </div>

            {missingDialogueAudio.length > 0 && (
              <button
                onClick={() => onNavigate('DIALOGUE')}
                className="px-2.5 py-1 rounded-sm text-[10px] font-mono font-medium bg-[#0E0E10] hover:bg-[#1E1F24] text-[#CBA135] border border-[#2A2A2D] flex items-center gap-1 uppercase"
              >
                <span>Synthesize in Dialogue</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Check 4: Unapproved Shots */}
          <div className="p-3.5 bg-[#151619] border border-[#2A2A2D] rounded-sm flex items-center justify-between font-mono">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-sm ${unapprovedShots.length === 0 ? 'bg-[#122018] text-emerald-400 border border-emerald-500/30' : 'bg-[#151619] text-[#8E9299] border border-[#2A2A2D]'}`}>
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#E0E0E0] uppercase">Director Shot Approvals</h3>
                <p className="text-[10px] text-[#8E9299]">
                  {unapprovedShots.length === 0 
                    ? 'All production shots approved for final timeline mix.' 
                    : `${unapprovedShots.length} shot(s) in review or pending status.`}
                </p>
              </div>
            </div>

            {unapprovedShots.length > 0 && (
              <button
                onClick={() => onNavigate('SHOT_LIST')}
                className="px-2.5 py-1 rounded-sm text-[10px] font-mono font-medium bg-[#0E0E10] hover:bg-[#1E1F24] text-[#8E9299] hover:text-[#E0E0E0] border border-[#2A2A2D] flex items-center gap-1 uppercase"
              >
                <span>Review Shot List</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
