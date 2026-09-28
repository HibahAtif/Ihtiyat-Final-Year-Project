begin;

create extension if not exists pgtap
	with schema extensions;

select plan(30);


/* ==========================================================================
 * Production location-hazard preparedness relevance catalogue
 * ========================================================================== */

select is(
	(select count(*) from public.location_hazard_profiles),
	39::bigint,
	'V1 location-hazard profile catalogue contains exactly 39 mappings'
);

select is(
	(
		select count(*)
		from public.location_hazard_profiles
		where is_active
	),
	39::bigint,
	'all V1 location-hazard profiles are active'
);

select is(
	(
		select count(*)
		from public.location_hazard_profiles as profile
		join public.locations as location
			on location.id = profile.location_id
		where location.location_type = 'region'
	),
	38::bigint,
	'V1 contains exactly 38 regional preparedness-relevance mappings'
);

select is(
	(
		select count(*)
		from public.location_hazard_profiles as profile
		join public.locations as location
			on location.id = profile.location_id
		where location.location_type <> 'region'
	),
	1::bigint,
	'V1 contains exactly one more-granular preparedness-relevance override'
);

select is(
	(
		select count(distinct location.official_code)
		from public.location_hazard_profiles as profile
		join public.locations as location
			on location.id = profile.location_id
		where location.location_type = 'region'
	),
	13::bigint,
	'all 13 Saudi regions have at least one preparedness-relevance mapping'
);

select results_eq(
	$$
		select
			location.official_code,
			location.location_type,
			hazard.code,
			profile.relevance_rank
		from public.location_hazard_profiles as profile
		join public.locations as location
			on location.id = profile.location_id
		join public.hazards as hazard
			on hazard.id = profile.hazard_id
		where location.location_type <> 'region'
	$$,
	$$
		values (
			'0124'::text,
			'governorate'::text,
			'heavy_rain_flash_flooding'::text,
			1::smallint
		)
	$$,
	'the only granular V1 override is Jeddah flood preparedness relevance'
);

select results_eq(
	$$
		select
			relevance_rank,
			count(*)::bigint
		from public.location_hazard_profiles
		group by relevance_rank
		order by relevance_rank
	$$,
	$$
		values
			(1::smallint, 19::bigint),
			(2::smallint, 15::bigint),
			(3::smallint, 5::bigint)
	$$,
	'preparedness relevance ranks have the expected 19/15/5 distribution'
);

select results_eq(
	$$
		select
			hazard.code,
			count(*)::bigint
		from public.location_hazard_profiles as profile
		join public.hazards as hazard
			on hazard.id = profile.hazard_id
		group by hazard.code
		order by hazard.code
	$$,
	$$
		values
			('dust_sandstorm'::text, 8::bigint),
			('earthquake'::text, 4::bigint),
			('extreme_heat_heatwave'::text, 11::bigint),
			('heavy_rain_flash_flooding'::text, 11::bigint),
			('landslide_rockfall'::text, 5::bigint)
	$$,
	'only the five reviewed preparedness hazards have location-priority mappings with expected counts'
);

select is(
	(
		select count(*)
		from public.location_hazard_profiles as profile
		join public.hazards as hazard
			on hazard.id = profile.hazard_id
		where hazard.classification = 'resource_supported'
	),
	0::bigint,
	'resource-supported hazards are not location-prioritised in the V1 matrix'
);

select is(
	(
		select count(*)
		from public.location_hazard_profiles as profile
		join public.hazards as hazard
			on hazard.id = profile.hazard_id
		where hazard.code not in (
			'heavy_rain_flash_flooding',
			'extreme_heat_heatwave',
			'dust_sandstorm',
			'earthquake',
			'landslide_rockfall'
		)
	),
	0::bigint,
	'no unexpected hazard enters the V1 preparedness-relevance matrix'
);

select is(
	(
		select count(*)
		from (
			select
				location_id,
				hazard_id
			from public.location_hazard_profiles
			group by
				location_id,
				hazard_id
		) as distinct_pairs
	),
	39::bigint,
	'all 39 production mappings are unique location-hazard pairs'
);

select is(
	(
		select count(*)
		from public.location_hazard_profiles as profile
		join public.locations as location
			on location.id = profile.location_id
		where not location.is_active
	),
	0::bigint,
	'every mapped production location is active'
);

select is(
	(
		select count(*)
		from public.location_hazard_profiles as profile
		join public.hazards as hazard
			on hazard.id = profile.hazard_id
		where not hazard.is_active
	),
	0::bigint,
	'every mapped production hazard is active'
);


/* ==========================================================================
 * Exact reviewed 13-region matrix + Jeddah override
 * ========================================================================== */

select results_eq(
	$$
		select
			location.official_code,
			hazard.code,
			profile.relevance_rank
		from public.location_hazard_profiles as profile
		join public.locations as location
			on location.id = profile.location_id
		join public.hazards as hazard
			on hazard.id = profile.hazard_id
		order by
			location.official_code,
			hazard.code
	$$,
	$$
		values
			('0001'::text, 'dust_sandstorm'::text, 1::smallint),
			('0001'::text, 'extreme_heat_heatwave'::text, 2::smallint),
			('0001'::text, 'heavy_rain_flash_flooding'::text, 2::smallint),

			('0002'::text, 'earthquake'::text, 2::smallint),
			('0002'::text, 'extreme_heat_heatwave'::text, 1::smallint),
			('0002'::text, 'heavy_rain_flash_flooding'::text, 1::smallint),
			('0002'::text, 'landslide_rockfall'::text, 2::smallint),

			('0003'::text, 'earthquake'::text, 1::smallint),
			('0003'::text, 'extreme_heat_heatwave'::text, 1::smallint),
			('0003'::text, 'heavy_rain_flash_flooding'::text, 2::smallint),
			('0003'::text, 'landslide_rockfall'::text, 2::smallint),

			('0004'::text, 'dust_sandstorm'::text, 2::smallint),
			('0004'::text, 'extreme_heat_heatwave'::text, 2::smallint),

			('0005'::text, 'dust_sandstorm'::text, 1::smallint),
			('0005'::text, 'extreme_heat_heatwave'::text, 1::smallint),

			('0006'::text, 'heavy_rain_flash_flooding'::text, 1::smallint),
			('0006'::text, 'landslide_rockfall'::text, 1::smallint),

			('0007'::text, 'dust_sandstorm'::text, 1::smallint),
			('0007'::text, 'earthquake'::text, 1::smallint),
			('0007'::text, 'extreme_heat_heatwave'::text, 2::smallint),
			('0007'::text, 'heavy_rain_flash_flooding'::text, 2::smallint),

			('0008'::text, 'dust_sandstorm'::text, 2::smallint),
			('0008'::text, 'extreme_heat_heatwave'::text, 3::smallint),
			('0008'::text, 'heavy_rain_flash_flooding'::text, 3::smallint),

			('0009'::text, 'dust_sandstorm'::text, 1::smallint),
			('0009'::text, 'extreme_heat_heatwave'::text, 3::smallint),

			('0010'::text, 'earthquake'::text, 1::smallint),
			('0010'::text, 'extreme_heat_heatwave'::text, 1::smallint),
			('0010'::text, 'heavy_rain_flash_flooding'::text, 1::smallint),
			('0010'::text, 'landslide_rockfall'::text, 2::smallint),

			('0011'::text, 'dust_sandstorm'::text, 2::smallint),
			('0011'::text, 'extreme_heat_heatwave'::text, 2::smallint),
			('0011'::text, 'heavy_rain_flash_flooding'::text, 2::smallint),

			('0012'::text, 'heavy_rain_flash_flooding'::text, 1::smallint),
			('0012'::text, 'landslide_rockfall'::text, 1::smallint),

			('0013'::text, 'dust_sandstorm'::text, 1::smallint),
			('0013'::text, 'extreme_heat_heatwave'::text, 3::smallint),
			('0013'::text, 'heavy_rain_flash_flooding'::text, 3::smallint),

			('0124'::text, 'heavy_rain_flash_flooding'::text, 1::smallint)
	$$,
	'the complete production location-hazard matrix exactly matches the reviewed V1 matrix'
);

select results_eq(
	$$
		select
			location.official_code,
			count(*)::bigint
		from public.location_hazard_profiles as profile
		join public.locations as location
			on location.id = profile.location_id
		where location.location_type = 'region'
		group by location.official_code
		order by location.official_code
	$$,
	$$
		values
			('0001'::text, 3::bigint),
			('0002'::text, 4::bigint),
			('0003'::text, 4::bigint),
			('0004'::text, 2::bigint),
			('0005'::text, 2::bigint),
			('0006'::text, 2::bigint),
			('0007'::text, 4::bigint),
			('0008'::text, 3::bigint),
			('0009'::text, 2::bigint),
			('0010'::text, 4::bigint),
			('0011'::text, 3::bigint),
			('0012'::text, 2::bigint),
			('0013'::text, 3::bigint)
	$$,
	'each of the 13 regions has the expected number of priority mappings'
);

select is(
	(
		select count(*)
		from public.location_hazard_profiles as profile
		join public.locations as location
			on location.id = profile.location_id
		where location.official_code = '0124'
	),
	1::bigint,
	'Jeddah has exactly one direct preparedness-relevance override'
);


/* ==========================================================================
 * Production resolver behaviour — direct mapping, fallback and availability
 * ========================================================================== */

select results_eq(
	$$
		select
			hazard_code,
			is_prioritised,
			relevance_rank,
			matched_location_code,
			hierarchy_distance
		from public.resolve_location_hazards(
			(select id from public.locations where official_code = '0124')
		)
		where hazard_code = 'heavy_rain_flash_flooding'
	$$,
	$$
		values (
			'heavy_rain_flash_flooding'::text,
			true,
			1::smallint,
			'0124'::text,
			0
		)
	$$,
	'Jeddah resolves flooding from its direct local override'
);

select results_eq(
	$$
		select
			hazard_code,
			is_prioritised,
			relevance_rank,
			matched_location_code,
			hierarchy_distance
		from public.resolve_location_hazards(
			(select id from public.locations where official_code = '0124')
		)
		where hazard_code = 'extreme_heat_heatwave'
	$$,
	$$
		values (
			'extreme_heat_heatwave'::text,
			true,
			1::smallint,
			'0002'::text,
			1
		)
	$$,
	'Jeddah inherits Makkah Region heat preparedness relevance'
);

select results_eq(
	$$
		select
			hazard_code,
			is_prioritised,
			relevance_rank,
			matched_location_code,
			hierarchy_distance
		from public.resolve_location_hazards(
			(select id from public.locations where official_code = '0162')
		)
		where hazard_code = 'extreme_heat_heatwave'
	$$,
	$$
		values (
			'extreme_heat_heatwave'::text,
			true,
			1::smallint,
			'0005'::text,
			1
		)
	$$,
	'Dammam inherits Eastern Region heat preparedness relevance'
);

select results_eq(
	$$
		select
			hazard_code,
			is_prioritised,
			relevance_rank,
			matched_location_code,
			hierarchy_distance
		from public.resolve_location_hazards(
			(select id from public.locations where official_code = '0162')
		)
		where hazard_code = 'earthquake'
	$$,
	$$
		values (
			'earthquake'::text,
			false,
			null::smallint,
			null::text,
			null::integer
		)
	$$,
	'an unmapped core hazard remains available but unprioritised for Dammam'
);

select results_eq(
	$$
		select
			hazard_code,
			is_prioritised,
			relevance_rank,
			matched_location_code,
			hierarchy_distance
		from public.resolve_location_hazards(
			(select id from public.locations where official_code = '0100')
		)
		where hazard_code = 'dust_sandstorm'
	$$,
	$$
		values (
			'dust_sandstorm'::text,
			true,
			1::smallint,
			'0001'::text,
			1
		)
	$$,
	'Riyadh headquarters inherits Riyadh Region dust preparedness relevance'
);

select results_eq(
	$$
		select
			hazard_code,
			is_prioritised,
			relevance_rank,
			matched_location_code,
			hierarchy_distance
		from public.resolve_location_hazards(
			(select id from public.locations where official_code = '0193')
		)
		where hazard_code = 'earthquake'
	$$,
	$$
		values (
			'earthquake'::text,
			true,
			1::smallint,
			'0007'::text,
			1
		)
	$$,
	'Tabuk headquarters inherits Tabuk Region earthquake preparedness relevance'
);

select results_eq(
	$$
		select
			hazard_code,
			is_prioritised,
			relevance_rank,
			matched_location_code,
			hierarchy_distance
		from public.resolve_location_hazards(
			(select id from public.locations where official_code = '0175')
		)
		where hazard_code = 'landslide_rockfall'
	$$,
	$$
		values (
			'landslide_rockfall'::text,
			true,
			1::smallint,
			'0006'::text,
			1
		)
	$$,
	'Abha inherits Asir Region landslide and rockfall preparedness relevance'
);

select results_eq(
	$$
		select
			hazard_code,
			is_prioritised,
			relevance_rank,
			matched_location_code,
			hierarchy_distance
		from public.resolve_location_hazards(
			(select id from public.locations where official_code = '0237')
		)
		where hazard_code = 'landslide_rockfall'
	$$,
	$$
		values (
			'landslide_rockfall'::text,
			true,
			1::smallint,
			'0012'::text,
			1
		)
	$$,
	'Al-Baha headquarters inherits Al-Baha Region landslide and rockfall preparedness relevance'
);

select results_eq(
	$$
		select
			hazard_code,
			is_prioritised,
			relevance_rank,
			matched_location_code,
			hierarchy_distance
		from public.resolve_location_hazards(
			(select id from public.locations where official_code = '0005')
		)
		where hazard_code = 'dust_sandstorm'
	$$,
	$$
		values (
			'dust_sandstorm'::text,
			true,
			1::smallint,
			'0005'::text,
			0
		)
	$$,
	'selecting Eastern Region directly resolves its own dust mapping at distance zero'
);

select results_eq(
	$$
		select
			hazard_code,
			is_prioritised,
			relevance_rank,
			matched_location_code,
			hierarchy_distance
		from public.resolve_location_hazards(
			(select id from public.locations where official_code = '0162')
		)
		where hazard_code = 'cold_wave'
	$$,
	$$
		values (
			'cold_wave'::text,
			false,
			null::smallint,
			null::text,
			null::integer
		)
	$$,
	'a resource-supported hazard remains available through the resolver even without a location-priority mapping'
);


/* ==========================================================================
 * Client visibility of production profiles and resolver
 * ========================================================================== */

set local role anon;

select is(
	(select count(*) from public.location_hazard_profiles),
	39::bigint,
	'guest clients can read all active production location-hazard profiles'
);

select results_eq(
	$$
		select
			hazard_code,
			is_prioritised,
			relevance_rank,
			matched_location_code,
			hierarchy_distance
		from public.resolve_location_hazards(
			(select id from public.locations where official_code = '0162')
		)
		where hazard_code = 'dust_sandstorm'
	$$,
	$$
		values (
			'dust_sandstorm'::text,
			true,
			1::smallint,
			'0005'::text,
			1
		)
	$$,
	'guest clients can resolve inherited production preparedness relevance'
);

reset role;

set local role authenticated;

select is(
	(select count(*) from public.location_hazard_profiles),
	39::bigint,
	'authenticated clients can read all active production location-hazard profiles'
);

select results_eq(
	$$
		select
			hazard_code,
			is_prioritised,
			relevance_rank,
			matched_location_code,
			hierarchy_distance
		from public.resolve_location_hazards(
			(select id from public.locations where official_code = '0124')
		)
		where hazard_code = 'heavy_rain_flash_flooding'
	$$,
	$$
		values (
			'heavy_rain_flash_flooding'::text,
			true,
			1::smallint,
			'0124'::text,
			0
		)
	$$,
	'authenticated clients can resolve the Jeddah production override'
);

reset role;


select * from finish();

rollback;
