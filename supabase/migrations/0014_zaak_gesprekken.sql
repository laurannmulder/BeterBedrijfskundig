-- Opgenomen en getranscribeerde gesprekken tijdens een bedrijfsbezoek — de
-- audio staat in de bestaande "documenten"-storage-bucket (al privé, al de
-- juiste policies) onder een eigen pad `${zaak_id}/gesprekken/...`, dus geen
-- nieuwe bucket nodig. Het transcript wordt bij het genereren van een
-- rapportage apart meegegeven (niet vermengd met zaak_notities) zodat het als
-- primaire bron voor "het gesprek met betrokkene" behandeld kan worden.
create type gesprek_status as enum ('transcriberen', 'klaar', 'mislukt');

create table zaak_gesprekken (
  id uuid primary key default gen_random_uuid(),
  zaak_id uuid references zaken(id) on delete cascade not null,
  storage_path text not null,
  status gesprek_status not null default 'transcriberen',
  transcript text,
  foutmelding text,
  duur_seconden integer,
  opgenomen_op timestamptz not null default now(),
  opgenomen_door uuid references auth.users(id) not null
);

create index zaak_gesprekken_zaak_id_idx on zaak_gesprekken (zaak_id);

alter table zaak_gesprekken enable row level security;

create policy "Ingelogde gebruikers zien alle gesprekken" on zaak_gesprekken
  for select to authenticated using (true);
create policy "Ingelogde gebruikers leggen gesprekken vast" on zaak_gesprekken
  for insert to authenticated with check (true);
create policy "Ingelogde gebruikers werken gesprekken bij" on zaak_gesprekken
  for update to authenticated using (true);
