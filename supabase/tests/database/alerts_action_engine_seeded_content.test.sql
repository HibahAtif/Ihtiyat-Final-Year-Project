begin;

create extension if not exists pgtap
	with schema extensions;

select plan(12);


/* ==========================================================================
 * Ihtiyat multi-hazard alert/action seed contract
 * ==========================================================================
 *
 * WHAT:
 * Verifies the production V1 simulation and emergency-action catalogue.
 *
 * WHY:
 * The final application is intentionally multi-hazard rather than rebuilding
 * only the preliminary Jeddah flood proof of concept.
 *
 * Eight hazards receive alert/action scenarios. Drought / water scarcity
 * remains preparedness/resource content because it is a slow-onset resilience
 * topic rather than an urgent response scenario in V1.
 *
 * HOW:
 * These tests define the expected seed contract before the production seed
 * migration is added.
 */


select is(
	(
		select count(*)
		from public.alerts
		where code in (
			'sim_flood_jeddah_severe',
			'sim_heat_eastern_severe',
			'sim_dust_riyadh_severe',
			'sim_earthquake_madinah_severe',
			'sim_rockfall_asir_severe',
			'sim_cold_wave_national_severe',
			'sim_thunderstorm_national_severe',
			'sim_wildfire_national_severe'
		)
	),
	8::bigint,
	'all eight V1 alert-suitable hazards have deterministic simulation records'
);


select is(
	(
		select count(distinct hazard.code)
		from public.alerts as alert
		join public.hazards as hazard
			on hazard.id = alert.hazard_id
		where alert.code in (
			'sim_flood_jeddah_severe',
			'sim_heat_eastern_severe',
			'sim_dust_riyadh_severe',
			'sim_earthquake_madinah_severe',
			'sim_rockfall_asir_severe',
			'sim_cold_wave_national_severe',
			'sim_thunderstorm_national_severe',
			'sim_wildfire_national_severe'
		)
			and hazard.code in (
				'heavy_rain_flash_flooding',
				'extreme_heat_heatwave',
				'dust_sandstorm',
				'earthquake',
				'landslide_rockfall',
				'cold_wave',
				'thunderstorm_lightning_strong_winds',
				'wildfire_vegetation_fire'
			)
	),
	8::bigint,
	'each seeded simulation maps to a distinct intended alert-suitable hazard'
);


select is(
	(
		select count(*)
		from public.alerts
		where code like 'sim\_%' escape '\'
			and origin_type = 'simulated'
			and publication_status = 'published'
			and severity = 3
	),
	8::bigint,
	'all production V1 alert seeds are clearly published severe simulations'
);


select is(
	(
		select count(*)
		from public.alerts
		where code like 'sim\_%' escape '\'
			and char_length(btrim(title_en)) > 0
			and char_length(btrim(title_ar)) > 0
			and char_length(btrim(message_en)) > 0
			and char_length(btrim(message_ar)) > 0
	),
	8::bigint,
	'all seeded simulations contain bilingual user-facing content'
);


select is(
	(
		select count(*)
		from public.alerts as alert
		join public.hazards as hazard
			on hazard.id = alert.hazard_id
		where hazard.code = 'drought_water_scarcity'
	),
	0::bigint,
	'drought and water scarcity are deliberately not seeded as urgent V1 alerts'
);


select is(
	(
		select count(*)
		from public.actions
		where code in (
			'follow_official_directions',
			'check_official_updates',
			'prepare_backup_phone_power',
			'avoid_flooded_routes',
			'avoid_wet_electrical_hazards',
			'move_to_cool_place_and_hydrate',
			'check_vulnerable_household_heat',
			'stay_indoors_reduce_dust_exposure',
			'drive_cautiously_during_dust',
			'take_cover_during_earthquake',
			'avoid_lifts_after_earthquake',
			'avoid_rockfall_prone_areas',
			'keep_safe_distance_from_rockfall',
			'heat_home_safely',
			'avoid_unsafe_indoor_firewood',
			'seek_safe_thunderstorm_shelter',
			'avoid_exposed_thunderstorm_areas',
			'keep_away_from_vegetation_fire'
		)
	),
	18::bigint,
	'the V1 action catalogue contains the expected eighteen reusable safety actions'
);


select is(
	(
		select count(*)
		from public.actions
		where code in (
			'follow_official_directions',
			'check_official_updates',
			'prepare_backup_phone_power',
			'avoid_flooded_routes',
			'avoid_wet_electrical_hazards',
			'move_to_cool_place_and_hydrate',
			'check_vulnerable_household_heat',
			'stay_indoors_reduce_dust_exposure',
			'drive_cautiously_during_dust',
			'take_cover_during_earthquake',
			'avoid_lifts_after_earthquake',
			'avoid_rockfall_prone_areas',
			'keep_safe_distance_from_rockfall',
			'heat_home_safely',
			'avoid_unsafe_indoor_firewood',
			'seek_safe_thunderstorm_shelter',
			'avoid_exposed_thunderstorm_areas',
			'keep_away_from_vegetation_fire'
		)
			and is_active
			and char_length(btrim(title_en)) > 0
			and char_length(btrim(title_ar)) > 0
			and char_length(btrim(instruction_en)) > 0
			and char_length(btrim(instruction_ar)) > 0
	),
	18::bigint,
	'all seeded safety actions are active and bilingual'
);


select is(
	(
		select count(*)
		from public.action_rules
		where code like any (
			array[
				'flood\_%',
				'heat\_%',
				'dust\_%',
				'earthquake\_%',
				'rockfall\_%',
				'cold\_%',
				'thunderstorm\_%',
				'wildfire\_%'
			]
		)
	),
	33::bigint,
	'the V1 multi-hazard deterministic engine contains thirty-three seeded rules'
);


select is(
	(
		select count(distinct hazard.code)
		from public.action_rules as rule
		join public.hazards as hazard
			on hazard.id = rule.hazard_id
		where rule.is_active
			and hazard.code in (
				'heavy_rain_flash_flooding',
				'extreme_heat_heatwave',
				'dust_sandstorm',
				'earthquake',
				'landslide_rockfall',
				'cold_wave',
				'thunderstorm_lightning_strong_winds',
				'wildfire_vegetation_fire'
			)
	),
	8::bigint,
	'action rules cover all eight alert-suitable V1 hazards'
);


select is(
	(
		select count(*)
		from public.action_rules
		where code like any (
			array[
				'flood\_%',
				'heat\_%',
				'dust\_%',
				'earthquake\_%',
				'rockfall\_%',
				'cold\_%',
				'thunderstorm\_%',
				'wildfire\_%'
			]
		)
			and is_active
			and char_length(btrim(reason_en)) > 0
			and char_length(btrim(reason_ar)) > 0
	),
	33::bigint,
	'every seeded action rule has a bilingual inspectable ranking reason'
);


select is(
	(
		select count(*)
		from public.action_rules as rule
		join public.hazards as hazard
			on hazard.id = rule.hazard_id
		where hazard.code = 'drought_water_scarcity'
	),
	0::bigint,
	'drought has no urgent deterministic action rules in V1'
);


set local role anon;

select is(
	(
		select count(*)
		from public.alerts
		where code like 'sim\_%' escape '\'
	),
	8::bigint,
	'guest clients can read all eight published simulation definitions'
);

reset role;


select * from finish();

rollback;