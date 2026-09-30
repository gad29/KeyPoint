-- Phase 3: onboarding templates, e-signatures, branding.

alter table onboarding_templates
  add column name_he text,
  add column description text,
  add column contract jsonb,
  add column active boolean not null default true,
  add column updated_at timestamptz not null default now();

comment on column onboarding_templates.required_assets is 'Document checklist: [{code, labelEn, labelHe, required}]';

alter table cases add column template_slug text;

create table contract_signatures (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  case_id uuid not null references cases(id) on delete cascade,
  template_slug text,
  contract_title text not null,
  -- The exact text the client saw and signed; content_hash is sha256(contract_body).
  contract_body text not null,
  content_hash text not null,
  signer_name text not null,
  signature_image text not null,
  ip text,
  user_agent text,
  signed_at timestamptz not null default now()
);
create index contract_signatures_case_idx on contract_signatures (case_id);

alter table contract_signatures enable row level security;
