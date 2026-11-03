-- Zaakmanagement-proces (7 stappen, zie zaak-proces.tsx).
--
-- 1. Een rapport kan nu een "concept voor het bezoek" zijn (stap 4) of het
--    rapport na het bezoek (stap 7). Bestaande rapporten blijven false (=
--    gewone rapporten). Concepten voor het bezoek worden bij latere
--    generaties NIET als "eerdere rapportage" meegegeven, anders slaat het
--    model hoofdstukken over (vervolgrapportage-logica in sjabloon.ts).
alter table rapportages add column voor_bezoek boolean not null default false;
alter table rapportage_generaties add column voor_bezoek boolean not null default false;

-- 2. Handmatige afvinkmomenten voor stap 5 en 6. Bestaan er geen gegevens
--    die de stap vanzelf "klaar" maken, dan kan de bedrijfskundige hem zo
--    zelf afronden.
alter table zaken add column inventarisatie_klaar_op timestamptz;
alter table zaken add column bezoek_afgerond_op timestamptz;

-- 3. Stap 5: lijst met gegevens die nog bij betrokkene opgevraagd moeten
--    worden voor het fysieke bezoek. bron 'ai' = voorzet van Claude (wordt
--    bij opnieuw inventariseren vervangen), 'handmatig' = eigen toevoeging.
create table zaak_inventarisatie_items (
  id uuid primary key default gen_random_uuid(),
  zaak_id uuid references zaken(id) on delete cascade not null,
  tekst text not null,
  vraag text,
  bron text not null default 'handmatig' check (bron in ('ai', 'handmatig')),
  afgevinkt boolean not null default false,
  volgorde integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) not null
);

create index zaak_inventarisatie_items_zaak_id_idx on zaak_inventarisatie_items (zaak_id);

alter table zaak_inventarisatie_items enable row level security;

create policy "Ingelogde gebruikers zien inventarisatie" on zaak_inventarisatie_items
  for select to authenticated using (true);
create policy "Ingelogde gebruikers maken inventarisatie aan" on zaak_inventarisatie_items
  for insert to authenticated with check (true);
create policy "Ingelogde gebruikers wijzigen inventarisatie" on zaak_inventarisatie_items
  for update to authenticated using (true);
create policy "Ingelogde gebruikers verwijderen inventarisatie" on zaak_inventarisatie_items
  for delete to authenticated using (true);
