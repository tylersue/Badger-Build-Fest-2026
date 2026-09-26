export type Category = "health_pt" | "tax_finance" | "career_admissions";

export const CATEGORIES: readonly { id: Category; label: string }[] = [
  { id: "health_pt", label: "Health / PT" },
  { id: "tax_finance", label: "Tax / Finance" },
  { id: "career_admissions", label: "Career / Admissions" },
];

// D-16: provisional. Edit this one line to change which categories get the regulated treatment.
export const REGULATED_CATEGORIES: readonly Category[] = ["health_pt", "tax_finance"];

export const CATEGORY_DISCLAIMERS: Record<Category, string> = {
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

/** Card header gradients per category (placeholder images). */
export const CATEGORY_GRADIENTS: Record<Category, string> = {
  health_pt: "linear-gradient(135deg,#102656,#0c336a 60%,#1566b8)",
  tax_finance: "linear-gradient(135deg,#190d38,#3b2560 60%,#6244a0)",
  career_admissions: "linear-gradient(135deg,#053321,#084d31 60%,#079455)",
};
