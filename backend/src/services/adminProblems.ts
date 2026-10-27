import { Prisma } from '@prisma/client';
import type { ZodError } from 'zod';
import { prisma } from '../db.js';
import { AppError } from '../utils/errors.js';
import { buildPage, toSkipTake } from '../utils/pagination.js';
import { uniqueSlug } from '../utils/slug.js';
import { t, type Lang } from '../i18n/index.js';
import { translateZodError } from '../utils/zodMessages.js';
import { problemMetaSchema, type AdminProblemListQuery } from '../validators/admin.js';
import { problemInputSchema, type ProblemInput } from '../validators/problemInput.js';
import { problemDataFromInput } from './proposals.js';

// Admin-only problem management. These are the ONLY endpoints that return
// correctAnswer — they sit behind /api/admin and admin permissions.

const adminListSelect = {
  id: true,
  slug: true,
  titleKy: true,
  titleRu: true,
  status: true,
  difficulty: true,
  olympiadLevel: true,
  solvedCount: true,
  attemptCount: true,
  createdAt: true,
  updatedAt: true,
  reviewNote: true,
  subject: { select: { slug: true, nameKy: true, nameRu: true } },
  topic: { select: { slug: true, nameKy: true, nameRu: true } },
  author: { select: { id: true, fullName: true, role: true } },
} satisfies Prisma.ProblemSelect;

export async function listProblems(query: AdminProblemListQuery) {
  const where: Prisma.ProblemWhereInput = {
    status: query.proposals ? 'DRAFT' : query.status,
    subject: query.subject ? { slug: query.subject } : undefined,
    author: query.proposals ? { role: 'TEACHER' } : undefined,
    ...(query.q
      ? {
          OR: [
            { titleKy: { contains: query.q, mode: 'insensitive' } },
            { titleRu: { contains: query.q, mode: 'insensitive' } },
            { slug: { contains: query.q.toLowerCase() } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.problem.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      select: adminListSelect,
      ...toSkipTake(query.page, query.pageSize),
    }),
    prisma.problem.count({ where }),
  ]);
  return buildPage(items, total, query.page, query.pageSize);
}

export async function getProblem(id: string) {
  const problem = await prisma.problem.findUnique({
    where: { id },
    select: {
      ...adminListSelect,
      statementKy: true,
      statementRu: true,
      answerType: true,
      correctAnswer: true,
      tolerance: true,
      choices: true,
      solutionKy: true,
      solutionRu: true,
      hintKy: true,
      hintRu: true,
      gradeFrom: true,
      gradeTo: true,
      points: true,
      source: true,
    },
  });
  if (!problem) throw AppError.notFound();
  return problem;
}

function statusData(status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED', current?: Date | null) {
  // Keep the first publication time
  return {
    status,
    publishedAt: status === 'PUBLISHED' ? (current ?? new Date()) : (current ?? null),
  };
}

export async function createProblem(
  authorId: string,
  input: ProblemInput,
  meta: { slug?: string; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' },
) {
  const data = await problemDataFromInput(input);
  try {
    return await prisma.problem.create({
      data: {
        ...data,
        ...statusData(meta.status),
        slug: meta.slug ?? uniqueSlug(input.titleKy),
        authorId,
      },
      select: { id: true, slug: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'SLUG_TAKEN');
    }
    throw error;
  }
}

export async function updateProblem(
  id: string,
  input: ProblemInput,
  meta: { slug?: string; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' },
) {
  const existing = await prisma.problem.findUnique({
    where: { id },
    select: { publishedAt: true },
  });
  if (!existing) throw AppError.notFound();
  const data = await problemDataFromInput(input);
  try {
    return await prisma.problem.update({
      where: { id },
      data: {
        ...data,
        ...statusData(meta.status, existing.publishedAt),
        ...(meta.slug ? { slug: meta.slug } : {}),
      },
      select: { id: true, slug: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'SLUG_TAKEN');
    }
    throw error;
  }
}

/** Publish / archive / back to draft; a review note is shown to the proposing teacher. */
export async function setStatus(
  id: string,
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
  reviewNote: string | null,
) {
  const existing = await prisma.problem.findUnique({
    where: { id },
    select: { publishedAt: true },
  });
  if (!existing) throw AppError.notFound();
  return prisma.problem.update({
    where: { id },
    data: { ...statusData(status, existing.publishedAt), reviewNote },
    select: { id: true, slug: true, status: true, reviewNote: true },
  });
}

export interface ImportItemResult {
  index: number;
  slug: string | null;
  titleKy: string | null;
  action: 'created' | 'updated' | 'invalid';
  errors?: { path: string; message: string }[];
}

/**
 * Bulk import (JSON). Each item: problem content (docs/problem-format.md) plus optional
 * `slug` (existing slug → update) and `status`. With dryRun nothing is written.
 */
export async function importProblems(
  authorId: string,
  items: unknown[],
  dryRun: boolean,
  lang: Lang,
) {
  const results: ImportItemResult[] = [];
  for (const [index, raw] of items.entries()) {
    const titleKy =
      raw && typeof raw === 'object' && typeof (raw as { titleKy?: unknown }).titleKy === 'string'
        ? (raw as { titleKy: string }).titleKy
        : null;
    const parsed = problemInputSchema.safeParse(raw);
    const meta = problemMetaSchema.safeParse(raw);
    if (!parsed.success || !meta.success) {
      const errors = [
        ...(parsed.success ? [] : translateZodError(parsed.error as ZodError, lang, raw)),
        ...(meta.success ? [] : translateZodError(meta.error as ZodError, lang, raw)),
      ];
      results.push({ index, slug: null, titleKy, action: 'invalid', errors });
      continue;
    }
    const existing = meta.data.slug
      ? await prisma.problem.findUnique({ where: { slug: meta.data.slug }, select: { id: true } })
      : null;
    try {
      // Validates subject/topic even in dry-run mode
      await problemDataFromInput(parsed.data);
      if (dryRun) {
        results.push({
          index,
          slug: meta.data.slug ?? null,
          titleKy,
          action: existing ? 'updated' : 'created',
        });
        continue;
      }
      const saved = existing
        ? await updateProblem(existing.id, parsed.data, meta.data)
        : await createProblem(authorId, parsed.data, meta.data);
      results.push({ index, slug: saved.slug, titleKy, action: existing ? 'updated' : 'created' });
    } catch (error) {
      if (error instanceof AppError) {
        results.push({
          index,
          slug: meta.data.slug ?? null,
          titleKy,
          action: 'invalid',
          errors: [{ path: 'topicSlug', message: t(lang, error.messageKey) }],
        });
      } else throw error;
    }
  }
  return {
    dryRun,
    created: results.filter((r) => r.action === 'created').length,
    updated: results.filter((r) => r.action === 'updated').length,
    invalid: results.filter((r) => r.action === 'invalid').length,
    results,
  };
}
