import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileSpreadsheet, ShieldCheck, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { NietLogo } from "@/components/NietLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NIET E-CELL FormHub — Create forms and collect responses" },
      {
        name: "description",
        content:
          "Build forms with 15 question types, share a public link, collect responses in a private dashboard and export them to Excel.",
      },
      { property: "og:title", content: "NIET E-CELL FormHub — Create forms and collect responses" },
      {
        property: "og:description",
        content: "Build forms, share a link, collect responses, export to Excel with NIET E-CELL FormHub.",
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
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get started
                </Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24">
        <section className="py-16 sm:py-24">
          <p className="text-sm font-medium text-primary">NIET E-CELL FormHub — Forms without clutter</p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight font-semibold sm:text-6xl">
            One Form. One Link. Complete Control.
          </h1>
          <p className="text-muted-foreground mt-5 max-w-xl text-lg">
            The private form workspace built for NIET E-CELL.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Create your first form <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">I already have an account</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Share2,
              title: "Public share links",
              body: "Each form gets a unique URL anyone can open and submit without an account.",
            },
            {
              icon: FileSpreadsheet,
              title: "Excel export",
              body: "Download every response as a formatted .xlsx with one column per question.",
            },
            {
              icon: ShieldCheck,
              title: "Isolated by design",
              body: "Database-level rules keep each account's forms and responses fully separate.",
            },
          ].map((f) => (
            <div key={f.title} className="bg-card rounded-xl border p-6">
              <f.icon className="text-primary size-6" />
              <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
              <p className="text-muted-foreground mt-2 text-sm">{f.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}