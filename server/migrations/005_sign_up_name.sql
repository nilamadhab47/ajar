-- A password sign-up remembers the name until the person confirms the email.

alter table magic_links add column display_name text;
