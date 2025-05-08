import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const blocks = [
    { titleru: 'Приветствие', titleen: 'Greeting', order: 0 },
    { titleru: 'Полезная информация', titleen: 'Useful information', order: 1 },
    {
      titleru: 'Проблемы и решения',
      titleen: 'Problems and solutions',
      order: 2,
    },
  ];

  for (const block of blocks) {
    const exists = await prisma.faqBlock.findFirst({
      where: { order: block.order },
    });
    if (!exists) {
      await prisma.faqBlock.create({ data: block });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
// npx prisma db seed
