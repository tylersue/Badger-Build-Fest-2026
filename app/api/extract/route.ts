/**
 * Hirer file extraction (CHAT-04, Phase 3 D-04). Multipart POST with one
 * `file` field; returns the plain text so the browser can attach it to a
 * conversation as untrusted context. PDF via unpdf, DOCX via mammoth, TXT and
 * MD as UTF-8. Nothing is stored on the server.
 */
import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { ACCEPTED_FILE_EXTENSIONS, MAX_FILE_BYTES, MAX_FILE_CHARS } from "@/lib/config/publish";

export const runtime = "nodejs";

type Extracted = { name: string; text: string; chars: number; pages: number | null; truncated: boolean };

export async function POST(request: Request): Promise<NextResponse<Extracted | { error: string }>> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Send the file as multipart form data." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: `Files must be under ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB.` }, { status: 413 });
  }

  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (!(ACCEPTED_FILE_EXTENSIONS as readonly string[]).includes(ext)) {
    return NextResponse.json({ error: `Use a ${ACCEPTED_FILE_EXTENSIONS.map((e) => e.toUpperCase()).join(", ")} file.` }, { status: 415 });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    let text = "";
    let pages: number | null = null;
    if (ext === "pdf") {
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const result = await extractText(pdf, { mergePages: true });
      text = result.text;
      pages = result.totalPages;
    } else if (ext === "docx") {
      text = (await mammoth.extractRawText({ buffer: bytes })).value;
    } else {
      text = bytes.toString("utf8");
    }

    const cleaned = text.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!cleaned) return NextResponse.json({ error: "No readable text found in that file." }, { status: 422 });
    const truncated = cleaned.length > MAX_FILE_CHARS;
    const kept = truncated ? cleaned.slice(0, MAX_FILE_CHARS) : cleaned;
    return NextResponse.json({ name: file.name, text: kept, chars: kept.length, pages, truncated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read that file.";
    return NextResponse.json({ error: `Could not read that file: ${message}` }, { status: 422 });
  }
}
