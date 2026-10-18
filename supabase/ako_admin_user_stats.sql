-- supabase/ako_admin_user_stats.sql
--
-- One admin-only call that returns everything the Admin → Growth "Users" section
-- needs, computed in Postgres (the old client-side version fetched raw rows and
-- silently capped at 1,000). "A day" is a Africa/Lagos calendar day, matching the
-- rest of the admin dashboard. Deleted accounts are excluded from every figure
-- except `deleted`.
create or replace function public.admin_user_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  tz constant text := 'Africa/Lagos';
  v_today date := (now() at time zone tz)::date;
  v_month date := date_trunc('month', (now() at time zone tz))::date;
  v_week date := date_trunc('week', (now() at time zone tz))::date;
  v_result jsonb;
begin
  if not exists (select 1 from public.admin_roles where user_id = auth.uid()) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  with p as (
    select (created_at at time zone tz)::date as d,
           account_status, is_verified, last_seen_at
    from public.profiles
    where not is_deleted
  ),
  by_day as (select d, count(*) n from p group by d)
  select jsonb_build_object(
    'total',        (select count(*) from p),
    'deleted',      (select count(*) from public.profiles where is_deleted),
    'first_signup', (select min(d) from p),
    'status', jsonb_build_object(
      'pending',   (select count(*) from p where account_status = 'pending'),
      'approved',  (select count(*) from p where account_status = 'approved'),
      'declined',  (select count(*) from p where account_status = 'declined'),
      'suspended', (select count(*) from p where account_status = 'suspended')
    ),
    'verified',     (select count(*) from p where is_verified),
    'new', jsonb_build_object(
      'today',       (select count(*) from p where d = v_today),
      'yesterday',   (select count(*) from p where d = v_today - 1),
      'this_week',   (select count(*) from p where d >= v_week),
      'last_week',   (select count(*) from p where d >= v_week - 7 and d < v_week),
      'last_7',      (select count(*) from p where d > v_today - 7),
      'prev_7',      (select count(*) from p where d <= v_today - 7 and d > v_today - 14),
      'last_30',     (select count(*) from p where d > v_today - 30),
      'prev_30',     (select count(*) from p where d <= v_today - 30 and d > v_today - 60),
      'this_month',  (select count(*) from p where d >= v_month),
      'last_month',  (select count(*) from p where d >= (v_month - interval '1 month')::date and d < v_month)
    ),
    'active', jsonb_build_object(
      'day',   (select count(*) from p where last_seen_at >= now() - interval '1 day'),
      'week',  (select count(*) from p where last_seen_at >= now() - interval '7 days'),
      'month', (select count(*) from p where last_seen_at >= now() - interval '30 days')
    ),
    'daily', (
      select jsonb_agg(jsonb_build_object('date', g::date, 'count', coalesce(b.n, 0)) order by g)
      from generate_series(v_today - 29, v_today, interval '1 day') g
      left join by_day b on b.d = g::date
    ),
    'weekly', (
      select jsonb_agg(jsonb_build_object('date', w::date, 'count', coalesce(c.n, 0)) order by w)
      from generate_series(v_week - 77, v_week, interval '7 days') w
      left join (select date_trunc('week', d)::date wk, sum(n)::int n from by_day group by 1) c on c.wk = w::date
    ),
    'monthly', (
      select jsonb_agg(jsonb_build_object('date', m::date, 'count', coalesce(c.n, 0)) order by m)
      from generate_series((v_month - interval '11 months')::date, v_month, interval '1 month') m
      left join (select date_trunc('month', d)::date mo, sum(n)::int n from by_day group by 1) c on c.mo = m::date
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_user_stats() from public, anon;
grant execute on function public.admin_user_stats() to authenticated;
