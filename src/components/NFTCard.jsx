export default function NFTCard({ nft }) {
  return (
    <div className="card overflow-hidden">
      <img src={nft.image} alt={nft.name} className="h-48 w-full object-cover" />
      <div className="p-4">
        <div className="font-semibold">{nft.name}</div>
        <p className="mt-1 text-sm text-zinc-400">{nft.description}</p>
      </div>
    </div>
  );
}
