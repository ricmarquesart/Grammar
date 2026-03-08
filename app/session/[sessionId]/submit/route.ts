import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { gradeExercise } from '@/lib/grading';
import { parseJson } from '@/lib/json-storage';
import { ExerciseType } from '@/lib/types';

export async function POST(req: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const form = await req.formData();
    const sessionId = Number(params.sessionId);
    const exerciseId = Number(form.get('exerciseId'));
    const topicId = Number(form.get('topicId'));
    const userAnswer = String(form.get('userAnswer') ?? '');
    const selfRating = Number(form.get('selfRating') ?? 0) || null;

    const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) return NextResponse.redirect(new URL(`/session/${sessionId}`, req.url));

    const questionData = parseJson<Record<string, unknown>>(exercise.questionData, {});
    const type = exercise.type as ExerciseType;

    const isCorrect = type === 'mini_production'
      ? (selfRating ?? 0) >= 3
      : gradeExercise(type, questionData, userAnswer);

    const attempt = await prisma.attempt.create({
      data: {
        sessionId,
        exerciseId,
        topicId,
        userAnswer,
        isCorrect,
        selfRating,
        writtenResponse: type === 'mini_production' ? userAnswer : null,
        feedbackShown: true,
      },
    });

    const stats = await prisma.topicStats.findUnique({ where: { topicId } });
    const totalAttempts = (stats?.totalAttempts ?? 0) + 1;
    const totalCorrect = (stats?.totalCorrect ?? 0) + (isCorrect ? 1 : 0);
    const totalIncorrect = totalAttempts - totalCorrect;

    await prisma.topicStats.upsert({
      where: { topicId },
      create: {
        topicId,
        totalAttempts,
        totalCorrect,
        totalIncorrect,
        accuracy: Number(((totalCorrect / totalAttempts) * 100).toFixed(1)),
        currentStreak: isCorrect ? 1 : 0,
        lastStudiedAt: new Date(),
      },
      update: {
        totalAttempts,
        totalCorrect,
        totalIncorrect,
        accuracy: Number(((totalCorrect / totalAttempts) * 100).toFixed(1)),
        currentStreak: isCorrect ? (stats?.currentStreak ?? 0) + 1 : 0,
        lastStudiedAt: new Date(),
      },
    });

    return NextResponse.redirect(new URL(`/session/${sessionId}?attempt=${attempt.id}`, req.url));
  } catch (error) {
    console.error('submit route failed', { params, error });
    return NextResponse.redirect(new URL(`/session/${params.sessionId}?error=submit_failed`, req.url));
  }
}
