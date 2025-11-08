// src/components/NFTCard.jsx
export default function NFTCard({ nft }) {
  return (
    <div className="card overflow-hidden">
      <img src={nft.image} alt={nft.name} className="h-48 w-full object-cover" />
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="font-semibold truncate">{nft.name}</div>
          {nft._explorer && (
            <a
              href={nft._explorer}
              target="_blank"
              rel="noreferrer"
              className="text-xs underline opacity-80 hover:opacity-100"
            >
              View
            </a>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-400">{nft.description}</p>
      </div>
    </div>
  );
}
