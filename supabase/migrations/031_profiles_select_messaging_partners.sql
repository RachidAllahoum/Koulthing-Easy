-- Allow authenticated users to read basic partner profile rows for messaging UI
-- (existing policy keeps self-select; policies are OR-combined)

drop policy if exists "profiles_select_messaging_partners" on public.profiles;
create policy "profiles_select_messaging_partners"
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.messages m
      where
        (m.sender_id = auth.uid() and m.receiver_id = profiles.id)
        or (m.receiver_id = auth.uid() and m.sender_id = profiles.id)
    )
  );
