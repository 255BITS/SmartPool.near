import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getUserBalance(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { usdc: true, near: true, tokens: true },
  });
  if (!user) {
    throw new Error('User not found');
  }
  return user;
}

export async function updateUserBalance(userId, balanceUpdates) {
  await prisma.user.update({
    where: { id: userId },
    data: balanceUpdates,
  });
}

export async function createTransaction(transactionData) {
  await prisma.transaction.create({
    data: transactionData,
  });
}
