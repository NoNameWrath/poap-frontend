import NFTCard from './NFTCard';

export default function NFTGrid({ items }) {
  if (!items?.length) {
    return <div className="text-zinc-400">No NFTs yet.</div>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(n => <NFTCard key={n.id} nft={n} />)}
    </div>
  );
}
