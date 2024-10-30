'use client';

import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../app.module.css';
import { NearContext } from '@/wallets/near';
import { utils } from 'near-api-js';
import PoolCard from '@/components/PoolCard';
import Decimal from 'decimal.js';

const CONTRACT_ID = 'smartpool.testnet';
const STORAGE_DEPOSIT_AMOUNT = utils.format.parseNearAmount('0.00125');

export default function PredictionMarkets() {
  const router = useRouter();
  const { signedAccountId, wallet } = useContext(NearContext);
  const [smartPools, setSmartPools] = useState([]);
  const [storageRegistered, setStorageRegistered] = useState({});
  const [marketCaps, setMarketCaps] = useState({});
  const [tokenData, setTokenData] = useState({});
  const [ious, setIous] = useState({});

  useEffect(() => {
    if (!wallet) return;

    const fetchPoolsAndData = async () => {
      try {
        const pools = await wallet.viewMethod({
          contractId: CONTRACT_ID,
          method: 'list_pools',
        });
        setSmartPools(pools);

        pools.forEach(async (poolId) => {
          try {
            // Fetch market cap
            const mcap = await getMcap(poolId);
            setMarketCaps((prev) => ({ ...prev, [poolId]: mcap }));

            // Fetch token data
            const tokens = await getTokens(poolId);
            setTokenData((prev) => ({ ...prev, [poolId]: tokens }));

            // Fetch IOUs
            const iousData = await getIous(poolId);
            setIous((prev) => ({ ...prev, [poolId]: iousData }));

            // Fetch storage balance
            if (signedAccountId) {
              const storageBalance = await wallet.viewMethod({
                contractId: `${poolId}.${CONTRACT_ID}`,
                method: 'storage_balance_of',
                args: { account_id: signedAccountId },
              });
              setStorageRegistered((prev) => ({
                ...prev,
                [poolId]: !!storageBalance && storageBalance.total !== null,
              }));
            }
          } catch (error) {
            console.error(`Error fetching data for pool ${poolId}:`, error);
          }
        });
      } catch (error) {
        console.error('Error fetching SmartPools:', error);
      }
    };

    fetchPoolsAndData();
  }, [wallet, signedAccountId]);

  const handleCreate = () => {
    router.push('/prediction-markets/create');
  };

  const handleRegisterStorage = async (poolId) => {
    await wallet.callMethod({
      contractId: `${poolId}.${CONTRACT_ID}`,
      method: 'storage_deposit',
      args: { account_id: signedAccountId },
      gas: '300000000000000',
      deposit: STORAGE_DEPOSIT_AMOUNT,
    });
    setStorageRegistered((prev) => ({ ...prev, [poolId]: true }));
  };

  const handleDeposit = async (poolId) => {
    if (!signedAccountId) {
      alert('Please sign in to deposit.');
      return;
    }

    if (!storageRegistered[poolId]) {
      const confirmRegister = confirm('Storage is not registered. Would you like to register now?');
      if (!confirmRegister) return;
      await handleRegisterStorage(poolId);
    }

    const amount = prompt('Enter the amount of NEAR to deposit:');
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const depositAmount = utils.format.parseNearAmount(amount);

    await wallet.callMethod({
      contractId: `${poolId}.${CONTRACT_ID}`,
      method: 'deposit',
      args: {},
      gas: '300000000000000',
      deposit: depositAmount,
    });
  };

  const handleWithdraw = async (poolId) => {
    if (!signedAccountId) {
      alert('Please sign in to withdraw.');
      return;
    }

    const amount = prompt('Enter the amount of tokens to withdraw:');
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    await wallet.callMethod({
      contractId: `${poolId}.${CONTRACT_ID}`,
      method: 'withdraw',
      args: { amount: amount },
      gas: '300000000000000',
      deposit: '0',
    });
  };

  const getMcap = async (poolId) => {
    if (signedAccountId) {
      try {
      const balance = await wallet.viewMethod({
        contractId: `${poolId}.${CONTRACT_ID}`,
        method: 'get_near_balance'
      });
      return utils.format.formatNearAmount(balance || "0", 2) + " NEAR";
      } catch(error) {
        return "N/A";
      }
    } else {
      return "Loading...";
    }
  };

  const getTokens = async (poolId) => {
    if (signedAccountId) {
      const ownedTokens = await wallet.viewMethod({
        contractId: `${poolId}.${CONTRACT_ID}`,
        method: 'ft_balance_of',
        args: { account_id: signedAccountId },
      });
      const totalTokensIssued = await wallet.viewMethod({
        contractId: `${poolId}.${CONTRACT_ID}`,
        method: 'ft_total_supply',
      });
      const owned = ownedTokens || 0;
      const total = totalTokensIssued || 0;
      const percentage = total > 0 ? Decimal((owned / total) * 100).toFixed(2) : '0.00';
      if(parseInt(total, 10) === 0) {
        return "No tokens issued";
      }
      return `${owned}/${total} (${percentage}%)`;
    } else {
      return "Loading...";
    }
  };

  const getIous = async (poolId) => {
    try {
      const iousResult = await wallet.viewMethod({
        contractId: `${poolId}.${CONTRACT_ID}`,
        method: 'list_ious',
      });
      return iousResult;
    } catch (error) {
      console.error(`Error fetching IOUs for pool ${poolId}:`, error);
      return [];
    }
  };

  return (
    <div>
      <h1>Prediction Market SmartPools</h1>
      <button onClick={handleCreate}>Create Prediction Market SmartPool</button>
      <ul className={styles.list}>
        {smartPools.map((pool, index) => (
          <li key={index}>
            <PoolCard
              pool={pool}
              stats={{
                marketCap: marketCaps[pool] || 'Loading...',
                tokensIssued: tokenData[pool] || 'Loading...',
                ious: ious[pool] || []
              }}
              onDeposit={() => handleDeposit(pool)}
              onWithdraw={() => handleWithdraw(pool)}
              onView={() => router.push(`/prediction-markets/${pool}`)}
              onRegisterStorage={() => handleRegisterStorage(pool)}
              isStorageRegistered={storageRegistered[pool]}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
