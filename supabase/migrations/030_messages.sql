-- Buyer ↔ seller messaging (per shop thread: buyer + shop seller)

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  content text not null check (length(trim(content)) > 0),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint messages_no_self_message check (sender_id <> receiver_id)
);

create index if not exists messages_shop_id_created_at_idx on public.messages (shop_id, created_at desc);
create index if not exists messages_receiver_unread_idx on public.messages (receiver_id, is_read) where is_read = false;
create index if not exists messages_shop_participants_idx on public.messages (shop_id, sender_id, receiver_id);

alter table public.messages enable row level security;

-- Participants can read their own threads
drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant"
  on public.messages
  for select
  to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

-- Buyer: first message to shop owner
drop policy if exists "messages_insert_buyer_to_seller" on public.messages;
create policy "messages_insert_buyer_to_seller"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and receiver_id = (select s.seller_id from public.shops s where s.id = shop_id)
  );

-- Seller: reply only to buyers who already messaged this shop
drop policy if exists "messages_insert_seller_reply" on public.messages;
create policy "messages_insert_seller_reply"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and auth.uid() = (select s.seller_id from public.shops s where s.id = shop_id)
    and exists (
      select 1
      from public.messages m
      where m.shop_id = shop_id
        and m.sender_id = receiver_id
        and m.receiver_id = sender_id
    )
  );

-- Mark own received messages as read
drop policy if exists "messages_update_receiver_read" on public.messages;
create policy "messages_update_receiver_read"
  on public.messages
  for update
  to authenticated
  using (receiver_id = auth.uid())
  with check (receiver_id = auth.uid());

-- Realtime (Supabase): add table to publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      execute 'alter publication supabase_realtime add table public.messages';
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;
