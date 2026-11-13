create extension if not exists pgcrypto;

do $$ begin
  create type public.captador_operacao as enum ('imobiliaria', 'engenharia', 'advocacia');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.captador_fonte as enum (
    'formulario', 'comentario_instagram', 'comentario_facebook', 'dm', 'whatsapp',
    'google_meu_negocio', 'indicacao', 'mailerfind_b2b', 'site', 'youtube', 'tiktok'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.captador_etapa as enum (
    'novo', 'validar', 'qualificado', 'contato_autorizado', 'reuniao',
    'visita', 'proposta', 'contratado', 'perdido', 'nao_contatar'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.captador_base_legal as enum ('consentimento', 'legitimo_interesse_b2b');
exception when duplicate_object then null; end $$;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  operacao public.captador_operacao not null,
  fonte public.captador_fonte not null default 'formulario',
  url_origem text,
  nome text not null,
  empresa text,
  categoria text,
  municipio text,
  bairro text,
  interesse text not null,
  faixa_preco text,
  codigo_imovel text,
  telefone text,
  telefone_e164 text,
  email text,
  email_normalizado text,
  data_coleta timestamptz not null default now(),
  base_legal public.captador_base_legal not null,
  consentimento_texto text,
  consentimento_em timestamptz,
  canal_autorizado text[] not null default '{}',
  etapa public.captador_etapa not null default 'novo',
  ultimo_contato timestamptz,
  responsavel text,
  nao_contatar boolean not null default false,
  motivo_nao_contatar text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_contato check (telefone_e164 is not null or email_normalizado is not null),
  constraint consentimento_coerente check (
    base_legal = 'legitimo_interesse_b2b'
    or (consentimento_texto is not null and consentimento_em is not null)
  )
);

create unique index if not exists leads_telefone_operacao_uq
  on public.leads (operacao, telefone_e164) where telefone_e164 is not null;
create unique index if not exists leads_email_operacao_uq
  on public.leads (operacao, email_normalizado) where email_normalizado is not null;
create index if not exists leads_funil_idx on public.leads (operacao, etapa, data_coleta desc);
create index if not exists leads_origem_idx on public.leads (fonte, data_coleta desc);

create table if not exists public.interacoes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  data timestamptz not null default now(),
  canal text not null,
  resumo text not null,
  automatica boolean not null default false,
  responsavel text,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists interacoes_lead_data_idx on public.interacoes (lead_id, data desc);

create table if not exists public.bloqueio (
  id uuid primary key default gen_random_uuid(),
  operacao public.captador_operacao,
  telefone_e164 text,
  email_normalizado text,
  permanente boolean not null default true,
  motivo text not null,
  criado_em timestamptz not null default now(),
  constraint bloqueio_contato check (telefone_e164 is not null or email_normalizado is not null)
);
create unique index if not exists bloqueio_telefone_operacao_uq
  on public.bloqueio (operacao, telefone_e164)
  where operacao is not null and telefone_e164 is not null;
create unique index if not exists bloqueio_telefone_global_uq
  on public.bloqueio (telefone_e164)
  where operacao is null and telefone_e164 is not null;
create unique index if not exists bloqueio_email_operacao_uq
  on public.bloqueio (operacao, email_normalizado)
  where operacao is not null and email_normalizado is not null;
create unique index if not exists bloqueio_email_global_uq
  on public.bloqueio (email_normalizado)
  where operacao is null and email_normalizado is not null;

create table if not exists public.eventos_captacao (
  id bigint generated always as identity primary key,
  ocorrido_em timestamptz not null default now(),
  tipo text not null,
  operacao public.captador_operacao,
  fonte public.captador_fonte,
  campanha text,
  codigo_imovel text,
  url_origem text,
  lead_id uuid references public.leads(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists eventos_captacao_data_idx on public.eventos_captacao (ocorrido_em desc);

create or replace function public.captador_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists leads_touch_updated_at on public.leads;
create trigger leads_touch_updated_at before update on public.leads
for each row execute function public.captador_touch_updated_at();

create or replace view public.captador_funil_semanal as
select
  date_trunc('week', data_coleta)::date as semana,
  operacao,
  fonte,
  etapa,
  count(*)::integer as total
from public.leads
group by 1, 2, 3, 4;

create or replace function public.limpar_leads_expirados()
returns integer language plpgsql security definer set search_path = public as $$
declare removidos integer;
begin
  delete from public.leads
  where data_coleta < now() - interval '12 months'
    and etapa in ('perdido', 'nao_contatar');
  get diagnostics removidos = row_count;
  return removidos;
end $$;

alter table public.leads enable row level security;
alter table public.interacoes enable row level security;
alter table public.bloqueio enable row level security;
alter table public.eventos_captacao enable row level security;

revoke all on public.leads from anon, authenticated;
revoke all on public.interacoes from anon, authenticated;
revoke all on public.bloqueio from anon, authenticated;
revoke all on public.eventos_captacao from anon, authenticated;
revoke all on public.captador_funil_semanal from anon, authenticated;
revoke all on public.captador_funil_semanal from public;
revoke execute on function public.limpar_leads_expirados() from public, anon, authenticated;

comment on table public.leads is 'Leads voluntários e B2B validados, separados por operação.';
comment on table public.bloqueio is 'Lista de não contato; deve ser consultada antes de inserir ou enviar.';
