-- Beheerdersrol. Tot nu toe kon elke ingelogde gebruiker nieuwe accounts
-- uitnodigen; vanaf nu mag alleen een beheerder dat.
--
-- Draai dit bestand handmatig in de Supabase SQL Editor (zoals alle migraties
-- in dit project: er is geen DB-wachtwoord gedeeld, dus geen psql-toegang) en
-- zet daarna de eerste beheerder aan met het statement onderaan dit bestand.

-- 1. Profiel per gebruiker. auth.users blijft de bron voor e-mail/wachtwoord;
--    hier staat alleen wat de app zelf over een gebruiker moet weten.
create table if not exists public.profielen (
  id uuid primary key references auth.users (id) on delete cascade,
  is_beheerder boolean not null default false,
  aangemaakt_op timestamptz not null default now()
);

-- 2. Elke nieuwe auth-gebruiker krijgt automatisch een profiel, zodat de app
--    nooit naar een ontbrekend profiel hoeft te raden.
create or replace function public.maak_profiel_voor_nieuwe_gebruiker()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profielen (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiel_bij_nieuwe_gebruiker on auth.users;
create trigger profiel_bij_nieuwe_gebruiker
  after insert on auth.users
  for each row execute function public.maak_profiel_voor_nieuwe_gebruiker();

-- Profielen voor gebruikers die al bestonden voordat deze migratie draaide.
insert into public.profielen (id)
select u.id from auth.users u
where not exists (select 1 from public.profielen p where p.id = u.id);

-- 3. RLS. Beheerdersacties in de app lopen via de service-role client (die RLS
--    omzeilt); deze policy beschermt de gewone, ingelogde gebruiker.
--    De helper is security definer om oneindige recursie te voorkomen: een
--    policy op profielen die zelf profielen leest zou zichzelf aanroepen.
create or replace function public.is_beheerder()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select p.is_beheerder from public.profielen p where p.id = auth.uid()),
    false
  );
$$;

alter table public.profielen enable row level security;

drop policy if exists "eigen profiel lezen" on public.profielen;
create policy "eigen profiel lezen" on public.profielen
  for select to authenticated using (id = auth.uid() or public.is_beheerder());

-- Bewust geen insert/update/delete-policy: het beheerdersvinkje wordt alleen
-- gezet via de SQL Editor of de service-role client, nooit door de gebruiker
-- zelf.

-- 4. Eerste beheerder aanzetten — vervang het e-mailadres en draai dit los,
--    anders kan niemand meer gebruikers uitnodigen:
--
-- update public.profielen set is_beheerder = true
-- where id = (select id from auth.users where email = 'jouw@e-mailadres.nl');
