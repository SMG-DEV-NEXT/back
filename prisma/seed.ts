import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const defaultLoyaltyTiers = {
  tiers: [
    { minSpent: 10000, percent: 3 },
    { minSpent: 25000, percent: 5 },
    { minSpent: 50000, percent: 7 },
    { minSpent: 100000, percent: 10 },
  ],
};

async function main() {
  console.log('1) Initializing loyalty tiers setting...');

  await prisma.setting.upsert({
    where: { title: 'loyalty_tiers' },
    update: {},
    create: {
      title: 'loyalty_tiers',
      settings: defaultLoyaltyTiers as any,
    },
  });

  console.log('   loyalty_tiers setting is ready.');
  console.log('2) Initializing totalSpent for all users from successful transactions...');

  const users = await prisma.user.findMany();
  let updated = 0;

  for (const user of users) {
    const result = await (prisma.transaction as any).aggregate({
      where: {
        userId: user.id,
        status: 'success',
      },
      _sum: {
        realPrice: true,
      },
    });

    const totalSpent: number = Number(result?._sum?.realPrice || 0);

    await (prisma.user as any).update({
      where: { id: user.id },
      data: { totalSpent },
    });

    updated++;
    console.log(`   ${user.email}: totalSpent = ${totalSpent} RUB`);
  }

  console.log(`\nDone! Updated ${updated} users and prepared loyalty settings.`);
  // const allPlans = await prisma.plan.findMany();
  // allPlans.forEach(async (plan) => {
  //   await prisma.period.update({
  //     where: { id: plan.dayId },
  //     data: { titleRu: "1 дней", titleEn: "1 days" }
  //   })
  //   await prisma.period.update({
  //     where: { id: plan.weekId },
  //     data: { titleRu: "7 дней", titleEn: "7 days" }
  //   })
  //   await prisma.period.update({
  //     where: { id: plan.monthId },
  //     data: { titleRu: "30 дней", titleEn: "30 days" }
  //   })
  // })
  await prisma.stats.updateMany({
    where: {},
    data: { slug: "test-slug", h1en: "", h1ru: "" }
  })
  console.log("Periods updated")
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
