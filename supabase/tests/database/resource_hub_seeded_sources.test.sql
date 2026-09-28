begin;

create extension if not exists pgtap
    with schema extensions;

select plan(11);


/* -------------------------------------------------------------------------
 * Resource Hub seeded official-source catalogue
 * ------------------------------------------------------------------------- */

select is(
    (
        select count(*)
        from public.resource_sources as source
        join public.safety_resources as resource
            on resource.id = source.resource_id
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
    22::bigint,
    'the V1 Resource Hub contains exactly twenty-two seeded official-source rows'
);


select is(
    (
        select count(*)
        from public.resource_sources as source
        join public.safety_resources as resource
            on resource.id = source.resource_id
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
          and source.is_official
          and source.is_active
          and source.last_checked_on = date '2026-09-22'
    ),
    22::bigint,
    'all seeded Resource Hub sources are active, official and retain the checked date'
);


select is(
    (
        select count(distinct resource.code)
        from public.resource_sources as source
        join public.safety_resources as resource
            on resource.id = source.resource_id
        where source.is_official
          and source.is_active
          and resource.code in (
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
    13::bigint,
    'every seeded V1 Resource Hub resource has at least one active official source'
);


select is(
    (
        select count(*)
        from public.resource_sources as source
        join public.safety_resources as resource
            on resource.id = source.resource_id
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
          and (
              source.source_url !~ '^https://'
              or char_length(btrim(source.publisher_name_en)) = 0
              or char_length(btrim(source.publisher_name_ar)) = 0
              or char_length(btrim(source.source_title_en)) = 0
              or char_length(btrim(source.source_title_ar)) = 0
          )
    ),
    0::bigint,
    'all seeded Resource Hub sources use HTTPS and have bilingual publisher and source-title metadata'
);


select results_eq(
    $$select source_language_code, count(*)::bigint
      from public.resource_sources as source
      join public.safety_resources as resource
        on resource.id = source.resource_id
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
      group by source_language_code
      order by source_language_code$$,
    $$values
        ('ar'::text, 3::bigint),
        ('en'::text, 19::bigint)$$,
    'seeded official-source language metadata contains three Arabic and nineteen English links'
);


/* -------------------------------------------------------------------------
 * Reviewed first-aid provenance
 * ------------------------------------------------------------------------- */

select is(
    (
        select count(*)
        from public.resource_sources as source
        join public.safety_resources as resource
            on resource.id = source.resource_id
        where resource.code = 'first_aid_kit_basics'
    ),
    2::bigint,
    'the first-aid resource retains exactly two reviewed official sources'
);


select ok(
    exists (
        select 1
        from public.resource_sources as source
        join public.safety_resources as resource
            on resource.id = source.resource_id
        where resource.code = 'first_aid_kit_basics'
          and source.source_language_code = 'ar'
          and source.source_url =
              'https://www.moh.gov.sa/Ministry/MediaCenter/Publications/Documents/Dose-fo-Awareness-2.pdf'
          and source.source_title_en like '%printed pp. 85-91%'
          and source.source_title_en like '%PDF-viewer pp. 87-93%'
    ),
    'the Arabic MOH Dose of Awareness source preserves the reviewed first-aid page ranges'
);


/* -------------------------------------------------------------------------
 * Reviewed drought / water-scarcity provenance
 * ------------------------------------------------------------------------- */

select results_eq(
    $$select source_url
      from public.resource_sources as source
      join public.safety_resources as resource
        on resource.id = source.resource_id
      where resource.code = 'drought_water_scarcity_awareness'
      order by source.sort_order$$,
    $$values
        ('https://www.mewa.gov.sa/en/Ministry/Agencies/TheWaterAgency/Topics/Pages/Strategy.aspx'::text),
        ('https://www.mewa.gov.sa/en/Ministry/Agencies/EnvironmentAgency/Topics/Pages/how-to-share.aspx'::text),
        ('https://www.mewa.gov.sa/en/MediaCenter/News/Pages/saudi-water-week-drought-resilience.aspx'::text)$$,
    'the drought and water-scarcity resource contains exactly the three approved MEWA sources'
);


select is(
    (
        select count(*)
        from public.resource_sources
        where source_url ilike '%maee.gov.sa%'
           or source_url ilike '%99090.aspx%'
           or source_url ilike '%General%20Department%20of%20Water%20Resources%20and%20Rationalization%'
    ),
    0::bigint,
    'removed MAEE, Qatrah-launch and Water Agency department links are absent from seeded sources'
);


/* -------------------------------------------------------------------------
 * Emergency-number provenance and bilingual links
 * ------------------------------------------------------------------------- */

select is(
    (
        select count(*)
        from public.resource_sources as source
        join public.safety_resources as resource
            on resource.id = source.resource_id
        where resource.code = 'official_saudi_emergency_numbers'
    ),
    5::bigint,
    'the emergency-numbers resource retains five reviewed official sources'
);


select results_eq(
    $$select source_language_code, count(*)::bigint
      from public.resource_sources as source
      join public.safety_resources as resource
        on resource.id = source.resource_id
      where resource.code = 'official_saudi_emergency_numbers'
      group by source_language_code
      order by source_language_code$$,
    $$values
        ('ar'::text, 2::bigint),
        ('en'::text, 3::bigint)$$,
    'the emergency-numbers resource provides both Arabic and English official-source links'
);


select * from finish();

rollback;
