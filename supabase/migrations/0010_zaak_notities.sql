-- Persistente "aanvullende informatie"-blokken per zaak. Anders dan
-- rapportages.extra_context (dat alleen voor één specifieke rapportageversie
-- geldt), worden deze notities bij élke toekomstige generatie van een
-- rapportage voor deze zaak meegegeven, totdat ze bewust gewijzigd of
-- verwijderd worden.
create table zaak_notities (
  id uuid primary key default gen_random_uuid(),
  zaak_id uuid references zaken(id) on delete cascade not null,
  tekst text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) not null
);

create index zaak_notities_zaak_id_idx on zaak_notities (zaak_id);

alter table zaak_notities enable row level security;

create policy "Ingelogde gebruikers zien alle notities" on zaak_notities
  for select to authenticated using (true);
create policy "Ingelogde gebruikers maken notities aan" on zaak_notities
  for insert to authenticated with check (true);
create policy "Ingelogde gebruikers wijzigen notities" on zaak_notities
  for update to authenticated using (true);
create policy "Ingelogde gebruikers verwijderen notities" on zaak_notities
  for delete to authenticated using (true);
