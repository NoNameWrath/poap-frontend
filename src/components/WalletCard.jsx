import React from "react";

export default function WalletCard({ address, onViewSecret }) {
  const short = (addr = "") => {
    if (!addr) return "";
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied");
    } catch {
      alert("Copy failed");
    }
  };

  return (
    <div className="card p-4">
      <div className="text-sm text-zinc-400">Wallet</div>

      {address ? (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-zinc-400">Public key</div>
            <div
              className="mt-1 font-mono text-sm truncate"
              title={address}
              style={{ wordBreak: "break-all" }}
            >
              {short(address)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => copy(address)}
              title="Copy address"
            >
              Copy
            </button>

            {typeof onViewSecret === "function" && (
              <button
                className="btn btn-outline btn-sm"
                onClick={onViewSecret}
                title="View secret key"
              >
                View secret
              </button>
            )}

          </div>
        </div>
      ) : (
        <div className="mt-3 text-sm text-zinc-500">No wallet yet</div>
      )}
    </div>
  );
}
