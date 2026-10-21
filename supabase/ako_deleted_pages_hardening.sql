-- Deleted pages stay deleted.
--
-- delete_page() is a soft delete (pages.is_active = false). Nothing stopped a member from switching
-- back INTO a deleted page (switch_active_mode only checked page_members), and anyone still pointing
-- at one kept acting as it. This closes both: switching into an inactive page is refused, and any
-- profile still "acting as" an inactive page is put back on their personal account.

create or replace function public.switch_active_mode(p_page_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  if p_page_id is not null and not exists (
    select 1
    from public.page_members pm
    join public.pages pg on pg.id = pm.page_id
    where pm.page_id = p_page_id
      and pm.user_id = auth.uid()
      and pm.status = 'active'
      and pg.is_active
  ) then
    raise exception 'You do not have an active role on this page';
  end if;

  update public.profiles set active_page_id = p_page_id where id = auth.uid();
end;
$function$;

-- One-off clean-up for pages deleted before this fix.
update public.profiles p
set active_page_id = null
where p.active_page_id is not null
  and exists (select 1 from public.pages pg where pg.id = p.active_page_id and not pg.is_active);
