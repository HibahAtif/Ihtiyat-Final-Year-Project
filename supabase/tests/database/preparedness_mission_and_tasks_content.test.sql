begin;

create extension if not exists pgtap
    with schema extensions;

select plan(14);


/* ==========================================================================
 * Final V1 mission catalogue
 * ========================================================================== */

select results_eq(
    $$
        select
            code,
            mission_scope,
            sort_order
        from public.preparedness_missions
        where code in (
            'prepare_first_aid_kit',
            'household_emergency_kit',
            'household_communication_readiness',
            'know_your_local_hazards'
        )
            and is_active
        order by sort_order
    $$,
    $$
        values
            ('prepare_first_aid_kit'::text, 'national'::text, 10::smallint),
            ('household_emergency_kit'::text, 'national'::text, 20::smallint),
            ('household_communication_readiness'::text, 'national'::text, 30::smallint),
            ('know_your_local_hazards'::text, 'adaptive'::text, 40::smallint)
    $$,
    'the four active V1 preparedness missions have the intended order and scope'
);


select results_eq(
    $$
        select
            title_en,
            title_ar
        from public.preparedness_missions
        where code = 'prepare_first_aid_kit'
    $$,
    $$
        values (
            'Prepare a First Aid Kit'::text,
            'جهّز حقيبة إسعافات أولية'::text
        )
    $$,
    'the first-aid mission has the intended bilingual title'
);


select results_eq(
    $$
        select
            title_en,
            title_ar
        from public.preparedness_missions
        where code = 'know_your_local_hazards'
    $$,
    $$
        values (
            'Know Your Local Hazards'::text,
            'تعرّف على المخاطر المحلية في منطقتك'::text
        )
    $$,
    'the adaptive mission has its final bilingual title'
);


/* ==========================================================================
 * Mission-task catalogue
 * ========================================================================== */

select is(
    (
        select count(*)
        from public.mission_tasks as task
        join public.preparedness_missions as mission
            on mission.id = task.mission_id
        where mission.code in (
            'prepare_first_aid_kit',
            'household_emergency_kit',
            'household_communication_readiness',
            'know_your_local_hazards'
        )
            and task.is_active
    ),
    20::bigint,
    'the final V1 mission catalogue contains exactly 20 active seeded tasks'
);


select results_eq(
    $$
        select
            mission.code,
            count(*)::bigint
        from public.mission_tasks as task
        join public.preparedness_missions as mission
            on mission.id = task.mission_id
        where mission.code in (
            'prepare_first_aid_kit',
            'household_emergency_kit',
            'household_communication_readiness',
            'know_your_local_hazards'
        )
            and task.is_active
        group by mission.code, mission.sort_order
        order by mission.sort_order
    $$,
    $$
        values
            ('prepare_first_aid_kit'::text, 5::bigint),
            ('household_emergency_kit'::text, 5::bigint),
            ('household_communication_readiness'::text, 5::bigint),
            ('know_your_local_hazards'::text, 5::bigint)
    $$,
    'each preparedness mission contains exactly five active tasks'
);


select is(
    (
        select count(*)
        from public.mission_tasks as task
        join public.preparedness_missions as mission
            on mission.id = task.mission_id
        where mission.code in (
            'prepare_first_aid_kit',
            'household_emergency_kit',
            'household_communication_readiness'
        )
            and task.is_active
            and task.hazard_id is null
    ),
    15::bigint,
    'all fifteen national mission tasks are general rather than hazard-linked'
);


select is(
    (
        select count(*)
        from public.mission_tasks as task
        join public.preparedness_missions as mission
            on mission.id = task.mission_id
        where mission.code = 'know_your_local_hazards'
            and task.is_active
            and task.hazard_id is not null
    ),
    5::bigint,
    'the adaptive mission contains exactly five hazard-linked tasks'
);


select results_eq(
    $$
        select
            task.code,
            hazard.code,
            task.sort_order
        from public.mission_tasks as task
        join public.preparedness_missions as mission
            on mission.id = task.mission_id
        join public.hazards as hazard
            on hazard.id = task.hazard_id
        where mission.code = 'know_your_local_hazards'
            and task.is_active
        order by task.sort_order
    $$,
    $$
        values
            ('local_hazard_flood'::text, 'heavy_rain_flash_flooding'::text, 10::smallint),
            ('local_hazard_heat'::text, 'extreme_heat_heatwave'::text, 20::smallint),
            ('local_hazard_dust'::text, 'dust_sandstorm'::text, 30::smallint),
            ('local_hazard_earthquake'::text, 'earthquake'::text, 40::smallint),
            ('local_hazard_landslide'::text, 'landslide_rockfall'::text, 50::smallint)
    $$,
    'adaptive task definitions map to the intended reusable hazards'
);


select is(
    (
        select count(*)
        from public.mission_tasks as task
        join public.preparedness_missions as mission
            on mission.id = task.mission_id
        where mission.code in (
            'prepare_first_aid_kit',
            'household_emergency_kit',
            'household_communication_readiness',
            'know_your_local_hazards'
        )
            and task.is_active
            and task.points = 20
    ),
    20::bigint,
    'all twenty V1 tasks use the intended 20-point activity-feedback value'
);


select ok(
    not exists (
        select 1
        from (
            select
                mission.code,
                array_agg(task.sort_order order by task.sort_order) as task_order
            from public.mission_tasks as task
            join public.preparedness_missions as mission
                on mission.id = task.mission_id
            where mission.code in (
                'prepare_first_aid_kit',
                'household_emergency_kit',
                'household_communication_readiness',
                'know_your_local_hazards'
            )
                and task.is_active
            group by mission.code
        ) as mission_tasks
        where task_order <> array[10, 20, 30, 40, 50]::smallint[]
    ),
    'each mission uses the intended stable task order of 10, 20, 30, 40 and 50'
);


/* ==========================================================================
 * Reviewed wording that is important to the production task catalogue
 * ========================================================================== */

select results_eq(
    $$
        select
            detail_en,
            detail_ar
        from public.mission_tasks
        where code = 'first_aid_review_basics'
    $$,
    $$
        values (
            'Review scene safety, how to assess an injured or unwell person, when to call emergency services, and how to provide appropriate initial help within your knowledge.'::text,
            'راجع سلامة المكان، وكيفية تقييم حالة شخص مصاب أو مريض، ومتى يجب طلب خدمات الطوارئ، وكيفية تقديم المساعدة الأولية المناسبة ضمن حدود معرفتك.'::text
        )
    $$,
    'the reviewed first-aid principles wording is seeded exactly'
);


select results_eq(
    $$
        select
            detail_en,
            detail_ar
        from public.mission_tasks
        where code = 'kit_phone_backup_power'
    $$,
    $$
        values (
            'Keep a phone charger and a fully charged power bank or another suitable backup charging option ready with your emergency supplies.'::text,
            'احتفظ بشاحن للهاتف وببطارية شحن متنقلة مشحونة بالكامل أو وسيلة أخرى مناسبة للشحن الاحتياطي ضمن مستلزمات الطوارئ.'::text
        )
    $$,
    'the emergency-kit backup-power wording is seeded exactly'
);


select ok(
    not exists (
        select 1
        from public.mission_tasks
        where code in (
            'first_aid_known_location',
            'communication_meeting_point',
            'communication_check_in_plan',
            'communication_exit_plan'
        )
            and (
                title_ar like '%أفراد الأسرة%'
                or detail_ar like '%أفراد الأسرة%'
            )
    ),
    'household-member task wording does not revert to the narrower Arabic family-member phrase'
);


/* ==========================================================================
 * Public catalogue visibility
 * ========================================================================== */

set local role anon;

select is(
    (
        select count(*)
        from public.mission_tasks as task
        join public.preparedness_missions as mission
            on mission.id = task.mission_id
        where mission.code in (
            'prepare_first_aid_kit',
            'household_emergency_kit',
            'household_communication_readiness',
            'know_your_local_hazards'
        )
            and task.is_active
    ),
    20::bigint,
    'anonymous clients can read all twenty active V1 preparedness tasks'
);

reset role;


select * from finish();

rollback;
