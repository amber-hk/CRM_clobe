import { fetchTemplates } from "@/lib/nhn";
import { adaptTemplates } from "@/lib/adapters/nhn-adapter";
import { mockEmailTemplates } from "@/lib/mock-data";
import { TemplatesView } from "./TemplatesView";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const alim = adaptTemplates(await fetchTemplates());
  return <TemplatesView email={mockEmailTemplates} alim={alim} />;
}
