"use client";

import { useRef, useState } from "react";
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
  return (
    <>
      <Breadcrumbs items={[{ label: "Settings" }]} />
      <PageBody>
        <PageHeader
          title="Settings"
          subtitle={me.kind === "expert" ? "Your expert profile. Credentials are shown to hirers with a \"self-reported\" label." : "Your profile."}
        />
        <ProfileForm key={me.id} profile={profile} expert={me.kind === "expert"} />
        <div className="mt-10 max-w-[640px] rounded-xl border border-line-subtle bg-surface-1 p-4">
          <div className="text-sm font-semibold">Demo data</div>
          <p className="mt-1 text-[13px] text-fg-muted">Import old browser profile, persona and interview drafts explicitly. Financial history is never imported. The browser copy stays until every supported record is acknowledged.</p>
          <button type="button" disabled={!!busy || s.status !== "ready"} onClick={() => void act("import")} className={buttonClass("secondary", "lg") + " mt-3"}>{busy === "import" ? "Importing drafts…" : "Import legacy drafts"}</button>
          <p className="mt-4 text-[13px] text-fg-muted">Reset presentation fixtures. Real usage, spending, wallet ledger and pending reservations remain saved.</p>
          <button
            data-testid="reset-demo"
            type="button"
            disabled={!!busy || s.status !== "ready"}
            onClick={() => void act("reset")}
            className={buttonClass("secondary", "lg") + " mt-3"}
          >
            {busy === "reset" ? "Restoring fixtures…" : "Reset demo data"}
          </button>
          {actionError && <p role="alert" className="mt-3 text-sm text-danger">{actionError}</p>}
        </div>
      </PageBody>
    </>
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
    <div className="grid max-w-[640px] gap-3.5">
      <div className="grid gap-3.5 sm:grid-cols-2">
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
      <div className="grid gap-3.5 sm:grid-cols-2">
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
      <div>
        <button type="button" data-testid="save-profile" disabled={saving} onClick={() => void save()} className={buttonClass("primary", "lg")}>
          {saving ? "Saving profile…" : "Save profile"}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error} Your draft is still here.</p>}
    </div>
  );
}
