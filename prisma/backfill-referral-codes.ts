import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();
const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';

async function generateUniqueCode(seed: string, usedCodes: Set<string>): Promise<string> {
  const prefix = (seed || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 5);
  for (let attempt = 0; attempt < 50; attempt++) {
    const bytes = crypto.randomBytes(3);
    const suffix = Array.from({ length: 3 }, (_, i) => chars[bytes[i] % chars.length]).join('');
    const code = prefix + suffix;
    if (!usedCodes.has(code)) {
      usedCodes.add(code);
      return code;
    }
  }
  const bytes = crypto.randomBytes(6);
  return Array.from({ length: 6 }, (_, i) => chars[bytes[i] % chars.length]).join('');
}

async function main() {
  // Fetch all users and filter client-side — avoids Prisma/MongoDB null-vs-missing mismatch
  // Do NOT select `name`: some docs have name=null while the schema marks it
  // non-nullable, which makes Prisma throw P2032. `email` is the login field
  // and is reliably present; use it only as a cosmetic code prefix.
  const allUsers = await (prisma.user.findMany as any)({
    select: { id: true, email: true, referralCode: true },
  }) as Array<{ id: string; email: string | null; referralCode: string | null }>;

  const users = allUsers.filter((u) => !u.referralCode);
  console.log(`Total users: ${allUsers.length}, need referral codes: ${users.length}`);

  if (users.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const usedCodes = new Set(
    allUsers.map((u) => u.referralCode).filter(Boolean) as string[],
  );

  let updated = 0;
  for (const user of users) {
    const code = await generateUniqueCode((user.email ?? '').split('@')[0], usedCodes);
    await (prisma.user.update as any)({
      where: { id: user.id },
      data: { referralCode: code },
      select: { id: true },
    });
    updated++;
    if (updated % 50 === 0) console.log(`Updated ${updated}/${users.length}`);
  }

  console.log(`Done — assigned referral codes to ${updated} users`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
