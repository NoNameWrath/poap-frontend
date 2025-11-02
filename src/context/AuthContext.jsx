import { createContext, useContext, useEffect, useState } from 'react';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  

  // hydrate from server cookie first, then fall back to localStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('http://localhost:4000/api/me', { credentials: 'include' });
        if (r.ok) {
          const { user } = await r.json();
          if (!cancelled) {
            setUser(user);
            localStorage.setItem('poap_user', JSON.stringify(user));
            setLoading(false);
            return;
          }
        }
      } catch {}
      // fallback to localStorage if no valid cookie yet
      const raw = localStorage.getItem('poap_user');
      if (!cancelled && raw) setUser(JSON.parse(raw));
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const refreshSession = async () => {
    const r = await fetch('http://localhost:4000/api/me', { credentials: 'include' });
    if (r.ok) {
      const { user } = await r.json();
      setUser(user);
      localStorage.setItem('poap_user', JSON.stringify(user));
      return user;
    }
    return null;
  };

  const signOut = async () => {
    await fetch('http://localhost:4000/api/auth/logout', { method: 'POST', credentials: 'include' });
    localStorage.removeItem('poap_user');
    setUser(null);
  };
// add inside AuthProvider, above return:
const signInWithGoogle = async () => {
  if (!window.google?.accounts?.oauth2) {
    alert('Google SDK not loaded. Check the script tag in public/index.html.');
    return;
  }
  const codeClient = window.google.accounts.oauth2.initCodeClient({
    client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
    scope: 'openid email profile',
    ux_mode: 'redirect', // we’re using redirect mode
    redirect_uri: process.env.REACT_APP_GOOGLE_REDIRECT_URI,
    // no callback needed for redirect mode; /auth/callback handles exchange
  });
  codeClient.requestCode(); // triggers Google redirect
};

  return (
    <AuthCtx.Provider value={{ user, loading, refreshSession, signOut, signInWithGoogle }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() { return useContext(AuthCtx); }
