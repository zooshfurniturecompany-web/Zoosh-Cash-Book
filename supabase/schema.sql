-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. Accounts Table
create table if not exists public.accounts (
    id uuid default gen_random_uuid() primary key,
    account_name text not null unique,
    account_type text not null check (account_type in ('Bank', 'Cash')),
    opening_balance numeric(15, 2) not null default 0.00,
    active boolean not null default true,
    created_at timestamp with time zone not null default now()
);

-- Index for account searches/sorting
create index if not exists idx_accounts_active on public.accounts(active);

-- 2. Cash Book Entries Table
create table if not exists public.cash_book_entries (
    id uuid default gen_random_uuid() primary key,
    transaction_date date not null,
    particulars text not null,
    remarks text,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

-- Index for transaction date
create index if not exists idx_cash_book_entries_date on public.cash_book_entries(transaction_date desc);

-- 3. Cash Book Entry Details Table (Normalized details per account)
create table if not exists public.cash_book_entry_details (
    id uuid default gen_random_uuid() primary key,
    cashbook_entry_id uuid not null references public.cash_book_entries(id) on delete cascade,
    account_id uuid not null references public.accounts(id) on delete cascade,
    amount numeric(15, 2) not null,
    
    -- Ensure an entry only affects a specific account once
    constraint unique_entry_account unique(cashbook_entry_id, account_id)
);

-- Indexes for performance on joins
create index if not exists idx_entry_details_entry_id on public.cash_book_entry_details(cashbook_entry_id);
create index if not exists idx_entry_details_account_id on public.cash_book_entry_details(account_id);

-- 4. Day States Table (To track closed/open status per date)
create table if not exists public.day_states (
    date date primary key,
    is_closed boolean not null default false,
    closed_at timestamp with time zone,
    created_at timestamp with time zone not null default now()
);

-- 5. RPC Function to fetch opening balances for all accounts at a given date
create or replace function public.get_opening_balances(p_date date)
returns table (account_id uuid, total_balance numeric) as $$
begin
    return query
    select 
        a.id as account_id,
        coalesce(a.opening_balance, 0) + coalesce(sum(d.amount), 0) as total_balance
    from public.accounts a
    left join public.cash_book_entry_details d on d.account_id = a.id
    left join public.cash_book_entries e on d.cashbook_entry_id = e.id and e.transaction_date < p_date
    group by a.id;
end;
$$ language plpgsql;

-- Disable Row-Level Security (RLS) on all Cash Book tables
alter table public.accounts disable row level security;
alter table public.cash_book_entries disable row level security;
alter table public.cash_book_entry_details disable row level security;
alter table public.day_states disable row level security;
