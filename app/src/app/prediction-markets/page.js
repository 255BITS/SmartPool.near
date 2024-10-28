'use client';

import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../app.module.css';
import { NearContext } from '@/wallets/near';
import { utils } from 'near-api-js';
import PoolCard from '@/components/PoolCard';

const CONTRACT_ID = 'smartpool.testnet';
const STORAGE_DEPOSIT_AMOUNT = utils.format.parseNearAmount('0.00125');

export default function PredictionMarkets() {
  const router = useRouter();
  const { signedAccountId, wallet } = useContext(NearContext);
  const [smartPools, setSmartPools] = useState([]);
  const [storageRegistered, setStorageRegistered] = useState({});
  const [ftBalanceOf, setFtBalanceOf] = useState({});

  useEffect(() => {
    if (!wallet) return;

    const fetchPoolsAndData = async () => {
      try {
        const pools = await wallet.viewMethod({
          contractId: CONTRACT_ID,
          method: 'list_pools',
        });
        setSmartPools(pools);
      } catch (error) {
        console.error('Error fetching SmartPools:', error);
      }
    };

    fetchPoolsAndData();
  }, [wallet]);

  const navigateToCreate = () => {
    router.push('/prediction-markets/create');
  };

  return (
    <div>
      <h1>Prediction Market SmartPools</h1>
      <button onClick={navigateToCreate}>Create Prediction Market SmartPool</button>
      <ul className={styles.list}>
        {smartPools.map((pool, index) => (
          <li key={index}>
            <PoolCard
              pool={pool}
              stats={{ marketCap: "Mock Market Cap", tokensIssued: "Mock Tokens Issued" }}
              onDeposit={() => alert(`Deposit to ${pool}`)}
              onWithdraw={() => alert(`Withdraw from ${pool}`)}
              onView={() => router.push(`/prediction-markets/${pool}`)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
