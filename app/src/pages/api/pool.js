// pages/api/pool.js

import PoolService from '@/services/poolService';

export default async function handler(req, res) {
  const { name } = req.query;

  if (typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid name parameter' });
  }

  try {
    const pool = await PoolService.getOrCreateByName(name);
    res.status(200).json(pool);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating or retrieving Pool' });
  }
}
