-- A password is optional. Magic-link accounts leave it empty.
-- A sign-up link may carry a hash until the person confirms the email.

alter table users add column password_hash text;

alter table magic_links add column password_hash text;
