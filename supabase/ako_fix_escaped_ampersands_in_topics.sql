-- supabase/ako_fix_escaped_ampersands_in_topics.sql
-- Topic names were seeded HTML-escaped ("Writing &amp; Books"); React and React
-- Native print text literally, so the entity showed on screen. Store plain text.
update public.categories
   set name = replace(name, '&amp;', '&')
 where name like '%&amp;%';

update public.categories
   set description = replace(description, '&amp;', '&')
 where description like '%&amp;%';

update public.interests
   set name = replace(name, '&amp;', '&')
 where name like '%&amp;%';
