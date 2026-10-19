-- supabase/ako_offers.sql
-- ============================================================
-- AKỌ — Offers (bundles)
-- ============================================================
-- A creator bundles 2+ of their OWN paid projects at one price (up to 10
-- offers each). Buying an offer unlocks every project in it. When someone
-- is about to buy one project, the app suggests any offer that contains it.
--
-- How access works here (read from the live schema, not assumed):
--   * Access to a paid project IS a row in `purchases` (buyer_id, project_id);
--     book_chapters, course_modules/lessons, meeting_* and gig_reviews RLS all
--     key off it. So buying an offer simply creates ONE purchases row per
--     project in the offer — every existing gate works unchanged.
--   * process_offer_purchase() mirrors process_project_purchase() per project
--     (platform fee, affiliate commission, wallet debit/credit, the
--     'project_purchased' notification which reads metadata.project_id and
--     metadata.buyer_id) — the offer price is split across the projects in
--     proportion to their effective prices, and everything runs in ONE
--     transaction: the buyer is never charged without being unlocked.
--
-- Eligible project types: book, course, media, file, url, meeting.
-- Excluded on purpose (v1): event + room (their purchase has side effects —
-- ticket issue / room membership — that must not be duplicated here), gig
-- (booking flow + conversation), pitch (no price).
--
-- Money is USD like the rest of the platform (price_usd / amount_usd).
--
-- Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================

-- ---------- tables ----------

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  price_usd numeric(10,2) not null check (price_usd > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists offers_owner_idx on public.offers (owner_id);

create table if not exists public.offer_items (
  offer_id uuid not null references public.offers(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  primary key (offer_id, project_id)
);
create index if not exists offer_items_project_idx on public.offer_items (project_id);

-- Which offer (if any) a purchase came from.
alter table public.purchases
  add column if not exists offer_id uuid references public.offers(id) on delete set null;

-- ---------- RLS: owners can read their own; all writes go through RPCs ----------

alter table public.offers enable row level security;
alter table public.offer_items enable row level security;

drop policy if exists "Owners can view their offers" on public.offers;
create policy "Owners can view their offers" on public.offers
  for select using ((select auth.uid()) = owner_id);

drop policy if exists "Owners can view their offer items" on public.offer_items;
create policy "Owners can view their offer items" on public.offer_items
  for select using (
    exists (select 1 from public.offers o
            where o.id = offer_items.offer_id and o.owner_id = (select auth.uid()))
  );

revoke insert, update, delete on public.offers from anon, authenticated;
revoke insert, update, delete on public.offer_items from anon, authenticated;

-- An offer left with fewer than 2 projects (e.g. one was deleted) is meaningless.
create or replace function public.trg_offer_items_cleanup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from offer_items where offer_id = old.offer_id) < 2 then
    delete from offers where id = old.offer_id;
  end if;
  return old;
end;
$$;
drop trigger if exists trg_offer_items_cleanup on public.offer_items;
create trigger trg_offer_items_cleanup
  after delete on public.offer_items
  for each row execute function public.trg_offer_items_cleanup();

-- ---------- shared rules ----------

create or replace function public.offer_eligible_project_types()
returns text[] language sql immutable as $$
  select array['book','course','media','file','url','meeting']::text[];
$$;

-- Validates a proposed offer for its owner and returns the sum of the
-- projects' effective prices. p_ids must already be de-duplicated + sorted.
create or replace function public.offer_validate(
  p_owner uuid, p_price numeric, p_ids uuid[], p_exclude_offer uuid
) returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_found int;
  v_sum numeric;
begin
  if p_ids is null or coalesce(array_length(p_ids, 1), 0) < 2 then
    raise exception 'An offer needs at least 2 projects';
  end if;
  if p_price is null or round(p_price, 2) <= 0 then
    raise exception 'Enter an offer price greater than 0';
  end if;

  select count(*), coalesce(sum(coalesce(promo_price_usd, price_usd)), 0)
    into v_found, v_sum
  from projects
  where id = any(p_ids)
    and owner_id = p_owner
    and is_active = true and status = 'active' and is_private = false
    and project_type = any(offer_eligible_project_types())
    and coalesce(promo_price_usd, price_usd) > 0
    and (project_type <> 'course' or published_at is not null);

  if v_found <> array_length(p_ids, 1) then
    raise exception 'Offers can only include your own published, paid projects (books, courses, media, files, links, meetings)';
  end if;

  if round(p_price, 2) >= v_sum then
    raise exception 'The offer price must be lower than the total of its projects ($%)', to_char(v_sum, 'FM999999990.00');
  end if;

  if exists (
    select 1 from offers o
    where o.owner_id = p_owner
      and (p_exclude_offer is null or o.id <> p_exclude_offer)
      and (select array_agg(oi.project_id order by oi.project_id)
             from offer_items oi where oi.offer_id = o.id) = p_ids
  ) then
    raise exception 'You already have an offer with exactly these projects';
  end if;

  return v_sum;
end;
$$;

-- JSON view of one offer: items, totals, and whether it is currently sellable.
create or replace function public.offer_details(p_offer_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_offer offers;
  v_items jsonb;
  v_sum numeric;
  v_total int;
  v_ok int;
  v_problem text;
begin
  select * into v_offer from offers where id = p_offer_id;
  if not found then return null; end if;

  with x as (
    select p.id, p.title, p.thumbnail_url, p.project_type,
           coalesce(p.promo_price_usd, p.price_usd) as eff,
           (p.is_active and p.status = 'active' and not p.is_private
            and p.project_type = any(offer_eligible_project_types())
            and coalesce(p.promo_price_usd, p.price_usd) > 0
            and (p.project_type <> 'course' or p.published_at is not null)
            and p.owner_id = v_offer.owner_id) as ok
    from offer_items oi
    join projects p on p.id = oi.project_id
    where oi.offer_id = p_offer_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', id, 'title', title, 'thumbnail_url', thumbnail_url,
           'project_type', project_type, 'price_usd', eff, 'available', ok
         ) order by title, id), '[]'::jsonb),
         coalesce(sum(eff), 0), count(*), count(*) filter (where ok)
    into v_items, v_sum, v_total, v_ok
  from x;

  if v_total < 2 or v_ok < v_total then
    v_problem := 'unavailable';
  elsif v_offer.price_usd >= v_sum then
    v_problem := 'not_discounted';
  end if;

  return jsonb_build_object(
    'id', v_offer.id,
    'owner_id', v_offer.owner_id,
    'price_usd', v_offer.price_usd,
    'sum_usd', v_sum,
    'savings_usd', v_sum - v_offer.price_usd,
    'savings_pct', case when v_sum > 0 then round((v_sum - v_offer.price_usd) / v_sum * 100) else 0 end,
    'items', v_items,
    'is_valid', v_problem is null,
    'problem', v_problem,
    'created_at', v_offer.created_at,
    'updated_at', v_offer.updated_at
  );
end;
$$;

-- ---------- creator RPCs ----------

create or replace function public.create_offer(p_price numeric, p_project_ids uuid[])
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ids uuid[];
  v_offer offers;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;

  -- Serialise a creator's offer writes so the 10-offer cap can't be raced.
  perform pg_advisory_xact_lock(hashtextextended('offers:' || v_uid::text, 0));

  if (select count(*) from offers where owner_id = v_uid) >= 10 then
    raise exception 'You can have up to 10 offers. Delete one to add another.';
  end if;

  select array_agg(distinct x order by x) into v_ids from unnest(p_project_ids) x;
  perform offer_validate(v_uid, p_price, v_ids, null);

  insert into offers (owner_id, price_usd) values (v_uid, round(p_price, 2))
  returning * into v_offer;
  insert into offer_items (offer_id, project_id)
  select v_offer.id, unnest(v_ids);

  return offer_details(v_offer.id);
end;
$$;

create or replace function public.update_offer(p_offer_id uuid, p_price numeric, p_project_ids uuid[])
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ids uuid[];
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  perform pg_advisory_xact_lock(hashtextextended('offers:' || v_uid::text, 0));

  if not exists (select 1 from offers where id = p_offer_id and owner_id = v_uid) then
    raise exception 'Offer not found';
  end if;

  select array_agg(distinct x order by x) into v_ids from unnest(p_project_ids) x;
  perform offer_validate(v_uid, p_price, v_ids, p_offer_id);

  -- Insert the new set first, then drop removed ones, so the "fewer than 2
  -- items" cleanup trigger can never delete the offer mid-edit.
  insert into offer_items (offer_id, project_id)
  select p_offer_id, unnest(v_ids)
  on conflict do nothing;
  delete from offer_items where offer_id = p_offer_id and project_id <> all (v_ids);
  update offers set price_usd = round(p_price, 2), updated_at = now() where id = p_offer_id;

  return offer_details(p_offer_id);
end;
$$;

create or replace function public.delete_offer(p_offer_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  delete from offers where id = p_offer_id and owner_id = auth.uid();
  if not found then raise exception 'Offer not found'; end if;
end;
$$;

create or replace function public.get_my_offers()
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(offer_details(o.id) order by o.created_at desc), '[]'::jsonb)
  from offers o
  where o.owner_id = auth.uid();
$$;

-- ---------- buyer RPCs ----------

-- Offers worth suggesting to someone about to buy p_project_id: valid, from
-- another creator, and the buyer owns none of the projects in it (an offer
-- they'd partly pay for twice is never suggested). Best saving first, max 3.
create or replace function public.get_project_offers(p_project_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(t.d order by (t.d->>'savings_usd')::numeric desc), '[]'::jsonb)
    into v_result
  from (
    select s.d
    from (
      select offer_details(o.id) as d
      from offers o
      where o.owner_id <> v_uid
        and exists (select 1 from offer_items oi
                    where oi.offer_id = o.id and oi.project_id = p_project_id)
        and not exists (select 1 from offer_items oi
                        join purchases pu on pu.project_id = oi.project_id and pu.buyer_id = v_uid
                        where oi.offer_id = o.id)
    ) s
    where (s.d->>'is_valid')::boolean
    order by (s.d->>'savings_usd')::numeric desc
    limit 3
  ) t;

  return v_result;
end;
$$;

-- Atomic offer purchase. Mirrors process_project_purchase() per project.
create or replace function public.process_offer_purchase(p_buyer_id uuid, p_offer_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_offer offers;
  v_detail jsonb;
  v_purchases_enabled boolean;
  v_platform_fee_pct numeric;
  v_buyer_wallet_id uuid;
  v_owner_wallet_id uuid;
  v_balance numeric;
  v_sum numeric;
  v_n int;
  v_i int := 0;
  v_allocated numeric(10,2) := 0;
  r record;
  v_alloc numeric(10,2);
  v_platform_fee numeric(10,2);
  v_pre_affiliate_net numeric(10,2);
  v_net_amount numeric(10,2);
  v_buyer_txn wallet_transactions;
  v_owner_txn wallet_transactions;
  v_purchase purchases;
  v_purchases jsonb := '[]'::jsonb;
  -- affiliate
  v_relationship_id uuid;
  v_affiliate_user_id uuid;
  v_program_id uuid;
  v_commission_version_id uuid;
  v_commission_pct numeric;
  v_affiliate_amount numeric(10,2);
  v_affiliate_wallet_id uuid;
  v_affiliate_txn wallet_transactions;
begin
  if auth.uid() is null or auth.uid() != p_buyer_id then
    raise exception 'Not authorized to purchase as this user';
  end if;

  select enabled into v_purchases_enabled from feature_flags where key = 'purchases_enabled';
  if coalesce(v_purchases_enabled, true) is false then
    raise exception 'Paid project purchases are temporarily disabled';
  end if;

  select fee_pct into v_platform_fee_pct from platform_fees where kind = 'project_purchase';
  if v_platform_fee_pct is null then
    raise exception 'Platform fee configuration missing for project_purchase';
  end if;

  select * into v_offer from offers where id = p_offer_id;
  if not found then raise exception 'Offer not found'; end if;
  if v_offer.owner_id = p_buyer_id then raise exception 'Cannot purchase your own offer'; end if;

  v_detail := offer_details(p_offer_id);
  if not (v_detail->>'is_valid')::boolean then
    raise exception 'This offer is no longer available';
  end if;
  v_sum := (v_detail->>'sum_usd')::numeric;

  if exists (
    select 1 from purchases pu
    join offer_items oi on oi.project_id = pu.project_id
    where oi.offer_id = p_offer_id and pu.buyer_id = p_buyer_id
  ) then
    raise exception 'You already own one or more projects in this offer';
  end if;

  select id, balance into v_buyer_wallet_id, v_balance from wallets where user_id = p_buyer_id;
  select id into v_owner_wallet_id from wallets where user_id = v_offer.owner_id;
  if v_buyer_wallet_id is null or v_owner_wallet_id is null then
    raise exception 'Wallet not found';
  end if;
  if v_balance < v_offer.price_usd then
    raise exception 'Insufficient balance. Fund your wallet to buy this offer.';
  end if;

  select count(*) into v_n from offer_items where offer_id = p_offer_id;

  for r in
    select p.id as project_id, p.project_type,
           coalesce(p.promo_price_usd, p.price_usd) as eff
    from offer_items oi
    join projects p on p.id = oi.project_id
    where oi.offer_id = p_offer_id
    order by p.id
  loop
    v_i := v_i + 1;

    -- Proportional share of the offer price; the last project takes the
    -- rounding remainder so shares always add up to exactly the offer price.
    if v_i < v_n then
      v_alloc := round(v_offer.price_usd * r.eff / v_sum, 2);
      v_allocated := v_allocated + v_alloc;
    else
      v_alloc := v_offer.price_usd - v_allocated;
      if v_alloc < 0 then raise exception 'Offer price is too low to split across its projects'; end if;
    end if;

    v_platform_fee := round(v_alloc * v_platform_fee_pct, 2);
    v_pre_affiliate_net := v_alloc - v_platform_fee;
    v_net_amount := v_pre_affiliate_net;

    v_relationship_id := null; v_affiliate_user_id := null; v_program_id := null;
    v_commission_version_id := null; v_commission_pct := null;
    v_affiliate_amount := null; v_affiliate_wallet_id := null;

    select aa.affiliate_relationship_id, ar.affiliate_user_id, ar.affiliate_program_id
      into v_relationship_id, v_affiliate_user_id, v_program_id
    from affiliate_attributions aa
    join affiliate_relationships ar on ar.id = aa.affiliate_relationship_id
    join affiliate_programs ap on ap.id = ar.affiliate_program_id
    where aa.project_id = r.project_id
      and aa.buyer_id = p_buyer_id
      and aa.status = 'active'
      and aa.expires_at > now()
      and ar.status = 'active'
      and (ap.enabled = true or ap.existing_forks_survive_disable = true)
      and ar.affiliate_user_id != p_buyer_id;

    if v_relationship_id is not null then
      select id, commission_pct into v_commission_version_id, v_commission_pct
      from affiliate_commission_versions
      where affiliate_program_id = v_program_id and effective_from <= now()
      order by effective_from desc
      limit 1;

      if v_commission_version_id is not null and v_alloc > 0 then
        select id into v_affiliate_wallet_id from wallets where user_id = v_affiliate_user_id;
        if v_affiliate_wallet_id is not null then
          v_affiliate_amount := round(v_pre_affiliate_net * v_commission_pct, 2);
          v_net_amount := v_pre_affiliate_net - v_affiliate_amount;
        else
          v_relationship_id := null;
        end if;
      else
        v_relationship_id := null;
      end if;
    end if;

    v_buyer_txn := apply_wallet_transaction(
      v_buyer_wallet_id, 'purchase_sent', -v_alloc, null, null,
      jsonb_build_object('project_id', r.project_id, 'owner_id', v_offer.owner_id, 'offer_id', p_offer_id)
    );

    v_owner_txn := apply_wallet_transaction(
      v_owner_wallet_id, 'purchase_received', v_net_amount, null, null,
      jsonb_build_object('project_id', r.project_id, 'buyer_id', p_buyer_id,
                         'affiliate_relationship_id', v_relationship_id, 'offer_id', p_offer_id)
    );

    insert into purchases (
      buyer_id, project_id, amount_usd, platform_fee, net_amount,
      buyer_transaction_id, owner_transaction_id, affiliate_relationship_id, offer_id
    ) values (
      p_buyer_id, r.project_id, v_alloc, v_platform_fee, v_net_amount,
      v_buyer_txn.id, v_owner_txn.id, v_relationship_id, p_offer_id
    ) returning * into v_purchase;

    if v_relationship_id is not null then
      v_affiliate_txn := apply_wallet_transaction(
        v_affiliate_wallet_id, 'affiliate_commission', v_affiliate_amount, null, null,
        jsonb_build_object('project_id', r.project_id, 'purchase_id', v_purchase.id,
                           'buyer_id', p_buyer_id, 'offer_id', p_offer_id)
      );

      insert into affiliate_commissions (
        purchase_id, project_id, affiliate_relationship_id, affiliate_user_id,
        commission_version_id, commission_pct, eligible_amount, commission_amount,
        affiliate_transaction_id
      ) values (
        v_purchase.id, r.project_id, v_relationship_id, v_affiliate_user_id,
        v_commission_version_id, v_commission_pct, v_pre_affiliate_net, v_affiliate_amount,
        v_affiliate_txn.id
      );
    end if;

    v_purchases := v_purchases || to_jsonb(v_purchase);
  end loop;

  return jsonb_build_object(
    'offer_id', p_offer_id,
    'total_usd', v_offer.price_usd,
    'purchases', v_purchases
  );
end;
$$;

-- ---------- grants ----------

revoke all on function public.offer_eligible_project_types() from public, anon, authenticated;
revoke all on function public.offer_validate(uuid, numeric, uuid[], uuid) from public, anon, authenticated;
revoke all on function public.offer_details(uuid) from public, anon, authenticated;
revoke all on function public.trg_offer_items_cleanup() from public, anon, authenticated;

revoke all on function public.create_offer(numeric, uuid[]) from public, anon;
revoke all on function public.update_offer(uuid, numeric, uuid[]) from public, anon;
revoke all on function public.delete_offer(uuid) from public, anon;
revoke all on function public.get_my_offers() from public, anon;
revoke all on function public.get_project_offers(uuid) from public, anon;
revoke all on function public.process_offer_purchase(uuid, uuid) from public, anon;
grant execute on function public.create_offer(numeric, uuid[]) to authenticated;
grant execute on function public.update_offer(uuid, numeric, uuid[]) to authenticated;
grant execute on function public.delete_offer(uuid) to authenticated;
grant execute on function public.get_my_offers() to authenticated;
grant execute on function public.get_project_offers(uuid) to authenticated;
grant execute on function public.process_offer_purchase(uuid, uuid) to authenticated;
