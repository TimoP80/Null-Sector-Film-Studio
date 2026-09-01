import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ListFilter,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { FilmProject } from '../types/film';
import { videoJobRuntime } from '../videoJobRuntime';
import {
  calculateProductionSupervisorSummary,
  SceneRecommendation,
  ShotListNavigationOptions,
} from '../utils/shotReadiness';

interface ProductionSupervisorPanelProps {
  project: FilmProject;
  onNavigate: (tab: string) => void;
  onOpenShotList: (options?: ShotListNavigationOptions) => void;
  onOpenShot?: (shotId: string, takeId?: string) => void;
}

export const ProductionSupervisorPanel: React.FC<ProductionSupervisorPanelProps> = ({
  project,
  onNavigate,
  onOpenShotList,
  onOpenShot,
}) => {
  const summary = calculateProductionSupervisorSummary(project);
  const handleRecommendationAction = (recommendation: SceneRecommendation) => {
    if (recommendation.targetTab === 'SHOT_LIST') {
      onOpenShotList({
        sceneId: recommendation.sceneId,
        readinessFilter: recommendation.readinessFilter,
      });
      return;
    }
    onNavigate(recommendation.targetTab);
  };
  const issueCount = summary.continuityIssues + summary.shotsMissingDialogue + summary.shotsWithoutMaster + summary.locationsMissingReferences;
  const videoJobs = (project.generationJobs || []).filter(job => job.targetType === 'video');
  const videoCounts = {
    queued: videoJobs.filter(job => job.status === 'queued').length,
    generating: videoJobs.filter(job => job.status === 'generating').length,
    completed: videoJobs.filter(job => job.status === 'completed').length,
    failed: videoJobs.filter(job => job.status === 'failed').length,
  };

  return (
    <div className="panel p-4 bg-[#151619] border border-[#2A2A2D] rounded-md font-mono">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 border-b border-[#222225] pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FFFFFF]">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            AI Production Supervisor
            <span className="px-1.5 py-0.5 rounded-sm text-[8px] text-cyan-300 bg-cyan-950 border border-cyan-500/40">READ-ONLY</span>
          </div>
          <p className="text-[10px] text-[#666] mt-1 uppercase">Derived production intelligence • No autonomous actions</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[9px] uppercase tracking-wider text-[#8E9299]">Film Readiness</div>
          <div className="text-2xl font-bold text-[#CBA135] leading-none mt-1">{summary.filmReadiness}%</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="text-[9px] uppercase tracking-wider text-[#CBA135]">Film Production Health</div>
        <div className="text-[9px] uppercase text-[#666]">Deterministic project telemetry</div>
      </div>

      <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
        <div className="bg-[#0E0E10] border border-[#222225] rounded-sm p-2">
          <div className="text-sm font-bold text-[#E0E0E0]">{summary.filmHealth.totalScenes}</div>
          <div className="text-[8px] uppercase text-[#666]">Scenes</div>
        </div>
        <div className="bg-[#0E0E10] border border-[#222225] rounded-sm p-2">
          <div className="text-sm font-bold text-[#E0E0E0]">{summary.totalShots}</div>
          <div className="text-[8px] uppercase text-[#666]">Shots</div>
        </div>
        <div className="bg-[#0E0E10] border border-emerald-500/30 rounded-sm p-2">
          <div className="text-sm font-bold text-emerald-400">{summary.productionReadyShots}</div>
          <div className="text-[8px] uppercase text-[#666]">Production Ready</div>
        </div>
        <div className="bg-[#0E0E10] border border-cyan-500/30 rounded-sm p-2">
          <div className="text-sm font-bold text-cyan-400">{summary.generatedTakeShots}</div>
          <div className="text-[8px] uppercase text-[#666]">Visual Takes</div>
        </div>
        <div className="bg-[#0E0E10] border border-amber-500/30 rounded-sm p-2">
          <div className="text-sm font-bold text-amber-300">{summary.masterApprovedShots}</div>
          <div className="text-[8px] uppercase text-[#666]">Master Approved</div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
        <div className="bg-[#0E0E10] border border-amber-500/30 rounded-sm p-2">
          <div className="text-sm font-bold text-amber-300">{summary.filmHealth.shotsMissingVisualTakes}</div>
          <div className="text-[8px] uppercase text-[#666]">Missing Visual</div>
        </div>
        <div className="bg-[#0E0E10] border border-amber-500/30 rounded-sm p-2">
          <div className="text-sm font-bold text-amber-300">{summary.filmHealth.shotsWithUnresolvedContinuityIssues}</div>
          <div className="text-[8px] uppercase text-[#666]">Continuity Risk</div>
        </div>
        <div className="bg-[#0E0E10] border border-amber-500/30 rounded-sm p-2">
          <div className="text-sm font-bold text-amber-300">{summary.filmHealth.shotsMissingDialogue}</div>
          <div className="text-[8px] uppercase text-[#666]">Missing Dialogue</div>
        </div>
        <div className="bg-[#0E0E10] border border-red-500/30 rounded-sm p-2">
          <div className="text-sm font-bold text-red-300">{summary.filmHealth.rejectedTakes}</div>
          <div className="text-[8px] uppercase text-[#666]">Rejected Takes</div>
        </div>
        <div className="bg-[#0E0E10] border border-cyan-500/30 rounded-sm p-2">
          <div className="text-sm font-bold text-cyan-300">{summary.filmHealth.activeHighPriorityRecommendations}</div>
          <div className="text-[8px] uppercase text-[#666]">High Priority</div>
        </div>
      </div>

      <div className="mt-3 p-3 bg-[#0E0E10] border border-[#222225] rounded-sm">
        <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-[#CBA135]">
          <span>Video Generation Queue</span>
          <span className="text-[#666]">{videoJobs.length} total</span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[8px] uppercase">
          <div><div className="text-cyan-300 text-sm font-bold">{videoCounts.queued}</div><div className="text-[#666]">Queued</div></div>
          <div><div className="text-purple-300 text-sm font-bold">{videoCounts.generating}</div><div className="text-[#666]">Generating</div></div>
          <div><div className="text-emerald-300 text-sm font-bold">{videoCounts.completed}</div><div className="text-[#666]">Completed</div></div>
          <div><div className="text-red-300 text-sm font-bold">{videoCounts.failed}</div><div className="text-[#666]">Failed</div></div>
        </div>
        {videoJobs.slice(-3).reverse().map(job => (
          <div key={job.id} className="mt-2 flex items-center justify-between gap-2 border-t border-[#222225] pt-2 text-[9px]">
            <button onClick={() => job.shotId && onOpenShot?.(job.shotId, job.targetId)} className="truncate text-left text-[#AAA] hover:text-cyan-300">{job.shotId || job.title}</button>
            <div className="flex items-center gap-2">
              <span className={job.status === 'failed' ? 'text-red-300' : job.status === 'completed' ? 'text-emerald-300' : 'text-cyan-300'}>{job.status.toUpperCase()}</span>
              {job.status === 'failed' || job.status === 'cancelled' ? <button onClick={() => videoJobRuntime.retry(job.id)} className="text-amber-300 uppercase">Retry</button> : null}
              {job.status === 'queued' || job.status === 'generating' ? <button onClick={() => void videoJobRuntime.cancel(job.id)} className="text-red-300 uppercase">Cancel</button> : null}
              {job.status === 'completed' ? <button onClick={() => job.shotId && onOpenShot?.(job.shotId, job.targetId)} className="text-cyan-300 uppercase">View Take</button> : null}
            </div>
          </div>
        ))}
        {videoJobs.length > 0 && <div className="mt-2 text-[8px] text-[#666] uppercase">Progress is reported only when provided by the provider.</div>}
      </div>

      <div className="mt-3 h-1.5 rounded-full bg-[#0A0A0B] border border-[#222225] overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-[#CBA135] to-emerald-500 transition-all duration-500"
          style={{ width: `${summary.filmReadiness}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 text-[10px]">
        <div className={`flex items-center gap-1.5 ${summary.continuityIssues > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
          {summary.continuityIssues > 0 ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
          <span>{summary.continuityIssues} continuity issue{summary.continuityIssues === 1 ? '' : 's'}</span>
        </div>
        <div className={`flex items-center gap-1.5 ${summary.shotsMissingDialogue > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
          {summary.shotsMissingDialogue > 0 ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
          <span>{summary.shotsMissingDialogue} shots missing dialogue</span>
        </div>
        <div className={`flex items-center gap-1.5 ${summary.shotsWithoutMaster > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
          {summary.shotsWithoutMaster > 0 ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
          <span>{summary.shotsWithoutMaster} shots without master</span>
        </div>
        <div className={`flex items-center gap-1.5 ${summary.locationsMissingReferences > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
          {summary.locationsMissingReferences > 0 ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
          <span>{summary.locationsMissingReferences} locations lack imagery</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[#222225]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-[#CBA135]">
            <Sparkles className="w-3 h-3" /> Next Actions
          </div>
          <span className="text-[9px] uppercase text-[#666]">{summary.recommendations.length} action{summary.recommendations.length === 1 ? '' : 's'}</span>
        </div>
        {summary.recommendations.length > 0 ? (
          <div className="mt-2 space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {summary.recommendations.map(recommendation => (
              <div key={`${recommendation.sceneId}-${recommendation.category}`} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 bg-[#0E0E10] border border-[#222225] rounded-sm">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`shrink-0 px-1.5 py-0.5 rounded-sm border text-[8px] font-bold ${
                    recommendation.priority === 'CRITICAL'
                      ? 'text-red-300 border-red-500/40 bg-red-950/30'
                      : recommendation.priority === 'HIGH'
                      ? 'text-amber-300 border-amber-500/40 bg-amber-950/20'
                      : 'text-[#8E9299] border-[#2A2A2D]'
                  }`}>
                    {recommendation.priority}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[9px] uppercase text-[#E0E0E0] truncate">
                      <span className="text-[#CBA135]">SCENE {String(recommendation.sceneNumber).padStart(2, '0')}</span>
                      <span className="text-[#666]">•</span>
                      <span className="truncate">{recommendation.sceneName}</span>
                    </div>
                    <div className="text-[10px] text-[#AAA] truncate" title={recommendation.explanation}>{recommendation.explanation}</div>
                    <div className="text-[8px] uppercase text-[#666] mt-0.5">
                      {recommendation.affectedShotCount} affected shot{recommendation.affectedShotCount === 1 ? '' : 's'} • {recommendation.category}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRecommendationAction(recommendation)}
                  className="self-end sm:self-auto shrink-0 px-2 py-1 rounded-sm bg-[#151619] hover:bg-[#1E1F24] text-cyan-300 border border-cyan-500/40 text-[8px] uppercase tracking-wider flex items-center gap-1"
                >
                  <ArrowRight className="w-3 h-3" /> Open
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[9px] text-emerald-400 mt-2">No unresolved scene actions.</div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-[#222225] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-[#CBA135]">
            <Sparkles className="w-3 h-3" /> Recommended Next Action
          </div>
          <div className="text-xs text-[#E0E0E0] mt-1 truncate">{summary.recommendation}</div>
          {issueCount === 0 && <div className="text-[9px] text-emerald-400 mt-1">No unresolved supervisor alerts.</div>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate('VALIDATION')}
            className="px-2.5 py-1.5 rounded-sm bg-[#1A1A1E] hover:bg-[#222226] text-[#CBA135] border border-[#2A2A2D] text-[9px] uppercase tracking-wider flex items-center gap-1"
          >
            <ListFilter className="w-3 h-3" /> Review Issues
          </button>
          <button
            onClick={() => summary.recommendations[0]
              ? handleRecommendationAction(summary.recommendations[0])
              : onNavigate(summary.recommendationTarget)}
            className="px-2.5 py-1.5 rounded-sm bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 text-[9px] uppercase tracking-wider flex items-center gap-1"
          >
            <ArrowRight className="w-3 h-3" /> Show Incomplete
          </button>
        </div>
      </div>
    </div>
  );
};
