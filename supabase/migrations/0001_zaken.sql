-- Zaken, ondernemingen en de bijbehorende documentchecklist.
-- Documentvereisten (welk type, welke jaren, verplicht of optioneel) worden
-- berekend in de applicatie (src/lib/documenten/vereisten.ts) op basis van
-- rechtsvorm, oprichtingsdatum en ongevalsdatum, en hier als rijen opgeslagen.

create type rechtsvorm as enum ('eenmanszaak', 'vof', 'bv', 'overig');

create type document_type as enum (
  'aangifte_ib',
  'jaarcijfers',
  'aangifte_ob',
  'leasecontract',
  'huurcontract',
  'bankafschriften',
  'arbeidsovereenkomst',
  'vof_contract',
  'vennootschapscontract'
);

create type document_status as enum ('ontbreekt', 'geupload', 'gecontroleerd');

create table zaken (
  id uuid primary key default gen_random_uuid(),
  dossiernummer text,
  naam_betrokkene text not null,
  ongevalsdatum date not null,
  created_by uuid references auth.users(id) not null,
  created_at timestamptz not null default now()
);

create table ondernemingen (
  id uuid primary key default gen_random_uuid(),
  zaak_id uuid references zaken(id) on delete cascade not null,
  naam text not null,
  rechtsvorm rechtsvorm not null,
  oprichtingsdatum date not null,
  kvk_nummer text,
  -- Voor holdingstructuren (BV die aandeelhouder is van een andere BV) — nog niet
  -- gebruikt in de UI, alvast aanwezig zodat de casus uit "bv.docx" (Honk Honk B.V.
  -- als aandeelhouder van HEWA-techniek B.V.) later gemodelleerd kan worden.
  moederonderneming_id uuid references ondernemingen(id),
  created_at timestamptz not null default now()
);

create table documenten (
  id uuid primary key default gen_random_uuid(),
  zaak_id uuid references zaken(id) on delete cascade not null,
  -- null = document op zaakniveau (bv. aangifte IB hoort bij de betrokkene, niet bij één onderneming)
  onderneming_id uuid references ondernemingen(id) on delete cascade,
  type document_type not null,
  -- null voor documenten die niet jaargebonden zijn (VOF-contract, vennootschapscontract)
  jaar int,
  verplicht boolean not null default true,
  status document_status not null default 'ontbreekt',
  storage_path text,
  uploaded_at timestamptz,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index documenten_zaak_id_idx on documenten (zaak_id);
create index ondernemingen_zaak_id_idx on ondernemingen (zaak_id);

-- Klein, vertrouwd team: elke ingelogde gebruiker mag alle zaken zien en bewerken.
-- Te verfijnen zodra er reden is om toegang per gebruiker te beperken.
alter table zaken enable row level security;
alter table ondernemingen enable row level security;
alter table documenten enable row level security;

create policy "Ingelogde gebruikers zien alle zaken" on zaken
  for select to authenticated using (true);
create policy "Ingelogde gebruikers maken zaken aan" on zaken
  for insert to authenticated with check (true);
create policy "Ingelogde gebruikers wijzigen zaken" on zaken
  for update to authenticated using (true);

create policy "Ingelogde gebruikers zien alle ondernemingen" on ondernemingen
  for select to authenticated using (true);
create policy "Ingelogde gebruikers maken ondernemingen aan" on ondernemingen
  for insert to authenticated with check (true);

create policy "Ingelogde gebruikers zien alle documenten" on documenten
  for select to authenticated using (true);
create policy "Ingelogde gebruikers maken documenten aan" on documenten
  for insert to authenticated with check (true);
create policy "Ingelogde gebruikers wijzigen documenten" on documenten
  for update to authenticated using (true);

-- Opslag voor de geüploade documenten zelf.
insert into storage.buckets (id, name, public)
values ('documenten', 'documenten', false)
on conflict (id) do nothing;

create policy "Ingelogde gebruikers lezen documenten-bucket" on storage.objects
  for select to authenticated using (bucket_id = 'documenten');
create policy "Ingelogde gebruikers uploaden naar documenten-bucket" on storage.objects
  for insert to authenticated with check (bucket_id = 'documenten');
