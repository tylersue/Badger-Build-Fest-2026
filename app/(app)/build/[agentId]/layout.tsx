"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SearchX } from "lucide-react";
import { useBuilderAgent } from "@/components/app/builder";
import { Breadcrumbs, EmptyState, StatusPill } from "@/components/app/ui";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "interview", label: "Interview" },
  { key: "test", label: "Test" },
  { key: "persona", label: "Persona" },
  { key: "knowledge", label: "Knowledge" },
  { key: "publish", label: "Publish" },
  { key: "insights", label: "Insights" },
] as const;

/* Builder frame: breadcrumb, agent tabs, then the page (Interview/Test use the Fleet split). */
export default function BuilderLayout({ children }: { children: ReactNode }) {
  const { agent } = useBuilderAgent();
  const pathname = usePathname();

  if (!agent) {
    return (
      <>
        <Breadcrumbs items={[{ label: "My agents", href: "/build" }, { label: "Not found" }]} />
        <EmptyState icon={SearchX} heading="Agent not found" body="It may have been created in a different browser session." action={{ label: "Back to my agents", href: "/build" }} />
      </>
    );
  }

  return (
    <div className="flex h-svh flex-col">
      <Breadcrumbs items={[{ label: "My agents", href: "/build" }, { label: agent.persona.name }]} actions={<StatusPill status={agent.status} />} />
      <nav className="flex shrink-0 gap-1 border-b border-line-muted px-4" aria-label="Agent sections">
        {TABS.map((t) => {
          const href = `/build/${agent.id}/${t.key}`;
          const active = pathname === href;
          return (
            <Link
              key={t.key}
              href={href}
              data-testid={`tab-${t.key}`}
              className={cn("-mb-px border-b-2 px-2.5 py-2 text-[13px] font-medium", active ? "border-brand-border text-foreground" : "border-transparent text-fg-muted hover:text-foreground")}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
    </div>
  );
}
