import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import * as bcrypt from 'bcryptjs';
import { guaranteSettings } from './guarante';

// async function main() {
//   const blocks = [
//     { titleru: 'Приветствие', titleen: 'Greeting', order: 0 },
//     { titleru: 'Полезная информация', titleen: 'Useful information', order: 1 },
//     {
//       titleru: 'Проблемы и решения',
//       titleen: 'Problems and solutions',
//       order: 2,
//     },
//   ];

//   for (const block of blocks) {
//     const exists = await prisma.faqBlock.findFirst({
//       where: { order: block.order },
//     });
//     if (!exists) {
//       await prisma.faqBlock.create({ data: block });
//     }
//   }
//   const hashedPassword = await bcrypt.hash('office123', 10);

//   await prisma.user.create({
//     data: {
//       name: 'Admin',
//       email: 'admin@smg.com',
//       password: hashedPassword,
//       isAdmin: true,
//       raiting: '0',
//       isTwoFactorEnabled: false,
//       resetCode: '',
//     },
//   });

//   await prisma.setting.create({
//     data: {
//       title: 'guarante',
//       settings: guaranteSettings,
//     },
//   });
// }

async function main() {
  await prisma.cheat.updateMany({
    where: {},
    data: { isDeleted: false },
  });
  await prisma.catalog.updateMany({
    where: {},
    data: { isDeleted: false },
  });
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
// npx prisma db seed
