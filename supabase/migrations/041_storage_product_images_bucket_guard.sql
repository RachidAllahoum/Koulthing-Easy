-- Ensure product-images bucket exists in environments where older storage migration was skipped.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

