-- Rapportgeneratie in stappen: één grote Claude-aanroep voor een omvangrijke
-- zaak (veel/grote PDF's) kan makkelijk 10+ minuten duren — ruim boven de
-- harde Vercel-functietijdslimiet. Door de generatie op te knippen in
-- kleinere stappen, elk als losse serverless-aanroep vanuit de browser
-- (client-side polling drijft de voortgang aan), hoeft geen enkele aanroep
-- ooit langer te duren dan één stap kost. De documentinhoud wordt elke stap
-- opnieuw meegestuurd (nodig voor Anthropic's prompt-cache-mechanisme) maar
-- dankzij prompt caching (zie genereer.ts) is dat na de eerste stap een
-- snelle cache-read in plaats van een volledige herverwerking.
create type generatie_status as enum ('bezig', 'klaar', 'mislukt');

create table rapportage_generaties (
  id uuid primary key default gen_random_uuid(),
  zaak_id uuid references zaken(id) on delete cascade not null,
  status generatie_status not null default 'bezig',
  stap integer not null default 0,
  rapportage_tekst text not null default '',
  suggesties text,
  foutmelding text,
  rapportage_id uuid references rapportages(id),
  extra_context text,
  gestart_door uuid references auth.users(id) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index rapportage_generaties_zaak_id_idx on rapportage_generaties (zaak_id);

alter table rapportage_generaties enable row level security;

create policy "Ingelogde gebruikers zien alle generaties" on rapportage_generaties
  for select to authenticated using (true);
create policy "Ingelogde gebruikers starten generaties" on rapportage_generaties
  for insert to authenticated with check (true);
create policy "Ingelogde gebruikers werken generaties bij" on rapportage_generaties
  for update to authenticated using (true);
