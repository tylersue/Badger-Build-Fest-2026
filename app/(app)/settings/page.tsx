"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Field, TextArea, TextInput } from "@/components/app/form";
import { Breadcrumbs, PageBody, PageHeader, buttonClass } from "@/components/app/ui";
import { currentIdentity, profileFor, resetDemo, saveProfile, useDemo } from "@/lib/demo-store";
import type { Profile } from "@/lib/types";

export default function SettingsPage() {
  const s = useDemo();
  const me = currentIdentity(s);
  const profile = profileFor(s, me.id);
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
          <p className="mt-1 text-[13px] text-fg-muted">Reset presentation fixtures. Your real usage and wallet history remain saved.</p>
          <button
            data-testid="reset-demo"
            onClick={async () => {
              try { await resetDemo(); toast("Presentation fixtures restored"); }
              catch (error) { toast.error(error instanceof Error ? error.message : "Reset unavailable."); }
            }}
            className={buttonClass("secondary", "lg") + " mt-3"}
          >
            Reset demo data
          </button>
        </div>
      </PageBody>
    </>
  );
}

/* Expert profile: seeded and editable (AUTH-03, D-19). */
function ProfileForm({ profile, expert }: { profile: Profile; expert: boolean }) {
  const [p, setP] = useState(profile);
  const set = <K extends keyof Profile>(k: K) => (v: Profile[K]) => setP({ ...p, [k]: v });
  const save = async () => {
    try {
      await saveProfile(p.identityId, { ...p, displayName: p.displayName.trim() || profile.displayName });
      toast("Profile saved");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Profile was not saved."); }
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
        <button data-testid="save-profile" onClick={save} className={buttonClass("primary", "lg")}>
          Save profile
        </button>
      </div>
    </div>
  );
}
