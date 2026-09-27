"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CircleCheck, Loader2 } from "lucide-react";
import { buttonClass } from "@/components/app/ui";
import type { Agent } from "@/lib/types";

/* After the interview: show the agent being assembled from the expert's answers, one step at a time. */
export function BuildSequence({ agent, answers, chunks }: { agent: Agent; answers: number; chunks: number }) {
  const tasks = agent.persona.exampleQuestions.filter(Boolean);
  const steps = [
    { title: "Knowledge base", detail: `${answers} interview answers indexed as ${chunks} searchable chunks` },
    { title: "Task system", detail: tasks.length ? `${tasks.length} tasks mapped from your answers: ${tasks.join(" · ")}` : "Tasks mapped from your answers" },
    { title: "Agent VM", detail: "Provisioned an isolated runtime · 2 vCPU · 4 GB · web search and document tools attached" },
    { title: "Hosting", detail: `Agent is live at proxier.ai/a/${agent.slug}` },
  ];
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (done >= steps.length) return;
    const timer = window.setTimeout(() => setDone((value) => value + 1), done === 0 ? 900 : 1100);
    return () => window.clearTimeout(timer);
  }, [done, steps.length]);
  const base = `/build/${agent.id}`;
  const finished = done >= steps.length;

  return (
    <section aria-label="Building your agent" className="rounded-xl border border-line-subtle bg-surface-1 p-5">
      <h2 className="font-semibold">{finished ? `${agent.persona.name} is built` : `Building ${agent.persona.name}`}</h2>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => {
          const state = index < done ? "done" : index === done ? "running" : "waiting";
          return (
            <li key={step.title} className={`flex gap-3 text-sm ${state === "waiting" ? "opacity-40" : ""}`}>
              {state === "done" ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                : <Loader2 className={`mt-0.5 size-4 shrink-0 text-fg-muted ${state === "running" ? "animate-spin" : ""}`} aria-hidden />}
              <div>
                <p className="font-medium">{step.title}{state === "running" ? "…" : ""}</p>
                {state !== "waiting" && <p className="text-fg-muted">{step.detail}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite">{finished ? "Agent built" : steps[done]?.title}</p>
      {finished && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Link className={buttonClass("primary", "lg")} href={`${base}/publish`}>Publish to marketplace</Link>
          <Link className={buttonClass("secondary", "lg")} href={`${base}/test`}>Test agent</Link>
          <Link className={buttonClass("secondary", "lg")} href={`${base}/persona`}>Review persona</Link>
        </div>
      )}
    </section>
  );
}
