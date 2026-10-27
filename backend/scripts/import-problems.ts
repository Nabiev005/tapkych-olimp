// Imports problems from a JSON file (format: docs/problem-format.md).
// Usage:
//   npm run problems:import -w backend -- --file ../docs/problems.example.json [--dry-run] [--status PUBLISHED] [--author admin@example.kg]
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { prisma } from '../src/db.js';
import { importProblems } from '../src/services/adminProblems.js';

const { values } = parseArgs({
  options: {
    file: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    status: { type: 'string' },
    author: { type: 'string' },
  },
});

async function main(): Promise<void> {
  if (!values.file)
    throw new Error(
      'Usage: --file <problems.json> [--dry-run] [--status DRAFT|PUBLISHED] [--author <email>]',
    );
  const json: unknown = JSON.parse(readFileSync(resolve(values.file), 'utf8'));
  const items = Array.isArray(json) ? json : (json as { problems?: unknown[] }).problems;
  if (!Array.isArray(items))
    throw new Error('The file must contain an array or { "problems": [...] }');

  // --status overrides items without their own status
  const withStatus = values.status
    ? items.map((i) =>
        i && typeof i === 'object' && !('status' in i) ? { ...i, status: values.status } : i,
      )
    : items;

  const author = values.author
    ? await prisma.user.findUnique({ where: { email: values.author.toLowerCase() } })
    : await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' } });
  if (!author) throw new Error('Author not found (create an admin first: npm run admin:create)');

  const report = await importProblems(author.id, withStatus, values['dry-run'], 'ky');
  for (const r of report.results) {
    const label = `#${r.index + 1} ${r.titleKy ?? ''}`.trim();
    if (r.action === 'invalid') {
      console.log(`✗ ${label}`);
      for (const e of r.errors ?? []) console.log(`    ${e.path}: ${e.message}`);
    } else {
      console.log(`${r.action === 'created' ? '+' : '~'} ${label} (${r.slug ?? 'new slug'})`);
    }
  }
  console.log(
    `\n${report.dryRun ? '[dry run] ' : ''}created: ${report.created}, updated: ${report.updated}, invalid: ${report.invalid}`,
  );
  if (report.invalid > 0) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
