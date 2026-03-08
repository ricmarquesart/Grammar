import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { finishSession } from '@/app/actions';
import { parseJson } from '@/lib/json-storage';
import { Difficulty, ExerciseType } from '@/lib/types';

type SessionAssignment = {
  topicIds: number[];
  difficulty: Difficulty | 'mixed';
  type: ExerciseType | 'mixed';
  exerciseIds?: number[];
  reviewSource?: 'mistakes';
};

type ExerciseRow = {
  id: number;
  topicId: number;
  type: string;
  difficulty: string;
  prompt: string;
  questionData: string;
};

type QuestionData = {
  sentence?: string;
  options?: string[];
  sentenceWithBlank?: string;
  incorrectSentence?: string;
  scenario?: string;
  task?: string;
};

function parseAssignment(raw: string): SessionAssignment {
  return parseJson<SessionAssignment>(raw, { topicIds: [], difficulty: 'mixed', type: 'mixed' });
}

function renderQuestion(exercise: ExerciseRow) {
  const q = parseJson<QuestionData>(exercise.questionData, {});
  if (exercise.type === 'multiple_choice') {
    return (
      <>
        <p>{q.sentence}</p>
        <select name="userAnswer" required>
          <option value="">Select</option>
          {(q.options ?? []).map((opt) => {
            const key = opt.split('.')[0];
            return (
              <option key={key} value={key}>
                {opt}
              </option>
            );
          })}
        </select>
      </>
    );
  }

  if (exercise.type === 'fill_blank') {
    return (
      <>
        <p>{q.sentenceWithBlank}</p>
        <input name="userAnswer" placeholder="Type answer" required />
      </>
    );
  }

  if (exercise.type === 'error_correction') {
    return (
      <>
        <p>{q.incorrectSentence}</p>
        <textarea name="userAnswer" rows={3} required />
      </>
    );
  }

  return (
    <>
      <p>
        <strong>Scenario:</strong> {q.scenario}
      </p>
      <p>
        <strong>Task:</strong> {q.task}
      </p>
      <textarea name="userAnswer" rows={4} required />
      <label>Self-rating (1-5)</label>
      <input type="number" min={1} max={5} name="selfRating" required />
    </>
  );
}

export default async function SessionPage({ params, searchParams }: { params: { sessionId: string }; searchParams: { attempt?: string } }) {
  try {
    const sessionId = Number(params.sessionId);
    const session = await prisma.studySession.findUnique({ where: { id: sessionId } });
    if (!session) return <div className="card">Session not found.</div>;

    const assigned = parseAssignment(session.assignedTopics);
    const topics = await prisma.topic.findMany({ where: { id: { in: assigned.topicIds } } });

    const exercises = await prisma.exercise.findMany({
      where: {
        ...(assigned.exerciseIds?.length ? { id: { in: assigned.exerciseIds } } : { topicId: { in: assigned.topicIds } }),
        isActive: true,
        ...(assigned.difficulty !== 'mixed' ? { difficulty: assigned.difficulty } : {}),
        ...(assigned.type !== 'mixed' ? { type: assigned.type } : {}),
      },
      orderBy: { id: 'asc' },
      select: { id: true, topicId: true, type: true, difficulty: true, prompt: true, questionData: true },
    });

    const chosen =
      session.mode === 'manual'
        ? exercises.slice(0, 6)
        : assigned.exerciseIds?.length
          ? assigned.exerciseIds.map((id) => exercises.find((e) => e.id === id)).filter((e): e is ExerciseRow => Boolean(e))
          : assigned.topicIds.map((id) => exercises.find((e) => e.topicId === id)).filter((e): e is ExerciseRow => Boolean(e));

    const totalAttempts = await prisma.attempt.count({ where: { sessionId } });
    const progress = Math.min(100, Math.round((totalAttempts / Math.max(chosen.length, 1)) * 100));

    const latestAttempt = searchParams.attempt
      ? await prisma.attempt.findUnique({ where: { id: Number(searchParams.attempt) }, include: { exercise: true, topic: true } })
      : null;

    const title = session.mode === 'manual' ? 'Practice Session' : session.mode === 'review' ? 'Review My Mistakes' : "Today's Session";

    return (
      <div>
        <div className="card">
          <h2>{title}</h2>
          <p>Assigned topics: {topics.map((t) => t.name).join(', ') || 'Mixed review set'}</p>
          <div className="progress">
            <div style={{ width: `${progress}%` }} />
          </div>
        </div>

        {latestAttempt && (
          <div className="card">
            <h3>{latestAttempt.isCorrect ? '✅ Correct' : '❌ Incorrect'}</h3>
            <p><strong>Topic:</strong> {latestAttempt.topic.name}</p>
            <p><strong>Correct answer:</strong> {JSON.stringify(parseJson(latestAttempt.exercise.correctAnswer, {}))}</p>
            <p><strong>Why correct:</strong> {latestAttempt.exercise.explanationCorrect}</p>
            <p><strong>Why wrong:</strong> {latestAttempt.exercise.explanationWrong}</p>
            <p><strong>Rule summary:</strong> {latestAttempt.exercise.ruleSummary}</p>
            <p><strong>Extra example:</strong> {latestAttempt.exercise.extraExample}</p>
            <span className="badge">{latestAttempt.exercise.type}</span>
            <span className="badge">{latestAttempt.exercise.difficulty}</span>
          </div>
        )}

        {chosen.map((exercise) => (
          <form key={exercise.id} className="card" method="post" action={`/session/${sessionId}/submit`}>
            <h3>{topics.find((t) => t.id === exercise.topicId)?.name}</h3>
            <p>{exercise.prompt}</p>
            {renderQuestion(exercise)}
            <input type="hidden" name="exerciseId" value={exercise.id} />
            <input type="hidden" name="topicId" value={exercise.topicId} />
            <button className="btn" type="submit">Submit</button>
          </form>
        ))}

        <form action={async () => { 'use server'; await finishSession(sessionId); }} className="card">
          <button className="btn btn-secondary">Finish Session</button>
          <Link className="badge" href="/results">View Summary</Link>
        </form>
      </div>
    );
  } catch (error) {
    console.error('Session page failed', { params, error });
    return <div className="card">Could not load this session. Check logs and try running FIRST_SETUP.bat again.</div>;
  }
}
