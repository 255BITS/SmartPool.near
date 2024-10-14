import { getPendingJobs, updateJobStatus } from '@/services/jobService';

export default async function jobsHandler(req, res) {
  if (req.method === 'GET') {
    // Fetch pending jobs for the job processor
    try {
      const jobs = await getPendingJobs();
      res.status(200).json(jobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else if (req.method === 'POST') {
    // Job processor updates job status
    const { jobId, status, details } = req.body;

    if (!jobId || !status) {
      return res.status(400).json({ error: 'Missing jobId or status' });
    }

    try {
      const job = await updateJobStatus(jobId, status, details);
      res.status(200).json({ message: `Job ${jobId} status updated to ${status}` });
    } catch (error) {
      console.error('Error updating job status:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

