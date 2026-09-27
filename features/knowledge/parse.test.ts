import { describe, expect, it } from "vitest";
import { deflateRawSync } from "node:zlib";
import type { SourceLimits } from "../../lib/contracts/phase2";
import { parseSource } from "./parse";

const limits: SourceLimits = {
  maxSources: 10, maxFileBytes: 5 * 1024 * 1024, maxAgentBytes: 25 * 1024 * 1024,
  maxPdfPages: 100, maxExtractedChars: 100_000, maxActiveChunks: 1000,
  chunkTargetChars: 2000, chunkOverlapChars: 200, parserTimeoutMs: 15_000,
  parserHeapMb: 128, maxDocxInflatedBytes: 20 * 1024 * 1024,
};
const file = (bytes: Uint8Array, name: string, type: string) => new File([bytes as Uint8Array<ArrayBuffer>], name, { type });
const parseFile = (bytes: Uint8Array, name: string, type: string, overrides: Partial<SourceLimits> = {}) =>
  parseSource({ fileOrText: file(bytes, name, type), name }, { ...limits, ...overrides });

function pdf(pages: string[], encrypted = false): Uint8Array {
  const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  const pageRefs: string[] = [];
  for (const text of pages) {
    const pageId = objects.length + 1;
    const streamId = pageId + 1;
    pageRefs.push(`${pageId} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R >>`);
    const stream = `BT /F1 12 Tf 50 700 Td (${text}) Tj ET`;
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  }
  objects[1] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageRefs.join(" ")}] >>`;
  const encryptId = objects.length + 1;
  if (encrypted) objects.push("<< /Filter /Standard /V 1 /R 2 /O (01234567890123456789012345678901) /U (01234567890123456789012345678901) /P -4 >>");
  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(output));
    output += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) output += `${String(offset).padStart(10, "0")} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R ${encrypted ? `/Encrypt ${encryptId} 0 R` : ""} >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output);
}

function crc32(data: Buffer): number {
  let crc = -1;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ -1) >>> 0;
}

function zip(entries: Record<string, string>, declaredSize?: number): Uint8Array {
  const local: Buffer[] = [], central: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(entries)) {
    const nameBytes = Buffer.from(name);
    const plain = Buffer.from(text);
    const body = deflateRawSync(plain);
    const crc = crc32(plain);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(8, 8);
    header.writeUInt32LE(crc, 14); header.writeUInt32LE(body.length, 18); header.writeUInt32LE(plain.length, 22);
    header.writeUInt16LE(nameBytes.length, 26);
    local.push(header, nameBytes, body);
    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50, 0); directory.writeUInt16LE(20, 4); directory.writeUInt16LE(20, 6);
    directory.writeUInt16LE(8, 10); directory.writeUInt32LE(crc, 16);
    directory.writeUInt32LE(body.length, 20); directory.writeUInt32LE(declaredSize ?? plain.length, 24);
    directory.writeUInt16LE(nameBytes.length, 28); directory.writeUInt32LE(offset, 42);
    central.push(directory, nameBytes);
    offset += header.length + nameBytes.length + body.length;
  }
  const directoryBytes = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(entries).length, 8);
  end.writeUInt16LE(Object.keys(entries).length, 10); end.writeUInt32LE(directoryBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directoryBytes, end]);
}

const docx = (document: string, declaredSize?: number) => zip({
  "[Content_Types].xml": `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  "_rels/.rels": `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  "word/document.xml": `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${document}</w:body></w:document>`,
}, declaredSize);

describe("parseSource", () => {
  it("keeps real PDF page numbers and rejects image-only, oversized, and malformed PDFs", async () => {
    const result = await parseFile(pdf(["First page", "Second page"]), "pages.pdf", "application/pdf");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.segments.map(({ page, content }) => [page, content])).toEqual([[1, "First page"], [2, "Second page"]]);
    expect((await parseFile(pdf(["One", "Two"]), "pages.pdf", "application/pdf", { maxPdfPages: 1 })).ok).toBe(false);
    expect((await parseFile(pdf([""]), "scan.pdf", "application/pdf")).ok).toBe(false);
    const encrypted = await parseFile(pdf(["Secret"], true), "locked.pdf", "application/pdf");
    expect(encrypted.ok).toBe(false);
    if (!encrypted.ok) expect(encrypted.error.message).toMatch(/paste plain text/i);
    expect((await parseFile(Buffer.from("%PDF-broken"), "bad.pdf", "application/pdf")).ok).toBe(false);
  });

  it("preserves DOCX semantic headings and rejects inflated archives", async () => {
    const body = `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Strategy</w:t></w:r></w:p><w:p><w:r><w:t>Use examples.</w:t></w:r></w:p>`;
    const result = await parseFile(docx(body), "note.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.segments).toEqual([
      { content: "Strategy", page: null, headingPath: "Strategy" },
      { content: "Use examples.", page: null, headingPath: "Strategy" },
    ]);
    expect((await parseFile(docx(body, 30_000_000), "bomb.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")).ok).toBe(false);
  });

  it("rejects invalid UTF-8 and extracts inert Markdown with heading paths", async () => {
    expect((await parseFile(Uint8Array.of(0xff, 0xfe), "bad.txt", "text/plain")).ok).toBe(false);
    const result = await parseFile(Buffer.from("# Alpha\nText <script>alert(1)</script>\n\nBeta\n----\nMore"), "note.md", "text/markdown");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.segments.map(segment => segment.headingPath)).toEqual(["Alpha", "Alpha", "Alpha > Beta", "Alpha > Beta"]);
      expect(result.data.segments[1].content).toContain("<script>");
    }
    expect((await parseSource({ fileOrText: "   ", name: "paste.txt" }, limits)).ok).toBe(false);
  });
});
