// src/components/WithdrawForm.jsx

import React, { useState } from 'react';

export const WithdrawForm = () => {
  const [percentage, setPercentage] = useState('');
  const [receiptuuid, setReceiptuuid] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch('/api/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '1', // Replace with actual user ID
        percentage: parseFloat(percentage),
        receiptuuid,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      alert(`Withdraw successful: ${data.amountWithdrawn} USDC withdrawn. Fees: ${data.fees} USDC`);
    } else {
      alert(`Withdraw failed: ${data.error}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="number"
        placeholder="Percentage to withdraw"
        value={percentage}
        onChange={(e) => setPercentage(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Receipt UUID"
        value={receiptuuid}
        onChange={(e) => setReceiptuuid(e.target.value)}
        required
      />
      <button type="submit">Withdraw</button>
    </form>
  );
};

