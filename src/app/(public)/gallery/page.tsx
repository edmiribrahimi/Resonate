import MobileNav from "@/components/layout/MobileNav";

// TODO: fetch media from Supabase grouped by event

export default function GalleryPage() {
  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Gallery</h1>
        <p className="mt-1 text-muted">Moments from our events</p>
      </header>

      <div className="px-6">
        <div className="rounded-2xl border border-card-border bg-card p-8 text-center">
          <p className="text-4xl mb-3">📸</p>
          <p className="text-muted">
            Photos and videos from upcoming events will appear here.
          </p>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
