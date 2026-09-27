import { describe, expect, it } from "vitest";
import type { SourceEstimate } from "@/lib/contracts/phase2";
import { canConfirmIntake, editIntake, emptyIntakeDraft, intakePayload, reviewIntake } from "./source-intake";

const estimate = (name: string): SourceEstimate => ({
  agentId: "agent-1", name, kind: "pdf", contentHash: "hash", estimateToken: "token", version: 1,
  expiresAt: "2030-01-01T00:10:00.000Z", byteCount: 4,
  projectedUse: { sources: 1, bytes: 4, chunks: 0 }, remaining: { sources: 9, bytes: 100, chunks: 100 },
  limits: { maxSources: 10, maxFileBytes: 10, maxAgentBytes: 100, maxPdfPages: 100, maxExtractedChars: 100000,
    maxActiveChunks: 1000, chunkTargetChars: 2000, chunkOverlapChars: 200, parserTimeoutMs: 15000,
    parserHeapMb: 128, maxDocxInflatedBytes: 20000000 },
  estimateUnits: "10", maxUnits: "100", priceVersion: "v1", projectedPageCount: null,
  projectedChunkCount: null, walletAvailableUnits: "1000", walletHeldUnits: "0",
});
const now = Date.parse("2030-01-01T00:00:00.000Z");

describe("source confirmation state", () => {
  it("retains the original File object and bytes through review; edit and expiry revoke confirmation", async () => {
    const file = new File([new Uint8Array([0, 1, 255, 42])], "notes.pdf", { type: "application/pdf" });
    const draft = editIntake(emptyIntakeDraft(), { file });
    expect(canConfirmIntake(draft, now)).toBe(false);
    const reviewed = reviewIntake(draft, estimate("notes.pdf"));
    expect(canConfirmIntake(reviewed, now)).toBe(true);
    expect(intakePayload(reviewed)?.fileOrText).toBe(file);
    expect(new Uint8Array(await (intakePayload(reviewed)?.fileOrText as File).arrayBuffer()))
      .toEqual(new Uint8Array([0, 1, 255, 42]));
    expect(canConfirmIntake(reviewed, Date.parse("2030-01-01T00:10:00.000Z"))).toBe(false);
    expect(canConfirmIntake(editIntake(reviewed, { file: new File(["changed"], "notes.pdf") }), now)).toBe(false);
  });

  it("keeps paste editable while invalidating review after any change", () => {
    const draft = editIntake(emptyIntakeDraft(), { mode: "text", name: "Notes", text: "Original text" });
    const reviewed = reviewIntake(draft, estimate("Notes"));
    expect(canConfirmIntake(reviewed, now)).toBe(true);
    const changed = editIntake(reviewed, { text: "More detail" });
    expect(changed.text).toBe("More detail");
    expect(changed.estimate).toBeNull();
    expect(canConfirmIntake(changed, now)).toBe(false);
  });

  it("cannot confirm a token restored without file bytes after reload", () => {
    const reviewed = reviewIntake(editIntake(emptyIntakeDraft(), { file: new File(["data"], "notes.pdf") }), estimate("notes.pdf"));
    const reloaded = { ...reviewed, file: null };
    expect(intakePayload(reloaded)).toBeNull();
    expect(canConfirmIntake(reloaded, now)).toBe(false);
    expect(canConfirmIntake({ ...reviewed, estimate: null }, now)).toBe(false);
  });
});
