import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Set DRY_RUN=1 (or pass --dry) to only report what WOULD change, no writes.
const DRY_RUN = process.env.DRY_RUN === '1' || process.argv.includes('--dry');

async function main() {
  console.log(DRY_RUN ? '== DRY RUN (no writes) ==' : '== APPLYING CHANGES ==');

  // 1) Find all transactions where userId is null, via raw Mongo so dirty docs
  //    can't trip Prisma schema validation (P2032).
  const res: any = await prisma.$runCommandRaw({
    find: 'Transaction',
    filter: { userId: null },
    projection: { _id: 1, email: 1 },
    batchSize: 1_000_000,
  });

  const orphans: any[] = res?.cursor?.firstBatch ?? [];
  console.log(`Orphan transactions (userId == null): ${orphans.length}`);

  // 2) Map orphan transactions by email -> the distinct set of emails to resolve.
  const emails = new Set<string>();
  for (const t of orphans) {
    const email = (t.email ?? '').trim().toLowerCase();
    if (email) emails.add(email);
  }
  console.log(`Distinct emails among orphans: ${emails.size}`);

  let linked = 0;
  let noUser = 0;

  // 3) For each email, find the user. If it exists, connect the transactions.
  for (const email of emails) {
    const user: any = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, email: true },
    });

    if (!user) {
      noUser++;
      console.log(`[skip] ${email}: no user — left untouched`);
      continue;
    }

    const where = {
      userId: null,
      email: { equals: email, mode: 'insensitive' as const },
    };

    if (DRY_RUN) {
      const count = await prisma.transaction.count({ where });
      linked += count;
      console.log(`[dry] ${email} -> ${user.id}: would link ${count} transaction(s)`);
      continue;
    }

    const result = await prisma.transaction.updateMany({ where, data: { userId: user.id } });
    linked += result.count;
    console.log(`${email} -> ${user.id}: linked ${result.count} transaction(s)`);
  }

  const orphansAfter = await prisma.transaction.count({ where: { userId: null } });

  console.log('--------------------------------------------');
  console.log(`Linked transactions:           ${DRY_RUN ? linked + ' (would link)' : linked}`);
  console.log(`Emails with no user (skipped): ${noUser}`);
  console.log(`Orphan transactions remaining: ${orphansAfter}`);
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
