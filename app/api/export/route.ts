import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [topics, exercises, sessions, attempts, stats, history, settings] = await Promise.all([
      prisma.topic.findMany(),
      prisma.exercise.findMany(),
      prisma.studySession.findMany(),
      prisma.attempt.findMany(),
      prisma.topicStats.findMany(),
      prisma.dailyAssignmentHistory.findMany(),
      prisma.appSettings.findMany(),
    ]);

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      topics,
      exercises,
      sessions,
      attempts,
      stats,
      history,
      settings,
    });
  } catch (error) {
    console.error('Export route failed', error);
    return NextResponse.json({ error: 'Export failed. Check server logs.' }, { status: 500 });
  }
}
