import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Navigation = () => {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <nav className="nav-links">
        <div className="section">
          Testnet
          <Link href="/prediction-markets" className={`nav-link ${pathname.includes('/prediction-markets') ? 'active' : ''}`}>
            Prediction Markets
          </Link>
        </div>
      </nav>

      <style jsx>{`
        /* Sidebar Styling */
        .sidebar {
          width: 250px;
          background: #1f1f1f; /* Slightly darker for sidebar */
          color: #00d1b2;
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
          box-shadow: 4px 0px 8px rgba(0, 0, 0, 0.2);
          min-height: calc(100vh - 60px); /* Full height minus header */
        }

        .nav-links {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
        }

        .section {
          margin-bottom: 2rem; /* Increased spacing between sections */
        }

        .nav-link {
          display: block;
          margin-bottom: 1rem;
          color: #c0c0c0; /* Light grey for inactive links */
          text-decoration: none;
          font-size: 1.1rem;
          transition: color 0.3s;
        }

        .nav-link:hover {
          color: #00d1b2; /* Highlight color on hover */
        }

        .nav-link.active {
          color: #00d1b2;
          font-weight: bold;
        }
      `}</style>
    </aside>
  );
};
