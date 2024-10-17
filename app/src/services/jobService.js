import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createJob(jobData, prismaClient = prisma) {
  const job = await prismaClient.job.create({
    data: jobData,
  });
  return job;
}

export async function getPendingJobs(prismaClient = prisma) {
  const jobs = await prismaClient.job.findMany({
    where: { status: 'pending' },
  });
  return jobs;
}

export async function updateJobStatus(jobId, status, details = null, prismaClient=prisma) {
  const job = await prismaClient.job.update({
    where: { id: jobId },
    data: {
      status,
      details,
      updatedAt: new Date(),
    },
  });
  return job;
}

