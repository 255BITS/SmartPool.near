'use client';

import { useState, useEffect, useContext } from 'react';
import styles from './app.module.css';
import { NearContext } from '@/wallets/near';

export default function Home() {
  const { signedAccountId, wallet } = useContext(NearContext);
  const [aiLps, setAiLps] = useState([]);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!wallet) return;

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
          <li key={index}>{aiLp}</li>
        ))}
      </ul>
    </main>
  );
}
