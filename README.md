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

Standaard verstuurt Supabase deze e-mails via zijn eigen (rate-limited) mailserver — prima om mee te testen. Voor productiegebruik: configureer custom SMTP (bv. Resend, zoals bij Bloom) in de Supabase-projectinstellingen onder Authentication → Emails.

## Zaken en documentchecklist

Bij het aanmaken van een zaak (`/zaken/nieuw`) vul je de betrokkene, ongevalsdatum en één of meer ondernemingen in (naam, rechtsvorm, oprichtingsdatum, KvK-nummer). Op basis daarvan berekent `src/lib/documenten/vereisten.ts` welke documenten verplicht/optioneel zijn en voor welke jaren, en worden die als rijen in `documenten` gezet:

- **Aangifte inkomstenbelasting** — verplicht, op zaakniveau (hoort bij de betrokkene, niet bij één onderneming), 5 jaar vóór het ongevalsjaar t/m nu.
- **Jaarcijfers** — verplicht, per onderneming, zelfde jarenreeks (of vanaf oprichting als de onderneming korter bestaat).
- **Aangifte omzetbelasting, leasecontract, huurcontract, bankafschriften, arbeidsovereenkomsten** — optioneel, per onderneming, zelfde jaren als de jaarcijfers.
- **VOF-contract** — verplicht als rechtsvorm VOF is.
- **Vennootschapscontract** — verplicht als rechtsvorm BV is.

Op de zaakpagina (`/zaken/[id]`) upload je per document een bestand naar Supabase Storage (bucket `documenten`); de status springt dan van "ontbreekt" naar "geüpload".

Deze regels zijn gebaseerd op twee voorbeeldrapportages (eenmanszaak en BV) die zijn doorgenomen voor de opzet — zie ook de opmerking over holdingstructuren hieronder.

## Rapportgeneratie

Op de zaakpagina genereert de knop **"Genereer rapport"** (`src/app/zaken/[id]/actions.ts` → `genereerRapportage`) een conceptrapportage:

1. Zaak-, ondernemings- en documentgegevens worden opgehaald; van elk geüpload document wordt de inhoud gedownload uit Storage (werkt nu voor platte tekst; PDF/scan-parsing is nog niet gebouwd — zie openstaande punten).
2. `src/lib/rapportage/genereer.ts` bouwt een prompt met die gegevens plus het structuursjabloon in `src/lib/rapportage/sjabloon.ts` (secties/opbouw afgeleid van de twee voorbeeldrapportages — geen cliëntgegevens, puur de structuur).
3. Claude (`claude-opus-5`, streaming, adaptive thinking) schrijft een concept in markdown, met aannames expliciet gemarkeerd als `[AANNAME]` in plaats van verzonnen zekerheden.
4. Het resultaat wordt opgeslagen in `rapportages` en getoond op `/zaken/[id]/rapportage` (gerenderd met `react-markdown` + `remark-gfm`, incl. tabellen).

Ontbrekende verplichte documenten worden mee opgestuurd zodat Claude ze noemt in hoofdstuk 7 (Voortgang) in plaats van erover te zwijgen.

## Setup

1. `npm install`
2. Kopieer `.env.example` naar `.env.local` en vul in:
   - `NEXT_PUBLIC_APP_URL` (bv. `http://localhost:3000`)
   - Supabase-project (URL + anon key + service role key)
   - `ANTHROPIC_API_KEY` (via [console.anthropic.com](https://console.anthropic.com) → Settings → API Keys — vereist een account met credits, geen gratis tier)
3. In het Supabase-dashboard: Authentication → URL Configuration → voeg `{NEXT_PUBLIC_APP_URL}/auth/confirm` toe aan de redirect URLs.
4. Draai de migraties in `supabase/migrations/` (in volgorde: `0001_zaken.sql`, `0002_rapportages.sql`) in de Supabase SQL Editor.
5. `npm run dev`

De eerste gebruiker moet handmatig worden aangemaakt (bv. via Supabase dashboard → Authentication → Add user, of via de Supabase CLI), aangezien `/admin/gebruikers` zelf al een ingelogde gebruiker vereist.

## Openstaande punten

- `/admin/gebruikers` heeft nog geen rolcheck — elke ingelogde gebruiker kan uitnodigen. Prima voor een klein team, maar te herzien zodra de groep groeit.
- Holdingstructuren (een BV die aandeelhouder is van een andere BV, zoals in de BV-voorbeeldrapportage) zijn nog niet in de UI gemodelleerd — `ondernemingen.moederonderneming_id` staat er alvast voor klaar.
- Financiële cijfers uit de documenten worden nu simpel als platte tekst meegestuurd aan Claude; er is geen gestructureerde opslag (bedragen per jaar/post) en geen PDF/scan-parsing — documenten die geen platte tekst zijn worden nu genegeerd met een placeholder-melding in de prompt.
- AVG/compliance: Data Processing Agreement met Anthropic nog te regelen gezien de gevoeligheid van de documenten (financiële en persoonsgegevens).
- Echte historische rapportages (i.p.v. het generieke structuursjabloon) nog niet als few-shot-referentie gekoppeld — zou de stijlgetrouwheid verbeteren.
- Geen versiebeheer/vergelijking tussen meerdere gegenereerde rapportages van dezelfde zaak; de rapportagepagina toont altijd alleen de laatste.
- Microsoft Entra ID/Graph-koppeling (automatisch documenten ophalen) staat nog los — token-refresh is ook niet geïmplementeerd in `src/auth.ts`.
