-- Zaken zijn per gebruiker gescheiden. Tot nu toe zag elke ingelogde gebruiker
-- alle zaken ("Ingelogde gebruikers zien alle ..."); vanaf nu ziet en wijzigt
-- een gebruiker alleen zaken waarvan hij/zij de aanmaker is (zaken.created_by),
-- inclusief alles wat daaraan hangt (ondernemingen, documenten, rapportages,
-- generaties, notities, gesprekken, inventarisatie en de bestanden in de
-- storage-bucket "documenten"). Beheerders (profielen.is_beheerder) zien alles.
--
-- Eén hulpfunctie bepaalt dit voor alle onderliggende tabellen. security
-- definer zodat de check zelf niet door de RLS van zaken geblokkeerd wordt.
create or replace function public.mag_zaak_zien(p_zaak_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.zaken z
    where z.id = p_zaak_id
      and (z.created_by = auth.uid() or public.is_beheerder())
  );
$$;

grant execute on function public.mag_zaak_zien(uuid) to authenticated;

-- ---------------------------------------------------------------- zaken
drop policy if exists "Ingelogde gebruikers zien alle zaken" on zaken;
drop policy if exists "Ingelogde gebruikers maken zaken aan" on zaken;
drop policy if exists "Ingelogde gebruikers wijzigen zaken" on zaken;
drop policy if exists "Ingelogde gebruikers verwijderen zaken" on zaken;

create policy "Eigen zaken zien" on zaken
  for select to authenticated using (created_by = auth.uid() or public.is_beheerder());
create policy "Eigen zaken aanmaken" on zaken
  for insert to authenticated with check (created_by = auth.uid());
create policy "Eigen zaken wijzigen" on zaken
  for update to authenticated
  using (created_by = auth.uid() or public.is_beheerder())
  with check (created_by = auth.uid() or public.is_beheerder());
create policy "Eigen zaken verwijderen" on zaken
  for delete to authenticated using (created_by = auth.uid() or public.is_beheerder());

-- ------------------------------------------- tabellen met een zaak_id
-- Per tabel dezelfde vier policies; alleen de namen van de oude policies
-- verschillen. delete-policies bestonden niet overal; waar de app verwijdert
-- (en voor de volledigheid) komt er nu één.
do $$
declare
  t text;
  oude text;
begin
  foreach t in array array[
    'ondernemingen', 'documenten', 'rapportages', 'rapportage_generaties',
    'zaak_notities', 'zaak_gesprekken', 'zaak_inventarisatie_items'
  ] loop
    for oude in
      select policyname from pg_policies where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy %I on public.%I', oude, t);
    end loop;

    execute format('create policy %I on public.%I for select to authenticated using (public.mag_zaak_zien(zaak_id))', 'Eigen zaak: zien', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.mag_zaak_zien(zaak_id))', 'Eigen zaak: aanmaken', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.mag_zaak_zien(zaak_id)) with check (public.mag_zaak_zien(zaak_id))', 'Eigen zaak: wijzigen', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.mag_zaak_zien(zaak_id))', 'Eigen zaak: verwijderen', t);
  end loop;
end $$;

-- ------------------------------------------------------------- storage
-- Alle bestanden staan onder `<zaak_id>/...` (zie client-upload.ts).
-- De regex voorkomt een cast-fout bij een pad dat niet met een uuid begint.
drop policy if exists "Ingelogde gebruikers lezen documenten-bucket" on storage.objects;
drop policy if exists "Ingelogde gebruikers uploaden naar documenten-bucket" on storage.objects;
drop policy if exists "Ingelogde gebruikers verwijderen uit documenten-bucket" on storage.objects;

create policy "Eigen zaak: bestanden lezen" on storage.objects
  for select to authenticated using (
    bucket_id = 'documenten'
    and public.mag_zaak_zien(
      case when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (storage.foldername(name))[1]::uuid end)
  );
create policy "Eigen zaak: bestanden uploaden" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'documenten'
    and public.mag_zaak_zien(
      case when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (storage.foldername(name))[1]::uuid end)
  );
create policy "Eigen zaak: bestanden verwijderen" on storage.objects
  for delete to authenticated using (
    bucket_id = 'documenten'
    and public.mag_zaak_zien(
      case when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (storage.foldername(name))[1]::uuid end)
  );
