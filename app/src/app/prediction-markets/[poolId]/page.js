'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useContext } from 'react';
import { NearContext } from '@/wallets/near';
import styles from '@/app/app.module.css';
import Decimal from 'decimal.js';
import { utils } from 'near-api-js';
import { formatDistanceToNow } from 'date-fns';

const CONTRACT_ID = 'smartpool.testnet';

export default function PoolDetails() {
  const { poolId } = useParams();
  const { wallet } = useContext(NearContext);
  const [poolEstimatedValue, setPoolEstimatedValue] = useState('Loading...');
  const [poolName, setPoolName] = useState('Loading...');
  const [poolHoldings, setPoolHoldings] = useState({});
  const [poolMarkets, setPoolMarkets] = useState(null);
  const [participants, setParticipants] = useState('Loading...');
  const [pendingSettlements, setPendingSettlements] = useState([]);
  const [actions, setActions] = useState([]);
  const [resolvingIds, setResolvingIds] = useState([]); // Track resolving settlements

  useEffect(() => {
    const fetchPool = async () => {
      try {
        const response = await fetch(`/api/pool?name=${poolId}`);
        if (!response.ok) throw new Error('Failed to fetch pool data');
        const pool = await response.json();
        setPoolName(pool.name);
        setPoolHoldings(pool.holdings);
        setPoolEstimatedValue(pool.estimatedValue);
        setPoolMarkets(pool.markets);
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
        setActions(fetchedActions || []);
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

  async function queueJob(jobType, payload) {
    try {
      const response = await fetch('/api/queueJob', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobType, payload, poolName: poolId }),
      });
      const data = await response.json();
      if (response.ok) {
        console.log(data.status);
      } else {
        console.error(data.error);
      }
    } catch (error) {
      console.error('Error queuing job:', error);
    }
  }

  const handleRunAI = async () => {
    alert('AI has been triggered!');
    await queueJob("runAI", {});
  };

  // Simplified fulfill function with resolving state
  const fulfill = async (settlement) => {
    setResolvingIds((prev) => [...prev, settlement.iou_id]); // Mark as resolving

    const jobType = settlement.iou_type === "Deposit" ? 'fulfillDeposit' : 'fulfillWithdraw';
    await queueJob(jobType, { iou: settlement });
  };

  return (
    <div className={styles.poolDetails}>
      <h1>SmartPool {poolName} Details</h1>
      
      <div className={styles.mainContent}>
        
        <div className={styles.infoSection}>
          <h2>Markets</h2>
            {poolMarkets && poolMarkets[0]}
          <h2>Estimated Value</h2>
          <p><strong>
            {poolEstimatedValue && poolEstimatedValue.totalNEAR && (
              <>
              {utils.format.formatNearAmount(poolEstimatedValue.totalNEAR, 2)} NEAR (${poolEstimatedValue.totalUSD})
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
              return null;
            })}
          </ul>
          <p><strong>USDC:</strong> ${poolHoldings.USDC && Decimal(poolHoldings.USDC.amount).toFixed(2)}</p>
          <p><strong>NEAR:</strong> {(poolHoldings.NEAR && utils.format.formatNearAmount(poolHoldings.NEAR.amount, 2)) || "Loading..."}</p>

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

                      <td>
                        {(settlement.iou_type === "Withdraw"
                          ? `${Decimal(settlement.amount).dividedBy(Decimal(1e24)).toFixed(3)} Tokens`
                          : `${utils.format.formatNearAmount(settlement.amount, 2)} NEAR`
                        )}
                      </td>
                      <td>
                        {resolvingIds.includes(settlement.iou_id) ? (
                          <span>Queued...</span>
                        ) : (
                          <button onClick={() => fulfill(settlement)}>Fulfill</button>
                        )}
                      </td>
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

        <div className={styles.aiSection}>
          <button onClick={() => handleRunAI()} className={styles.runAiButton}>Run AI</button>
          <h2>Actions</h2>
          <ul className={styles.actions}>
            {actions.map((log, index) => (
              <li key={index}>
                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}: {log.action} by {log.by}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
