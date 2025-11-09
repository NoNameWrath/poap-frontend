import { supabase } from '../lib/supabase';

export async function fetchUserNFTs() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('passes')
    .select('minted_asset,wallet_pubkey,created_at,events(name,starts_at,image_url)')
    .eq('user_email', user.email)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map(r => {
    const id = r.minted_asset;
    const title = r?.events?.name || 'POAP';
    const when = r?.events?.starts_at || r?.created_at;
    const ts = when ? new Date(when).toLocaleString() : '';
    const short = r.wallet_pubkey ? r.wallet_pubkey.slice(0,4) + '…' + r.wallet_pubkey.slice(-4) : '';
    const image = r?.events?.image_url || `https://picsum.photos/seed/${encodeURIComponent(id)}/400/400`;

    return {
      id,
      name: title,
      image,
      description: `Minted to ${short}${ts ? ' · ' + ts : ''}`,
      _explorer: `https://solscan.io/address/${id}?cluster=devnet`,
    };
  });
}
