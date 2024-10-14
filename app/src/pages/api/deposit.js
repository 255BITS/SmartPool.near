import { handleDeposit } from '../../services/smartContractService.js';

export default async function depositHandler(req, res) {
  if (req.method === 'POST') {
    const { userId, amountUsdc, receiptuuid } = req.body;

    try {
      const result = await handleDeposit({ userId, amountUsdc, receiptuuid });
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in depositHandler:', error);
      res.status(400).json({ error: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

