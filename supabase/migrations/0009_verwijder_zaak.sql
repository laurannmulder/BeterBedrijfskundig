-- Zaken (en daarmee, via on-delete-cascade, hun ondernemingen/documenten/
-- rapportages) kunnen nu verwijderd worden vanaf de zaakpagina. Postgres
-- controleert RLS ook op tabellen die via een foreign-key-cascade meeverwijderd
-- worden, dus zonder onderstaande delete-policies zou het verwijderen van een
-- zaak stilzwijgend blijven hangen op de eerste onderneming/rapportage-rij die
-- geraakt wordt. `documenten` heeft al een delete-policy sinds
-- 0007_document_classificatie.sql.
create policy "Ingelogde gebruikers verwijderen zaken" on zaken
  for delete to authenticated using (true);
create policy "Ingelogde gebruikers verwijderen ondernemingen" on ondernemingen
  for delete to authenticated using (true);
create policy "Ingelogde gebruikers verwijderen rapportages" on rapportages
  for delete to authenticated using (true);
