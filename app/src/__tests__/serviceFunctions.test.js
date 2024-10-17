import test from 'ava';
import sinon from 'sinon';
import { handleBuy, handleSell } from '../services/nearAiService.js';
import { handleDeposit, handleWithdraw } from '../services/smartContractService.js';

import esmock from 'esmock';
let createJob;

test.beforeEach(async (t) => {
  t.context.createJob = sinon.stub();
});

test.afterEach.always(async () => {
  await esmock.purge(createJob);
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

  t.context.createJob.resolves(createdJob);

  const result = await handleBuy({ userId, amount }, t.context.createJob);

  t.true(t.context.createJob.calledOnceWithExactly(jobData));
  t.deepEqual(result, { message: 'Buy job added to queue', jobId: createdJob.id });
});

test('handleBuy should throw an error for invalid purchase amount', async (t) => {
  const userId = '1';
  const amount = -50;

  await t.throwsAsync(async () => {
    await handleBuy({ userId, amount }, t.context.createJob);
  }, { instanceOf: Error, message: 'Invalid purchase amount' });

  t.false(t.context.createJob.called);
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

  t.context.createJob.resolves(createdJob);

  const result = await handleSell({ userId, amount }, t.context.createJob);

  t.true(t.context.createJob.calledOnceWithExactly(jobData));
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

  t.context.createJob.resolves(createdJob);

  const result = await handleDeposit({ userId, amountUsdc, receiptuuid }, t.context.createJob);

  t.true(t.context.createJob.calledOnceWithExactly(jobData));
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

  t.context.createJob.resolves(createdJob);

  const result = await handleWithdraw({ userId, percentage, receiptuuid }, t.context.createJob);

  t.true(t.context.createJob.calledOnceWithExactly(jobData));
  t.deepEqual(result, { message: 'Withdraw job added to queue', jobId: createdJob.id });
});

