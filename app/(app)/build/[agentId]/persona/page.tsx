"use client";

import { useBuilderAgent } from "@/components/app/builder";
import { PersonaView } from "@/components/app/persona-view";

export default function PersonaPage() {
  const { agent, isOwner } = useBuilderAgent();
  return agent ? <PersonaView agent={agent} isOwner={isOwner} /> : null;
}
