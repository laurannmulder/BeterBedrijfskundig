// Structuursjabloon voor de bedrijfskundige rapportage. Gebaseerd op het
// doornemen van twee echte voorbeeldrapportages (eenmanszaak + BV) — dit
// bevat alleen de generieke opbouw/structuur, geen cliëntgegevens.
//
// Voor betere stijlgetrouwheid: als er echte voorbeeldrapportages worden
// aangeleverd, kunnen die als extra few-shot voorbeeld aan de prompt in
// genereer.ts worden toegevoegd naast dit sjabloon.
export const RAPPORTAGE_SJABLOON = `
STRUCTUUR (volg deze paragraafnummering exact):

1. ALGEMEEN
  1.1 Aanleiding — wie is betrokkene, wanneer en waardoor is het ongeval ontstaan, wie verzoekt de rapportage.
  1.2 Vraagstelling — de onderzoeksvragen, standaard:
    - Hoe stond het bedrijf van betrokkene er in bedrijfskundige/bedrijfseconomische zin voor op datum ongeval?
    - Hoe staat het bedrijf er nu voor?
    - Hoe zou het bedrijf zijn vergaan als het ongeval niet had plaatsgevonden (would-be)?
    - Welke invloed heeft de uitval van betrokkene gehad op het resultaat van het bedrijf?
    - Wat is het verlies aan verdienvermogen (VAV), rekening houdend met doorlopende kosten?
  1.3 Onderzoeksactiviteiten — dossierstudie, raadplegen KvK, beoordeling aangeleverde documenten.

2. BEDRIJFSKUNDIGE GEGEVENS
  Per onderneming: oprichtingsdatum, KvK-nummer, handelsnaam/namen, rechtsvorm, activiteiten (SBI-code), aantal werkzame personen. Bij meerdere ondernemingen: aandeelhoudersverhoudingen indien bekend.

3. FINANCIËLE ANALYSE ONDERNEMING VOORAFGAAND AAN HET ONGEVAL
  Bespreek de winst- en verliesrekening(en) van de jaren vóór het ongeval: ontwikkeling omzet, kostprijs omzet, belangrijkste kostenposten, nettoresultaat en de trend daarin.

4. FINANCIËLE ANALYSE ONDERNEMING NA HET ONGEVAL
  Zelfde analyse voor de jaren na het ongeval. Besteed expliciet aandacht aan kosten die doorlopen ondanks omzetdaling (afschrijvingen, vaste lasten, verzekeringen e.d.).

5. WOULD-BE SITUATIE
  Onderbouwde reconstructie van de omzet/het resultaat zoals dat zonder ongeval te verwachten was, gebaseerd op de historische trend vóór het ongeval. Benoem expliciet welke aannames zijn gemaakt en waarom — dit is een oordeelsvormend onderdeel, geen zuivere rekensom.

6. BEANTWOORDING VRAGEN
  Beantwoord puntsgewijs de vragen uit 1.2. Neem hierbij op:
  - Tabel "Netto-inkomen betrokkene" voor zowel de would-be als de feitelijke situatie, per jaar: Nettoresultaat onderneming, min Inkomstenbelasting en premies, min Bijdrage Zorgverzekeringswet, = Netto jaarinkomen.
  - Tabel "Verlies aan verdienvermogen": Netto-inkomen zonder ongeval min Netto-inkomen met ongeval, per jaar en totaal.

7. VOORTGANG
  Wat is nog nodig: ontbrekende (verplichte) documenten, openstaande vragen, vervolgstappen.
`.trim()
