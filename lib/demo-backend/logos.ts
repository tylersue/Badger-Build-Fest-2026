/**
 * Company marks for every demo identity. Each person is shown by the logo of
 * the company they run or the firm they advise from, never a letter tile.
 * `mark` picks a geometric glyph drawn in components/app/identity-logo.tsx;
 * `color` is the brand color, chosen to read on the dark panel-raised tile.
 */
export type LogoMark =
  | "infinity" | "venn" | "peaks" | "signal" | "north" | "bars" | "orbit" | "quad" | "stripes" | "leaf" | "diamond" | "harbor"
  | "cohort" | "layers" | "frame" | "spark" | "halves" | "rings" | "hex" | "cards" | "pie" | "grid" | "chevrons" | "pillars"
  | "ten" | "tiers" | "arrow" | "pine" | "trio" | "keystone" | "bolt" | "bridge" | "sequoia" | "proxy";

export type IdentityCompany = { company: string; mark: LogoMark; color: string };

export const IDENTITY_LOGOS: Record<string, IdentityCompany> = {
  // Switchable demo identities
  sam: { company: "Proxier", mark: "proxy", color: "#E5E7EB" },
  maria: { company: "Sequoia", mark: "sequoia", color: "#F0936B" },
  // Original experts
  dev: { company: "Ridgeline Capital", mark: "peaks", color: "#A78BFA" },
  priya: { company: "Signal Labs", mark: "signal", color: "#F472B6" },
  luis: { company: "Northpass", mark: "north", color: "#FACC15" },
  hannah: { company: "Ledgerly", mark: "bars", color: "#4ADE80" },
  tom: { company: "Orbit Growth", mark: "orbit", color: "#FB7185" },
  // Hirers (first-time founders)
  jordan: { company: "Tally", mark: "quad", color: "#C4B5FD" },
  alex: { company: "Brightpath", mark: "stripes", color: "#FDBA74" },
  riley: { company: "Fernway", mark: "leaf", color: "#86EFAC" },
  morgan: { company: "Quill", mark: "diamond", color: "#F0ABFC" },
  casey: { company: "Harbor", mark: "harbor", color: "#5EEAD4" },
  kofi: { company: "Gridline", mark: "grid", color: "#86EFAC" },
  omar: { company: "Relay", mark: "signal", color: "#7DD3FC" },
  chloe: { company: "Pantry", mark: "pie", color: "#FCA5A5" },
  nina: { company: "Loopline", mark: "infinity", color: "#93C5FD" },
  yuki: { company: "Kindling", mark: "bolt", color: "#FDBA74" },
  ethan: { company: "Canopy", mark: "venn", color: "#6EE7B7" },
  isabel: { company: "Waypoint", mark: "north", color: "#C4B5FD" },
  maya: { company: "Stacklet", mark: "layers", color: "#FDE68A" },
  daniel: { company: "Lumen", mark: "spark", color: "#FEF08A" },
  lucas: { company: "Forkful", mark: "tiers", color: "#A5F3FC" },
  // Marketplace experts
  marcus: { company: "Cohortly", mark: "cohort", color: "#F97316" },
  wei: { company: "Stackforge", mark: "layers", color: "#22D3EE" },
  sofia: { company: "Fieldnote Studio", mark: "frame", color: "#E879F9" },
  grace: { company: "Wordmark", mark: "spark", color: "#FDE047" },
  rohan: { company: "Two Sided", mark: "halves", color: "#A3E635" },
  jasmine: { company: "Keepwell", mark: "rings", color: "#FCA5A5" },
  elena: { company: "Foundry Nine", mark: "hex", color: "#CBD5E1" },
  nadia: { company: "Deckhouse", mark: "cards", color: "#FB923C" },
  ben: { company: "Tablewise", mark: "pie", color: "#A5B4FC" },
  aisha: { company: "Batchworks", mark: "grid", color: "#F59E0B" },
  owen: { company: "Prairie Angels", mark: "chevrons", color: "#D9F99D" },
  lena: { company: "Groundwork", mark: "pillars", color: "#D6D3D1" },
  kenji: { company: "First Ten", mark: "ten", color: "#67E8F9" },
  mateo: { company: "Tiered", mark: "tiers", color: "#F87171" },
  zoe: { company: "Outpost", mark: "arrow", color: "#FDA4AF" },
  samir: { company: "Evergreen Content", mark: "pine", color: "#10B981" },
  imani: { company: "Commons", mark: "trio", color: "#FCD34D" },
  victor: { company: "Keystone Sales", mark: "keystone", color: "#E2B78A" },
  tara: { company: "Sprintline", mark: "bolt", color: "#FFD43B" },
  diego: { company: "Bridgework", mark: "bridge", color: "#99F6E4" },
};

const FALLBACK_MARKS: LogoMark[] = ["venn", "hex", "rings", "quad", "diamond", "spark", "trio", "tiers"];
const FALLBACK_COLORS = ["#F4A261", "#A78BFA", "#34D399", "#F472B6", "#FACC15", "#5EEAD4", "#FB7185", "#C4B5FD"];

/** The identity's company; unknown ids get a stable mark from a hash of the id and no company name. */
export function logoFor(identityId: string): IdentityCompany & { known: boolean } {
  const known = IDENTITY_LOGOS[identityId];
  if (known) return { ...known, known: true };
  let hash = 0;
  for (const ch of identityId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return { company: "", mark: FALLBACK_MARKS[hash % FALLBACK_MARKS.length], color: FALLBACK_COLORS[(hash >>> 3) % FALLBACK_COLORS.length], known: false };
}

/** Company name for an identity, or "" when it has none. */
export const companyFor = (identityId: string): string => IDENTITY_LOGOS[identityId]?.company ?? "";
