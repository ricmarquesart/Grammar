import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { percent } from '@/lib/analytics';
import { parseJson } from '@/lib/json-storage';
import { startReviewMistakesAction, startTodaySessionAction } from './actions';

export default async function HomePage() {
  try {
  const [topics, attempts, recentSessions, todaySession] = await Promise.all([
    prisma.topic.findMany({ include: { topicStats: true }, orderBy: { name: 'asc' } }),
    prisma.attempt.findMany({ include: { topic: true }, orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.studySession.findMany({ take: 14, orderBy: { sessionDate: 'desc' } }),
    prisma.studySession.findFirst({ where: { mode: 'daily' }, orderBy: { sessionDate: 'desc' } }),
  ]);

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const totalAttempts = attempts.length;
  const totalCorrect = attempts.filter((a) => a.isCorrect).length;
  const streak = recentSessions.filter((s) => s.completed).length;

  const todayAttempts = attempts.filter((a) => a.createdAt >= startOfToday);
  const todayCorrect = todayAttempts.filter((a) => a.isCorrect).length;
  const todayIncorrect = todayAttempts.length - todayCorrect;

  const todayTopics = [...new Set(todayAttempts.map((a) => a.topic.name))];
  const topicMissesToday = todayAttempts.reduce<Record<string, number>>((acc, attempt) => {
    if (!attempt.isCorrect) acc[attempt.topic.name] = (acc[attempt.topic.name] ?? 0) + 1;
    return acc;
  }, {});

  const struggledToday = Object.entries(topicMissesToday)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, misses]) => `${name} (${misses})`);

  const weakTopics = topics.filter((t) => (t.topicStats?.totalAttempts ?? 0) > 0 && (t.topicStats?.accuracy ?? 0) < 65).slice(0, 5);

  const mostMissedTopics = Object.entries(
    attempts.reduce<Record<string, number>>((acc, attempt) => {
      if (!attempt.isCorrect) acc[attempt.topic.name] = (acc[attempt.topic.name] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const assignedToday = (() => {
    if (!todaySession) return [];
    const parsed = parseJson<{ topicIds?: number[] }>(todaySession.assignedTopics, {});
    return Array.isArray(parsed.topicIds) ? parsed.topicIds : [];
  })();

  const todayTopicNames = topics.filter((t) => assignedToday.includes(t.id)).map((t) => t.name);
  const today = new Date().toLocaleDateString();

  return (
    <div className="grid grid-2">
      <section className="card">
        <h2>Today</h2>
        <p>{today}</p>
        <p className="small">Daily goal: 3 topics (or 4 in intensive mode).</p>
        <p className="small">Assigned today: {todayTopicNames.length ? todayTopicNames.join(', ') : 'Not generated yet'}</p>
        <form action={startTodaySessionAction}>
          <button className="btn">Start today&apos;s session</button>
        </form>
        <form action={startReviewMistakesAction} style={{ marginTop: '.6rem' }}>
          <button className="btn btn-secondary">Review My Mistakes</button>
        </form>
        <p style={{ marginTop: '.5rem' }}>
          <Link href="/practice" className="badge">Manual Practice</Link>{' '}
          <Link href="/results" className="badge">Results & Analytics</Link>{' '}
          <Link href="/topics" className="badge">Browse all topics</Link>
        </p>
      </section>

      <section className="card">
        <h2>Performance snapshot</h2>
        <p>Total attempts: {totalAttempts}</p>
        <p>Overall accuracy: {percent(totalCorrect, totalAttempts)}%</p>
        <p>Current streak (completed recent sessions): {streak}</p>
        <hr />
        <p>Today&apos;s attempts: {todayAttempts.length}</p>
        <p>Today correct: {todayCorrect}</p>
        <p>Today incorrect: {todayIncorrect}</p>
        <p>Topics studied today: {todayTopics.length ? todayTopics.join(', ') : 'None yet'}</p>
        <p>Topics struggled today: {struggledToday.length ? struggledToday.join(', ') : 'None'}</p>
      </section>

      <section className="card">
        <h2>Weak topics</h2>
        {weakTopics.length === 0 ? <p>None yet. Start practicing.</p> : <ul>{weakTopics.map((t) => <li key={t.id}>{t.name} ({t.topicStats?.accuracy ?? 0}%)</li>)}</ul>}
        <Link className="badge" href="/topics">Browse all topics</Link>
      </section>

      <section className="card">
        <h2>Most missed topics</h2>
        {mostMissedTopics.length === 0 ? (
          <p>No mistakes yet.</p>
        ) : (
          <ul>
            {mostMissedTopics.map(([topicName, misses]) => (
              <li key={topicName}>{topicName}: {misses} misses</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );

  } catch (error) {
    console.error('app/page.tsx failed', error);
    return <div className="card">Startup failed. Check logs and run DOCTOR.bat.</div>;
  }
}
