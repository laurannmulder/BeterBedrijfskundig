// Structuursjabloon voor de bedrijfskundige rapportage. Gebaseerd op het
// kantoor-eigen blanco formatdocument ("Format BEDRIJFSKUNDIGE RAPPORTAGE",
// een placeholder-sjabloon zonder cliëntgegevens), het doornemen van negen
// echte voorbeeldrapportages (uiteenlopend: VOF, eenmanszaak, DGA/BV-
// holdingstructuur, meervoudige vennootschappen, met en zonder expliciete
// vragenlijst, eerste rapportage en vervolgrapportages), en de expliciete
// bevestiging van de bedrijfskundige zelf over het vaste skelet dat elke
// rapportage bevat. De brondocumenten zijn na het afleiden van deze
// structuur niet bewaard; dit bevat alleen de generieke opbouw, geen
// cliëntgegevens.
//
// Kernprincipe (bevestigd door de bedrijfskundige): de tool richt zich op de
// vragen die door verzekeraar/belangenbehartiger worden gesteld; de exacte
// koppen/nummering/opmaak wordt door de backoffice in het definitieve format
// gegoten. Inhoudelijke volledigheid en juistheid wegen zwaarder dan exacte
// kopnaam-consistentie.
export const RAPPORTAGE_SJABLOON = `
Volg deze exacte lay-out (structuur, koppen, paragraafnummering en volgorde) — dit is de huisstijl van het kantoor.

MARKDOWN-KOPPENNIVEAUS — strikt volgen, dit bepaalt de opmaak in het uiteindelijke Word-document:
- "#" (h1): uitsluitend de titelregel "BEDRIJFSKUNDIGE RAPPORTAGE", één keer, aan het begin.
- "##" (h2): uitsluitend de genummerde hoofdstukken (bv. "## 1. ALGEMEEN") en de ongenummerde hoofdstukken op hetzelfde niveau ("## BEANTWOORDING VRAGEN", "## VOORTGANG", "## BIJLAGEN"). Let op: de ondertekening (zie verderop) krijgt GEEN kop.
- "###" (h3): uitsluitend de genummerde subparagrafen binnen hoofdstuk 1 (1.1, 1.2, 1.3).
- Alle overige subkopjes (bv. "Winst- en verliesrekening", "Balans", "Solvabiliteit", een ondernemingsnaam als subkopje in hoofdstuk 2) zijn GEEN markdown-kop — schrijf ze als **vetgedrukte tekst** op een eigen regel, gevolgd door een lege regel en dan de bijbehorende inhoud.

OMSLAG / GEGEVENSBLOK (vóór hoofdstuk 1, geen paragraafnummer, geen markdown-kop)
Begin met de titelregel (h1) "BEDRIJFSKUNDIGE RAPPORTAGE", gevolgd door vier gegevensblokken. Elk gegevensblok is GEEN tabel — schrijf een vetgedrukte kopregel gevolgd door een lege regel en dan de velden, elk op een eigen regel in de vorm "Label: waarde" (dus platte tekst, geen aparte "Label"/"Waarde"-koppen, geen markdown-tabelsyntax met | en ---):
- **Persoonlijke gegevens betrokkene:** Naam, Adres, Postcode, Woonplaats, E-mail, Telefoon, Geboortedatum, Datum schade/ongeval.
- **Gegevens verzekeraar:** Verzekeraar, Naam (contactpersoon), E-mail, Kenmerk.
- **Gegevens belangenbehartiger:** Letselschadebureau, Naam, E-mail, Kenmerk.
- **Gegevens bedrijfskundige:** Bezoekdatum, Rapportagedatum, Rapporteur, E-mail, Telefoon, Dossiernummer.
Zet elk veld op een eigen regel (lege regel ertussen, dus elk veld een eigen alinea). Vul alleen in wat daadwerkelijk bekend is uit de aangeleverde gegevens/documenten; onbekende velden krijgen "onbekend" — verzin nooit een naam, e-mailadres of kenmerk.

VERVOLGRAPPORTAGE — controleer dit EERST, vóór je begint te schrijven
Is bij de aangeleverde stukken een of meer eerdere rapportages voor dit dossier meegegeven? Dan is dit een vervolgrapportage. Dat verandert de opbouw wezenlijk:
- Herhaal GEEN hoofdstuk of onderdeel dat inhoudelijk al in een eerdere rapportage is behandeld (bv. de financiële analyse vóór het ongeval, of jaren die al eerder zijn geanalyseerd). Vat dat in 1.1 Aanleiding in twee zinnen samen ("in de rapportage d.d. [datum] is ... behandeld") en ga direct verder met wat nieuw is.
- Is een deel van de vraagstelling in een eerdere rapportage al beantwoord en een deel nog niet? Beantwoord dan uitsluitend de nog openstaande vragen (net als hoofdstuk 3 hieronder al zegt), niet de hele lijst opnieuw.
- Is er nieuwe informatie aangeleverd sinds de vorige rapportage (nieuwe jaarcijfers, aangiften, gesprekken)? Bespreek die kort in een apart onderdeel "Nieuwe informatie" vóór hoofdstuk "Beantwoording vragen", op dezelfde manier als de financiële hoofdstukken hieronder (per onderneming, kort).
Is er geen eerdere rapportage aangeleverd, dan is dit de eerste/hoofdrapportage — volg het volledige skelet hieronder.

1. ALGEMEEN
  1.1 Aanleiding — wie is betrokkene, wanneer en waardoor is het ongeval ontstaan, wie verzoekt de rapportage. Bij een vervolgrapportage: zie de instructie hierboven.
  1.2 Vraagstelling — controleer EERST of de opdrachtbrief (of andere correspondentie van verzekeraar/belangenbehartiger) een expliciete opsomming van onderwerpen/vragen bevat waaraan aandacht besteed moet worden (vaak ingeleid met een zin als "Wij verzoeken u daarbij in ieder geval aandacht te besteden aan de volgende onderwerpen:", of een genummerde vragenlijst). Is die er:
    - Neem DIE onderwerpen/vragen letterlijk over — verwoord ze zo nodig als volledige vraagzinnen, maar wijzig de inhoud/strekking niet en laat er geen weg (dit is de daadwerkelijke opdracht van de opdrachtgever, geen invuloefening). Bij een vervolgrapportage: neem alleen de nog openstaande vragen over (zie hierboven).
    - Vul, als het verlies aan verdienvermogen niet al expliciet is uitgevraagd, deze standaardvraag aanvullend toe — dit hoort standaard in dit type rapportage thuis, ook als er niet letterlijk naar gevraagd wordt.
    Is er geen expliciete opsomming in de opdrachtbrief/correspondentie te vinden, gebruik dan de standaard onderzoeksvragen:
    - Hoe stond het bedrijf van betrokkene er in bedrijfskundige/bedrijfseconomische zin voor op datum ongeval?
    - Hoe staat het bedrijf er nu voor?
    - Hoe zou het bedrijf zijn vergaan als het ongeval niet had plaatsgevonden (would-be)?
    - Welke invloed heeft de uitval van betrokkene gehad op het resultaat van het bedrijf?
    - Wat is het verlies aan verdienvermogen (VAV), rekening houdend met doorlopende kosten?
  1.3 Onderzoeksactiviteiten — standaard als opsomming: Voorbereiding/dossierstudie; Bezoek aan en gesprek met betrokkene (tenzij uit de stukken blijkt dat dit niet heeft plaatsgevonden — dan weglaten of expliciet benoemen dat dit nog moet gebeuren); Raadplegen Kamer van Koophandel; Internet, diverse websites. Voeg een voetnoot toe bij deze paragraafkop met de tekst: "Bij het onderzoek en de bijbehorende berekeningen is afgerond op hele getallen. Daarom kan het voorkomen dat totaaltellingen door deze afrondingen licht afwijken. Er is getracht dit zoveel mogelijk te voorkomen."

2. ALGEMENE BEDRIJFSINFORMATIE
  Open met: "Vanuit de registers van de Kamer van Koophandel (KvK) is de volgende informatie ontleend. (Gegevens zijn vervaardigd op [datum, of 'onbekend'])."
  Behandel daarna per onderneming afzonderlijk (ondernemingsnaam **vetgedrukt** op een eigen regel, geen markdown-kop): inschrijvingsdatum KvK, KvK-nummer, handelsnaam/namen, rechtsvorm, activiteiten als opsomming met SBI-code(s) indien bekend, aantal werkzame personen, en (indien uit de stukken/het gesprek blijkt) een korte beschrijving van de bedrijfsactiviteiten en de rolverdeling tussen eventuele vennoten/mede-DGA's. Bij een holdingstructuur (een onderneming die aandeelhouder is van een andere): benoem expliciet het aandeelhouderspercentage en de relatie tussen de ondernemingen.
  Bij een vervolgrapportage waarin dit hoofdstuk al eerder uitgebreid is behandeld: neem dit hoofdstuk alleen beknopt op (of laat het weg als er niets is gewijzigd) — zie de vervolgrapportage-instructie hierboven.

3. FINANCIËLE ANALYSE ONDERNEMING VOORAFGAAND AAN HET ONGEVAL
  Sla dit hoofdstuk volledig over bij een vervolgrapportage waarin dit al in een eerdere rapportage is behandeld (zie de vervolgrapportage-instructie hierboven) — verwijs er dan kort naar in 1.1 Aanleiding.
  **Winst- en verliesrekening** (vetgedrukt, geen markdown-kop): bespreek de winst- en verliesrekening(en) van de jaren vóór het ongeval — doorgaans de 3 tot 5 jaren voorafgaand aan het ongeval, voor zover aangeleverd. Geef per onderdeel van de winst- en verliesrekening (omzet, inkoopwaarde/kostprijs, personeelskosten, overige kostenposten, resultaat) het verloop over de jaren weer, en licht bijzondere wijzigingen toe — vaak staat hierover informatie in de toelichting op de jaarrekening of blijkt dit uit het gesprek met de ondernemer.
  **Balans** (vetgedrukt, geen markdown-kop; alleen als er balansgegevens zijn aangeleverd — anders expliciet benoemen dat deze ontbreken en dat de balansanalyse daarom niet uitgevoerd kan worden, in plaats van dit onderdeel over te slaan): bespreek de balans van het jaar direct voorafgaand aan het ongeval (bv. ongeval op 1 mei 2025 → balans per 31 december 2024). Leg kort uit dat de activazijde de bezittingen bevat en de passivazijde het eigen vermogen en de schulden. Beoordeel de balans aan de hand van twee kengetallen, elk **vetgedrukt** (geen markdown-kop) op een eigen regel:
  - "Solvabiliteit": eigen vermogen / totaal vermogen. Norm: hoger dan 25% wordt als gezond beschouwd. Benoem expliciet of de solvabiliteit boven of onder de norm ligt en wat dat betekent (te lage solvabiliteit = weinig buffer voor financiële tegenslagen, risico voor financiële stabiliteit/kredietwaardigheid/continuïteit).
  - "Current ratio": (voorraden + vorderingen + liquide middelen) / kort vreemd vermogen. Norm: hoger dan 1 betekent een goede liquiditeit (op korte termijn aan verplichtingen kunnen voldoen). Benoem expliciet of de current ratio boven of onder de norm ligt.
  Voeg bij deze twee kengetallen een voetnoot toe met de standaarddefinitie: bij solvabiliteit "De solvabiliteit geeft de verhouding aan van het eigen vermogen ten opzichte van het vreemde vermogen (de leningen binnen de onderneming). De verhouding geeft aan of de onderneming de schulden op lange termijn kan voldoen."; bij current ratio "De current ratio is een kengetal dat de liquiditeit van de onderneming weergeeft. Het geeft aan in hoeverre de onderneming in staat is om op korte termijn verplichtingen te voldoen."
  Sluit af met een kort **Resumé** (vetgedrukt, geen markdown-kop) dat solvabiliteit en current ratio samen duidt.
  **Netto jaarinkomen betrokkene** (vetgedrukt, geen markdown-kop): het netto jaarinkomen van betrokkene vóór het ongeval, ontleend vanuit de aangiften inkomstenbelasting (niet vanuit het bedrijfsresultaat zelf — die twee kunnen afwijken, met name bij een DGA/BV, zie hoofdstuk 5). Toon de berekening van bruto naar netto jaarinkomen (resultaataandeel/loon, minus inkomstenbelasting en premies, minus bijdrage Zorgverzekeringswet, = netto jaarinkomen) als een korte, transparante stap-voor-stap opsomming per jaar. Ontbreekt de aangifte IB van een jaar dat wel relevant is: benoem dit expliciet als ontbrekende informatie in plaats van het netto jaarinkomen te benaderen vanuit het jaarrekeningresultaat.
  Overweeg, alléén bij een eenmanszaak of VOF (dus niet bij een DGA/BV — daar geldt de dividendmethodiek uit hoofdstuk 5) én alléén als de cijfers dit goed onderbouwd toelaten, een korte alinea over de Economische Waarde Ondernemersarbeid (EWO) — de waarde die de ondernemer zelf toevoegt aan de ingekochte goederen en arbeid, boven op wat ingekochte diensten/materialen en personeel al opleveren. Laat dit gewoon weg als de cijfers hiervoor onvoldoende houvast bieden — verzin geen precieze EWO-berekening op basis van te weinig gegevens.

4. FINANCIËLE ANALYSE ONDERNEMING NA HET ONGEVAL
  Bij een vervolgrapportage: alleen de jaren/periode die nog niet in een eerdere rapportage zijn behandeld (zie de vervolgrapportage-instructie hierboven) — niet de al eerder gerapporteerde jaren herhalen.
  Zelfde subkoppen (steeds vetgedrukte tekst, geen markdown-kop) als hoofdstuk 3 (Winst- en verliesrekening, Balans met Solvabiliteit/Current ratio/Resumé, Netto jaarinkomen betrokkene), nu voor de periode vanaf het ongevalsjaar tot en met de meest recente beschikbare financiële informatie. Deze informatie komt uit de jaarrekeningen, maar soms ook uit conceptjaarcijfers/kolommenbalansen en/of aangiften omzetbelasting (tussentijdse cijfers) als de definitieve jaarrekening nog niet gereed is — benoem expliciet als cijfers een concept/tussentijds karakter hebben. Besteed expliciet aandacht aan:
  - welke onderdelen van de winst- en verliesrekening door het ongeval zijn beïnvloed (koppel dit aan wat er in het gesprek met de ondernemer naar voren is gekomen, niet alleen aan de cijfers zelf);
  - kosten die doorlopen ondanks omzetdaling (afschrijvingen, vaste lasten, verzekeringen e.d.).
  De **Balans** wordt besproken voor het meest recente jaar ná het ongeval waarvan een balans beschikbaar is.
  De **Netto jaarinkomen betrokkene**-paragraaf beslaat de periode vanaf het ongevalsjaar tot het meest recente jaar waarvan een aangifte IB beschikbaar is.

5. BEANTWOORDING VRAGEN
  Beantwoord puntsgewijs de vragen uit 1.2 (bij een vervolgrapportage: alleen de nog openstaande vragen). Verwijs voor de financiële ontwikkeling terug naar hoofdstuk 3/4 in plaats van die cijfers te herhalen. Dit hoofdstuk is ook de plek voor vragen die geen zuivere verlies-aan-verdienvermogen-berekening zijn (bv. een vraag over een zakelijk/vastgoed-gerelateerd gevolg van het ongeval, levensvatbaarheid, marktpositie, kwaliteiten van de ondernemer) — beantwoord die net zo direct en beargumenteerd als de financiële vragen, desnoods met de kanttekening dat voor een deel van de vraag ander specialistisch advies (fiscalist, notaris) nodig is.

  Verlies aan verdienvermogen (VAV) — als dit wordt gevraagd (expliciet, of standaard toegevoegd via 1.2):
  Het verlies aan verdienvermogen is het netto jaarinkomen dat betrokkene zonder ongeval zou hebben gegenereerd (het would-be scenario) minus het netto jaarinkomen dat betrokkene daadwerkelijk heeft gegenereerd, per jaar.
  Stel hiervoor een would-be winst- en verliesrekening op (de situatie waarbij het ongeval wordt 'weggedacht'), gebaseerd op — kies wat het beste bij de beschikbare informatie past en benoem expliciet welke aanpak is gekozen en waarom:
  - de historische trend van de onderneming vóór het ongeval (lineaire extrapolatie of jaarlijkse groeivoet);
  - een concreet aantoonbaar gemist project/traject/opdracht (met eigen onderbouwing/bijlagen);
  - de resultaten van een vennoot/maat/collega-ondernemer in een vergelijkbare positie, als referentiepunt voor wat betrokkene zonder ongeval had kunnen behalen;
  - actuele branche-/marktcijfers voor de betreffende SBI-code (zie hieronder — gebruik hiervoor actief de zoekmogelijkheid naar recente, betrouwbare bronnen zoals CBS, brancheorganisaties of vakpublicaties in plaats van dit uit eigen kennis te reconstrueren; vermeld de bron en de datum van de cijfers).
  Benoem expliciet welke aannames zijn gemaakt — dit is een oordeelsvormend onderdeel, geen zuivere rekensom. Is voor een jaar de benodigde informatie (jaarcijfers en/of aangifte IB) nog niet beschikbaar, stel dan geen voorlopige/geschatte berekening op alsof die informatie er wel is; benoem expliciet dat de berekening voor dat jaar nog niet gemaakt kan worden en wat daarvoor nog nodig is. Kan er, bij ontbrekende informatie voor een lopend/toekomstig jaar, wel een bruikbare indicatie voor bevoorschotting worden gegeven? Overweeg dan het gemiddelde van de al wél berekende schadejaren als voorlopige maatstaf, met de expliciete kanttekening dat dit een voorlopige inschatting is.

  Krijgt de would-be-reconstructie een EIGEN HOOFDSTUK "5. WOULD-BE SITUATIE" (waarna "Beantwoording vragen" hoofdstuk 6 wordt en "Voortgang" hoofdstuk 7) — wanneer de onderbouwing omvangrijk of complex is (bv. gebaseerd op een specifiek, apart te onderbouwen gemist project of een uitgebreide maandelijkse/per-omzetstroom reconstructie) — of blijft dit onderdeel van "Beantwoording vragen"? Kies zelf op basis van de omvang; bij twijfel: geen apart hoofdstuk.

  Netto-inkomen zonder ongeval bij een DGA/B.V. (rechtsvorm B.V., betrokkene is aandeelhouder/bestuurder en ontvangt zowel salaris als (potentieel) dividend): gebruik NIET de resultaatdeling of het salaris als enige maatstaf. Neem in plaats daarvan het onderstaande tekstblok WOORDELIJK en ONGEWIJZIGD over (vertaal, parafraseer of verkort het niet) als toelichting op de gekozen methode, gevolgd door de eigen berekening (bruto jaarinkomen Box 1 vanuit loon, plus het bruto jaarinkomen Box 2 vanuit het (fictief) uit te keren dividend, getoetst aan een minimale solvabiliteitseis van 25% — blijft er bij die solvabiliteitseis onvoldoende eigen vermogen over om het volledige resultaat na belasting uit te keren, houd dan het verschil in de onderneming en keer alleen het resterende bedrag uit):

  """
  In de berekeningswijze voor het uit te keren dividend is ervoor gekozen om de situatie na te bootsen van het dividend dat betrokkene had kunnen ontvangen in privé.

  Deze keuze is gemaakt om daarmee de even onmogelijke als discutabele berekening van de waarde van de onderneming op het moment van staking of verkoop, zonder en met ongeval, te voorkomen.

  Onderstaand een nadere toelichting over de berekening van de schade in de situatie van misgelopen dividend. (Bron: SDU Juridische Opleidingen; Schadevaststelling van ondernemers bij letsel).

  Naast het salaris ontvangt de DGA dus de winst in de vorm van dividend of tantièmes, het box 2 inkomen uit aanmerkelijk belang. De DGA heeft althans deze aanspraak. Of de volledige (over)winst wordt uitgekeerd, is uiteraard de vraag.

  Vaak laat de DGA de winst immers (voor een deel) in de BV zitten. De winst is daarmee geheel of gedeeltelijk gereserveerd tot de DGA de BV verkoopt.

  De waardevermindering van de aandelen is, naast het gegeven dat het een vermogensschade van de BV is, dus ook een vermogensschade van de DGA zelf. De DGA lijdt deze schade echter niet via "box 3" maar via "box 2", omdat de fiscale regelgeving dit zo heeft bepaald.

  De Hoge Raad stelde dit eigenlijk al op 2 december 1994 reeds vast dat de vermogensschade van de BV door een lagere winst tevens de waardevermindering van de aandelen betreft en daarmee dus tevens de vermogensschade van de aandeelhouder is.

  "Die vermogensschade van de vennootschap zal, zolang deze niet is vergoed, een vermindering van de waarde van de aandelen in de vennootschap meebrengen."

  De schadevaststelling heeft dan plaats door jaarlijks, zij het fictief, uit te gaan van de uitkering van de vennootschappelijke winst (na vennootschapsbelasting uiteraard) aan de aandeelhouder(s) in de vorm van dividend. Na inhouding van de dividendbelasting vormt dit bedrag vervolgens tezamen met het netto DGA-loon in box 1 het verdienvermogen van de DGA.

  De laatste jaren wordt deze concrete methode van schadevaststelling ook steeds vaker in de rechtspraak bevestigd. Zo stelt de rechtbank Zeeland-West-Brabant op 1 februari 2016 vast dat het "slechts" uitgaan van het gemiste salaris als DGA tekort doet aan de werkelijke situatie en dat de DGA daardoor ten onrechte gelijk wordt gesteld met een werknemer in loondienst:

  …..omdat volgens [man Y] het verlies verdienvermogen van een zelfstandig ondernemer moet worden berekend op basis van (uitsluitend) de gemiste management fee en/of overwinst.

  In een dergelijke benadering wordt de ondernemer in de berekening van de schade ten onrechte gelijkgesteld met een werknemer in loondienst. Dan blijft de waarschijnlijk belangrijkste vorm van schade, namelijk het niet, althans in mindere mate dan voor het ongeval kunnen toevoegen van waarde aan het bedrijf en daarmee het verlies van de waarde van (de aandelen in) het bedrijf geheel buiten beschouwing.

  Voor de vaststelling van de nettowaarde van het arbeidsvermogen van de ondernemer in een BV kan daarom het beste rekening worden gehouden met een jaarlijkse fictieve uitkering van de (over)winst met daarop de aanmerkelijk-belangheffing volgens box 2. Er wordt jaarlijks, zij het fictief, rekening gehouden met een dividenduitkering, waardoor de werkelijke waarde van het arbeidsvermogen tot uitdrukking komt…..

  Door het (fictief) aannemen van de uitbetaling van de volledige overwinst aan de rechthebbende, bouwt de onderneming verder geen waarde op en is de verkoopwinst verdisconteerd in de jaarlijkse dividend(winst)uitkeringen.

  Veelal is het het beste om van de hiervoor besproken constructie uit te gaan, om de even onmogelijke als discutabele berekening van de waarde van de onderneming op het moment van staking of verkoop, zonder en met ongeval, te voorkomen. Met de verkoopwinst bij staking van de onderneming behoeft dan in de berekening geen rekening te worden gehouden.
  """

  Neem in beide gevallen (VOF/eenmanszaak resultaatdeling én DGA/B.V. dividendmethodiek) op:
  - Tabel "Netto-inkomen betrokkene" voor zowel de would-be als de feitelijke situatie, per jaar.
  - Tabel "Verlies aan verdienvermogen": netto-inkomen zonder ongeval min netto-inkomen met ongeval, per jaar en totaal.

BRANCHE-/MARKTINFORMATIE — actief te gebruiken waar relevant (would-be-onderbouwing, marktontwikkeling-vraag, algemene bedrijfsinformatie)
Gebruik de beschikbare zoekmogelijkheid actief om actuele, betrouwbare branche- en marktinformatie te achterhalen die relevant is voor de SBI-code(s) van de onderneming(en) — bijvoorbeeld omzetontwikkeling/-groei binnen de branche (CBS), specifieke marktontwikkelingen, en waar relevant een kort marktbeeld (vraagontwikkeling, structuur van de sector, kansen/bedreigingen). Vermeld altijd de bron en, indien bekend, de datum/periode van de cijfers. Gebruik dit niet als losse bijlage maar verwerk het waar het de analyse versterkt (met name bij de would-be-onderbouwing en bij een expliciete vraag naar marktontwikkeling). Vind je geen bruikbare of actuele informatie, benoem dat dan kort in plaats van verouderde of onzekere cijfers als feit te presenteren.

VOORTGANG (laatste genummerde hoofdstuk)
  Dit hoofdstuk gaat over het vervolgproces, NIET primair over ontbrekende documenten. Gebruik als basis: "Het conceptrapport wordt eerst naar betrokkene verzonden en ter goedkeuring voorgelegd. Belangenbehartiger en verzekeraar worden tijdens het traject gelijktijdig op de hoogte gehouden. Deze rapportage zal gelijktijdig worden verstuurd aan betrokkene, de verzekeraar en de belangenbehartiger." Voeg daarna, als korte losse alinea, wél kort op basis van vakkundig oordeel toe welke informatie nog ontbreekt of welke openstaande vragen er zijn (bv. een jaar waarvan de jaarcijfers of aangifte IB nog niet beschikbaar zijn) — maar dit blijft een korte alinea, geen hoofdmoot van dit hoofdstuk.

ONDERTEKENING (na het laatste genummerde hoofdstuk — GEEN kop/label "Ondertekening" printen, gewoon direct de onderstaande regels)
Sluit af met de naam van de bedrijfskundige, gevolgd door "Bedrijfskundige" en de naam van het bureau — elk op een eigen regel, cursief (markdown *tekst*). Vul dit alleen in als het bekend is uit de aangeleverde gegevens; anders "[AANNAME: naam/functie/bureau bedrijfskundige]".

BIJLAGEN (na de ondertekening, geen paragraafnummer)
Sluit af met een genummerde lijst "Bijlage 1", "Bijlage 2" etc. van de stukken waarnaar in dít rapport wordt verwezen (bij een vervolgrapportage dus niet de bijlagen van een eerdere rapportage herhalen). Meestal gaat dit om de financiële kernstukken (bv. "Bijlage 1 Winst- en verliesrekening(en) [jaren]", "Bijlage 2 Winst- en verliesrekening(en) in percentages t.o.v. de omzet", "Bijlage 3 Balans [onderneming] per [datum]"). Als de would-be-reconstructie op een specifiek project/traject is gebaseerd, voeg dan aparte bijlagen toe die dat onderbouwen. Neem uitsluitend bijlagen op die corresponderen met daadwerkelijk aangeleverde of in het rapport uitgewerkte stukken — verzin geen bijlagen die niet zijn aangeleverd of uitgewerkt.
`.trim()
