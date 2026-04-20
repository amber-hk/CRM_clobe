import { fetchTemplates } from "@/lib/nhn";
import { adaptTemplates } from "@/lib/adapters/nhn-adapter";
import { mockEmailTemplates } from "@/lib/mock-data";
import { SendView } from "./SendView";

export const dynamic = "force-dynamic";

export default async function SendPage() {
  const alimTemplates = adaptTemplates(await fetchTemplates()).filter(
    (t) => !t.supersededBy && !t.hidden
  );
  const emailTemplates = mockEmailTemplates.filter(
    (t) => !t.supersededBy && !t.hidden && !t.isLayout
  );
  return <SendView emailTemplates={emailTemplates} alimTemplates={alimTemplates} />;
}
