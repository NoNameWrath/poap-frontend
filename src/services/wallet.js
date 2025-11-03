import { Keypair } from '@solana/web3.js';
import { supabase } from '../lib/supabase';

export async function createWallet() {
  const keypair = Keypair.generate();
  const address = keypair.publicKey.toBase58();

  // TODO: encrypt secretKey before sending to server
  const secretKey = JSON.stringify(Array.from(keypair.secretKey));

  function withTimeout(promise, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('Timed out')), ms)),
  ]);
}

const { error } = await withTimeout(
  supabase.functions.invoke('wallet', { body: { address, secretKey } })
);
if (error) throw new Error(error.message || 'Failed to save wallet');


  if (error) {
    throw new Error('Failed to save wallet');
  }

  return { address };
}
