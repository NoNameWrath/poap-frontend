import Navbar from '../components/Navbar';
import QRRotator from '../components/QRRotator';
import { useCallback, useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAppStore } from '../store/useAppStore';
import { mintAttendanceNFT } from '../services/api';

export default function Scan() {
  const { wallet, nfts, setNFTs } = useAppStore();
  const [lastScan, setLastScan] = useState(null);
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);

  const onScanSuccess = useCallback((decodedText, decodedResult) => {
    setLastScan(decodedText);
  }, []);

  const onScanFailure = useCallback((error) => {
    // Handle scan failure, usually just ignore
  }, []);

  useEffect(() => {
    if (scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        scannerRef.current.id,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false
      );
      
      scanner.render(onScanSuccess, onScanFailure);
      
      return () => {
        scanner.clear().catch(console.error);
      };
    }
  }, [onScanSuccess, onScanFailure]);

  const handleMint = async () => {
    if (!wallet) {
      setError('Create a wallet first in Dashboard.');
      return;
    }
    if (!lastScan) {
      setError('Scan the event QR first.');
      return;
    }
    setError(null);
    setMinting(true);
    try {
      const minted = await mintAttendanceNFT({ walletAddress: wallet.address, payload: lastScan });
      setNFTs([minted, ...nfts]);
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container-px mx-auto pt-8 pb-16">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <QRRotator />

          <div className="card p-6">
            <div className="text-sm text-zinc-400">Scanner</div>
            <div className="mt-3 rounded-xl overflow-hidden">
              <div id="qr-scanner" ref={scannerRef}></div>
            </div>

            <div className="mt-4 text-xs text-zinc-500 break-all">
              last payload: {lastScan || '—'}
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={handleMint} className="btn btn-primary" disabled={minting}>
                {minting ? 'Minting...' : 'Mint POAP'}
              </button>
              {error && <div className="text-red-400 self-center text-sm">{error}</div>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
