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

        // Fetch IOUs and storage balance for each pool
        pools.forEach(async (poolId) => {
          try {
            const iousResult = await wallet.viewMethod({
              contractId: `${poolId}.${CONTRACT_ID}`,
              method: 'list_ious',
            });
            setIous((prevIous) => ({ ...prevIous, [poolId]: iousResult }));

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
    router.push('/prediction-market/create');
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
      args: { amount: utils.format.parseNearAmount(amount) },
      gas: '300000000000000',
      deposit: '0',
    });
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
              stats={{ marketCap: 'Mock Market Cap', tokensIssued: 'Mock Tokens Issued' }}
              onDeposit={() => handleDeposit(pool)}
              onWithdraw={() => handleWithdraw(pool)}
              onView={() => router.push(`/prediction-market/${pool}`)}  // Set onView for clickable title
              onRegisterStorage={() => handleRegisterStorage(pool)}
              isStorageRegistered={storageRegistered[pool]}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
