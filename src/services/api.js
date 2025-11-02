export async function fetchUserNFTs(address) {
  return [
    { id: '1', name: 'POAP: Launch Day', image: `https://picsum.photos/seed/${address}-1/400/400`, description: 'Attendance for Launch.' },
    { id: '2', name: 'POAP: Workshop A', image: `https://picsum.photos/seed/${address}-2/400/400`, description: 'Attendance for Workshop A.' }
  ];
}

export async function mintAttendanceNFT({ walletAddress, payload }) {
  await new Promise(r => setTimeout(r, 1200));
  return {
    id: String(Date.now()),
    name: 'POAP: Verified Attendance',
    image: `https://picsum.photos/seed/${walletAddress}-${Date.now()}/400/400`,
    description: `Minted for payload: ${payload}`
  };
}
