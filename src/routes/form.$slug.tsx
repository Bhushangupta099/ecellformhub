import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Link as LinkIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AnswerField } from "@/components/AnswerField";
import { NietLogo } from "@/components/NietLogo";
import type { FormRow, FormSettings, Question } from "@/lib/form-types";

export const Route = createFileRoute("/form/$slug")({
  head: () => ({
    meta: [
      { title: "Fill in this form — NIET FormHub" },
      { name: "description", content: "Answer this form and submit your response on NIET FormHub." },
      { property: "og:title", content: "Fill in this form — NIET FormHub" },
      { property: "og:description", content: "Answer this form and submit your response on NIET FormHub." },
    ],
  }),
  component: PublicForm,
});

function PublicForm() {
  const { slug } = Route.useParams();
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const query = useQuery({
    queryKey: ["public-form", slug],
    queryFn: async () => {
      const { data: f, error } = await supabase
        .from("forms")
        .select("id, title, description, slug, accepting_responses, settings")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!f) return null;
      const { data: qs, error: qErr } = await supabase
        .from("questions")
        .select("*")
        .eq("form_id", f.id)
        .order("position");
      if (qErr) throw qErr;
      return {
        form: f as unknown as FormRow,
        questions: (qs ?? []) as unknown as Question[],
      };
    },
  });

  if (query.isLoading) {
    return (
      <div className="text-muted-foreground flex min-h-screen items-center justify-center gap-2">
        <Loader2 className="size-4 animate-spin" /> Loading form…
      </div>
    );
  }

  if (!query.data) {
    return (
      <Shell>
        <Card>
          <CardContent className="py-16 text-center">
            <h1 className="text-xl font-semibold">Form not found</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              This link is invalid or the form has been removed.
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const { form, questions } = query.data;
  const settings: FormSettings = form.settings ?? {};
  const answerable = questions.filter(
    (q) => q.question_type !== "section" && q.question_type !== "url_display",
  );
  const filled = answerable.filter((q) => (values[q.id] ?? "").trim() || files[q.id]).length;

  if (done) {
    return (
      <Shell>
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="text-primary mx-auto size-10" />
            <h1 className="mt-4 text-xl font-semibold">{form.title}</h1>
            <p className="text-muted-foreground mt-2">
              {settings.confirmationMessage || "Thanks! Your response has been recorded."}
            </p>
            {(settings.allowMultiple ?? true) && (
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => {
                  setValues({});
                  setFiles({});
                  setEmail("");
                  setDone(false);
                }}
              >
                Submit another response
              </Button>
            )}
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (settings.approval_status === "pending") {
    return (
      <Shell>
        <Card>
          <CardContent className="py-16 text-center">
            <h1 className="text-xl font-semibold">{form.title}</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              This form is pending admin approval and cannot accept responses yet.
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (!form.accepting_responses) {
    return (
      <Shell>
        <Card>
          <CardContent className="py-16 text-center">
            <h1 className="text-xl font-semibold">{form.title}</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              This form is no longer accepting responses.
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const missing = answerable.find(
      (q) => q.required && !(values[q.id] ?? "").trim() && !files[q.id],
    );
    if (missing) {
      toast.error(`Please answer: ${missing.question_text || "a required question"}`);
      return;
    }
    if (settings.collectEmail && !email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    setSubmitting(true);
    try {
      const finalValues = { ...values };
      for (const [qid, file] of Object.entries(files)) {
        const path = `${form.id}/${crypto.randomUUID()}-${file.name}`;
        const { error } = await supabase.storage.from("form-uploads").upload(path, file);
        if (error) throw error;
        finalValues[qid] = file.name;
      }

      // The response id is generated client-side: anonymous respondents can
      // insert but never read rows back, so no returning representation.
      const responseId = crypto.randomUUID();
      const { error: rErr } = await supabase.from("responses").insert({
        id: responseId,
        form_id: form.id,
        respondent_email: settings.collectEmail ? email.trim() : null,
      });
      if (rErr) throw rErr;

      const rows = answerable
        .filter((q) => finalValues[q.id] !== undefined && finalValues[q.id] !== "")
        .map((q) => ({
          response_id: responseId,
          question_id: q.id,
          answer: finalValues[q.id] ?? "",
        }));
      if (rows.length) {
        const { error: aErr } = await supabase.from("response_answers").insert(rows);
        if (aErr) throw aErr;
      }
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit your response");
    } finally {
      setSubmitting(false);
    }
  }

  return (
  <div className="relative min-h-screen">
    {/* Background video – same as landing page */}
    <video
      autoPlay
      loop
      muted
      playsInline
      className="absolute inset-0 w-full h-full object-cover -z-10"
    >
      <source src="/rocket-bg.mp4" type="video/mp4" />
    </video>
    <Shell>

      <Card className="border-primary/40 border-t-4">
        <CardHeader>
          <CardTitle className="text-2xl">{form.title}</CardTitle>
          {form.description && (
            <p className="text-muted-foreground text-sm">{form.description}</p>
          )}
        </CardHeader>
        {settings.showProgress && answerable.length > 0 && (
          <CardContent className="pt-0">
            <Progress value={(filled / answerable.length) * 100} />
          </CardContent>
        )}
      </Card>

      <form onSubmit={submit} className="mt-4 space-y-4">
        {settings.collectEmail && (
          <Card>
            <CardContent className="space-y-2 pt-6">
              <Label htmlFor="respondent-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="respondent-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </CardContent>
          </Card>
        )}

        {questions.map((q) => {
          if (q.question_type === "section") {
            return (
              <div key={q.id} className="pt-4">
                <h2 className="text-lg font-semibold">{q.question_text}</h2>
                {q.description && (
                  <p className="text-muted-foreground text-sm">{q.description}</p>
                )}
              </div>
            );
          }

          if (q.question_type === "url_display") {
            const rawUrl = q.options?.[0]?.trim() || "";
            const href = rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
              ? rawUrl
              : `https://${rawUrl}`;

            return (
              <Card key={q.id} className="border-primary/20 bg-card/80">
                <CardContent className="space-y-3 pt-6">
                  {q.question_text && (
                    <h3 className="font-semibold text-base text-foreground">
                      {q.question_text}
                    </h3>
                  )}
                  {q.description && (
                    <p className="text-muted-foreground text-sm whitespace-pre-line">
                      {q.description}
                    </p>
                  )}
                  {rawUrl && (
                    <div className="pt-1">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="border-primary/30 text-primary hover:bg-primary/10 gap-2 max-w-full overflow-hidden"
                      >
                        <a href={href} target="_blank" rel="noopener noreferrer">
                          <LinkIcon className="size-4 shrink-0" />
                          <span className="truncate">{rawUrl}</span>
                          <ExternalLink className="size-3.5 shrink-0 opacity-70" />
                        </a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          }

          return (
            <Card key={q.id}>
              <CardContent className="space-y-3 pt-6">
                <div>
                  <p className="font-medium">
                    {q.question_text}
                    {q.required && <span className="text-destructive"> *</span>}
                  </p>
                  {q.description && (
                    <p className="text-muted-foreground text-sm">{q.description}</p>
                  )}
                </div>
                <AnswerField
                  question={q}
                  value={values[q.id] ?? ""}
                  onChange={(v) => setValues((s) => ({ ...s, [q.id]: v }))}
                  onFile={(file) =>
                    setFiles((s) => {
                      const next = { ...s };
                      if (file) next[q.id] = file;
                      else delete next[q.id];
                      return next;
                    })
                  }
                />
              </CardContent>
            </Card>
          );
        })}

        <div className="flex justify-end pb-12">
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Submit
          </Button>
        </div>
      </form>
    </Shell>
  </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-transparent">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <NietLogo to="/" logoHeightClass="h-12 sm:h-14" />
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-5 py-8">{children}</div>
    </div>
  );
}