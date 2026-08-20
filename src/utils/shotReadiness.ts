import {
  FilmProject,
  ProductionValidationIssue,
  Shot,
  ShotTake,
} from '../types/film';

export type ShotReadinessState =
  | 'NOT READY'
  | 'IN PROGRESS'
  | 'READY FOR GENERATION'
  | 'TAKES AVAILABLE'
  | 'MASTER APPROVED'
  | 'PRODUCTION READY';

export type ReadinessCheckStatus = 'passed' | 'warning' | 'blocked' | 'not_applicable';

export interface ShotReadinessCheck {
  key: string;
  label: string;
  status: ReadinessCheckStatus;
  detail: string;
}

export interface ShotReadiness {
  shotId: string;
  score: number;
  state: ShotReadinessState;
  checks: ShotReadinessCheck[];
  unresolvedIssueCount: number;
}

export interface SceneReadiness {
  sceneId: string;
  score: number;
  state: ShotReadinessState;
  shotCount: number;
  readyShotCount: number;
}

export interface ShotListReadinessSummary {
  totalShots: number;
  productionReadyShots: number;
  masterApprovedShots: number;
  generatedTakeShots: number;
  readyForGenerationShots: number;
  notReadyShots: number;
  readinessPercentage: number;
}

export type SceneRecommendationCategory =
  | 'UNAPPROVED MASTERS'
  | 'MISSING VISUAL TAKES'
  | 'CONTINUITY'
  | 'DIALOGUE'
  | 'REJECTED TAKES';

export type SceneRecommendationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ShotListReadinessFilter = 'missing_master' | 'missing_visual_take' | 'continuity' | 'dialogue' | 'rejected_takes' | 'not_ready';

export interface ShotListNavigationOptions {
  sceneId?: string;
  readinessFilter?: ShotListReadinessFilter;
}

export interface SceneRecommendation {
  sceneId: string;
  sceneNumber: number;
  sceneName: string;
  affectedShotCount: number;
  affectedShotIds: string[];
  issueCount: number;
  category: SceneRecommendationCategory;
  explanation: string;
  priority: SceneRecommendationPriority;
  targetTab: 'SHOT_LIST' | 'CONTINUITY' | 'DIALOGUE';
  readinessFilter?: ShotListReadinessFilter;
}

export interface FilmProductionHealthSummary {
  totalScenes: number;
  totalShots: number;
  productionReadyShots: number;
  masterApprovedShots: number;
  shotsWithVisualTakes: number;
  shotsMissingVisualTakes: number;
  shotsWithUnresolvedContinuityIssues: number;
  shotsMissingDialogue: number;
  rejectedTakes: number;
  productionReadinessPercentage: number;
  activeHighPriorityRecommendations: number;
  recommendations: SceneRecommendation[];
}

export interface ProductionSupervisorSummary {
  filmReadiness: number;
  totalShots: number;
  productionReadyShots: number;
  generatedTakeShots: number;
  masterApprovedShots: number;
  continuityIssues: number;
  shotsMissingDialogue: number;
  shotsWithoutMaster: number;
  locationsMissingReferences: number;
  recommendation: string;
  recommendationTarget: 'VALIDATION' | 'CONTINUITY' | 'SHOT_LIST' | 'DIALOGUE' | 'LOCATIONS';
  recommendations: SceneRecommendation[];
  filmHealth: FilmProductionHealthSummary;
}

const hasText = (value?: string): boolean => Boolean(value?.trim());

const getShotDialogue = (project: FilmProject, shot: Shot) => {
  const ids = new Set(shot.dialogueSegmentIds || []);
  return project.dialogueSegments.filter(segment => ids.has(segment.id) || segment.shotId === shot.id);
};

const getMatchingValidationIssues = (project: FilmProject, shot: Shot): ProductionValidationIssue[] =>
  (project.validationIssues || []).filter(issue => issue.targetId === shot.id || issue.section === shot.sceneId);

const getVisualAssets = (project: FilmProject, shot: Shot) =>
  project.assets.filter(asset =>
    asset.shotId === shot.id &&
    (asset.type === 'REFERENCE' || asset.type === 'IMAGE') &&
    Boolean(asset.url || asset.thumbnailUrl)
  );

const getTakeAudioUrl = (take: { audioUrl?: string }): string | undefined => take.audioUrl;

const hasGeneratedVisualTake = (takes: ShotTake[]): boolean =>
  takes.some(take => (take.type === 'image' || take.type === 'video') && hasText(take.url));

const hasApprovedMasterTake = (takes: ShotTake[]): boolean =>
  takes.some(take => (take.approved || take.isMaster) && hasText(take.url));

const getCheck = (
  key: string,
  label: string,
  status: ReadinessCheckStatus,
  detail: string
): ShotReadinessCheck => ({ key, label, status, detail });

const checkScore = (check: ShotReadinessCheck): number => {
  if (check.status === 'passed') return 1;
  if (check.status === 'warning') return 0.5;
  if (check.status === 'not_applicable') return 0;
  return 0;
};

const calculateScore = (checks: ShotReadinessCheck[]): number => {
  const applicableChecks = checks.filter(check => check.status !== 'not_applicable');
  if (applicableChecks.length === 0) return 0;
  return Math.round(
    (applicableChecks.reduce((total, check) => total + checkScore(check), 0) / applicableChecks.length) * 100
  );
};

const getState = (
  score: number,
  checks: ShotReadinessCheck[],
  hasGeneratedTake: boolean,
  hasMasterTake: boolean
): ShotReadinessState => {
  const blockedChecks = checks.filter(check => check.status === 'blocked');
  const generationGateKeys = new Set([
    'screenplay',
    'dialogue_coverage',
    'character_locks',
    'location_lock',
    'cinematography',
    'compiled_prompt',
    'generation_jobs',
    'continuity',
    'validation_issues',
  ]);
  const generationGatesClear = checks
    .filter(check => generationGateKeys.has(check.key) && check.status !== 'not_applicable')
    .every(check => check.status === 'passed');

  if (score === 100 && blockedChecks.length === 0) return 'PRODUCTION READY';
  if (hasMasterTake) return 'MASTER APPROVED';
  if (hasGeneratedTake) return 'TAKES AVAILABLE';
  if (generationGatesClear && score >= 60) return 'READY FOR GENERATION';
  if (score < 40 || blockedChecks.length >= 3) return 'NOT READY';
  return 'IN PROGRESS';
};

export const calculateShotReadiness = (project: FilmProject, shot: Shot): ShotReadiness => {
  const scene = project.scenes.find(item => item.id === shot.sceneId);
  const location = project.locations.find(item => item.id === shot.environment.locationId);
  const characters = project.characters.filter(character => shot.subject.characterIds.includes(character.id));
  const dialogue = getShotDialogue(project, shot);
  const referencedDialogueIds = shot.dialogueSegmentIds || [];
  const missingDialogueReferences = referencedDialogueIds.filter(id => !dialogue.some(segment => segment.id === id));
  const validationIssues = getMatchingValidationIssues(project, shot);
  const continuityItems = project.continuityItems.filter(item =>
    item.shotIds.includes(shot.id) || item.sceneIds?.includes(shot.sceneId)
  );
  const unresolvedContinuityItems = continuityItems.filter(item => item.status !== 'resolved');
  const visualAssets = getVisualAssets(project, shot);
  const takes = shot.takes || [];
  const visualGenerationJobs = project.generationJobs.filter(job =>
    job.shotId === shot.id && (job.targetType === 'image' || job.targetType === 'video')
  );
  const activeVisualGenerationJob = visualGenerationJobs.some(job => job.status === 'queued' || job.status === 'generating');
  const failedVisualGenerationJob = visualGenerationJobs.some(job => job.status === 'failed');
  const completedVisualGenerationJob = visualGenerationJobs.some(job => job.status === 'completed' && hasText(job.resultUrl));
  const generatedTake = hasGeneratedVisualTake(takes) || completedVisualGenerationJob;
  const approvedMasterTake = hasApprovedMasterTake(takes);

  const requiredCameraFields = [
    shot.camera.shotSize,
    shot.camera.angle,
    shot.camera.lens,
    shot.camera.depthOfField,
    shot.camera.movement,
    shot.camera.composition,
  ];
  const requiredEnvironmentFields = [
    shot.environment.keyLight,
    shot.environment.fillLight,
    shot.environment.rimLight,
    shot.environment.colorTemp,
    shot.environment.contrast,
  ];
  const cinematographyFieldCount = requiredCameraFields.length + requiredEnvironmentFields.length;
  const populatedCinematographyFields = [...requiredCameraFields, ...requiredEnvironmentFields]
    .filter(value => Boolean(value)).length;

  const musicCues = project.musicCues.filter(cue => cue.sceneId === shot.sceneId);
  const sfxCues = project.sfxCues.filter(cue => cue.shotId === shot.id || cue.sceneId === shot.sceneId);
  const musicAssets = project.assets.filter(asset =>
    asset.type === 'MUSIC' &&
    (asset.shotId === shot.id || asset.sceneId === shot.sceneId) &&
    hasText(asset.url)
  );
  const musicRequired = hasText(shot.musicPrompt) || musicCues.length > 0 || musicAssets.length > 0;
  const sfxRequired = hasText(shot.sfxPrompt) || sfxCues.length > 0;
  const musicReady = musicCues.some(cue => hasText(cue.audioUrl) || cue.status === 'ready') || musicAssets.length > 0;
  const sfxAssets = project.assets.filter(asset =>
    asset.shotId === shot.id && asset.type === 'SFX' && hasText(asset.url)
  );
  const sfxReady = sfxCues.some(cue => hasText(cue.audioUrl)) || sfxAssets.length > 0;

  const checks: ShotReadinessCheck[] = [
    getCheck(
      'screenplay',
      'Screenplay coverage',
      scene && (scene.shotIds.includes(shot.id) || hasText(shot.description)) ? 'passed' : 'blocked',
      scene
        ? `Scene ${scene.id} is linked${scene.shotIds.includes(shot.id) ? ' and includes this shot' : ''}.`
        : 'Shot is not linked to a scene.'
    ),
    getCheck(
      'dialogue_coverage',
      'Dialogue coverage',
      dialogue.length === 0 && referencedDialogueIds.length === 0
        ? 'not_applicable'
        : missingDialogueReferences.length === 0
        ? 'passed'
        : dialogue.length > 0
        ? 'warning'
        : 'blocked',
      dialogue.length === 0 && referencedDialogueIds.length === 0
        ? 'No dialogue is assigned to this shot.'
        : missingDialogueReferences.length === 0
        ? `${dialogue.length} dialogue segment(s) assigned to this shot.`
        : `${missingDialogueReferences.length} referenced dialogue segment(s) could not be found.`
    ),
    getCheck(
      'storyboard_reference',
      'Storyboard/reference image',
      shot.storyboardImageUrl || visualAssets.length > 0 ? 'passed' : 'blocked',
      shot.storyboardImageUrl
        ? 'Shot has a storyboard image.'
        : visualAssets.length > 0
        ? `${visualAssets.length} visual reference asset(s) available.`
        : 'No storyboard image or visual reference asset is available.'
    ),
    getCheck(
      'character_locks',
      'Character locks',
      characters.length === 0
        ? 'not_applicable'
        : characters.every(character => character.isLocked)
        ? 'passed'
        : characters.some(character => character.isLocked)
        ? 'warning'
        : 'blocked',
      characters.length === 0
        ? 'No characters are assigned to this shot.'
        : `${characters.filter(character => character.isLocked).length}/${characters.length} assigned character(s) locked.`
    ),
    getCheck(
      'location_lock',
      'Location lock',
      !location ? 'blocked' : location.isLocked ? 'passed' : 'warning',
      !location
        ? 'Shot location is missing.'
        : location.isLocked
        ? `${location.name} is locked.`
        : `${location.name} exists but is not locked.`
    ),
    getCheck(
      'cinematography',
      'Cinematography parameters',
      populatedCinematographyFields === cinematographyFieldCount
        ? 'passed'
        : populatedCinematographyFields >= cinematographyFieldCount / 2
        ? 'warning'
        : 'blocked',
      `${populatedCinematographyFields}/${cinematographyFieldCount} core camera and lighting fields populated.`
    ),
    getCheck(
      'compiled_prompt',
      'Compiled prompt',
      hasText(shot.prompt) ? 'passed' : 'blocked',
      hasText(shot.prompt) ? 'Cinematic prompt is compiled.' : 'No compiled prompt is available.'
    ),
    getCheck(
      'generation_jobs',
      'Generation job status',
      visualGenerationJobs.length === 0
        ? 'not_applicable'
        : failedVisualGenerationJob
        ? 'blocked'
        : activeVisualGenerationJob
        ? 'warning'
        : 'passed',
      visualGenerationJobs.length === 0
        ? 'No visual generation job is queued for this shot.'
        : failedVisualGenerationJob
        ? 'A visual generation job has failed.'
        : activeVisualGenerationJob
        ? 'A visual generation job is queued or running.'
        : 'Visual generation jobs completed successfully.'
    ),
    getCheck(
      'generated_visual_take',
      'Generated visual take',
      generatedTake ? 'passed' : 'blocked',
      generatedTake
        ? `${takes.filter(take => (take.type === 'image' || take.type === 'video') && hasText(take.url)).length || (completedVisualGenerationJob ? 1 : 0)} visual take(s) available.`
        : 'No generated visual take is available.'
    ),
    getCheck(
      'approved_master_take',
      'Approved/master take',
      approvedMasterTake ? 'passed' : 'blocked',
      approvedMasterTake ? 'An approved or master take is available.' : 'No approved or master take is available.'
    ),
    getCheck(
      'dialogue_audio',
      'Dialogue/audio availability',
      dialogue.length === 0
        ? 'not_applicable'
        : dialogue.every(segment =>
            hasText(segment.audioUrl) ||
            Boolean(segment.takes?.some(take => getTakeAudioUrl(take) && take.approved))
          )
        ? 'passed'
        : dialogue.some(segment => hasText(segment.audioUrl) || segment.takes?.some(take => getTakeAudioUrl(take) && take.approved))
        ? 'warning'
        : 'blocked',
      dialogue.length === 0
        ? 'No dialogue audio is required for this shot.'
        : `${dialogue.filter(segment => hasText(segment.audioUrl) || segment.takes?.some(take => getTakeAudioUrl(take) && take.approved)).length}/${dialogue.length} dialogue segment(s) have approved audio.`
    ),
    getCheck(
      'music_sfx',
      'Music/SFX requirements',
      !musicRequired && !sfxRequired
        ? 'not_applicable'
        : (!musicRequired || musicReady) && (!sfxRequired || sfxReady)
        ? 'passed'
        : (musicRequired && musicReady) || (sfxRequired && sfxReady)
        ? 'warning'
        : 'blocked',
      !musicRequired && !sfxRequired
        ? 'No music or SFX requirement is assigned.'
        : `${musicRequired ? `Music ${musicReady ? 'available' : 'missing'}` : 'No music required'}; ${sfxRequired ? `SFX ${sfxReady ? 'available' : 'missing'}` : 'No SFX required'}.`
    ),
    getCheck(
      'continuity',
      'Continuity status',
      continuityItems.length === 0
        ? 'not_applicable'
        : unresolvedContinuityItems.length === 0
        ? 'passed'
        : unresolvedContinuityItems.some(item => item.severity === 'error' || item.status === 'violation')
        ? 'blocked'
        : 'warning',
      continuityItems.length === 0
        ? 'No continuity checks are assigned.'
        : unresolvedContinuityItems.length === 0
        ? 'All linked continuity checks are resolved.'
        : `${unresolvedContinuityItems.length} linked continuity issue(s) remain unresolved.`
    ),
    getCheck(
      'validation_issues',
      'Unresolved validation issues',
      validationIssues.length === 0 ? 'passed' : 'blocked',
      validationIssues.length === 0
        ? 'No unresolved production validation issues are linked.'
        : `${validationIssues.length} unresolved validation issue(s) are linked.`
    ),
  ];

  const unresolvedIssueCount =
    validationIssues.length +
    unresolvedContinuityItems.length +
    shot.continuityFlags.length;
  const score = calculateScore(checks);

  return {
    shotId: shot.id,
    score,
    state: getState(score, checks, generatedTake, approvedMasterTake),
    checks,
    unresolvedIssueCount,
  };
};

export const calculateShotListReadiness = (
  project: FilmProject,
  shots: Shot[]
): ShotListReadinessSummary => {
  const readiness = shots.map(shot => calculateShotReadiness(project, shot));
  const productionReadyShots = readiness.filter(item => item.state === 'PRODUCTION READY').length;
  const masterApprovedShots = readiness.filter(item =>
    item.state === 'MASTER APPROVED' || item.state === 'PRODUCTION READY'
  ).length;
  const generatedTakeShots = readiness.filter(item => [
    'TAKES AVAILABLE',
    'MASTER APPROVED',
    'PRODUCTION READY',
  ].includes(item.state)).length;

  return {
    totalShots: shots.length,
    productionReadyShots,
    masterApprovedShots,
    generatedTakeShots,
    readyForGenerationShots: readiness.filter(item => item.state === 'READY FOR GENERATION').length,
    notReadyShots: readiness.filter(item => item.state === 'NOT READY').length,
    readinessPercentage: shots.length === 0 ? 0 : Math.round((productionReadyShots / shots.length) * 100),
  };
};

export const calculateSceneRecommendations = (project: FilmProject): SceneRecommendation[] => {
  const priorityRank: Record<SceneRecommendationPriority, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };
  const recommendations: SceneRecommendation[] = [];

  project.scenes.forEach(scene => {
    const shots = project.shots.filter(shot => shot.sceneId === scene.id);
    const evaluatedShots = shots.map(shot => ({ shot, readiness: calculateShotReadiness(project, shot) }));
    const getCheckStatus = (shotId: string, key: string) =>
      evaluatedShots.find(item => item.shot.id === shotId)?.readiness.checks.find(check => check.key === key)?.status;
    const addRecommendation = (
      category: SceneRecommendationCategory,
      priority: SceneRecommendationPriority,
      issueCount: number,
      affectedShotIds: string[],
      explanation: string,
      targetTab: SceneRecommendation['targetTab'],
      readinessFilter?: ShotListReadinessFilter
    ) => {
      if (issueCount === 0 || affectedShotIds.length === 0) return;
      recommendations.push({
        sceneId: scene.id,
        sceneNumber: scene.sceneNumber,
        sceneName: scene.heading,
        affectedShotCount: affectedShotIds.length,
        affectedShotIds,
        issueCount,
        category,
        explanation,
        priority,
        targetTab,
        readinessFilter,
      });
    };

    const missingMasterShotIds = evaluatedShots
      .filter(item => getCheckStatus(item.shot.id, 'approved_master_take') === 'blocked')
      .map(item => item.shot.id);
    addRecommendation(
      'UNAPPROVED MASTERS',
      'HIGH',
      missingMasterShotIds.length,
      missingMasterShotIds,
      `Review ${missingMasterShotIds.length} unapproved master${missingMasterShotIds.length === 1 ? '' : 's'} in Scene ${scene.sceneNumber}.`,
      'SHOT_LIST',
      'missing_master'
    );

    const missingVisualShotIds = evaluatedShots
      .filter(item => getCheckStatus(item.shot.id, 'generated_visual_take') === 'blocked')
      .map(item => item.shot.id);
    addRecommendation(
      'MISSING VISUAL TAKES',
      'MEDIUM',
      missingVisualShotIds.length,
      missingVisualShotIds,
      `Generate ${missingVisualShotIds.length} shot${missingVisualShotIds.length === 1 ? '' : 's'} missing visual takes in Scene ${scene.sceneNumber}.`,
      'SHOT_LIST',
      'missing_visual_take'
    );

    const dialogueShotIds = evaluatedShots
      .filter(item => getCheckStatus(item.shot.id, 'dialogue_coverage') === 'blocked')
      .map(item => item.shot.id);
    addRecommendation(
      'DIALOGUE',
      'LOW',
      dialogueShotIds.length,
      dialogueShotIds,
      `Complete dialogue coverage for ${dialogueShotIds.length} shot${dialogueShotIds.length === 1 ? '' : 's'} in Scene ${scene.sceneNumber}.`,
      'DIALOGUE',
      'dialogue'
    );

    const rejectedTakeShotIds = shots
      .filter(shot => shot.takes.some(take => take.rejected))
      .map(shot => shot.id);
    const rejectedTakeCount = shots.reduce(
      (count, shot) => count + shot.takes.filter(take => take.rejected).length,
      0
    );
    addRecommendation(
      'REJECTED TAKES',
      'MEDIUM',
      rejectedTakeCount,
      rejectedTakeShotIds,
      `Review ${rejectedTakeCount} rejected take${rejectedTakeCount === 1 ? '' : 's'} in Scene ${scene.sceneNumber}.`,
      'SHOT_LIST',
      'rejected_takes'
    );

    const continuityItems = project.continuityItems.filter(item =>
      item.status !== 'resolved' &&
      (item.sceneIds?.includes(scene.id) || item.shotIds.some(shotId => shots.some(shot => shot.id === shotId)))
    );
    const continuityShotIds = Array.from(new Set(
      continuityItems.flatMap(item => item.shotIds.filter(shotId => shots.some(shot => shot.id === shotId)))
    ));
    addRecommendation(
      'CONTINUITY',
      continuityItems.some(item => item.severity === 'error' || item.status === 'violation') ? 'CRITICAL' : 'HIGH',
      continuityItems.length,
      continuityShotIds.length > 0 ? continuityShotIds : shots.map(shot => shot.id),
      `Resolve ${continuityItems.length} continuity issue${continuityItems.length === 1 ? '' : 's'} in Scene ${scene.sceneNumber}.`,
      'CONTINUITY',
      'continuity'
    );
  });

  return recommendations.sort((a, b) =>
    priorityRank[a.priority] - priorityRank[b.priority] ||
    b.issueCount - a.issueCount ||
    a.sceneNumber - b.sceneNumber ||
    a.category.localeCompare(b.category)
  );
};

export const calculateFilmProductionHealth = (project: FilmProject): FilmProductionHealthSummary => {
  const shotSummary = calculateShotListReadiness(project, project.shots);
  const shotReadiness = project.shots.map(shot => calculateShotReadiness(project, shot));
  const recommendations = calculateSceneRecommendations(project);

  return {
    totalScenes: project.scenes.length,
    totalShots: shotSummary.totalShots,
    productionReadyShots: shotSummary.productionReadyShots,
    masterApprovedShots: shotSummary.masterApprovedShots,
    shotsWithVisualTakes: shotSummary.generatedTakeShots,
    shotsMissingVisualTakes: shotReadiness.filter(readiness =>
      readiness.checks.some(check => check.key === 'generated_visual_take' && check.status === 'blocked')
    ).length,
    shotsWithUnresolvedContinuityIssues: shotReadiness.filter(readiness =>
      readiness.checks.some(check => check.key === 'continuity' && (check.status === 'blocked' || check.status === 'warning'))
    ).length,
    shotsMissingDialogue: shotReadiness.filter(readiness =>
      readiness.checks.some(check => check.key === 'dialogue_coverage' && check.status === 'blocked')
    ).length,
    rejectedTakes: project.shots.reduce(
      (total, shot) => total + shot.takes.filter(take => take.rejected).length,
      0
    ),
    productionReadinessPercentage: shotSummary.readinessPercentage,
    activeHighPriorityRecommendations: recommendations.filter(recommendation =>
      recommendation.priority === 'CRITICAL' || recommendation.priority === 'HIGH'
    ).length,
    recommendations,
  };
};

export const calculateProductionSupervisorSummary = (project: FilmProject): ProductionSupervisorSummary => {
  const filmHealth = calculateFilmProductionHealth(project);
  const topRecommendation = filmHealth.recommendations[0];
  const locationsMissingReferences = project.locations.filter(location =>
    !location.masterReferenceImage &&
    location.referenceImages.length === 0 &&
    !location.masterReferences?.wideRefUrl &&
    !location.masterReferences?.interiorRefUrl
  ).length;
  const continuityIssues = project.continuityItems.filter(item => item.status !== 'resolved').length;
  const shotsWithoutMaster = filmHealth.totalShots - filmHealth.masterApprovedShots;

  return {
    filmReadiness: filmHealth.productionReadinessPercentage,
    totalShots: filmHealth.totalShots,
    productionReadyShots: filmHealth.productionReadyShots,
    generatedTakeShots: filmHealth.shotsWithVisualTakes,
    masterApprovedShots: filmHealth.masterApprovedShots,
    continuityIssues,
    shotsMissingDialogue: filmHealth.shotsMissingDialogue,
    shotsWithoutMaster,
    locationsMissingReferences,
    recommendation: topRecommendation?.explanation || 'Production data is aligned. Continue monitoring the readiness matrix.',
    recommendationTarget: topRecommendation?.targetTab || 'VALIDATION',
    recommendations: filmHealth.recommendations,
    filmHealth,
  };
};

export const calculateSceneReadiness = (project: FilmProject, sceneId: string): SceneReadiness => {
  const shots = project.shots.filter(shot => shot.sceneId === sceneId);
  const readiness = shots.map(shot => calculateShotReadiness(project, shot));
  const score = shots.length === 0
    ? 0
    : Math.round(readiness.reduce((total, item) => total + item.score, 0) / shots.length);
  const allProductionReady = readiness.length > 0 && readiness.every(item => item.state === 'PRODUCTION READY');
  const allMasterApproved = readiness.length > 0 && readiness.every(item =>
    item.state === 'MASTER APPROVED' || item.state === 'PRODUCTION READY'
  );
  const allHaveTakes = readiness.length > 0 && readiness.every(item => [
    'TAKES AVAILABLE',
    'MASTER APPROVED',
    'PRODUCTION READY',
  ].includes(item.state));
  const allReadyForGeneration = readiness.length > 0 && readiness.every(item => [
    'READY FOR GENERATION',
    'TAKES AVAILABLE',
    'MASTER APPROVED',
    'PRODUCTION READY',
  ].includes(item.state));

  let state: ShotReadinessState = 'NOT READY';
  if (allProductionReady) state = 'PRODUCTION READY';
  else if (allMasterApproved) state = 'MASTER APPROVED';
  else if (allHaveTakes) state = 'TAKES AVAILABLE';
  else if (allReadyForGeneration) state = 'READY FOR GENERATION';
  else if (score >= 40) state = 'IN PROGRESS';

  return {
    sceneId,
    score,
    state,
    shotCount: shots.length,
    readyShotCount: readiness.filter(item => item.state === 'PRODUCTION READY').length,
  };
};
