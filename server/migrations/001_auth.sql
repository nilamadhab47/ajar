-- Accounts, offices, and membership. Row security lands with ajar-s22.6.
-- IDs are UUIDv7. Postgres 16 has no built-in uuidv7(), so this function supplies it.

create extension if not exists pgcrypto;
create extension if not exists citext;

create or replace function uuidv7() returns uuid
language plpgsql
volatile
as $$
declare
  unix_ts_ms bytea;
  uuid_bytes bytea;
begin
  unix_ts_ms := substring(int8send((floor(extract(epoch from clock_timestamp()) * 1000))::bigint) from 3);
  uuid_bytes := unix_ts_ms || gen_random_bytes(10);
  uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
  uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
  return encode(uuid_bytes, 'hex')::uuid;
end
$$;

create table users (
  id uuid primary key default uuidv7(),
  email citext not null unique,
  display_name text not null,
  title text,
  avatar jsonb not null default '{}'::jsonb,
  status text not null default 'available',
  status_emoji text,
  door text not null default 'ask' check (door in ('open', 'ask', 'closed')),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default uuidv7(),
  user_id uuid not null references users (id) on delete cascade,
  refresh_token_hash text not null unique,
  family_id uuid not null,
  expires_at timestamptz not null,
  user_agent text,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index sessions_user_id_idx on sessions (user_id);

create table oauth_accounts (
  id uuid primary key default uuidv7(),
  user_id uuid not null references users (id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft')),
  provider_user_id text not null,
  created_at timestamptz not null default now(),
  unique (provider, provider_user_id)
);

create table magic_links (
  id uuid primary key default uuidv7(),
  email citext not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table organizations (
  id uuid primary key default uuidv7(),
  name text not null,
  plan text not null default 'trial',
  data_region text not null default 'ap-south-1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workspaces (
  id uuid primary key default uuidv7(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  office_name text not null,
  logo_url text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workspace_members (
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'guest')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table invites (
  id uuid primary key default uuidv7(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  email citext not null,
  role text not null check (role in ('owner', 'admin', 'member', 'guest')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  invited_by uuid not null references users (id),
  accepted_by uuid references users (id),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table audit_log (
  id uuid primary key default uuidv7(),
  workspace_id uuid references workspaces (id) on delete set null,
  actor_id uuid references users (id) on delete set null,
  action text not null,
  target text,
  meta jsonb,
  at timestamptz not null default now()
);

create index audit_log_workspace_at_idx on audit_log (workspace_id, at desc);
