"use client";

import { useState } from "react";
import { ChevronRight, Share2 } from "lucide-react";
import { InlineEmpty, SectionHeader } from "@/components/app/dashboard-kit";
import { AssistantMessage, UserMessage } from "@/components/app/chat";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import type { SharedTranscript } from "@/features/insights/insights";

export function SharedTranscripts({ items }: { items: SharedTranscript[] }) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  function toggle(id: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="mt-8">
      <SectionHeader title="Shared transcripts" count={items.length} />
      {items.length === 0 ? (
        <div className="rounded-xl border border-line-subtle bg-surface-1">
          <InlineEmpty icon={Share2} heading="No shared transcripts yet" body="When a hirer turns on sharing, the conversation shows up here." />
        </div>
      ) : (
        <div className="divide-y divide-line-subtle overflow-hidden rounded-xl border border-line-subtle bg-surface-1">
          {items.map((item) => {
            const isOpen = openIds.has(item.conversationId);
            return (
              <article key={item.conversationId} data-testid="shared-transcript">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggle(item.conversationId)}
                  className="flex min-h-14 w-full items-center gap-4 px-4 py-2 text-left transition-colors hover:bg-surface-2"
                >
                  <ChevronRight className={cn("size-4 shrink-0 text-fg-muted transition-transform duration-150", isOpen && "rotate-90")} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-fg-muted">{item.agentName} · {formatRelative(item.createdAt)}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-xs text-fg-tertiary tabular-nums">
                    {item.messages.length} {item.messages.length === 1 ? "message" : "messages"}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-line-subtle bg-background/40 px-6 py-4" data-testid="shared-transcript-messages">
                    {item.messages.map((message) => message.role === "user" ? (
                      <UserMessage key={message.id} content={message.content} />
                    ) : (
                      <AssistantMessage key={message.id} content={message.content} citations={message.citations} flow={false} />
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
