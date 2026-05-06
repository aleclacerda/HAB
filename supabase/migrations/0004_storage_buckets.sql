-- =====================================================================
-- 0004_storage_buckets.sql
-- Cria bucket público para imagens de empreendimentos (capa + planta)
-- e bucket público para logos de construtoras.
--
-- Política: leitura pública (qualquer um pode ver),
--          escrita/deleção apenas para admins (is_admin()).
-- =====================================================================

-- Buckets ---------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('builder-logos', 'builder-logos', true)
on conflict (id) do nothing;

-- Políticas -------------------------------------------------------------
-- Leitura pública
drop policy if exists "public read property images" on storage.objects;
create policy "public read property images"
  on storage.objects for select
  using ( bucket_id in ('property-images', 'builder-logos') );

-- Insert/update/delete só admin
drop policy if exists "admin write property images" on storage.objects;
create policy "admin write property images"
  on storage.objects for insert
  with check (
    bucket_id in ('property-images', 'builder-logos')
    and public.is_admin()
  );

drop policy if exists "admin update property images" on storage.objects;
create policy "admin update property images"
  on storage.objects for update
  using (
    bucket_id in ('property-images', 'builder-logos')
    and public.is_admin()
  );

drop policy if exists "admin delete property images" on storage.objects;
create policy "admin delete property images"
  on storage.objects for delete
  using (
    bucket_id in ('property-images', 'builder-logos')
    and public.is_admin()
  );
