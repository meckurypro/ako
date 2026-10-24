-- File: supabase/ako_wallet_txn_range_index.sql
-- The Transactions page now asks for one person's ledger rows within a date range (month / time frame), newest
-- first. This index serves exactly that: filter by wallet, range-scan and order by created_at. Safe to re-run.
create index if not exists idx_wallet_txns_wallet_created
  on public.wallet_transactions (wallet_id, created_at desc);
