-- A floor belongs to one office. The session ticket checks membership through this row.
-- Existing offices receive one floor named for the office.

create table floors (
  id uuid primary key default uuidv7(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index floors_workspace_id_idx on floors (workspace_id);

insert into floors (workspace_id, name)
select id, office_name from workspaces;

grant select, insert on floors to ajar_app;

alter table floors enable row level security;
alter table floors force row level security;

create policy floors_select on floors for select
  using (app_can_see_workspace(workspace_id));

create policy floors_insert on floors for insert
  with check (app_is_manager(workspace_id));
