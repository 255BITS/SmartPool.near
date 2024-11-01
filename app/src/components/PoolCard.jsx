import React, { useState } from 'react';
import styles from './Card.module.css';

const PoolCard = ({ pool, stats, onDeposit, onWithdraw, onRegisterStorage, isStorageRegistered, onView }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Handle mouse events for showing/hiding tooltip
  const handleMouseEnter = () => setShowTooltip(true);
  const handleMouseLeave = () => setShowTooltip(false);

  return (
    <div className={styles.card}>
      <h2 onClick={onView} style={{ cursor: 'pointer', color: '#0070f3' }}>{pool}</h2>
      <p>Estimated Pool Size: {stats.marketCap}</p>
      <p>Tokens Owned: {stats.tokensOwned} {pool} SP Tokens</p>
      <p>Tokens Issued:

        <>
        <span className={styles.tokensIssued}>{stats.tokensIssued} {pool} SP Tokens</span>
        </>
    </p>
    {stats.ious.length > 0 && (
      <div class={styles.iousInfo}>
        {stats.ious.length} pending settlement(s)
      </div>
    )}

      <div className={styles.buttonRow}>
        {isStorageRegistered ? (
          <button onClick={onDeposit}>Deposit</button>
        ) : (
          <button onClick={onRegisterStorage}>Register to Deposit</button>
        )}
        <button onClick={onWithdraw}>Withdraw</button>
      </div>
    </div>
  );
};

export default PoolCard;
