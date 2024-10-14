import test from 'ava';
import sinon from 'sinon';
import { createJob } from '../services/jobService.js';
import { handleBuy, handleSell } from '../services/nearAiService.js';
import { handleDeposit, handleWithdraw } from '../services/smartContractService.js';
import { handleSwap } from '../services/swapService.js';

// Mock the jobService's createJob function
test.beforeEach(() => {
  sinon.restore();
  sinon.stub(createJob);
});

test('handleBuy should create a BUY job and return job info', async (t) => {
  const userId = '1';
  const amount = 100;
  const jobData = {
    action: 'BUY',
    userId: parseInt(userId),
    amount: amount.toString(),
  };

  const createdJob = {
    id: 1,
    ...jobData,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  createJob.resolves(createdJob);

  const result = await handleBuy({ userId, amount });

  t.true(createJob.calledOnceWithExactly(jobData));
  t.deepEqual(result, { message: 'Buy job added to queue', jobId: createdJob.id });
});

test('handleBuy should throw an error for invalid purchase amount', async (t) => {
  const userId = '1';
  const amount = -50;

  await t.throwsAsync(async () => {
    await handleBuy({ userId, amount });
  }, { instanceOf: Error, message: 'Invalid purchase amount' });

  t.false(createJob.called);
});

test('handleSell should create a SELL job and return job info', async (t) => {
  const userId = '1';
  const amount = 50;
  const jobData = {
    action: 'SELL',
    userId: parseInt(userId),
    amount: amount.toString(),
  };

  const createdJob = {
    id: 2,
    ...jobData,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  createJob.resolves(createdJob);

  const result = await handleSell({ userId, amount });

  t.true(createJob.calledOnceWithExactly(jobData));
  t.deepEqual(result, { message: 'Sell job added to queue', jobId: createdJob.id });
});

test('handleDeposit should create a DEPOSIT job and return job info', async (t) => {
  const userId = '1';
  const amountUsdc = 200;
  const receiptuuid = 'receipt-123';

  const jobData = {
    action: 'DEPOSIT',
    userId: parseInt(userId),
    amount: amountUsdc.toString(),
    receiptuuid,
  };

  const createdJob = {
    id: 3,
    ...jobData,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  createJob.resolves(createdJob);

  const result = await handleDeposit({ userId, amountUsdc, receiptuuid });

  t.true(createJob.calledOnceWithExactly(jobData));
  t.deepEqual(result, { message: 'Deposit job added to queue', jobId: createdJob.id });
});

test('handleWithdraw should create a WITHDRAW job and return job info', async (t) => {
  const userId = '1';
  const percentage = 50;
  const receiptuuid = 'receipt-456';

  const jobData = {
    action: 'WITHDRAW',
    userId: parseInt(userId),
    percentage: percentage.toString(),
    receiptuuid,
  };

  const createdJob = {
    id: 4,
    ...jobData,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  createJob.resolves(createdJob);

  const result = await handleWithdraw({ userId, percentage, receiptuuid });

  t.true(createJob.calledOnceWithExactly(jobData));
  t.deepEqual(result, { message: 'Withdraw job added to queue', jobId: createdJob.id });
});

test('handleSwap should create a SWAP job and return job info', async (t) => {
  const userId = '1';
  const amountNear = 10;

  const jobData = {
    action: 'SWAP',
    userId: parseInt(userId),
    amount: amountNear.toString(),
  };

  const createdJob = {
    id: 5,
    ...jobData,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  createJob.resolves(createdJob);

  const result = await handleSwap({ userId, amountNear });

  t.true(createJob.calledOnceWithExactly(jobData));
  t.deepEqual(result, { message: 'Swap job added to queue', jobId: createdJob.id });
});

