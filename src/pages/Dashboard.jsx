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
    try {
      const items = await fetchUserNFTs(wallet.address);
      setNFTs(items);
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
    const w = await ensureWallet();
    if (w) loadNFTs();
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
              <button onClick={handleCreateWallet} className="btn btn-primary">Create wallet</button>
              <button onClick={loadNFTs} className="btn btn-ghost">Refresh NFTs</button>
            </div>
            {loading && <div className="mt-2 text-xs text-zinc-500">Loading...</div>}
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
