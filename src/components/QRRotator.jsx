import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { QRCodeCanvas } from 'qrcode.react';

export default function QRRotator() {
  const { qrSecret, rotateSecret, qrIntervalSec } = useAppStore();

  useEffect(() => {
    rotateSecret();
    const id = setInterval(() => rotateSecret(), qrIntervalSec * 1000);
    return () => clearInterval(id);
  }, [rotateSecret, qrIntervalSec]);

  return (
    <div className="card p-6 flex flex-col items-center gap-4">
      <div className="text-sm text-zinc-400">Rotating QR every {qrIntervalSec}s</div>
      <QRCodeCanvas value={qrSecret} size={240} includeMargin />
      <div className="text-xs text-zinc-500 break-all">payload: {qrSecret}</div>
    </div>
  );
}
