import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("intake migration privileges", () => {
  it("uses the declared reserve_source_quota argument types for both grants", () => {
    const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/20260927000500_phase2_intake.sql"), "utf8");
    const declaration = sql.match(/create function public\.reserve_source_quota\(([\s\S]*?)\)\s*returns jsonb/i)?.[1];
    expect(declaration).toBeDefined();
    const types = declaration!.split(",").map(argument => argument.trim().split(/\s+/)[1]);
    expect(types).toHaveLength(17);
    const grants = [...sql.matchAll(/(?:revoke|grant) execute on function public\.reserve_source_quota\(([^)]*)\)/g)];
    expect(grants).toHaveLength(2);
    for (const grant of grants) expect(grant[1].split(",")).toEqual(types);
  });
});
