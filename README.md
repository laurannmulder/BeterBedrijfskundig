# BeterBedrijfskundig

Rapportagetool voor de bedrijfskundige die bedrijfskundige rapportages opstelt over gemiste inkomsten van ondernemers met letsel, in opdracht van verzekeraars.

## Wat de app doet

- Bij het starten van een **zaak** worden vier vragen gesteld (oprichtingsdatum onderneming, rechtsvorm, ongevalsdatum, aantal BV's van het slachtoffer) waarmee wordt bepaald welke documenten verplicht/optioneel zijn.
- Documenten worden voorlopig **handmatig geüpload** (naar Supabase Storage) — geen automatische koppeling met de Microsoft cloudomgeving.
- Toegang tot de app is met e-mail/wachtwoord (Supabase Auth). Nieuwe bedrijfskundigen worden uitgenodigd via een e-mail met een link waarmee ze zelf een wachtwoord instellen.
- De inhoud van de documenten (aangiftes, jaarcijfers, contracten) wordt gebruikt als input, samen met historische rapportages als stijl-/structuurreferentie, om met Claude een concept bedrijfskundige rapportage te genereren.

## Stack

- **Next.js 16** (App Router) — let op: deze versie wijkt op punten af van eerdere Next.js-kennis. Zie `AGENTS.md` / `node_modules/next/dist/docs/` voordat je aan routing, caching of `proxy.ts` (voorheen `middleware.ts`) werkt.
- **Supabase** (Postgres + Auth + Storage) — zaken, documentmetadata, gebruikers, login, documentopslag.
- **Anthropic Claude API** (`@anthropic-ai/sdk`) — rapportgeneratie.
- **Microsoft Graph API / Auth.js met Entra ID** — aanwezig in de codebase maar **nog niet actief gekoppeld**. Bedoeld voor later, als automatisch documenten ophalen uit SharePoint/OneDrive weer wordt opgepakt (zie `src/auth.ts`, `src/lib/microsoft-graph/`).

## Auth-flow

1. Een bestaande gebruiker nodigt een nieuwe bedrijfskundige uit via `/admin/gebruikers` (roept `supabase.auth.admin.inviteUserByEmail` aan met de service-role key).
2. Supabase verstuurt een e-mail met een link naar `/auth/confirm`, die de uitnodiging verifieert en de gebruiker naar `/wachtwoord-instellen` stuurt.
3. Daar kiest de gebruiker zelf een wachtwoord; daarna is de sessie actief.
4. Inloggen daarna gewoon via `/login` met e-mail + wachtwoord.
5. **Wachtwoord vergeten** (`/wachtwoord-vergeten`) stuurt via `supabase.auth.resetPasswordForEmail` een reset-mail, die dezelfde `/auth/confirm` → `/wachtwoord-instellen`-route gebruikt als de uitnodigingsflow.

`/auth/confirm` verifieert het token pas ná een expliciete klik op een knop (niet automatisch bij het openen van de link) — dit beschermt tegen mail-scanners zoals Microsoft Outlook Safe Links die anders de eenmalige link al "verbruiken" voordat de mens klikt (zie `feedback_email_invite_scanner_gotcha` in het projectgeheugen).

**Bekende beperking (2026-08-11):** deze bescherming werkt alleen als de e-mail rechtstreeks naar `/auth/confirm` linkt. Met Supabase's **standaard mailer** (nu in gebruik) verwijst de link eerst naar Supabase's eigen `/auth/v1/verify`-endpoint, en die eerste stop lijkt door mail-scanners al "geklikt" te worden — waardoor wachtwoord-reset-links soms toch al verlopen zijn voordat de gebruiker zelf klikt. De structurele fix is de e-mailtemplates (Authentication → Email Templates, "Reset Password" en "Invite user") aanpassen zodat de link direct naar `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery` (resp. `type=invite`) wijst, in plaats van `{{ .ConfirmationURL }}`. **Dit vereist custom SMTP** — Supabase staat templates aanpassen niet toe op het gratis plan met de standaard mailer. Bewust uitgesteld; zie openstaande punten.

## Dashboard

Na het inloggen (`/`, `src/app/page.tsx`) zie je direct een overzicht van alle zaken, gesorteerd op **laatst bewerkt**. Dat veld (`zaken.laatst_bewerkt`) wordt automatisch bijgewerkt door database-triggers zodra er iets verandert aan een gekoppelde onderneming, document of rapportage (zie `supabase/migrations/0004_zaken_laatst_bewerkt.sql`) — de app-code hoeft dit zelf niet bij te houden. Per zaak zie je: documentvoortgang (verplichte documenten geüpload / totaal), de status van de laatste rapportage (of "geen rapportage"), en hoelang geleden de zaak voor het laatst is bewerkt. Bovenaan staat een korte samenvatting (aantal zaken, aantal met ontbrekende verplichte documenten) en een knop om een nieuwe zaak te starten.

Een gedeelde `Header` (`src/components/Header.tsx` — logo, navigatie, ingelogde gebruiker, uitloggen) staat op alle ingelogde pagina's.

## Zaken en documentchecklist

Bij het aanmaken van een zaak (`/zaken/nieuw`) vul je de betrokkene, ongevalsdatum en één of meer ondernemingen in (naam, rechtsvorm, oprichtingsdatum, KvK-nummer). Op basis daarvan berekent `src/lib/documenten/vereisten.ts` welke documenten verplicht/optioneel zijn en voor welke jaren, en worden die als rijen in `documenten` gezet:

- **Aangifte inkomstenbelasting** — verplicht, op zaakniveau (hoort bij de betrokkene, niet bij één onderneming), 5 jaar vóór het ongevalsjaar t/m nu.
- **Jaarcijfers** — verplicht, per onderneming, zelfde jarenreeks (of vanaf oprichting als de onderneming korter bestaat).
- **Aangifte omzetbelasting, leasecontract, huurcontract, bankafschriften, arbeidsovereenkomsten** — optioneel, per onderneming, zelfde jaren als de jaarcijfers.
- **VOF-contract** — verplicht als rechtsvorm VOF is.
- **Vennootschapscontract** — verplicht als rechtsvorm BV is.

Op de zaakpagina (`/zaken/[id]`) upload je per document een bestand naar Supabase Storage (bucket `documenten`); de status springt dan van "ontbreekt" naar "geüpload", met de bestandsnaam als link (signed URL, 10 min geldig) ernaast. Een document kan worden vervangen door gewoon opnieuw te uploaden ("Vervangen") — bij een andere bestandsnaam wordt het oude bestand automatisch opgeruimd.

Deze regels zijn gebaseerd op twee voorbeeldrapportages (eenmanszaak en BV) die zijn doorgenomen voor de opzet — zie ook de opmerking over holdingstructuren hieronder.

## Rapportgeneratie

Op de zaakpagina genereert de knop **"Genereer rapport"** (`src/app/zaken/[id]/actions.ts` → `genereerRapportage`) een conceptrapportage:

1. Optioneel vul je eerst een tekstvak in met **extra informatie/instructies** voor deze specifieke versie (bv. iets uit een telefoongesprek). Dit wordt meegestuurd in de prompt én bewaard bij de gegenereerde versie.
2. Zaak-, ondernemings- en documentgegevens worden opgehaald; van elk geüpload document wordt de inhoud gedownload uit Storage. PDF's en scans/foto's (jpg/png) gaan als native document-/image-content mee naar Claude — Claude leest de PDF-tekst en scans zelf, er is geen aparte OCR-stap. Platte tekst wordt als tekst meegestuurd; overige bestandstypen krijgen een placeholder-melding.
3. `src/lib/rapportage/genereer.ts` bouwt een prompt met die gegevens plus het structuursjabloon in `src/lib/rapportage/sjabloon.ts` (secties/opbouw afgeleid van de twee voorbeeldrapportages — geen cliëntgegevens, puur de structuur).
4. Claude (`claude-opus-5`, streaming, adaptive thinking) schrijft een concept in markdown, met aannames expliciet gemarkeerd als `[AANNAME]` in plaats van verzonnen zekerheden.
5. Het resultaat wordt opgeslagen als nieuwe rij in `rapportages` (status standaard `concept`) en getoond op `/zaken/[id]/rapportages/[rapportageId]`.

Ontbrekende verplichte documenten worden mee opgestuurd zodat Claude ze noemt in hoofdstuk 7 (Voortgang) in plaats van erover te zwijgen.

**Versies:** elke generatie maakt een nieuwe rij aan — niets wordt overschreven. `/zaken/[id]/rapportages` toont alle versies van een zaak (tijdstip, status, en een preview van eventuele extra informatie). Op elke versie kan de status gewisseld worden tussen `concept` en `definitief`.

## Deployment

Live op Vercel: **https://beter-bedrijfskundig.vercel.app** (GitHub: `laurannmulder/BeterBedrijfskundig`, auto-deploy vanaf `main`). Productie en lokale ontwikkeling delen op dit moment dezelfde Supabase-database.

Bij het opzetten zijn drie losse Vercel-eigenaardigheden tegengekomen — nuttig om te weten bij een nieuw project:
1. **Vercel Authentication** (Settings → Deployment Protection) stond standaard aan en blokkeerde alle bezoekers zonder Vercel-account — moest uit voor Production.
2. **Framework Preset stond op "Other"** in plaats van "Next.js" (gebeurt als een project niet via de standaard "Import Git Repository"-wizard wordt aangemaakt/gekoppeld) — hierdoor werden er geen serverless functions aangemaakt en gaf letterlijk elke route 404, ondanks een geslaagde build.
3. **`middleware.ts` i.p.v. `proxy.ts`**: onder de nieuwe Next.js 16-naamgeving `proxy.ts` routete Vercel geen enkel verzoek (0 function-invocations in de logs, ondanks een correcte build-manifest). Teruggezet naar de klassieke `middleware.ts`-naam, die in Next.js 16 nog volledig werkt (alleen gedeprecieerd) — sindsdien werkt het probleemloos. Nog niet geverifieerd of dit een Vercel-platformbeperking is die inmiddels is opgelost.

Daarnaast: de auth-middleware ving in eerste instantie ook statische bestanden (zoals `/logo.svg`) af en stuurde die door naar `/login` voor niet-ingelogde bezoekers. De matcher in `src/middleware.ts` sluit nu gangbare statische extensies uit.

## Setup

1. `npm install`
2. Kopieer `.env.example` naar `.env.local` en vul in:
   - `NEXT_PUBLIC_APP_URL` (bv. `http://localhost:3000`)
   - Supabase-project (URL + anon key + service role key)
   - `ANTHROPIC_API_KEY` (via [console.anthropic.com](https://console.anthropic.com) → Settings → API Keys — vereist een account met credits, geen gratis tier)
3. In het Supabase-dashboard: Authentication → URL Configuration → voeg `{NEXT_PUBLIC_APP_URL}/auth/confirm` toe aan de redirect URLs.
4. Draai de migraties in `supabase/migrations/` in volgorde (`0001_zaken.sql`, `0002_rapportages.sql`, `0003_rapportages_extra.sql`, `0004_zaken_laatst_bewerkt.sql`) in de Supabase SQL Editor.
5. `npm run dev`

De eerste gebruiker moet handmatig worden aangemaakt (bv. via Supabase dashboard → Authentication → Add user, of via de Supabase CLI), aangezien `/admin/gebruikers` zelf al een ingelogde gebruiker vereist.

## Openstaande punten

- `/admin/gebruikers` heeft nog geen rolcheck — elke ingelogde gebruiker kan uitnodigen. Prima voor een klein team, maar te herzien zodra de groep groeit.
- Holdingstructuren (een BV die aandeelhouder is van een andere BV, zoals in de BV-voorbeeldrapportage) zijn nog niet in de UI gemodelleerd — `ondernemingen.moederonderneming_id` staat er alvast voor klaar.
- Financiële cijfers uit de documenten worden niet gestructureerd opgeslagen (geen bedragen-per-jaar/post in de database) — Claude leest ze rechtstreeks uit de aangeleverde documenten bij elke rapportgeneratie, wat werkt maar herbruikbare/doorzoekbare cijfers in de weg staat.
- Alleen PDF, JPG/PNG en platte tekst worden ondersteund; .docx/.xlsx-uploads krijgen een "onleesbaar"-placeholder in de prompt.
- Geen limiet/waarschuwing bij zeer grote of zeer veel documenten (Claude API-limiet: 32 MB per request, 600 pagina's).
- AVG/compliance: Data Processing Agreement met Anthropic nog te regelen gezien de gevoeligheid van de documenten (financiële en persoonsgegevens).
- Echte historische rapportages (i.p.v. het generieke structuursjabloon) nog niet als few-shot-referentie gekoppeld — zou de stijlgetrouwheid verbeteren.
- Geen vergelijking tussen versies (diff/wat is er veranderd) — je kunt alle versies los bekijken, maar niet naast elkaar.
- Microsoft Entra ID/Graph-koppeling (automatisch documenten ophalen) staat nog los — token-refresh is ook niet geïmplementeerd in `src/auth.ts`.
- **Custom SMTP (Resend) nog niet ingesteld** — bewust uitgesteld. Zonder custom SMTP kunnen de e-mailtemplates niet aangepast worden (Supabase-beperking op het gratis plan), waardoor de wachtwoord-reset-link kwetsbaar blijft voor mail-scanners zoals Outlook Safe Links (zie "Auth-flow" hierboven). Vereist een geverifieerd domein bij Resend — nog geen domein voor dit project geverifieerd (en Bloom's Resend-koppeling blijkt ook geen geverifieerd domein te hebben, gebruikt de `onboarding@resend.dev`-testafzender, die vermoedelijk alleen aankomt bij het eigen Resend-accountadres — dat is een los aandachtspunt voor Bloom).
