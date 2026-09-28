/*
 * Ihtiyat mission-task to Resource Hub relationship seed.
 *
 * This migration links each V1 preparedness task to one primary reviewed
 * Resource Hub article. A small number of tasks also receive one supporting
 * resource where it adds genuinely useful context.
 *
 * Quiz-question links remain independent and are seeded separately through
 * public.quiz_question_resources.
*/

begin;

create temporary table seed_mission_task_resource_links (
    task_code text not null,
    resource_code text not null,
    link_role text not null,
    sort_order smallint not null,

    primary key (task_code, resource_code),

    constraint seed_mission_task_resource_links_role_valid
        check (link_role in ('primary', 'supporting')),

    constraint seed_mission_task_resource_links_sort_order_non_negative
        check (sort_order >= 0),

    constraint seed_mission_task_resource_links_task_order_unique
        unique (task_code, sort_order)
) on commit drop;


insert into seed_mission_task_resource_links (
    task_code,
    resource_code,
    link_role,
    sort_order
)
values
    ('first_aid_kit_ready', 'first_aid_kit_basics', 'primary', 10),
    ('first_aid_review_contents', 'first_aid_kit_basics', 'primary', 10),
    ('first_aid_check_supplies', 'first_aid_kit_basics', 'primary', 10),
    ('first_aid_known_location', 'first_aid_kit_basics', 'primary', 10),
    ('first_aid_review_basics', 'first_aid_kit_basics', 'primary', 10),
    ('first_aid_review_basics', 'official_saudi_emergency_numbers', 'supporting', 20),

    ('kit_water_food', 'household_emergency_kit', 'primary', 10),
    ('kit_flashlight_batteries', 'household_emergency_kit', 'primary', 10),
    ('kit_phone_backup_power', 'household_emergency_kit', 'primary', 10),
    ('kit_documents_medicines', 'household_emergency_kit', 'primary', 10),
    ('kit_accessible_storage', 'household_emergency_kit', 'primary', 10),
    ('kit_accessible_storage', 'first_aid_kit_basics', 'supporting', 20),

    ('communication_emergency_number', 'official_saudi_emergency_numbers', 'primary', 10),
    ('communication_emergency_number', 'household_emergency_plan', 'supporting', 20),
    ('communication_meeting_point', 'household_emergency_plan', 'primary', 10),
    ('communication_check_in_plan', 'household_emergency_plan', 'primary', 10),
    ('communication_exit_plan', 'household_emergency_plan', 'primary', 10),
    ('communication_official_sources', 'household_emergency_plan', 'primary', 10),

    ('local_hazard_flood', 'flood_safety', 'primary', 10),
    ('local_hazard_heat', 'extreme_heat_safety', 'primary', 10),
    ('local_hazard_dust', 'dust_sandstorm_safety', 'primary', 10),
    ('local_hazard_earthquake', 'earthquake_safety', 'primary', 10),
    ('local_hazard_landslide', 'landslide_rockfall_safety', 'primary', 10);


do $$
begin
    if (
        select count(*)
        from seed_mission_task_resource_links
    ) <> 23 then
        raise exception
            'Mission-task Resource Hub link manifest must contain exactly 23 rows';
    end if;

    if (
        select count(*)
        from seed_mission_task_resource_links
        where link_role = 'primary'
    ) <> 20 then
        raise exception
            'Every V1 mission task must have exactly one primary Resource Hub link';
    end if;

    if (
        select count(*)
        from seed_mission_task_resource_links
        where link_role = 'supporting'
    ) <> 3 then
        raise exception
            'Mission-task Resource Hub link manifest must contain exactly 3 supporting links';
    end if;

    if exists (
        select 1
        from seed_mission_task_resource_links as link
        left join public.mission_tasks as task
            on task.code = link.task_code
        left join public.preparedness_missions as mission
            on mission.id = task.mission_id
        where task.id is null
            or not task.is_active
            or mission.id is null
            or not mission.is_active
    ) then
        raise exception
            'Mission-task Resource Hub seed references a missing or inactive task or mission';
    end if;

    if exists (
        select 1
        from seed_mission_task_resource_links as link
        left join public.safety_resources as resource
            on resource.code = link.resource_code
        where resource.id is null
            or resource.publication_status <> 'published'
    ) then
        raise exception
            'Mission-task Resource Hub seed references a missing or unpublished resource';
    end if;

    if exists (
        select 1
        from (
            select
                task_code,
                count(*) filter (where link_role = 'primary') as primary_count
            from seed_mission_task_resource_links
            group by task_code
        ) as task_links
        where task_links.primary_count <> 1
    ) then
        raise exception
            'Every linked V1 mission task must have exactly one primary resource';
    end if;

    if (
        select count(distinct task_code)
        from seed_mission_task_resource_links
    ) <> 20 then
        raise exception
            'Mission-task Resource Hub manifest must cover all 20 V1 mission tasks';
    end if;

    if exists (
        select 1
        from seed_mission_task_resource_links as seed
        join public.mission_tasks as task
            on task.code = seed.task_code
        join public.safety_resources as resource
            on resource.code = seed.resource_code
        where task.hazard_id is not null
            and seed.link_role = 'primary'
            and not exists (
                select 1
                from public.resource_hazards as resource_hazard
                where resource_hazard.resource_id = resource.id
                    and resource_hazard.hazard_id = task.hazard_id
            )
    ) then
        raise exception
            'Adaptive mission task primary resource does not match the task hazard';
    end if;

    if (
        select count(*)
        from seed_mission_task_resource_links as seed
        join public.mission_tasks as task
            on task.code = seed.task_code
        where task.hazard_id is not null
            and seed.link_role = 'primary'
    ) <> 5 then
        raise exception
            'Adaptive local-hazard mission must contain exactly 5 primary Resource Hub links';
    end if;
end;
$$;


insert into public.mission_task_resources (
    task_id,
    resource_id,
    link_role,
    sort_order
)
select
    task.id,
    resource.id,
    seed.link_role,
    seed.sort_order
from seed_mission_task_resource_links as seed
join public.mission_tasks as task
    on task.code = seed.task_code
join public.safety_resources as resource
    on resource.code = seed.resource_code
order by
    task.mission_id,
    task.sort_order,
    seed.sort_order;


do $$
begin
    if (
        select count(*)
        from seed_mission_task_resource_links as seed
        join public.mission_tasks as task
            on task.code = seed.task_code
        join public.safety_resources as resource
            on resource.code = seed.resource_code
        join public.mission_task_resources as link
            on link.task_id = task.id
            and link.resource_id = resource.id
        where link.link_role = seed.link_role
            and link.sort_order = seed.sort_order
    ) <> 23 then
        raise exception
            'Mission-task Resource Hub seed did not produce the expected 23 relationships';
    end if;

    if (
        select count(*)
        from public.mission_task_resources as link
        join public.mission_tasks as task
            on task.id = link.task_id
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
          and link.link_role = 'primary'
    ) <> 20 then
        raise exception
            'Seeded V1 mission tasks do not each have one primary Resource Hub relationship';
    end if;
end;
$$;

commit;
