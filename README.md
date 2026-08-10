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

## Setup

1. `npm install`
2. Kopieer `.env.example` naar `.env.local` en vul in:
   - `NEXT_PUBLIC_APP_URL` (bv. `http://localhost:3000`)
   - Supabase-project (URL + anon key + service role key)
   - `ANTHROPIC_API_KEY`
3. In het Supabase-dashboard: Authentication → URL Configuration → voeg `{NEXT_PUBLIC_APP_URL}/auth/confirm` toe aan de redirect URLs.
4. `npm run dev`

De eerste gebruiker moet handmatig worden aangemaakt (bv. via Supabase dashboard → Authentication → Add user, of via de Supabase CLI), aangezien `/admin/gebruikers` zelf al een ingelogde gebruiker vereist.

## Openstaande punten

- Datamodel voor "zaak" (documentregels: verplicht/optioneel per rechtsvorm, aantal BV's, jaren rondom ongevalsdatum) nog niet uitgewerkt.
- Handmatige document-upload (Supabase Storage) nog niet gebouwd.
- `/admin/gebruikers` heeft nog geen rolcheck — elke ingelogde gebruiker kan uitnodigen. Prima voor een klein team, maar te herzien zodra de groep groeit.
- AVG/compliance: Data Processing Agreement met Anthropic nog te regelen gezien de gevoeligheid van de documenten (financiële en persoonsgegevens).
- Historische rapportages als referentiemateriaal voor Claude nog niet ingeladen/geïndexeerd.
- Microsoft Entra ID/Graph-koppeling (automatisch documenten ophalen) staat nog los — token-refresh is ook niet geïmplementeerd in `src/auth.ts`.
