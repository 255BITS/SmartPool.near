const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

import Decimal from 'decimal.js';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { poolName, assetName, amount, costBasis } = req.body;

    if (!poolName || !assetName || amount == null) {
      return res.status(400).json({ error: 'Missing required fields: poolName, assetName, or amount' });
    }

    try {
      // Find the specified pool
      const pool = await prisma.pool.findUnique({
        where: { name: poolName },
      });

      if (!pool) {
        return res.status(404).json({ error: 'Pool not found' });
      }

      // Parse and update holdings
      const holdings = pool.holdings || {};
      const currentAsset = holdings[assetName] || { amount: Decimal(0), name: assetName, cost_basis: costBasis };
      const newAmount = (Decimal(currentAsset.amount || 0).plus(Decimal(amount))).toString();
      // TODO: update cost basis on existing asset

      holdings[assetName] = {
        ...currentAsset,
        amount: newAmount
      };

      // Update the pool with new holdings
      const updatedPool = await prisma.pool.update({
        where: { name: poolName },
        data: { holdings },
      });

      res.status(200).json(updatedPool);
    } catch (error) {
      console.error('Error updating pool holdings:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
