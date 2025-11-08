// src/services/api.js
import { supabase } from '../lib/supabase';

// Shape Dashboard already expects: { id, name, image, description }
export async function fetchUserNFTs(/* addressIgnored */) {
  // We key off auth email, not address, so RLS keeps it clean
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('passes')
    .select('minted_asset,wallet_pubkey,created_at,events(name,starts_at)')
    .eq('user_email', user.email)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = data ?? [];

  // Map to the UI card shape
  return rows.map(r => {
    const id = r.minted_asset;
    const title = r?.events?.name || 'POAP';
    const when = r?.events?.starts_at || r?.created_at;
    const ts = when ? new Date(when).toLocaleString() : '';
    const short = r.wallet_pubkey ? r.wallet_pubkey.slice(0, 4) + '…' + r.wallet_pubkey.slice(-4) : '';

    // deterministic placeholder image per NFT (until you read on-chain metadata)
    const image = `https://picsum.photos/seed/${encodeURIComponent(id)}/400/400`;

    return {
      id,
      name: title,
      image,
      description: `Minted to ${short}${ts ? ' · ' + ts : ''}`,
      // useful extras for the card (not required by your grid)
      _explorer: `https://solscan.io/address/${id}?cluster=devnet`,
    };
  });
}
