-- supabase/tests/custom_page_preset_problem.test.sql
-- Behavioural test for custom_page_preset_problem(), the validator behind saving a Design preset.
-- Pure and read-only: it calls the function with fixed inputs and touches no table, so it is safe on any environment
-- (paste into the SQL editor). Raises on the first failing case and ends with a NOTICE when all pass.
do $$
declare
  r record;
  got text;
  n int := 0;
begin
  create temp table if not exists _preset_cases (label text, design jsonb, want text) on commit drop;
  truncate _preset_cases;

  insert into _preset_cases values
    ('empty object is valid',            '{}',                                                                                     null),
    ('full design is valid',             '{"style":"midnight","template":"poster","animation":"fade","share":{"enabled":true,"look":"pill","position":"bottom-left"}}', null),
    ('design without share is valid',    '{"style":"organic","template":"bento","animation":"none"}',                              null),
    ('share switched off is valid',      '{"style":"glass","share":{"enabled":false}}',                                            null),
    ('not an object',                    '[]',                                                                                     'Invalid preset'),
    ('a string',                         '"midnight"',                                                                             'Invalid preset'),
    ('unknown key rejected',             '{"style":"glass","brand":{"primary":"#000000"}}',                                        'Invalid preset'),
    ('colours cannot sneak in',          '{"primary":"#FFFFFF"}',                                                                  'Invalid preset'),
    ('style junk',                       '{"style":"Bad Style!"}',                                                                 'Invalid design'),
    ('style too long',                   jsonb_build_object('style', repeat('a', 25)),                                             'Invalid design'),
    ('style not a string',               '{"style":5}',                                                                            'Invalid design'),
    ('template null literal',            '{"template":null}',                                                                      'Invalid design'),
    ('share not an object',              '{"share":true}',                                                                         'share button'),
    ('share unknown key',                '{"share":{"enabled":true,"colour":"red"}}',                                              'share button'),
    ('share enabled not boolean',        '{"share":{"enabled":"yes"}}',                                                            'share button'),
    ('share bad look',                   '{"share":{"look":"neon"}}',                                                              'share button'),
    ('share bad position',               '{"share":{"position":"middle"}}',                                                        'share button'),
    ('share look not a string',          '{"share":{"look":1}}',                                                                   'share button');

  for r in select * from _preset_cases loop
    got := public.custom_page_preset_problem(r.design);
    n := n + 1;
    if r.want is null and got is not null then
      raise exception 'FAIL "%": expected valid, got "%"', r.label, got;
    elsif r.want is not null and (got is null or position(r.want in got) = 0) then
      raise exception 'FAIL "%": expected a message containing "%", got "%"', r.label, r.want, coalesce(got, 'NULL (valid)');
    end if;
  end loop;

  raise notice 'custom_page_preset_problem: all % cases passed', n;
end
$$;
