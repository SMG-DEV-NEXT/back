import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();
const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';

function generateUniqueCode(seed: string, usedCodes: Set<string>): string {
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
  const code = Array.from({ length: 6 }, (_, i) => chars[bytes[i] % chars.length]).join('');
  usedCodes.add(code);
  return code;
}

async function main() {
  // Read/write via raw Mongo to bypass Prisma schema validation: prod has User
  // docs with null name/email while the schema marks them non-nullable, which
  // makes any typed prisma.user query throw P2032.
  const res: any = await prisma.$runCommandRaw({
    find: 'User',
    filter: {},
    projection: { _id: 1, email: 1, referralCode: 1 },
    batchSize: 1_000_000,
  });

  const docs: any[] = res?.cursor?.firstBatch ?? [];
  const usedCodes = new Set<string>(
    docs.map((d) => d.referralCode).filter(Boolean) as string[],
  );

  const needCodes = docs.filter((d) => !d.referralCode);
  console.log(`Total users: ${docs.length}, need referral codes: ${needCodes.length}`);

  if (needCodes.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  let updated = 0;
  for (const doc of needCodes) {
    const id = doc._id?.$oid ?? doc._id;
    const code = generateUniqueCode((doc.email ?? '').split('@')[0], usedCodes);
    await prisma.$runCommandRaw({
      update: 'User',
      updates: [{ q: { _id: { $oid: id } }, u: { $set: { referralCode: code } } }],
    });
    updated++;
    if (updated % 50 === 0) console.log(`Updated ${updated}/${needCodes.length}`);
  }

  console.log(`Done — assigned referral codes to ${updated} users`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
