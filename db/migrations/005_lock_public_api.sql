-- Supabase grants its public API roles (anon, authenticated) access to new tables by default.
-- The app only talks to the database from the server, so remove those grants entirely: RLS
-- already blocks every row, and this also hides the tables from the public REST/GraphQL schema.
-- No-op on plain Postgres, where these roles don't exist.
do $$
declare
  api_role text;
begin
  foreach api_role in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = api_role) then
      execute format('revoke all on all tables in schema public from %I', api_role);
      execute format('revoke all on all sequences in schema public from %I', api_role);
      execute format('revoke all on all functions in schema public from %I', api_role);
      execute format('alter default privileges in schema public revoke all on tables from %I', api_role);
      execute format('alter default privileges in schema public revoke all on sequences from %I', api_role);
      execute format('alter default privileges in schema public revoke all on functions from %I', api_role);
    end if;
  end loop;
end $$;
