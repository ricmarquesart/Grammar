import { prisma } from '@/lib/prisma';
import { Difficulty, ExerciseType } from '@/lib/types';

type ReviewFilters = {
  topic?: string;
  type?: ExerciseType;
  difficulty?: Difficulty;
};

export default async function ReviewPage({ searchParams }: { searchParams: ReviewFilters }) {
  const attempts = await prisma.attempt.findMany({
    where: {
      ...(searchParams.topic ? { topic: { is: { slug: searchParams.topic } } } : {}),
      ...(searchParams.type || searchParams.difficulty
        ? {
            exercise: {
              is: {
                ...(searchParams.type ? { type: searchParams.type } : {}),
                ...(searchParams.difficulty ? { difficulty: searchParams.difficulty } : {}),
              },
            },
          }
        : {}),
    },
    include: { topic: true, exercise: true, session: true },
    orderBy: [{ isCorrect: 'asc' }, { createdAt: 'desc' }],
    take: 120,
  });

  const missesByExercise = attempts.reduce<Record<number, number>>((acc, attempt) => {
    if (!attempt.isCorrect) acc[attempt.exerciseId] = (acc[attempt.exerciseId] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="card">
      <h2>Exercise Review</h2>
      <p className="small">Incorrect attempts are shown first. Use this page to spot repeated mistakes by topic/type/difficulty.</p>
      {attempts.map((a) => (
        <article key={a.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '.7rem', marginBottom: '.7rem' }}>
          <div><strong>{a.topic.name}</strong> | {a.exercise.type} | {a.exercise.difficulty} | mode: {a.session.mode}</div>
          <div className="small">Your answer: {a.userAnswer}</div>
          <div>{a.isCorrect ? '✅ Correct' : '❌ Incorrect'}</div>
          {!a.isCorrect && (missesByExercise[a.exerciseId] ?? 0) >= 2 ? <div className="small">⚠️ Missed multiple times ({missesByExercise[a.exerciseId]} recent misses)</div> : null}
          <div className="small">Rule: {a.exercise.ruleSummary}</div>
          <div className="small">Explanation: {a.exercise.explanationCorrect}</div>
        </article>
      ))}
    </div>
  );
}
