import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Loader2, Plus, Save, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionCard } from "@/components/QuestionCard";
import {
  defaultOptions,
  defaultQuestionText,
  type FormRow,
  type FormSettings,
  type Question,
} from "@/lib/form-types";

export const Route = createFileRoute("/_authenticated/forms/$formId/edit")({
  head: () => ({
    meta: [
      { title: "Form builder — NIET FormHub" },
      { name: "description", content: "Add questions and configure your form on NIET FormHub." },
      { property: "og:title", content: "Form builder — NIET FormHub" },
      { property: "og:description", content: "Add questions and configure your form on NIET FormHub." },
    ],
  }),
  component: Builder,
});

type Draft = Question & { _new?: boolean };

function Builder() {
  const { formId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormRow | null>(null);
  const [questions, setQuestions] = useState<Draft[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const query = useQuery({
    queryKey: ["form", formId, user.id],
    queryFn: async () => {
      const { data: f, error } = await supabase
        .from("forms")
        .select("*")
        .eq("id", formId)
        .maybeSingle();
      if (error) throw error;
      if (!f) throw new Error("Form not found");
      const { data: qs, error: qErr } = await supabase
        .from("questions")
        .select("*")
        .eq("form_id", formId)
        .order("position");
      if (qErr) throw qErr;
      return { form: f as unknown as FormRow, questions: (qs ?? []) as unknown as Question[] };
    },
  });

  useEffect(() => {
    if (query.data) {
      setForm(query.data.form);
      setQuestions(query.data.questions);
    }
  }, [query.data]);

  if (query.isLoading || !form) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 p-12">
        <Loader2 className="size-4 animate-spin" /> Loading form…
      </div>
    );
  }

  const settings: FormSettings = form.settings ?? {};

  function patchForm(patch: Partial<FormRow>) {
    setForm((f) => (f ? { ...f, ...patch } : f));
  }
  function patchSettings(patch: FormSettings) {
    setForm((f) => (f ? { ...f, settings: { ...(f.settings ?? {}), ...patch } } : f));
  }

  function addQuestion() {
    setQuestions((qs) => [
      ...qs,
      {
        id: crypto.randomUUID(),
        form_id: formId,
        question_type: "short_text",
        question_text: defaultQuestionText("short_text"),
        description: "",
        options: defaultOptions("short_text"),
        required: false,
        position: qs.length,
        _new: true,
      },
    ]);
  }

  function move(index: number, dir: -1 | 1) {
    setQuestions((qs) => {
      const next = [...qs];
      const target = index + dir;
      if (target < 0 || target >= next.length) return qs;
      const a = next[index]!;
      const b = next[target]!;
      next[index] = b;
      next[target] = a;
      return next.map((q, i) => ({ ...q, position: i }));
    });
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      const { error: fErr } = await supabase
        .from("forms")
        .update({
          title: form.title,
          description: form.description,
          accepting_responses: form.accepting_responses,
          settings: (form.settings ?? {}) as never,
        })
        .eq("id", form.id);
      if (fErr) throw fErr;

      if (removed.length) {
        const { error } = await supabase.from("questions").delete().in("id", removed);
        if (error) throw error;
      }

      const newOnes = questions.filter((q) => q._new);
      const existing = questions.filter((q) => !q._new);

      if (newOnes.length) {
        const { error } = await supabase.from("questions").insert(
          newOnes.map((q) => ({
            form_id: form.id,
            question_type: q.question_type,
            question_text: q.question_text,
            description: q.description,
            options: q.options as never,
            required: q.required,
            position: q.position,
          })),
        );
        if (error) throw error;
      }
      for (const q of existing) {
        const { error } = await supabase
          .from("questions")
          .update({
            question_type: q.question_type,
            question_text: q.question_text,
            description: q.description,
            options: q.options as never,
            required: q.required,
            position: q.position,
          })
          .eq("id", q.id);
        if (error) throw error;
      }

      setRemoved([]);
      await qc.invalidateQueries({ queryKey: ["form", formId] });
      await qc.invalidateQueries({ queryKey: ["forms"] });
      toast.success("Form saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/form/${form.slug}` : "";

  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/dashboard">
            <ArrowLeft className="size-4" /> Dashboard
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(publicUrl);
              toast.success("Share link copied");
            }}
          >
            <Share2 className="size-4" /> Copy link
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`/form/${form.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> Preview
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/forms/$formId/responses" params={{ formId }}>
              Responses
            </Link>
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save
          </Button>
        </div>
      </div>

      <Tabs defaultValue="build" className="mt-6">
        <TabsList>
          <TabsTrigger value="build">Questions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="build" className="space-y-4">
          <Card className="border-primary/40 border-t-4">
            <CardContent className="space-y-3 pt-6">
              <Input
                value={form.title}
                onChange={(e) => patchForm({ title: e.target.value })}
                placeholder="Form title"
                className="h-12 text-xl font-semibold"
              />
              <Textarea
                value={form.description}
                onChange={(e) => patchForm({ description: e.target.value })}
                placeholder="Form description"
                rows={2}
              />
            </CardContent>
          </Card>

          {questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              total={questions.length}
              onChange={(patch) =>
                setQuestions((qs) => qs.map((x) => (x.id === q.id ? { ...x, ...patch } : x)))
              }
              onDelete={() => {
                if (!q._new) setRemoved((r) => [...r, q.id]);
                setQuestions((qs) =>
                  qs.filter((x) => x.id !== q.id).map((x, idx) => ({ ...x, position: idx })),
                );
              }}
              onDuplicate={() =>
                setQuestions((qs) => {
                  const copy: Draft = {
                    ...q,
                    id: crypto.randomUUID(),
                    _new: true,
                  };
                  const next = [...qs];
                  next.splice(i + 1, 0, copy);
                  return next.map((x, idx) => ({ ...x, position: idx }));
                })
              }
              onMove={(dir) => move(i, dir)}
            />
          ))}

          <Button variant="outline" className="w-full" onClick={addQuestion}>
            <Plus className="size-4" /> Add question
          </Button>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Form settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <ToggleRow
                label="Accept responses"
                description="Turn off to close the form to new submissions."
                checked={form.accepting_responses}
                onChange={(v) => patchForm({ accepting_responses: v })}
              />
              <ToggleRow
                label="Allow multiple submissions"
                description="Let the same person submit the form more than once."
                checked={settings.allowMultiple ?? true}
                onChange={(v) => patchSettings({ allowMultiple: v })}
              />
              <ToggleRow
                label="Show progress"
                description="Display a progress bar as the form is filled in."
                checked={settings.showProgress ?? false}
                onChange={(v) => patchSettings({ showProgress: v })}
              />
              <ToggleRow
                label="Collect email addresses"
                description="Ask respondents for their email before submitting."
                checked={settings.collectEmail ?? false}
                onChange={(v) => patchSettings({ collectEmail: v })}
              />
              <ToggleRow
                label="Allow response editing"
                description="Offer a 'submit another response' link after submitting."
                checked={settings.allowEditing ?? true}
                onChange={(v) => patchSettings({ allowEditing: v })}
              />
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirmation message</Label>
                <Textarea
                  id="confirm"
                  rows={3}
                  value={settings.confirmationMessage ?? ""}
                  onChange={(e) => patchSettings({ confirmationMessage: e.target.value })}
                  placeholder="Thanks! Your response has been recorded."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Public link</Label>
                <Input readOnly value={publicUrl} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}