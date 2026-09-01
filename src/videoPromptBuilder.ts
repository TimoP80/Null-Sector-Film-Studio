import { Shot } from './types/film';
import { ShotMotionSpecification } from './videoTypes';

const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

export const buildImageToVideoPrompt = (
  shot: Partial<Shot>,
  motion: ShotMotionSpecification = {},
  continuityInstructions: string[] = [],
): string => {
  const subject = shot.subject;
  const environment = shot.environment;
  const camera = shot.camera;
  const sections = [
    text(shot.description),
    subject && [subject.pose, subject.expression, subject.action, subject.wardrobe].filter(Boolean).join('. '),
    environment && [environment.atmosphere, environment.backgroundActivity, environment.mood, environment.lightingType].filter(Boolean).join('. '),
    [motion.cameraSpeed, motion.cameraMovement, motion.cameraDirection, motion.framing, motion.lens].filter(Boolean).join(' '),
    [motion.subjectMovement, motion.facialMovement, motion.environmentalMovement, motion.lightingMovement, motion.atmosphere].filter(Boolean).join('. '),
    camera && `Maintain ${camera.shotSize.replace(/_/g, ' ')} framing, ${camera.angle.replace(/_/g, ' ')} angle, ${camera.lens}.`,
    continuityInstructions.length ? `Continuity locks: ${continuityInstructions.join('; ')}.` : '',
    motion.negativeMotionInstructions || 'No morphing, identity changes, wardrobe changes, sudden motion, camera shake, or composition drift.',
  ].filter(Boolean).join('\n\n');
  return sections || 'Preserve the source image and add subtle, physically plausible cinematic motion.';
};
