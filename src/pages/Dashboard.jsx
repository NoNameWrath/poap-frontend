import Navbar from '../components/Navbar';
import WalletCard from '../components/WalletCard';
import NFTGrid from '../components/NFTGrid';
import Stat from '../components/Stat';

import { fetchUserNFTs } from '../services/api';
import { getUserWallet, createWallet } from '../services/wallet';
import { useAppStore } from '../store/useAppStore';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Keypair } from '@solana/web3.js';
// If you plan to show/export the secret, you can import bs58 and encode it:
// import bs58 from 'bs58';

export default function Dashboard() {
  const { wallet, setWallet, nfts, setNFTs } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Load wallet for the current session/user ---
  async function hydrateWallet() {
    setError(null);
    const pub = await getUserWallet();                  // null if none
    if (pub) setWallet({ address: pub });
    else setWallet(null);
  }

  // --- Load NFTs for current wallet ---
  async function loadNFTs() {
    if (!wallet?.address) return;
    setLoading(true);
    setError(null);
    try {
      const items = await fetchUserNFTs(wallet.address);
      setNFTs(items || []);
    } catch (err) {
      setError(err?.message || 'Failed to load NFTs');
    } finally {
      setLoading(false);
    }
  }

  // Rehydrate wallet on first mount and anytime auth state changes (login/logout/refresh)
  useEffect(() => {
    hydrateWallet();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      hydrateWallet();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Whenever wallet address changes, refresh NFTs
  useEffect(() => {
    loadNFTs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet?.address]);

  // Create wallet (guarded, handles "already exists" path)
  async function handleCreateWallet() {
    if (wallet?.address) return; // already have one, nothing to do
    setLoading(true);
    setError(null);
    try {
      const kp = Keypair.generate();
      const addr = kp.publicKey.toBase58();

      // If you want to show/export the secret, do it here (DON'T send/stash plaintext):
      // const secretBase58 = bs58.encode(kp.secretKey);

      const res = await createWallet(addr, Array.from(kp.secretKey));

      // Function returns either { ok:true, public_key } or { alreadyExists:true, public_key }
      const nextAddr = res?.public_key ?? addr;
      setWallet({ address: nextAddr });

      // Now load NFTs for this address
      await loadNFTs();
    } catch (err) {
      setError(err?.message || 'Create wallet failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container-px mx-auto pt-10 pb-16">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <WalletCard address={wallet?.address} />
          <Stat label="Total NFTs" value={(nfts && nfts.length) || 0} />
          <div className="card p-4">
            <div className="text-sm text-zinc-400">Actions</div>
            <div className="mt-2 flex gap-2">
              {!wallet?.address && (
                <button
                  onClick={handleCreateWallet}
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create wallet'}
                </button>
              )}
              <button onClick={loadNFTs} className="btn btn-ghost" disabled={loading || !wallet?.address}>
                {loading ? 'Refreshing...' : 'Refresh NFTs'}
              </button>
            </div>
            {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
          </div>
        </div>

        <section className="mt-8">
          <h3 className="mb-3 text-xl font-semibold">Your collection</h3>
          <NFTGrid items={nfts} />
        </section>
      </main>
    </div>
  );
}
