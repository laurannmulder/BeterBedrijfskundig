-- Kostenregistratie per rapportgeneratie. verbruik = lijst met per stap het
-- model, de tokens (invoer/cache/uitvoer), webzoekopdrachten en de geschatte
-- kosten in USD (zie src/lib/rapportage/kosten.ts voor de gebruikte
-- lijstprijzen). kosten_usd = som over de stappen; wordt bij het klaarkomen
-- ook op de rapportage zelf gezet zodat het in lijsten getoond kan worden.
alter table rapportage_generaties add column verbruik jsonb not null default '[]'::jsonb;
alter table rapportage_generaties add column kosten_usd numeric(10, 4) not null default 0;
alter table rapportages add column kosten_usd numeric(10, 4);
