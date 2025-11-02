export async function createWallet() {
  const address = 'WALLET-' + Math.random().toString(36).slice(2, 10).toUpperCase();
  return { address };
}
