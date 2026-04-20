-- Add is_active flag to crm_campaign_map.
-- NULL or true = active. false = deactivated (hidden from send + automation).

alter table public.crm_campaign_map
  add column if not exists is_active boolean default true;
