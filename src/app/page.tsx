import { listOpportunities } from "@/lib/data";
import { CRMApp } from "@/components/CRMApp";

export const dynamic = "force-dynamic";

export default async function Page() {
  const opportunities = await listOpportunities();
  return <CRMApp initialOpportunities={opportunities} />;
}
