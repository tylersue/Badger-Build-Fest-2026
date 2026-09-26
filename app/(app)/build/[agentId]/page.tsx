import { redirect } from "next/navigation";

export default async function BuilderPage({ params }: PageProps<"/build/[agentId]">) {
  const { agentId } = await params;
  redirect(`/build/${encodeURIComponent(agentId)}/interview`);
}
