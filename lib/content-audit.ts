type TopicLite = {
  id: number;
  slug: string;
  name: string;
  exercises: Array<{ difficulty: string; type: string }>;
};

export type TopicCoverage = {
  id: number;
  slug: string;
  name: string;
  total: number;
  intermediate: number;
  advanced: number;
  multiple_choice: number;
  fill_blank: number;
  error_correction: number;
  mini_production: number;
  warnings: string[];
  status: 'balanced' | 'partial' | 'weak';
};

export type CoverageSummary = {
  totalTopics: number;
  totalExercises: number;
  byDifficulty: Record<'intermediate' | 'advanced', number>;
  byType: Record<'multiple_choice' | 'fill_blank' | 'error_correction' | 'mini_production', number>;
};

export function buildCoverage(topics: TopicLite[]) {
  const summary: CoverageSummary = {
    totalTopics: topics.length,
    totalExercises: 0,
    byDifficulty: { intermediate: 0, advanced: 0 },
    byType: {
      multiple_choice: 0,
      fill_blank: 0,
      error_correction: 0,
      mini_production: 0,
    },
  };

  const perTopic: TopicCoverage[] = topics.map((topic) => {
    const total = topic.exercises.length;
    const intermediate = topic.exercises.filter((e) => e.difficulty === 'intermediate').length;
    const advanced = topic.exercises.filter((e) => e.difficulty === 'advanced').length;
    const multiple_choice = topic.exercises.filter((e) => e.type === 'multiple_choice').length;
    const fill_blank = topic.exercises.filter((e) => e.type === 'fill_blank').length;
    const error_correction = topic.exercises.filter((e) => e.type === 'error_correction').length;
    const mini_production = topic.exercises.filter((e) => e.type === 'mini_production').length;

    const warnings: string[] = [];
    if (total === 0) warnings.push('0 exercises');
    if (total < 10) warnings.push('< 10 exercises');
    if (intermediate === 0) warnings.push('no intermediate');
    if (advanced === 0) warnings.push('no advanced');
    if (multiple_choice === 0) warnings.push('no multiple_choice');
    if (fill_blank === 0) warnings.push('no fill_blank');
    if (error_correction === 0) warnings.push('no error_correction');
    if (mini_production === 0) warnings.push('no mini_production');

    let status: TopicCoverage['status'] = 'balanced';
    if (warnings.length >= 5 || total === 0) status = 'weak';
    else if (warnings.length > 0) status = 'partial';

    summary.totalExercises += total;
    summary.byDifficulty.intermediate += intermediate;
    summary.byDifficulty.advanced += advanced;
    summary.byType.multiple_choice += multiple_choice;
    summary.byType.fill_blank += fill_blank;
    summary.byType.error_correction += error_correction;
    summary.byType.mini_production += mini_production;

    return {
      id: topic.id,
      slug: topic.slug,
      name: topic.name,
      total,
      intermediate,
      advanced,
      multiple_choice,
      fill_blank,
      error_correction,
      mini_production,
      warnings,
      status,
    };
  });

  return { summary, perTopic };
}
