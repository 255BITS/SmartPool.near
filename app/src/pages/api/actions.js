const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { action, by, details, poolName } = req.body;
    
    if (!action || !by || !poolName) {
      return res.status(400).json({ error: 'Missing required fields: action, by, or poolName' });
    }

    try {
      const newAction = await prisma.action.create({
        data: {
          action,
          by,
          details: details || {},
          poolName,
        },
      });

      res.status(201).json(newAction);
    } catch (error) {
      console.error('Error creating action:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }

  } else if (req.method === 'GET') {
    const { poolName } = req.query;

    try {
      const actions = await prisma.action.findMany({
        where: { poolName },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json(actions);
    } catch (error) {
      console.error('Error fetching actions:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
