import { Keypair } from '@solana/web3.js';
import { supabase } from '../lib/supabase';

export async function createWallet() {
  const keypair = Keypair.generate();
  const address = keypair.publicKey.toBase58();

  // TODO: encrypt secretKey before sending to server
  const secretKey = JSON.stringify(Array.from(keypair.secretKey));

  const { error } = await supabase.functions.invoke('wallet', {
    body: { address, secretKey },
  });

  if (error) {
    throw new Error('Failed to save wallet');
  }

  return { address };
}
