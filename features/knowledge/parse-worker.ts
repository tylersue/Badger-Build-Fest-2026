/** Self-contained JavaScript keeps worker execution independent of TS loaders and bundler chunk paths. */
export const PARSER_WORKER_SOURCE = String.raw`
const { parentPort, workerData } = require('node:worker_threads');
const { inflateRawSync } = require('node:zlib');
const { bytes, kind, limits, packages } = workerData;
const segments = [];
let characterCount = 0;
let outputChars = 0;
let pageCount = null;
const headings = [];
function reject(message) { throw new Error(message); }
function add(content, page = null, headingPath = null) {
  content = content.replace(/\r\n?/g, '\n').trim();
  if (!content) return;
  characterCount += content.length;
  outputChars += content.length + (headingPath?.length || 0) + 64;
  if (characterCount > limits.maxExtractedChars || outputChars > 1000000 || segments.length >= 10000 || (headingPath && headingPath.length > 4096)) reject('Extracted text exceeds the source limit.');
  segments.push({ content, page, headingPath });
}
function heading(text, level) { headings.length = level; headings[level - 1] = text; }
function headingPath() { return headings.filter(Boolean).join(' > ') || null; }
function validateZip(buffer) {
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50 && i + 22 + buffer.readUInt16LE(i + 20) === buffer.length) { eocd = i; break; }
  }
  if (eocd < 0) reject('The DOCX ZIP directory is invalid.');
  const count = buffer.readUInt16LE(eocd + 10), size = buffer.readUInt32LE(eocd + 12), start = buffer.readUInt32LE(eocd + 16);
  if (buffer.readUInt16LE(eocd + 4) || buffer.readUInt16LE(eocd + 6) || count !== buffer.readUInt16LE(eocd + 8) || count > 2048 || !count || start + size !== eocd) reject('The DOCX archive has unsupported or excessive entries.');
  let cursor = start, inflated = 0;
  const names = new Set(), ranges = [];
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > eocd || buffer.readUInt32LE(cursor) !== 0x02014b50) reject('The DOCX ZIP directory is invalid.');
    const flags = buffer.readUInt16LE(cursor + 8), method = buffer.readUInt16LE(cursor + 10), compressed = buffer.readUInt32LE(cursor + 20), expanded = buffer.readUInt32LE(cursor + 24);
    const nameSize = buffer.readUInt16LE(cursor + 28), extraSize = buffer.readUInt16LE(cursor + 30), commentSize = buffer.readUInt16LE(cursor + 32), local = buffer.readUInt32LE(cursor + 42);
    const end = cursor + 46 + nameSize + extraSize + commentSize;
    if (end > eocd || !nameSize || flags & 1 || (method !== 0 && method !== 8) || buffer.readUInt16LE(cursor + 34) || local + 30 > start) reject('The DOCX archive is encrypted or malformed.');
    const name = new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(cursor + 46, cursor + 46 + nameSize));
    if (names.has(name) || name.includes('..') || name.includes('\\') || name.startsWith('/') || name.includes('\0')) reject('The DOCX archive contains unsafe entries.');
    names.add(name);
    inflated += expanded;
    if (inflated > limits.maxDocxInflatedBytes || expanded === 0xffffffff || compressed === 0xffffffff) reject('The DOCX expanded size exceeds the limit.');
    if (buffer.readUInt32LE(local) !== 0x04034b50 || buffer.readUInt16LE(local + 8) !== method || buffer.readUInt16LE(local + 6) !== flags) reject('The DOCX ZIP headers do not match.');
    const localNameSize = buffer.readUInt16LE(local + 26), localExtraSize = buffer.readUInt16LE(local + 28), data = local + 30 + localNameSize + localExtraSize;
    if (data + compressed > start || !buffer.subarray(local + 30, local + 30 + localNameSize).equals(buffer.subarray(cursor + 46, cursor + 46 + nameSize))) reject('The DOCX ZIP entries do not match.');
    if (ranges.some(([a,b]) => local < b && data + compressed > a)) reject('The DOCX ZIP entries overlap.');
    ranges.push([local, data + compressed]);
    // Verify actual expansion too: dishonest directory lengths cannot bypass the budget.
    const payload = buffer.subarray(data, data + compressed);
    const actual = method === 0 ? payload : inflateRawSync(payload, { maxOutputLength: Math.max(1, expanded) });
    if (actual.length !== expanded) reject('The DOCX expanded size is invalid.');
    cursor = end;
  }
  if (cursor !== eocd || !names.has('[Content_Types].xml') || !names.has('word/document.xml')) reject('The archive is not a DOCX document.');
}
async function run() {
  if (kind === 'pdf') {
    const pdfjs = await import(packages.pdf);
    pdfjs.GlobalWorkerOptions.workerSrc = packages.pdfWorker;
    const loading = pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0, stopAtErrors: true, useWorkerFetch: false, useSystemFonts: false, useWasm: false, disableFontFace: true, enableXfa: false });
    loading.onPassword = () => { void loading.destroy(); };
    try {
      const doc = await loading.promise;
      pageCount = doc.numPages;
      if (pageCount > limits.maxPdfPages) reject('The PDF has too many pages.');
      for (let number = 1; number <= pageCount; number++) {
        const page = await doc.getPage(number);
        const reader = page.streamTextContent().getReader();
        let content = '';
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          for (const item of part.value.items) {
            if (typeof item.str !== 'string') continue;
            content += item.str + (item.hasEOL ? '\n' : ' ');
            if (content.length + characterCount > limits.maxExtractedChars) reject('Extracted text exceeds the source limit.');
          }
        }
        add(content, number); page.cleanup();
      }
    } finally { await loading.destroy(); }
  } else if (kind === 'docx') {
    const buffer = Buffer.from(bytes);
    validateZip(buffer);
    const mammoth = require(packages.mammoth);
    function textOf(node) {
      if (node.type === 'text') return node.value;
      if (node.type === 'tab') return '\t';
      if (node.type === 'break') return '\n';
      return (node.children || []).map(textOf).join('');
    }
    function visit(node) {
      if (node.type === 'paragraph') {
        const content = textOf(node).trim();
        const match = /^heading\s*([1-9])$/i.exec(node.styleName || '') || /^heading([1-9])$/i.exec(node.styleId || '');
        if (match && content) heading(content, Number(match[1]));
        add(content, null, headingPath());
      } else for (const child of node.children || []) visit(child);
    }
    await mammoth.convertToHtml({ buffer }, { externalFileAccess: false, includeEmbeddedStyleMap: false, transformDocument(doc) {
      visit(doc);
      // No HTML output, image decoding, embedded scripts, or URL fetching is needed.
      return { ...doc, children: [] };
    }});
  } else {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/\r\n?/g, '\n');
    if (text.length > limits.maxExtractedChars) reject('Extracted text exceeds the source limit.');
    if (kind === 'txt') add(text);
    else {
      let paragraph = [], fence = null;
      function flush() { add(paragraph.join('\n'), null, headingPath()); paragraph = []; }
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i], marker = /^ {0,3}(\x60{3,}|~{3,})/.exec(line);
        if (marker) { if (!fence) fence = marker[1]; else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null; paragraph.push(line); continue; }
        if (!fence) {
          const atx = /^ {0,3}(#{1,6})(?:\s+(.+?)\s*#*\s*|\s*)$/.exec(line);
          const setext = line.trim() && /^ {0,3}(=+|-+)\s*$/.exec(lines[i+1] || '');
          if (atx || setext) {
            flush(); const title = atx ? atx[2] || '' : line.trim();
            heading(title, atx ? atx[1].length : setext[1][0] === '=' ? 1 : 2);
            add(line + (setext ? '\n' + lines[++i] : ''), null, headingPath()); continue;
          }
          if (!line.trim()) { flush(); continue; }
        }
        paragraph.push(line);
      }
      flush();
    }
  }
  if (!segments.length) reject('No readable text was found; scanned/image-only documents need text or OCR first.');
  return { segments, pageCount, characterCount };
}
run().then(data => parentPort.postMessage({ ok: true, data })).catch(error => {
  const safe = /^(The DOCX|The archive|Extracted text|The PDF has|No readable)/.test(error.message || '') ? error.message : 'The document is unreadable, malformed, or encrypted.';
  parentPort.postMessage({ ok: false, error: { code: 'invalid_input', message: safe + ' Try a smaller file or paste plain text.', retryable: false } });
});
`;
