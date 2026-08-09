# BeterBedrijfskundig

Rapportagetool voor de bedrijfskundige die bedrijfskundige rapportages opstelt over gemiste inkomsten van ondernemers met letsel, in opdracht van verzekeraars.

## Wat de app doet

- Bij het starten van een **zaak** worden vier vragen gesteld (oprichtingsdatum onderneming, rechtsvorm, ongevalsdatum, aantal BV's van het slachtoffer) waarmee wordt bepaald welke documenten verplicht/optioneel zijn.
- Documenten worden opgehaald uit de Microsoft cloudomgeving (SharePoint/OneDrive) van het bedrijf via de Microsoft Graph API, met de gebruiker ingelogd via Microsoft Entra ID SSO.
- De inhoud van de documenten (aangiftes, jaarcijfers, contracten) wordt gebruikt als input, samen met historische rapportages als stijl-/structuurreferentie, om met Claude een concept bedrijfskundige rapportage te genereren.

## Stack

- **Next.js 16** (App Router) — let op: deze versie wijkt op punten af van eerdere Next.js-kennis. Zie `AGENTS.md` / `node_modules/next/dist/docs/` voordat je aan routing, caching of `proxy.ts` (voorheen `middleware.ts`) werkt.
- **Supabase** (Postgres) — zaken, documentmetadata, gebruikers.
- **Auth.js (NextAuth v5)** met Microsoft Entra ID provider — SSO + delegated Graph-toegang.
- **Microsoft Graph API** (`@microsoft/microsoft-graph-client`) — documenten uit SharePoint/OneDrive.
- **Anthropic Claude API** (`@anthropic-ai/sdk`) — rapportgeneratie.

## Setup

1. `npm install`
2. Kopieer `.env.example` naar `.env.local` en vul in:
   - Supabase-project (URL + keys)
   - `ANTHROPIC_API_KEY`
   - `AUTH_SECRET` (genereer met `npx auth secret`)
   - Azure app-registratie voor Microsoft Entra ID (zie hieronder)
3. `npm run dev`

### Azure app-registratie (Microsoft Entra ID)

Voor SSO en Graph-toegang tot SharePoint/OneDrive is een app-registratie nodig in de Azure Portal van het bedrijf:

1. Entra ID → App registrations → New registration.
2. Redirect URI: `http://localhost:3000/api/auth/callback/microsoft-entra-id` (en later de productie-URL).
3. Certificates & secrets → nieuw client secret → `AUTH_MICROSOFT_ENTRA_ID_SECRET`.
4. API permissions (delegated): `Files.Read.All`, `Sites.Read.All` — admin consent laten geven door IT van het bedrijf.
5. `AUTH_MICROSOFT_ENTRA_ID_ISSUER` = `https://login.microsoftonline.com/<tenant-id>/v2.0`.

## Openstaande punten

- Datamodel voor "zaak" (documentregels: verplicht/optioneel per rechtsvorm, aantal BV's, jaren rondom ongevalsdatum) nog niet uitgewerkt.
- Token-refresh voor de Microsoft Graph access token is nog niet geïmplementeerd (`src/auth.ts`) — nodig zodra sessies langer duren dan de levensduur van het access token.
- AVG/compliance: Data Processing Agreement met Anthropic nog te regelen gezien de gevoeligheid van de documenten (financiële en persoonsgegevens).
- Historische rapportages als referentiemateriaal voor Claude nog niet ingeladen/geïndexeerd.
