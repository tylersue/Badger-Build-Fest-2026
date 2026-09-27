"use client";

import { useBuilderAgent } from "@/components/app/builder";
import { SandboxView } from "@/components/app/sandbox-view";

export default function TestPage() {
  const { agent, isOwner } = useBuilderAgent();
  return agent ? <SandboxView agent={agent} isOwner={isOwner} /> : null;
}
