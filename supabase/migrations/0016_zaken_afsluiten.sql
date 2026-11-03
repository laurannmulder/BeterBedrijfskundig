-- Zaken kunnen worden afgesloten en bewaard in het archief ("Afgesloten
-- zaken"). null = lopende zaak; een tijdstip = afgesloten op dat moment.
-- Heropenen zet het weer op null. Bestaande zaken blijven daarmee gewoon
-- lopend. Geen nieuwe RLS-policies nodig: zaken heeft al een update-policy.
alter table zaken add column afgesloten_op timestamptz;

create index zaken_afgesloten_op_idx on zaken (afgesloten_op);
