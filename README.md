# POAP Frontend (React + Tailwind, no Vite)

Frontend-only scaffold for a Proof of Attendance NFT app. Clean stubs for Google login, wallet creation, rotating QR, scan-to-mint, and an NFT dashboard.
**No backend or UMI code is included** — all integration points are clearly marked.

## Quickstart
```bash
# 1) Install
npm i

# 2) Start dev server
npm start
```

## Tech
- Create React App
- Tailwind CSS
- React Router
- Zustand (global store)
- qrcode.react + react-qr-reader (QR display + scan)

## Structure
- Landing → Login (Google) → Dashboard (wallet + NFTs) → Scan (rotating QR + scanner)
- Replace placeholders in `services/*` and `context/AuthContext.jsx` with real implementations.
