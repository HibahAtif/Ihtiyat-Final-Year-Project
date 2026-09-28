begin;

create extension if not exists pgtap
	with schema extensions;

select plan(12);


/* ==========================================================================
 * Multi-hazard seed relationships and deterministic rule fixtures
 * ========================================================================== */


/* --------------------------------------------------------------------------
 * Alert geography
 * -------------------------------------------------------------------------- */

select results_eq(
	$$
		select
			alert.code,
			location.official_code
		from public.alerts as alert
		join public.alert_locations as link
			on link.alert_id = alert.id
		join public.locations as location
			on location.id = link.location_id
		where alert.code in (
			'sim_flood_jeddah_severe',
			'sim_heat_eastern_severe',
			'sim_dust_riyadh_severe',
			'sim_earthquake_madinah_severe',
			'sim_rockfall_asir_severe'
		)
		order by alert.code
	$$,
	$$
		values
			('sim_dust_riyadh_severe'::text, '0001'::text),
			('sim_earthquake_madinah_severe'::text, '0003'::text),
			('sim_flood_jeddah_severe'::text, '0124'::text),
			('sim_heat_eastern_severe'::text, '0005'::text),
			('sim_rockfall_asir_severe'::text, '0006'::text)
	$$,
	'the five location-specific simulations map to the intended curated Saudi locations'
);


select is(
	(
		select count(*)
		from public.alert_locations as link
		join public.alerts as alert
			on alert.id = link.alert_id
		where alert.code in (
			'sim_cold_wave_national_severe',
			'sim_thunderstorm_national_severe',
			'sim_wildfire_national_severe'
		)
	),
	0::bigint,
	'national simulation records deliberately have no location-link rows'
);


/* --------------------------------------------------------------------------
 * Exact preliminary-report flood trace
 * -------------------------------------------------------------------------- */

select results_eq(
	$$
		select
			rule.min_severity,
			rule.base_priority,
			rule.safety_override,
			rule.safety_override_min_severity
		from public.action_rules as rule
		where rule.code = 'flood_follow_official_directions'
	$$,
	$$
		values (
			3::smallint,
			130::integer,
			1000::integer,
			3::smallint
		)
	$$,
	'the severe flood official-directions rule preserves the documented 130 plus 1000 ranking fixture'
);


select results_eq(
	$$
		select
			rule.min_severity,
			rule.base_priority,
			rule.safety_override,
			rule.safety_override_min_severity
		from public.action_rules as rule
		where rule.code = 'flood_avoid_flooded_routes'
	$$,
	$$
		values (
			2::smallint,
			110::integer,
			800::integer,
			2::smallint
		)
	$$,
	'the flood-route rule preserves the documented 110 plus 800 ranking fixture'
);


select results_eq(
	$$
		select
			rule.min_severity,
			rule.base_priority,
			rule.safety_override,
			rule.safety_override_min_severity
		from public.action_rules as rule
		where rule.code = 'flood_check_official_updates'
	$$,
	$$
		values (
			1::smallint,
			90::integer,
			500::integer,
			1::smallint
		)
	$$,
	'the flood official-updates rule preserves the documented 90 plus 500 ranking fixture'
);

select results_eq(
	$$
		select
			rule.min_severity,
			rule.base_priority,
			rule.safety_override,
			rule.safety_override_min_severity
		from public.action_rules as rule
		where rule.code = 'flood_avoid_wet_electrical_hazards'
	$$,
	$$
		values (
			2::smallint,
			85::integer,
			400::integer,
			2::smallint
		)
	$$,
	'the flood electrical-hazard rule remains below the documented top-three severe ranking trace'
);


/* --------------------------------------------------------------------------
 * Preparedness-state integration
 * -------------------------------------------------------------------------- */

select results_eq(
	$$
		select
			task.code,
			rule.incomplete_task_boost
		from public.action_rules as rule
		join public.mission_tasks as task
			on task.id = rule.linked_task_id
		where rule.code = 'flood_prepare_backup_phone_power'
	$$,
	$$
		values (
			'kit_phone_backup_power'::text,
			25::integer
		)
	$$,
	'the flood backup-power action is linked to the real mission task with the documented 25-point incomplete-task boost'
);


select is(
	(
		select count(*)
		from public.action_rules
		where linked_task_id is not null
			and incomplete_task_boost > 0
	),
	1::bigint,
	'V1 contains one deliberately scoped task-linked boosted rule'
);


/* --------------------------------------------------------------------------
 * Household-aware extreme-heat integration
 * -------------------------------------------------------------------------- */

select results_eq(
	$$
		select
			rule.code,
			rule.min_children_count,
			rule.min_older_adults_count
		from public.action_rules as rule
		where rule.code in (
			'heat_check_children',
			'heat_check_older_adults'
		)
		order by rule.code
	$$,
	$$
		values
			(
				'heat_check_children'::text,
				1::smallint,
				null::smallint
			),
			(
				'heat_check_older_adults'::text,
				null::smallint,
				1::smallint
			)
	$$,
	'heat-specific household rules distinguish children and older adults without treating unknown values as zero'
);


select is(
	(
		select count(distinct rule.action_id)
		from public.action_rules as rule
		where rule.code in (
			'heat_check_children',
			'heat_check_older_adults'
		)
	),
	1::bigint,
	'both heat household conditions intentionally point to the same user-facing safety action'
);


select is(
	(
		select count(*)
		from public.action_rules
		where min_children_count is not null
			or min_older_adults_count is not null
	),
	2::bigint,
	'only the two evidence-backed heat rules use household composition in V1'
);


/* --------------------------------------------------------------------------
 * Baseline rule geography
 * -------------------------------------------------------------------------- */

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
			and location_id is not null
	),
	0::bigint,
	'baseline action rules are hazard-reusable rather than duplicated per region'
);


select * from finish();

rollback;