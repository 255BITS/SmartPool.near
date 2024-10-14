import { createJob } from './jobService.js';

export async function handleDeposit({ userId, amountUsdc, receiptuuid }) {
  if (amountUsdc <= 0) {
    throw new Error('Invalid deposit amount');
  }

  if (!receiptuuid) {
    throw new Error('Invalid receipt UUID');
  }

  // Create a job for deposit
  const jobData = {
    action: 'DEPOSIT',
    userId: parseInt(userId),
    amount: amountUsdc.toString(),
    receiptuuid,
  };

  const job = await createJob(jobData);
  return { message: 'Deposit job added to queue', jobId: job.id };
}

export async function handleWithdraw({ userId, percentage, receiptuuid }) {
  if (percentage <= 0 || percentage > 100) {
    throw new Error('Invalid percentage value');
  }

  if (!receiptuuid) {
    throw new Error('Invalid receipt UUID');
  }

  // Create a job for withdrawal
  const jobData = {
    action: 'WITHDRAW',
    userId: parseInt(userId),
    percentage: percentage.toString(),
    receiptuuid,
  };

  const job = await createJob(jobData);
  return { message: 'Withdraw job added to queue', jobId: job.id };
}

