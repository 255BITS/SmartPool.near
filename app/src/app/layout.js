'use client';

import { useEffect, useState } from 'react';

import '@/app/globals.css';
import { Navigation } from '@/components/navigation';
import { NetworkId } from '@/config';
import Link from 'next/link';

import { NearContext, Wallet } from '@/wallets/near';

const wallet = new Wallet({ networkId: NetworkId });

// Layout Component
export default function RootLayout({ children }) {
  const [signedAccountId, setSignedAccountId] = useState('');

  useEffect(() => {
    wallet.startUp(setSignedAccountId);
  }, []);

  // Function for sign-in or sign-out
  const handleAuthAction = signedAccountId ? wallet.signOut : wallet.signIn;
  const authLabel = signedAccountId ? `Logout ${signedAccountId}` : 'Login';

  return (
    <html lang="en">
      <body>
        <NearContext.Provider value={{ wallet, signedAccountId }}>
          <header className="header">
            <div className="brand">
              <Link href="/">
                SmartPool.near
              </Link>
            </div>
            <button className="btn" onClick={handleAuthAction}>
              {authLabel}
            </button>
          </header>
          <div className="layout">
            <Navigation />
            <main className="main-content">{children}</main>
          </div>
        </NearContext.Provider>

        <style jsx>{`
          /* Layout Styling */
          .layout {
            display: flex;
            min-height: calc(100vh - 60px); /* Adjust height to account for header */
          }

          /* Header Styling */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 1.5rem;
            background: #1b1b1b; /* Darker background for header */
            color: #00d1b2; /* Brand text color */
            height: 60px;
            box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }

          .brand {
            font-size: 1.4rem;
            font-weight: bold;
            color: #00d1b2;
          }

          .btn {
            background-color: #007f6e;
            color: #fff;
            border: none;
            padding: 0.5rem 1rem;
            cursor: pointer;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.9rem;
            transition: background-color 0.3s;
          }

          .btn:hover {
            background-color: #005f50;
          }

          /* Main Content Styling */
          .main-content {
            flex-grow: 1;
            padding: 2rem;
            background-color: #000; /* Dark theme for main content */
            color: #e0e0e0; /* Light text for readability */
          }
        `}</style>
      </body>
    </html>
  );
}
