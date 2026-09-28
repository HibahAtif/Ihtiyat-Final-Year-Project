begin;

create extension if not exists pgtap
    with schema extensions;

select plan(16);


/* Baseline reusable hazard catalogue. */

select is(
    (select count(*) from public.hazards where code in ('heavy_rain_flash_flooding',
			'extreme_heat_heatwave',
			'dust_sandstorm',
			'earthquake',
			'landslide_rockfall',
			'cold_wave',
			'thunderstorm_lightning_strong_winds',
			'drought_water_scarcity',
			'wildfire_vegetation_fire')),
    9::bigint,
    'all nine planned V1 baseline hazards are seeded'
);

select results_eq(
    $$select code, classification, sort_order
      from public.hazards
      where code in ('heavy_rain_flash_flooding',
			'extreme_heat_heatwave',
			'dust_sandstorm',
			'earthquake',
			'landslide_rockfall',
			'cold_wave',
			'thunderstorm_lightning_strong_winds',
			'drought_water_scarcity',
			'wildfire_vegetation_fire')
      order by sort_order$$,
    $$values
            ('heavy_rain_flash_flooding'::text, 'core'::text, 10::smallint),
			('extreme_heat_heatwave'::text, 'core'::text, 20::smallint),
			('dust_sandstorm'::text, 'core'::text, 30::smallint),
			('earthquake'::text, 'core'::text, 40::smallint),
			('landslide_rockfall'::text, 'supported_regional'::text, 50::smallint),
			('cold_wave'::text, 'resource_supported'::text, 60::smallint),
			('thunderstorm_lightning_strong_winds'::text, 'resource_supported'::text, 70::smallint),
			('drought_water_scarcity'::text, 'resource_supported'::text, 80::smallint),
			('wildfire_vegetation_fire'::text, 'resource_supported'::text, 90::smallint)$$,
    'baseline hazards retain the intended classifications and display order'
);

select is(
    (select count(*) from public.hazards
     where code in ('heavy_rain_flash_flooding',
			'extreme_heat_heatwave',
			'dust_sandstorm',
			'earthquake',
			'landslide_rockfall',
			'cold_wave',
			'thunderstorm_lightning_strong_winds',
			'drought_water_scarcity',
			'wildfire_vegetation_fire') and is_active),
    9::bigint,
    'all baseline hazards are active'
);

select is(
    (select count(*) from public.hazards
     where code in ('heavy_rain_flash_flooding',
			'extreme_heat_heatwave',
			'dust_sandstorm',
			'earthquake',
			'landslide_rockfall',
			'cold_wave',
			'thunderstorm_lightning_strong_winds',
			'drought_water_scarcity',
			'wildfire_vegetation_fire') and classification = 'core'),
    4::bigint,
    'the baseline catalogue contains four core hazards'
);

select is(
    (select count(*) from public.hazards
     where code in ('heavy_rain_flash_flooding',
			'extreme_heat_heatwave',
			'dust_sandstorm',
			'earthquake',
			'landslide_rockfall',
			'cold_wave',
			'thunderstorm_lightning_strong_winds',
			'drought_water_scarcity',
			'wildfire_vegetation_fire') and classification = 'supported_regional'),
    1::bigint,
    'the baseline catalogue contains one supported-regional hazard'
);

select is(
    (select count(*) from public.hazards
     where code in ('heavy_rain_flash_flooding',
			'extreme_heat_heatwave',
			'dust_sandstorm',
			'earthquake',
			'landslide_rockfall',
			'cold_wave',
			'thunderstorm_lightning_strong_winds',
			'drought_water_scarcity',
			'wildfire_vegetation_fire') and classification = 'resource_supported'),
    4::bigint,
    'the baseline catalogue contains four resource-supported hazards'
);

select is(
    (select count(*) from public.hazards
     where code in ('heavy_rain_flash_flooding',
			'extreme_heat_heatwave',
			'dust_sandstorm',
			'earthquake',
			'landslide_rockfall',
			'cold_wave',
			'thunderstorm_lightning_strong_winds',
			'drought_water_scarcity',
			'wildfire_vegetation_fire')
       and char_length(btrim(name_en)) > 0
       and char_length(btrim(name_ar)) > 0),
    9::bigint,
    'every baseline hazard has non-empty English and Arabic names'
);


/* Baseline preparedness mission definitions. */

select is(
    (select count(*) from public.preparedness_missions where code in ('household_emergency_kit',
			'household_communication_readiness',
			'know_your_local_hazards')),
    3::bigint,
    'all three planned baseline preparedness missions are seeded'
);

select results_eq(
    $$select code, mission_scope
      from public.preparedness_missions
      where code in ('household_emergency_kit',
			'household_communication_readiness',
			'know_your_local_hazards')
      order by sort_order$$,
    $$values
            ('household_emergency_kit'::text, 'national'::text),
			('household_communication_readiness'::text, 'national'::text),
			('know_your_local_hazards'::text, 'adaptive'::text)$$,
    'baseline missions retain the intended scopes and display order'
);

select is(
    (select count(*) from public.preparedness_missions
     where code in ('household_emergency_kit',
			'household_communication_readiness',
			'know_your_local_hazards') and is_active),
    3::bigint,
    'all baseline preparedness missions are active'
);

select is(
    (select count(*) from public.preparedness_missions
     where code in ('household_emergency_kit',
			'household_communication_readiness',
			'know_your_local_hazards') and mission_scope = 'national'),
    2::bigint,
    'two baseline preparedness missions are national'
);

select is(
    (select count(*) from public.preparedness_missions
     where code in ('household_emergency_kit',
			'household_communication_readiness',
			'know_your_local_hazards') and mission_scope = 'adaptive'),
    1::bigint,
    'one baseline preparedness mission is adaptive'
);

select is(
    (select count(*) from public.preparedness_missions
     where code in ('household_emergency_kit',
			'household_communication_readiness',
			'know_your_local_hazards')
       and char_length(btrim(title_en)) > 0
       and char_length(btrim(title_ar)) > 0),
    3::bigint,
    'every baseline mission has non-empty English and Arabic titles'
);

select is(
    (select count(*) from public.preparedness_missions
     where code in ('household_emergency_kit',
			'household_communication_readiness',
			'know_your_local_hazards')
       and char_length(btrim(description_en)) > 0
       and char_length(btrim(description_ar)) > 0),
    3::bigint,
    'every baseline mission has non-empty English and Arabic descriptions'
);


/* Verify the real seeded rows are readable through client RLS. */

set local role anon;

select is(
    (select count(*) from public.hazards where code in ('heavy_rain_flash_flooding',
			'extreme_heat_heatwave',
			'dust_sandstorm',
			'earthquake',
			'landslide_rockfall',
			'cold_wave',
			'thunderstorm_lightning_strong_winds',
			'drought_water_scarcity',
			'wildfire_vegetation_fire')),
    9::bigint,
    'guests can read all baseline seeded hazards'
);

reset role;

set local role authenticated;

select is(
    (select count(*) from public.preparedness_missions where code in ('household_emergency_kit',
			'household_communication_readiness',
			'know_your_local_hazards')),
    3::bigint,
    'authenticated users can read all baseline seeded mission definitions'
);

reset role;

select * from finish();

rollback;
