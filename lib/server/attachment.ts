import "server-only";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { ACCEPTED_FILE_EXTENSIONS, MAX_FILE_BYTES, MAX_FILE_CHARS } from "@/lib/config/publish";
import { ApiRequestError } from "./request";

export async function extractConversationFile(file: File): Promise<{ name: string; content: string; chars: number }> {
  if (!file.name || file.name.length > 255 || file.size === 0 || file.size > MAX_FILE_BYTES)
    throw new ApiRequestError("invalid_input", "Invalid attachment size or name.", 400);
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  if (!(ACCEPTED_FILE_EXTENSIONS as readonly string[]).includes(extension))
    throw new ApiRequestError("invalid_input", "Unsupported attachment type.", 415);
  const bytes = Buffer.from(await file.arrayBuffer());
  let content: string;
  try {
    if (extension === "pdf") {
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      content = (await extractText(pdf, { mergePages: true })).text;
    } else if (extension === "docx") content = (await mammoth.extractRawText({ buffer: bytes })).value;
    else content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch { throw new ApiRequestError("invalid_input", "Attachment could not be read.", 422); }
  content = content.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!content) throw new ApiRequestError("invalid_input", "Attachment has no readable text.", 422);
  if (content.length > MAX_FILE_CHARS) content = content.slice(0, MAX_FILE_CHARS);
  return { name: file.name, content, chars: content.length };
}
