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
  const { method } = req;
  const { name } = req.query;
  const POLY_MARKET = "https://polymarket.com/event/when-will-gpt-5-be-announced?tid=1729566306341";
  const POLY_QUESTION = "GPT-5 not announced in 2024?"

  if (typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid name parameter' });
  }

  if (method === 'GET') {
    try {
      const pool = await PoolService.getOrCreateByName(name);
      if(!pool.holdings.USDC) {
        pool.holdings.USDC = {name: "USDC", amount:"0"};
      }
      if(!pool.holdings[POLY_QUESTION]) {
        pool.holdings[POLY_QUESTION] = {name: POLY_QUESTION, amount:"10000", cost_basis: "0.1"};
      }
      pool.holdings.NEAR = {name: "NEAR", amount: await getNearBalance(name)};
      pool.estimatedValue = PoolService.getEstimatedValue(pool.holdings);
      pool.markets = [POLY_MARKET];
      pool.type = "prediction_market";
      if(!pool.details) {
        pool.details = {};
      }
      res.status(200).json(pool);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error creating or retrieving Pool' });
    }
  } else if (method === 'POST' || method === 'PUT') {
    try {
      const { holdings } = req.body;

      if (!holdings || typeof holdings !== 'object') {
        return res.status(400).json({ error: 'Invalid holdings data' });
      }

      // Update the pool's holdings
      let pool = await PoolService.updateHoldings(name, holdings);

      // Update NEAR balance
      pool.holdings.NEAR = { name: "NEAR", amount: await getNearBalance(name) };

      // Recalculate estimatedValue
      pool.estimatedValue = PoolService.getEstimatedValue(pool.holdings);

      // Add additional properties
      pool.markets = [POLY_MARKET];
      pool.type = "prediction_market";
      if (!pool.details) {
        pool.details = {};
      }

      res.status(200).json(pool);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error updating pool holdings' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}
