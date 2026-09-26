const nf = new Intl.NumberFormat("en-US");

/** 5000 -> "5,000 credits" */
export function formatCredits(cents: number): string {
  return `${nf.format(cents)} ${Math.abs(cents) === 1 ? "credit" : "credits"}`;
}

/** 1000 -> "+1,000", -3 -> "−3" (U+2212), 0 -> "0" */
export function formatSignedCredits(cents: number): string {
  if (cents > 0) return `+${nf.format(cents)}`;
  if (cents < 0) return `−${nf.format(Math.abs(cents))}`;
  return "0";
}

export function formatNumber(n: number): string {
  return nf.format(n);
}

/** 5000 -> "$50.00" */
export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

/** ISO timestamp -> "just now", "10 min ago", "3 h ago", "yesterday", "Sep 20" */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diffMin = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} h ago`;
  if (diffH < 48) return "yesterday";
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** ISO timestamp for N days before now (for "this week" / "this month" windows). */
export function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
