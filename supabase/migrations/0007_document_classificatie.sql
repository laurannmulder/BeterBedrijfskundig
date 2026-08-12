-- Nieuwe documenttypen voor de AI-classificatiepijplijn: een KvK-uittreksel en
-- een opdrachtbrief zijn zelf ook herkenbare categorieën (en leveren metadata
-- op — KvK-nummer/oprichtingsdatum resp. ongevalsdatum — die automatisch op de
-- zaak/onderneming wordt ingevuld als die nog leeg is).
alter type document_type add value 'kvk_uittreksel';
alter type document_type add value 'opdrachtbrief';

-- Ontbrekende policies die de nieuwe classificatiepijplijn nodig heeft: het
-- aanvullen van ondernemingsgegevens uit geëxtraheerde metadata (update), en
-- het verwijderen van een verkeerd geclassificeerd document (delete, zowel
-- de rij als het onderliggende bestand in Storage).
create policy "Ingelogde gebruikers wijzigen ondernemingen" on ondernemingen
  for update to authenticated using (true);

create policy "Ingelogde gebruikers verwijderen documenten" on documenten
  for delete to authenticated using (true);

create policy "Ingelogde gebruikers verwijderen uit documenten-bucket" on storage.objects
  for delete to authenticated using (bucket_id = 'documenten');
