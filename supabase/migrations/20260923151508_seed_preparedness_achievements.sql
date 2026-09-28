/*
 * Seed the final V1 Ihtiyat preparedness achievement catalogue.
 *
 * Achievements are private progress milestones. They do not certify that a
 * user or household is safe or fully prepared for a real emergency.
 *
 * This migration seeds six bilingual definitions across the four supported
 * achievement criteria:
 *   - completed task count;
 *   - verified correct quiz-question count;
 *   - preparedness points;
 *   - completion of a specific preparedness mission.
*/

begin;


/* -------------------------------------------------------------------------
 * 1. CONTROLLED ACHIEVEMENT MANIFEST
 * ------------------------------------------------------------------------- 
*/

create temporary table seed_preparedness_achievements (
    code text primary key,
    title_en text not null,
    title_ar text not null,
    description_en text not null,
    description_ar text not null,
    criterion_type text not null,
    threshold smallint not null,
    target_mission_code text,
    sort_order smallint not null,
    is_active boolean not null,

    constraint seed_preparedness_achievements_code_format
        check (
            code ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
        ),

    constraint seed_preparedness_achievements_criterion_valid
        check (
            criterion_type in (
                'tasks_completed',
                'quiz_questions_correct',
                'preparedness_points',
                'mission_completed'
            )
        ),

    constraint seed_preparedness_achievements_threshold_positive
        check (
            threshold > 0
        ),

    constraint seed_preparedness_achievements_target_consistent
        check (
            (
                criterion_type = 'mission_completed'
                and target_mission_code is not null
                and threshold = 1
            )
            or
            (
                criterion_type <> 'mission_completed'
                and target_mission_code is null
            )
        ),

    constraint seed_preparedness_achievements_target_code_format
        check (
            target_mission_code is null
            or target_mission_code ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
        ),

    constraint seed_preparedness_achievements_sort_order_non_negative
        check (
            sort_order >= 0
        ),

    constraint seed_preparedness_achievements_sort_order_unique
        unique (sort_order)
) on commit drop;


insert into seed_preparedness_achievements (
    code,
    title_en,
    title_ar,
    description_en,
    description_ar,
    criterion_type,
    threshold,
    target_mission_code,
    sort_order,
    is_active
)
values
    (
        'first_preparedness_step',
        'First Preparedness Step',
        'الخطوة الأولى للاستعداد',
        'Complete your first preparedness task.',
        'أكمل أول مهمة من مهام الاستعداد.',
        'tasks_completed',
        1,
        null,
        10,
        true
    ),
    (
        'preparedness_starter',
        'Preparedness Starter',
        'بداية الاستعداد',
        'Complete five preparedness tasks.',
        'أكمل خمس مهام من مهام الاستعداد.',
        'tasks_completed',
        5,
        null,
        20,
        true
    ),
    (
        'scenario_learner',
        'Preparedness Learner',
        'متعلّم الاستعداد',
        'Answer your first preparedness quiz question correctly.',
        'أجب بشكل صحيح عن أول سؤال في اختبار الاستعداد.',
        'quiz_questions_correct',
        1,
        null,
        30,
        true
    ),
    (
        'preparedness_100',
        '100 Preparedness Points',
        '100 نقطة استعداد',
        'Earn 100 preparedness points by completing mission tasks.',
        'اكسب 100 نقطة استعداد من خلال إكمال مهام الاستعداد.',
        'preparedness_points',
        100,
        null,
        40,
        true
    ),
    (
        'first_aid_mission_complete',
        'First Aid Mission Complete',
        'إكمال مهمة الإسعافات الأولية',
        'Complete all tasks in the Prepare a First Aid Kit mission.',
        'أكمل جميع مهام «جهّز حقيبة إسعافات أولية».',
        'mission_completed',
        1,
        'prepare_first_aid_kit',
        50,
        true
    ),
    (
        'local_hazards_mission_complete',
        'Local Hazards Mission Complete',
        'إكمال مهمة المخاطر المحلية',
        'Complete the hazard-learning tasks shown for your selected location in the Know Your Local Hazards mission.',
        'أكمل مهام التعرّف على المخاطر المعروضة لموقعك المحدد ضمن مهمة «تعرّف على المخاطر المحلية في منطقتك».',
        'mission_completed',
        1,
        'know_your_local_hazards',
        60,
        true
    );


/* -------------------------------------------------------------------------
 * 2. MANIFEST VALIDATION
 * ------------------------------------------------------------------------- */

do $$
begin
    if (
        select count(*)
        from seed_preparedness_achievements
    ) <> 6 then
        raise exception
            'Preparedness achievement manifest must contain exactly 6 rows';
    end if;

    if (
        select count(*)
        from seed_preparedness_achievements
        where criterion_type = 'tasks_completed'
    ) <> 2 then
        raise exception
            'V1 achievement manifest must contain exactly 2 task-count milestones';
    end if;

    if (
        select count(*)
        from seed_preparedness_achievements
        where criterion_type = 'quiz_questions_correct'
    ) <> 1 then
        raise exception
            'V1 achievement manifest must contain exactly 1 quiz milestone';
    end if;

    if (
        select count(*)
        from seed_preparedness_achievements
        where criterion_type = 'preparedness_points'
    ) <> 1 then
        raise exception
            'V1 achievement manifest must contain exactly 1 preparedness-points milestone';
    end if;

    if (
        select count(*)
        from seed_preparedness_achievements
        where criterion_type = 'mission_completed'
    ) <> 2 then
        raise exception
            'V1 achievement manifest must contain exactly 2 mission-completion milestones';
    end if;

    if exists (
        select 1
        from seed_preparedness_achievements as achievement
        left join public.preparedness_missions as mission
            on mission.code = achievement.target_mission_code
        where achievement.target_mission_code is not null
          and (
              mission.id is null
              or not mission.is_active
          )
    ) then
        raise exception
            'Preparedness achievement seed references a missing or inactive target mission';
    end if;

    if (
        select count(*)
        from seed_preparedness_achievements
        where target_mission_code in (
            'prepare_first_aid_kit',
            'know_your_local_hazards'
        )
    ) <> 2 then
        raise exception
            'V1 mission-completion achievements must target First Aid and Local Hazards';
    end if;

    if not exists (
        select 1
        from seed_preparedness_achievements
        where code = 'first_preparedness_step'
          and criterion_type = 'tasks_completed'
          and threshold = 1
          and target_mission_code is null
    ) then
        raise exception
            'First Preparedness Step definition is invalid';
    end if;

    if not exists (
        select 1
        from seed_preparedness_achievements
        where code = 'preparedness_starter'
          and criterion_type = 'tasks_completed'
          and threshold = 5
          and target_mission_code is null
    ) then
        raise exception
            'Preparedness Starter definition is invalid';
    end if;

    if not exists (
        select 1
        from seed_preparedness_achievements
        where code = 'scenario_learner'
          and criterion_type = 'quiz_questions_correct'
          and threshold = 1
          and target_mission_code is null
    ) then
        raise exception
            'Preparedness Learner definition is invalid';
    end if;

    if not exists (
        select 1
        from seed_preparedness_achievements
        where code = 'preparedness_100'
          and criterion_type = 'preparedness_points'
          and threshold = 100
          and target_mission_code is null
    ) then
        raise exception
            '100 Preparedness Points definition is invalid';
    end if;
end;
$$;


/* -------------------------------------------------------------------------
 * 3. INSERT CANONICAL ACHIEVEMENT DEFINITIONS
 * ------------------------------------------------------------------------- */

insert into public.achievements (
    code,
    title_en,
    title_ar,
    description_en,
    description_ar,
    criterion_type,
    threshold,
    target_mission_id,
    sort_order,
    is_active
)
select
    achievement.code,
    achievement.title_en,
    achievement.title_ar,
    achievement.description_en,
    achievement.description_ar,
    achievement.criterion_type,
    achievement.threshold,
    mission.id,
    achievement.sort_order,
    achievement.is_active
from seed_preparedness_achievements as achievement
left join public.preparedness_missions as mission
    on mission.code = achievement.target_mission_code
order by achievement.sort_order;


/* -------------------------------------------------------------------------
 * 4. FINAL CATALOGUE GUARD
 * ------------------------------------------------------------------------- */

do $$
begin
    if (
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
    ) <> 6 then
        raise exception
            'Preparedness achievement seed did not produce all 6 V1 definitions';
    end if;

    if (
        select count(*)
        from public.achievements as achievement
        join seed_preparedness_achievements as seed
            on seed.code = achievement.code
        left join public.preparedness_missions as mission
            on mission.id = achievement.target_mission_id
        where achievement.title_en = seed.title_en
          and achievement.title_ar = seed.title_ar
          and achievement.description_en = seed.description_en
          and achievement.description_ar = seed.description_ar
          and achievement.criterion_type = seed.criterion_type
          and achievement.threshold = seed.threshold
          and achievement.sort_order = seed.sort_order
          and achievement.is_active = seed.is_active
          and (
              (
                  seed.target_mission_code is null
                  and achievement.target_mission_id is null
              )
              or mission.code = seed.target_mission_code
          )
    ) <> 6 then
        raise exception
            'Preparedness achievement seed does not match the controlled V1 manifest';
    end if;

    if exists (
        select 1
        from public.achievements
        where code in (
            'first_preparedness_step',
            'preparedness_starter',
            'scenario_learner',
            'preparedness_100'
        )
          and target_mission_id is not null
    ) then
        raise exception
            'Aggregate V1 achievements must not carry target missions';
    end if;

    if (
        select count(*)
        from public.achievements as achievement
        join public.preparedness_missions as mission
            on mission.id = achievement.target_mission_id
        where (
            achievement.code = 'first_aid_mission_complete'
            and mission.code = 'prepare_first_aid_kit'
        )
        or (
            achievement.code = 'local_hazards_mission_complete'
            and mission.code = 'know_your_local_hazards'
        )
    ) <> 2 then
        raise exception
            'Mission-completion achievements do not target the intended missions';
    end if;
end;
$$;


commit;
