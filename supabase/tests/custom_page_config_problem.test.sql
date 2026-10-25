-- supabase/tests/custom_page_config_problem.test.sql
-- Behavioural test for custom_page_config_problem(), the validator every Custom Page write goes through.
-- Pure and read-only: it calls the function with fixed inputs and touches no table, so it is safe to run on any
-- environment (paste into the SQL editor). It raises on the first failing case and ends with a NOTICE when all pass.
do $$
declare
  own_id uuid := '11111111-1111-1111-1111-111111111111';
  other_id uuid := '22222222-2222-2222-2222-222222222222';
  n int := 0;
begin
  -- Each case: a label, the config, whether to check as publish (strict) or draft, and the message it must contain (null = valid).
  create temp table if not exists _cp_cases (label text, cfg jsonb, is_strict boolean, want text) on commit drop;
  truncate _cp_cases;

  insert into _cp_cases values
    ('empty object is valid',               '{}',                                                                      true,  null),
    ('non-object rejected',                 '[]',                                                                      true,  'Invalid page content'),
    ('name too long',                       jsonb_build_object('identity', jsonb_build_object('name', repeat('a', 81))), false, 'Page name'),
    ('tagline too long',                    jsonb_build_object('identity', jsonb_build_object('tagline', repeat('a', 141))), false, 'Tagline'),
    ('intro too long',                      jsonb_build_object('identity', jsonb_build_object('intro', repeat('a', 1501))), false, 'page message'),
    ('bad hex colour',                      '{"brand":{"primary":"red"}}',                                             false, 'hex'),
    ('good hex colours',                    '{"brand":{"primary":"#3D5A45","secondary":"#F7F4EF","accent":"#B8862E"}}', true,  null),
    ('half-typed email ok in draft',        '{"contact":{"email":"ab@"}}',                                             false, null),
    ('half-typed email blocked on publish', '{"contact":{"email":"ab@"}}',                                             true,  'valid contact email'),
    ('good phone on publish',               '{"contact":{"phone":"+234 801 234 5678"}}',                               true,  null),
    ('bad phone on publish',                '{"contact":{"phone":"call me"}}',                                         true,  'valid contact phone'),
    ('design slug accepts new ids',         '{"design":{"style":"organic","template":"poster","animation":"bounce"}}', true,  null),
    ('design slug rejects junk',            '{"design":{"style":"Bad Style!"}}',                                       false, 'Invalid design'),
    ('icon path from another owner',        jsonb_build_object('identity', jsonb_build_object('icon_path', other_id || '/p/a.png')), false, 'not valid'),
    ('icon path with traversal',            jsonb_build_object('identity', jsonb_build_object('icon_path', own_id || '/../x.png')), false, 'not valid'),
    ('own icon path ok',                    jsonb_build_object('identity', jsonb_build_object('icon_path', own_id || '/p/a.png')), true,  null),
    ('share image from another owner',      jsonb_build_object('seo', jsonb_build_object('share_image_path', other_id || '/p/a.png')), false, 'not valid'),
    ('nine hero images',                    jsonb_build_object('brand', jsonb_build_object('hero', (select jsonb_agg(jsonb_build_object('path', own_id || '/p/' || i || '.png')) from generate_series(1, 9) i))), false, 'up to 8'),
    ('hero from another owner',             jsonb_build_object('brand', jsonb_build_object('hero', jsonb_build_array(jsonb_build_object('path', other_id || '/p/a.png')))), false, 'hero image'),
    ('25 gallery images',                   jsonb_build_object('gallery', (select jsonb_agg(jsonb_build_object('path', own_id || '/p/' || i || '.png')) from generate_series(1, 25) i)), false, 'up to 24'),
    ('seven buttons',                       jsonb_build_object('ctas', (select jsonb_agg(jsonb_build_object('id', 'b' || i, 'label', 'x', 'action', 'inquiry')) from generate_series(1, 7) i)), false, 'up to 6'),
    ('duplicate button ids',                '{"ctas":[{"id":"a","label":"x","action":"inquiry"},{"id":"a","label":"y","action":"inquiry"}]}', false, 'share an id'),
    ('unknown button action',               '{"ctas":[{"id":"a","label":"x","action":"eval"}]}',                       false, 'unknown action'),
    ('empty label ok in draft',             '{"ctas":[{"id":"a","label":"","action":"inquiry"}]}',                     false, null),
    ('empty label blocked on publish',      '{"ctas":[{"id":"a","label":"","action":"inquiry"}]}',                     true,  'needs a label'),
    ('javascript: url blocked on publish',  '{"ctas":[{"id":"a","label":"x","action":"url","url":"javascript:alert(1)"}]}', true, 'web address'),
    ('https url ok on publish',             '{"ctas":[{"id":"a","label":"x","action":"url","url":"https://example.com/a"}]}', true, null),
    ('protocol-relative ako link blocked',  '{"ctas":[{"id":"a","label":"x","action":"ako","url":"//evil.com"}]}',     true,  'Akọ link'),
    ('internal ako link ok',                '{"ctas":[{"id":"a","label":"x","action":"ako","url":"/my-project"}]}',    true,  null),
    ('download without file blocked',       '{"ctas":[{"id":"a","label":"x","action":"download"}]}',                   true,  'uploaded file'),
    ('download file of another owner',      jsonb_build_object('ctas', jsonb_build_array(jsonb_build_object('id','a','label','x','action','download','file_path', other_id || '/p/f.pdf'))), false, 'not valid'),
    ('email button needs contact email',    '{"ctas":[{"id":"a","label":"x","action":"email"}]}',                      true,  'contact email'),
    ('call button needs contact phone',     '{"ctas":[{"id":"a","label":"x","action":"call"}]}',                       true,  'contact phone'),
    ('oversized config',                    jsonb_build_object('identity', jsonb_build_object('intro', repeat('a', 1500)), 'junk', repeat('x', 61000)), false, 'too much content');

  declare r record; got text;
  begin
    for r in select * from _cp_cases loop
      got := public.custom_page_config_problem(r.cfg, own_id, r.is_strict);
      n := n + 1;
      if r.want is null and got is not null then
        raise exception 'FAIL "%": expected valid, got "%"', r.label, got;
      elsif r.want is not null and (got is null or position(lower(r.want) in lower(got)) = 0) then
        raise exception 'FAIL "%": expected a message containing "%", got "%"', r.label, r.want, coalesce(got, '<valid>');
      end if;
    end loop;
  end;

  raise notice 'custom_page_config_problem: % cases passed', n;
end $$;
