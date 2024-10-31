'use client';

import styles from './app.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      {/* Value Proposition Section */}
      <section className={styles.landingSection}>
        <h1>AI-Powered SmartPools</h1>
        <p>Revolutionize how you manage your funds with cutting-edge AI technology.</p>
        
        <div className={styles.valueProp}>
          <div className={styles.valueItem}>
            <p>1. Create or deposit funds into an AI-powered SmartPool</p>
          </div>
          <div className={styles.valueItem}>
            <p>2. Sit back and watch as the AI works</p>
          </div>
          <div className={styles.valueItem}>
            <p>3. Withdraw anytime to realize profits!</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <h2>Ready to Get Started?</h2>
        <p>Sign in and use your AI-powered SmartPool today!</p>
        <button className={styles.ctaButton}>Get Started</button>
      </section>
    </main>
  );
}
