// src/pages/Dashboard.jsx
import Navbar from '../components/Navbar';
import WalletCard from '../components/WalletCard';
import NFTGrid from '../components/NFTGrid';
import Stat from '../components/Stat';

import { createWallet } from '../services/wallet';
import { fetchUserNFTs } from '../services/api';
import { useAppStore } from '../store/useAppStore';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const { wallet, setWallet, nfts, setNFTs } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Secret modal state (view any time)
  const [secretVisible, setSecretVisible] = useState(false);
  const [secretValue, setSecretValue] = useState('');

  // --- keep your original helpers intact ---
  const ensureWallet = async () => {
    if (!wallet) {
      const w = await createWallet();  // your existing create flow
      setWallet(w);
      return w;
    }
    return wallet;
  };

  const loadNFTs = async (addr) => {
    const address = addr || wallet?.address;
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const items = await fetchUserNFTs(address);
      setNFTs(items || []);
    } catch (err) {
      setError(err?.message || 'Failed to load NFTs');
    } finally {
      setLoading(false);
    }
  };

  // --- rehydrate wallet on mount and on auth changes ---
  useEffect(() => {
    const rehydrate = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setWallet(null);
        return;
      }
      const { data, error } = await supabase
        .from('wallets')
        .select('public_key')
        .eq('user_email', user.email)
        .maybeSingle();

      if (!error && data?.public_key) {
        setWallet({ address: data.public_key });
      } else if (!error) {
        setWallet(null);
      }
      // ignore errors silently to avoid UX noise
    };

    rehydrate();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      rehydrate();
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- load NFTs whenever wallet address changes (keeps your flow) ---
  useEffect(() => {
    if (wallet?.address) loadNFTs(wallet.address);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet?.address]);

  // --- create wallet (uses your ensureWallet) ---
  const handleCreateWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      const w = await ensureWallet();
      if (w?.address) await loadNFTs(w.address);
    } catch (err) {
      setError(err?.message || 'Create wallet failed');
    } finally {
      setLoading(false);
    }
  };

  // --- view secret any time (reads from DB; assumes select policy is set) ---
  const handleViewSecret = async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { data, error } = await supabase
        .from('wallets')
        .select('secret_key')
        .eq('user_email', user.email)
        .maybeSingle();

      if (error) throw error;

      // secret_key could be jsonb (array) or text; display as string
      const secret =
        Array.isArray(data?.secret_key)
          ? JSON.stringify(data.secret_key)
          : (data?.secret_key ?? '');

      setSecretValue(String(secret || ''));
      setSecretVisible(true);
    } catch (e) {
      setError(e?.message || 'Failed to load secret');
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container-px mx-auto pt-10 pb-16">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* If WalletCard supports it, this shows a button inside the card */}
          <WalletCard address={wallet?.address} onViewSecret={handleViewSecret} />

          <Stat label="Total NFTs" value={(nfts && nfts.length) || 0} />

          <div className="card p-4">
            <div className="text-sm text-zinc-400">Actions</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {!wallet?.address && (
                <button
                  onClick={handleCreateWallet}
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create wallet'}
                </button>
              )}

              <button
                onClick={() => loadNFTs()}
                className="btn btn-ghost"
                disabled={loading || !wallet?.address}
              >
                {loading ? 'Refreshing...' : 'Refresh NFTs'}
              </button>

              {/* Also expose View Secret in Actions, so it works even if WalletCard ignores onViewSecret */}
              <button
                onClick={handleViewSecret}
                className="btn btn-outline"
                disabled={!wallet?.address}
                title="View your secret key"
              >
                View Secret
              </button>
            </div>

            {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
          </div>
        </div>

        <section className="mt-8">
          <h3 className="mb-3 text-xl font-semibold">Your collection</h3>
          <NFTGrid items={nfts} />
        </section>

        {/* Simple modal to show secret any time */}
        {secretVisible && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold mb-2">Your Secret Key</h3>
              <p className="text-sm text-zinc-600 mb-3">
                Do not share this with anyone.
              </p>
              <div className="bg-zinc-100 p-3 rounded font-mono text-sm break-all select-all">
                {secretValue || '(empty)'}
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <button
                  className="btn btn-ghost"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(secretValue || '')
                      .then(() => alert('Copied'))
                  }
                >
                  Copy
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setSecretVisible(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
