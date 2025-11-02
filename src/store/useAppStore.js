import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  wallet: null, // { address: string }
  nfts: [], // array of { id, name, image, description }
  qrSecret: 'event-001',
  qrIntervalSec: 8,

  setWallet: (wallet) => set({ wallet }),
  setNFTs: (nfts) => set({ nfts }),
  rotateSecret: () => {
    const s = get().qrSecret;
    const t = Date.now();
    set({ qrSecret: `${s}:${Math.floor(t / (get().qrIntervalSec * 1000))}` });
  }
}));
