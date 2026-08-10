alter table zaken add column laatst_bewerkt timestamptz not null default now();

-- Houdt zaken.laatst_bewerkt automatisch bij zodra er iets verandert aan een
-- gekoppelde onderneming, document of rapportage — zodat het dashboard op
-- "recent bewerkt" kan sorteren zonder dat elke actie in de app dit apart
-- hoeft bij te werken.
create or replace function raak_zaak_aan() returns trigger as $$
begin
  update zaken set laatst_bewerkt = now() where id = coalesce(new.zaak_id, old.zaak_id);
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger ondernemingen_raakt_zaak_aan
  after insert or update on ondernemingen
  for each row execute function raak_zaak_aan();

create trigger documenten_raakt_zaak_aan
  after insert or update on documenten
  for each row execute function raak_zaak_aan();

create trigger rapportages_raakt_zaak_aan
  after insert or update on rapportages
  for each row execute function raak_zaak_aan();
