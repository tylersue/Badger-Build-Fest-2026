"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Field, TextInput } from "@/components/app/form";
import { Breadcrumbs, PageBody, PageHeader, buttonClass } from "@/components/app/ui";
import { CATEGORIES, type Category } from "@/lib/config/categories";
import { createAgent, currentIdentity, useDemo } from "@/lib/demo-store";
import { toast } from "sonner";

export default function NewAgentPage() {
  const router = useRouter();
  const s = useDemo();
  const me = currentIdentity(s);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("career_admissions");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (me.kind !== "expert" || !name.trim() || inFlight.current || s.status !== "ready") return;
    inFlight.current = true; setSaving(true); setError(null);
    try {
      const id = await createAgent({ name: name.trim(), category });
      router.push(`/build/${id}/interview`);
    } catch (cause) { const message = cause instanceof Error ? cause.message : "Could not create agent."; setError(message); toast.error(message); }
    finally { inFlight.current = false; setSaving(false); }
  }

  return (
    <>
      <Breadcrumbs items={[{ label: "My agents", href: "/build" }, { label: "New agent" }]} />
      <PageBody>
        <PageHeader title="New agent" subtitle="Give your agent a name and a topic, then start its interview." />
        {me.kind !== "expert" ? (
          <p className="text-sm text-fg-muted">Switch to the expert in the sidebar to create an agent.</p>
        ) : (
          <form onSubmit={submit} className="grid max-w-[520px] gap-4">
            <Field label="Agent name"><TextInput name="name" value={name} onChange={setName} /></Field>
            <Field label="Category">
              <select name="category" value={category} onChange={(event) => setCategory(event.target.value as Category)} className="w-full rounded border border-line-default bg-surface-2 px-2.5 py-2 text-sm text-foreground">
                {CATEGORIES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </Field>
            {error && <p role="alert" className="text-sm text-danger">{error} Your name and category are still here.</p>}
            <button type="submit" disabled={!name.trim() || saving || s.status !== "ready"} className={buttonClass("primary", "lg") + " w-fit"}>{saving ? "Creating agent…" : "Create agent"}</button>
          </form>
        )}
      </PageBody>
    </>
  );
}
