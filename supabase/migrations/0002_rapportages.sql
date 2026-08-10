create type rapportage_status as enum ('concept', 'definitief');

create table rapportages (
  id uuid primary key default gen_random_uuid(),
  zaak_id uuid references zaken(id) on delete cascade not null,
  status rapportage_status not null default 'concept',
  inhoud text not null,
  gegenereerd_door uuid references auth.users(id) not null,
  created_at timestamptz not null default now()
);

create index rapportages_zaak_id_idx on rapportages (zaak_id);

alter table rapportages enable row level security;

create policy "Ingelogde gebruikers zien alle rapportages" on rapportages
  for select to authenticated using (true);
create policy "Ingelogde gebruikers maken rapportages aan" on rapportages
  for insert to authenticated with check (true);
