"use client";

import { useBuilderAgent } from "@/components/app/builder";
import { KnowledgeView } from "@/components/app/knowledge-view";
import { AnswerEditor } from "@/components/app/answer-editor";

export default function KnowledgePage() {
  const { agent, isOwner } = useBuilderAgent();
  return agent ? <KnowledgeView agent={agent} isOwner={isOwner}
    renderAnswerActions={(answer, onChange) => <AnswerEditor agentId={agent.id} answer={answer} isOwner={isOwner} onChange={onChange} />} /> : null;
}
