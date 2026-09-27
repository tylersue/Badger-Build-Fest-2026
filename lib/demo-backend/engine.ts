/**
 * Hardcoded "brain" for the demo backend: the scripted interview, persona
 * drafting from answers, keyword retrieval over the expert's own words, and
 * answer composition with citations. No model calls.
 */
import type { Agent, Chunk, Message, PersonaForm } from "@/lib/types";
import type { EvidenceCitation, PersonaFieldName, PersonaState, RetrievedChunk, ToolStep } from "@/lib/contracts/phase2";
import { CHUNKS as SEED_CHUNKS, CONVERSATIONS, MESSAGES, WEB_FALLBACK } from "./seed";
import { EXPERT_MEDIA, mediaById, mediaUrl, type ExpertMedia } from "./media";

export const INTERVIEW_LENGTH = 3;

export function topicOf(agent: Agent): string {
  const name = agent.persona.name;
  const tail = name.includes("·") ? name.split("·").slice(1).join("·").trim() : name.trim();
  if (!tail) return "your field";
  const [word, ...rest] = tail.split(" ");
  return [word === word.toUpperCase() ? word : word[0].toLowerCase() + word.slice(1), ...rest].join(" ");
}
export const firstName = (displayName: string) => displayName.split(" ")[0] || displayName;
const capitalize = (text: string) => text ? text[0].toUpperCase() + text.slice(1) : text;
export function firstSentences(text: string, count = 1): string {
  const sentences = text.replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]+["”]?|[^.!?]+$/g) ?? [text];
  return sentences.slice(0, count).map((sentence) => sentence.trim()).join(" ");
}

/** Three questions that push past the obvious answer; each follow-up echoes the last answer. */
export function interviewQuestion(agent: Agent, index: number, previousAnswer?: string): string {
  const topic = topicOf(agent);
  if (index === 0) return `Let's start with what founders bring you most about ${topic}. What's the question you hear every week, and how do you actually answer it?`;
  if (index === 1) return `${echo(previousAnswer)}Walk me through a real founder you worked with on this. What did you notice first, and what did you tell them to do?`;
  return `${echo(previousAnswer)}Now the hard part. Where does that advice break? Tell me about a time it would have been wrong, or a red flag that means a founder needs more than a playbook.`;
}
function echo(answer?: string): string {
  if (!answer) return "";
  // Quote the first statement, not a question the expert asked themselves.
  const sentences = answer.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+/g) ?? [answer];
  const sentence = sentences.map((s) => s.trim()).find((s) => !s.endsWith("?"));
  if (!sentence) return "";
  const words = sentence.split(" ").filter(Boolean);
  if (words.length < 4) return "";
  return words.length <= 16 ? `You said "${sentence}" ` : `You said "${words.slice(0, 12).join(" ")}…" `;
}

/** Suggested persona fields after each answer; only blank fields are filled directly. */
export function personaDraft(agent: Agent, expertName: string, answers: string[]): Partial<PersonaForm> {
  const topic = topicOf(agent);
  const first = firstName(expertName);
  const draft: Partial<PersonaForm> = {};
  if (answers.length >= 1) {
    draft.headline = `${capitalize(topic)}, from someone who has done it`;
    draft.description = `Answers founders' questions about ${topic} the way ${first} would, drawn from ${first}'s own interview answers.`;
    draft.greeting = `Hi, I'm ${first}'s agent. Ask me anything about ${topic}.`;
    draft.exampleQuestions = [`What's the first thing I should get right about ${topic}?`];
  }
  if (answers.length >= 2) {
    const statements = answers[0].replace(/\s+/g, " ").match(/[^.!?]+[.!?]+/g)?.map((x) => x.trim()).filter((x) => !x.endsWith("?")) ?? [];
    draft.howIWork = (statements[0] ?? firstSentences(answers[0])).slice(0, 240);
    draft.exampleQuestions = [...draft.exampleQuestions!, `Can you review my plan for ${topic}?`];
  }
  if (answers.length >= 3) {
    draft.always = ["Cite the interview answer it came from", "Name the riskiest assumption"];
    draft.never = ["Guarantee an outcome", "Give legal or investment advice"];
    draft.exampleQuestions = [...draft.exampleQuestions!, "What's a red flag I should watch for?"];
  }
  return draft;
}

const FIELDS: PersonaFieldName[] = ["name", "category", "headline", "description", "howIWork", "always", "never", "exampleQuestions", "greeting"];
const empty = (value: unknown) => Array.isArray(value) ? value.length === 0 : !String(value ?? "").trim();
export function personaState(form: PersonaForm, origin: "expert" | "interview"): PersonaState {
  const fields = Object.fromEntries(FIELDS.map((field) => [field, { value: form[field], origin: empty(form[field]) ? "blank" : origin,
    version: 1, evidenceRevisionIds: [], pendingSuggestion: null }])) as unknown as PersonaState["fields"];
  return { fields, version: 1, promptMode: "generated", customPrompt: null, promptVersion: 1 };
}
export function formOf(state: PersonaState): PersonaForm {
  return Object.fromEntries(FIELDS.map((field) => [field, state.fields[field].value])) as unknown as PersonaForm;
}
/** Blank or interview-owned fields take the draft; expert-edited fields get a pending suggestion instead. */
export function applyDraft(state: PersonaState, draft: Partial<PersonaForm>, revisionId: string): PersonaState {
  const fields = { ...state.fields } as Record<PersonaFieldName, PersonaState["fields"][PersonaFieldName]>;
  let changed = false;
  for (const [name, value] of Object.entries(draft) as [PersonaFieldName, PersonaForm[PersonaFieldName]][]) {
    const current = fields[name];
    if (JSON.stringify(current.value) === JSON.stringify(value)) continue;
    changed = true;
    fields[name] = (current.origin === "expert"
      ? { ...current, pendingSuggestion: { value, evidenceRevisionIds: [revisionId], observedVersion: current.version } }
      : { ...current, value, origin: "interview", version: current.version + 1, evidenceRevisionIds: [revisionId] }) as typeof current;
  }
  return changed ? { ...state, fields: fields as PersonaState["fields"], version: state.version + 1 } : state;
}

// Retrieval ---------------------------------------------------------------------------------------

export type KnowledgeChunk = { id: string; agentId: string; sourceId: string; revisionId: string;
  sourceType: "interview" | "document"; sourceName: string; content: string; question: string | null;
  page: number | null; headingPath: string | null };

const STOP = new Set(("the and for are but not you your yours with this that what when where which who whom how why can could should would will just than then them they their there here have has had was were been being about into from over under very more most some such only also any all our ours out get got its it's i'm i've don't does did doing one two first make makes made like want need know think tell ask asked").split(" "));
function terms(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9$%\s]/g, " ").split(/\s+/)
    .filter((word) => word.length > 2 && !STOP.has(word))
    .map((word) => word.length > 5 && word.endsWith("ing") ? word.slice(0, -3)
      : word.length > 4 && word.endsWith("es") ? word.slice(0, -2)
      : word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word);
}
function overlap(query: string[], text: string): number {
  if (!query.length) return 0;
  const bag = new Set(terms(text));
  return query.filter((word) => bag.has(word)).length / query.length;
}
export function retrieve(chunks: KnowledgeChunk[], query: string, k = 3): (KnowledgeChunk & { score: number })[] {
  const words = [...new Set(terms(query))];
  // An answer whose interview question matches ranks above one that only shares words in passing.
  return chunks.map((chunk) => ({ ...chunk, score: Math.min(0.99, overlap(words, `${chunk.content} ${chunk.headingPath ?? ""}`) + 0.5 * overlap(words, chunk.question ?? "")) }))
    .filter((chunk) => chunk.score >= 0.2).sort((a, b) => b.score - a.score).slice(0, k);
}
/** For an uploaded document: rank the expert's answers by how much of each one the document touches. */
export function retrieveForDocument(chunks: KnowledgeChunk[], document: string, k = 3): (KnowledgeChunk & { score: number })[] {
  return chunks.map((chunk) => ({ ...chunk, score: Math.min(0.99, overlap([...new Set(terms(`${chunk.question ?? ""} ${chunk.content}`))], document)) }))
    .filter((chunk) => chunk.score >= 0.12).sort((a, b) => b.score - a.score).slice(0, k);
}
export function seedKnowledge(chunk: Chunk, sourceName: string): KnowledgeChunk {
  return { id: chunk.id, agentId: chunk.agentId, sourceId: chunk.sourceId, revisionId: `rev-${chunk.id}`,
    sourceType: chunk.question ? "interview" : "document", sourceName, content: chunk.content,
    question: chunk.question, page: chunk.page, headingPath: chunk.headingPath };
}

// Answers -----------------------------------------------------------------------------------------

export type ComposedAnswer = { text: string; citations: EvidenceCitation[]; sources: RetrievedChunk[];
  steps: Omit<ToolStep, "operationId">[]; gap: string | null };

const asRetrieved = (chunk: KnowledgeChunk & { score?: number }): RetrievedChunk => ({ id: chunk.id, agentId: chunk.agentId,
  revisionId: chunk.revisionId, sourceId: chunk.sourceId, sourceType: chunk.sourceType, sourceName: chunk.sourceName,
  content: chunk.content, question: chunk.question, page: chunk.page, headingPath: chunk.headingPath, score: chunk.score ?? 0.9 });
const asCitation = (chunk: KnowledgeChunk, ordinal: number): EvidenceCitation => ({ evidenceId: `ev-${chunk.id}`, ordinal,
  excerpt: firstSentences(chunk.content, 2), sourceName: chunk.sourceName, sourceType: chunk.sourceType, sourceId: chunk.sourceId,
  revisionId: chunk.revisionId, chunkId: chunk.id, question: chunk.question, page: chunk.page, headingPath: chunk.headingPath, historical: false });

/** Seeded founder questions keep their hand-written answers so the showcase questions read best. */
const SCRIPTED = MESSAGES.flatMap((message, index) => {
  const reply = MESSAGES[index + 1];
  const conversation = CONVERSATIONS.find((c) => c.id === message.conversationId);
  return message.role === "user" && reply?.role === "assistant" && reply.conversationId === message.conversationId && conversation
    ? [{ agentId: conversation.agentId, question: message.content, reply }] : [];
});
function scripted(agentId: string, question: string): Message | null {
  const words = new Set(terms(question));
  let best: { reply: Message; score: number } | null = null;
  for (const item of SCRIPTED.filter((s) => s.agentId === agentId)) {
    const theirs = new Set(terms(item.question));
    const shared = [...words].filter((word) => theirs.has(word)).length;
    const score = shared / Math.max(words.size, theirs.size, 1);
    if (score >= 0.6 && (!best || score > best.score)) best = { reply: item.reply, score };
  }
  return best?.reply ?? null;
}

// Voice & tone ------------------------------------------------------------------------------------

/** How the agent talks back. Set from the persona's Voice & tone section or by plain-language feedback in Test. */
export type AnswerStyle = "voice" | "concise" | "bullets" | "action";
export const STYLE_LABELS: Record<AnswerStyle, string> = {
  voice: "Speaks in first person, as the expert",
  concise: "Short answers: key point first",
  bullets: "Formats advice as a short list",
  action: "Ends with one concrete next step",
};

/** Tone traits drafted from how the expert actually answered the interview. */
export function toneFromAnswers(answers: string[]): string[] {
  const text = answers.join(" ");
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const avgWords = text.split(/\s+/).length / Math.max(sentences.length, 1);
  const tone: string[] = [];
  if (/\b(stop|never|always|must|has to|don't|no exceptions)\b/i.test(text)) tone.push("Direct");
  if (/\d/.test(text)) tone.push("Specific, with numbers");
  if (/\b(a student|a founder|last (week|month|semester|year)|we made|i asked|one time)\b/i.test(text)) tone.push("Teaches with real stories");
  if (avgWords < 18) tone.push("Plain-spoken");
  if (/\b(red flag|breaks|wrong|excuse)\b/i.test(text)) tone.push("Honest about limits");
  return tone.length ? tone.slice(0, 4) : ["Practical", "Encouraging"];
}

export type FeedbackFix = { styles: AnswerStyle[]; always: string[]; never: string[]; tone: string[]; changes: string[] };
const FEEDBACK = /(i don'?t like|don'?t like|i hate|i'?d rather|too (long|wordy|short|formal|robotic|vague|generic)|make (it|the|your|answers?|responses?)|it should|should (be|always|never|sound)|^stop |^don'?t |^never |^always |shorter|more (direct|concise|actionable|specific|casual|friendly)|less (formal|wordy)|instead of|keep it|talk like|sound more|fix (it|this|that)|change (it|this|the)|sounds? (like|robotic)|word for word)/i;
/** Plain-language feedback from the expert in Test ("I don't like…") becomes persona and style changes. */
export function parseFeedback(text: string, expertName: string): FeedbackFix | null {
  const t = text.trim().toLowerCase();
  if (!FEEDBACK.test(t)) return null;
  if (/^(who|what|where|when|why|how|should i|can i|do i|is |are |will )/.test(t) && t.endsWith("?") && !/don'?t like/.test(t)) return null;
  const first = firstName(expertName);
  const fix: FeedbackFix = { styles: [], always: [], never: [], tone: [], changes: [] };
  if (/(quot|word for word|verbatim|robotic|first person|like i would|like me|my voice|sound like)/.test(t)) {
    fix.styles.push("voice"); fix.always.push(`Speak in first person, the way ${first} would`); fix.tone.push("Conversational");
    fix.changes.push(`Answers now speak in ${first}'s voice, in first person, instead of quoting ${first}`);
  }
  if (/(too long|keep it short|short answers|shorter|concise|wordy|rambl|to the point|brief|get to it)/.test(t)) {
    fix.styles.push("concise"); fix.always.push("Lead with the key point and keep it short"); fix.tone.push("Concise");
    fix.changes.push("Answers are now short: the key point first, then one supporting detail");
  }
  if (/(bullet|list|wall of text|hard to read|skim)/.test(t)) {
    fix.styles.push("bullets"); fix.always.push("Format advice as a short list");
    fix.changes.push("Answers are now formatted as a short list");
  }
  if (/(action|next step|what to do|homework|concrete|practical)/.test(t)) {
    fix.styles.push("action"); fix.always.push("End with one concrete next step"); fix.tone.push("Action-oriented");
    fix.changes.push("Every answer now ends with one concrete next step");
  }
  if (!fix.changes.length) {
    const rule = text.trim().replace(/^(i don'?t like (it )?(when|that|how)?|i'?d rather (it|you)?|it should|please|can you)\s*/i, "").replace(/[.!]+$/, "");
    const clean = rule ? rule[0].toUpperCase() + rule.slice(1) : text.trim();
    if (/^(don'?t|never|stop|no )/i.test(clean) || /don'?t like/i.test(text)) fix.never.push(clean); else fix.always.push(clean);
    fix.changes.push(`Added to the persona: "${clean}"`);
  }
  return fix;
}

const NEXT_VERBS = /\b(ask|write|call|talk|make|pick|cut|move|start|stop|go|test|list|name|charge|raise|put|send|build|find)\b/i;
/** One concrete action from the expert's words that the answer hasn't already said. */
function nextStep(content: string, shown: string): string {
  const sentences = (content.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()) ?? [])
    .filter((sentence) => !shown.includes(sentence) && !sentence.endsWith("?"));
  for (const sentence of sentences) {
    const rule = sentence.match(/^(?:Every|Each) founder I (?:mentor|work with|coach) (?:has to|must|needs to) (.+)$/i);
    if (rule) return rule[1][0].toUpperCase() + rule[1].slice(1);
    const told = sentence.match(/^I (?:tell|ask|want|make) (?:founders|them|people|everyone|every founder)(?: to)? (.+)$/i);
    // "I tell founders to stop building…" becomes advice addressed to the founder reading it.
    if (told) return (told[1][0].toUpperCase() + told[1].slice(1)).replace(/\btheir\b/g, "your").replace(/\bthey\b/g, "you").replace(/\bthem\b/g, "you");
    if (NEXT_VERBS.test(sentence.split(" ")[0])) return sentence;
  }
  const any = sentences.find((sentence) => NEXT_VERBS.test(sentence) && !/^I /.test(sentence));
  return any ?? "Try this with one real customer this week and write down what changes.";
}
const sentencesOf = (text: string) => text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+["”]?|[^.!?]+$/g)?.map((s) => s.trim()) ?? [text];

const KIND_LABEL: Record<ExpertMedia["kind"], string> = { Essay: "essay", Podcast: "podcast episode", Talk: "talk", Newsletter: "newsletter" };
export const mediaCitation = (item: ExpertMedia, ordinal: number): EvidenceCitation => ({ evidenceId: `ev-media-${item.id}`, ordinal,
  excerpt: item.excerpt, sourceName: `${item.kind} · ${item.outlet}`, sourceType: "document", sourceId: `media-${item.id}`,
  revisionId: `rev-media-${item.id}`, chunkId: `media-${item.id}`, question: null, page: null, headingPath: item.title, historical: false, url: mediaUrl(item) });
/** The expert's published piece that best matches the question, if the expert has one. */
function mediaFor(agentId: string, question: string): ExpertMedia | null {
  const words = [...new Set(terms(question))];
  const own = EXPERT_MEDIA.filter((item) => item.agentId === agentId);
  if (!own.length) return null;
  return own.map((item) => ({ item, score: overlap(words, `${item.title} ${item.keywords}`) }))
    .sort((a, b) => b.score - a.score)[0].item;
}
/** "Goes deeper" line plus its citation, appended after the answer body. */
function withMedia(answer: ComposedAnswer, agentId: string, question: string, first: string): ComposedAnswer {
  const item = mediaFor(agentId, question);
  if (!item) return { ...answer, text: `${answer.text}\n\nIf your situation is different, ${first}'s contact link is at the top of this chat.` };
  if (answer.citations.some((c) => c.evidenceId === `ev-media-${item.id}`)) return answer;
  const ordinal = Math.max(0, ...answer.citations.map((c) => c.ordinal)) + 1;
  return { ...answer, text: `${answer.text}

${first} goes deeper on this in the ${KIND_LABEL[item.kind]} "${item.title}" [${ordinal}].`,
    citations: [...answer.citations, mediaCitation(item, ordinal)] };
}

export function composeAnswer(input: { agent: Agent; expertName: string; question: string; knowledge: KnowledgeChunk[];
  attachment?: { name: string; text: string } | null; now: string; styles?: AnswerStyle[] }): ComposedAnswer {
  const { agent, question, knowledge, attachment } = input;
  const first = firstName(input.expertName);
  const styles = new Set(input.styles ?? []);
  const script = attachment || styles.size ? null : scripted(agent.id, question);
  if (script) {
    const legacy = script.citations as { n: number; chunkId: string | null; url?: string | null }[];
    const cited = legacy.map((citation) => {
      const chunk = SEED_CHUNKS.find((item) => item.id === citation.chunkId);
      const found = chunk && knowledge.find((item) => item.id === chunk.id);
      return found ? { ordinal: citation.n, chunk: found } : null;
    }).filter((item): item is { ordinal: number; chunk: KnowledgeChunk } => item !== null);
    const published = legacy.flatMap((citation) => {
      const item = citation.url ? mediaById(citation.url.replace("/sources/", "")) : undefined;
      return item ? [mediaCitation(item, citation.n)] : [];
    });
    return { text: script.content, citations: [...cited.map((item) => asCitation(item.chunk, item.ordinal)), ...published],
      sources: cited.map((item) => asRetrieved(item.chunk)), steps: [], gap: null };
  }
  const hits = attachment ? retrieveForDocument(knowledge, `${question} ${attachment.text.slice(0, 6000)}`) : retrieve(knowledge, question, 3);
  if (attachment) return reviewAttachment(first, attachment, hits);
  if (!hits.length) return webFallback(agent, first, question, input.now);
  const [top, ...rest] = hits;
  const second = styles.has("concise") ? [] : rest.filter((hit) => hit.score >= 0.25).slice(0, 1);
  const used = [top, ...second];
  if (!styles.size) {
    const lead = top.sourceType === "document"
      ? `From ${first}'s ${top.sourceName}${top.page ? ` (page ${top.page})` : ""}: ${top.content} [1]`
      : `In ${first}'s words: "${top.content}" [1]`;
    const more = second.map((hit) => `\n\n${first} also said: "${firstSentences(hit.content, 2)}" [2]`).join("");
    return withMedia({ text: `${lead}${more}`, citations: used.map((hit, index) => asCitation(hit, index + 1)),
      sources: hits.map(asRetrieved), steps: [], gap: null }, agent.id, question, first);
  }
  // Styled answers: the persona's Voice & tone decides how the same evidence is said.
  const core = styles.has("concise") ? firstSentences(top.content, 2) : top.content;
  const body = styles.has("bullets")
    ? sentencesOf(core).map((sentence, index, all) => `- ${sentence}${index === all.length - 1 ? " [1]" : ""}`).join("\n")
    : `${core} [1]`;
  const lead = styles.has("voice") ? body : styles.has("bullets") ? `From ${first}'s interview:\n${body}` : `In ${first}'s words: "${core}" [1]`;
  const more = second.map((hit) => styles.has("voice")
    ? `\n\n${firstSentences(hit.content, 2)} [2]` : `\n\n${first} also said: "${firstSentences(hit.content, 2)}" [2]`).join("");
  const close = styles.has("action") ? `\n\nNext step: ${nextStep(used.map((hit) => hit.content).join(" "), `${lead}${more}`)}`
    : styles.has("concise") ? "" : `\n\nIf your situation is different, ${first}'s contact link is at the top of this chat.`;
  const styled: ComposedAnswer = { text: `${lead}${more}${close}`, citations: used.map((hit, index) => asCitation(hit, index + 1)),
    sources: hits.map(asRetrieved), steps: [], gap: null };
  return styles.has("concise") ? styled : withMedia(styled, agent.id, question, first);
}

function reviewAttachment(first: string, attachment: { name: string; text: string }, hits: (KnowledgeChunk & { score: number })[]): ComposedAnswer {
  const words = attachment.text.split(/\s+/).filter(Boolean).length;
  const sentences = attachment.text.replace(/\s+/g, " ").match(/[^.!?\n]+[.!?]?/g) ?? [];
  const evidence = sentences.map((s) => s.trim()).find((s) => /\d/.test(s) && s.length > 12);
  const used = hits.slice(0, 3);
  const bullets = used.map((hit, index) => `- ${firstSentences(hit.content, 2)} [${index + 1}]`).join("\n");
  const evidenceLine = evidence
    ? `The strongest evidence in your document is "${evidence.slice(0, 160)}"${/[.!?]$/.test(evidence.slice(0, 160)) ? "" : "."} Lead with it.`
    : `Your document doesn't include a single number. ${first} will always ask for evidence: customers, usage, revenue, or a date.`;
  const text = `I read ${attachment.name} (${words.toLocaleString()} words) and checked it against ${first}'s own answers.\n\n${evidenceLine}\n\n${
    used.length ? `What ${first} would push on:\n${bullets}` : `${first}'s knowledge doesn't cover the specifics of this document yet, so treat this as a first pass and use the contact link for a full review.`}`;
  return { text, citations: used.map((hit, index) => asCitation(hit, index + 1)), sources: hits.map(asRetrieved), steps: [], gap: null };
}

function webFallback(agent: Agent, first: string, question: string, now: string): ComposedAnswer {
  const web = WEB_FALLBACK[agent.persona.category];
  const citation: EvidenceCitation = { evidenceId: `ev-web-${agent.id}`, ordinal: 1, excerpt: web.text, sourceName: web.site,
    sourceType: "web", title: web.title, url: web.url, retrievedAt: now };
  return {
    text: `${first}'s interview and documents don't cover this yet, so I searched online. ${web.text} [1]\n\nFor advice specific to your startup, ask ${first} directly with the contact link at the top.`,
    citations: [citation], sources: [], gap: `${first} hasn't covered this in the interview or uploaded documents. The answer below comes from an online source, not from ${first}.`,
    steps: [
      { id: "step-search", sequence: 0, kind: "search", status: "complete", query: question.slice(0, 120) },
      { id: "step-read", sequence: 1, kind: "page-read", status: "complete", title: web.title, url: web.url },
    ],
  };
}

/** Raw model cost in credits for a composed answer (1 credit = 1 cent). */
export const rawCostCredits = (text: string) => Math.round((1.2 + text.length / 800) * 100) / 100;
