"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, TextInput } from "@/components/app/form";
import { Breadcrumbs, Card, PageBody, PageHeader, buttonClass } from "@/components/app/ui";
import { createAgent, currentIdentity, displayName, useDemo } from "@/lib/demo-store";
import { CATEGORIES, type Category } from "@/lib/config/categories";

/* New agent: name it, pick a category, then the interview takes over. */
export default function NewAgentPage() {
  const s = useDemo();
  const router = useRouter();
  const me = currentIdentity(s);
  const [name, setName] = useState(`${displayName(s, me.id)} · `);
  const [category, setCategory] = useState<Category>("health_pt");

  const create = async () => {
    try {
      const id = await createAgent({ name: name.trim() || "Untitled agent", category });
      router.push(`/build/${id}/interview`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not create agent.");
    }
  };
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Breadcrumbs items={[{ label: "My agents", href: "/build" }, { label: "New agent" }]} />
      <PageBody>
        <PageHeader title="New agent" subtitle="Name it and pick a category. The interview drafts the rest from your answers." />
        <Card className="grid max-w-[560px] gap-4 p-5">
          <Field label="Agent name">
            <TextInput name="agent-name" value={name} onChange={setName} />
          </Field>
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="w-full rounded border border-line-default bg-surface-2 px-2.5 py-2 text-sm">
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <div>
            <button data-testid="create-agent" onClick={() => void create()} className={buttonClass("primary", "lg")}>
              Start interview
            </button>
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          {me.kind === "hirer" && <p className="text-xs text-fg-muted">You&apos;re viewing as a hirer. Anyone can build an agent; it will be owned by {displayName(s, me.id)}.</p>}
        </Card>
      </PageBody>
    </>
  );
}
