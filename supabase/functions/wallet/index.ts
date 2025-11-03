import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('PROJECT_URL');
const supabaseAnonKey = Deno.env.get('PROJECT_ANON_KEY');

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { address, secretKey } = await req.json();

  if (!address || !secretKey) {
    return new Response(JSON.stringify({ error: 'Missing address or secretKey' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error } = await supabase
    .from('wallets')
    .insert([{ user_email: user.email, public_key: address, secret_key: secretKey }]);

  if (error) {
    console.error('Error saving wallet:', error);
    return new Response(JSON.stringify({ error: 'Failed to save wallet' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}