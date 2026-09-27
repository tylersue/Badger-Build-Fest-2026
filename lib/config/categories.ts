import { DEMO_MODE } from "./demo";

export type Category = "health_pt" | "tax_finance" | "career_admissions";

/** Demo mode (Proxier) keeps the stored ids and relabels them for startup founders. */
export const CATEGORIES: readonly { id: Category; label: string }[] = DEMO_MODE ? [
  { id: "health_pt", label: "Validation & research" },
  { id: "tax_finance", label: "Fundraising & finance" },
  { id: "career_admissions", label: "Growth & sales" },
] : [
  { id: "health_pt", label: "Health / PT" },
  { id: "tax_finance", label: "Tax / Finance" },
  { id: "career_admissions", label: "Career / Admissions" },
];

// D-16: provisional. Edit this one line to change which categories get the regulated treatment.
export const REGULATED_CATEGORIES: readonly Category[] = DEMO_MODE ? ["tax_finance"] : ["health_pt", "tax_finance"];

export const CATEGORY_DISCLAIMERS: Record<Category, string> = DEMO_MODE ? {
  health_pt: "General startup guidance, not a guarantee of any outcome.",
  tax_finance: "General startup guidance, not legal, tax, or investment advice.",
  career_admissions: "General startup guidance, not a guarantee of any outcome.",
} : {
  health_pt: "Health information, not medical care. For emergencies call 911. This agent will say when it doesn't know.",
  tax_finance: "General tax and finance information, not professional advice. Check your situation with a licensed professional.",
  career_admissions: "General guidance, not a guarantee of any outcome.",
};

export function isRegulated(category: Category): boolean {
  return REGULATED_CATEGORIES.includes(category);
}

/** The disclaimer shown on listings and in chat, or null when the category is not regulated. */
export function disclaimerFor(category: Category): string | null {
  return isRegulated(category) ? CATEGORY_DISCLAIMERS[category] : null;
}

export function categoryLabel(category: Category): string {
  return CATEGORIES.find((c) => c.id === category)?.label ?? category;
}
