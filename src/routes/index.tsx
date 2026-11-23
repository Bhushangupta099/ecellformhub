import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileSpreadsheet, ShieldCheck, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { NietLogo } from "@/components/NietLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NIET E-CELL FormHub — The Official Event & Registration Engine" },
      {
        name: "description",
        content:
          "Powering hackathons, workshops, startup pitches, and campus events for NIET E-CELL with smart forms and one-click Excel exports.",
      },
      { property: "og:title", content: "NIET E-CELL FormHub" },
      {
        property: "og:description",
        content: "Smart Forms. Instant Response. Zero Clutter — Built for NIET E-CELL.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <NietLogo logoHeightClass="h-12 sm:h-16" />
        <div className="flex items-center gap-2">
          {!loading && user ? (
            <Button asChild size="sm">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Team Login</Link>
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24">
        <section className="py-14 sm:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary">
            <span className="flex size-2 rounded-full bg-primary animate-pulse" />
            <Sparkles className="size-3.5" /> Official Event & Registration Engine — NIET E-CELL
          </div>

          <h1 className="mt-5 max-w-3xl text-4xl leading-tight font-extrabold tracking-tight sm:text-6xl">
            Smart Forms. <br className="hidden sm:inline" />
            <span className="text-primary">Instant Response.</span> <br className="hidden sm:inline" />
            Zero Clutter.
          </h1>

          <p className="text-muted-foreground mt-5 max-w-2xl text-base sm:text-lg leading-relaxed">
            Built exclusively for <strong>NIET Entrepreneurship Cell</strong>. Powering hackathons, speaker conclaves, startup pitches, and campus recruitments with instant public forms and one-click data intelligence.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="shadow-lg shadow-primary/20 hover:shadow-primary/30">
              <Link to={user ? "/dashboard" : "/auth"}>
                {user ? "Go to Dashboard" : "Access Team Portal"} <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "Lightning-Fast Event Links",
              body: "Unique, frictionless URLs shareable across WhatsApp and social media. Anyone can fill and submit in seconds without logging in.",
            },
            {
              icon: FileSpreadsheet,
              title: "One-Click Excel Export",
              body: "Streamline participant lists instantly. Download clean, formatted .xlsx sheets structured question-by-question for rapid screening.",
            },
            {
              icon: ShieldCheck,
              title: "Dedicated Team Workspace",
              body: "Enterprise-grade database isolation and team management built specifically for NIET E-CELL coordinators and leads.",
            },
          ].map((f) => (
            <div key={f.title} className="bg-card rounded-xl border p-6 transition-all hover:border-primary/40 hover:shadow-sm">
              <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}