-- Wallet hardening (applied to the Ako Temp project as migration
-- "wallet_hardening_atomic_deposit_credit").
--
-- 1. credit_deposit(): atomic, idempotent deposit credit used by BOTH
--    paystack-charge-webhook and verify-deposit. Claim + ledger credit happen in
--    one transaction, so a failed credit can never leave a deposit 'success' with
--    no money in the wallet. Validates amount (kobo) and currency.
-- 2. One Paystack reference can fund a wallet only once (partial unique index).
-- 3. Sign/type guards on apply_wallet_transaction (service_role only).
-- 4. Clients are read-only on money tables (no insert/update/delete/truncate).
-- 5. Spend RPCs are not executable by anon.

create or replace function public.credit_deposit(
  p_reference text,
  p_paid_kobo bigint,
  p_currency text,
  p_via text,
  p_meta jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dep deposits;
  v_wallet_id uuid;
  v_txn wallet_transactions;
begin
  select * into v_dep from deposits where paystack_reference = p_reference for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_dep.status = 'success' then
    return jsonb_build_object('status', 'already_credited', 'amount_usd', v_dep.amount_usd, 'user_id', v_dep.user_id);
  end if;

  if coalesce(upper(p_currency), '') <> 'NGN' then
    return jsonb_build_object('status', 'currency_mismatch');
  end if;

  if p_paid_kobo is distinct from round(v_dep.amount_ngn * 100)::bigint then
    return jsonb_build_object('status', 'amount_mismatch', 'expected_kobo', round(v_dep.amount_ngn * 100)::bigint, 'paid_kobo', p_paid_kobo);
  end if;

  select id into v_wallet_id from wallets where user_id = v_dep.user_id;
  if v_wallet_id is null then
    raise exception 'Wallet not found for deposit %', v_dep.id;
  end if;

  v_txn := apply_wallet_transaction(
    v_wallet_id, 'fund', v_dep.amount_usd, v_dep.paystack_reference, null,
    coalesce(p_meta, '{}'::jsonb) || jsonb_build_object('source', 'paystack_deposit', 'verified_via', p_via)
  );

  update deposits
     set status = 'success', verified_at = now(), wallet_transaction_id = v_txn.id
   where id = v_dep.id;

  return jsonb_build_object('status', 'credited', 'amount_usd', v_dep.amount_usd, 'user_id', v_dep.user_id, 'wallet_transaction_id', v_txn.id);
end;
$$;

revoke all on function public.credit_deposit(text, bigint, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.credit_deposit(text, bigint, text, text, jsonb) to service_role;

create unique index if not exists wallet_transactions_fund_reference_uniq
  on public.wallet_transactions (reference)
  where type = 'fund' and reference is not null;

create or replace function public.apply_wallet_transaction(
  p_wallet_id uuid, p_type text, p_amount numeric,
  p_reference text default null, p_related_transaction_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns wallet_transactions
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_current_balance numeric(14,2);
  v_new_balance numeric(14,2);
  v_txn wallet_transactions;
begin
  if p_amount is null then
    raise exception 'Amount is required';
  end if;
  if p_type in ('fund', 'dev_credit') and p_amount <= 0 then
    raise exception '% must be a positive amount', p_type;
  end if;
  if p_type = 'gift_sent' and p_amount >= 0 then
    raise exception 'gift_sent must be a negative amount';
  end if;
  if p_type = 'purchase_sent' and p_amount > 0 then
    raise exception 'purchase_sent cannot be positive';
  end if;

  select balance into v_current_balance from wallets where id = p_wallet_id for update;
  if not found then
    raise exception 'Wallet % not found', p_wallet_id;
  end if;

  v_new_balance := v_current_balance + p_amount;
  if v_new_balance < 0 then
    raise exception 'Insufficient balance: wallet % has %, attempted debit of %',
      p_wallet_id, v_current_balance, abs(p_amount);
  end if;

  insert into wallet_transactions (wallet_id, type, amount, balance_after, reference, related_transaction_id, metadata)
  values (p_wallet_id, p_type, p_amount, v_new_balance, p_reference, p_related_transaction_id, p_metadata)
  returning * into v_txn;

  update wallets set balance = v_new_balance, updated_at = now() where id = p_wallet_id;
  return v_txn;
end;
$function$;

revoke all on function public.apply_wallet_transaction(uuid, text, numeric, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.apply_wallet_transaction(uuid, text, numeric, text, uuid, jsonb) to service_role;

revoke insert, update, delete, truncate, references, trigger on
  public.wallets, public.wallet_transactions, public.deposits, public.purchases,
  public.gifts, public.gift_splits, public.affiliate_commissions
from anon, authenticated;

revoke execute on function public.process_media_gift(uuid, uuid, uuid) from public, anon;
grant execute on function public.process_media_gift(uuid, uuid, uuid) to authenticated, service_role;
revoke execute on function public.settle_promotion_give_back(uuid) from public, anon;
grant execute on function public.settle_promotion_give_back(uuid) to authenticated, service_role;
