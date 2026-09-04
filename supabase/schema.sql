-- ══════════════════════════════════════════════════════════════
--  Immo360 — schéma initial
--  À exécuter dans l'éditeur SQL de ton projet Supabase
-- ══════════════════════════════════════════════════════════════

-- ── Profiles ──────────────────────────────────────────────────
-- Extension du compte auth.users avec nom, initiales, couleur
create table public.profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  name       text not null,
  initials   text not null check (char_length(initials) between 1 and 2),
  color_css  text not null default 'var(--uL)',  -- 'var(--uL)' | 'var(--uP)' | 'var(--uF)'
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "profiles: read all"   on public.profiles for select to authenticated using (true);
create policy "profiles: update own" on public.profiles for update to authenticated using (auth.uid() = id);

-- Crée automatiquement le profil à la création du compte
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, initials, color_css)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name',      split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'initials',  upper(left(coalesce(new.raw_user_meta_data->>'name', new.email), 1))),
    coalesce(new.raw_user_meta_data->>'color_css', 'var(--uL)')
  );
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── Sociétés ──────────────────────────────────────────────────
create table public.societes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  legal_form text,          -- 'SRL', 'SA', …
  owner_id   uuid references public.profiles(id) not null,
  created_at timestamptz default now()
);
alter table public.societes enable row level security;
create policy "societes: full access" on public.societes to authenticated using (true) with check (true);


-- ── Bâtiments (groupement optionnel de biens) ─────────────────
create table public.batiments (
  id         uuid primary key default gen_random_uuid(),
  societe_id uuid references public.societes(id) on delete cascade not null,
  name       text not null,
  created_at timestamptz default now()
);
alter table public.batiments enable row level security;
create policy "batiments: full access" on public.batiments to authenticated using (true) with check (true);
grant select, insert, update, delete on public.batiments to authenticated;


-- ── Biens ─────────────────────────────────────────────────────
create table public.biens (
  id          uuid primary key default gen_random_uuid(),
  societe_id  uuid references public.societes(id) on delete cascade not null,
  batiment_id uuid references public.batiments(id) on delete set null,
  name        text not null,
  lots_count  integer not null default 1,
  created_at  timestamptz default now()
);
alter table public.biens enable row level security;
create policy "biens: full access" on public.biens to authenticated using (true) with check (true);


-- ── Tâches ────────────────────────────────────────────────────
create table public.taches (
  id          uuid primary key default gen_random_uuid(),
  societe_id  uuid references public.societes(id) on delete cascade not null,
  bien_id     uuid references public.biens(id) on delete set null,
  title       text not null,
  notes       text,
  category    text not null check (category in ('loyer', 'fiscal', 'tech', 'admin')),
  status      text not null default 'todo' check (status in ('todo', 'done')),
  due_date    date,
  amount      numeric(10,2),
  recurrence  text,                    -- 'mensuel', 'annuel', …
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table public.taches enable row level security;
create policy "taches: full access" on public.taches to authenticated using (true) with check (true);

-- Met à jour updated_at automatiquement
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger taches_touch_updated_at
  before update on public.taches
  for each row execute procedure public.touch_updated_at();


-- ── Quicklist (rappels quotidiens personnels) ─────────────────
create table public.quicklist (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade not null,
  text         text not null,
  position     integer not null default 0,
  checked_date date,
  created_at   timestamptz default now()
);
alter table public.quicklist enable row level security;
create policy "quicklist: own rows" on public.quicklist to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── Migration : assignation de tâche ─────────────────────────
-- À exécuter dans l'éditeur SQL Supabase si la table existe déjà
alter table public.taches
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null;


-- ── Comptabilité — templates d'obligations récurrentes ────────
create table public.compta_templates (
  id         uuid primary key default gen_random_uuid(),
  societe_id uuid references public.societes(id) on delete cascade not null,
  label      text not null,
  type       text not null check (type in ('tva','versement','loyer','bilan','isoc','autre')),
  frequency  text not null check (frequency in ('mensuel','trimestriel','semestriel','annuel')),
  due_day    integer not null check (due_day between 1 and 31),
  due_month  integer check (due_month between 1 and 12),  -- pour annuel uniquement
  notes      text,
  active     boolean not null default true,
  created_at timestamptz default now()
);
alter table public.compta_templates enable row level security;
create policy "compta_templates: full access" on public.compta_templates to authenticated using (true) with check (true);

-- ── Comptabilité — entrées cochées (done) ─────────────────────
create table public.compta_entries (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid references public.compta_templates(id) on delete cascade not null,
  period_key  text not null,   -- "2025-01", "2025-Q2", "2025-S1", "2025"
  notes       text,
  created_at  timestamptz default now(),
  unique(template_id, period_key)
);
alter table public.compta_entries enable row level security;
create policy "compta_entries: full access" on public.compta_entries to authenticated using (true) with check (true);

-- Grants (à exécuter si les tables existent déjà)
-- grant select, insert, update, delete on public.compta_templates to authenticated;
-- grant select, insert, update, delete on public.compta_entries to authenticated;


-- ── Assurances ────────────────────────────────────────────────
-- bien_id     : assurance propre à un bien (RC locataire, omnium…)
-- batiment_id : assurance couvrant le bâtiment entier (incendie…)
-- Exactement un des deux doit être renseigné
create table public.assurances (
  id                   uuid primary key default gen_random_uuid(),
  bien_id              uuid references public.biens(id) on delete cascade,
  batiment_id          uuid references public.batiments(id) on delete cascade,
  type                 text not null check (type in ('incendie','protection_juridique','omnium','loyers_impayes','rc_proprietaire','rc_locataire','autre')),
  statut               text not null default 'actif' check (statut in ('actif','resilie','en_renouvellement')),
  compagnie            text,
  numero_police        text,
  courtier             text,
  contact_courtier     text,
  prime                numeric(10,2),
  frequence_paiement   text check (frequence_paiement in ('mensuel','trimestriel','annuel')),
  date_debut           date,
  date_echeance        date,
  date_paiement        date,
  preavis_mois         integer default 3,
  franchise            numeric(10,2),
  valeur_assuree       numeric(10,2),
  perte_indirecte      boolean not null default false,
  protection_juridique boolean not null default false,
  abandon_recours      boolean not null default false,
  chomage_immobilier   boolean not null default false,
  notes                text,
  active               boolean not null default true,
  created_at           timestamptz default now(),
  constraint assurances_bien_or_bat check ((bien_id is null) != (batiment_id is null))
);
alter table public.assurances enable row level security;
create policy "assurances: full access" on public.assurances to authenticated using (true) with check (true);
grant select, insert, update, delete on public.assurances to authenticated;


-- ── Loyers — locataires ───────────────────────────────────────
create table public.locataires (
  id                uuid primary key default gen_random_uuid(),
  bien_id           uuid references public.biens(id) on delete cascade not null,
  nom               text not null,
  loyer_base        numeric(10,2),
  loyer_indexe      numeric(10,2),
  charges_communes  numeric(10,2),
  charges_privees   numeric(10,2),
  loyer_total_tvac  numeric(10,2),
  bail_signe        boolean not null default false,
  bail_enregistre   boolean not null default false,
  date_debut        date,
  date_fin          date,
  notes             text,
  active            boolean not null default true,
  created_at        timestamptz default now()
);
-- Un seul locataire actif par bien
create unique index locataires_bien_active_uidx
  on public.locataires (bien_id) where (active = true);
alter table public.locataires enable row level security;
create policy "locataires: full access" on public.locataires to authenticated using (true) with check (true);
grant select, insert, update, delete on public.locataires to authenticated;

-- ── Loyers — paiements mensuels ───────────────────────────────
create table public.loyer_paiements (
  id           uuid primary key default gen_random_uuid(),
  locataire_id uuid references public.locataires(id) on delete cascade not null,
  period_key   text not null,  -- "2025-01", "2025-02", …
  created_at   timestamptz default now(),
  unique(locataire_id, period_key)
);
alter table public.loyer_paiements enable row level security;
create policy "loyer_paiements: full access" on public.loyer_paiements to authenticated using (true) with check (true);
grant select, insert, update, delete on public.loyer_paiements to authenticated;

-- ── Loyers — montants impayés (caution, précompte, divers…) ───
create table public.montants_impayes (
  id           uuid primary key default gen_random_uuid(),
  locataire_id uuid references public.locataires(id) on delete cascade not null,
  label        text not null,
  montant      numeric(10,2) not null,
  rembourse    boolean not null default false,
  created_at   timestamptz default now()
);
alter table public.montants_impayes enable row level security;
create policy "montants_impayes: full access" on public.montants_impayes to authenticated using (true) with check (true);
grant select, insert, update, delete on public.montants_impayes to authenticated;


-- ── Précomptes immobiliers ─────────────────────────────────────
-- bien_id     : bien standalone (pas de bâtiment)
-- batiment_id : bâtiment regroupant plusieurs biens
-- Exactement un des deux doit être renseigné
create table public.precomptes (
  id            uuid primary key default gen_random_uuid(),
  bien_id       uuid references public.biens(id) on delete cascade,
  batiment_id   uuid references public.batiments(id) on delete cascade,
  annee         int not null check (annee between 2000 and 2100),
  montant       numeric(10,2),
  date_paiement date,
  a_refacturer  boolean not null default false,
  paye          boolean not null default false,
  facture       boolean not null default false,
  notes         text,
  active        boolean not null default true,
  created_at    timestamptz default now(),
  constraint precomptes_bien_or_bat check ((bien_id is null) != (batiment_id is null))
);
create unique index precomptes_bien_annee_uidx  on public.precomptes(bien_id, annee)    where bien_id is not null;
create unique index precomptes_bat_annee_uidx   on public.precomptes(batiment_id, annee) where batiment_id is not null;
alter table public.precomptes enable row level security;
create policy "precomptes: full access" on public.precomptes to authenticated using (true) with check (true);
grant select, insert, update, delete on public.precomptes to authenticated;

-- ══════════════════════════════════════════════════════════════
--  Données de départ — à adapter avec les vrais UUIDs des comptes
--  Créer d'abord les 3 comptes via Supabase Dashboard → Authentication
--  Puis récupérer leurs UUIDs et remplacer les valeurs ci-dessous
-- ══════════════════════════════════════════════════════════════

-- Mise à jour des profils (après création des comptes auth)
-- update public.profiles set name='Loucas', initials='L', color_css='var(--uL)' where id='UUID-LOUCAS';
-- update public.profiles set name='Père',   initials='P', color_css='var(--uP)' where id='UUID-PERE';
-- update public.profiles set name='Frère',  initials='F', color_css='var(--uF)' where id='UUID-FRERE';


-- ══════════════════════════════════════════════════════════════
--  Migration : bâtiments (à exécuter sur un DB existant)
-- ══════════════════════════════════════════════════════════════

-- 1. Créer la table batiments
create table if not exists public.batiments (
  id         uuid primary key default gen_random_uuid(),
  societe_id uuid references public.societes(id) on delete cascade not null,
  name       text not null,
  created_at timestamptz default now()
);
alter table public.batiments enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'batiments'
      and policyname = 'batiments: full access'
  ) then
    create policy "batiments: full access"
      on public.batiments to authenticated using (true) with check (true);
  end if;
end $$;
grant select, insert, update, delete on public.batiments to authenticated;

-- 2. Ajouter batiment_id sur biens
alter table public.biens
  add column if not exists batiment_id uuid references public.batiments(id) on delete set null;

-- 3. Migrer precomptes : ajouter batiment_id, rendre bien_id nullable
alter table public.precomptes
  add column if not exists batiment_id uuid references public.batiments(id) on delete cascade,
  alter column bien_id drop not null;

-- 5. Migrer assurances : ajouter batiment_id, rendre bien_id nullable
alter table public.assurances
  add column if not exists batiment_id uuid references public.batiments(id) on delete cascade,
  alter column bien_id drop not null;
alter table public.assurances
  add constraint if not exists assurances_bien_or_bat
  check ((bien_id is null) != (batiment_id is null));

-- 4. Supprimer l'ancienne contrainte unique et ajouter les nouvelles partielles
alter table public.precomptes
  drop constraint if exists precomptes_bien_id_annee_key;
alter table public.precomptes
  add constraint if not exists precomptes_bien_or_bat
  check ((bien_id is null) != (batiment_id is null));
create unique index if not exists precomptes_bien_annee_uidx
  on public.precomptes(bien_id, annee) where bien_id is not null;
create unique index if not exists precomptes_bat_annee_uidx
  on public.precomptes(batiment_id, annee) where batiment_id is not null;

-- ── Pense-bête ────────────────────────────────────────────────
-- Notes rapides / post-its virtuels, optionnellement liés à une société/bien
create table public.pense_betes (
  id         uuid primary key default gen_random_uuid(),
  content    text not null,
  color      text not null default 'yellow' check (color in ('yellow','pink','mint','sky','lavender')),
  societe_id uuid references public.societes(id) on delete set null,
  bien_id    uuid references public.biens(id) on delete set null,
  active     boolean not null default true,
  created_at timestamptz default now()
);
alter table public.pense_betes enable row level security;
create policy "pense_betes: full access" on public.pense_betes to authenticated using (true) with check (true);
grant select, insert, update, delete on public.pense_betes to authenticated;
