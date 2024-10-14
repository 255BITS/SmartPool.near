import { createJob } from './jobService.js';

export async function handleSwap({ userId, amountNear }) {
  if (amountNear <= 0) {
    throw new Error('Invalid swap amount');
  }

  // Create a job for swapping NEAR to USDC
  const jobData = {
    action: 'SWAP',
    userId: parseInt(userId),
    amount: amountNear.toString(),
  };

  const job = await createJob(jobData);
  return { message: 'Swap job added to queue', jobId: job.id };
}

