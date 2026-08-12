-- Verzekeraar- en belangenbehartigergegevens komen voor in het gegevensblok
-- vooraan elke rapportage (zie src/lib/rapportage/sjabloon.ts). Tot nu toe
-- moest de bedrijfskundige die er telkens handmatig bij vermelden; nu worden
-- ze, net als ongevalsdatum, automatisch herkend uit geüploade documenten
-- (met name de opdrachtbrief) en alleen aangevuld als het veld nog leeg is.
alter table zaken add column verzekeraar_naam text;
alter table zaken add column verzekeraar_contactpersoon text;
alter table zaken add column verzekeraar_email text;
alter table zaken add column verzekeraar_kenmerk text;
alter table zaken add column belangenbehartiger_bureau text;
alter table zaken add column belangenbehartiger_naam text;
alter table zaken add column belangenbehartiger_email text;
alter table zaken add column belangenbehartiger_kenmerk text;
