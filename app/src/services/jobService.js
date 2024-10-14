import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function createJob(jobData) {
  const job = await prisma.job.create({
    data: jobData,
  });
  return job;
}

export async function getPendingJobs() {
  const jobs = await prisma.job.findMany({
    where: { status: 'pending' },
  });
  return jobs;
}

export async function updateJobStatus(jobId, status, details = null) {
  const job = await prisma.job.update({
    where: { id: jobId },
    data: {
      status,
      details,
      updatedAt: new Date(),
    },
  });
  return job;
}

