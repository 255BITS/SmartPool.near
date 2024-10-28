'use client';

import { useState, useEffect, useContext } from 'react';
import styles from '../app.module.css';
import { NearContext } from '@/wallets/near';
import { utils } from 'near-api-js';

const CONTRACT_ID = 'smartpool.testnet';
const STORAGE_DEPOSIT_AMOUNT = utils.format.parseNearAmount('0.00125'); // Typical amount for NEP-145 storage registration

export default function PredictionMarkets() {
  const { signedAccountId, wallet } = useContext(NearContext);
  const [smartPools, setSmartPools] = useState([]);
  const [name, setName] = useState('');
  const [ious, setIous] = useState({});
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
              if(storageBalance.totel !== null) {
                const ftBalance = await wallet.viewMethod({
                  contractId: `${poolId}.${CONTRACT_ID}`,
                  method: 'ft_balance_of',
                  args: { account_id: signedAccountId },
                });
                setFtBalanceOf((prev) => ({
                  ...prev,
                  [poolId]: ftBalance,
                }));

              }
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

  const handleCreate = async () => {
    if (!signedAccountId) {
      alert('Please sign in to create a SmartPool.');
      return;
    }
    try {
      await wallet.callMethod({
        contractId: CONTRACT_ID,
        method: 'create_pool',
        args: {
          pool_id: name,
          name: name,
          symbol: name,
        },
        gas: '300000000000000',
        deposit: '2000000000000000000000000',
      });

      const result = await wallet.viewMethod({
        contractId: CONTRACT_ID,
        method: 'list_pools',
      });
      setSmartPools(result);
      setName('');
    } catch (error) {
      console.error('Error creating SmartPool:', error);
      alert('Failed to create SmartPool.');
    }
  };

  const handleRegisterStorage = async (poolId) => {
    try {
      await wallet.callMethod({
        contractId: `${poolId}.${CONTRACT_ID}`, // Subaccount contract
        method: 'storage_deposit',
        args: { account_id: signedAccountId },
        gas: '300000000000000', // 300 TeraGas
        deposit: STORAGE_DEPOSIT_AMOUNT,
      });
      alert('Storage registered successfully.');
    } catch (error) {
      console.error('Error registering storage:', error);
      alert('Failed to register storage.');
    }
  };

  const handleWithdraw = async (poolId) => {
    if (!signedAccountId) {
      alert('Please sign in to withdraw.');
      return;
    }

    const amount = prompt('Enter the amount of tokens:');
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    try {
      await wallet.callMethod({
        contractId: `${poolId}.${CONTRACT_ID}`,
        method: 'withdraw',
        args: { "amount": amount },
        gas: '300000000000000', // 300 TeraGas
        deposit: "0",
      });

      alert(`Successful withdraw, ${amount} ${poolId} token.`);
    } catch (error) {
      console.error('Error during withdraw:', error);
      alert('Failed to withdraw token.');
    }
  };

  const handleFulfill = async (poolId, poolIOU) => {
    if(poolIOU["iou_type"] === "Deposit") { 
      await wallet.callMethod({
        contractId: CONTRACT_ID,
        method: 'fulfill_deposit_iou',
        args: { "amount": "1000", iou_id: poolIOU["iou_id"], pool_id: poolId },
        gas: '300000000000000', // 300 TeraGas
        deposit: "0",
      });
    } else {
      await wallet.callMethod({
        contractId: CONTRACT_ID,
        method: 'fulfill_withdraw_iou',
        args: { "amount": "100000000000000000000000", iou_id: poolIOU["iou_id"], pool_id: poolId },
        gas: '300000000000000', // 300 TeraGas
        deposit: "0",
      });
    }

  };

  const handleDeposit = async (poolId) => {
    if (!signedAccountId) {
      alert('Please sign in to deposit.');
      return;
    }

    // If storage is not registered, prompt to register
    if (!storageRegistered[poolId]) {
      const confirmRegister = confirm('Storage is not registered. Would you like to register now?');
      if (!confirmRegister) return;
      await handleRegisterStorage(poolId);
      setStorageRegistered((prev) => ({ ...prev, [poolId]: true }));
    }

    const amount = prompt('Enter the amount of NEAR to deposit:');
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const depositAmount = utils.format.parseNearAmount(amount);

    try {
      await wallet.callMethod({
        contractId: `${poolId}.${CONTRACT_ID}`,
        method: 'deposit',
        args: {},
        gas: '300000000000000', // 300 TeraGas
        deposit: depositAmount,
      });

      alert(`Successfully deposited ${amount} NEAR to ${poolId}.`);
    } catch (error) {
      console.error('Error during deposit:', error);
      alert('Failed to deposit NEAR.');
    }
  };

  return (
    <div>
      <h1>Prediction Market SmartPools</h1>
      <main className={styles.main}>
        {signedAccountId ? (
          <div className={styles.createSection}>
            <input
              type="text"
              placeholder="Enter SmartPool name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button onClick={handleCreate}>Create SmartPool</button>
          </div>
        ) : (
          <p>Please sign in to create a SmartPool.</p>
        )}
        <ul className={styles.list}>
          {smartPools.map((pool, index) => (
            <li key={index}>
              <div>
                <strong>{pool}</strong>
                {signedAccountId && (
                  <button onClick={() => handleDeposit(pool)}>
                    {storageRegistered[pool] ? 'Deposit' : 'Register to Deposit'}
                  </button>
                )}

                {signedAccountId && storageRegistered[pool] && (<div> {ftBalanceOf[pool]}</div>)}

                <button onClick={() => handleWithdraw(pool)}>
                  Withdraw
                </button>
                <h4>IOUs</h4>
                {(ious[pool] || []).map((pool_iou) => (
                  <>
                  <pre>{JSON.stringify(pool_iou || [], null, 2)}</pre>

                  <button onClick={() => handleFulfill(pool, pool_iou)}>
                    Fulfill
                  </button>
                  </>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
