-- Shift admin push notifications from Vercel Cron to Supabase pg_cron + pg_net.
-- The job GETs the Next.js route /api/cron/admin-push with Authorization: Bearer <CRON_SECRET>.
--
-- Before the first run, store vault secrets (do not commit values):
--   select vault.create_secret(
--     'https://<app-host>/api/cron/admin-push',
--     'admin_push_cron_url',
--     'Full URL for admin push cron'
--   );
--   select vault.create_secret(
--     '<same value as app CRON_SECRET>',
--     'cron_secret',
--     'Bearer token for /api/cron/*'
--   );
-- Or run: pnpm exec tsx scripts/setup-admin-push-cron-secrets.ts

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to postgres;
grant usage on schema private to service_role;

create or replace function private.invoke_admin_push_cron()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_id bigint;
  cron_url text;
  cron_secret text;
begin
  select ds.decrypted_secret
  into cron_url
  from vault.decrypted_secrets as ds
  where ds.name = 'admin_push_cron_url'
  limit 1;

  select ds.decrypted_secret
  into cron_secret
  from vault.decrypted_secrets as ds
  where ds.name = 'cron_secret'
  limit 1;

  if cron_url is null or btrim(cron_url) = '' then
    raise warning 'admin push cron skipped: vault secret admin_push_cron_url is missing';
    return null;
  end if;

  if cron_secret is null or btrim(cron_secret) = '' then
    raise warning 'admin push cron skipped: vault secret cron_secret is missing';
    return null;
  end if;

  select net.http_get(
    url := cron_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cron_secret,
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 15000
  )
  into request_id;

  return request_id;
end;
$$;

revoke all on function private.invoke_admin_push_cron() from public;
grant execute on function private.invoke_admin_push_cron() to postgres;
grant execute on function private.invoke_admin_push_cron() to service_role;

-- Daily at 08:00 Asia/Kolkata (02:30 UTC).
do $$
begin
  perform cron.unschedule('admin-push-notifications');
exception
  when others then
    -- Job may not exist yet on first apply.
    null;
end
$$;

select cron.schedule(
  'admin-push-notifications',
  '30 2 * * *',
  $$select private.invoke_admin_push_cron()$$
);
