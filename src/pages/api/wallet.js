
import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { address, secretKey } = req.body;
  if (!address || !secretKey) {
    return res.status(400).json({ error: 'Missing address or secretKey' });
  }

  console.log('Request body:', req.body);

  const { data: { user } } = await supabase.auth.getUser();

  console.log('User:', user);

  if (!user) {
    console.error('Unauthorized: User not found');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data, error } = await supabase
    .from('wallets')
    .insert([{ user_email: user.email, public_key: address, secret_key: secretKey }]);

  if (error) {
    console.error('Error saving wallet:', error);
    return res.status(500).json({ error: 'Failed to save wallet' });
  }

  res.status(200).json({ success: true });
}
