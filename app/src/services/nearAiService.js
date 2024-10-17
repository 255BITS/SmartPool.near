import { createJob } from './jobService.js';

export async function handleBuy({ userId, amount }, newJob=createJob) {
  if (amount <= 0) {
    throw new Error('Invalid purchase amount');
  }

  // Create a job for buying tokens
  const jobData = {
    action: 'BUY',
    userId: parseInt(userId),
    amount: amount.toString(),
  };

  const job = await newJob(jobData);
  return { message: 'Buy job added to queue', jobId: job.id };
}

export async function handleSell({ userId, amount }, newJob=createJob) {
  if (amount <= 0) {
    throw new Error('Invalid sell amount');
  }

  // Create a job for selling tokens
  const jobData = {
    action: 'SELL',
    userId: parseInt(userId),
    amount: amount.toString(),
  };

  const job = await newJob(jobData);
  return { message: 'Sell job added to queue', jobId: job.id };
}

