import Link from "next/link";
import MobileNav from "@/components/layout/MobileNav";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tighter">Resonate</h1>
        <p className="mb-8 max-w-sm text-lg text-muted">
          Music events community
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link
            href="/eventi"
            className="flex h-12 items-center justify-center rounded-full bg-accent text-white font-medium transition-colors hover:bg-accent-hover"
          >
            Scopri gli eventi
          </Link>
          <Link
            href="/registrati"
            className="flex h-12 items-center justify-center rounded-full border border-card-border font-medium transition-colors hover:bg-card"
          >
            Diventa membro
          </Link>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
