const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class PoolService {
  static async getOrCreateByName(name) {
    // Check if the Pool already exists by name
    const existingPool = await prisma.pool.findUnique({
      where: { name },
    });

    // If it exists, return the existing pool
    if (existingPool) return existingPool;

    // Otherwise, create a new Pool with default holdings as an empty object
    return await prisma.pool.create({
      data: {
        name,
        holdings: {},
        details: {}
      },
    });
  }

  static async updateHoldings(name, holdings) {
    const pool = await prisma.pool.update({
      where: { name },
      data: { holdings },
    });
    return pool;
  }

  static getEstimatedValue(holdings) {
    const NEAR_CONVERSION_USD = 5.0; // TODO: Ideally, fetch this dynamically if time permits.
    let totalNEAR = holdings.NEAR.amount;
    
    // Convert USDC to NEAR equivalent and add to totalNEAR
    totalNEAR += holdings.USDC.amount / NEAR_CONVERSION_USD;

    // Iterate over other holdings and convert to NEAR
    for (let asset in holdings) {
      if (asset !== 'USDC' && asset !== 'NEAR') {
        totalNEAR += (holdings[asset].amount * holdings[asset].cost_basis) / NEAR_CONVERSION_USD * 1e24;
      }
    }

    // Calculate total USD based on the NEAR equivalent value
    const totalUSD = (totalNEAR * NEAR_CONVERSION_USD / 1e24).toFixed(2);

    return { totalNEAR, totalUSD };
  }
}

export default PoolService;
