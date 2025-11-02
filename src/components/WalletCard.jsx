export default function WalletCard({ address }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-zinc-400">Wallet</div>
      <div className="mt-1 text-xl font-semibold">{address || '—'}</div>
      {address && (
        <button
          className="mt-3 btn btn-ghost"
          onClick={() => navigator.clipboard.writeText(address)}>
          Copy address
        </button>
      )}
    </div>
  );
}
