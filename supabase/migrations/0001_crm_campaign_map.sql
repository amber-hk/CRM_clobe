-- crm_campaign_map: editable alias/metadata layer for NHN templates.
-- The template_id column matches the dbt-side normalization rule:
--   REGEXP_REPLACE(LOWER(id), r'(_\d)?_(prod|dev)$|_\d$', '')
-- so this table can be exported as a dbt seed or synced into BigQuery.

create table if not exists public.crm_campaign_map (
  template_id   text primary key,
  channel       text not null check (channel in ('ALIMTALK', 'EMAIL')),
  display_name  text not null,
  description   text,
  sku           text check (sku in ('clobe-ai', 'clobe-finance', 'clobe-connect')),
  funnel_stage  text check (funnel_stage in ('onboarding', 'activation', 'retention', 'offboarding', 'finance')),
  updated_at    timestamptz not null default now()
);

-- RLS — internal CRM only; refine when auth is wired.
alter table public.crm_campaign_map enable row level security;

create policy "crm_campaign_map read"  on public.crm_campaign_map for select using (true);
create policy "crm_campaign_map write" on public.crm_campaign_map for insert with check (true);
create policy "crm_campaign_map update" on public.crm_campaign_map for update using (true);
create policy "crm_campaign_map delete" on public.crm_campaign_map for delete using (true);
