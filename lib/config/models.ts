import type { Category } from "./categories";

/** The platform sets the model per category (PERS-03); experts never pick one. */
export const MODELS = {
  default: "claude-sonnet-5",
  quality: "claude-opus-5-5",
  utility: "claude-haiku-4-5",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

export const MODEL_BY_CATEGORY: Record<Category, ModelId> = {
  health_pt: MODELS.default,
  tax_finance: MODELS.default,
  career_admissions: MODELS.default,
};

export const EMBEDDING_MODEL = "voyage-4-lite";
export const EMBEDDING_DIMENSIONS = 1024;

export function modelForCategory(category: Category): ModelId {
  return MODEL_BY_CATEGORY[category];
}
