// supabase/functions/wallet/index.ts
// Deno runtime (Edge Functions)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

const SUPABASE_URL = Deno.env.get('PROJECT_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('PROJECT_ANON_KEY')!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env')
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: corsHeaders })
  }

  try {
    const { address, secretKey } = await req.json().catch(() => ({}))
    if (!address || !secretKey) {
      return new Response(JSON.stringify({ error: 'address and secretKey required' }), { status: 400, headers: corsHeaders })
    }

    // Use service role to bypass RLS for this write, but still bind the caller’s auth for auditing
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
    })

    // Get authed user from the JWT the JS client sends automatically with functions.invoke
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })
    }

    // TODO: do NOT keep raw secretKey in prod. Encrypt or use a KMS. This is unencrypted for demo only.
    const { error: insertErr } = await supabase
      .from('wallets')
      .insert([{ user_email: user.email, public_key: address, secret_key: secretKey }])

    if (insertErr) {
      console.error('Insert wallet failed:', insertErr)
      return new Response(JSON.stringify({ error: 'Failed to save wallet' }), { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders })
  } catch (e) {
    console.error('Unhandled wallet error:', e)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: corsHeaders })
  }
})
