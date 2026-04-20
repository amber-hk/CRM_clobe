-- Add send_type column to crm_campaign_map.
-- Categorizes how a message gets fired.

alter table public.crm_campaign_map
  add column if not exists send_type text
  check (send_type in ('triggered', 'user_setting', 'user_ping'));
