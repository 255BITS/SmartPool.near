'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useContext } from 'react';
import { NearContext } from '@/wallets/near';
import styles from '@/app/app.module.css';
import { utils } from 'near-api-js';

const CONTRACT_ID = 'smartpool.testnet';

export default function PoolDetails() {
  const { poolId } = useParams();
  const { wallet } = useContext(NearContext);
  const [poolName, setPoolName] = useState('Loading...');
  const [poolSize, setPoolSize] = useState('Loading...');
  const [participants, setParticipants] = useState('Loading...');
  const [pendingSettlements, setPendingSettlements] = useState([]);
  const [actions, setActions] = useState([]);

  useEffect(() => {
    if (!wallet) return;

    const fetchPoolData = async () => {
      try {
        const iousResult = await wallet.viewMethod({
          contractId: `${poolId}.${CONTRACT_ID}`,
          method: 'list_ious',
        });
        setPendingSettlements(iousResult || []);

        setActions([
          { action: 'fulfill_withdraw', by: 'Platform', time: '11:38am' },
          { action: 'swap', by: 'Platform', time: '11:36am' },
          { action: 'rebalance', by: 'Platform', time: '11:35am' },
          { action: 'buy', by: 'NEAR AI', time: '11:32am' },
          { action: 'sell', by: 'NEAR AI', time: '11:30am' },
          { action: 'swap', by: 'Platform', time: '11:25am' },
        ]);
      } catch (error) {
        console.error(`Error fetching details for pool ${poolId}:`, error);
      }
    };

    fetchPoolData();
  }, [wallet, poolId]);

  const handleRunAI = () => {
    const newLog = { action: 'AI run', time: new Date().toLocaleTimeString() };
    setActions((prevLogs) => [newLog, ...prevLogs]);
    alert('AI has been triggered!');
  };

  return (
    <div className={styles.poolDetails}>
      <h1>SmartPool Details: {poolId}</h1>
      
      {/* Main Content Layout */}
      <div className={styles.mainContent}>
        
        {/* Pool Info Section */}
        <div className={styles.infoSection}>
          <h2>Estimated Total</h2>
          <p><strong>2.3 NEAR</strong></p>
          <h2>Holdings</h2>
          <p><strong>Positions:</strong> <ul><li>YES to Broncos 110 @ 0.1</li><li>NO to Cowboys 400 @ 0.9</li></ul></p>
          <p><strong>USDC:</strong> {participants}</p>
          <p><strong>NEAR:</strong> {participants}</p>

          {/* Pending Settlements Table */}
          <h2>Pending Settlements</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.settlementTable}>
              <thead>
                <tr>
                  <th>Id</th>
                  <th>Type</th>
                  <th>Account</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {pendingSettlements.length > 0 ? (
                  pendingSettlements.map((settlement) => (
                    <tr key={settlement.id}>
                      <td>{settlement.iou_id}</td>
                      <td>{settlement.iou_type}</td>
                      <td>{settlement.account_id}</td>
                      <td>{(settlement.iou_type === "Withdraw" ? settlement.amount : utils.format.formatNearAmount(settlement.amount))} NEAR</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4">No pending settlements</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Section - Positioned on the Right */}
        <div className={styles.aiSection}>
          <button onClick={handleRunAI} className={styles.runAiButton}>Run AI</button>
          <h2>Oracle Actions</h2>
          <ul className={styles.actions}>
            {actions.map((log, index) => (
              <li key={index}>{log.action} at {log.time} by {log.by}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
