import { prisma } from '@/lib/prisma';
import { resetProgress, updateSettings } from '@/app/actions';
import { buildCoverage } from '@/lib/content-audit';

const exerciseTypes = ['multiple_choice', 'fill_blank', 'error_correction', 'mini_production'] as const;

const requiredFields = [
  'topicSlug',
  'difficulty',
  'type',
  'prompt',
  'instructions',
  'questionData',
  'correctAnswer',
  'explanationCorrect',
  'explanationWrong',
  'ruleSummary',
  'extraExample',
  'tags',
  'sourceType',
  'active',
] as const;

function getPromptTemplateExistingTopics(topicSlugs: string[]) {
  return `Create new English grammar exercises for my study app.

You must output exercise objects that match this schema exactly.

GENERAL RULES
- Use only these exercise types:
  1. multiple_choice
  2. fill_blank
  3. error_correction
  4. mini_production
- Use only existing topic slugs unless I explicitly request a new topic.
- Keep English natural, practical, and appropriate for intermediate/advanced learners.
- Prefer Canadian-friendly or general real-life contexts.
- Avoid duplicate questions.
- Avoid ambiguous answers.
- Keep explanations clear and instructional.
- Each item must be self-contained and easy to seed into the database.
- Difficulty must be either "intermediate" or "advanced".
- sourceType should be "seeded".
- active should be true.

REQUIRED FIELDS PER EXERCISE
${requiredFields.join('\n')}

VALID TOPIC SLUGS
${topicSlugs.join(', ')}

VALID EXERCISE TYPE STRUCTURES
1) multiple_choice
questionData: sentence, options (array of 4 strings), answerKey

2) fill_blank
questionData: sentenceWithBlank, expectedAnswer, acceptedAnswers, optional hint

3) error_correction
questionData: incorrectSentence, expectedCorrection, acceptedCorrections, errorFocus

4) mini_production
questionData: scenario, task, targetGrammar, modelAnswer, keyPointsChecklist

QUALITY RULES
- The correct answer must match the explanation.
- Wrong options should be plausible but clearly wrong.
- Rule summary should be short and useful.
- Extra example should reinforce the grammar point.
- Mini production tasks should be realistic and easy to self-review.

OUTPUT FORMAT
Return only a clean array of exercise objects.
Do not include commentary before or after the array.
Do not use markdown tables.
Do not add explanations outside the exercise objects.`;
}

const promptTemplateNewTopic = `Create a new grammar topic and exercises for my study app.

Return:
1) one topic object
2) one clean array of exercise objects

No extra commentary.

NEW TOPIC OBJECT MUST INCLUDE
- slug
- name
- description
- cefrRange
- isActive

GENERAL RULES
- Use only these exercise types: multiple_choice, fill_blank, error_correction, mini_production
- Difficulty must be "intermediate" or "advanced"
- Keep English practical, natural, and learner-friendly
- Prefer Canadian-friendly contexts when useful
- No duplicates, no ambiguous answers
- sourceType should be "seeded"
- active should be true

REQUIRED EXERCISE FIELDS
${requiredFields.join('\n')}

QUESTIONDATA BY TYPE
- multiple_choice: sentence, options, answerKey
- fill_blank: sentenceWithBlank, expectedAnswer, acceptedAnswers
- error_correction: incorrectSentence, expectedCorrection, acceptedCorrections, errorFocus
- mini_production: scenario, task, targetGrammar, modelAnswer, keyPointsChecklist

OUTPUT FORMAT
Return only the topic object and the exercise array, ready to paste with minimal edits.`;

const templateAddExisting = `Create [QUANTITY] new exercises for my grammar study app.

GOAL
Add new exercises to existing topic(s), without changing app structure.

TOPIC SLUGS
- [topic_slug_1]
- [topic_slug_2]

DIFFICULTY DISTRIBUTION
- [X] intermediate
- [Y] advanced

EXERCISE TYPE DISTRIBUTION
- [A] multiple_choice
- [B] fill_blank
- [C] error_correction
- [D] mini_production

CONTENT FOCUS
- [grammar point 1]
- [grammar point 2]
- [common confusion]
- [target patterns]

CONTEXT PREFERENCES
- Canadian daily life
- workplace
- college/student life
- CELPIP-friendly contexts

QUALITY RULES
- no duplicates
- no ambiguous answers
- natural English
- full explanations
- include ruleSummary and extraExample
- output must match app schema exactly

OUTPUT FORMAT
Return only a clean array of exercise objects matching the app schema.`;

const templateNewTopicBatch = `Create a new grammar topic and [QUANTITY] exercises for my study app.

NEW TOPIC
- slug: [new_topic_slug]
- name: [display name]
- description: [short description]
- cefrRange: [B1-B2 / B2-C1]
- isActive: true

DIFFICULTY DISTRIBUTION
- [X] intermediate
- [Y] advanced

EXERCISE TYPE DISTRIBUTION
- [A] multiple_choice
- [B] fill_blank
- [C] error_correction
- [D] mini_production

CONTENT FOCUS
- [main rule]
- [secondary rule]
- [common learner mistakes]
- [high-value patterns]

QUALITY RULES
- practical contexts
- no duplicates
- clear answers
- app schema exact match
- include full explanations

OUTPUT FORMAT
Return:
1) one topic object
2) one clean array of exercise objects
No extra commentary.`;

const templateLargeBalanced = `Create [40 or 100] new grammar exercises for my study app.

TOPIC DISTRIBUTION
- [topic_slug_1]: [quantity]
- [topic_slug_2]: [quantity]
- [topic_slug_3]: [quantity]

DIFFICULTY DISTRIBUTION
- 50% intermediate
- 50% advanced

EXERCISE TYPE DISTRIBUTION
Keep a balanced mix across:
- multiple_choice
- fill_blank
- error_correction
- mini_production

PEDAGOGICAL GOALS
- train high-frequency errors
- focus on CELPIP-friendly grammar
- use practical English
- avoid literary or unnatural examples
- include common learner mistakes when useful

REQUIRED FIELDS
${requiredFields.join('\n')}

OUTPUT FORMAT
Return only a clean array of exercise objects ready to paste into seed data.`;

export default async function SettingsPage() {
  try {
  const [settings, topics, exerciseCount] = await Promise.all([
    prisma.appSettings.upsert({
      where: { id: 1 },
      create: { id: 1, defaultDailyTopics: 3, intensiveMode: false },
      update: {},
    }),
    prisma.topic.findMany({
      where: { isActive: true },
      orderBy: { slug: 'asc' },
      include: { exercises: { select: { difficulty: true, type: true } } },
    }),
    prisma.exercise.count(),
  ]);

  const topicSlugs = topics.map((topic) => topic.slug);
  const { summary, perTopic } = buildCoverage(topics);
  const promptTemplateExistingTopics = getPromptTemplateExistingTopics(topicSlugs);

  async function saveSettings(formData: FormData) {
    'use server';
    const count = Number(formData.get('defaultDailyTopics'));
    const intensiveMode = formData.get('intensiveMode') === 'on';
    await updateSettings(count, intensiveMode);
  }

  return (
    <div>
      <div className="grid grid-2">
        <form className="card" action={saveSettings}>
          <h2>Settings</h2>
          <label>Default daily topics</label>
          <select name="defaultDailyTopics" defaultValue={settings.defaultDailyTopics}>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
          <label>
            <input type="checkbox" name="intensiveMode" defaultChecked={settings.intensiveMode} /> Intensive mode
          </label>
          <button className="btn">Save settings</button>
        </form>

        <div className="card">
          <h2>Data</h2>
          <form action={resetProgress}>
            <button className="btn btn-secondary">Reset progress</button>
          </form>
          <p><a className="badge" href="/api/export">Export progress JSON</a></p>
          <form method="post" encType="multipart/form-data" action="/api/import">
            <input type="file" name="file" accept="application/json" required />
            <button className="btn">Import progress JSON</button>
          </form>
        </div>
      </div>


      <section className="card">
        <h2>Content Coverage Audit</h2>
        <p className="small">Quick visibility into content completeness and weak coverage.</p>

        <h3>Overall summary</h3>
        <ul>
          <li>Total topics: {summary.totalTopics}</li>
          <li>Total exercises: {summary.totalExercises}</li>
          <li>Intermediate: {summary.byDifficulty.intermediate}</li>
          <li>Advanced: {summary.byDifficulty.advanced}</li>
          <li>multiple_choice: {summary.byType.multiple_choice}</li>
          <li>fill_blank: {summary.byType.fill_blank}</li>
          <li>error_correction: {summary.byType.error_correction}</li>
          <li>mini_production: {summary.byType.mini_production}</li>
        </ul>

        <h3>Missing / weak coverage warnings</h3>
        {perTopic.filter((topic) => topic.warnings.length > 0).length === 0 ? (
          <p>No warnings detected. Coverage looks balanced.</p>
        ) : (
          <ul>
            {perTopic
              .filter((topic) => topic.warnings.length > 0)
              .map((topic) => (
                <li key={topic.slug}>
                  <strong>{topic.slug}</strong>: {topic.warnings.join(', ')}
                </li>
              ))}
          </ul>
        )}

        <h3>Per-topic coverage</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '.4rem' }}>slug</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '.4rem' }}>name</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '.4rem' }}>status</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '.4rem' }}>total</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '.4rem' }}>int</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '.4rem' }}>adv</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '.4rem' }}>mc</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '.4rem' }}>fb</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '.4rem' }}>ec</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '.4rem' }}>mp</th>
              </tr>
            </thead>
            <tbody>
              {perTopic.map((topic) => (
                <tr key={topic.id}>
                  <td style={{ borderBottom: '1px solid #f0f0f0', padding: '.4rem' }}>{topic.slug}</td>
                  <td style={{ borderBottom: '1px solid #f0f0f0', padding: '.4rem' }}>{topic.name}</td>
                  <td style={{ borderBottom: '1px solid #f0f0f0', padding: '.4rem' }}><span className="badge">{topic.status}</span></td>
                  <td style={{ borderBottom: '1px solid #f0f0f0', padding: '.4rem' }}>{topic.total}</td>
                  <td style={{ borderBottom: '1px solid #f0f0f0', padding: '.4rem' }}>{topic.intermediate}</td>
                  <td style={{ borderBottom: '1px solid #f0f0f0', padding: '.4rem' }}>{topic.advanced}</td>
                  <td style={{ borderBottom: '1px solid #f0f0f0', padding: '.4rem' }}>{topic.multiple_choice}</td>
                  <td style={{ borderBottom: '1px solid #f0f0f0', padding: '.4rem' }}>{topic.fill_blank}</td>
                  <td style={{ borderBottom: '1px solid #f0f0f0', padding: '.4rem' }}>{topic.error_correction}</td>
                  <td style={{ borderBottom: '1px solid #f0f0f0', padding: '.4rem' }}>{topic.mini_production}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Content Expansion Spec</h2>
        <p className="small">Use this to request future exercise batches in the exact app schema.</p>

        <h3>Valid topic slugs ({topicSlugs.length})</h3>
        <textarea readOnly rows={8} value={topicSlugs.join('\n')} />

        <h3>Valid exercise types ({exerciseTypes.length})</h3>
        <textarea readOnly rows={4} value={exerciseTypes.join('\n')} />

        <h3>Required fields per exercise</h3>
        <textarea readOnly rows={8} value={requiredFields.join('\n')} />

        <h3>Quality rules</h3>
        <ul>
          <li>Use clear, unambiguous answers.</li>
          <li>Avoid duplicate or near-duplicate questions.</li>
          <li>Keep English natural and practical.</li>
          <li>Target intermediate/advanced levels.</li>
          <li>Use Canadian-friendly contexts when reasonable.</li>
          <li>Use only the 4 supported exercise types.</li>
        </ul>

        <h3>Example objects by exercise type</h3>
        <textarea
          readOnly
          rows={30}
          value={`[\n  {\n    "topicSlug": "conditionals",\n    "difficulty": "intermediate",\n    "type": "multiple_choice",\n    "prompt": "Choose the correct option.",\n    "instructions": "Select one answer.",\n    "questionData": {\n      "sentence": "If I were you, I ___ speak to the manager.",\n      "options": ["A. will", "B. would", "C. am", "D. have"],\n      "answerKey": "B"\n    },\n    "correctAnswer": { "answer": "B" },\n    "explanationCorrect": "Second conditional uses would.",\n    "explanationWrong": "Other options break the conditionals pattern.",\n    "ruleSummary": "If + past, would + base.",\n    "extraExample": "If I had time, I would help.",\n    "tags": ["conditionals", "intermediate", "multiple_choice"],\n    "sourceType": "seeded",\n    "active": true\n  },\n  {\n    "topicSlug": "modals",\n    "difficulty": "intermediate",\n    "type": "fill_blank",\n    "prompt": "Fill in the blank with the correct form.",\n    "instructions": "Type one word.",\n    "questionData": {\n      "sentenceWithBlank": "You ___ review this chapter tonight.",\n      "expectedAnswer": "should",\n      "acceptedAnswers": ["should"]\n    },\n    "correctAnswer": { "answer": "should" },\n    "explanationCorrect": "Should gives advice.",\n    "explanationWrong": "Other forms change meaning.",\n    "ruleSummary": "Use should for advice.",\n    "extraExample": "You should ask questions early.",\n    "tags": ["modals", "intermediate", "fill_blank"],\n    "sourceType": "seeded",\n    "active": true\n  },\n  {\n    "topicSlug": "articles",\n    "difficulty": "intermediate",\n    "type": "error_correction",\n    "prompt": "Correct the sentence.",\n    "instructions": "Rewrite the sentence correctly.",\n    "questionData": {\n      "incorrectSentence": "He bought an new phone.",\n      "expectedCorrection": "He bought a new phone.",\n      "acceptedCorrections": ["He bought a new phone."],\n      "errorFocus": "article choice"\n    },\n    "correctAnswer": { "answer": "He bought a new phone." },\n    "explanationCorrect": "Use a before consonant sound.",\n    "explanationWrong": "An before new is incorrect.",\n    "ruleSummary": "a + consonant sound, an + vowel sound.",\n    "extraExample": "She found a useful app.",\n    "tags": ["articles", "intermediate", "error_correction"],\n    "sourceType": "seeded",\n    "active": true\n  },\n  {\n    "topicSlug": "reported_speech",\n    "difficulty": "advanced",\n    "type": "mini_production",\n    "prompt": "Write a short response.",\n    "instructions": "Use target grammar and checklist.",\n    "questionData": {\n      "scenario": "You are reporting your teacher's writing advice.",\n      "task": "Write 3-4 sentences with reported speech.",\n      "targetGrammar": "reported speech",\n      "modelAnswer": "My teacher said that I needed clearer topic sentences.",\n      "keyPointsChecklist": ["uses reported speech", "clear meaning", "3+ sentences"]\n    },\n    "correctAnswer": { "mode": "self_review" },\n    "explanationCorrect": "Compare your writing with model and checklist.",\n    "explanationWrong": "Revise if target structure is missing.",\n    "ruleSummary": "Use said/told structures correctly.",\n    "extraExample": "She told me that I should revise carefully.",\n    "tags": ["reported_speech", "advanced", "mini_production"],\n    "sourceType": "seeded",\n    "active": true\n  }\n]`}
        />

        <h3>Robust prompt template (existing topics)</h3>
        <textarea readOnly rows={26} value={promptTemplateExistingTopics} />

        <h3>Robust prompt template (new topic + exercises)</h3>
        <textarea readOnly rows={22} value={promptTemplateNewTopic} />

        <h3>Reusable request template A: add to existing topics</h3>
        <textarea readOnly rows={22} value={templateAddExisting} />

        <h3>Reusable request template B: new topic + exercises</h3>
        <textarea readOnly rows={22} value={templateNewTopicBatch} />

        <h3>Reusable request template C: large balanced batch (40/100)</h3>
        <textarea readOnly rows={24} value={templateLargeBalanced} />

        <h3>Current content summary</h3>
        <p>Total topic slugs: {topicSlugs.length}</p>
        <p>Total exercise types: {exerciseTypes.length}</p>
        <p>Current seeded exercise count in DB: {exerciseCount}</p>
        <p className="small">Exercise object schema: {requiredFields.join(', ')}</p>
      </section>
    </div>
  );

  } catch (error) {
    console.error('app/settings/page.tsx failed', error);
    return <div className="card">Startup failed. Check logs and run DOCTOR.bat.</div>;
  }
}
