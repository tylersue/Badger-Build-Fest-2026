import type { Category } from "@/lib/config/categories";

/** Hackathon demo sample data, not measured runs. Always render BENCHMARK_SAMPLE_LABEL with these values. */
export const BENCHMARK_SAMPLE_LABEL = "Sample data";
export const BENCHMARK_SAMPLE_CAPTION = "Hand-picked illustrative numbers, not measured runs.";

export type BenchmarkMetrics = {
  costCreditsPerTask: number;
  tokensPerTask: number;
  secondsToAnswer: number;
  buildMinutes: number;
  taskSuccessPct: number;
  toolCallAccuracyPct: number;
};

export type CompetitorId = "muse" | "grok" | "hermes";

export const COMPETITORS = [
  { id: "muse", name: "Muse" },
  { id: "grok", name: "Grok" },
  { id: "hermes", name: "Hermes" },
] as const;

export const BENCHMARK_SUITES = [
  { name: "τ²-bench", measures: "multi-turn task success in domain conversations" },
  { name: "BFCL", measures: "tool-call accuracy, including GitHub pulls" },
  { name: "GAIA", measures: "multi-step questions: speed and tokens per task" },
] as const;

export const AGENT_BENCHMARKS: Record<string, BenchmarkMetrics> = {
  "maria-chen-physical-therapy": { costCreditsPerTask: 5, tokensPerTask: 6500, secondsToAnswer: 4, buildMinutes: 32, taskSuccessPct: 92, toolCallAccuracyPct: 95 },
  "dev-patel-tax-for-freelancers": { costCreditsPerTask: 6, tokensPerTask: 7200, secondsToAnswer: 5, buildMinutes: 38, taskSuccessPct: 90, toolCallAccuracyPct: 94 },
  "priya-nair-college-admissions": { costCreditsPerTask: 7, tokensPerTask: 7800, secondsToAnswer: 5, buildMinutes: 40, taskSuccessPct: 91, toolCallAccuracyPct: 93 },
  "luis-ortega-strength-coaching": { costCreditsPerTask: 4, tokensPerTask: 5600, secondsToAnswer: 3, buildMinutes: 28, taskSuccessPct: 93, toolCallAccuracyPct: 96 },
  "hannah-kim-first-job-finances": { costCreditsPerTask: 8, tokensPerTask: 8400, secondsToAnswer: 6, buildMinutes: 43, taskSuccessPct: 88, toolCallAccuracyPct: 91 },
  "tom-reyes-resume-interviews": { costCreditsPerTask: 6, tokensPerTask: 6900, secondsToAnswer: 4, buildMinutes: 35, taskSuccessPct: 89, toolCallAccuracyPct: 92 },
};

type CompetitorCategoryData = Record<Category, BenchmarkMetrics>;

export const COMPETITOR_BENCHMARKS: Record<CompetitorId, CompetitorCategoryData> = {
  muse: {
    health_pt: { costCreditsPerTask: 26, tokensPerTask: 28000, secondsToAnswer: 12, buildMinutes: 210, taskSuccessPct: 70, toolCallAccuracyPct: 81 },
    tax_finance: { costCreditsPerTask: 25, tokensPerTask: 27000, secondsToAnswer: 11, buildMinutes: 220, taskSuccessPct: 72, toolCallAccuracyPct: 82 },
    career_admissions: { costCreditsPerTask: 24, tokensPerTask: 26000, secondsToAnswer: 13, buildMinutes: 200, taskSuccessPct: 71, toolCallAccuracyPct: 83 },
  },
  grok: {
    health_pt: { costCreditsPerTask: 20, tokensPerTask: 23000, secondsToAnswer: 8, buildMinutes: 175, taskSuccessPct: 73, toolCallAccuracyPct: 84 },
    tax_finance: { costCreditsPerTask: 19, tokensPerTask: 22000, secondsToAnswer: 9, buildMinutes: 180, taskSuccessPct: 74, toolCallAccuracyPct: 85 },
    career_admissions: { costCreditsPerTask: 18, tokensPerTask: 21000, secondsToAnswer: 7, buildMinutes: 165, taskSuccessPct: 75, toolCallAccuracyPct: 83 },
  },
  hermes: {
    health_pt: { costCreditsPerTask: 12, tokensPerTask: 35000, secondsToAnswer: 17, buildMinutes: 300, taskSuccessPct: 66, toolCallAccuracyPct: 76 },
    tax_finance: { costCreditsPerTask: 13, tokensPerTask: 36000, secondsToAnswer: 16, buildMinutes: 320, taskSuccessPct: 68, toolCallAccuracyPct: 78 },
    career_admissions: { costCreditsPerTask: 11, tokensPerTask: 33000, secondsToAnswer: 18, buildMinutes: 280, taskSuccessPct: 65, toolCallAccuracyPct: 74 },
  },
};
