import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useContext } from 'react';
import { NearContext } from '@/wallets/near';
import { usePathname } from 'next/navigation';

export const Navigation = () => {
  const { signedAccountId, wallet } = useContext(NearContext);
  const [action, setAction] = useState(() => {});
  const [label, setLabel] = useState('Loading...');

  const pathname = usePathname();

  useEffect(() => {
    if (!wallet) return;

    if (signedAccountId) {
      setAction(() => wallet.signOut);
      setLabel(`Logout ${signedAccountId}`);
    } else {
      setAction(() => wallet.signIn);
      setLabel('Login');
    }
  }, [signedAccountId, wallet]);

  return (
    <header>
      <nav className="navbar">
        <div className="navbar-left">
          <Link href="/" className="brand">
            SmartPools.near
          </Link>
          <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
            Home
          </Link>
          <Link href="/prediction-markets" className={`nav-link ${pathname === '/prediction-markets' ? 'active' : ''}`}>
            Prediction Markets
          </Link>
        </div>
        <div className="navbar-right">
          <button className="btn" onClick={action}>
            {label}
          </button>
        </div>
      </nav>

      <style jsx>{`
        /* Navbar Container */
        .navbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 2rem;
          background: rgba(15, 32, 39, 0.85); /* Slightly more transparent */
          color: #fff;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2); /* Light shadow */
        }

        /* Left Side (Brand and Links) */
        .navbar-left {
          display: flex;
          align-items: center;
        }

        .brand {
          font-size: 1.4rem;
          font-weight: bold;
          margin-right: 2.5rem; /* Increased margin for better spacing */
          color: #00d1b2;
          text-decoration: none;
          letter-spacing: 0.5px;
        }

        .nav-link {
          margin-right: 2rem; /* Increased spacing */
          color: #fff;
          text-decoration: none;
          position: relative;
          transition: color 0.3s, transform 0.2s;
          font-size: 1rem;
        }

        .nav-link::after {
          content: '';
          width: 0%;
          height: 2px;
          background: #00d1b2;
          position: absolute;
          left: 0;
          bottom: -5px;
          transition: width 0.3s;
        }

        .nav-link:hover {
          color: #00d1b2;
          transform: scale(1.05); /* Subtle zoom effect on hover */
        }

        .nav-link:hover::after {
          width: 100%;
        }

        .nav-link.active {
          color: #00d1b2;
          font-weight: bold;
        }

        /* Right Side (Button) */
        .navbar-right .btn {
          background-color: #00a896; /* Slightly muted teal */
          color: #fff;
          border: none;
          padding: 0.5rem 1rem; /* Reduced padding */
          cursor: pointer;
          border-radius: 20px; /* Reduced border-radius for a cleaner look */
          font-weight: bold;
          font-size: 0.9rem;
          transition: background-color 0.3s;
        }

        .navbar-right .btn:hover {
          background-color: #007f6e; /* Darker teal on hover */
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .navbar {
            flex-direction: column;
          }

          .navbar-left,
          .navbar-right {
            width: 100%;
            justify-content: center;
            margin: 0.5rem 0;
          }

          .navbar-left {
            flex-direction: column;
          }

          .nav-link {
            margin: 0.5rem 0;
          }
        }
      `}</style>
    </header>
  );
};
