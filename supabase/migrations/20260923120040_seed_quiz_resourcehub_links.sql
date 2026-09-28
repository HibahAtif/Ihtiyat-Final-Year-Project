/*
 * Ihtiyat quiz-question to Resource Hub relationship seed.
 *
 * This migration links each seeded V1 preparedness quiz question to one
 * primary reviewed Resource Hub article.
 *
 * Quiz questions remain concise learning checks. The linked primary resource
 * provides fuller reviewed guidance and provenance without duplicating the
 * Resource Hub article body inside the quiz catalogue.
 */

begin;


/* -------------------------------------------------------------------------
 * 1. CONTROLLED QUIZ-RESOURCE MANIFEST
 * ------------------------------------------------------------------------- */

create temporary table seed_quiz_resource_links (
    question_code text not null,
    resource_code text not null,
    link_role text not null,
    sort_order smallint not null,

    primary key (
        question_code,
        resource_code
    ),

    constraint seed_quiz_resource_links_question_code_format
        check (
            question_code ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
        ),

    constraint seed_quiz_resource_links_resource_code_format
        check (
            resource_code ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
        ),

    constraint seed_quiz_resource_links_role_valid
        check (
            link_role in (
                'primary',
                'supporting'
            )
        ),

    constraint seed_quiz_resource_links_sort_order_non_negative
        check (
            sort_order >= 0
        ),

    constraint seed_quiz_resource_links_question_order_unique
        unique (
            question_code,
            sort_order
        )
) on commit drop;


insert into seed_quiz_resource_links (
    question_code,
    resource_code,
    link_role,
    sort_order
)
values
    (
        'quiz_first_aid_initial_response',
        'first_aid_kit_basics',
        'primary',
        10
    ),
    (
        'quiz_official_warning_authority',
        'household_emergency_plan',
        'primary',
        10
    ),
    (
        'quiz_ambulance_number',
        'official_saudi_emergency_numbers',
        'primary',
        10
    ),
    (
        'quiz_moh_937',
        'official_saudi_emergency_numbers',
        'primary',
        10
    ),
    (
        'quiz_flood_avoid_water',
        'flood_safety',
        'primary',
        10
    ),
    (
        'quiz_heat_reduce_exposure',
        'extreme_heat_safety',
        'primary',
        10
    ),
    (
        'quiz_dust_shelter',
        'dust_sandstorm_safety',
        'primary',
        10
    ),
    (
        'quiz_earthquake_indoor_cover',
        'earthquake_safety',
        'primary',
        10
    ),
    (
        'quiz_rockfall_mountain_road',
        'landslide_rockfall_safety',
        'primary',
        10
    );


/* -------------------------------------------------------------------------
 * 2. MANIFEST VALIDATION
 * ------------------------------------------------------------------------- */

do $$
begin
    if (
        select count(*)
        from seed_quiz_resource_links
    ) <> 9 then
        raise exception
            'Quiz Resource Hub link manifest must contain exactly 9 rows';
    end if;

    if (
        select count(*)
        from seed_quiz_resource_links
        where link_role = 'primary'
    ) <> 9 then
        raise exception
            'Every seeded V1 quiz question must have exactly one primary Resource Hub link';
    end if;

    if (
        select count(*)
        from seed_quiz_resource_links
        where link_role = 'supporting'
    ) <> 0 then
        raise exception
            'V1 quiz Resource Hub manifest must not contain supporting links';
    end if;

    if (
        select count(distinct question_code)
        from seed_quiz_resource_links
    ) <> 9 then
        raise exception
            'Quiz Resource Hub manifest must cover all 9 seeded V1 quiz questions';
    end if;

    if exists (
        select 1
        from seed_quiz_resource_links as link
        left join public.quiz_questions as question
            on question.code = link.question_code
        left join public.preparedness_missions as mission
            on mission.id = question.mission_id
        left join public.hazards as hazard
            on hazard.id = question.hazard_id
        where question.id is null
            or not question.is_active
            or mission.id is null
            or not mission.is_active
            or (
                question.hazard_id is not null
                and (
                    hazard.id is null
                    or not hazard.is_active
                )
            )
    ) then
        raise exception
            'Quiz Resource Hub seed references a missing or inactive question, mission or hazard';
    end if;

    if exists (
        select 1
        from seed_quiz_resource_links as link
        left join public.safety_resources as resource
            on resource.code = link.resource_code
        where resource.id is null
            or resource.publication_status <> 'published'
    ) then
        raise exception
            'Quiz Resource Hub seed references a missing or unpublished resource';
    end if;

    if exists (
        select 1
        from (
            select
                question_code,
                count(*) filter (
                    where link_role = 'primary'
                ) as primary_count
            from seed_quiz_resource_links
            group by question_code
        ) as question_links
        where question_links.primary_count <> 1
    ) then
        raise exception
            'Every seeded V1 quiz question must have exactly one primary resource';
    end if;

    /*
     * Hazard-linked quiz questions must point to a Resource Hub article that
     * is linked to the same canonical hazard.
     */
    if exists (
        select 1
        from seed_quiz_resource_links as seed
        join public.quiz_questions as question
            on question.code = seed.question_code
        join public.safety_resources as resource
            on resource.code = seed.resource_code
        where question.hazard_id is not null
            and seed.link_role = 'primary'
            and not exists (
                select 1
                from public.resource_hazards as resource_hazard
                where resource_hazard.resource_id = resource.id
                    and resource_hazard.hazard_id = question.hazard_id
            )
    ) then
        raise exception
            'Hazard-linked quiz primary resource does not match the quiz question hazard';
    end if;

    if (
        select count(*)
        from seed_quiz_resource_links as seed
        join public.quiz_questions as question
            on question.code = seed.question_code
        where question.hazard_id is not null
            and seed.link_role = 'primary'
    ) <> 5 then
        raise exception
            'Adaptive local-hazard quiz must contain exactly 5 primary Resource Hub links';
    end if;

    /*
     * Cold wave, thunderstorm/lightning/strong winds, drought/water scarcity
     * and wildfire are Resource-Hub-only hazards in V1 and must not be linked
     * to the nine seeded quiz questions.
     */
    if exists (
        select 1
        from seed_quiz_resource_links as seed
        join public.safety_resources as resource
            on resource.code = seed.resource_code
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
    ) then
        raise exception
            'Resource-Hub-only V1 hazards must not be attached to seeded quiz questions';
    end if;
end;
$$;


/* -------------------------------------------------------------------------
 * 3. INSERT CANONICAL QUIZ-RESOURCE LINKS
 * ------------------------------------------------------------------------- */

insert into public.quiz_question_resources (
    question_id,
    resource_id,
    link_role,
    sort_order
)
select
    question.id,
    resource.id,
    seed.link_role,
    seed.sort_order
from seed_quiz_resource_links as seed
join public.quiz_questions as question
    on question.code = seed.question_code
join public.safety_resources as resource
    on resource.code = seed.resource_code
order by
    question.mission_id,
    question.sort_order,
    seed.sort_order;


/* -------------------------------------------------------------------------
 * 4. FINAL RELATIONSHIP GUARD
 * ------------------------------------------------------------------------- */

do $$
begin
    if (
        select count(*)
        from seed_quiz_resource_links as seed
        join public.quiz_questions as question
            on question.code = seed.question_code
        join public.safety_resources as resource
            on resource.code = seed.resource_code
        join public.quiz_question_resources as link
            on link.question_id = question.id
            and link.resource_id = resource.id
        where link.link_role = seed.link_role
            and link.sort_order = seed.sort_order
    ) <> 9 then
        raise exception
            'Quiz Resource Hub seed did not produce the expected 9 relationships';
    end if;

    if (
        select count(*)
        from public.quiz_question_resources as link
        join public.quiz_questions as question
            on question.id = link.question_id
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
            and link.link_role = 'primary'
    ) <> 9 then
        raise exception
            'Seeded V1 quiz questions do not each have one primary Resource Hub relationship';
    end if;

    if exists (
        select 1
        from public.quiz_question_resources as link
        join public.quiz_questions as question
            on question.id = link.question_id
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
            and link.link_role = 'supporting'
    ) then
        raise exception
            'Seeded V1 quiz questions must not contain supporting Resource Hub relationships';
    end if;
end;
$$;


commit;
