// pages/api/pool.js

import { providers } from 'near-api-js';
import PoolService from '@/services/poolService';

const CONTRACT_ID = 'smartpool.testnet';
const networkId = 'testnet';

const viewMethod = async ({ contractId, method, args = {} }) => {
  const url = `https://rpc.${networkId}.near.org`;
  const provider = new providers.JsonRpcProvider({ url });

  const encodedArgs = Buffer.from(JSON.stringify(args)).toString('base64');
  
  try {
    const res = await provider.query({
      request_type: 'call_function',
      account_id: contractId,
      method_name: method,
      args_base64: encodedArgs,
      finality: 'optimistic',
    });
    return JSON.parse(Buffer.from(res.result).toString());
  } catch (error) {
    console.error("Error querying NEAR view method:", error);
    throw error;
  }
};

const getNearBalance = async (poolId) => {
  const balance = await viewMethod({
    contractId: `${poolId}.${CONTRACT_ID}`,
    method: 'get_near_balance'
  });
  return balance;
};

export default async function handler(req, res) {
  const { name } = req.query;

  if (typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid name parameter' });
  }

  try {
    const pool = await PoolService.getOrCreateByName(name);
    if(!pool.holdings.USDC) {
      pool.holdings.USDC = {name: "USDC", amount:"0"};
    }
    pool.holdings.NEAR = {name: "NEAR", amount: await getNearBalance(name)};
    pool.estimatedValue = PoolService.getEstimatedValue(pool.holdings);
    res.status(200).json(pool);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating or retrieving Pool' });
  }
}
