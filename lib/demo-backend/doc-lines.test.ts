import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { SCRIPT } from "./script-lines";

/* The script doc must show the exact lines the tests cover, so a pasted line always behaves as rehearsed. */
it("docs/DEMO-SCRIPT.md contains every scripted line verbatim", () => {
  const doc = readFileSync("docs/DEMO-SCRIPT.md", "utf8");
  for (const line of [SCRIPT.hire, SCRIPT.investor, SCRIPT.document, SCRIPT.test, SCRIPT.feedback, ...SCRIPT.interview]) expect(doc).toContain(line);
  expect(doc).toContain(SCRIPT.agentName.split(" · ")[1]);
});
