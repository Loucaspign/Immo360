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


-- ── Biens ─────────────────────────────────────────────────────
create table public.biens (
  id          uuid primary key default gen_random_uuid(),
  societe_id  uuid references public.societes(id) on delete cascade not null,
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


-- ── Migration : assignation de tâche ─────────────────────────
-- À exécuter dans l'éditeur SQL Supabase si la table existe déjà
alter table public.taches
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null;


-- ══════════════════════════════════════════════════════════════
--  Données de départ — à adapter avec les vrais UUIDs des comptes
--  Créer d'abord les 3 comptes via Supabase Dashboard → Authentication
--  Puis récupérer leurs UUIDs et remplacer les valeurs ci-dessous
-- ══════════════════════════════════════════════════════════════

-- Mise à jour des profils (après création des comptes auth)
-- update public.profiles set name='Loucas', initials='L', color_css='var(--uL)' where id='UUID-LOUCAS';
-- update public.profiles set name='Père',   initials='P', color_css='var(--uP)' where id='UUID-PERE';
-- update public.profiles set name='Frère',  initials='F', color_css='var(--uF)' where id='UUID-FRERE';
