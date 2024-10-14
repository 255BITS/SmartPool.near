import { handleWithdraw } from '../../services/smartContractService.js';

export default async function withdrawHandler(req, res) {
  if (req.method === 'POST') {
    const { userId, percentage, receiptuuid } = req.body;

    try {
      const result = await handleWithdraw({ userId, percentage, receiptuuid });
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in withdrawHandler:', error);
      res.status(400).json({ error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

