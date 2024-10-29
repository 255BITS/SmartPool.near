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
  const [poolEstimatedValue, setPoolEstimatedValue] = useState('Loading...');
  const [poolName, setPoolName] = useState('Loading...');
  const [poolHoldings, setPoolHoldings] = useState({});
  const [participants, setParticipants] = useState('Loading...');
  const [pendingSettlements, setPendingSettlements] = useState([]);
  const [actions, setActions] = useState([]);

  useEffect(() => {
    // Fetch pool data from the backend API based on `poolId`
    const fetchPool = async () => {
      try {
        const response = await fetch(`/api/pool?name=${poolId}`);
        if (!response.ok) throw new Error('Failed to fetch pool data');
        const pool = await response.json();
        setPoolName(pool.name);
        setPoolHoldings(pool.holdings);
        setPoolEstimatedValue(pool.estimatedValue);
      } catch (error) {
        console.error('Error fetching pool details:', error);
      }
    };

    fetchPool();
  }, [poolId]);

  useEffect(() => {
    if (!poolId) return;

    const fetchActions = async () => {
      try {
        const response = await fetch(`/api/actions?poolName=${poolId}`);
        if (!response.ok) throw new Error('Failed to fetch actions');
        const fetchedActions = await response.json();
        setActions(fetchedActions || []); // Use fetched actions or an empty array
      } catch (error) {
        console.error(`Error fetching actions for pool ${poolId}:`, error);
      }
    };

    fetchActions();
  }, [poolId]);

  useEffect(() => {
    if (!wallet) return;

    const fetchPoolData = async () => {
      try {
        const iousResult = await wallet.viewMethod({
          contractId: `${poolId}.${CONTRACT_ID}`,
          method: 'list_ious',
        });
        setPendingSettlements(iousResult || []);

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
      <h1>SmartPool Details: {poolName}</h1>
      
      {/* Main Content Layout */}
      <div className={styles.mainContent}>
        
        {/* Pool Info Section */}
        <div className={styles.infoSection}>
          <h2>Estimated Value</h2>
          <p><strong>
            {poolEstimatedValue && poolEstimatedValue.totalNEAR && (
              <>
              {utils.format.formatNearAmount(poolEstimatedValue.totalNEAR, 2)} NEAR(${poolEstimatedValue.totalUSD})
              </>
            )}
          </strong></p>
          <h2>Holdings</h2>
          <p><strong>Positions:</strong></p>
          <ul>
            {Object.entries(poolHoldings).map(([key, value]) => {
              if(key !== "USDC" && key !== "NEAR") {
                return <li key={key}>{value.name}: {value.amount} @ ${value.cost_basis}</li>
              }
              return <></>;
            })}
          </ul>
          <p><strong>USDC:</strong> {(poolHoldings.USDC || {"amount": "Loading..."}).amount}</p>
          <p><strong>NEAR:</strong> {(poolHoldings.NEAR && utils.format.formatNearAmount(poolHoldings.NEAR.amount, 2)) || "Loading..."}</p>

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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pendingSettlements.length > 0 ? (
                  pendingSettlements.map((settlement) => (
                    <tr key={settlement.id}>
                      <td>{settlement.iou_id}</td>
                      <td>{settlement.iou_type}</td>
                      <td>{settlement.account_id}</td>
                      <td>{(settlement.iou_type === "Withdraw" ? settlement.amount : utils.format.formatNearAmount(settlement.amount, 2))} NEAR</td>
                      <td><button>Fulfill</button></td>
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
