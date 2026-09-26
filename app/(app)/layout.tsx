import { cookies } from "next/headers";
import { AppShell } from "@/components/shell/app-shell";

/* Every route of the loop renders inside the LangSmith-style shell (SHEL-01). */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  return <AppShell defaultOpen={defaultOpen}>{children}</AppShell>;
}
