import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthCallback() {
  const nav = useNavigate();
  const { refreshSession } = useAuth();
  const [msg, setMsg] = useState('Completing sign in...');

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const error = params.get('error');

        if (error || !code) {
          setMsg('Sign in was cancelled or invalid. Redirecting…');
          setTimeout(() => nav('/login', { replace: true }), 1200);
          return;
        }

        // Exchange code -> server sets cookie
        const r = await fetch('http://localhost:4000/api/auth/google/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ code }),
        });
        if (!r.ok) {
          console.error('Exchange error:', await r.text());
          setMsg('Exchange failed. Redirecting…');
          setTimeout(() => nav('/login', { replace: true }), 1500);
          return;
        }

        // Hydrate context from cookie
        await refreshSession();

        // Clean URL and go to app
        nav('/app', { replace: true });
      } catch (e) {
        console.error(e);
        setMsg('Unexpected error. Redirecting…');
        setTimeout(() => nav('/login', { replace: true }), 1500);
      }
    })();
  }, [nav, refreshSession]);

  return <p className="text-center mt-10">{msg}</p>;
}
