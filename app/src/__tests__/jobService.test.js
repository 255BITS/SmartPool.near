import test from 'ava';
import sinon from 'sinon';
import { PrismaClient } from '@prisma/client';
import { createJob, getPendingJobs, updateJobStatus } from '../services/jobService.js';

test.beforeEach((t) => {
  t.context.prisma = new PrismaClient();
  t.context.prisma.job = { create: () => {}, update: () => {}, findMany: () => {} }; // Ensure job model is initialized
  sinon.stub(t.context.prisma.job, 'create');
  sinon.stub(t.context.prisma.job, 'update');
  sinon.stub(t.context.prisma.job, 'findMany');
});

test.after((t) => {
  sinon.restore();
});

test('createJob should create a job and return it', async (t) => {
  const { prisma } = t.context;
  const jobData = { action: 'BUY', userId: 1, amount: '100.00' };

  const createdJob = {
    id: 1,
    ...jobData,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  prisma.job.create.resolves(createdJob);

  const result = await createJob(jobData, prisma);

  t.true(prisma.job.create.calledOnceWithExactly({ data: jobData }));
  t.deepEqual(result, createdJob);
});

test('getPendingJobs should return all pending jobs', async (t) => {
  const { prisma } = t.context;
  const pendingJobs = [
    {
      id: 1,
      action: 'BUY',
      userId: 1,
      amount: '100.00',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      action: 'SELL',
      userId: 2,
      amount: '50.00',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  prisma.job.findMany.resolves(pendingJobs);

  const result = await getPendingJobs(prisma);

  t.true(prisma.job.findMany.calledOnceWithExactly({ where: { status: 'pending' } }));
  t.deepEqual(result, pendingJobs);
});

test('updateJobStatus should update the job status and details', async (t) => {
  const { prisma } = t.context;
  const jobId = 1;
  const status = 'complete';
  const details = { success: true };

  const updatedJob = {
    id: jobId,
    action: 'BUY',
    userId: 1,
    amount: '100.00',
    status,
    details,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  prisma.job.update.resolves(updatedJob);

  const result = await updateJobStatus(jobId, status, details, prisma);

  t.true(
    prisma.job.update.calledOnceWithExactly({
      where: { id: jobId },
      data: { status, details, updatedAt: sinon.match.date },
    })
  );
  t.deepEqual(result, updatedJob);
});

