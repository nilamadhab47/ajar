-- An owner can rename an area and leave one line on an area, a room, or a desk.
-- The map itself stays where it is.

create table office_places (
  workspace_id uuid not null references workspaces (id) on delete cascade,
  kind text not null check (kind in ('area', 'room', 'desk')),
  place_id text not null,
  name text,
  note text,
  primary key (workspace_id, kind, place_id),
  check (name is not null or note is not null)
);

grant select, insert, update, delete on office_places to ajar_app;

alter table office_places enable row level security;
alter table office_places force row level security;

create policy office_places_select on office_places for select
  using (app_can_see_workspace(workspace_id));

create policy office_places_insert on office_places for insert
  with check (
    app_member_role(workspace_id) = 'owner'
    and (app_workspace_id() is null or app_workspace_id() = workspace_id)
  );

create policy office_places_update on office_places for update
  using (
    app_member_role(workspace_id) = 'owner'
    and (app_workspace_id() is null or app_workspace_id() = workspace_id)
  )
  with check (
    app_member_role(workspace_id) = 'owner'
    and (app_workspace_id() is null or app_workspace_id() = workspace_id)
  );

create policy office_places_delete on office_places for delete
  using (
    app_member_role(workspace_id) = 'owner'
    and (app_workspace_id() is null or app_workspace_id() = workspace_id)
  );
