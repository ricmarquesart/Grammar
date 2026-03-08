export const DIFFICULTIES = ['intermediate', 'advanced'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const EXERCISE_TYPES = ['multiple_choice', 'fill_blank', 'error_correction', 'mini_production'] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const SESSION_MODES = ['daily', 'manual', 'review'] as const;
export type SessionMode = (typeof SESSION_MODES)[number];

export function isDifficulty(value: string): value is Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(value);
}

export function isExerciseType(value: string): value is ExerciseType {
  return (EXERCISE_TYPES as readonly string[]).includes(value);
}

export function isSessionMode(value: string): value is SessionMode {
  return (SESSION_MODES as readonly string[]).includes(value);
}
