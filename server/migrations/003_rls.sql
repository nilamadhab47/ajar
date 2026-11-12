-- Office rows are visible to ajar_app only through a membership.
-- The API user ajar is a superuser, so it bypasses policies. Office requests
-- set the local role to ajar_app, which does not.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'ajar_app') then
    create role ajar_app nologin nobypassrls;
  end if;
end $$;

grant ajar_app to ajar;
grant usage on schema public to ajar_app;
grant select, update on users to ajar_app;
grant select, insert on organizations, workspaces, audit_log to ajar_app;
grant select, insert, update, delete on workspace_members to ajar_app;
grant select, insert on invites to ajar_app;
grant update (accepted_at, accepted_by, expires_at) on invites to ajar_app;

create or replace function app_user_id() returns uuid
language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

create or replace function app_workspace_id() returns uuid
language sql stable as $$
  select nullif(current_setting('app.workspace_id', true), '')::uuid
$$;

create or replace function app_user_email() returns text
language sql stable security definer set search_path = public as $$
  select email::text from users where id = app_user_id()
$$;

create or replace function app_member_role(target_workspace uuid) returns text
language sql stable security definer set search_path = public as $$
  select role from workspace_members
  where workspace_id = target_workspace and user_id = app_user_id()
$$;

create or replace function app_workspace_has_member(target_workspace uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from workspace_members where workspace_id = target_workspace
  )
$$;

create or replace function app_can_see_workspace(target_workspace uuid) returns boolean
language sql stable as $$
  select app_member_role(target_workspace) is not null
    and (app_workspace_id() is null or app_workspace_id() = target_workspace)
$$;

create or replace function app_is_staff(target_workspace uuid) returns boolean
language sql stable as $$
  select app_member_role(target_workspace) in ('owner', 'admin', 'member')
    and (app_workspace_id() is null or app_workspace_id() = target_workspace)
$$;

create or replace function app_is_manager(target_workspace uuid) returns boolean
language sql stable as $$
  select app_member_role(target_workspace) in ('owner', 'admin')
    and (app_workspace_id() is null or app_workspace_id() = target_workspace)
$$;

revoke all on function app_user_id() from public;
revoke all on function app_workspace_id() from public;
revoke all on function app_user_email() from public;
revoke all on function app_member_role(uuid) from public;
revoke all on function app_workspace_has_member(uuid) from public;
revoke all on function app_can_see_workspace(uuid) from public;
revoke all on function app_is_staff(uuid) from public;
revoke all on function app_is_manager(uuid) from public;

grant execute on function app_user_id() to ajar_app;
grant execute on function app_workspace_id() to ajar_app;
grant execute on function app_user_email() to ajar_app;
grant execute on function app_member_role(uuid) to ajar_app;
grant execute on function app_workspace_has_member(uuid) to ajar_app;
grant execute on function app_can_see_workspace(uuid) to ajar_app;
grant execute on function app_is_staff(uuid) to ajar_app;
grant execute on function app_is_manager(uuid) to ajar_app;

alter table users enable row level security;
alter table users force row level security;
create policy users_select on users for select using (
  id = app_user_id()
  or exists (
    select 1 from workspace_members mine
    join workspace_members theirs on theirs.workspace_id = mine.workspace_id
    where mine.user_id = app_user_id()
      and theirs.user_id = users.id
      and (app_workspace_id() is null or mine.workspace_id = app_workspace_id())
  )
);
create policy users_update on users for update
  using (id = app_user_id())
  with check (id = app_user_id());

alter table organizations enable row level security;
alter table organizations force row level security;
create policy organizations_select on organizations for select using (
  exists (
    select 1 from workspaces w
    where w.organization_id = organizations.id
      and app_can_see_workspace(w.id)
  )
);
create policy organizations_insert on organizations for insert
  with check (app_user_id() is not null and app_workspace_id() is null);

alter table workspaces enable row level security;
alter table workspaces force row level security;
create policy workspaces_select on workspaces for select
  using (app_can_see_workspace(id));
create policy workspaces_insert on workspaces for insert
  with check (
    app_user_id() is not null
    and app_workspace_id() is null
    and not app_workspace_has_member(id)
  );

alter table workspace_members enable row level security;
alter table workspace_members force row level security;
create policy members_select on workspace_members for select
  using (app_can_see_workspace(workspace_id));
create policy members_insert on workspace_members for insert
  with check (
    user_id = app_user_id()
    and (
      (role = 'owner' and not app_workspace_has_member(workspace_id))
      or exists (
        select 1 from invites i
        where i.workspace_id = workspace_members.workspace_id
          and i.email = app_user_email()
          and i.role = workspace_members.role
          and i.accepted_at is null
          and i.expires_at > now()
      )
    )
  );
create policy members_update on workspace_members for update
  using (
    app_is_manager(workspace_id)
    and (app_member_role(workspace_id) = 'owner' or role <> 'owner')
  )
  with check (
    app_is_manager(workspace_id)
    and (app_member_role(workspace_id) = 'owner' or role <> 'owner')
  );
create policy members_delete on workspace_members for delete
  using (
    user_id = app_user_id()
    or (
      app_is_manager(workspace_id)
      and (app_member_role(workspace_id) = 'owner' or role <> 'owner')
    )
  );

alter table invites enable row level security;
alter table invites force row level security;
create policy invites_select on invites for select
  using (app_is_staff(workspace_id) or email = app_user_email());
create policy invites_insert on invites for insert
  with check (app_is_manager(workspace_id));
create policy invites_update on invites for update
  using (app_is_manager(workspace_id) or email = app_user_email())
  with check (app_is_manager(workspace_id) or email = app_user_email());

alter table audit_log enable row level security;
alter table audit_log force row level security;
create policy audit_select on audit_log for select
  using (workspace_id is not null and app_is_staff(workspace_id));
create policy audit_insert on audit_log for insert
  with check (workspace_id is not null and app_can_see_workspace(workspace_id));
