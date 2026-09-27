import type { ReactNode } from "react";
import { logoFor, type LogoMark } from "@/lib/demo-backend/logos";
import { cn } from "@/lib/utils";

export { companyFor } from "@/lib/demo-backend/logos";

/* Each mark is drawn on a 24×24 grid in the brand color `c`. Strokes stay ≥1.8 so they hold up at 20px. */
/* `cut` is the tile fill, so cut-outs read as negative space. */
const MARKS: Record<LogoMark, (c: string, cut: string) => ReactNode> = {
  // Proxier: an expert and the agent that stands in for them.
  proxy: (c) => <><rect x={3.5} y={3.5} width={11} height={11} rx={3} fill="none" stroke={c} strokeWidth={2} /><rect x={9.5} y={9.5} width={11} height={11} rx={3} fill={c} /></>,
  infinity: (c) => <path d="M8 8.25c-2.07 0-3.75 1.68-3.75 3.75S5.93 15.75 8 15.75c3 0 5-7.5 8-7.5 2.07 0 3.75 1.68 3.75 3.75S18.07 15.75 16 15.75c-3 0-5-7.5-8-7.5z" fill="none" stroke={c} strokeWidth={2.4} strokeLinejoin="round" />,
  venn: (c) => <><circle cx={9} cy={12} r={5.6} fill={c} /><circle cx={15} cy={12} r={5.6} fill="none" stroke={c} strokeWidth={2} /></>,
  peaks: (c) => <><path d="M2.5 19.5 9 7.5l6.5 12z" fill={c} /><path d="M12.4 14.2 15.5 9l6 10.5h-6.2" fill={c} opacity={0.55} /></>,
  signal: (c) => <><circle cx={6} cy={18} r={2.3} fill={c} /><path d="M5 11.5a7.5 7.5 0 0 1 7.5 7.5M5 5.5A13.5 13.5 0 0 1 18.5 19" fill="none" stroke={c} strokeWidth={2.4} strokeLinecap="round" /></>,
  north: (c) => <><circle cx={12} cy={12} r={9} fill="none" stroke={c} strokeWidth={1.8} /><path d="M12 5.5l3.6 11.2-3.6-2.5-3.6 2.5z" fill={c} /></>,
  bars: (c) => <><rect x={4.3} y={13} width={3.8} height={6.8} rx={1} fill={c} opacity={0.6} /><rect x={10.1} y={9} width={3.8} height={10.8} rx={1} fill={c} opacity={0.8} /><rect x={15.9} y={4.2} width={3.8} height={15.6} rx={1} fill={c} /></>,
  orbit: (c) => <><circle cx={12} cy={12} r={4.3} fill={c} /><ellipse cx={12} cy={12} rx={10} ry={4} fill="none" stroke={c} strokeWidth={1.8} transform="rotate(-30 12 12)" /></>,
  quad: (c) => <><circle cx={7.5} cy={7.5} r={3.1} fill={c} /><circle cx={16.5} cy={7.5} r={3.1} fill={c} /><circle cx={7.5} cy={16.5} r={3.1} fill={c} /><circle cx={16.5} cy={16.5} r={2.6} fill="none" stroke={c} strokeWidth={1.8} /></>,
  stripes: (c) => <><rect x={3.5} y={3.5} width={17} height={17} rx={4.5} fill="none" stroke={c} strokeWidth={1.8} /><path d="M8 16 16 8M8 11.2 11.2 8M12.8 16 16 12.8" stroke={c} strokeWidth={2.4} strokeLinecap="round" /></>,
  leaf: (c, cut) => <><path d="M20 4C10.3 4 4.5 8.8 4.5 15.6c0 1.5.3 2.9.9 4.1C13.4 19.4 20 14.1 20 4z" fill={c} /><path d="M5.6 19.4 13.5 11.3" stroke={cut} strokeWidth={1.7} strokeLinecap="round" /></>,
  diamond: (c) => <><path d="M12 2.5 21.5 12 12 21.5 2.5 12z" fill="none" stroke={c} strokeWidth={1.9} strokeLinejoin="round" /><path d="M12 7.6 16.4 12 12 16.4 7.6 12z" fill={c} /></>,
  harbor: (c) => <><path d="M5 13.2a7 7 0 0 1 14 0z" fill={c} /><path d="M3.5 16.7h17M7 20.2h10" stroke={c} strokeWidth={2} strokeLinecap="round" /></>,
  cohort: (c) => <><rect x={4.5} y={3.8} width={15} height={3.2} rx={1.3} fill={c} /><rect x={4.5} y={8.6} width={11} height={3.2} rx={1.3} fill={c} opacity={0.8} /><rect x={4.5} y={13.4} width={7} height={3.2} rx={1.3} fill={c} opacity={0.62} /><rect x={4.5} y={18.2} width={3.2} height={3.2} rx={1.3} fill={c} opacity={0.45} /></>,
  layers: (c) => <><path d="M12 3.2 20.5 7.8 12 12.4 3.5 7.8z" fill={c} /><path d="M3.5 12 12 16.6 20.5 12M3.5 16.2 12 20.8l8.5-4.6" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></>,
  frame: (c) => <><rect x={3.5} y={3.5} width={12} height={12} rx={1.8} fill="none" stroke={c} strokeWidth={2} /><circle cx={15} cy={15} r={5.6} fill={c} /></>,
  spark: (c) => <path d="M12 2.5c.9 5.2 3.3 7.6 9.5 9.5-6.2 1.9-8.6 4.3-9.5 9.5-.9-5.2-3.3-7.6-9.5-9.5 6.2-1.9 8.6-4.3 9.5-9.5z" fill={c} />,
  halves: (c) => <><path d="M10.6 4.2a7.8 7.8 0 0 0 0 15.6z" fill={c} /><path d="M13.4 4.2a7.8 7.8 0 0 1 0 15.6z" fill={c} opacity={0.5} /></>,
  rings: (c) => <><circle cx={12} cy={12} r={8.8} fill="none" stroke={c} strokeWidth={1.8} /><circle cx={12} cy={12} r={5.2} fill="none" stroke={c} strokeWidth={1.8} /><circle cx={12} cy={12} r={2} fill={c} /></>,
  hex: (c, cut) => <><path d="M12 2.6 20.2 7.3v9.4L12 21.4l-8.2-4.7V7.3z" fill={c} /><circle cx={12} cy={12} r={3.2} fill={cut} /></>,
  cards: (c) => <><rect x={7.5} y={3.5} width={13} height={10} rx={2} fill="none" stroke={c} strokeWidth={1.9} /><rect x={3.5} y={9.8} width={13} height={10} rx={2} fill={c} /></>,
  pie: (c) => <><path d="M11 4a8.5 8.5 0 1 0 9 9h-9z" fill={c} /><path d="M13.5 2.5V10.5h8A8 8 0 0 0 13.5 2.5z" fill={c} opacity={0.55} /></>,
  grid: (c) => <>{[6, 12, 18].flatMap((y) => [6, 12, 18].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r={x === 12 && y === 12 ? 2.6 : 1.9} fill={c} opacity={x === 12 || y === 12 ? 1 : 0.6} />))}</>,
  chevrons: (c) => <path d="M5 12.8 12 6.3l7 6.5M5 18.6 12 12.1l7 6.5" fill="none" stroke={c} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />,
  pillars: (c) => <><path d="M3 9.2 12 3.6l9 5.6z" fill={c} /><path d="M6.3 11.3v6.4M12 11.3v6.4M17.7 11.3v6.4" stroke={c} strokeWidth={2.4} strokeLinecap="round" /><rect x={3} y={19.2} width={18} height={2.2} rx={0.9} fill={c} /></>,
  ten: (c) => <><rect x={4.3} y={4.5} width={3.4} height={15} rx={1.4} fill={c} /><ellipse cx={15.3} cy={12} rx={4.6} ry={6.6} fill="none" stroke={c} strokeWidth={2.7} /></>,
  tiers: (c) => <><rect x={9} y={4.2} width={6} height={3.6} rx={1.5} fill={c} /><rect x={6} y={10.2} width={12} height={3.6} rx={1.5} fill={c} opacity={0.78} /><rect x={3} y={16.2} width={18} height={3.6} rx={1.5} fill={c} opacity={0.56} /></>,
  arrow: (c, cut) => <><path d="M3.3 11.2 20.7 3.3l-7.9 17.4-2.4-7z" fill={c} strokeLinejoin="round" /><path d="M10.4 13.6 20.7 3.3" stroke={cut} strokeWidth={1.6} /></>,
  pine: (c) => <><path d="M12 2.8 17.6 10.6H6.4z" fill={c} /><path d="M12 7.2 19.8 17.6H4.2z" fill={c} opacity={0.75} /><rect x={10.8} y={17} width={2.4} height={4.3} rx={0.6} fill={c} /></>,
  trio: (c) => <><circle cx={12} cy={6.9} r={3.6} fill={c} /><circle cx={6.6} cy={16.2} r={3.6} fill={c} opacity={0.7} /><circle cx={17.4} cy={16.2} r={3.6} fill={c} opacity={0.85} /></>,
  keystone: (c, cut) => <><path d="M3.8 4.5h16.4l-3.6 15h-9.2z" fill={c} /><path d="M9.5 19.5a2.5 2.5 0 0 1 5 0" fill={cut} /></>,
  bolt: (c) => <path d="M13.8 2.5 4.8 13.6h6.3l-1.4 7.9 9.5-11.7h-6.4z" fill={c} strokeLinejoin="round" />,
  /* An original columnar redwood: tall canopy with notched branch tiers, trunk and ground line. */
  sequoia: (c, cut) => <><path d="M12 2.2c3.1 3.2 4.3 6.8 4.3 10.6 0 2.6-1.9 4.3-4.3 4.3s-4.3-1.7-4.3-4.3c0-3.8 1.2-7.4 4.3-10.6z" fill={c} /><path d="M9.4 8.8 12 10.8l2.6-2M8.9 12.5 12 14.9l3.1-2.4" fill="none" stroke={cut} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" /><rect x={11} y={16.4} width={2} height={4.6} rx={0.6} fill={c} /><path d="M6.8 21.2h10.4" stroke={c} strokeWidth={1.8} strokeLinecap="round" opacity={0.6} /></>,
  bridge: (c) => <g transform="translate(0 -1.5)"><path d="M3.5 17C5.5 7.5 18.5 7.5 20.5 17" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" /><path d="M2.5 17h19" stroke={c} strokeWidth={2.2} strokeLinecap="round" /><path d="M8 11.2V17M12 10.2V17M16 11.2V17" stroke={c} strokeWidth={1.6} opacity={0.7} /></g>,
};

/** Rich brand fills by hue (Radix step 9), so every company reads like a real app icon rather than a tinted placeholder. */
const BRAND_FILLS: [hue: number, fill: string][] = [
  [10, "#E54D2E"], [358, "#E5484D"], [336, "#E93D82"], [322, "#D6409F"], [292, "#AB4ABA"], [272, "#8E4EC6"],
  [252, "#6E56CF"], [226, "#3E63DD"], [206, "#0090FF"], [191, "#00A2C7"], [173, "#12A594"], [151, "#30A46C"],
  [131, "#46A758"], [23, "#F76B15"], [42, "#FFB224"], [30, "#AD7F58"],
];
function brandTile(hex: string): { fill: string; mark: string } {
  const n = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  if (delta < 0.12) return max > 0.85 ? { fill: "#F3F4F6", mark: "#1C1D1F" } : { fill: "#2B2D31", mark: "#F3F4F6" };
  const hue = (max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60;
  const h = (hue + 360) % 360;
  const [, fill] = BRAND_FILLS.reduce((best, item) => {
    const d = Math.min(Math.abs(item[0] - h), 360 - Math.abs(item[0] - h));
    const bestD = Math.min(Math.abs(best[0] - h), 360 - Math.abs(best[0] - h));
    return d < bestD ? item : best;
  });
  return { fill, mark: fill === "#FFB224" ? "#1C1D1F" : "#FFFFFF" };
}

/**
 * A person shown by their company's mark: a bold mark on a solid brand-color tile,
 * like a real company's app icon. Reads from 20px to 48px.
 */
export function IdentityLogo({ identityId, size = 32, className }: { identityId: string; size?: number; className?: string }) {
  const { company, mark, color } = logoFor(identityId);
  const tile = brandTile(color);
  const radius = Math.round(size * 0.24);
  const glyph = Math.round(size * (size <= 24 ? 0.66 : 0.58));
  return (
    <span
      role="img"
      aria-label={company ? `${company} logo` : "Company logo"}
      title={company || undefined}
      data-testid="identity-logo"
      className={cn("grid shrink-0 place-items-center", className)}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `linear-gradient(160deg, color-mix(in srgb, ${tile.fill} 84%, white) 0%, ${tile.fill} 60%)`,
        boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.18), 0 0 0 1px rgb(0 0 0 / 0.25)",
      }}
    >
      <svg viewBox="0 0 24 24" width={glyph} height={glyph} aria-hidden="true" focusable="false">
        {MARKS[mark](tile.mark, tile.fill)}
      </svg>
    </span>
  );
}
