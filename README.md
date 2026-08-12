# BeterBedrijfskundig

Rapportagetool voor de bedrijfskundige die bedrijfskundige rapportages opstelt over gemiste inkomsten van ondernemers met letsel, in opdracht van verzekeraars.

## Wat de app doet

- Bij het starten van een **zaak** (`/zaken/nieuw`) vul je alleen naam betrokkene en dossiernummer in — verder niets.
- De rest van de zaakgegevens (ongevalsdatum, onderneming, oprichtingsdatum, rechtsvorm, KvK-nummer) komt binnen door simpelweg **documenten te uploaden** (naar Supabase Storage): Claude leest elk bestand, herkent welke categorie(ën) erin staan (een enkel bestand kan er meerdere bevatten, ook meerdere jaren tegelijk) en vult ontbrekende zaak-/ondernemingsgegevens automatisch aan. Zie "Documentclassificatie" hieronder.
- Toegang tot de app is met e-mail/wachtwoord (Supabase Auth). Nieuwe bedrijfskundigen worden uitgenodigd via een e-mail met een link waarmee ze zelf een wachtwoord instellen.
- De inhoud van de documenten (aangiftes, jaarcijfers, contracten) wordt gebruikt als input, samen met historische rapportages als stijl-/structuurreferentie, om met Claude een concept bedrijfskundige rapportage te genereren.

## Stack

- **Next.js 16** (App Router) — let op: deze versie wijkt op punten af van eerdere Next.js-kennis. Zie `AGENTS.md` / `node_modules/next/dist/docs/` voordat je aan routing, caching of `proxy.ts` (voorheen `middleware.ts`) werkt.
- **Supabase** (Postgres + Auth + Storage) — zaken, documentmetadata, gebruikers, login, documentopslag.
- **Anthropic Claude API** (`@anthropic-ai/sdk`) — rapportgeneratie.
- **Microsoft Graph API / Auth.js met Entra ID** — aanwezig in de codebase maar **nog niet actief gekoppeld**. Bedoeld voor later, als automatisch documenten ophalen uit SharePoint/OneDrive weer wordt opgepakt (zie `src/auth.ts`, `src/lib/microsoft-graph/`).

## Vormgeving

Gedeelde UI-bouwstenen staan in `src/components/ui.tsx` (`Button`/`LinkButton`, `Badge`, `Card`, `PageHeader`, plus de `inputClass`/`labelClass`/`fileInputClass`-constanten) en worden op elk scherm hergebruikt voor een consistente look: zwart-wit met zinc-tinten, zachte `zinc-50`-paginakleur met witte cards (`rounded-xl`, subtiele schaduw), Geist als lettertype, en `lucide-react` voor iconen. Native `<input type="file">`-elementen gebruiken de Tailwind `file:`-variant (`fileInputClass`) zodat de "Choose file(s)"-knop er ook echt als knop uitziet — dat was zonder deze styling onzichtbaar.

## Auth-flow

1. Een bestaande gebruiker nodigt een nieuwe bedrijfskundige uit via `/admin/gebruikers` (roept `supabase.auth.admin.inviteUserByEmail` aan met de service-role key).
2. Supabase verstuurt een e-mail met een link naar `/auth/confirm`, die de uitnodiging verifieert en de gebruiker naar `/wachtwoord-instellen` stuurt.
3. Daar kiest de gebruiker zelf een wachtwoord; daarna is de sessie actief.
4. Inloggen daarna gewoon via `/login` met e-mail + wachtwoord.
5. **Wachtwoord vergeten** (`/wachtwoord-vergeten`) stuurt via `supabase.auth.resetPasswordForEmail` een reset-mail, die dezelfde `/auth/confirm` → `/wachtwoord-instellen`-route gebruikt als de uitnodigingsflow.

`/auth/confirm` verifieert het token pas ná een expliciete klik op een knop (niet automatisch bij het openen van de link) — dit beschermt tegen mail-scanners zoals Microsoft Outlook Safe Links die anders de eenmalige link al "verbruiken" voordat de mens klikt (zie `feedback_email_invite_scanner_gotcha` in het projectgeheugen).

**Bekende beperking (2026-08-11):** deze bescherming werkt alleen als de e-mail rechtstreeks naar `/auth/confirm` linkt. Met Supabase's **standaard mailer** (nu in gebruik) verwijst de link eerst naar Supabase's eigen `/auth/v1/verify`-endpoint, en die eerste stop lijkt door mail-scanners al "geklikt" te worden — waardoor wachtwoord-reset-links soms toch al verlopen zijn voordat de gebruiker zelf klikt. De structurele fix is de e-mailtemplates (Authentication → Email Templates, "Reset Password" en "Invite user") aanpassen zodat de link direct naar `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery` (resp. `type=invite`) wijst, in plaats van `{{ .ConfirmationURL }}`. **Dit vereist custom SMTP** — Supabase staat templates aanpassen niet toe op het gratis plan met de standaard mailer. Bewust uitgesteld; zie openstaande punten.

## Dashboard

Na het inloggen (`/`, `src/app/page.tsx`) zie je direct een overzicht van alle zaken, gesorteerd op **laatst bewerkt**. Dat veld (`zaken.laatst_bewerkt`) wordt automatisch bijgewerkt door database-triggers zodra er iets verandert aan een gekoppelde onderneming, document of rapportage (zie `supabase/migrations/0004_zaken_laatst_bewerkt.sql`) — de app-code hoeft dit zelf niet bij te houden. Per zaak zie je: het aantal herkende documenten, de status van de laatste rapportage (of "geen rapportage"), en hoelang geleden de zaak voor het laatst is bewerkt. Bovenaan staat een korte samenvatting (aantal zaken, aantal zonder documenten) en een knop om een nieuwe zaak te starten.

Een gedeelde `Header` (`src/components/Header.tsx` — logo, navigatie, ingelogde gebruiker, uitloggen) staat op alle ingelogde pagina's.

## Zaken en documentclassificatie

Bij het aanmaken van een zaak (`/zaken/nieuw`) zijn alleen **naam betrokkene** en **dossiernummer** verplicht — al het overige (ongevalsdatum, onderneming(en), rechtsvorm, oprichtingsdatum, KvK-nummer) mag worden weggelaten en komt binnen via geüploade documenten in plaats van een handmatig formulier.

Op de zaakpagina (`/zaken/[id]`) staat één algemeen upload-blok ("Documenten uploaden", multi-select) — geen los knopje per checklist-item meer, want er is geen vooraf berekende checklist meer. Elk geüpload bestand doorloopt `src/lib/documenten/verwerk-upload.ts`:

1. **Upload** naar Supabase Storage (bucket `documenten`).
2. **Classificatie** (`src/lib/documenten/classificeer.ts`): één Claude-aanroep (`claude-opus-5`, tool-use met `tool_choice: 'auto'` — een geforceerde tool-keuze combineert niet betrouwbaar met extended thinking, dat op dit model standaard aanstaat) bepaalt welke categorie(ën) en welk(e) jaar/jaren het bestand bevat. Eén bestand kan aan **meerdere categorieën tegelijk voldoen** (bv. jaarcijfers van meerdere jaren, of jaarcijfers én een aangifte IB in hetzelfde bestand) — voor elke herkende combinatie komt een aparte rij in `documenten`, allemaal wijzend naar hetzelfde geüploade bestand. Wordt niets herkend, dan krijgt het bestand het type `overig` (zichtbaar in de "Overige documenten"-sectie) zodat het nooit stilzwijgend verdwijnt.
3. **Metadata-aanvulling**: dezelfde aanroep extraheert ook `ondernemingNaam`, `rechtsvorm`, `oprichtingsdatum`, `kvkNummer` en `ongevalsdatum` als het document die vermeldt (alleen wat er echt in staat, nooit gegokt). Ongevalsdatum wordt op de zaak ingevuld als die nog leeg is; een onderneming wordt gematcht op naam (case-insensitive) — bij een match worden alleen de nog lege velden aangevuld, bij geen match wordt een nieuwe onderneming aangemaakt. Bestaande, al ingevulde waarden worden nooit overschreven.

Categorieën: `aangifte_ib` en `opdrachtbrief` horen bij de zaak/betrokkene; `jaarcijfers`, `aangifte_ob`, `leasecontract`, `huurcontract`, `bankafschriften`, `arbeidsovereenkomst`, `vof_contract`, `vennootschapscontract` en `kvk_uittreksel` horen bij een specifieke onderneming (volgorde in `ONDERNEMING_DOCUMENT_VOLGORDE`). **Geen enkele categorie is nog verplicht** — een categorie-sectie wordt alleen getoond zodra er daadwerkelijk een document in herkend is, in plaats van als lege placeholder.

Elke rij toont de bestandslink (signed URL, 10 min geldig) en een **"Verwijderen"**-knop — verwijdert de rij, en ruimt het onderliggende bestand in Storage alleen op als geen andere categorie er nog naar verwijst (één bestand kan immers meerdere rijen bedienen).

**Zaakgegevens-vierkant**: linksboven op de zaakpagina staat een kaart met wat er over de zaak bekend is — naam betrokkene, per onderneming naam/oprichtingsdatum/KvK-nummer, ongevalsdatum, en de datum waarop de zaak is aangemaakt. Ontbrekende velden tonen "onbekend" i.p.v. leeg of een foutmelding.

**Kosten/tijd:** elke upload triggert een Claude-aanroep. Bij een groot bestand kan classificeren tot rond een minuut duren; bij meerdere bestanden tegelijk gebeurt dat na elkaar (geen achtergrond-jobsysteem — de pagina blijft laden tot alles verwerkt is).

**Overige documenten bij rapportgeneratie:** bij het genereren van een rapportage kun je naast het tekstvak met extra informatie ook meteen één of meerdere bestanden meegeven (`extra_bestanden`, multi-select) — deze doorlopen dezelfde classificatie als bij "Documenten uploaden" en verschijnen dus ook gewoon bij de juiste categorie (of "Overige documenten" als niets herkend wordt). Ze blijven bewaard voor toekomstige versies, niet alleen voor de generatie waarbij ze zijn geüpload.

## Rapportgeneratie

Op de zaakpagina genereert de knop **"Genereer rapport"** (`src/app/zaken/[id]/actions.ts` → `genereerRapportage`) een conceptrapportage:

1. Optioneel vul je eerst een tekstvak in met **extra informatie/instructies** voor deze specifieke versie (bv. iets uit een telefoongesprek), en/of upload je er direct één of meerdere **extra bestanden** bij (zie "Overige documenten" hierboven).
2. Zaak-, ondernemings- en documentgegevens worden opgehaald; van elk geüpload document wordt de inhoud gedownload uit Storage en via `src/lib/documenten/lees-bestand.ts` omgezet (gedeeld met de classificatiestap). PDF's en scans/foto's (jpg/png) gaan als native document-/image-content mee naar Claude — Claude leest de PDF-tekst en scans zelf, er is geen aparte OCR-stap. Platte tekst wordt als tekst meegestuurd. Word (`.docx`) en Excel (`.xlsx`) worden serverside omgezet naar platte tekst (`src/lib/documenten/lees-inhoud.ts`, via `mammoth` resp. `exceljs`) en dan als tekst meegestuurd. Oudere binaire `.doc`/`.xls`-bestanden en overige bestandstypen krijgen een placeholder-melding.
3. `src/lib/rapportage/genereer.ts` bouwt een prompt met die gegevens plus het structuursjabloon in `src/lib/rapportage/sjabloon.ts` — de exacte lay-out (omslag-/gegevenstabellen, hoofdstukvolgorde, ondertekening, bijlagenlijst) is afgeleid van een echte voorbeeldrapportage; het brondocument is na het afleiden van de structuur niet bewaard, alleen de generieke opbouw staat in de code.
4. Claude (`claude-opus-5`, streaming, adaptive thinking) schrijft een concept in markdown, met aannames expliciet gemarkeerd als `[AANNAME]` in plaats van verzonnen zekerheden. Er is geen vaste checklist meer om tegen af te zetten — hoofdstuk 7 (Voortgang) laat Claude op basis van vakkundig oordeel benoemen wat er nog ontbreekt.
5. Het resultaat wordt opgeslagen als nieuwe rij in `rapportages` (status standaard `concept`) en getoond op `/zaken/[id]/rapportages/[rapportageId]`.

**Versies:** elke generatie maakt een nieuwe rij aan — niets wordt overschreven. `/zaken/[id]/rapportages` toont alle versies van een zaak (tijdstip, status, en een preview van eventuele extra informatie). Op elke versie kan de status gewisseld worden tussen `concept` en `definitief`. De extra informatie die bij een versie hoort is ook ná het genereren nog te wijzigen of te verwijderen (los van het opnieuw genereren van een rapport) via een bewerkbaar tekstvak op de versiepagina.

**Download als Word:** op elke versiepagina zet de knop **"Download als Word"** (`/zaken/[id]/rapportages/[rapportageId]/docx`) de markdown-inhoud om naar een `.docx`-bestand. `src/lib/rapportage/naar-docx.ts` parseert de markdown naar een AST (`unified`/`remark-parse`/`remark-gfm`) en zet koppen, vet/cursief, tabellen, genummerde/opsommingslijsten en blockquotes om naar `docx`-elementen; de route handler (`.../docx/route.ts`) stuurt het resultaat terug als download met een bestandsnaam op basis van de betrokkene en de datum.

## Deployment

Live op Vercel: **https://beter-bedrijfskundig.vercel.app** (GitHub: `laurannmulder/BeterBedrijfskundig`, auto-deploy vanaf `main`). Productie en lokale ontwikkeling delen op dit moment dezelfde Supabase-database.

Bij het opzetten zijn drie losse Vercel-eigenaardigheden tegengekomen — nuttig om te weten bij een nieuw project:
1. **Vercel Authentication** (Settings → Deployment Protection) stond standaard aan en blokkeerde alle bezoekers zonder Vercel-account — moest uit voor Production.
2. **Framework Preset stond op "Other"** in plaats van "Next.js" (gebeurt als een project niet via de standaard "Import Git Repository"-wizard wordt aangemaakt/gekoppeld) — hierdoor werden er geen serverless functions aangemaakt en gaf letterlijk elke route 404, ondanks een geslaagde build.
3. **`middleware.ts` i.p.v. `proxy.ts`**: onder de nieuwe Next.js 16-naamgeving `proxy.ts` routete Vercel geen enkel verzoek (0 function-invocations in de logs, ondanks een correcte build-manifest). Teruggezet naar de klassieke `middleware.ts`-naam, die in Next.js 16 nog volledig werkt (alleen gedeprecieerd) — sindsdien werkt het probleemloos. Nog niet geverifieerd of dit een Vercel-platformbeperking is die inmiddels is opgelost.

Daarnaast: de auth-middleware ving in eerste instantie ook statische bestanden (zoals `/logo.svg`) af en stuurde die door naar `/login` voor niet-ingelogde bezoekers. De matcher in `src/middleware.ts` sluit nu gangbare statische extensies uit.

## Gegevensverwerking en privacy

De data in deze app (financiële gegevens, medische/letselcontext, persoonsgegevens van betrokkenen) is uiterst gevoelig. Dit legt vast wie de data raakt, wat daarin al technisch geregeld is, en wat nog **organisatorisch** geregeld moet worden — dat laatste vereist accounttoegang die niet vanuit de code te regelen is.

**Wie raakt de data aan:**
- **Supabase** — database, auth en bestandsopslag. Data-verwerker.
- **Anthropic (Claude API)** — documentinhoud wordt gestuurd voor classificatie (`src/lib/documenten/classificeer.ts`) en rapportgeneratie (`src/lib/rapportage/genereer.ts`). Data-verwerker, en noodzakelijk voor de kernfunctie van de app.
- **Vercel** — hosting/runtime. Verwerkt requests, slaat zelf geen documentinhoud op (die gaat rechtstreeks tussen de app-server, Supabase Storage en de Claude API).
- **Geen andere derde partijen** — geverifieerd (2026-08-12): geen analytics/tracking-dependencies in `package.json`, geen logging van documentinhoud, geen onverwachte externe API-aanroepen in de codebase.
- **Microsoft Graph/Entra ID** (`src/auth.ts`, `/api/auth/*`) staat in de code maar is **niet actief** — geen Azure-app-registratie, geen credentials ingesteld, wordt dus niet aangeroepen.

**Wat Anthropic met de data doet (geverifieerd via de officiële documentatie op [privacy.claude.com](https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training) en [platform.claude.com](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention)):**
- Standaard traint Anthropic **niet** op data via de commerciële API — alleen als er expliciet feedback wordt gegeven via duim omhoog/omlaag-knoppen (die knoppen zitten niet in deze app, dus dit pad wordt nooit geraakt).
- Deze app gebruikt uitsluitend API-features die in aanmerking komen voor **Zero Data Retention (ZDR)**: de Messages API, tool-use/structured outputs, PDF-ondersteuning, prompt caching en het model `claude-opus-5` (geen "Covered Model" dat 30-dagen-retentie vereist). Bewust géén Files API, Batch API of code execution — die zijn namelijk niet ZDR-eligible.
- **ZDR is geen standaardinstelling** — moet per organisatie worden aangevraagd bij Anthropic Sales. Zonder ZDR geldt Anthropic's normale (kortdurende, niet-voor-training) bewaarbeleid.
- Zelfs onder ZDR: content die door Anthropic's trust-and-safety-systemen gemarkeerd wordt, kan tot 2 jaar bewaard blijven — een branchebrede uitzondering voor misbruikbestrijding, niet iets dat wij kunnen uitschakelen.

**Al gedaan:**
- Codebase-audit op ongewenste dataflows (analytics, logging, externe aanroepen) — niets gevonden.
- Next.js' anonieme CLI-telemetrie uitgeschakeld (`NEXT_TELEMETRY_DISABLED=1`).

**Nog te regelen (accounttoegang nodig die niet vanuit de code te regelen is):**
1. **Zero Data Retention aanvragen bij Anthropic** via [claude.com/contact-sales](https://claude.com/contact-sales) — de belangrijkste stap; alle Claude-aanroepen in deze app zijn al ZDR-eligible, dus dit sluit de grootste blootstelling.
2. **Bevestigen dat het Anthropic-account onder de Commercial Terms of Service valt** (niet een persoonlijk/consumer-gekoppelde sleutel) — de DPA met SCC's wordt dan automatisch meegenomen.
3. **Supabase-DPA en projectregio controleren** (dashboard → Organization settings) — met name of het project in een EU-regio draait.
4. **Vercel's DPA controleren** (Pro/Enterprise-plannen bieden die doorgaans).
5. **`NEXT_TELEMETRY_DISABLED=1` toevoegen aan Vercel's environment variables** zodat het ook in productie geldt (lokaal al gezet in `.env.local`).

**Wat "nooit bij derden" hier concreet betekent:** de kernfunctie van de app (documentclassificatie, rapportgeneratie) draait op de Claude API — dat is per definitie een externe verwerker, net als Supabase voor opslag. Volledig zonder externe verwerking zou betekenen dat de AI-functies niet meer werken. "Dichttimmeren" betekent hier: geen verwerkers buiten wat strikt nodig is (bevestigd: alleen Supabase + Anthropic + Vercel-hosting), en voor die verwerkers de sterkst beschikbare garanties regelen (ZDR, DPA's) — dat laatste is aan jou, niet vanuit de code af te dwingen.

## Setup

1. `npm install`
2. Kopieer `.env.example` naar `.env.local` en vul in:
   - `NEXT_PUBLIC_APP_URL` (bv. `http://localhost:3000`)
   - Supabase-project (URL + anon key + service role key)
   - `ANTHROPIC_API_KEY` (via [console.anthropic.com](https://console.anthropic.com) → Settings → API Keys — vereist een account met credits, geen gratis tier)
3. In het Supabase-dashboard: Authentication → URL Configuration → voeg `{NEXT_PUBLIC_APP_URL}/auth/confirm` toe aan de redirect URLs.
4. Draai de migraties in `supabase/migrations/` in volgorde (`0001` t/m `0007`) in de Supabase SQL Editor.
5. `npm run dev`

De eerste gebruiker moet handmatig worden aangemaakt (bv. via Supabase dashboard → Authentication → Add user, of via de Supabase CLI), aangezien `/admin/gebruikers` zelf al een ingelogde gebruiker vereist.

## Openstaande punten

- `/admin/gebruikers` heeft nog geen rolcheck — elke ingelogde gebruiker kan uitnodigen. Prima voor een klein team, maar te herzien zodra de groep groeit.
- Holdingstructuren (een BV die aandeelhouder is van een andere BV, zoals in de BV-voorbeeldrapportage) zijn nog niet in de UI gemodelleerd — `ondernemingen.moederonderneming_id` staat er alvast voor klaar.
- Financiële cijfers uit de documenten worden niet gestructureerd opgeslagen (geen bedragen-per-jaar/post in de database) — Claude leest ze rechtstreeks uit de aangeleverde documenten bij elke rapportgeneratie, wat werkt maar herbruikbare/doorzoekbare cijfers in de weg staat.
- Geen limiet/waarschuwing bij zeer grote of zeer veel documenten (Claude API-limiet: 32 MB per request, 600 pagina's).
- **Documentclassificatie is volledig automatisch, geen controlestap** — een geüpload bestand wordt direct als categorie/vinkje + metadata opgeslagen zonder dat de bedrijfskundige de AI-classificatie eerst ziet/goedkeurt (bewuste keuze). Een verkeerd geclassificeerd document kan wel verwijderd en opnieuw geüpload worden, maar een foutieve automatische aanvulling van bijv. het KvK-nummer valt alleen op bij handmatige controle.
- **Geen manier om een zaak- of ondernemingsveld handmatig te corrigeren** — alleen documenten uploaden/verwijderen; als de classificatie een fout KvK-nummer/oprichtingsdatum invult, is er geen bewerkformulier om dat recht te zetten (wel op te lossen door het brondocument te verwijderen en de juiste versie opnieuw te uploaden, als dat het probleem was).
- AVG/compliance — zie de volledige uitwerking in "Gegevensverwerking en privacy" hierboven; met name **Zero Data Retention bij Anthropic aanvragen** staat nog open, dat is de belangrijkste openstaande actie.
- Het structuursjabloon volgt nu de exacte lay-out van één echte voorbeeldrapportage (omslagtabellen, hoofdstukvolgorde, ondertekening, bijlagenlijst) — een tweede/derde voorbeeld vergelijken zou eventuele kantoor-brede variatie (i.p.v. toeval in dat ene voorbeeld) aan het licht kunnen brengen.
- Verzekeraar- en belangenbehartigergegevens (nu onderdeel van het omslagblok) worden niet structureel vastgelegd of via documentclassificatie herkend — komen alleen mee als ze toevallig letterlijk in een aangeleverd document staan en Claude ze in de vrije tekst opmerkt. Zou net als KvK-/ongevalsgegevens via classificatie uit een opdrachtbrief te halen zijn.
- Geen vergelijking tussen versies (diff/wat is er veranderd) — je kunt alle versies los bekijken, maar niet naast elkaar.
- Microsoft Entra ID/Graph-koppeling (automatisch documenten ophalen) staat nog los — token-refresh is ook niet geïmplementeerd in `src/auth.ts`.
- **Custom SMTP (Resend) nog niet ingesteld** — bewust uitgesteld. Zonder custom SMTP kunnen de e-mailtemplates niet aangepast worden (Supabase-beperking op het gratis plan), waardoor de wachtwoord-reset-link kwetsbaar blijft voor mail-scanners zoals Outlook Safe Links (zie "Auth-flow" hierboven). Vereist een geverifieerd domein bij Resend — nog geen domein voor dit project geverifieerd (en Bloom's Resend-koppeling blijkt ook geen geverifieerd domein te hebben, gebruikt de `onboarding@resend.dev`-testafzender, die vermoedelijk alleen aankomt bij het eigen Resend-accountadres — dat is een los aandachtspunt voor Bloom).
