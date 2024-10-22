'use client';

import { useState, useEffect, useContext } from 'react';
import styles from '../app.module.css';
import { NearContext } from '@/wallets/near';
import { utils } from 'near-api-js';

const CONTRACT_ID='itchy-harmony.testnet'

export default function PredictionMarkets() {
  const { signedAccountId, wallet } = useContext(NearContext);
  const [smartPools, setSmartPools] = useState([]);
  const [name, setName] = useState('');
  const [ious, setIous] = useState([]);

  useEffect(() => {
    if (!wallet) return;

    wallet
      .viewMethod({
        contractId: CONTRACT_ID,
        method: 'list_lps',
      })
      .then((result) => {
        setSmartPools(result);
      })
      .catch((error) => {
        console.error('Error fetching SmartPools:', error);
      });

    // Fetch IOUs
    wallet
      .viewMethod({
        contractId: CONTRACT_ID,
        method: 'list_ious',
      })
      .then((result) => {
        setIous(result);
      })
      .catch((error) => {
        console.error('Error fetching IOUs:', error);
      });
  }, [wallet]);

  const handleCreate = async () => {
    if (!signedAccountId) {
      alert('Please sign in to create an SmartPool.');
      return;
    }

    try {
      await wallet.callMethod({
        contractId: CONTRACT_ID,
        method: 'add_lp',
        args: {
          lp_id: name,
          lp_token_contract_id: CONTRACT_ID,
        },
        gas: '300000000000000', // 300 TeraGas
        deposit: '0', // No deposit for now
      });

      const result = await wallet.viewMethod({
        contractId: CONTRACT_ID,
        method: 'list_lps',
      });
      setSmartPools(result);
      setName('');
    } catch (error) {
      console.error('Error creating SmartPool:', error);
      alert('Failed to create SmartPool.');
    }
  };

  const handleDeposit = async (lpId) => {
    if (!signedAccountId) {
      alert('Please sign in to deposit.');
      return;
    }

    const amount = prompt('Enter the amount of NEAR to deposit:');
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const depositAmount = utils.format.parseNearAmount(amount);

    try {
      await wallet.callMethod({
        contractId: CONTRACT_ID,
        method: 'deposit',
        args: { lp_id: lpId },
        gas: '300000000000000', // 300 TeraGas
        deposit: depositAmount,
      });

      alert(`Successfully deposited ${amount} NEAR to ${lpId}.`);

      // Optionally, refresh IOUs or other data if necessary
      // For example, refetch the IOUs
      const iousResult = await wallet.viewMethod({
        contractId: CONTRACT_ID,
        method: 'list_ious',
      });
      setIous(iousResult);

    } catch (error) {
      console.error('Error during deposit:', error);
      alert('Failed to deposit NEAR.');
    }
  };

  return (
    <div>
      <h1>Prediction Markets</h1>
        <main className={styles.main}>
          <h1>SmartPools</h1>
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
            <p>Please sign in to create an SmartPool.</p>
          )}
          <ul className={styles.list}>
            {smartPools.map((aiLp, index) => (
              <li key={index}>
                {aiLp}
                {signedAccountId && (
                  <button onClick={() => handleDeposit(aiLp[0])}>Deposit</button>
                )}
              </li>
            ))}
          </ul>

          <h2>Unresolved IOUs</h2>
          <pre>{JSON.stringify(ious, null, 2)}</pre>
        </main>
      {/* Add your prediction markets content here */}
    </div>
  );
}
