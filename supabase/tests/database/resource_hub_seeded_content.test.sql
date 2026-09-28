begin;

create extension if not exists pgtap
    with schema extensions;

select plan(13);


/* -------------------------------------------------------------------------
 * Resource Hub seeded catalogue: topics
 * ------------------------------------------------------------------------- */

select is(
    (
        select count(*)
        from public.resource_topics
        where code in (
            'first_aid',
            'emergency_preparedness',
            'hazard_safety'
        )
          and is_active
    ),
    3::bigint,
    'all three V1 Resource Hub topics are seeded and active'
);


select results_eq(
    $$select code, sort_order
      from public.resource_topics
      where code in (
          'first_aid',
          'emergency_preparedness',
          'hazard_safety'
      )
      order by sort_order$$,
    $$values
        ('first_aid'::text, 10::smallint),
        ('emergency_preparedness'::text, 20::smallint),
        ('hazard_safety'::text, 30::smallint)$$,
    'V1 Resource Hub topics retain the intended display order'
);


select is(
    (
        select count(*)
        from public.resource_topics
        where code in (
            'first_aid',
            'emergency_preparedness',
            'hazard_safety'
        )
          and char_length(btrim(name_en)) > 0
          and char_length(btrim(name_ar)) > 0
          and char_length(btrim(description_en)) > 0
          and char_length(btrim(description_ar)) > 0
    ),
    3::bigint,
    'every V1 Resource Hub topic has non-empty bilingual display content'
);


/* -------------------------------------------------------------------------
 * Resource Hub seeded catalogue: published resources
 * ------------------------------------------------------------------------- */

select is(
    (
        select count(*)
        from public.safety_resources
        where code in (
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
    'all thirteen planned V1 Resource Hub resources are seeded'
);


select results_eq(
    $$select code, sort_order
      from public.safety_resources
      where code in (
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
      order by sort_order$$,
    $$values
        ('first_aid_kit_basics'::text, 10::smallint),
        ('household_emergency_kit'::text, 20::smallint),
        ('household_emergency_plan'::text, 30::smallint),
        ('official_saudi_emergency_numbers'::text, 40::smallint),
        ('flood_safety'::text, 100::smallint),
        ('extreme_heat_safety'::text, 110::smallint),
        ('dust_sandstorm_safety'::text, 120::smallint),
        ('earthquake_safety'::text, 130::smallint),
        ('landslide_rockfall_safety'::text, 140::smallint),
        ('cold_wave_safety'::text, 150::smallint),
        ('thunderstorm_lightning_strong_winds_safety'::text, 160::smallint),
        ('drought_water_scarcity_awareness'::text, 170::smallint),
        ('wildfire_vegetation_fire_safety'::text, 180::smallint)$$,
    'V1 Resource Hub resources retain the intended display order'
);


select is(
    (
        select count(*)
        from public.safety_resources
        where code in (
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
          and publication_status = 'published'
    ),
    13::bigint,
    'all thirteen V1 Resource Hub resources are published'
);


select is(
    (
        select count(*)
        from public.safety_resources
        where code in (
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
          and char_length(btrim(title_en)) > 0
          and char_length(btrim(title_ar)) > 0
          and char_length(btrim(summary_en)) > 0
          and char_length(btrim(summary_ar)) > 0
          and char_length(btrim(content_en)) > 0
          and char_length(btrim(content_ar)) > 0
    ),
    13::bigint,
    'every V1 Resource Hub resource has non-empty bilingual title, summary and content'
);


select is(
    (
        select count(*)
        from public.safety_resources
        where code in (
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
          and last_reviewed_on = date '2026-09-22'
          and published_at is not null
    ),
    13::bigint,
    'all V1 Resource Hub resources retain the reviewed date and publication timestamp'
);


/* -------------------------------------------------------------------------
 * Critical reviewed content decisions
 * ------------------------------------------------------------------------- */

select ok(
    exists (
        select 1
        from public.safety_resources
        where code = 'official_saudi_emergency_numbers'
          and title_en = 'Official Saudi Emergency & Support Numbers'
          and title_ar = 'أرقام الطوارئ والدعم الرسمية في السعودية'
    ),
    'the dedicated bilingual Saudi emergency-numbers resource is seeded'
);


select ok(
    exists (
        select 1
        from public.safety_resources
        where code = 'official_saudi_emergency_numbers'
          and content_en like '%911%'
          and content_en like '%997%'
          and content_en like '%998%'
          and content_en like '%999%'
          and content_en like '%993%'
          and content_en like '%996%'
          and content_en like '%112%'
          and content_en like '%937%'
          and content_ar like '%911%'
          and content_ar like '%997%'
          and content_ar like '%998%'
          and content_ar like '%999%'
          and content_ar like '%993%'
          and content_ar like '%996%'
          and content_ar like '%112%'
          and content_ar like '%937%'
    ),
    'the emergency-numbers resource contains all eight reviewed numbers in both language versions'
);


select ok(
    exists (
        select 1
        from public.safety_resources
        where code = 'household_emergency_kit'
          and content_en like '%charging adapter%'
          and content_en like '%fully charged power bank%'
          and content_ar like '%محوّل شحن%'
          and content_ar like '%بطارية شحن متنقلة واحدة على الأقل مشحونة بالكامل%'
    ),
    'the household emergency kit explicitly includes an adapter and at least one fully charged power bank'
);


select ok(
    exists (
        select 1
        from public.safety_resources
        where code = 'first_aid_kit_basics'
          and content_en like '%Ihtiyat-curated translation and summary%'
          and content_en like '%printed pp. 85-91%'
          and content_en like '%PDF-viewer pp. 87-93%'
          and content_en like '%not an official MOH English translation%'
    ),
    'the first-aid resource preserves the translation disclaimer and reviewed MOH page ranges'
);


select is(
    (
        select count(*)
        from public.safety_resources
        where code in (
            'cold_wave_safety',
            'thunderstorm_lightning_strong_winds_safety',
            'drought_water_scarcity_awareness',
            'wildfire_vegetation_fire_safety'
        )
          and (
              content_en ilike '%dedicated scored%'
              or content_en ilike '%resource hub support content%'
              or content_ar like '%محتوى داعم في مركز الموارد%'
              or content_ar like '%مهمة مخاطر مستقلة محسوبة بالنقاط%'
          )
    ),
    0::bigint,
    'Resource Hub guidance does not expose internal mission-scoring implementation wording'
);


select * from finish();

rollback;
