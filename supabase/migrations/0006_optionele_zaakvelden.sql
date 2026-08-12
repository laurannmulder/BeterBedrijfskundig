-- Bij het aanmaken van een zaak zijn alleen naam betrokkene en dossiernummer nog
-- verplicht. Ongevalsdatum en de ondernemingsgegevens (rechtsvorm, oprichtingsdatum)
-- mogen worden weggelaten en later uit de aangeleverde documenten blijken — de
-- documentchecklist wordt dan alleen berekend voor de velden die wél bekend zijn.
alter table zaken alter column ongevalsdatum drop not null;
alter table ondernemingen alter column rechtsvorm drop not null;
alter table ondernemingen alter column oprichtingsdatum drop not null;

-- Dossiernummer was al nullable in de database; wordt nu wel verplicht op
-- app-niveau (zie createZaak-actie), bewust geen DB-constraint om het risico van
-- een mislukte migratie op onbekende bestaande rijen te vermijden.
