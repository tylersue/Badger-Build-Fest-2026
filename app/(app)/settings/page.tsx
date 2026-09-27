"use client";

import { useRef, useState, type ReactNode } from "react";
import { Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Field, TextArea, TextInput } from "@/components/app/form";
import { Breadcrumbs, PageBody, PageHeader, buttonClass } from "@/components/app/ui";
import { currentIdentity, getDraft, importLegacyDrafts, profileFor, resetDemo, saveProfile, useDemo } from "@/lib/demo-store";
import type { Profile } from "@/lib/types";

export default function SettingsPage() {
  const s = useDemo();
  const me = currentIdentity(s);
  const profile = profileFor(s, me.id);
  const [busy, setBusy] = useState<"reset" | "import" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const inFlight = useRef(false);
  async function act(kind: "reset" | "import") {
    if (inFlight.current || s.status !== "ready") return;
    inFlight.current = true; setBusy(kind); setActionError(null);
    try {
      if (kind === "reset") { await resetDemo(); toast("Presentation fixtures restored. Real usage and wallet history remain saved."); }
      else { const result = await importLegacyDrafts(); toast(result.remaining ? `${result.imported} drafts imported; ${result.remaining} remain in browser storage.` : `${result.imported} legacy drafts imported.`); }
    } catch (cause) { const message = cause instanceof Error ? cause.message : "The request failed. Your local drafts remain available."; setActionError(message); toast.error(message); }
    finally { inFlight.current = false; setBusy(null); }
  }
  const ready = s.status === "ready";
  return (
    <>
      <Breadcrumbs items={[{ label: "Settings" }]} />
      <PageBody>
        <div className="max-w-[960px]">
          <PageHeader title="Settings" />

          <SettingsSection
            title="Profile"
            description={me.kind === "expert" ? "Your expert profile. Credentials are shown to hirers with a \"self-reported\" label." : "Your name, field and contact details."}
          >
            <ProfileForm key={me.id} profile={profile} expert={me.kind === "expert"} />
          </SettingsSection>

          <SettingsSection title="Demo data">
            <div className="divide-y divide-line-subtle overflow-hidden rounded-xl border border-line-subtle bg-surface-1">
              <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium"><Download className="size-4 text-fg-muted" strokeWidth={1.75} />Import legacy drafts</div>
                  <p className="mt-1 text-[13px] text-fg-muted">Import old browser profile, persona and interview drafts explicitly. Financial history is never imported. The browser copy stays until every supported record is acknowledged.</p>
                </div>
                <button type="button" disabled={!!busy || !ready} onClick={() => void act("import")} className={buttonClass("secondary", "lg")}>{busy === "import" ? "Importing drafts…" : "Import legacy drafts"}</button>
              </div>
              <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium"><RotateCcw className="size-4 text-fg-muted" strokeWidth={1.75} />Reset demo data</div>
                  <p className="mt-1 text-[13px] text-fg-muted">Reset presentation fixtures. Real usage, spending, wallet ledger and pending reservations remain saved.</p>
                </div>
                <button
                  data-testid="reset-demo"
                  type="button"
                  disabled={!!busy || !ready}
                  onClick={() => void act("reset")}
                  className={buttonClass("secondary", "lg")}
                >
                  {busy === "reset" ? "Restoring fixtures…" : "Reset demo data"}
                </button>
              </div>
            </div>
            {actionError && <p role="alert" className="mt-4 rounded-lg bg-danger-surface px-4 py-2 text-sm text-danger">{actionError}</p>}
          </SettingsSection>
        </div>
      </PageBody>
    </>
  );
}

/* Stripe-style settings row: title and description on the left, controls on the right. */
function SettingsSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line-subtle py-8 first:border-t-0 first:pt-0 md:grid-cols-[240px_minmax(0,1fr)] md:gap-8">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-1 text-[13px] text-fg-muted">{description}</p>}
      </div>
      <div className="min-w-0 max-w-[640px]">{children}</div>
    </section>
  );
}

/* Expert profile: seeded and editable (AUTH-03, D-19). */
function ProfileForm({ profile, expert }: { profile: Profile; expert: boolean }) {
  const [p, setP] = useState<Profile>(() => {
    const saved = getDraft("profile", profile.identityId)?.value;
    if (!saved) return profile;
    try { return { ...profile, ...JSON.parse(saved) as Partial<Profile>, identityId: profile.identityId }; }
    catch { return profile; }
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const set = <K extends keyof Profile>(k: K) => (v: Profile[K]) => setP({ ...p, [k]: v });
  const save = async () => {
    if (inFlight.current) return;
    inFlight.current = true; setSaving(true); setError(null);
    try {
      await saveProfile(p.identityId, { ...p, displayName: p.displayName.trim() || profile.displayName });
      toast("Profile saved");
    } catch (cause) { const message = cause instanceof Error ? cause.message : "Profile was not saved."; setError(message); toast.error(message); }
    finally { inFlight.current = false; setSaving(false); }
  };
  return (
    <div className="overflow-hidden rounded-xl border border-line-subtle bg-surface-1">
      <div className="grid gap-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name">
            <TextInput name="displayName" value={p.displayName} onChange={set("displayName")} />
          </Field>
          <Field label="Field">
            <TextInput name="field" value={p.field} onChange={set("field")} />
          </Field>
        </div>
        {expert && (
          <Field label="Photo URL" hint="Optional; use a direct image link">
            <TextInput name="photoUrl" value={p.photoUrl ?? ""} onChange={set("photoUrl")} />
          </Field>
        )}
        {expert && (
          <Field label="Credentials" hint="Shown as self-reported">
            <TextInput name="credentials" value={p.credentials} onChange={set("credentials")} />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {expert && (
            <Field label="Years of experience">
              <TextInput
                name="years"
                type="number"
                value={p.yearsExperience?.toString() ?? ""}
                onChange={(v) => set("yearsExperience")(v === "" ? null : Math.max(0, Math.min(70, Number(v))))}
              />
            </Field>
          )}
          <Field label="Contact link">
            <TextInput name="contactUrl" value={p.contactUrl} onChange={set("contactUrl")} />
          </Field>
        </div>
        <Field label="Location">
          <TextInput name="location" value={p.location} onChange={set("location")} />
        </Field>
        <Field label="Bio">
          <TextArea value={p.bio} onChange={set("bio")} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line-subtle bg-surface-2 px-6 py-4">
        {error ? <p role="alert" className="text-sm text-danger">{error} Your draft is still here.</p> : <p className="text-xs text-fg-muted">Changes take effect when you save.</p>}
        <button type="button" data-testid="save-profile" disabled={saving} onClick={() => void save()} className={buttonClass("primary", "lg") + " ml-auto"}>
          {saving ? "Saving profile…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}
