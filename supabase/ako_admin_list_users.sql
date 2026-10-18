-- supabase/ako_admin_list_users.sql
--
-- Admin → Growth → tap a Users card → paginated list of the users behind that
-- number (name, username, email). Filters mirror admin_user_stats() exactly
-- (same Africa/Lagos calendar-day boundaries, deleted accounts excluded), so the
-- list length always equals the number on the card. Email comes from auth.users,
-- which is why this is SECURITY DEFINER and admin-gated. `total_count` is the
-- full match count on every row so the client can render "Page X of Y".
create or replace function public.admin_list_users(
  p_filter text default 'all',
  p_search text default null,
  p_limit  integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  display_name text,
  username text,
  email text,
  avatar_url text,
  account_status text,
  is_verified boolean,
  created_at timestamptz,
  last_seen_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path to 'public', 'auth'
as $$
declare
  tz constant text := 'Africa/Lagos';
  v_today date := (now() at time zone tz)::date;
  v_week  date := date_trunc('week',  (now() at time zone tz))::date;
  v_month date := date_trunc('month', (now() at time zone tz))::date;
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not exists (select 1 from public.admin_roles r where r.user_id = auth.uid()) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_filter not in ('all','today','this_week','this_month','last_7','last_30',
                      'active_day','active_week','active_month') then
    raise exception 'Unknown filter: %', p_filter using errcode = '22023';
  end if;

  return query
  select p.id, p.display_name, p.username, u.email::text, p.avatar_url,
         p.account_status, p.is_verified, p.created_at, p.last_seen_at,
         count(*) over () as total_count
  from public.profiles p
  left join auth.users u on u.id = p.id
  where not p.is_deleted
    and case p_filter
      when 'all'          then true
      when 'today'        then (p.created_at at time zone tz)::date = v_today
      when 'this_week'    then (p.created_at at time zone tz)::date >= v_week
      when 'this_month'   then (p.created_at at time zone tz)::date >= v_month
      when 'last_7'       then (p.created_at at time zone tz)::date > v_today - 7
      when 'last_30'      then (p.created_at at time zone tz)::date > v_today - 30
      when 'active_day'   then p.last_seen_at >= now() - interval '1 day'
      when 'active_week'  then p.last_seen_at >= now() - interval '7 days'
      when 'active_month' then p.last_seen_at >= now() - interval '30 days'
    end
    and (
      v_search is null
      or p.display_name ilike '%' || v_search || '%'
      or p.username     ilike '%' || v_search || '%'
      or u.email        ilike '%' || v_search || '%'
    )
  order by case when p_filter like 'active%' then p.last_seen_at else p.created_at end desc,
           p.id
  limit v_limit offset v_offset;
end;
$$;

revoke all on function public.admin_list_users(text, text, integer, integer) from public, anon;
grant execute on function public.admin_list_users(text, text, integer, integer) to authenticated;
