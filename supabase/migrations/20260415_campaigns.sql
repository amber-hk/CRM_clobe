-- campaigns: single row per executed send (manual ad-hoc or automation run).
-- Driven from the app's send flow; replaces `mockSendHistory` once wired.

create extension if not exists "pgcrypto";

create table if not exists public.campaigns (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  template_id        text,
  channel            text not null check (channel in ('email', 'alimtalk')),
  send_type          text not null check (send_type in ('triggered', 'user_setting', 'user_ping', 'adhoc')),
  sku_id             text check (sku_id in ('clobe-ai', 'clobe-finance', 'clobe-connect')),
  sent_at            timestamptz,
  recipient_count    integer default 0,
  open_rate          float,
  conversion_rate    float,
  status             text default 'pending' check (status in ('pending', 'sending', 'done', 'failed')),
  created_at         timestamptz default now(),
  created_by         text
);

create index if not exists campaigns_sent_at_idx on public.campaigns (sent_at desc);
create index if not exists campaigns_template_id_idx on public.campaigns (template_id);
create index if not exists campaigns_channel_idx on public.campaigns (channel);

alter table public.campaigns enable row level security;
create policy "campaigns read"   on public.campaigns for select using (true);
create policy "campaigns insert" on public.campaigns for insert with check (true);
create policy "campaigns update" on public.campaigns for update using (true);
