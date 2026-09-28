begin;

create extension if not exists pgtap
    with schema extensions;

select plan(14);


/* -------------------------------------------------------------------------
 * Seed catalogue size and criterion distribution
 * ------------------------------------------------------------------------- */

select is(
    (
        select count(*)
        from public.achievements
        where code in (
            'first_preparedness_step',
            'preparedness_starter',
            'scenario_learner',
            'preparedness_100',
            'first_aid_mission_complete',
            'local_hazards_mission_complete'
        )
    ),
    6::bigint,
    'the V1 preparedness achievement catalogue contains exactly 6 seeded definitions'
);


select is(
    (
        select count(*)
        from public.achievements
        where code in (
            'first_preparedness_step',
            'preparedness_starter',
            'scenario_learner',
            'preparedness_100',
            'first_aid_mission_complete',
            'local_hazards_mission_complete'
        )
          and is_active
    ),
    6::bigint,
    'all 6 seeded preparedness achievements are active'
);


select results_eq(
    $$
        select
            criterion_type,
            count(*)::bigint
        from public.achievements
        where code in (
            'first_preparedness_step',
            'preparedness_starter',
            'scenario_learner',
            'preparedness_100',
            'first_aid_mission_complete',
            'local_hazards_mission_complete'
        )
        group by criterion_type
        order by criterion_type
    $$,
    $$
        values
            ('mission_completed'::text, 2::bigint),
            ('preparedness_points'::text, 1::bigint),
            ('quiz_questions_correct'::text, 1::bigint),
            ('tasks_completed'::text, 2::bigint)
    $$,
    'the six achievements use the intended criterion distribution'
);


/* -------------------------------------------------------------------------
 * Exact aggregate milestone definitions
 * ------------------------------------------------------------------------- */

select results_eq(
    $$
        select
            code,
            criterion_type,
            threshold,
            target_mission_id is null,
            sort_order
        from public.achievements
        where code in (
            'first_preparedness_step',
            'preparedness_starter',
            'scenario_learner',
            'preparedness_100'
        )
        order by sort_order
    $$,
    $$
        values
            ('first_preparedness_step'::text, 'tasks_completed'::text, 1::smallint, true, 10::smallint),
            ('preparedness_starter'::text, 'tasks_completed'::text, 5::smallint, true, 20::smallint),
            ('scenario_learner'::text, 'quiz_questions_correct'::text, 1::smallint, true, 30::smallint),
            ('preparedness_100'::text, 'preparedness_points'::text, 100::smallint, true, 40::smallint)
    $$,
    'aggregate preparedness achievements retain the intended thresholds and no mission target'
);


/* -------------------------------------------------------------------------
 * Mission-specific milestone definitions
 * ------------------------------------------------------------------------- */

select results_eq(
    $$
        select
            achievement.code,
            achievement.criterion_type,
            achievement.threshold,
            mission.code,
            achievement.sort_order
        from public.achievements as achievement
        join public.preparedness_missions as mission
            on mission.id = achievement.target_mission_id
        where achievement.code in (
            'first_aid_mission_complete',
            'local_hazards_mission_complete'
        )
        order by achievement.sort_order
    $$,
    $$
        values
            ('first_aid_mission_complete'::text, 'mission_completed'::text, 1::smallint, 'prepare_first_aid_kit'::text, 50::smallint),
            ('local_hazards_mission_complete'::text, 'mission_completed'::text, 1::smallint, 'know_your_local_hazards'::text, 60::smallint)
    $$,
    'mission-completion achievements target the intended First Aid and Local Hazards missions'
);


select is(
    (
        select count(*)
        from public.achievements as achievement
        join public.preparedness_missions as mission
            on mission.id = achievement.target_mission_id
        where achievement.code in (
            'first_aid_mission_complete',
            'local_hazards_mission_complete'
        )
          and mission.is_active
    ),
    2::bigint,
    'both mission-completion achievements target active missions'
);


/* -------------------------------------------------------------------------
 * Bilingual catalogue quality
 * ------------------------------------------------------------------------- */

select is(
    (
        select count(*)
        from public.achievements
        where code in (
            'first_preparedness_step',
            'preparedness_starter',
            'scenario_learner',
            'preparedness_100',
            'first_aid_mission_complete',
            'local_hazards_mission_complete'
        )
          and char_length(btrim(title_en)) > 0
          and char_length(btrim(title_ar)) > 0
    ),
    6::bigint,
    'all seeded achievements have non-empty English and Arabic titles'
);


select is(
    (
        select count(*)
        from public.achievements
        where code in (
            'first_preparedness_step',
            'preparedness_starter',
            'scenario_learner',
            'preparedness_100',
            'first_aid_mission_complete',
            'local_hazards_mission_complete'
        )
          and char_length(btrim(description_en)) > 0
          and char_length(btrim(description_ar)) > 0
    ),
    6::bigint,
    'all seeded achievements have non-empty English and Arabic descriptions'
);


/* -------------------------------------------------------------------------
 * Safety framing / catalogue semantics
 * ------------------------------------------------------------------------- */

select is(
    (
        select count(*)
        from public.achievements
        where code = 'preparedness_100'
          and title_en = '100 Preparedness Points'
          and criterion_type = 'preparedness_points'
          and threshold = 100
    ),
    1::bigint,
    'the 100-point badge is framed as preparedness points rather than a safety certification'
);


select is(
    (
        select count(*)
        from public.achievements
        where code = 'scenario_learner'
          and title_en = 'Preparedness Learner'
          and criterion_type = 'quiz_questions_correct'
          and threshold = 1
    ),
    1::bigint,
    'the quiz milestone uses the final Preparedness Learner user-facing title'
);


/* -------------------------------------------------------------------------
 * Client visibility and immutability
 * ------------------------------------------------------------------------- */

set local role anon;

select is(
    (
        select count(*)
        from public.achievements
        where code in (
            'first_preparedness_step',
            'preparedness_starter',
            'scenario_learner',
            'preparedness_100',
            'first_aid_mission_complete',
            'local_hazards_mission_complete'
        )
    ),
    6::bigint,
    'guest users can read all 6 public achievement definitions'
);

select ok(
    not has_table_privilege('anon', 'public.achievements', 'INSERT')
    and not has_table_privilege('anon', 'public.achievements', 'UPDATE')
    and not has_table_privilege('anon', 'public.achievements', 'DELETE'),
    'guest users cannot modify achievement definitions'
);

reset role;


set local role authenticated;

select is(
    (
        select count(*)
        from public.achievements
        where code in (
            'first_preparedness_step',
            'preparedness_starter',
            'scenario_learner',
            'preparedness_100',
            'first_aid_mission_complete',
            'local_hazards_mission_complete'
        )
    ),
    6::bigint,
    'authenticated users can read all 6 public achievement definitions'
);

select ok(
    not has_table_privilege('authenticated', 'public.achievements', 'INSERT')
    and not has_table_privilege('authenticated', 'public.achievements', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.achievements', 'DELETE'),
    'authenticated users cannot modify achievement definitions'
);

reset role;


select * from finish();

rollback;
