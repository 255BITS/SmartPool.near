'use client';

import { useState, useEffect, useContext } from 'react';
import styles from './app.module.css';
import { NearContext } from '@/wallets/near';
import { utils } from 'near-api-js';

export default function Home() {
  const { signedAccountId, wallet } = useContext(NearContext);
  const [aiLps, setAiLps] = useState([]);
  const [name, setName] = useState('');
  const [ious, setIous] = useState([]);

  useEffect(() => {
    if (!wallet) return;

    // Fetch AI LPs
    wallet
      .viewMethod({
        contractId: 'itchy-harmony.testnet',
        method: 'list_lps',
      })
      .then((result) => {
        setAiLps(result);
      })
      .catch((error) => {
        console.error('Error fetching AI LPs:', error);
      });

    // Fetch IOUs
    wallet
      .viewMethod({
        contractId: 'itchy-harmony.testnet',
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
      alert('Please sign in to create an AI LP.');
      return;
    }

    try {
      await wallet.callMethod({
        contractId: 'itchy-harmony.testnet',
        method: 'add_lp',
        args: {
          lp_id: name,
          lp_token_contract_id: 'itchy-harmony.testnet',
        },
        gas: '300000000000000', // 300 TeraGas
        deposit: '0', // No deposit for now
      });

      // Fetch the updated list of AI LPs
      const result = await wallet.viewMethod({
        contractId: 'itchy-harmony.testnet',
        method: 'list_lps',
      });
      setAiLps(result);
      setName('');
    } catch (error) {
      console.error('Error creating AI LP:', error);
      alert('Failed to create AI LP.');
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
        contractId: 'itchy-harmony.testnet',
        method: 'deposit',
        args: { lp_id: lpId },
        gas: '300000000000000', // 300 TeraGas
        deposit: depositAmount,
      });

      alert(`Successfully deposited ${amount} NEAR to ${lpId}.`);

      // Optionally, refresh IOUs or other data if necessary
      // For example, refetch the IOUs
      const iousResult = await wallet.viewMethod({
        contractId: 'itchy-harmony.testnet',
        method: 'list_ious',
      });
      setIous(iousResult);

    } catch (error) {
      console.error('Error during deposit:', error);
      alert('Failed to deposit NEAR.');
    }
  };

  return (
    <main className={styles.main}>
      <h1>AI LPs</h1>
      {signedAccountId ? (
        <div className={styles.createSection}>
          <input
            type="text"
            placeholder="Enter AI-LP name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button onClick={handleCreate}>Create AI-LP</button>
        </div>
      ) : (
        <p>Please sign in to create an AI LP.</p>
      )}
      <ul className={styles.list}>
        {aiLps.map((aiLp, index) => (
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
  );
}
