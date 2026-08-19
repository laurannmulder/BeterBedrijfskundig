# Mailsjablonen voor Supabase

Deze twee bestanden horen in **Supabase → Authentication → Emails** geplakt te
worden bij de sjablonen **Invite user** (`uitnodiging.html`) en **Reset Password**
(`wachtwoord-herstel.html`).

## Waarom ze afwijken van de standaard

Supabase's standaardsjabloon gebruikt `{{ .ConfirmationURL }}`. Die link gaat
eerst langs Supabase's eigen `/auth/v1/verify`-adres, dat de eenmalige token
meteen verzilvert. Mailscanners (Microsoft Safe Links en soortgelijke) bezoeken
links in binnenkomende post automatisch om ze te controleren, en branden die
token daarmee op vóórdat de ontvanger klikt. Die krijgt dan "link is ongeldig
of verlopen" op een link die hij nooit gebruikt heeft.

Deze sjablonen linken daarom **rechtstreeks** naar `/auth/confirm` met
`token_hash` en `type` als parameters. Die pagina toont alleen een knop; de token
wordt pas verzilverd als iemand die knop echt indrukt. Scanners halen URL's op
maar versturen geen formulieren, dus daarmee is het probleem weg.

## Voorwaarde

Sjablonen bewerken kan alleen met **eigen SMTP** ingesteld (Authentication →
Emails → SMTP Settings). Op het gratis abonnement blokkeert Supabase het
bewerken zolang je hun standaardmailer gebruikt.

## Let op bij het plakken

- `type=invite` hoort bij het uitnodigingssjabloon, `type=recovery` bij herstel.
  Verwissel je die, dan weigert Supabase de token.
- `{{ .SiteURL }}` pakt de Site URL uit de URL Configuration — die moet dus
  kloppen, anders wijzen de links naar het verkeerde adres.
