import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-black/70 backdrop-blur">
      <div className="container-px mx-auto flex h-16 items-center justify-between">
        <Link to="/" className="text-lg font-semibold tracking-tight">POAP</Link>
        <nav className="flex items-center gap-2">
          {user && (
            <>
              <Link to="/app" className={`btn btn-ghost ${pathname==='/app'?'ring-1 ring-primary-600':''}`}>Dashboard</Link>
              <Link to="/scan" className={`btn btn-ghost ${pathname==='/scan'?'ring-1 ring-primary-600':''}`}>Scan</Link>
              <button onClick={signOut} className="btn btn-primary">Sign out</button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
