const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { poolName } = req.query;
  
  try {
    // Fetch actions from Prisma based on poolName
    const actions = await prisma.action.findMany({
      where: { poolName },
      orderBy: { createdAt: 'desc' }, // Order actions by most recent first
    });

    res.status(200).json(actions);
  } catch (error) {
    console.error('Error fetching actions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
