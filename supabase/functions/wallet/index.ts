// supabase/functions/wallet/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const PROJECT_URL = Deno.env.get('project_url')!
const ANON_KEY = Deno.env.get('product_anon_key')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const supabase = createClient(PROJECT_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })

  // who is calling
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

  const { address, secretKey } = await req.json()
  if (!address) return new Response(JSON.stringify({ error: 'Missing address' }), { status: 400, headers: corsHeaders })

  // already has a wallet?
  const { data: existing, error: selErr } = await supabase
    .from('wallets')
    .select('public_key')
    .eq('user_email', user.email)
    .maybeSingle()

  if (selErr) {
    return new Response(JSON.stringify({ error: 'Lookup failed', detail: selErr.message }), { status: 500, headers: corsHeaders })
  }

  if (existing) {
    return new Response(JSON.stringify({ ok: true, alreadyExists: true, public_key: existing.public_key }), { status: 409, headers: corsHeaders })
  }

  // create new
  const { data: inserted, error: insErr } = await supabase
    .from('wallets')
    .insert([{ user_email: user.email, public_key: address, secret_key: secretKey ?? null }])
    .select('public_key')
    .single()

  if (insErr) {
    return new Response(JSON.stringify({ error: 'Insert failed', detail: insErr.message }), { status: 500, headers: corsHeaders })
  }

  return new Response(JSON.stringify({ ok: true, public_key: inserted.public_key }), { status: 200, headers: corsHeaders })
})
