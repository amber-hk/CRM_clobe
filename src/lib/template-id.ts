/**
 * Normalize an NHN templateId / templateCode into the canonical CRM key.
 *
 * Mirrors the dbt rule used in `mart.crm_campaign_map`:
 *
 *   REGEXP_REPLACE(LOWER(id), r'(_\d)?_(prod|dev)$|_\d$', '')
 *
 * Keep this function the single source of truth — anywhere we write to
 * Supabase `crm_campaign_map.template_id` it must go through here so the
 * eventual BigQuery sync joins cleanly.
 */
export function normalizeTemplateId(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.toLowerCase().replace(/(_\d)?_(prod|dev)$|_\d$/, "");
}
