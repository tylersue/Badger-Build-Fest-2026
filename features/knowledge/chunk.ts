import type { SourceLimits, TextSegment } from "../../lib/contracts/phase2";

/** Additional coordinates are optional so document TextSegments remain directly usable. */
export type ChunkSegment = TextSegment & {
  question?: string | null;
  sourceId?: string | null;
  answerId?: string | null;
};
export type TextChunk = ChunkSegment & { ordinal: number; question: string | null };
export type ChunkOptions = Partial<Pick<SourceLimits, "chunkTargetChars" | "chunkOverlapChars" | "maxExtractedChars">>;

const DEFAULT_TARGET = 2_000;
const DEFAULT_OVERLAP = 200;
const MAX_SEGMENTS = 10_000;
const MAX_OUTPUT_CHARS = 2_000_000;

/** Every chunk inherits one source coordinate tuple; quota checks use the returned count. */
export function chunkSegments(segments: readonly ChunkSegment[], options: ChunkOptions = {}): TextChunk[] {
  const target = options.chunkTargetChars ?? DEFAULT_TARGET;
  const overlap = options.chunkOverlapChars ?? DEFAULT_OVERLAP;
  const maxExtracted = Math.min(options.maxExtractedChars ?? 100_000, 100_000);
  if (!Number.isSafeInteger(target) || target < 1 || target > DEFAULT_TARGET ||
      !Number.isSafeInteger(overlap) || overlap < 0 || overlap >= target || overlap > DEFAULT_OVERLAP ||
      !Number.isSafeInteger(maxExtracted) || maxExtracted < 1 || !Array.isArray(segments) || segments.length > MAX_SEGMENTS) {
    throw new RangeError("Invalid chunk limits or too many segments.");
  }

  const chunks: TextChunk[] = [];
  let inputChars = 0;
  let outputChars = 0;
  let current: string[] = [];
  let currentLength = 0;
  let coordinate: Omit<TextChunk, "content" | "ordinal"> | null = null;

  function emit(): void {
    if (!current.length || !coordinate) return;
    const content = current.join("\n\n");
    outputChars += content.length + (coordinate.headingPath?.length ?? 0) + (coordinate.question?.length ?? 0) + 128;
    if (outputChars > MAX_OUTPUT_CHARS || chunks.length >= MAX_SEGMENTS) throw new RangeError("Chunk output exceeds the limit.");
    chunks.push({ ...coordinate, ordinal: chunks.length, content });
    current = [];
    currentLength = 0;
  }

  function carry(): string[] {
    const kept: string[] = [];
    let length = 0;
    for (let i = current.length - 1; i >= 0; i--) {
      const additional = current[i].length + (kept.length ? 2 : 0);
      if (length + additional > overlap) break;
      kept.unshift(current[i]);
      length += additional;
    }
    return kept;
  }

  for (const segment of segments) {
    if (!segment || typeof segment.content !== "string" || !segment.content.isWellFormed() ||
        (segment.page !== null && (!Number.isSafeInteger(segment.page) || segment.page < 1)) ||
        (segment.headingPath !== null && (typeof segment.headingPath !== "string" || segment.headingPath.length > 4096)) ||
        (segment.question != null && (typeof segment.question !== "string" || segment.question.length > 1000)) ||
        (segment.sourceId != null && (typeof segment.sourceId !== "string" || segment.sourceId.length > 256)) ||
        (segment.answerId != null && (typeof segment.answerId !== "string" || segment.answerId.length > 256))) {
      throw new TypeError("Invalid text segment or source coordinates.");
    }
    const content = segment.content.replace(/\r\n?/g, "\n").trim();
    if (!content) continue;
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(content)) throw new TypeError("Segments must contain plain text.");
    inputChars += content.length;
    if (inputChars > maxExtracted) throw new RangeError("Source text exceeds the extraction limit.");
    const next = {
      page: segment.page,
      headingPath: segment.headingPath,
      question: segment.question ?? null,
      sourceId: segment.sourceId ?? null,
      answerId: segment.answerId ?? null,
    };
    if (coordinate && Object.keys(next).some(key => coordinate![key as keyof typeof next] !== next[key as keyof typeof next])) emit();
    coordinate = next;

    for (const paragraph of content.split(/\n\s*\n/).map((value: string) => value.trim()).filter(Boolean)) {
      if (paragraph.length > target) {
        emit();
        for (let start = 0; start < paragraph.length;) {
          let end = Math.min(start + target, paragraph.length);
          if (end < paragraph.length && /[\uD800-\uDBFF]/.test(paragraph[end - 1])) end--;
          if (end === start) throw new RangeError("Chunk target cannot fit a Unicode character.");
          current = [paragraph.slice(start, end)];
          currentLength = end - start;
          emit();
          start = end;
        }
        continue;
      }
      if (current.length && currentLength + 2 + paragraph.length > target) {
        const overlapParagraphs = carry();
        emit();
        const overlapLength = overlapParagraphs.join("\n\n").length;
        if (overlapLength + 2 + paragraph.length <= target) {
          current = overlapParagraphs;
          currentLength = overlapLength;
        }
      }
      if (current.length) currentLength += 2;
      current.push(paragraph);
      currentLength += paragraph.length;
    }
  }
  emit();
  return chunks;
}
