"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AssistantMessage, UserMessage } from "@/components/app/chat";
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
    <section className="mt-8 max-w-[720px]">
      <div className="mb-3">
        <h2 className="text-base font-semibold">Shared transcripts</h2>
        <p className="mt-1 text-sm text-fg-muted">Hirers choose per conversation whether you can read it. Sharing starts off.</p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-line-subtle bg-surface-1 p-6 text-center">
          <h3 className="text-sm font-semibold">No shared transcripts yet</h3>
          <p className="mt-1 text-[13px] text-fg-tertiary">When a hirer turns on sharing, the conversation shows up here.</p>
        </div>
      ) : (
        <div className="divide-y divide-line-subtle rounded-xl border border-line-subtle bg-surface-1">
          {items.map((item) => {
            const isOpen = openIds.has(item.conversationId);
            return (
              <article key={item.conversationId} data-testid="shared-transcript" className="p-4 first:rounded-t-xl last:rounded-b-xl">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggle(item.conversationId)}
                  className="flex w-full items-center gap-3 text-left"
                >
                  {isOpen ? <ChevronDown className="size-4 shrink-0 text-fg-muted" /> : <ChevronRight className="size-4 shrink-0 text-fg-muted" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="mt-0.5 block text-xs text-fg-muted">{item.agentName} · {formatRelative(item.createdAt)} · {item.messages.length} messages</span>
                  </span>
                </button>
                {isOpen && (
                  <div className="mt-4 border-t border-line-subtle pt-4" data-testid="shared-transcript-messages">
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
