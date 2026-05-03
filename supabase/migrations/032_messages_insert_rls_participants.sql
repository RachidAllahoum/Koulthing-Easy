-- Seller replies were blocked by the old "seller_reply" policy EXISTS check.
-- Single INSERT policy: user sends only as themselves (sender_id = auth.uid()) and
-- participates in the shop thread as either buyer (recipient is shop owner) or seller (owns shop).

drop policy if exists "messages_insert_buyer_to_seller" on public.messages;
drop policy if exists "messages_insert_seller_reply" on public.messages;

drop policy if exists "messages_insert_as_participant" on public.messages;
create policy "messages_insert_as_participant"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and (
      receiver_id = (select s.seller_id from public.shops s where s.id = shop_id limit 1)
      or exists (
        select 1
        from public.shops s
        where s.id = shop_id
          and s.seller_id = auth.uid()
      )
    )
  );
