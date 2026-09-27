import { agentById, allConversations, messagesFor, type DemoState } from "@/lib/demo-store";
import type { Message } from "@/lib/types";

export const TOP_QUESTIONS_LIMIT = 5;
export const QUESTION_DISPLAY_MAX = 120;

export function normalizeQuestion(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim().replace(/[?!.]+$/g, "").trim();
}

export type AgentInsights = {
  agentId: string;
  conversations: number;
  messages: number;
  questionsAsked: number;
  thumbsUp: number;
  thumbsDown: number;
  sharedTranscripts: number;
  topQuestions: { text: string; count: number; lastAskedAt: string }[];
};

export function agentInsights(s: DemoState, agentId: string): AgentInsights {
  const conversations = allConversations(s).filter((conversation) => conversation.agentId === agentId);
  const allMessages = conversations.flatMap((conversation) => messagesFor(s, conversation.id));
  const questions = new Map<string, { text: string; count: number; lastAskedAt: string }>();

  for (const message of allMessages) {
    if (message.role !== "user") continue;
    const normalized = normalizeQuestion(message.content);
    const existing = questions.get(normalized);
    if (existing) {
      existing.count += 1;
      if (message.createdAt > existing.lastAskedAt) {
        existing.lastAskedAt = message.createdAt;
        existing.text = message.content;
      }
    } else {
      questions.set(normalized, { text: message.content, count: 1, lastAskedAt: message.createdAt });
    }
  }

  const topQuestions = [...questions.entries()]
    .sort(([aKey, a], [bKey, b]) => b.count - a.count || b.lastAskedAt.localeCompare(a.lastAskedAt) || aKey.localeCompare(bKey))
    .slice(0, TOP_QUESTIONS_LIMIT)
    .map(([, question]) => ({
      ...question,
      text: question.text.length > QUESTION_DISPLAY_MAX ? `${question.text.slice(0, QUESTION_DISPLAY_MAX - 1)}…` : question.text,
    }));

  return {
    agentId,
    conversations: conversations.length,
    messages: allMessages.length,
    questionsAsked: allMessages.filter((message) => message.role === "user").length,
    thumbsUp: allMessages.filter((message) => message.role === "assistant" && message.feedback === "up").length,
    thumbsDown: allMessages.filter((message) => message.role === "assistant" && message.feedback === "down").length,
    sharedTranscripts: conversations.filter((conversation) => conversation.shareTranscript).length,
    topQuestions,
  };
}

export type SharedTranscript = { conversationId: string; agentId: string; agentName: string; title: string; createdAt: string; messages: Message[] };

export function sharedTranscriptsFor(s: DemoState, expertId: string): SharedTranscript[] {
  return allConversations(s)
    .filter((conversation) => conversation.shareTranscript && agentById(s, conversation.agentId)?.ownerId === expertId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .flatMap((conversation) => {
      const agent = agentById(s, conversation.agentId);
      if (!agent) return [];
      return [{
        conversationId: conversation.id,
        agentId: agent.id,
        agentName: agent.persona.name,
        title: conversation.title,
        createdAt: conversation.createdAt,
        messages: messagesFor(s, conversation.id),
      }];
    });
}
