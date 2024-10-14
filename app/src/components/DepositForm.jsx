// src/components/DepositForm.jsx

import React, { useState } from 'react';

export const DepositForm = () => {
  const [amountUsdc, setAmountUsdc] = useState('');
  const [receiptuuid, setReceiptuuid] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch('/api/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '1', // Replace with actual user ID from context or props
        amountUsdc: parseFloat(amountUsdc),
        receiptuuid,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      alert(`Deposit successful: ${data.amountDeposited} USDC deposited. Fees: ${data.fees} USDC`);
    } else {
      alert(`Deposit failed: ${data.error}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="number"
        placeholder="Amount in USDC"
        value={amountUsdc}
        onChange={(e) => setAmountUsdc(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Receipt UUID"
        value={receiptuuid}
        onChange={(e) => setReceiptuuid(e.target.value)}
        required
      />
      <button type="submit">Deposit</button>
    </form>
  );
};

