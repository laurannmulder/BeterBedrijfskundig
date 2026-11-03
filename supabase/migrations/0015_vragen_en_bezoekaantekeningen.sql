-- Vragen van verzekeraar/belangenbehartiger: één tekstveld per zaak waarin de
-- bedrijfskundige de vragen uit hun e-mail plakt (inclusief aanvullende
-- vragen). Vormt bij het genereren direct de Vraagstelling (1.2).
alter table zaken add column vragen text;

-- Aantekeningen van de fysieke afspraak: hergebruikt zaak_notities (zelfde
-- bewerken/verwijderen), onderscheiden via een soort-kolom. 'aanvullend' is de
-- bestaande "Aanvullende informatie"; 'bezoek' wordt als primaire bron voor
-- het gesprek met betrokkene behandeld (net als een transcript).
alter table zaak_notities
  add column soort text not null default 'aanvullend'
  check (soort in ('aanvullend', 'bezoek'));
