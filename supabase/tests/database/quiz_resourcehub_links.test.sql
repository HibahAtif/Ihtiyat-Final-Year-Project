begin;

create extension if not exists pgtap
    with schema extensions;

select plan(13);


/* -------------------------------------------------------------------------
 * Seeded quiz -> Resource Hub relationship counts
 * ------------------------------------------------------------------------- */

select is(
    (
        select count(*)
        from public.quiz_question_resources
    ),
    9::bigint,
    'the V1 quiz catalogue contains exactly 9 Resource Hub relationships'
);


select is(
    (
        select count(*)
        from public.quiz_question_resources
        where link_role = 'primary'
    ),
    9::bigint,
    'all 9 seeded quiz-resource relationships are primary'
);


select is(
    (
        select count(*)
        from public.quiz_question_resources
        where link_role = 'supporting'
    ),
    0::bigint,
    'the V1 quiz-resource catalogue contains no supporting links'
);


select is(
    (
        select count(*)
        from (
            select
                question.id
            from public.quiz_questions as question
            join public.quiz_question_resources as link
                on link.question_id = question.id
            where question.code in (
                'quiz_first_aid_initial_response',
                'quiz_official_warning_authority',
                'quiz_ambulance_number',
                'quiz_moh_937',
                'quiz_flood_avoid_water',
                'quiz_heat_reduce_exposure',
                'quiz_dust_shelter',
                'quiz_earthquake_indoor_cover',
                'quiz_rockfall_mountain_road'
            )
            group by question.id
            having count(*) filter (
                where link.link_role = 'primary'
            ) = 1
        ) as questions_with_one_primary
    ),
    9::bigint,
    'each seeded V1 quiz question has exactly one primary Resource Hub article'
);


/* -------------------------------------------------------------------------
 * Exact canonical mappings
 * ------------------------------------------------------------------------- */

select results_eq(
    $$select
          question.code,
          resource.code,
          link.link_role,
          link.sort_order
      from public.quiz_question_resources as link
      join public.quiz_questions as question
        on question.id = link.question_id
      join public.safety_resources as resource
        on resource.id = link.resource_id
      where question.code in (
          'quiz_first_aid_initial_response',
          'quiz_official_warning_authority',
          'quiz_ambulance_number',
          'quiz_moh_937',
          'quiz_flood_avoid_water',
          'quiz_heat_reduce_exposure',
          'quiz_dust_shelter',
          'quiz_earthquake_indoor_cover',
          'quiz_rockfall_mountain_road'
      )
      order by question.code$$,
    $$values
        ('quiz_ambulance_number'::text, 'official_saudi_emergency_numbers'::text, 'primary'::text, 10::smallint),
        ('quiz_dust_shelter'::text, 'dust_sandstorm_safety'::text, 'primary'::text, 10::smallint),
        ('quiz_earthquake_indoor_cover'::text, 'earthquake_safety'::text, 'primary'::text, 10::smallint),
        ('quiz_first_aid_initial_response'::text, 'first_aid_kit_basics'::text, 'primary'::text, 10::smallint),
        ('quiz_flood_avoid_water'::text, 'flood_safety'::text, 'primary'::text, 10::smallint),
        ('quiz_heat_reduce_exposure'::text, 'extreme_heat_safety'::text, 'primary'::text, 10::smallint),
        ('quiz_moh_937'::text, 'official_saudi_emergency_numbers'::text, 'primary'::text, 10::smallint),
        ('quiz_official_warning_authority'::text, 'household_emergency_plan'::text, 'primary'::text, 10::smallint),
        ('quiz_rockfall_mountain_road'::text, 'landslide_rockfall_safety'::text, 'primary'::text, 10::smallint)$$,
    'all seeded quiz questions retain the intended canonical Resource Hub mapping'
);


select is(
    (
        select count(*)
        from public.quiz_question_resources as link
        join public.safety_resources as resource
            on resource.id = link.resource_id
        join public.quiz_questions as question
            on question.id = link.question_id
        where resource.code = 'official_saudi_emergency_numbers'
          and question.code in (
              'quiz_ambulance_number',
              'quiz_moh_937'
          )
    ),
    2::bigint,
    'both emergency-number questions reuse the same canonical reviewed emergency-number resource'
);


/* -------------------------------------------------------------------------
 * Hazard alignment
 * ------------------------------------------------------------------------- */

select is(
    (
        select count(*)
        from public.quiz_question_resources as link
        join public.quiz_questions as question
            on question.id = link.question_id
        where question.hazard_id is not null
          and link.link_role = 'primary'
    ),
    5::bigint,
    'exactly 5 hazard-linked quiz questions have primary Resource Hub relationships'
);


select is(
    (
        select count(*)
        from public.quiz_question_resources as link
        join public.quiz_questions as question
            on question.id = link.question_id
        where question.hazard_id is not null
          and link.link_role = 'primary'
          and not exists (
              select 1
              from public.resource_hazards as resource_hazard
              where resource_hazard.resource_id = link.resource_id
                and resource_hazard.hazard_id = question.hazard_id
          )
    ),
    0::bigint,
    'every hazard-linked quiz question points to a resource carrying the same canonical hazard'
);


select is(
    (
        select count(*)
        from public.quiz_question_resources as link
        join public.safety_resources as resource
            on resource.id = link.resource_id
        join public.resource_hazards as resource_hazard
            on resource_hazard.resource_id = resource.id
        join public.hazards as hazard
            on hazard.id = resource_hazard.hazard_id
        where hazard.code in (
            'cold_wave',
            'thunderstorm_lightning_strong_winds',
            'drought_water_scarcity',
            'wildfire_vegetation_fire'
        )
    ),
    0::bigint,
    'Resource-Hub-only V1 hazards are not incorrectly attached to seeded quiz questions'
);


/* -------------------------------------------------------------------------
 * Publication / active-content integrity
 * ------------------------------------------------------------------------- */

select is(
    (
        select count(*)
        from public.quiz_question_resources as link
        join public.quiz_questions as question
            on question.id = link.question_id
        join public.preparedness_missions as mission
            on mission.id = question.mission_id
        left join public.hazards as hazard
            on hazard.id = question.hazard_id
        join public.safety_resources as resource
            on resource.id = link.resource_id
        where not question.is_active
           or not mission.is_active
           or resource.publication_status <> 'published'
           or (
               question.hazard_id is not null
               and (
                   hazard.id is null
                   or not hazard.is_active
               )
           )
    ),
    0::bigint,
    'all seeded quiz-resource links reference active quiz content and published resources'
);


/* -------------------------------------------------------------------------
 * Public read policies
 * ------------------------------------------------------------------------- */

set local role anon;

select is(
    (
        select count(*)
        from public.quiz_question_resources
    ),
    9::bigint,
    'guest users can read all 9 active published quiz-resource relationships'
);

reset role;


set local role authenticated;

select is(
    (
        select count(*)
        from public.quiz_question_resources
    ),
    9::bigint,
    'authenticated users can read all 9 active published quiz-resource relationships'
);

reset role;


/* -------------------------------------------------------------------------
 * Relationship model remains independent from mission-task links
 * ------------------------------------------------------------------------- */

select ok(
    exists (
        select 1
        from public.quiz_question_resources as quiz_link
        join public.quiz_questions as question
            on question.id = quiz_link.question_id
        join public.safety_resources as resource
            on resource.id = quiz_link.resource_id
        where question.code = 'quiz_ambulance_number'
          and resource.code = 'official_saudi_emergency_numbers'
    )
    and exists (
        select 1
        from public.mission_task_resources as mission_link
        join public.mission_tasks as task
            on task.id = mission_link.task_id
        join public.safety_resources as resource
            on resource.id = mission_link.resource_id
        where task.code = 'communication_emergency_number'
          and resource.code = 'official_saudi_emergency_numbers'
    ),
    'the same canonical Resource Hub article can independently support both a mission task and a quiz question'
);


select * from finish();

rollback;
