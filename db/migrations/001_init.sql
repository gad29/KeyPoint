-- Agency OS core schema. Every tenant-owned row carries agency_id.
-- Works on Supabase and on any plain Postgres 14+.

create extension if not exists pgcrypto;

create table agencies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_he text,
  preset text not null default 'default',
  locale text not null default 'he',
  currency text not null default 'ILS',
  vat_id text,
  logo_url text,
  primary_color text,
  case_seq integer not null default 1000,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  email text not null,
  password_hash text not null,
  full_name text,
  role text not null default 'advisor',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index users_agency_email_idx on users (agency_id, lower(email));

create table cases (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  case_number text not null,
  lead_name text not null,
  spouse_name text,
  phone text not null,
  email text,
  stage text not null default 'new-lead',
  case_type text not null default 'service-engagement',
  borrower_profiles text[] not null default '{}',
  missing_items integer not null default 0,
  assigned_to text not null default 'Unassigned',
  bank_targets text[] not null default '{}',
  next_action text not null default '',
  portal_status text,
  notes text not null default '',
  source text,
  submission_id text,
  answers jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index cases_agency_number_idx on cases (agency_id, case_number);
create index cases_agency_stage_idx on cases (agency_id, stage);

-- People attached to a case (applicant, co-applicant, contact person).
create table case_contacts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  case_id uuid not null references cases(id) on delete cascade,
  full_name text not null,
  id_number text,
  preferred_language text,
  phone text,
  email text,
  role text not null default 'primary',
  created_at timestamptz not null default now()
);
create index case_contacts_id_number_idx on case_contacts (agency_id, id_number);

create table case_documents (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  case_id uuid not null references cases(id) on delete cascade,
  document_code text not null,
  required boolean not null default false,
  status text not null default 'not-uploaded',
  uploaded_file_url text,
  review_notes text,
  approved_at timestamptz,
  requested_resubmission_at timestamptz,
  created_at timestamptz not null default now()
);
create index case_documents_case_idx on case_documents (case_id);

create table uploads (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  case_id uuid not null references cases(id) on delete cascade,
  document_code text not null,
  file_name text not null,
  path text not null,
  uploaded_at timestamptz not null default now()
);

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  case_id uuid references cases(id) on delete cascade,
  actor text,
  event_type text not null,
  summary text not null,
  source_system text not null default 'agency-os',
  created_at timestamptz not null default now()
);
create index activity_log_case_idx on activity_log (case_id, created_at desc);

-- mortgage-advisor preset
create table bank_offers (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  case_id uuid not null references cases(id) on delete cascade,
  bank text not null,
  status text not null default 'requested',
  first_payment text,
  max_payment text,
  total_repayment text,
  expires_at text,
  created_at timestamptz not null default now()
);

create table ai_reviews (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  case_id uuid references cases(id) on delete cascade,
  triggered_by text not null,
  payload_ref text,
  review_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table finance_transactions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14, 2) not null,
  category text not null default '',
  description text not null default '',
  case_ref text,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index finance_transactions_agency_date_idx on finance_transactions (agency_id, occurred_on desc);

create table billing_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  kind text not null,
  target_email text,
  case_ref text,
  amount numeric(14, 2),
  notes text,
  created_at timestamptz not null default now()
);

-- Phase 3: onboarding templates
create table onboarding_templates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  slug text not null,
  name text not null,
  steps jsonb not null default '[]',
  required_assets jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create unique index onboarding_templates_slug_idx on onboarding_templates (agency_id, slug);

-- Phase 4: invoicing + chase
create table invoices (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  case_id uuid references cases(id) on delete set null,
  number text not null,
  currency text not null,
  line_items jsonb not null default '[]',
  subtotal numeric(14, 2) not null default 0,
  vat_amount numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  status text not null default 'draft',
  source_adapter text not null default 'internal',
  external_id text,
  pay_link_url text,
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index invoices_agency_number_idx on invoices (agency_id, number);
create index invoices_agency_status_idx on invoices (agency_id, status, due_at);

create table invoice_payments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(14, 2) not null,
  method text,
  external_ref text,
  paid_at timestamptz not null default now()
);

create table chase_schedules (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  name text not null,
  steps jsonb not null default '[]',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table chase_runs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  step_index integer not null,
  tone text not null,
  channel text not null default 'email',
  status text not null default 'sent',
  sent_at timestamptz not null default now()
);

-- The app connects with a privileged server role that bypasses RLS. Enabling RLS
-- with no policies makes every table unreadable through Supabase's public API.
alter table agencies enable row level security;
alter table users enable row level security;
alter table cases enable row level security;
alter table case_contacts enable row level security;
alter table case_documents enable row level security;
alter table uploads enable row level security;
alter table activity_log enable row level security;
alter table bank_offers enable row level security;
alter table ai_reviews enable row level security;
alter table finance_transactions enable row level security;
alter table billing_events enable row level security;
alter table onboarding_templates enable row level security;
alter table invoices enable row level security;
alter table invoice_payments enable row level security;
alter table chase_schedules enable row level security;
alter table chase_runs enable row level security;
