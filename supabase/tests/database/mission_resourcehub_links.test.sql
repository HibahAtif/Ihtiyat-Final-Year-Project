begin;

create extension if not exists pgtap
    with schema extensions;

select plan(12);


/* -------------------------------------------------------------------------
 * Mission -> Resource Hub seeded relationship counts
 * ------------------------------------------------------------------------- */

select is(
    (
        select count(*)
        from public.mission_task_resources
    ),
    23::bigint,
    'the V1 mission catalogue contains exactly 23 seeded Resource Hub links'
);


select is(
    (
        select count(*)
        from public.mission_task_resources
        where link_role = 'primary'
    ),
    20::bigint,
    'the V1 mission catalogue contains exactly 20 primary Resource Hub links'
);


select is(
    (
        select count(*)
        from public.mission_task_resources
        where link_role = 'supporting'
    ),
    3::bigint,
    'the V1 mission catalogue contains exactly 3 supporting Resource Hub links'
);


select is(
    (
        select count(*)
        from (
            select
                task.id
            from public.mission_tasks as task
            join public.mission_task_resources as link
                on link.task_id = task.id
            where task.code in (
                'first_aid_kit_ready',
                'first_aid_review_contents',
                'first_aid_check_supplies',
                'first_aid_known_location',
                'first_aid_review_basics',
                'kit_water_food',
                'kit_flashlight_batteries',
                'kit_phone_backup_power',
                'kit_documents_medicines',
                'kit_accessible_storage',
                'communication_emergency_number',
                'communication_meeting_point',
                'communication_check_in_plan',
                'communication_exit_plan',
                'communication_official_sources',
                'local_hazard_flood',
                'local_hazard_heat',
                'local_hazard_dust',
                'local_hazard_earthquake',
                'local_hazard_landslide'
            )
            group by task.id
            having count(*) filter (
                where link.link_role = 'primary'
            ) = 1
        ) as tasks_with_one_primary
    ),
    20::bigint,
    'all 20 V1 mission tasks have exactly one primary Resource Hub article'
);


/* -------------------------------------------------------------------------
 * Mission 1: First Aid
 * ------------------------------------------------------------------------- */

select results_eq(
    $$select
          task.code,
          resource.code,
          link.link_role,
          link.sort_order
      from public.mission_task_resources as link
      join public.mission_tasks as task
        on task.id = link.task_id
      join public.safety_resources as resource
        on resource.id = link.resource_id
      where task.code like 'first_aid_%'
      order by task.sort_order, link.sort_order$$,
    $$values
        ('first_aid_kit_ready'::text, 'first_aid_kit_basics'::text, 'primary'::text, 10::smallint),
        ('first_aid_review_contents'::text, 'first_aid_kit_basics'::text, 'primary'::text, 10::smallint),
        ('first_aid_check_supplies'::text, 'first_aid_kit_basics'::text, 'primary'::text, 10::smallint),
        ('first_aid_known_location'::text, 'first_aid_kit_basics'::text, 'primary'::text, 10::smallint),
        ('first_aid_review_basics'::text, 'first_aid_kit_basics'::text, 'primary'::text, 10::smallint),
        ('first_aid_review_basics'::text, 'official_saudi_emergency_numbers'::text, 'supporting'::text, 20::smallint)$$,
    'First Aid tasks retain the intended primary and supporting Resource Hub mappings'
);


/* -------------------------------------------------------------------------
 * Mission 2: Household Emergency Kit
 * ------------------------------------------------------------------------- */

select results_eq(
    $$select
          task.code,
          resource.code,
          link.link_role,
          link.sort_order
      from public.mission_task_resources as link
      join public.mission_tasks as task
        on task.id = link.task_id
      join public.safety_resources as resource
        on resource.id = link.resource_id
      join public.preparedness_missions as mission
        on mission.id = task.mission_id
      where mission.code = 'household_emergency_kit'
      order by task.sort_order, link.sort_order$$,
    $$values
        ('kit_water_food'::text, 'household_emergency_kit'::text, 'primary'::text, 10::smallint),
        ('kit_flashlight_batteries'::text, 'household_emergency_kit'::text, 'primary'::text, 10::smallint),
        ('kit_phone_backup_power'::text, 'household_emergency_kit'::text, 'primary'::text, 10::smallint),
        ('kit_documents_medicines'::text, 'household_emergency_kit'::text, 'primary'::text, 10::smallint),
        ('kit_accessible_storage'::text, 'household_emergency_kit'::text, 'primary'::text, 10::smallint),
        ('kit_accessible_storage'::text, 'first_aid_kit_basics'::text, 'supporting'::text, 20::smallint)$$,
    'Household Emergency Kit tasks retain the intended Resource Hub mappings'
);


/* -------------------------------------------------------------------------
 * Mission 3: Household & Communication Readiness
 * ------------------------------------------------------------------------- */

select results_eq(
    $$select
          task.code,
          resource.code,
          link.link_role,
          link.sort_order
      from public.mission_task_resources as link
      join public.mission_tasks as task
        on task.id = link.task_id
      join public.safety_resources as resource
        on resource.id = link.resource_id
      join public.preparedness_missions as mission
        on mission.id = task.mission_id
      where mission.code = 'household_communication_readiness'
      order by task.sort_order, link.sort_order$$,
    $$values
        ('communication_emergency_number'::text, 'official_saudi_emergency_numbers'::text, 'primary'::text, 10::smallint),
        ('communication_emergency_number'::text, 'household_emergency_plan'::text, 'supporting'::text, 20::smallint),
        ('communication_meeting_point'::text, 'household_emergency_plan'::text, 'primary'::text, 10::smallint),
        ('communication_check_in_plan'::text, 'household_emergency_plan'::text, 'primary'::text, 10::smallint),
        ('communication_exit_plan'::text, 'household_emergency_plan'::text, 'primary'::text, 10::smallint),
        ('communication_official_sources'::text, 'household_emergency_plan'::text, 'primary'::text, 10::smallint)$$,
    'Household and Communication Readiness tasks retain the intended Resource Hub mappings'
);


/* -------------------------------------------------------------------------
 * Mission 4: Adaptive local hazards
 * ------------------------------------------------------------------------- */

select results_eq(
    $$select
          task.code,
          resource.code,
          link.link_role
      from public.mission_task_resources as link
      join public.mission_tasks as task
        on task.id = link.task_id
      join public.safety_resources as resource
        on resource.id = link.resource_id
      join public.preparedness_missions as mission
        on mission.id = task.mission_id
      where mission.code = 'know_your_local_hazards'
      order by task.sort_order$$,
    $$values
        ('local_hazard_flood'::text, 'flood_safety'::text, 'primary'::text),
        ('local_hazard_heat'::text, 'extreme_heat_safety'::text, 'primary'::text),
        ('local_hazard_dust'::text, 'dust_sandstorm_safety'::text, 'primary'::text),
        ('local_hazard_earthquake'::text, 'earthquake_safety'::text, 'primary'::text),
        ('local_hazard_landslide'::text, 'landslide_rockfall_safety'::text, 'primary'::text)$$,
    'adaptive local-hazard tasks point to the intended primary hazard resources'
);


select is(
    (
        select count(*)
        from public.mission_task_resources as link
        join public.mission_tasks as task
            on task.id = link.task_id
        where task.hazard_id is not null
          and link.link_role = 'primary'
          and not exists (
              select 1
              from public.resource_hazards as resource_hazard
              where resource_hazard.resource_id = link.resource_id
                and resource_hazard.hazard_id = task.hazard_id
          )
    ),
    0::bigint,
    'every adaptive task primary resource is linked to the same canonical hazard as the task'
);


select is(
    (
        select count(*)
        from public.mission_task_resources as link
        join public.safety_resources as resource
            on resource.id = link.resource_id
        where resource.code in (
            'cold_wave_safety',
            'thunderstorm_lightning_strong_winds_safety',
            'drought_water_scarcity_awareness',
            'wildfire_vegetation_fire_safety'
        )
    ),
    0::bigint,
    'Resource-Hub-only hazards are not incorrectly attached to V1 mission tasks'
);


/* -------------------------------------------------------------------------
 * Public readability of published mission-resource relationships
 * ------------------------------------------------------------------------- */

set local role anon;

select is(
    (
        select count(*)
        from public.mission_task_resources
    ),
    23::bigint,
    'guest users can read all 23 active published mission-resource relationships'
);

reset role;


set local role authenticated;

select is(
    (
        select count(*)
        from public.mission_task_resources
    ),
    23::bigint,
    'authenticated users can read all 23 active published mission-resource relationships'
);

reset role;


select * from finish();

rollback;
