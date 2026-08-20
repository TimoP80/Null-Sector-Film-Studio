import React from 'react';
import { FilmProject } from '../types/film';
import { 
  BookOpen, 
  TrendingUp, 
  Layers, 
  Compass, 
  ShieldAlert, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';

interface StoryWorkspaceProps {
  project: FilmProject;
  onUpdateProject: (updated: Partial<FilmProject>) => void;
}

export const StoryWorkspace: React.FC<StoryWorkspaceProps> = ({
  project,
  onUpdateProject,
}) => {
  return (
    <div className="h-full flex flex-col overflow-hidden bg-neutral-950">
      {/* Header */}
      <div className="h-12 bg-neutral-900/90 border-b border-neutral-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-neutral-200 text-xs font-semibold">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <span>Story Structure & Dramatic Tension Curve</span>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto space-y-6">
        {/* Core Premise */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400" />
            Core Premise & Thematic Anchor
          </h2>

          <div className="space-y-2 text-xs">
            <div>
              <label className="text-neutral-500 uppercase tracking-wider text-[10px]">Film Title</label>
              <input
                type="text"
                value={project.title}
                onChange={(e) => onUpdateProject({ title: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-neutral-200 font-bold text-sm focus:border-amber-500 focus:outline-none mt-1"
              />
            </div>

            <div>
              <label className="text-neutral-500 uppercase tracking-wider text-[10px]">Logline</label>
              <textarea
                value={project.logline}
                onChange={(e) => onUpdateProject({ logline: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-200 text-xs leading-relaxed focus:border-amber-500 focus:outline-none mt-1"
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Dramatic 4-Act Tension Arc */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Dramatic Tension Arc Breakdown
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {project.acts.map((act) => {
              const actScenes = project.scenes.filter(s => s.actId === act.id);
              const actShots = project.shots.filter(s => s.actId === act.id);

              return (
                <div 
                  key={act.id}
                  className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-400">ACT {act.number}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-950 text-neutral-400 border border-neutral-800">
                      {actScenes.length} Scenes • {actShots.length} Shots
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-neutral-100">{act.title}</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">{act.description}</p>

                  <div className="pt-2 border-t border-neutral-800/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Scenes in Act:</span>
                    <div className="flex flex-wrap gap-1">
                      {actScenes.map(sc => (
                        <span key={sc.id} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-950 text-neutral-300 border border-neutral-800">
                          #{sc.sceneNumber} {sc.heading.substring(0, 14)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
