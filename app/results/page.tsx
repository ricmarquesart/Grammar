import { prisma } from '@/lib/prisma';
import { percent } from '@/lib/analytics';

type TopicWindowStats = {
  attempts: number;
  correct: number;
};

function buildTopicWindowMap(attempts: { topic: { name: string }; isCorrect: boolean }[]) {
  return attempts.reduce<Record<string, TopicWindowStats>>((acc, attempt) => {
    const key = attempt.topic.name;
    acc[key] ??= { attempts: 0, correct: 0 };
    acc[key].attempts += 1;
    if (attempt.isCorrect) acc[key].correct += 1;
    return acc;
  }, {});
}

export default async function ResultsPage() {
  try {
  const [attempts, topics, sessions] = await Promise.all([
    prisma.attempt.findMany({ include: { exercise: true, topic: true, session: true }, orderBy: { createdAt: 'desc' } }),
    prisma.topic.findMany({ include: { topicStats: true } }),
    prisma.studySession.findMany({ orderBy: { createdAt: 'desc' }, take: 60 }),
  ]);

  const total = attempts.length;
  const correct = attempts.filter((a) => a.isCorrect).length;
  const now = Date.now();

  const d7 = attempts.filter((a) => now - a.createdAt.getTime() <= 7 * 86400000);
  const d30 = attempts.filter((a) => now - a.createdAt.getTime() <= 30 * 86400000);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayAttempts = attempts.filter((a) => a.createdAt >= todayStart);
  const todayCorrect = todayAttempts.filter((a) => a.isCorrect).length;

  const byDifficulty = attempts.reduce<Record<string, { c: number; t: number }>>((acc, a) => {
    const k = a.exercise.difficulty;
    acc[k] ??= { c: 0, t: 0 };
    acc[k].t += 1;
    if (a.isCorrect) acc[k].c += 1;
    return acc;
  }, {});

  const byType = attempts.reduce<Record<string, { c: number; t: number; misses: number }>>((acc, a) => {
    const k = a.exercise.type;
    acc[k] ??= { c: 0, t: 0, misses: 0 };
    acc[k].t += 1;
    if (a.isCorrect) acc[k].c += 1;
    else acc[k].misses += 1;
    return acc;
  }, {});

  const topicMisses = attempts.reduce<Record<string, number>>((acc, attempt) => {
    if (!attempt.isCorrect) acc[attempt.topic.name] = (acc[attempt.topic.name] ?? 0) + 1;
    return acc;
  }, {});

  const mostMissedTopics = Object.entries(topicMisses).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const mostMissedTypes = Object.entries(byType)
    .map(([type, stats]) => ({ type, misses: stats.misses }))
    .sort((a, b) => b.misses - a.misses)
    .slice(0, 4);

  const strongestTopics = topics
    .filter((topic) => (topic.topicStats?.totalAttempts ?? 0) > 0)
    .sort((a, b) => (b.topicStats?.accuracy ?? 0) - (a.topicStats?.accuracy ?? 0))
    .slice(0, 5)
    .map((topic) => ({ name: topic.name, accuracy: topic.topicStats?.accuracy ?? 0 }));

  const recent7 = attempts.filter((a) => now - a.createdAt.getTime() <= 7 * 86400000);
  const previous7 = attempts.filter((a) => {
    const age = now - a.createdAt.getTime();
    return age > 7 * 86400000 && age <= 14 * 86400000;
  });

  const recentByTopic = buildTopicWindowMap(recent7);
  const previousByTopic = buildTopicWindowMap(previous7);

  const mostImprovedTopics = Object.keys(recentByTopic)
    .filter((topicName) => (recentByTopic[topicName]?.attempts ?? 0) >= 2 && (previousByTopic[topicName]?.attempts ?? 0) >= 2)
    .map((topicName) => {
      const recentAcc = percent(recentByTopic[topicName].correct, recentByTopic[topicName].attempts);
      const previousAcc = percent(previousByTopic[topicName].correct, previousByTopic[topicName].attempts);
      return { topicName, delta: Number((recentAcc - previousAcc).toFixed(1)), recentAcc, previousAcc };
    })
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5);

  return (
    <div className="grid grid-2">
      <section className="card">
        <h2>Overall</h2>
        <p>Total attempts: {total}</p>
        <p>Total correct: {correct}</p>
        <p>Total incorrect: {total - correct}</p>
        <p>Overall accuracy: {percent(correct, total)}%</p>
        <p>Last 7 days: {percent(d7.filter((a) => a.isCorrect).length, d7.length)}%</p>
        <p>Last 30 days: {percent(d30.filter((a) => a.isCorrect).length, d30.length)}%</p>
      </section>

      <section className="card">
        <h2>Today</h2>
        <p>Attempts: {todayAttempts.length}</p>
        <p>Correct: {todayCorrect}</p>
        <p>Incorrect: {todayAttempts.length - todayCorrect}</p>
        <p>Topics studied: {[...new Set(todayAttempts.map((attempt) => attempt.topic.name))].join(', ') || 'None'}</p>
      </section>

      <section className="card">
        <h2>By Difficulty</h2>
        <ul>{Object.entries(byDifficulty).map(([k, v]) => <li key={k}>{k}: {percent(v.c, v.t)}% ({v.t} attempts)</li>)}</ul>
      </section>

      <section className="card">
        <h2>By Exercise Type</h2>
        <ul>{Object.entries(byType).map(([k, v]) => <li key={k}>{k}: {percent(v.c, v.t)}% ({v.t} attempts)</li>)}</ul>
      </section>

      <section className="card">
        <h2>Most missed</h2>
        <p className="small"><strong>Topics</strong></p>
        <ul>{mostMissedTopics.map(([topic, misses]) => <li key={topic}>{topic}: {misses} misses</li>)}</ul>
        <p className="small"><strong>Exercise types</strong></p>
        <ul>{mostMissedTypes.map((item) => <li key={item.type}>{item.type}: {item.misses} misses</li>)}</ul>
      </section>

      <section className="card">
        <h2>Strongest topics</h2>
        <ul>{strongestTopics.map((topic) => <li key={topic.name}>{topic.name}: {topic.accuracy}%</li>)}</ul>
        <p className="small">Completed sessions: {sessions.filter((session) => session.completed).length}</p>
      </section>

      <section className="card">
        <h2>Most improved topics (last 7 vs previous 7 days)</h2>
        {mostImprovedTopics.length === 0 ? (
          <p>Not enough recent data yet.</p>
        ) : (
          <ul>
            {mostImprovedTopics.map((item) => (
              <li key={item.topicName}>{item.topicName}: +{item.delta}% (from {item.previousAcc}% to {item.recentAcc}%)</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );

  } catch (error) {
    console.error('app/results/page.tsx failed', error);
    return <div className="card">Startup failed. Check logs and run DOCTOR.bat.</div>;
  }
}
