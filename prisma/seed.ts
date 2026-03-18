import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SYSTEM_CATEGORIES = [
  'אוכל',
  'קניות',
  'דיור',
  'חשבונות',
  'תחבורה',
  'מנויים',
  'פנאי',
  'הכנסות',
  'עמלות',
  'אחר',
];

const main = async (): Promise<void> => {
  for (const name of SYSTEM_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { name, userId: null, isSystem: true },
    });
    if (!existing) {
      await prisma.category.create({
        data: { name, userId: null, isSystem: true },
      });
    }
  }
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
