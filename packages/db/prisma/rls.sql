-- Defense-in-depth tenant isolation and retention safeguards.
-- Not a Prisma migration (Prisma doesn't manage RLS/grants declaratively) —
-- apply manually after `prisma migrate deploy`, or wire into a migration
-- hook once the CI/deploy pipeline exists. Re-runnable (idempotent).
--
-- Column names are quoted camelCase because the Prisma schema only maps
-- table names via @@map, not individual fields via @map — Prisma's default
-- column naming is camelCase, not snake_case.

-- ---------------------------------------------------------------------------
-- Row-Level Security: backstop for tenant scoping, independent of whether the
-- application query layer correctly injects a company_id/organization_id
-- filter. The app sets `app.current_company_ids` (comma-separated) per
-- request via `SET LOCAL` inside each transaction.
-- ---------------------------------------------------------------------------

alter table companies enable row level security;
alter table clients enable row level security;
alter table products enable row level security;
alter table invoices enable row level security;
alter table invoice_lines enable row level security;
alter table invoice_documents enable row level security;
alter table invoice_status_history enable row level security;
alter table dgi_submissions enable row level security;

-- INSERT is intentionally permissive (WITH CHECK true, not scoped to
-- current_company_ids): a brand-new company's own id can never already be a
-- member of that session var — it doesn't exist until this INSERT completes.
-- Authorization for *creating* a company is already fully enforced at the
-- app layer (protectedProcedure + assertCanWrite + organizationId taken from
-- the verified Clerk session, never client input) — RLS's job here is to
-- stop a buggy/compromised query from reading or writing an *existing*
-- company outside the caller's scope, which SELECT/UPDATE/DELETE below still
-- cover.
-- Postgres policies only take a single command in FOR, hence three separate
-- policies rather than one FOR ALL — kept apart deliberately so a future
-- update to add e.g. FOR UPDATE logic doesn't accidentally loosen INSERT.
drop policy if exists company_isolation on companies;
drop policy if exists company_select on companies;
create policy company_select on companies
  for select
  using (id::text = any(string_to_array(current_setting('app.current_company_ids', true), ',')));

drop policy if exists company_update on companies;
create policy company_update on companies
  for update
  using (id::text = any(string_to_array(current_setting('app.current_company_ids', true), ',')))
  with check (id::text = any(string_to_array(current_setting('app.current_company_ids', true), ',')));

drop policy if exists company_delete on companies;
create policy company_delete on companies
  for delete
  using (id::text = any(string_to_array(current_setting('app.current_company_ids', true), ',')));

drop policy if exists company_insert on companies;
create policy company_insert on companies
  for insert
  with check (true);

drop policy if exists client_isolation on clients;
create policy client_isolation on clients
  using ("companyId"::text = any(string_to_array(current_setting('app.current_company_ids', true), ',')));

drop policy if exists product_isolation on products;
create policy product_isolation on products
  using ("companyId"::text = any(string_to_array(current_setting('app.current_company_ids', true), ',')));

drop policy if exists invoice_isolation on invoices;
create policy invoice_isolation on invoices
  using ("companyId"::text = any(string_to_array(current_setting('app.current_company_ids', true), ',')));

drop policy if exists invoice_line_isolation on invoice_lines;
create policy invoice_line_isolation on invoice_lines
  using ("invoiceId" in (
    select id from invoices
    where "companyId"::text = any(string_to_array(current_setting('app.current_company_ids', true), ','))
  ));

drop policy if exists invoice_document_isolation on invoice_documents;
create policy invoice_document_isolation on invoice_documents
  using ("invoiceId" in (
    select id from invoices
    where "companyId"::text = any(string_to_array(current_setting('app.current_company_ids', true), ','))
  ));

drop policy if exists invoice_status_history_isolation on invoice_status_history;
create policy invoice_status_history_isolation on invoice_status_history
  using ("invoiceId" in (
    select id from invoices
    where "companyId"::text = any(string_to_array(current_setting('app.current_company_ids', true), ','))
  ));

drop policy if exists dgi_submission_isolation on dgi_submissions;
create policy dgi_submission_isolation on dgi_submissions
  using ("invoiceId" in (
    select id from invoices
    where "companyId"::text = any(string_to_array(current_setting('app.current_company_ids', true), ','))
  ));

-- ---------------------------------------------------------------------------
-- Retention: no hard deletes on legally-retained records, enforced at the DB
-- grant level so an application bug (or a future engineer) can't violate the
-- void/credit-note-only correction model. Deferred to Phase 6 (hardening) —
-- `app_user` is a dedicated low-privilege role the api app will connect as
-- instead of the Supabase master `postgres` role; this no-ops safely until
-- that role exists.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'app_user') then
    execute 'revoke delete on invoices, invoice_lines, invoice_documents, invoice_status_history, dgi_submissions from app_user';
  end if;
end $$;
