-- My Expense Manager database schema
-- Run this in Supabase Dashboard > SQL Editor.
-- RLS ensures each signed-in user can access only their own rows.

create table if not exists public.transactions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14,2) not null check (amount > 0),
  category text not null,
  transaction_date date not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx
  on public.transactions(user_id, transaction_date desc);

alter table public.transactions enable row level security;

drop policy if exists "Users can view their own transactions" on public.transactions;
create policy "Users can view their own transactions"
  on public.transactions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own transactions" on public.transactions;
create policy "Users can insert their own transactions"
  on public.transactions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own transactions" on public.transactions;
create policy "Users can update their own transactions"
  on public.transactions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own transactions" on public.transactions;
create policy "Users can delete their own transactions"
  on public.transactions for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.transactions to authenticated;
