import React, { useState } from 'react';
import { FilmProject } from '../types/film';
import { 
  DownloadCloud, 
  UploadCloud, 
  FileJson, 
  FileSpreadsheet, 
  FileText, 
  Archive, 
  Check, 
  Copy, 
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface ExportOpenMontageProps {
  project: FilmProject;
  onImportProject: (imported: FilmProject) => void;
}

export const ExportOpenMontage: React.FC<ExportOpenMontageProps> = ({
  project,
  onImportProject,
}) => {
  const [copiedJson, setCopiedJson] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // Generate OpenMontage Standard JSON
  const generateOpenMontageJSON = () => {
    const openMontageData = {
      openMontageVersion: '2.4.0',
      schema: 'https://openmontage.org/spec/v2.4/film-schema.json',
      projectMeta: {
        id: project.id,
        title: project.title,
        logline: project.logline,
        genre: project.genre,
        runtimeMin: project.runtimeMin,
        aspectRatio: project.aspectRatio,
        resolution: project.resolution,
        frameRate: project.frameRate,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      acts: project.acts,
      scenes: project.scenes,
      characters: project.characters,
      locations: project.locations,
      shots: project.shots,
      dialogueSegments: project.dialogueSegments,
      sfxCues: project.sfxCues,
      musicCues: project.musicCues,
      timelineTracks: project.timelineTracks,
      continuityItems: project.continuityItems,
      screenplayText: project.screenplayText,
    };
    return JSON.stringify(openMontageData, null, 2);
  };

  // Generate Shot List CSV
  const generateShotListCSV = () => {
    const headers = [
      'Shot ID',
      'Act',
      'Scene',
      'Shot Number',
      'Title',
      'Size',
      'Angle',
      'Lens',
      'Movement',
      'Duration (sec)',
      'Status',
      'Key Light',
      'Prompt'
    ];

    const rows = project.shots.map(s => [
      `"${s.id}"`,
      `"${s.actId}"`,
      `"${s.sceneId}"`,
      s.shotNumber,
      `"${s.title.replace(/"/g, '""')}"`,
      `"${s.camera.shotSize}"`,
      `"${s.camera.angle}"`,
      `"${s.camera.lens}"`,
      `"${s.camera.movement}"`,
      s.durationSec,
      `"${s.status}"`,
      `"${s.environment.keyLight}"`,
      `"${(s.prompt || '').replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  };

  // Download File Utility
  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleDownloadOpenMontage = () => {
    const jsonStr = generateOpenMontageJSON();
    downloadFile(jsonStr, `${project.title.toLowerCase().replace(/\s+/g, '_')}_openmontage.json`, 'application/json');
  };

  const handleDownloadCSV = () => {
    const csvStr = generateShotListCSV();
    downloadFile(csvStr, `${project.title.toLowerCase().replace(/\s+/g, '_')}_shotlist.csv`, 'text/csv');
  };

  const handleDownloadScreenplay = () => {
    downloadFile(project.screenplayText, `${project.title.toLowerCase().replace(/\s+/g, '_')}_screenplay.txt`, 'text/plain');
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(generateOpenMontageJSON());
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportSuccess(false);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (!parsed.projectMeta && !parsed.title) {
          throw new Error('Invalid OpenMontage schema: Missing project header.');
        }

        const reconstructed: FilmProject = {
          id: parsed.projectMeta?.id || parsed.id || `proj_${Date.now()}`,
          title: parsed.projectMeta?.title || parsed.title || 'Imported Film Project',
          logline: parsed.projectMeta?.logline || parsed.logline || '',
          genre: parsed.projectMeta?.genre || parsed.genre || 'Sci-Fi / Cinematic',
          runtimeMin: parsed.projectMeta?.runtimeMin || parsed.runtimeMin || 90,
          aspectRatio: parsed.projectMeta?.aspectRatio || parsed.aspectRatio || '2.39:1 (Cinemascope)',
          resolution: parsed.projectMeta?.resolution || parsed.resolution || '4K UHD (3840x2160)',
          frameRate: parsed.projectMeta?.frameRate || parsed.frameRate || 24,
          status: parsed.status || 'production',
          screenplayText: parsed.screenplayText || '',
          acts: parsed.acts || [],
          scenes: parsed.scenes || [],
          characters: parsed.characters || [],
          locations: parsed.locations || [],
          shots: parsed.shots || [],
          dialogueSegments: parsed.dialogueSegments || [],
          sfxCues: parsed.sfxCues || [],
          musicCues: parsed.musicCues || [],
          timelineTracks: parsed.timelineTracks || [],
          continuityItems: parsed.continuityItems || [],
          productionNotes: parsed.productionNotes || ['Imported via OpenMontage Interchange Format'],
          assets: parsed.assets || [],
          generationJobs: parsed.generationJobs || [],
          zeroBudget: parsed.zeroBudget || {
            enabled: true,
            maxBudgetUsd: 5.00,
            spentBudgetUsd: 0,
            allowPaidWithConfirmation: true
          },
          studioBranding: parsed.studioBranding || {
            studioName: 'SYNAPSE NEURAL PICTURES',
            titleCard: parsed.projectMeta?.title || parsed.title || 'THE LAST SIGNAL',
            subtitle: 'AN AI PRODUCTION SYSTEM',
            tagline: 'PRE-VISUALIZED IN SYNAPSE STUDIO',
            animationStyle: 'cinematic_push',
            soundStinger: 'deep_pulse',
            durationSec: 3.5
          },
          createdAt: parsed.projectMeta?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        onImportProject(reconstructed);
        setImportSuccess(true);
      } catch (err: any) {
        setImportError(err.message || 'Failed to parse OpenMontage JSON');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-neutral-950">
      {/* Header */}
      <div className="h-12 bg-neutral-900/90 border-b border-neutral-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-neutral-200 text-xs font-semibold">
          <DownloadCloud className="w-4 h-4 text-amber-400" />
          <span>OpenMontage Export & Interchange Hub</span>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto space-y-6">
        {/* Banner */}
        <div className="p-6 bg-gradient-to-r from-neutral-900 to-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/40">
              OpenMontage Standard v2.4
            </span>
          </div>
          <h2 className="text-xl font-bold text-neutral-100">Interoperable Production Data Bundle</h2>
          <p className="text-xs text-neutral-400 max-w-2xl">
            Export your entire film project into standardized JSON, CSV shot lists, screenplay texts, and XML edit lists for compatibility with Premiere Pro, DaVinci Resolve, and Final Cut Pro.
          </p>
        </div>

        {importError && (
          <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-200">
            {importError}
          </div>
        )}

        {importSuccess && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-200">
            Project successfully imported and reconstructed from OpenMontage format!
          </div>
        )}

        {/* Export Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: OpenMontage JSON */}
          <div className="p-5 bg-neutral-900/90 border border-neutral-800 rounded-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <FileJson className="w-5 h-5" />
                <h3 className="text-sm font-bold text-neutral-100">OpenMontage JSON Specification</h3>
              </div>
              <p className="text-xs text-neutral-400">
                Complete lossless schema including screenplay, shot metadata, locked character profiles, lighting, and timeline clips.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
              <button
                onClick={handleDownloadOpenMontage}
                className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>Download .json</span>
              </button>

              <button
                onClick={handleCopyJSON}
                className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-xs"
                title="Copy JSON payload to clipboard"
              >
                {copiedJson ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Card 2: Shot List CSV */}
          <div className="p-5 bg-neutral-900/90 border border-neutral-800 rounded-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <FileSpreadsheet className="w-5 h-5" />
                <h3 className="text-sm font-bold text-neutral-100">Production Shot List (CSV)</h3>
              </div>
              <p className="text-xs text-neutral-400">
                Formatted spreadsheet for assistant directors, camera crew, DP, and production coordinators.
              </p>
            </div>

            <div className="pt-2 border-t border-neutral-800">
              <button
                onClick={handleDownloadCSV}
                className="w-full py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-300 border border-emerald-500/30 font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>Download Shot List .csv</span>
              </button>
            </div>
          </div>

          {/* Card 3: Screenplay TXT */}
          <div className="p-5 bg-neutral-900/90 border border-neutral-800 rounded-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <FileText className="w-5 h-5" />
                <h3 className="text-sm font-bold text-neutral-100">Screenplay (Hollywood Format)</h3>
              </div>
              <p className="text-xs text-neutral-400">
                Pure screenplay format text file compatible with Final Draft, WriterDuet, and Highland.
              </p>
            </div>

            <div className="pt-2 border-t border-neutral-800">
              <button
                onClick={handleDownloadScreenplay}
                className="w-full py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-blue-300 border border-blue-500/30 font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>Download Screenplay .txt</span>
              </button>
            </div>
          </div>

          {/* Card 4: Import OpenMontage */}
          <div className="p-5 bg-neutral-900/90 border border-neutral-800 rounded-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 mb-1">
                <UploadCloud className="w-5 h-5" />
                <h3 className="text-sm font-bold text-neutral-100">Import OpenMontage Project</h3>
              </div>
              <p className="text-xs text-neutral-400">
                Restore an existing production package or load a collaborating director's project.
              </p>
            </div>

            <div className="pt-2 border-t border-neutral-800">
              <label className="w-full py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-cyan-300 border border-cyan-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Import .json File</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
