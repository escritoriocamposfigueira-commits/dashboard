create table if not exists public.captador_radar (
  slug text primary key,
  nome text,
  telefone_e164 text,
  email_normalizado text,
  tipo_cliente text,
  servico text not null,
  bairro text,
  endereco text,
  valor_base numeric,
  qtd_imoveis integer not null default 1,
  fonte text,
  url_origem text,
  dias_no_ar integer,
  status text not null default 'radar',
  score numeric not null default 0,
  observacoes text,
  valor_fechado numeric,
  contatado_em timestamptz,
  fechado_em timestamptz,
  atualizado_em timestamptz,
  importado_em timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists captador_radar_fila_idx
  on public.captador_radar (status, score desc, atualizado_em desc);
create index if not exists captador_radar_servico_idx
  on public.captador_radar (servico, bairro);

alter table public.captador_radar enable row level security;
revoke all on public.captador_radar from anon, authenticated;

comment on table public.captador_radar is
  'Radar importado do CRM local; não autoriza contato automático e não equivale a consentimento.';
