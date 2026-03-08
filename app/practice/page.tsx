import { createManualSession, startReviewMistakesAction } from '@/app/actions';
import { prisma } from '@/lib/prisma';
import { Difficulty, ExerciseType } from '@/lib/types';
import { redirect } from 'next/navigation';

export default async function PracticePage({ searchParams }: { searchParams: { topicId?: string } }) {
  const topics = await prisma.topic.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });

  if (topics.length === 0) {
    return <div className="card">No topics available. Run the seed script first.</div>;
  }

  const selectedTopic = Number(searchParams.topicId || topics[0].id);

  async function start(formData: FormData) {
    'use server';
    const topicId = Number(formData.get('topicId'));
    const difficulty = formData.get('difficulty') as Difficulty | 'mixed';
    const type = formData.get('type') as ExerciseType | 'mixed';
    const sessionId = await createManualSession(topicId, difficulty, type);
    redirect(`/session/${sessionId}`);
  }

  return (
    <div className="grid grid-2">
      <form className="card" action={start}>
        <h2>Manual Practice</h2>
        <label>Topic</label>
        <select name="topicId" defaultValue={selectedTopic}>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <label>Difficulty</label>
        <select name="difficulty" defaultValue="mixed">
          <option value="mixed">Mixed</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <label>Exercise Type</label>
        <select name="type" defaultValue="mixed">
          <option value="mixed">Mixed</option>
          <option value="multiple_choice">Multiple choice</option>
          <option value="fill_blank">Fill in blank</option>
          <option value="error_correction">Error correction</option>
          <option value="mini_production">Mini production</option>
        </select>
        <button className="btn">Start Practice</button>
      </form>

      <section className="card">
        <h2>Focused Review</h2>
        <p className="small">Review My Mistakes builds a session from your most frequently incorrect exercises and prioritizes weak areas.</p>
        <form action={startReviewMistakesAction}>
          <button className="btn btn-secondary">Review My Mistakes</button>
        </form>
      </section>
    </div>
  );
}
