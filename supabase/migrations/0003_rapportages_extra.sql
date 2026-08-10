alter table rapportages add column extra_context text;

create policy "Ingelogde gebruikers wijzigen rapportages" on rapportages
  for update to authenticated using (true);
