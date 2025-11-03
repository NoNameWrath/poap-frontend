import Navbar from '../components/Navbar';
import WalletCard from '../components/WalletCard';
import NFTGrid from '../components/NFTGrid';
import Stat from '../components/Stat';
import { createWallet } from '../services/wallet';
import { fetchUserNFTs } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const { wallet, setWallet, nfts, setNFTs } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const ensureWallet = async () => {
    if (!wallet) {
      const w = await createWallet();
      setWallet(w);
      return w;
    }
    return wallet;
  };

  const loadNFTs = async () => {
    if (!wallet) return;
    setLoading(true);
    setError(null);
    try {
      const items = await fetchUserNFTs(wallet.address);
      setNFTs(items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // on mount, if wallet exists, load NFTs
    if (wallet) loadNFTs();
  // eslint-disable-next-linereact-hooks/exhaustive-deps
  }, [wallet?.address]);

  const handleCreateWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      const w = await ensureWallet();
      if (w) loadNFTs();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container-px mx-auto pt-10 pb-16">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <WalletCard address={wallet?.address} />
          <Stat label="Total NFTs" value={nfts.length} />
          <div className="card p-4">
            <div className="text-sm text-zinc-400">Actions</div>
            <div className="mt-2 flex gap-2">
              <button onClick={handleCreateWallet} className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create wallet'}
              </button>
              <button onClick={loadNFTs} className="btn btn-ghost" disabled={loading}>
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
