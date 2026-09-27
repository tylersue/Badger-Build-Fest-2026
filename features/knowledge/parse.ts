import { Worker } from "node:worker_threads";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import type { ServiceResult, SourceInput, SourceLimits, TextSegment } from "../../lib/contracts/phase2";
import { PARSER_WORKER_SOURCE } from "./parse-worker";

export type ParsedSource = { segments: TextSegment[]; pageCount: number | null; characterCount: number };
export type ParseInput = Pick<SourceInput, "fileOrText" | "name">;
const fail = (message: string): ServiceResult<ParsedSource> => ({ ok: false, error: { code: "invalid_input", message: `${message} Try a smaller file or paste plain text.`, retryable: false } });
const HARD_LIMITS = {
  maxFileBytes: 5 * 1024 * 1024,
  maxExtractedChars: 100_000,
  maxPdfPages: 100,
  parserTimeoutMs: 15_000,
  parserHeapMb: 128,
  maxDocxInflatedBytes: 20 * 1024 * 1024,
} as const;

/** Node-only. No file paths or URLs from the source are ever followed. */
export async function parseSource(input: ParseInput, limits: SourceLimits): Promise<ServiceResult<ParsedSource>> {
  if (![limits.maxFileBytes, limits.maxExtractedChars, limits.maxPdfPages, limits.parserTimeoutMs, limits.parserHeapMb, limits.maxDocxInflatedBytes].every(n => Number.isSafeInteger(n) && n > 0)) return fail("Invalid parser limits.");
  const bounded = { ...limits };
  for (const key of Object.keys(HARD_LIMITS) as (keyof typeof HARD_LIMITS)[]) bounded[key] = Math.min(limits[key], HARD_LIMITS[key]);
  if (!input || typeof input.name !== "string" || !input.name.trim() || (typeof input.fileOrText !== "string" && (!input.fileOrText || typeof input.fileOrText.arrayBuffer !== "function"))) return fail("The source input is invalid.");
  const pasted = typeof input.fileOrText === "string";
  const file = pasted ? null : input.fileOrText as File;
  const extension = pasted ? "txt" : input.name.toLowerCase().split(".").pop();
  const mimes: Record<string, string[]> = { pdf: ["application/pdf"], docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"], txt: ["text/plain"], md: ["text/markdown", "text/x-markdown", "text/plain"] };
  if (!extension || !mimes[extension] || (file?.type && !mimes[extension].includes(file.type.toLowerCase()))) return fail("Use a PDF, DOCX, TXT, or MD file with a matching file type.");
  if (file && (file.name !== input.name || !Number.isSafeInteger(file.size) || file.size > bounded.maxFileBytes)) return fail("The file name or size is invalid.");
  if (pasted && ((input.fileOrText as string).length > bounded.maxExtractedChars || Buffer.byteLength(input.fileOrText as string, "utf8") > bounded.maxFileBytes || !(input.fileOrText as string).isWellFormed())) return fail("Pasted text exceeds the limit or contains invalid Unicode.");
  let bytes: Uint8Array;
  try { bytes = file ? new Uint8Array(await file.arrayBuffer()) : new TextEncoder().encode(input.fileOrText as string); } catch { return fail("The file could not be read."); }
  if (!bytes.length || bytes.length > bounded.maxFileBytes) return fail("The source is empty or exceeds the file limit.");
  if (extension === "pdf" && Buffer.from(bytes.subarray(0, 5)).toString() !== "%PDF-") return fail("The PDF signature is invalid.");
  if (extension === "docx" && (bytes.length < 4 || Buffer.from(bytes.subarray(0, 4)).readUInt32LE() !== 0x04034b50)) return fail("The DOCX ZIP signature is invalid.");
  if (pasted || extension === "txt" || extension === "md") {
    try { const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) return fail("Text files must contain plain UTF-8 text."); } catch { return fail("The source is not valid UTF-8 text."); }
  }
  try {
    // Resolve installed Node packages explicitly; the worker never needs a TS loader or network/CDN.
    const resolve = createRequire(`${process.cwd()}/package.json`).resolve;
    const packages = { pdf: pathToFileURL(resolve("pdfjs-dist/legacy/build/pdf.mjs")).href, pdfWorker: pathToFileURL(resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")).href, mammoth: resolve("mammoth") };
    return await new Promise(resolveResult => {
      const worker = new Worker(PARSER_WORKER_SOURCE, { eval: true, workerData: { bytes, kind: extension, limits: bounded, packages }, resourceLimits: { maxOldGenerationSizeMb: bounded.parserHeapMb, maxYoungGenerationSizeMb: Math.min(16, bounded.parserHeapMb), stackSizeMb: 4 }, stdout: true, stderr: true });
      // Drain diagnostics without reflecting document content or parser errors to clients/logs.
      worker.stdout?.resume(); worker.stderr?.resume();
      let finished = false;
      const finish = (result: ServiceResult<ParsedSource>) => { if (finished) return; finished = true; clearTimeout(timer); void worker.terminate(); resolveResult(result); };
      const timer = setTimeout(() => finish(fail("Document parsing exceeded the time limit.")), bounded.parserTimeoutMs);
      worker.once("message", result => finish(result));
      worker.once("error", () => finish(fail("Document parsing failed or exceeded its memory limit.")));
      worker.once("exit", () => finish(fail("Document parsing stopped before extraction completed.")));
    });
  } catch { return fail("The document parser could not start."); }
}
