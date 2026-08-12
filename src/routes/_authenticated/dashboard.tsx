import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BarChart3,
  Copy,
  ExternalLink,
  FilePlus2,
  Loader2,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { makeSlug, type FormRow, type Question } from "@/lib/form-types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My forms — NIET FormHub" },
      { name: "description", content: "Your private dashboard of forms and responses on NIET FormHub." },
      { property: "og:title", content: "My forms — NIET FormHub" },
      { property: "og:description", content: "Your private dashboard of forms and responses on NIET FormHub." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<FormRow | null>(null);

  const formsQuery = useQuery({
    queryKey: ["forms", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as unknown as FormRow[];
    },
  });

  const countsQuery = useQuery({
    queryKey: ["response-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("responses").select("form_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: { form_id: string }) => {
        map[r.form_id] = (map[r.form_id] ?? 0) + 1;
      });
      return map;
    },
  });

  const createForm = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("forms")
        .insert({
          user_id: user.id,
          title: "Untitled form",
          description: "",
          slug: makeSlug("form"),
          settings: { confirmationMessage: "Thanks! Your response has been recorded." } as never,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as FormRow;
    },
    onSuccess: (form) => {
      qc.invalidateQueries({ queryKey: ["forms"] });
      navigate({ to: "/forms/$formId/edit", params: { formId: form.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateForm = useMutation({
    mutationFn: async (form: FormRow) => {
      const { data: newForm, error } = await supabase
        .from("forms")
        .insert({
          user_id: user.id,
          title: `${form.title} (copy)`,
          description: form.description,
          slug: makeSlug(form.title),
          settings: (form.settings ?? {}) as never,
          accepting_responses: form.accepting_responses,
        })
        .select()
        .single();
      if (error) throw error;
      const { data: qs, error: qErr } = await supabase
        .from("questions")
        .select("*")
        .eq("form_id", form.id)
        .order("position");
      if (qErr) throw qErr;
      const rows = (qs as unknown as Question[]).map((q) => ({
        form_id: (newForm as unknown as FormRow).id,
        question_type: q.question_type,
        question_text: q.question_text,
        description: q.description,
        options: q.options,
        required: q.required,
        position: q.position,
      }));
      if (rows.length) {
        const { error: insErr } = await supabase.from("questions").insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      toast.success("Form duplicated");
      qc.invalidateQueries({ queryKey: ["forms"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteForm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("forms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Form deleted");
      qc.invalidateQueries({ queryKey: ["forms"] });
      qc.invalidateQueries({ queryKey: ["response-counts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`${window.location.origin}/form/${slug}`);
    toast.success("Share link copied");
  }

  const forms = (formsQuery.data ?? []).filter((f) =>
    f.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">
            Welcome{user.user_metadata?.["name"] ? `, ${user.user_metadata["name"]}` : ""}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{user.email}</p>
        </div>
        <Button onClick={() => createForm.mutate()} disabled={createForm.isPending}>
          {createForm.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FilePlus2 className="size-4" />
          )}
          Create new form
        </Button>
      </div>

      <div className="mt-6">
        <Input
          placeholder="Search your forms…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {formsQuery.isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-16">
          <Loader2 className="size-4 animate-spin" /> Loading your forms…
        </div>
      ) : forms.length === 0 ? (
        <div className="bg-card mt-8 rounded-xl border border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold">No forms yet</h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm">
            Create your first form to start collecting responses. Nothing here is shared with
            anyone else.
          </p>
          <Button className="mt-5" onClick={() => createForm.mutate()}>
            <FilePlus2 className="size-4" /> Create new form
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card key={form.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{form.title}</CardTitle>
                  <Badge variant={form.accepting_responses ? "default" : "secondary"}>
                    {form.accepting_responses ? "Open" : "Closed"}
                  </Badge>
                </div>
                <p className="text-muted-foreground line-clamp-2 text-sm">
                  {form.description || "No description"}
                </p>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <div className="text-muted-foreground space-y-0.5 text-xs">
                  <p>
                    <strong className="text-foreground">
                      {countsQuery.data?.[form.id] ?? 0}
                    </strong>{" "}
                    responses
                  </p>
                  <p>Created {new Date(form.created_at).toLocaleDateString()}</p>
                  <p>Updated {new Date(form.updated_at).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button asChild size="sm" variant="secondary">
                    <Link to="/forms/$formId/edit" params={{ formId: form.id }}>
                      <Pencil className="size-3.5" /> Edit
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link to="/forms/$formId/responses" params={{ formId: form.id }}>
                      <BarChart3 className="size-3.5" /> Responses
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => copyLink(form.slug)}>
                    <Share2 className="size-3.5" /> Share
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <a href={`/form/${form.slug}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-3.5" /> View
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => duplicateForm.mutate(form)}
                    disabled={duplicateForm.isPending}
                  >
                    <Copy className="size-3.5" /> Duplicate
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setToDelete(form)}>
                    <Trash2 className="text-destructive size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the form, its questions and all of its responses. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) deleteForm.mutate(toDelete.id);
                setToDelete(null);
              }}
            >
              Delete form
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}