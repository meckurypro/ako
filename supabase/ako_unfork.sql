-- ako_unfork.sql
--
-- Unforking. A fork's owner can drop their own fork: status -> 'unforked'. Everything that pays a commission
-- (process_project_purchase, process_offer_purchase) and logs a click (track_affiliate_click) already requires
-- affiliate_relationships.status = 'active', so an unforked link stops earning at once — including buyers it
-- attributed earlier. Commission already earned (affiliate_commissions) is left alone.
--
-- Buyers attributed to the unforked fork who haven't bought are released, so another fork can claim them
-- (affiliate_attributions is unique per project + buyer). Buyers who already bought keep their row as history.
--
-- Re-forking reuses the same row (unique per program + user) with a NEW referral token, so old links stay dead.

alter table public.affiliate_relationships
  drop constraint if exists affiliate_relationships_status_check;
alter table public.affiliate_relationships
  add constraint affiliate_relationships_status_check
  check (status = any (array['active'::text, 'revoked'::text, 'unforked'::text]));

create or replace function public.unfork_affiliate_relationship(p_project_id uuid)
returns affiliate_relationships
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_relationship affiliate_relationships;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_relationship
  from affiliate_relationships
  where project_id = p_project_id and affiliate_user_id = auth.uid()
  for update;

  if v_relationship.id is null then
    raise exception 'You have not forked this project';
  end if;
  if v_relationship.status = 'revoked' then
    raise exception 'The creator revoked your fork';
  end if;
  if v_relationship.status = 'unforked' then
    return v_relationship;
  end if;

  update affiliate_relationships
  set status = 'unforked', revoked_at = now()
  where id = v_relationship.id
  returning * into v_relationship;

  delete from affiliate_attributions aa
  where aa.affiliate_relationship_id = v_relationship.id
    and not exists (
      select 1 from purchases p
      where p.project_id = aa.project_id and p.buyer_id = aa.buyer_id
    );

  return v_relationship;
end;
$function$;

revoke all on function public.unfork_affiliate_relationship(uuid) from public, anon;
grant execute on function public.unfork_affiliate_relationship(uuid) to authenticated;

-- Same as before, plus: an unforked fork can be forked again (fresh token).
create or replace function public.create_affiliate_relationship(p_project_id uuid)
returns affiliate_relationships
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_program affiliate_programs;
  v_relationship affiliate_relationships;
  v_existing affiliate_relationships;
  v_affiliate_enabled boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select enabled into v_affiliate_enabled from feature_flags where key = 'affiliate_programs_enabled';
  if coalesce(v_affiliate_enabled, true) is false then
    raise exception 'Affiliate programs are temporarily disabled';
  end if;

  select * into v_program from affiliate_programs where project_id = p_project_id;
  if v_program.id is null or v_program.enabled = false then
    raise exception 'This project is not open to affiliate forking';
  end if;

  if v_program.creator_id = auth.uid() then
    raise exception 'The creator cannot become an affiliate of their own project';
  end if;

  select * into v_existing
  from affiliate_relationships
  where affiliate_program_id = v_program.id and affiliate_user_id = auth.uid()
  for update;

  if v_existing.id is not null then
    if v_existing.status = 'unforked' then
      update affiliate_relationships
      set status = 'active', revoked_at = null, referral_token = default
      where id = v_existing.id
      returning * into v_relationship;
      return v_relationship;
    end if;
    raise exception 'You already have an affiliate link for this project';
  end if;

  insert into affiliate_relationships (affiliate_program_id, project_id, affiliate_user_id)
  values (v_program.id, p_project_id, auth.uid())
  returning * into v_relationship;

  return v_relationship;
end;
$function$;
