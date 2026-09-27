"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FileQuestion } from "lucide-react";
import { Breadcrumbs, EmptyState, PageBody, buttonClass } from "@/components/app/ui";
import { IdentityLogo, companyFor } from "@/components/app/identity-logo";
import { agentById, displayName, useDemo } from "@/lib/demo-store";
import { mediaById } from "@/lib/demo-backend/media";

/* An expert's published piece (essay, podcast episode, talk), cited from chat answers. */
export default function SourcePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const s = useDemo();
  const item = mediaById(id);
  if (!item) {
    return (
      <>
        <Breadcrumbs items={[{ label: "Sources" }, { label: "Not found" }]} />
        <EmptyState icon={FileQuestion} heading="Source not found" body="This piece may have been removed." action={{ label: "Back to marketplace", href: "/marketplace" }} />
      </>
    );
  }
  const agent = agentById(s, item.agentId);
  const author = displayName(s, item.ownerId);
  const company = companyFor(item.ownerId);
  const [lead, ...rest] = item.body;

  return (
    <>
      <Breadcrumbs items={[{ label: author, href: agent ? `/agents/${agent.slug}` : undefined }, { label: item.title }]} />
      <PageBody className="max-w-[720px]">
        <article>
          <p className="text-xs font-medium tracking-wide text-fg-muted uppercase">{item.kind} · {item.outlet}</p>
          <h1 className="mt-2 text-[28px] leading-tight font-semibold tracking-tight">{item.title}</h1>
          <div className="mt-4 flex items-center gap-3 text-sm">
            <IdentityLogo identityId={item.ownerId} size={32} />
            <div>
              <p className="font-medium">{author}{company ? <span className="font-normal text-fg-muted"> · {company}</span> : null}</p>
              <p className="text-xs text-fg-muted">{item.published} · {item.minutes} min {item.kind === "Podcast" || item.kind === "Talk" ? "listen" : "read"}</p>
            </div>
          </div>
          <div className="mt-8 space-y-5 text-[16px] leading-[1.75] text-fg-secondary">
            <p>{lead}</p>
            <blockquote className="border-l-2 border-line-outline pl-4 text-[18px] leading-relaxed text-foreground">{item.excerpt}</blockquote>
            {rest.filter((paragraph) => !paragraph.includes(item.excerpt.slice(0, 40))).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </div>
        </article>
        <div className="mt-10 flex flex-wrap gap-2 border-t border-line-subtle pt-6">
          {agent && <Link href={`/agents/${agent.slug}`} className={buttonClass("primary", "lg")}>Ask {author.split(" ")[0]}&apos;s agent</Link>}
          <button type="button" className={buttonClass("secondary", "lg")} onClick={() => router.back()}>Back to chat</button>
        </div>
      </PageBody>
    </>
  );
}
