begin;

create extension if not exists pgtap
    with schema extensions;

select plan(15);


/* -------------------------------------------------------------------------
 * Seeded V1 quiz catalogue counts and structure
 * ------------------------------------------------------------------------- */

select is(
    (
        select count(*)
        from public.quiz_questions
        where code in (
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
    ),
    9::bigint,
    'the V1 preparedness quiz contains exactly nine seeded questions'
);


select is(
    (
        select count(*)
        from public.quiz_options as option
        join public.quiz_questions as question
            on question.id = option.question_id
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
    ),
    36::bigint,
    'the V1 preparedness quiz contains exactly thirty-six seeded options'
);


select results_eq(
    $$select question_type, count(*)::bigint
      from public.quiz_questions
      where code in (
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
      group by question_type
      order by question_type$$,
    $$values
        ('multi_select'::text, 1::bigint),
        ('single_select'::text, 8::bigint)$$,
    'the V1 quiz contains eight single-select and one multi-select question'
);


select is(
    (
        select count(*)
        from (
            select
                question.id
            from public.quiz_questions as question
            join public.quiz_options as option
                on option.question_id = question.id
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
            having count(*) = 4
        ) as four_option_questions
    ),
    9::bigint,
    'every seeded V1 quiz question has exactly four options'
);


select is(
    (
        select count(*)
        from public.quiz_options as option
        join public.quiz_questions as question
            on question.id = option.question_id
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
          and option.is_correct
    ),
    10::bigint,
    'the nine seeded questions contain exactly ten correct option rows'
);


/* -------------------------------------------------------------------------
 * Mission and hazard scoping
 * ------------------------------------------------------------------------- */

select results_eq(
    $$select
          question.code,
          mission.code,
          coalesce(hazard.code, '')
      from public.quiz_questions as question
      join public.preparedness_missions as mission
        on mission.id = question.mission_id
      left join public.hazards as hazard
        on hazard.id = question.hazard_id
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
      order by mission.sort_order, question.sort_order$$,
    $$values
        ('quiz_first_aid_initial_response'::text, 'prepare_first_aid_kit'::text, ''::text),
        ('quiz_official_warning_authority'::text, 'household_communication_readiness'::text, ''::text),
        ('quiz_ambulance_number'::text, 'household_communication_readiness'::text, ''::text),
        ('quiz_moh_937'::text, 'household_communication_readiness'::text, ''::text),
        ('quiz_flood_avoid_water'::text, 'know_your_local_hazards'::text, 'heavy_rain_flash_flooding'::text),
        ('quiz_heat_reduce_exposure'::text, 'know_your_local_hazards'::text, 'extreme_heat_heatwave'::text),
        ('quiz_dust_shelter'::text, 'know_your_local_hazards'::text, 'dust_sandstorm'::text),
        ('quiz_earthquake_indoor_cover'::text, 'know_your_local_hazards'::text, 'earthquake'::text),
        ('quiz_rockfall_mountain_road'::text, 'know_your_local_hazards'::text, 'landslide_rockfall'::text)$$,
    'seeded quiz questions retain the intended mission and hazard relationships'
);


/* -------------------------------------------------------------------------
 * Bilingual reviewed content
 * ------------------------------------------------------------------------- */

select is(
    (
        select count(*)
        from public.quiz_questions
        where code in (
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
          and (
              char_length(btrim(prompt_en)) = 0
              or char_length(btrim(prompt_ar)) = 0
              or char_length(btrim(explanation_en)) = 0
              or char_length(btrim(explanation_ar)) = 0
          )
    ),
    0::bigint,
    'all seeded quiz questions contain non-empty English and Arabic prompts and explanations'
);


select is(
    (
        select count(*)
        from public.quiz_options as option
        join public.quiz_questions as question
            on question.id = option.question_id
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
          and (
              char_length(btrim(option.text_en)) = 0
              or char_length(btrim(option.text_ar)) = 0
          )
    ),
    0::bigint,
    'all seeded quiz options contain non-empty English and Arabic text'
);


/* -------------------------------------------------------------------------
 * Critical answer-key checks
 * ------------------------------------------------------------------------- */

select results_eq(
    $$select option.option_code
      from public.quiz_options as option
      join public.quiz_questions as question
        on question.id = option.question_id
      where question.code = 'quiz_first_aid_initial_response'
        and option.is_correct$$,
    $$values ('check_scene_safety'::text)$$,
    'the first-aid question correctly keys scene safety as the first check'
);


select results_eq(
    $$select option.text_en
      from public.quiz_options as option
      join public.quiz_questions as question
        on question.id = option.question_id
      where question.code = 'quiz_ambulance_number'
        and option.is_correct$$,
    $$values ('997'::text)$$,
    'the Saudi Red Crescent / ambulance question correctly keys 997'
);


select results_eq(
    $$select option.text_en
      from public.quiz_options as option
      join public.quiz_questions as question
        on question.id = option.question_id
      where question.code = 'quiz_moh_937'
        and option.is_correct$$,
    $$values ('937'::text)$$,
    'the Ministry of Health support question correctly keys 937'
);


select results_eq(
    $$select option.option_code
      from public.quiz_options as option
      join public.quiz_questions as question
        on question.id = option.question_id
      where question.code = 'quiz_official_warning_authority'
        and option.is_correct$$,
    $$values ('support_official_guidance'::text)$$,
    'the official-warning question keeps Ihtiyat subordinate to current official guidance'
);


select results_eq(
    $$select option.option_code
      from public.quiz_options as option
      join public.quiz_questions as question
        on question.id = option.question_id
      where question.code = 'quiz_flood_avoid_water'
        and option.is_correct
      order by option.sort_order$$,
    $$values
        ('avoid_valleys_and_floodwater'::text),
        ('avoid_wet_electrical_hazards'::text)$$,
    'the flood multi-select question has exactly the two intended correct actions'
);


/* -------------------------------------------------------------------------
 * Seeded catalogue works with the production quiz RPC
 * ------------------------------------------------------------------------- */

select ok(
    (
        select result.is_correct
        from public.submit_quiz_answer(
            (
                select id
                from public.quiz_questions
                where code = 'quiz_ambulance_number'
            ),
            array[
                (
                    select option.id
                    from public.quiz_options as option
                    join public.quiz_questions as question
                        on question.id = option.question_id
                    where question.code = 'quiz_ambulance_number'
                      and option.option_code = 'number_997'
                )
            ]::bigint[]
        ) as result
    ),
    'the production quiz RPC accepts the seeded correct ambulance-number answer'
);


select ok(
    (
        select result.is_correct
        from public.submit_quiz_answer(
            (
                select id
                from public.quiz_questions
                where code = 'quiz_flood_avoid_water'
            ),
            array[
                (
                    select option.id
                    from public.quiz_options as option
                    join public.quiz_questions as question
                        on question.id = option.question_id
                    where question.code = 'quiz_flood_avoid_water'
                      and option.option_code = 'avoid_valleys_and_floodwater'
                ),
                (
                    select option.id
                    from public.quiz_options as option
                    join public.quiz_questions as question
                        on question.id = option.question_id
                    where question.code = 'quiz_flood_avoid_water'
                      and option.option_code = 'avoid_wet_electrical_hazards'
                )
            ]::bigint[]
        ) as result
    ),
    'the production quiz RPC accepts the seeded two-answer flood selection'
);


select * from finish();

rollback;
