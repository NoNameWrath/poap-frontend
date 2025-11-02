import CTAButton from '../components/CTAButton';

export default function Landing() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-zinc-950">
      <div className="container-px mx-auto pt-24 pb-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-5xl font-extrabold tracking-tight">
            Proof of Attendance, done right.
          </h1>
          <p className="mt-4 text-zinc-400 text-lg">
            Scan a rotating QR at the venue, auto-mint a collectible badge, and build your on-chain attendance history.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <CTAButton to="/login">Get started</CTAButton>
            <a href="#how" className="btn btn-ghost">How it works</a>
          </div>
        </div>

        <section id="how" className="mx-auto mt-20 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <div className="text-sm text-zinc-400">Step 1</div>
            <div className="mt-1 font-semibold">Sign in</div>
            <p className="mt-2 text-sm text-zinc-400">Use Google to create your account.</p>
          </div>
          <div className="card p-5">
            <div className="text-sm text-zinc-400">Step 2</div>
            <div className="mt-1 font-semibold">Create wallet</div>
            <p className="mt-2 text-sm text-zinc-400">We generate a wallet in-app for collectibles.</p>
          </div>
          <div className="card p-5">
            <div className="text-sm text-zinc-400">Step 3</div>
            <div className="mt-1 font-semibold">Scan & mint</div>
            <p className="mt-2 text-sm text-zinc-400">Scan the venue QR to mint your POAP.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
