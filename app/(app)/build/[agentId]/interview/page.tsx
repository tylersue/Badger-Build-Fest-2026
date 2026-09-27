"use client";

import { useBuilderAgent } from "@/components/app/builder";
import { InterviewView } from "@/components/app/interview-view";

export default function InterviewPage() {
  const { agent, isOwner } = useBuilderAgent();
  return agent ? <InterviewView agent={agent} isOwner={isOwner} /> : null;
}
