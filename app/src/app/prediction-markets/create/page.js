'use client';

import { useState, useContext } from 'react';
import { NearContext } from '@/wallets/near';
import { useRouter } from 'next/navigation';
import styles from './CreatePage.module.css';

const CONTRACT_ID = 'smartpool.testnet';

export default function CreateSmartPool() {
  const { wallet, signedAccountId } = useContext(NearContext);
  const router = useRouter();
  const [name, setName] = useState('');

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

      alert('SmartPool created successfully!');
      router.push('/prediction-markets');
    } catch (error) {
      console.error('Error creating SmartPool:', error);
      alert('Failed to create SmartPool.');
    }
  };

  return (
    <div className={styles.createPage}>
      <h1>Create a New Prediction Market SmartPool</h1>
      <input
        type="text"
        placeholder="Enter SmartPool name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button onClick={handleCreate}>Create SmartPool</button>
    </div>
  );
}
