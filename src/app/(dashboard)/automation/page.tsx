import { listAutomations } from "@/lib/nhn";
import { mockEmailTemplates } from "@/lib/mock-data";
import type { AutomationItem } from "@/types/crm";
import { AutomationView } from "./AutomationView";

export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  const alimAutomations = await listAutomations();

  // Email templates surface as automations too — sendType grouping doesn't
  // care about kind/trigger metadata, so we project Template → AutomationItem
  // with sensible defaults. Layouts and superseded versions are excluded.
  const emailAutomations: AutomationItem[] = mockEmailTemplates
    .filter((t) => !t.supersededBy && !t.hidden && !t.isLayout)
    .map((t) => ({
      // Prefix to avoid React-key collisions when an alim and email template
      // share the same templateId (e.g. `report-off-notice`).
      id: `email:${t.id}`,
      nhnName: t.id,
      displayName: t.name,
      kind: "time",
      trigger: t.category ?? "—",
      channels: ["email"],
      templateCode: t.code,
      sku: (t.sku ?? "ai") as AutomationItem["sku"],
      status: "on",
    }));

  return (
    <AutomationView initial={[...alimAutomations, ...emailAutomations]} />
  );
}
