import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serializeJson } from '@/lib/json-storage';

function toDate(value: unknown) {
  if (!value) return undefined;
  return new Date(String(value));
}

function toStoredJson(value: unknown) {
  if (typeof value === 'string') return value;
  return serializeJson(value);
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const json = JSON.parse(await file.text());

    await prisma.attempt.deleteMany();
    await prisma.studySession.deleteMany();
    await prisma.topicStats.deleteMany();
    await prisma.dailyAssignmentHistory.deleteMany();
    await prisma.exercise.deleteMany();
    await prisma.topic.deleteMany();
    await prisma.appSettings.deleteMany();

    for (const row of json.topics ?? []) {
      await prisma.topic.create({
        data: {
          ...row,
          createdAt: toDate(row.createdAt),
          updatedAt: toDate(row.updatedAt),
        },
      });
    }

    for (const row of json.exercises ?? []) {
      await prisma.exercise.create({
        data: {
          ...row,
          questionData: toStoredJson(row.questionData),
          correctAnswer: toStoredJson(row.correctAnswer),
          tags: toStoredJson(row.tags),
          createdAt: toDate(row.createdAt),
          updatedAt: toDate(row.updatedAt),
        },
      });
    }

    for (const row of json.sessions ?? []) {
      await prisma.studySession.create({
        data: {
          ...row,
          assignedTopics: toStoredJson(row.assignedTopics),
          sessionDate: toDate(row.sessionDate),
          createdAt: toDate(row.createdAt),
          updatedAt: toDate(row.updatedAt),
        },
      });
    }

    for (const row of json.attempts ?? []) {
      await prisma.attempt.create({
        data: {
          ...row,
          createdAt: toDate(row.createdAt),
        },
      });
    }

    for (const row of json.stats ?? []) {
      await prisma.topicStats.create({
        data: {
          ...row,
          lastStudiedAt: toDate(row.lastStudiedAt),
          updatedAt: toDate(row.updatedAt),
        },
      });
    }

    for (const row of json.history ?? []) {
      await prisma.dailyAssignmentHistory.create({
        data: {
          ...row,
          topicIds: toStoredJson(row.topicIds),
          assignmentDate: toDate(row.assignmentDate),
          createdAt: toDate(row.createdAt),
        },
      });
    }

    for (const row of json.settings ?? []) {
      await prisma.appSettings.create({
        data: {
          ...row,
          createdAt: toDate(row.createdAt),
          updatedAt: toDate(row.updatedAt),
        },
      });
    }

    await prisma.appSettings.upsert({
      where: { id: 1 },
      create: { id: 1, defaultDailyTopics: 3, intensiveMode: false },
      update: {},
    });

    return NextResponse.redirect(new URL('/settings', req.url));
  } catch (error) {
    console.error('Import route failed', error);
    return NextResponse.json({ error: 'Import failed. Check file format and logs.' }, { status: 500 });
  }
}
