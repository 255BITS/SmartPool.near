import { createJob } from '@/services/jobService';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { jobType, payload, poolName } = req.body;

  // Basic validation
  if (!jobType) {
    return res.status(400).json({ error: 'Missing job type' });
  }

  // Switch based on job type
  switch (jobType) {
    case 'runAI':
      // Queue up the AI job
      runAIJob(payload, poolName);
      res.status(200).json({ status: 'Job queued: runAI' });
      break;

    case 'fulfillDeposit':
      // Queue up the deposit fulfillment job
      fulfillDepositJob(payload, poolName);
      res.status(200).json({ status: 'Job queued: fulfillDeposit' });
      break;

    case 'fulfillWithdraw':
      // Queue up the deposit fulfillment job
      fulfillWithdrawJob(payload, poolName);
      res.status(200).json({ status: 'Job queued: fulfillWithdraw' });
      break;


    default:
      res.status(400).json({ error: 'Unknown job type' });
  }
}

function runAIJob(payload, poolName) {
  createJob('runAI', payload, poolName);
}

function fulfillDepositJob(payload, poolName) {
  //TODO prevent double call on the same payload.iou.iou_id
  createJob('fulfillDeposit', payload, poolName);
}

function fulfillWithdrawJob(payload, poolName) {
  createJob('fulfillWithdraw', payload, poolName);
}
