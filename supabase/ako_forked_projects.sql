-- ako_forked_projects.sql
--
-- Forked projects can be tagged in a post by the person who forked them. The post remembers the forker's
-- referral token so the tagged-project card links with ?ref=<token> and a sale through it is attributed to
-- the forker. Set server-side by create-post only (verified: caller holds an ACTIVE affiliate_relationship
-- on the tagged project); stays NULL when the poster owns the project.
alter table public.posts
  add column if not exists tagged_project_ref text;

comment on column public.posts.tagged_project_ref is
  'Referral token of the poster''s active affiliate fork of tagged_project_id, when the poster does not own the project. Set by create-post.';
