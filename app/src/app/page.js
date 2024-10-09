// app/page.js
'use client';

import { useState } from 'react';
import styles from './app.module.css';

export default function Home() {
  const [aiLps, setAiLps] = useState([]);
  const [name, setName] = useState('');

  const handleCreate = () => {
    // Placeholder for backend integration
    const newAiLp = { id: Date.now(), name };
    setAiLps([...aiLps, newAiLp]);
    setName('');
  };

  return (
    <main className={styles.main}>
      <h1>AI LPs</h1>
      <div className={styles.createSection}>
        <input
          type="text"
          placeholder="Enter AI-LP name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={handleCreate}>Create AI-LP</button>
      </div>
      <ul className={styles.list}>
        {aiLps.map((aiLp) => (
          <li key={aiLp.id}>{aiLp.name}</li>
        ))}
      </ul>
    </main>
  );
}
