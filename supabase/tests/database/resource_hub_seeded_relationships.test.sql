begin;

create extension if not exists pgtap
    with schema extensions;

select plan(11);


/* -------------------------------------------------------------------------
 * Resource Hub seeded topic relationships
 * ------------------------------------------------------------------------- */

select is(
    (
        select count(*)
        from public.resource_topic_links as link
        join public.safety_resources as resource
            on resource.id = link.resource_id
        where resource.code in (
            'first_aid_kit_basics',
            'household_emergency_kit',
            'household_emergency_plan',
            'official_saudi_emergency_numbers',
            'flood_safety',
            'extreme_heat_safety',
            'dust_sandstorm_safety',
            'earthquake_safety',
            'landslide_rockfall_safety',
            'cold_wave_safety',
            'thunderstorm_lightning_strong_winds_safety',
            'drought_water_scarcity_awareness',
            'wildfire_vegetation_fire_safety'
        )
    ),
    14::bigint,
    'the thirteen seeded V1 resources have exactly fourteen topic links'
);


select is(
    (
        select count(*)
        from public.resource_topic_links as link
        join public.safety_resources as resource
            on resource.id = link.resource_id
        where resource.code in (
            'first_aid_kit_basics',
            'household_emergency_kit',
            'household_emergency_plan',
            'official_saudi_emergency_numbers',
            'flood_safety',
            'extreme_heat_safety',
            'dust_sandstorm_safety',
            'earthquake_safety',
            'landslide_rockfall_safety',
            'cold_wave_safety',
            'thunderstorm_lightning_strong_winds_safety',
            'drought_water_scarcity_awareness',
            'wildfire_vegetation_fire_safety'
        )
          and link.is_primary
    ),
    13::bigint,
    'every seeded V1 resource has one primary topic'
);


select results_eq(
    $$select topic.code, link.is_primary, link.sort_order
      from public.resource_topic_links as link
      join public.safety_resources as resource
        on resource.id = link.resource_id
      join public.resource_topics as topic
        on topic.id = link.topic_id
      where resource.code = 'first_aid_kit_basics'
      order by link.sort_order$$,
    $$values
        ('first_aid'::text, true, 10::smallint),
        ('emergency_preparedness'::text, false, 20::smallint)$$,
    'first-aid content is primarily First Aid and secondarily Emergency Preparedness'
);


select results_eq(
    $$select resource.code, link.sort_order
      from public.resource_topic_links as link
      join public.safety_resources as resource
        on resource.id = link.resource_id
      join public.resource_topics as topic
        on topic.id = link.topic_id
      where topic.code = 'emergency_preparedness'
        and link.is_primary
      order by link.sort_order$$,
    $$values
        ('household_emergency_kit'::text, 10::smallint),
        ('household_emergency_plan'::text, 20::smallint),
        ('official_saudi_emergency_numbers'::text, 30::smallint)$$,
    'Emergency Preparedness primary resources retain the intended display order'
);


select results_eq(
    $$select resource.code, link.sort_order
      from public.resource_topic_links as link
      join public.safety_resources as resource
        on resource.id = link.resource_id
      join public.resource_topics as topic
        on topic.id = link.topic_id
      where topic.code = 'hazard_safety'
        and link.is_primary
      order by link.sort_order$$,
    $$values
        ('flood_safety'::text, 100::smallint),
        ('extreme_heat_safety'::text, 110::smallint),
        ('dust_sandstorm_safety'::text, 120::smallint),
        ('earthquake_safety'::text, 130::smallint),
        ('landslide_rockfall_safety'::text, 140::smallint),
        ('cold_wave_safety'::text, 150::smallint),
        ('thunderstorm_lightning_strong_winds_safety'::text, 160::smallint),
        ('drought_water_scarcity_awareness'::text, 170::smallint),
        ('wildfire_vegetation_fire_safety'::text, 180::smallint)$$,
    'Hazard Safety primary resources retain the intended display order'
);


select is(
    (
        select count(*)
        from (
            select
                resource.id,
                count(*) filter (where link.is_primary) as primary_count
            from public.safety_resources as resource
            join public.resource_topic_links as link
                on link.resource_id = resource.id
            where resource.code in (
                'first_aid_kit_basics',
                'household_emergency_kit',
                'household_emergency_plan',
                'official_saudi_emergency_numbers',
                'flood_safety',
                'extreme_heat_safety',
                'dust_sandstorm_safety',
                'earthquake_safety',
                'landslide_rockfall_safety',
                'cold_wave_safety',
                'thunderstorm_lightning_strong_winds_safety',
                'drought_water_scarcity_awareness',
                'wildfire_vegetation_fire_safety'
            )
            group by resource.id
            having count(*) filter (where link.is_primary) <> 1
        ) as invalid_primary_topics
    ),
    0::bigint,
    'no seeded V1 resource has zero or multiple primary topics'
);


select is(
    (
        select count(*)
        from (
            select
                resource.id
            from public.safety_resources as resource
            join public.resource_topic_links as link
                on link.resource_id = resource.id
            where resource.code in (
                'first_aid_kit_basics',
                'household_emergency_kit',
                'household_emergency_plan',
                'official_saudi_emergency_numbers',
                'flood_safety',
                'extreme_heat_safety',
                'dust_sandstorm_safety',
                'earthquake_safety',
                'landslide_rockfall_safety',
                'cold_wave_safety',
                'thunderstorm_lightning_strong_winds_safety',
                'drought_water_scarcity_awareness',
                'wildfire_vegetation_fire_safety'
            )
            group by resource.id
            having count(*) > 1
        ) as multi_topic_resources
    ),
    1::bigint,
    'first-aid content is the only seeded V1 resource linked to more than one topic'
);


/* -------------------------------------------------------------------------
 * Resource Hub seeded hazard relationships
 * ------------------------------------------------------------------------- */

select is(
    (
        select count(*)
        from public.resource_hazards as link
        join public.safety_resources as resource
            on resource.id = link.resource_id
        where resource.code in (
            'flood_safety',
            'extreme_heat_safety',
            'dust_sandstorm_safety',
            'earthquake_safety',
            'landslide_rockfall_safety',
            'cold_wave_safety',
            'thunderstorm_lightning_strong_winds_safety',
            'drought_water_scarcity_awareness',
            'wildfire_vegetation_fire_safety'
        )
    ),
    9::bigint,
    'the nine seeded hazard resources have exactly nine hazard links'
);


select results_eq(
    $$select resource.code, hazard.code
      from public.resource_hazards as link
      join public.safety_resources as resource
        on resource.id = link.resource_id
      join public.hazards as hazard
        on hazard.id = link.hazard_id
      where resource.code in (
          'flood_safety',
          'extreme_heat_safety',
          'dust_sandstorm_safety',
          'earthquake_safety',
          'landslide_rockfall_safety',
          'cold_wave_safety',
          'thunderstorm_lightning_strong_winds_safety',
          'drought_water_scarcity_awareness',
          'wildfire_vegetation_fire_safety'
      )
      order by resource.sort_order$$,
    $$values
        ('flood_safety'::text, 'heavy_rain_flash_flooding'::text),
        ('extreme_heat_safety'::text, 'extreme_heat_heatwave'::text),
        ('dust_sandstorm_safety'::text, 'dust_sandstorm'::text),
        ('earthquake_safety'::text, 'earthquake'::text),
        ('landslide_rockfall_safety'::text, 'landslide_rockfall'::text),
        ('cold_wave_safety'::text, 'cold_wave'::text),
        ('thunderstorm_lightning_strong_winds_safety'::text, 'thunderstorm_lightning_strong_winds'::text),
        ('drought_water_scarcity_awareness'::text, 'drought_water_scarcity'::text),
        ('wildfire_vegetation_fire_safety'::text, 'wildfire_vegetation_fire'::text)$$,
    'each seeded hazard resource maps to the intended canonical hazard'
);


select is(
    (
        select count(*)
        from public.resource_hazards as link
        join public.safety_resources as resource
            on resource.id = link.resource_id
        where resource.code in (
            'first_aid_kit_basics',
            'household_emergency_kit',
            'household_emergency_plan',
            'official_saudi_emergency_numbers'
        )
    ),
    0::bigint,
    'general preparedness and emergency-reference resources are not directly hazard-linked'
);


/* -------------------------------------------------------------------------
 * V1 location-link design decision
 * ------------------------------------------------------------------------- */

select is(
    (
        select count(*)
        from public.resource_locations as link
        join public.safety_resources as resource
            on resource.id = link.resource_id
        where resource.code in (
            'first_aid_kit_basics',
            'household_emergency_kit',
            'household_emergency_plan',
            'official_saudi_emergency_numbers',
            'flood_safety',
            'extreme_heat_safety',
            'dust_sandstorm_safety',
            'earthquake_safety',
            'landslide_rockfall_safety',
            'cold_wave_safety',
            'thunderstorm_lightning_strong_winds_safety',
            'drought_water_scarcity_awareness',
            'wildfire_vegetation_fire_safety'
        )
    ),
    0::bigint,
    'V1 Resource Hub content is not duplicated through direct resource-location links'
);


select * from finish();

rollback;
