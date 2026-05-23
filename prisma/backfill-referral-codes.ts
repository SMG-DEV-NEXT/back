import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();
const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';

async function generateUniqueCode(name: string, usedCodes: Set<string>): Promise<string> {
  const prefix = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 5);
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
  const users = await prisma.user.findMany({
    where: { referralCode: null },
    select: { id: true, name: true },
  });

  console.log(`Found ${users.length} users without referral codes`);
  if (users.length === 0) return;

  const existingCodes = await prisma.user.findMany({
    where: { referralCode: { not: null } },
    select: { referralCode: true },
  });
  const usedCodes = new Set(existingCodes.map((u) => u.referralCode!));

  let updated = 0;
  for (const user of users) {
    const code = await generateUniqueCode(user.name, usedCodes);
    await prisma.user.update({ where: { id: user.id }, data: { referralCode: code } });
    updated++;
    if (updated % 100 === 0) console.log(`Updated ${updated}/${users.length}`);
  }

  console.log(`Done — assigned referral codes to ${updated} users`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
