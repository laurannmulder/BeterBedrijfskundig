// Structuursjabloon voor de bedrijfskundige rapportage. Gebaseerd op het
// doornemen van een echte voorbeeldrapportage (BV met holdingstructuur) — dit
// bevat alleen de generieke opbouw/structuur/lay-out, geen cliëntgegevens. De
// brondocumenten zijn na het afleiden van deze structuur niet bewaard.
export const RAPPORTAGE_SJABLOON = `
Volg deze exacte lay-out (structuur, koppen, paragraafnummering en volgorde) — dit is de huisstijl van het kantoor:

OMSLAG / GEGEVENSBLOK (vóór hoofdstuk 1, geen paragraafnummer)
Begin met de titelregel "BEDRIJFSKUNDIGE RAPPORTAGE", gevolgd door vier gegevensblokken, elk als aparte markdown-tabel met twee kolommen (label / waarde):
- "Persoonlijke gegevens betrokkene": Naam, Adres, Postcode, Woonplaats, E-mail, Telefoon, Geboortedatum, Datum schade/ongeval.
- "Gegevens verzekeraar": Verzekeraar, Naam (contactpersoon), E-mail, Kenmerk.
- "Gegevens belangenbehartiger": Letselschadebureau, Naam, E-mail, Kenmerk.
- "Gegevens bedrijfskundige": Bezoekdatum, Rapportagedatum, Rapporteur, E-mail, Telefoon, Dossiernummer.
Vul alleen in wat daadwerkelijk bekend is uit de aangeleverde gegevens/documenten; onbekende velden krijgen "onbekend" — verzin nooit een naam, e-mailadres of kenmerk.

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
  Open met: "Vanuit de registers van de Kamer van Koophandel (KvK) is de volgende informatie ontleend. (Gegevens zijn vervaardigd op [datum, of 'onbekend'])."
  Behandel daarna per onderneming afzonderlijk (ondernemingsnaam als subkopje): inschrijvingsdatum KvK, KvK-nummer, handelsnaam/namen, rechtsvorm, activiteiten als opsomming met SBI-code(s) indien bekend, aantal werkzame personen. Bij een holdingstructuur (een onderneming die aandeelhouder is van een andere): benoem expliciet het aandeelhouderspercentage en de relatie tussen de ondernemingen.

3. FINANCIËLE ANALYSE ONDERNEMING VOORAFGAAND AAN HET ONGEVAL
  Bespreek de winst- en verliesrekening(en) van de jaren vóór het ongeval: ontwikkeling omzet, kostprijs omzet, belangrijkste kostenposten, nettoresultaat en de trend daarin.

4. FINANCIËLE ANALYSE ONDERNEMING NA HET ONGEVAL
  Zelfde analyse voor de jaren na het ongeval. Besteed expliciet aandacht aan kosten die doorlopen ondanks omzetdaling (afschrijvingen, vaste lasten, verzekeringen e.d.).

5. BEANTWOORDING VRAGEN
  Beantwoord puntsgewijs de vragen uit 1.2 — inclusief de would-be-reconstructie (de omzet/het resultaat zoals dat zonder ongeval te verwachten was, gebaseerd op de historische trend vóór het ongeval; benoem expliciet welke aannames zijn gemaakt en waarom — dit is een oordeelsvormend onderdeel, geen zuivere rekensom). Er is geen apart hoofdstuk voor de would-be-situatie; die hoort hier thuis. Neem hierbij op:
  - Tabel "Netto-inkomen betrokkene" voor zowel de would-be als de feitelijke situatie, per jaar: Nettoresultaat onderneming, min Inkomstenbelasting en premies, min Bijdrage Zorgverzekeringswet, = Netto jaarinkomen.
  - Tabel "Verlies aan verdienvermogen": Netto-inkomen zonder ongeval min Netto-inkomen met ongeval, per jaar en totaal.

6. VOORTGANG
  Dit hoofdstuk gaat over het vervolgproces, NIET over ontbrekende documenten. Gebruik als basis: "Het conceptrapport wordt eerst naar betrokkene verzonden en ter goedkeuring voorgelegd. Belangenbehartiger en verzekeraar worden tijdens het traject gelijktijdig op de hoogte gehouden. Deze rapportage zal gelijktijdig worden verstuurd aan betrokkene, de verzekeraar en de belangenbehartiger." Voeg daarna, als korte losse alinea, wél kort op basis van vakkundig oordeel toe welke informatie nog ontbreekt of welke openstaande vragen er zijn — maar dit blijft een korte alinea, geen hoofdmoot van dit hoofdstuk.

ONDERTEKENING (na hoofdstuk 6, geen paragraafnummer)
Sluit af met de naam van de bedrijfskundige, gevolgd door "Bedrijfskundige" en de naam van het bureau — elk op een eigen regel. Vul dit alleen in als het bekend is uit de aangeleverde gegevens; anders "[AANNAME: naam/functie/bureau bedrijfskundige]".

BIJLAGEN (na de ondertekening, geen paragraafnummer)
Sluit af met een genummerde lijst "Bijlage 1", "Bijlage 2" etc. van de financiële stukken waarnaar in het rapport wordt verwezen (bv. "Bijlage 1 Winst- en verliesrekeningen [onderneming]", "Bijlage 2 Balans [onderneming] per [datum]") — uitsluitend gebaseerd op daadwerkelijk aangeleverde documenten, verzin geen bijlagen die niet zijn aangeleverd.
`.trim()
