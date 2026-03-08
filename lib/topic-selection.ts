import { Topic, TopicStats } from '@prisma/client';

type TopicWithStats = Topic & { topicStats: TopicStats | null };

export function selectDailyTopics(
  topics: TopicWithStats[],
  recentTopicIds: number[],
  targetCount: number,
) {
  const now = new Date();

  const scored = topics.map((topic) => {
    const stats = topic.topicStats;
    const accuracy = stats?.accuracy ?? 0;
    const neverStudied = (stats?.totalAttempts ?? 0) === 0;
    const lastStudied = stats?.lastStudiedAt;
    const daysSinceLast = lastStudied ? Math.floor((now.getTime() - new Date(lastStudied).getTime()) / 86_400_000) : 999;

    let weaknessWeight = 0;
    if (!neverStudied && accuracy < 65) weaknessWeight = 40 + (65 - accuracy);
    if (!neverStudied && accuracy >= 65 && accuracy < 85) weaknessWeight = 20 + (85 - accuracy) * 0.4;
    if (!neverStudied && accuracy >= 85) weaknessWeight = 5;

    const overdueWeight = Math.min(daysSinceLast, 30) * 1.5;
    const unpracticedBonus = neverStudied ? 35 : 0;
    const recentPenalty = recentTopicIds.includes(topic.id) && accuracy >= 50 ? 40 : 0;

    const score = weaknessWeight + overdueWeight + unpracticedBonus - recentPenalty;
    return { topic, score, accuracy, daysSinceLast, neverStudied };
  });

  scored.sort((a, b) => b.score - a.score || b.daysSinceLast - a.daysSinceLast);

  const selected: TopicWithStats[] = [];
  for (const item of scored) {
    if (selected.length >= targetCount) break;
    const isRecent = recentTopicIds.includes(item.topic.id);
    const veryWeak = !item.neverStudied && item.accuracy < 50;
    if (!isRecent || veryWeak) selected.push(item.topic);
  }

  if (selected.length < targetCount) {
    for (const item of scored) {
      if (selected.length >= targetCount) break;
      if (!selected.find((x) => x.id === item.topic.id)) selected.push(item.topic);
    }
  }

  return selected;
}
