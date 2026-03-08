'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { gradeExercise } from '@/lib/grading';
import { parseJson, serializeJson } from '@/lib/json-storage';
import { selectDailyTopics } from '@/lib/topic-selection';
import { Difficulty, ExerciseType } from '@/lib/types';

type AssignedTopicsPayload = {
  topicIds: number[];
  difficulty: Difficulty | 'mixed';
  type: ExerciseType | 'mixed';
  exerciseIds?: number[];
  reviewSource?: 'mistakes';
};

function payload(
  topicIds: number[],
  difficulty: Difficulty | 'mixed' = 'mixed',
  type: ExerciseType | 'mixed' = 'mixed',
  exerciseIds?: number[],
  reviewSource?: 'mistakes',
): AssignedTopicsPayload {
  return { topicIds, difficulty, type, exerciseIds, reviewSource };
}

export async function ensureTodaySession(forceIntensive?: boolean) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.studySession.findFirst({
      where: { sessionDate: today, mode: 'daily' },
      orderBy: { id: 'desc' },
    });
    if (existing) return existing.id;

    const [topics, settings, history, recentMistakes] = await Promise.all([
      prisma.topic.findMany({ where: { isActive: true }, include: { topicStats: true } }),
      prisma.appSettings.upsert({
        where: { id: 1 },
        create: { id: 1, defaultDailyTopics: 3, intensiveMode: false },
        update: {},
      }),
      prisma.dailyAssignmentHistory.findMany({ take: 2, orderBy: { assignmentDate: 'desc' } }),
      prisma.attempt.findMany({
        where: {
          isCorrect: false,
          createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
        },
        select: { topicId: true },
        take: 300,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const recentTopicIds = history.flatMap((h) => parseJson<number[]>(h.topicIds, []));
    const intensive = forceIntensive ?? settings.intensiveMode;
    const targetCount = intensive ? 4 : settings.defaultDailyTopics;
    let selectedTopics = selectDailyTopics(topics, recentTopicIds, targetCount);

    const mistakesByTopic = recentMistakes.reduce<Record<number, number>>((acc, item) => {
      acc[item.topicId] = (acc[item.topicId] ?? 0) + 1;
      return acc;
    }, {});
    const boostedTopicIds = Object.entries(mistakesByTopic)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => Number(id))
      .slice(0, 2);

    for (const topicId of boostedTopicIds) {
      if (selectedTopics.some((topic) => topic.id === topicId)) continue;
      const candidate = topics.find((topic) => topic.id === topicId);
      if (!candidate) continue;
      selectedTopics = [candidate, ...selectedTopics].slice(0, targetCount);
    }

    const serialized = serializeJson(payload(selectedTopics.map((t) => t.id)));

    const session = await prisma.studySession.create({
      data: {
        sessionDate: today,
        mode: 'daily',
        assignedTopics: serialized,
        completed: false,
      },
    });

    await prisma.dailyAssignmentHistory.upsert({
      where: { assignmentDate: today },
      create: { assignmentDate: today, topicIds: serializeJson(selectedTopics.map((t) => t.id)) },
      update: { topicIds: serializeJson(selectedTopics.map((t) => t.id)) },
    });

    revalidatePath('/');
    return session.id;
  } catch (error) {
    console.error('ensureTodaySession failed', error);
    throw error;
  }
}

export async function createManualSession(topicId: number, difficulty: Difficulty | 'mixed', type: ExerciseType | 'mixed') {
  const session = await prisma.studySession.create({
    data: {
      sessionDate: new Date(),
      mode: 'manual',
      assignedTopics: serializeJson(payload([topicId], difficulty, type)),
      completed: false,
    },
  });

  return session.id;
}

export async function createMistakesReviewSession() {
  const mistakenAttempts = await prisma.attempt.findMany({
    where: { isCorrect: false },
    select: { exerciseId: true, topicId: true },
    orderBy: { createdAt: 'desc' },
    take: 400,
  });

  const missCounts = mistakenAttempts.reduce<Record<number, number>>((acc, item) => {
    acc[item.exerciseId] = (acc[item.exerciseId] ?? 0) + 1;
    return acc;
  }, {});

  const exerciseIds = Object.entries(missCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => Number(id))
    .slice(0, 12);

  if (exerciseIds.length === 0) {
    const fallback = await prisma.exercise.findMany({ where: { isActive: true }, orderBy: { id: 'desc' }, take: 6 });
    const fallbackTopicIds = [...new Set(fallback.map((e) => e.topicId))];
    const session = await prisma.studySession.create({
      data: {
        sessionDate: new Date(),
        mode: 'review',
        assignedTopics: serializeJson(payload(fallbackTopicIds, 'mixed', 'mixed', fallback.map((e) => e.id), 'mistakes')),
        completed: false,
      },
    });
    return session.id;
  }

  const exercises = await prisma.exercise.findMany({ where: { id: { in: exerciseIds }, isActive: true } });
  const topicIds = [...new Set(exercises.map((e) => e.topicId))];

  const session = await prisma.studySession.create({
    data: {
      sessionDate: new Date(),
      mode: 'review',
      assignedTopics: serializeJson(payload(topicIds, 'mixed', 'mixed', exercises.map((e) => e.id), 'mistakes')),
      completed: false,
    },
  });

  return session.id;
}

export async function startReviewMistakesAction() {
  const sessionId = await createMistakesReviewSession();
  redirect(`/session/${sessionId}`);
}

export async function finishSession(sessionId: number) {
  await prisma.studySession.update({ where: { id: sessionId }, data: { completed: true } });
  revalidatePath('/');
}

export async function updateSettings(defaultDailyTopics: number, intensiveMode: boolean) {
  await prisma.appSettings.upsert({
    where: { id: 1 },
    create: { id: 1, defaultDailyTopics: defaultDailyTopics === 4 ? 4 : 3, intensiveMode },
    update: { defaultDailyTopics: defaultDailyTopics === 4 ? 4 : 3, intensiveMode },
  });
  revalidatePath('/settings');
}

export async function resetProgress() {
  await prisma.attempt.deleteMany();
  await prisma.studySession.deleteMany();
  await prisma.dailyAssignmentHistory.deleteMany();
  await prisma.topicStats.updateMany({
    data: {
      totalAttempts: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      accuracy: 0,
      currentStreak: 0,
      lastStudiedAt: null,
      weakestDifficulty: null,
    },
  });
  revalidatePath('/');
}

export async function startTodaySessionAction() {
  const sessionId = await ensureTodaySession();
  redirect(`/session/${sessionId}`);
}

export async function submitAttempt(input: {
  sessionId: number;
  exerciseId: number;
  topicId: number;
  userAnswer: string;
  selfRating?: number;
  writtenResponse?: string;
}) {
  const exercise = await prisma.exercise.findUnique({ where: { id: input.exerciseId } });
  if (!exercise) throw new Error('Exercise not found');

  const questionData = parseJson<Record<string, unknown>>(exercise.questionData, {});

  const type = exercise.type as ExerciseType;
  const isCorrect =
    type === 'mini_production'
      ? (input.selfRating ?? 0) >= 3
      : gradeExercise(type, questionData, input.userAnswer);

  await prisma.attempt.create({
    data: {
      sessionId: input.sessionId,
      exerciseId: input.exerciseId,
      topicId: input.topicId,
      userAnswer: input.userAnswer,
      isCorrect,
      selfRating: input.selfRating,
      writtenResponse: input.writtenResponse,
      feedbackShown: true,
    },
  });

  const stats = await prisma.topicStats.findUnique({ where: { topicId: input.topicId } });
  const totalAttempts = (stats?.totalAttempts ?? 0) + 1;
  const totalCorrect = (stats?.totalCorrect ?? 0) + (isCorrect ? 1 : 0);
  const totalIncorrect = totalAttempts - totalCorrect;
  const accuracy = totalAttempts ? Number(((totalCorrect / totalAttempts) * 100).toFixed(1)) : 0;

  await prisma.topicStats.upsert({
    where: { topicId: input.topicId },
    create: {
      topicId: input.topicId,
      totalAttempts,
      totalCorrect,
      totalIncorrect,
      accuracy,
      currentStreak: isCorrect ? 1 : 0,
      lastStudiedAt: new Date(),
    },
    update: {
      totalAttempts,
      totalCorrect,
      totalIncorrect,
      accuracy,
      currentStreak: isCorrect ? (stats?.currentStreak ?? 0) + 1 : 0,
      lastStudiedAt: new Date(),
    },
  });

  revalidatePath('/');
  revalidatePath('/results');
  revalidatePath('/topics');
  revalidatePath('/review');
  return isCorrect;
}
