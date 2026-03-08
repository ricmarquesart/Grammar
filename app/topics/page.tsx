import Link from 'next/link';
import { prisma } from '@/lib/prisma';

function level(accuracy: number, attempts: number) {
  if (!attempts) return 'never studied';
  if (accuracy < 65) return 'weak';
  if (accuracy < 85) return 'medium';
  return 'strong';
}

export default async function TopicsPage() {
  const topics = await prisma.topic.findMany({ include: { topicStats: true }, orderBy: { name: 'asc' } });
  return (
    <div className="card">
      <h2>Topic Library</h2>
      <ul>
        {topics.map((topic) => (
          <li key={topic.id} style={{ marginBottom: '.7rem' }}>
            <strong>{topic.name}</strong> - {topic.description} ({topic.cefrRange})
            <div className="small">Status: {level(topic.topicStats?.accuracy ?? 0, topic.topicStats?.totalAttempts ?? 0)} | Accuracy: {topic.topicStats?.accuracy ?? 0}%</div>
            <Link className="badge" href={`/practice?topicId=${topic.id}`}>Practice</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
