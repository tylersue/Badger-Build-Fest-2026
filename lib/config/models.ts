import type { Category } from "./categories";

/** The platform sets the model per category (PERS-03); experts never pick one. */
export const MODELS = {
  default: "gpt-6-luna",
  quality: "gpt-4.1",
  utility: "gpt-6-luna",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

export const MODEL_BY_CATEGORY: Record<Category, ModelId> = {
  health_pt: MODELS.default,
  tax_finance: MODELS.default,
  career_admissions: MODELS.default,
};

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1024;

export function modelForCategory(category: Category): ModelId {
  return MODEL_BY_CATEGORY[category];
}
