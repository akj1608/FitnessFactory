create extension if not exists pgcrypto;

create table if not exists users (
  id text primary key,
  email text unique,
  username text unique,
  password_hash text,
  auth_provider text not null default 'password',
  provider_subject text,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create unique index if not exists users_provider_subject_uidx
  on users (auth_provider, provider_subject)
  where provider_subject is not null;

create table if not exists profiles (
  user_id text primary key references users(id) on delete cascade,
  height_cm double precision,
  weight_kg double precision,
  age_years int,
  sex text,
  goal text,
  diet_style text,
  activity_level text,
  fasting_sugar double precision,
  hba1c double precision,
  alt double precision,
  ggt double precision,
  triglycerides double precision,
  notes text,
  onboarding_done boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists daily_logs (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  log_date date not null,
  water_glasses int not null default 0,
  fasting_sugar double precision,
  weight_kg double precision,
  walked boolean not null default false,
  strength boolean not null default false,
  diet_ok boolean not null default false,
  alcohol_free boolean not null default true,
  sugar_free boolean not null default true,
  sleep_ok boolean not null default false,
  notes text not null default '',
  unique (user_id, log_date)
);

create table if not exists coach_messages (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists coach_messages_user_created_idx
  on coach_messages (user_id, created_at desc);
