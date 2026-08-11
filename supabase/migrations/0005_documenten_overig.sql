-- Nieuw documenttype voor bestanden die de bedrijfskundige los aanlevert bij
-- "extra informatie" tijdens het genereren van een rapportage (niet onderdeel
-- van de automatisch berekende documentchecklist). Deze rijen krijgen
-- onderneming_id = null, jaar = null, verplicht = false.
alter type document_type add value 'overig';
