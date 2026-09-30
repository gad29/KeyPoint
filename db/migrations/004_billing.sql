-- Phase 4: payment requests, payments, reminder cadence.

alter table agencies
  add column invoice_seq integer not null default 1000,
  add column billing_settings jsonb not null default '{}';

alter table invoices
  add column client_name text not null default '',
  add column client_email text,
  add column client_phone text,
  add column summary text,
  add column notes text,
  add column vat_rate numeric(5, 2) not null default 0,
  add column amount_paid numeric(14, 2) not null default 0,
  add column public_token text,
  add column chase_paused boolean not null default false,
  add column external_doc_url text,
  add column viewed_at timestamptz,
  add column updated_at timestamptz not null default now();

create unique index invoices_public_token_idx on invoices (public_token);
create index invoices_case_idx on invoices (case_id);

-- A provider payment (e.g. a Stripe payment intent) can only be recorded once, even if the
-- webhook and the return-page confirmation race each other.
create unique index invoice_payments_external_ref_idx on invoice_payments (external_ref) where external_ref is not null;

alter table chase_runs
  add column subject text not null default '',
  add column body text not null default '',
  add column error text,
  add column created_at timestamptz not null default now(),
  alter column sent_at drop not null,
  alter column sent_at drop default,
  alter column status set default 'draft';

create index chase_runs_invoice_idx on chase_runs (invoice_id, step_index);
