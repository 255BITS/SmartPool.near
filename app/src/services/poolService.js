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
        holdings: {}, // Default empty JSON object
      },
    });
  }
}

export default PoolService;
