-- The company step stores a one-line office description, and the owner's
-- designation, department, and desk. Department is a label, not a role.

alter table workspaces add column description text;

alter table workspace_members add column title text;
alter table workspace_members add column department text;
alter table workspace_members add column desk_id text;

create unique index workspace_members_desk_idx
  on workspace_members (workspace_id, desk_id)
  where desk_id is not null;
