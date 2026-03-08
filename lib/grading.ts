import { normalizeInput } from './text';
import { ExerciseType } from './types';

export function gradeExercise(type: ExerciseType, questionData: Record<string, any>, userAnswer: string) {
  const normalized = normalizeInput(userAnswer);

  if (type === 'multiple_choice') {
    return normalizeInput(questionData.answerKey || '') === normalized;
  }

  if (type === 'fill_blank') {
    const accepted = (questionData.acceptedAnswers ?? []).map((v: string) => normalizeInput(v));
    return accepted.includes(normalized);
  }

  if (type === 'error_correction') {
    const accepted = (questionData.acceptedCorrections ?? []).map((v: string) => normalizeInput(v));
    return accepted.includes(normalized);
  }

  return false;
}
