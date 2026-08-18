// Structuursjabloon voor de bedrijfskundige rapportage. Gebaseerd op het
// kantoor-eigen blanco formatdocument ("Format BEDRIJFSKUNDIGE RAPPORTAGE",
// een placeholder-sjabloon zonder cliëntgegevens — de gezaghebbende bron) én
// het doornemen van twee echte voorbeeldrapportages (één BV met
// holdingstructuur, één eenmanszaak met een apart gemist project). Dit
// bevat alleen de generieke opbouw/structuur/lay-out, geen cliëntgegevens.
// De brondocumenten zijn na het afleiden van deze structuur niet bewaard.
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
  1.2 Vraagstelling — controleer EERST of de opdrachtbrief (of andere correspondentie van verzekeraar/belangenbehartiger) een expliciete opsomming van onderwerpen/vragen bevat waaraan aandacht besteed moet worden (vaak ingeleid met een zin als "Wij verzoeken u daarbij in ieder geval aandacht te besteden aan de volgende onderwerpen:"). Is die er:
    - Neem DIE onderwerpen over als de onderzoeksvragen — verwoord ze zo nodig als volledige vraagzinnen, maar wijzig de inhoud/strekking niet en laat er geen weg (dit is de daadwerkelijke opdracht van de opdrachtgever, geen invuloefening).
    - Vul, als een van de standaardvragen hieronder inhoudelijk niet al gedekt wordt door de expliciet opgevraagde onderwerpen, die ontbrekende standaardvraag/vragen aan het eind aanvullend toe (bv. het verlies aan verdienvermogen wordt zelden letterlijk uitgevraagd, maar hoort wel standaard in dit type rapportage thuis).
    Is er geen expliciete opsomming in de opdrachtbrief/correspondentie te vinden, gebruik dan de standaard onderzoeksvragen:
    - Hoe stond het bedrijf van betrokkene er in bedrijfskundige/bedrijfseconomische zin voor op datum ongeval?
    - Hoe staat het bedrijf er nu voor?
    - Hoe zou het bedrijf zijn vergaan als het ongeval niet had plaatsgevonden (would-be)?
    - Welke invloed heeft de uitval van betrokkene gehad op het resultaat van het bedrijf?
    - Wat is het verlies aan verdienvermogen (VAV), rekening houdend met doorlopende kosten?
  1.3 Onderzoeksactiviteiten — standaard als opsomming: Voorbereiding/dossierstudie; Bezoek aan en gesprek met betrokkene (tenzij uit de stukken blijkt dat dit niet heeft plaatsgevonden — dan weglaten of expliciet benoemen dat dit nog moet gebeuren); Raadplegen Kamer van Koophandel; Internet, diverse websites. Voeg een voetnoot toe bij deze paragraafkop met de tekst: "Bij het onderzoek en de bijbehorende berekeningen is afgerond op hele getallen. Daarom kan het voorkomen dat totaaltellingen door deze afrondingen licht afwijken. Er is getracht dit zoveel mogelijk te voorkomen."

2. BEDRIJFSKUNDIGE GEGEVENS
  Open met: "Vanuit de registers van de Kamer van Koophandel (KvK) is de volgende informatie ontleend. (Gegevens zijn vervaardigd op [datum, of 'onbekend'])."
  Behandel daarna per onderneming afzonderlijk (ondernemingsnaam als subkopje): inschrijvingsdatum KvK, KvK-nummer, handelsnaam/namen, rechtsvorm, activiteiten als opsomming met SBI-code(s) indien bekend, aantal werkzame personen. Bij een holdingstructuur (een onderneming die aandeelhouder is van een andere): benoem expliciet het aandeelhouderspercentage en de relatie tussen de ondernemingen.

3. FINANCIËLE ANALYSE ONDERNEMING VOORAFGAAND AAN HET ONGEVAL
  Subkop "Winst- en verliesrekening": bespreek de winst- en verliesrekening(en) van de jaren vóór het ongeval — ontwikkeling omzet, kostprijs omzet, belangrijkste kostenposten, nettoresultaat en de trend daarin.
  Subkop "Balans" (alleen als er balansgegevens zijn aangeleverd — anders expliciet benoemen dat deze ontbreken en dat de balansanalyse daarom niet uitgevoerd kan worden, in plaats van de subkop over te slaan): leg kort uit dat de activazijde de bezittingen bevat en de passivazijde het eigen vermogen en de schulden. Beoordeel de balans aan de hand van twee kengetallen, elk met een eigen kopje:
  - "Solvabiliteit": eigen vermogen / totaal vermogen. Norm: hoger dan 25% wordt als gezond beschouwd. Benoem expliciet of de solvabiliteit boven of onder de norm ligt en wat dat betekent (te lage solvabiliteit = weinig buffer voor financiële tegenslagen, risico voor financiële stabiliteit/kredietwaardigheid/continuïteit).
  - "Current ratio": (voorraden + vorderingen + liquide middelen) / kort vreemd vermogen. Norm: hoger dan 1 betekent een goede liquiditeit (op korte termijn aan verplichtingen kunnen voldoen). Benoem expliciet of de current ratio boven of onder de norm ligt.
  Voeg bij deze twee kengetallen een voetnoot toe met de standaarddefinitie: bij solvabiliteit "De solvabiliteit geeft de verhouding aan van het eigen vermogen ten opzichte van het vreemde vermogen (de leningen binnen de onderneming). De verhouding geeft aan of de onderneming de schulden op lange termijn kan voldoen."; bij current ratio "De current ratio is een kengetal dat de liquiditeit van de onderneming weergeeft. Het geeft aan in hoeverre de onderneming in staat is om op korte termijn verplichtingen te voldoen."
  Sluit af met een kort "Resumé" dat solvabiliteit en current ratio samen duidt.
  Subkop "Aangiften inkomstenbelasting": bespreek kort de aangiften IB van betrokkene over dezelfde jaren, ter aanvulling op de ondernemingscijfers.

4. FINANCIËLE ANALYSE ONDERNEMING NA HET ONGEVAL
  Zelfde opbouw en subkoppen als hoofdstuk 3 (Winst- en verliesrekening, Balans met solvabiliteit/current ratio/Resumé, Aangiften inkomstenbelasting), nu voor de jaren na het ongeval. Besteed expliciet aandacht aan kosten die doorlopen ondanks omzetdaling (afschrijvingen, vaste lasten, verzekeringen e.d.).

5. WOULD-BE-HOOFDSTUK — bepaal eerst of dit een eigen hoofdstuk wordt of onderdeel van hoofdstuk "Beantwoording vragen"
  De would-be-reconstructie (de omzet/het resultaat zoals dat zonder ongeval te verwachten was, gebaseerd op de historische trend vóór het ongeval, of op een specifiek aantoonbaar project/traject dat door het ongeval is misgelopen; benoem expliciet welke aannames zijn gemaakt en waarom — dit is een oordeelsvormend onderdeel, geen zuivere rekensom) krijgt:
  - EEN EIGEN HOOFDSTUK "5. WOULD-BE SITUATIE" (waarna "Beantwoording vragen" hoofdstuk 6 wordt en "Voortgang" hoofdstuk 7) wanneer de would-be-onderbouwing omvangrijk of complex is — bijvoorbeeld gebaseerd op een specifiek, apart te onderbouwen gemist project/traject/opdracht (met eigen onderliggende stukken/bijlagen) in plaats van alleen een lineaire trendextrapolatie.
  - GEEN eigen hoofdstuk (dus vervalt als apart hoofdstuk; de would-be-reconstructie wordt behandeld ín hoofdstuk 5 "Beantwoording vragen", dat dan hoofdstuk 5 blijft en "Voortgang" hoofdstuk 6) wanneer de would-be simpelweg een trendextrapolatie op basis van de historische cijfers is, zonder aparte omvangrijke onderbouwing.
  Neem in beide gevallen op:
  - Tabel "Netto-inkomen betrokkene" voor zowel de would-be als de feitelijke situatie, per jaar: Nettoresultaat onderneming, min Inkomstenbelasting en premies, min Bijdrage Zorgverzekeringswet, = Netto jaarinkomen.
  - Tabel "Verlies aan verdienvermogen": Netto-inkomen zonder ongeval min Netto-inkomen met ongeval, per jaar en totaal.

BEANTWOORDING VRAGEN (hoofdstuk 5 of 6, zie hierboven)
  Beantwoord puntsgewijs de vragen uit 1.2. Als de would-be-reconstructie een eigen hoofdstuk heeft gekregen (zie hierboven): verwijs hier kort terug naar dat hoofdstuk in plaats van de reconstructie te herhalen.

VOORTGANG (laatste genummerde hoofdstuk, hoofdstuk 6 of 7, zie hierboven)
  Dit hoofdstuk gaat over het vervolgproces, NIET over ontbrekende documenten. Gebruik als basis: "Het conceptrapport wordt eerst naar betrokkene verzonden en ter goedkeuring voorgelegd. Belangenbehartiger en verzekeraar worden tijdens het traject gelijktijdig op de hoogte gehouden. Deze rapportage zal gelijktijdig worden verstuurd aan betrokkene, de verzekeraar en de belangenbehartiger." Voeg daarna, als korte losse alinea, wél kort op basis van vakkundig oordeel toe welke informatie nog ontbreekt of welke openstaande vragen er zijn — maar dit blijft een korte alinea, geen hoofdmoot van dit hoofdstuk.

ONDERTEKENING (na het laatste genummerde hoofdstuk, geen paragraafnummer)
Sluit af met de naam van de bedrijfskundige, gevolgd door "Bedrijfskundige" en de naam van het bureau — elk op een eigen regel. Vul dit alleen in als het bekend is uit de aangeleverde gegevens; anders "[AANNAME: naam/functie/bureau bedrijfskundige]".

BIJLAGEN (na de ondertekening, geen paragraafnummer)
Sluit af met een genummerde lijst "Bijlage 1", "Bijlage 2" etc. van de stukken waarnaar in het rapport wordt verwezen. Meestal gaat dit om de financiële kernstukken (bv. "Bijlage 1 Winst- en verliesrekening(en) [jaren]", "Bijlage 2 Winst- en verliesrekening(en) in percentages t.o.v. de omzet", "Bijlage 3 Balans [onderneming] per [datum]"). Als de would-be-reconstructie op een specifiek project/traject is gebaseerd (zie hoofdstuk 5 hierboven), voeg dan aparte bijlagen toe die dat onderbouwen (bv. "Bijlage x Informatie project [naam/jaar]", "Bijlage x Gemiste omzet project [naam/jaar]", "Bijlage x Aanvullende informatie project [naam/jaar]", "Bijlage x Would-be uitwerking"). Neem uitsluitend bijlagen op die corresponderen met daadwerkelijk aangeleverde of in het rapport uitgewerkte stukken — verzin geen bijlagen die niet zijn aangeleverd of uitgewerkt.
`.trim()
