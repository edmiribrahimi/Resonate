import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "@/components/layout/MobileNav";

export default async function AttendancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // TODO: fetch attendance records from Supabase
  const attendances: { event_title: string; date: string }[] = [];

  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Your Attendance</h1>
        <p className="mt-1 text-muted">
          {attendances.length} {attendances.length === 1 ? "event" : "events"} attended
        </p>
      </header>

      <div className="px-6">
        {attendances.length === 0 ? (
          <div className="rounded-2xl border border-card-border bg-card p-8 text-center">
            <p className="text-4xl mb-3">🎵</p>
            <p className="text-muted">
              No attendance recorded yet. Come to the next event!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {attendances.map((att, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-xl border border-card-border bg-card p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                  ✓
                </div>
                <div>
                  <p className="font-medium">{att.event_title}</p>
                  <p className="text-sm text-muted">
                    {new Date(att.date).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
