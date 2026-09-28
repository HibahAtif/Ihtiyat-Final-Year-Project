begin;


/* --------------------------------------------------------------------------
 * LOCATION-HAZARD PREPAREDNESS RELEVANCE PROFILES
 * --------------------------------------------------------------------------
 *
 * Seeds the evidence-reviewed V1 preparedness relevance matrix for all
 * 13 Saudi regions, plus one Jeddah Governorate flood override.
 *
 * IMPORTANT:
 * relevance_rank is an Ihtiyat application-level preparedness-content
 * priority. It does NOT represent:
 *   - alert severity;
 *   - current event severity;
 *   - probability of occurrence;
 *   - scientific hazard intensity;
 *   - a formal governmental risk classification.
 *
 * Application meaning:
 *   1 = primary preparedness relevance
 *   2 = secondary preparedness relevance
 *   3 = contextual preparedness relevance
 *
 * An active hazard with no row for a location remains available through
 * the preparedness catalogue. Absence from this table means only that the
 * hazard is not prioritised for that location.
 * 
 */


/* --------------------------------------------------------------------------
 * Controlled seed manifest
 * -------------------------------------------------------------------------- */

create temporary table seed_location_hazard_profiles_manifest (
	location_code text not null,
	hazard_code text not null,
	relevance_rank smallint not null,

	constraint seed_location_hazard_profiles_location_code
		check (location_code ~ '^[0-9]{4}$'),

	constraint seed_location_hazard_profiles_hazard_code
		check (hazard_code ~ '^[a-z0-9_]+$'),

	constraint seed_location_hazard_profiles_rank
		check (relevance_rank between 1 and 3)
) on commit drop;


insert into seed_location_hazard_profiles_manifest (
	location_code,
	hazard_code,
	relevance_rank
)
values
	('0001', 'heavy_rain_flash_flooding', 2),
	('0001', 'extreme_heat_heatwave', 2),
	('0001', 'dust_sandstorm', 1),
	('0002', 'heavy_rain_flash_flooding', 1),
	('0002', 'extreme_heat_heatwave', 1),
	('0002', 'earthquake', 2),
	('0002', 'landslide_rockfall', 2),
	('0003', 'heavy_rain_flash_flooding', 2),
	('0003', 'extreme_heat_heatwave', 1),
	('0003', 'earthquake', 1),
	('0003', 'landslide_rockfall', 2),
	('0004', 'extreme_heat_heatwave', 2),
	('0004', 'dust_sandstorm', 2),
	('0005', 'extreme_heat_heatwave', 1),
	('0005', 'dust_sandstorm', 1),
	('0006', 'heavy_rain_flash_flooding', 1),
	('0006', 'landslide_rockfall', 1),
	('0007', 'heavy_rain_flash_flooding', 2),
	('0007', 'extreme_heat_heatwave', 2),
	('0007', 'dust_sandstorm', 1),
	('0007', 'earthquake', 1),
	('0008', 'heavy_rain_flash_flooding', 3),
	('0008', 'extreme_heat_heatwave', 3),
	('0008', 'dust_sandstorm', 2),
	('0009', 'extreme_heat_heatwave', 3),
	('0009', 'dust_sandstorm', 1),
	('0010', 'heavy_rain_flash_flooding', 1),
	('0010', 'extreme_heat_heatwave', 1),
	('0010', 'earthquake', 1),
	('0010', 'landslide_rockfall', 2),
	('0011', 'heavy_rain_flash_flooding', 2),
	('0011', 'extreme_heat_heatwave', 2),
	('0011', 'dust_sandstorm', 2),
	('0012', 'heavy_rain_flash_flooding', 1),
	('0012', 'landslide_rockfall', 1),
	('0013', 'heavy_rain_flash_flooding', 3),
	('0013', 'extreme_heat_heatwave', 3),
	('0013', 'dust_sandstorm', 1),
	('0124', 'heavy_rain_flash_flooding', 1);


/* --------------------------------------------------------------------------
 * Validate the reviewed manifest before inserting production rows
 * -------------------------------------------------------------------------- */

do $$
declare
	seed_count integer;
	region_location_count integer;
	granular_location_count integer;
	duplicate_pair_count integer;
	missing_location_count integer;
	missing_hazard_count integer;
	inactive_location_count integer;
	inactive_hazard_count integer;
	unsupported_hazard_count integer;
	preexisting_pair_count integer;
begin
	select count(*)
	into seed_count
	from seed_location_hazard_profiles_manifest;

	if seed_count <> 39 then
		raise exception
			'Location-hazard profile seed expected 39 rows but found %.',
			seed_count;
	end if;

	select count(distinct manifest.location_code)
	into region_location_count
	from seed_location_hazard_profiles_manifest as manifest
	join public.locations as location
		on location.official_code = manifest.location_code
	where location.location_type = 'region';

	if region_location_count <> 13 then
		raise exception
			'Location-hazard profile seed expected coverage for all 13 regions but found %.',
			region_location_count;
	end if;

	select count(distinct manifest.location_code)
	into granular_location_count
	from seed_location_hazard_profiles_manifest as manifest
	join public.locations as location
		on location.official_code = manifest.location_code
	where location.location_type <> 'region';

	if granular_location_count <> 1 then
		raise exception
			'Location-hazard profile seed expected exactly one granular override location but found %.',
			granular_location_count;
	end if;

	if not exists (
		select 1
		from seed_location_hazard_profiles_manifest
		where location_code = '0124'
			and hazard_code = 'heavy_rain_flash_flooding'
			and relevance_rank = 1
	) then
		raise exception
			'Expected Jeddah 0124 flood relevance override is missing.';
	end if;

	select count(*)
	into duplicate_pair_count
	from (
		select
			location_code,
			hazard_code
		from seed_location_hazard_profiles_manifest
		group by
			location_code,
			hazard_code
		having count(*) > 1
	) as duplicate_pairs;

	if duplicate_pair_count <> 0 then
		raise exception
			'Location-hazard profile seed contains % duplicate location-hazard pair(s).',
			duplicate_pair_count;
	end if;

	select count(*)
	into missing_location_count
	from seed_location_hazard_profiles_manifest as manifest
	left join public.locations as location
		on location.official_code = manifest.location_code
	where location.id is null;

	if missing_location_count <> 0 then
		raise exception
			'Location-hazard profile seed references % unknown location code(s).',
			missing_location_count;
	end if;

	select count(*)
	into missing_hazard_count
	from seed_location_hazard_profiles_manifest as manifest
	left join public.hazards as hazard
		on hazard.code = manifest.hazard_code
	where hazard.id is null;

	if missing_hazard_count <> 0 then
		raise exception
			'Location-hazard profile seed references % unknown hazard code(s).',
			missing_hazard_count;
	end if;

	select count(*)
	into inactive_location_count
	from seed_location_hazard_profiles_manifest as manifest
	join public.locations as location
		on location.official_code = manifest.location_code
	where not location.is_active;

	if inactive_location_count <> 0 then
		raise exception
			'Location-hazard profile seed references % inactive location(s).',
			inactive_location_count;
	end if;

	select count(*)
	into inactive_hazard_count
	from seed_location_hazard_profiles_manifest as manifest
	join public.hazards as hazard
		on hazard.code = manifest.hazard_code
	where not hazard.is_active;

	if inactive_hazard_count <> 0 then
		raise exception
			'Location-hazard profile seed references % inactive hazard(s).',
			inactive_hazard_count;
	end if;

	select count(*)
	into unsupported_hazard_count
	from seed_location_hazard_profiles_manifest as manifest
	join public.hazards as hazard
		on hazard.code = manifest.hazard_code
	where hazard.classification not in (
		'core',
		'supported_regional'
	);

	if unsupported_hazard_count <> 0 then
		raise exception
			'Location-hazard profile seed contains % resource-supported hazard mapping(s), which are outside V1 preparedness prioritisation.',
			unsupported_hazard_count;
	end if;

	select count(*)
	into preexisting_pair_count
	from seed_location_hazard_profiles_manifest as manifest
	join public.locations as location
		on location.official_code = manifest.location_code
	join public.hazards as hazard
		on hazard.code = manifest.hazard_code
	join public.location_hazard_profiles as existing_profile
		on existing_profile.location_id = location.id
		and existing_profile.hazard_id = hazard.id;

	if preexisting_pair_count <> 0 then
		raise exception
			'Location-hazard profile seed contains % pair(s) already present in public.location_hazard_profiles.',
			preexisting_pair_count;
	end if;
end;
$$;


/* --------------------------------------------------------------------------
 * Insert the verified production profiles
 * -------------------------------------------------------------------------- */

insert into public.location_hazard_profiles (
	location_id,
	hazard_id,
	relevance_rank,
	is_active
)
select
	location.id,
	hazard.id,
	manifest.relevance_rank,
	true
from seed_location_hazard_profiles_manifest as manifest
join public.locations as location
	on location.official_code = manifest.location_code
	and location.is_active
join public.hazards as hazard
	on hazard.code = manifest.hazard_code
	and hazard.is_active
order by
	manifest.location_code,
	manifest.relevance_rank,
	hazard.sort_order;


/* --------------------------------------------------------------------------
 * Validate the resulting V1 production profile catalogue
 * -------------------------------------------------------------------------- */

do $$
declare
	profile_count integer;
	region_profile_count integer;
	jeddah_profile_count integer;
	resource_supported_count integer;
begin
	select count(*)
	into profile_count
	from public.location_hazard_profiles;

	if profile_count <> 39 then
		raise exception
			'Final V1 location-hazard profile catalogue expected 39 rows but found %.',
			profile_count;
	end if;

	select count(*)
	into region_profile_count
	from public.location_hazard_profiles as profile
	join public.locations as location
		on location.id = profile.location_id
	where location.location_type = 'region';

	if region_profile_count <> 38 then
		raise exception
			'Final V1 regional hazard-profile catalogue expected 38 rows but found %.',
			region_profile_count;
	end if;

	select count(*)
	into jeddah_profile_count
	from public.location_hazard_profiles as profile
	join public.locations as location
		on location.id = profile.location_id
	join public.hazards as hazard
		on hazard.id = profile.hazard_id
	where location.official_code = '0124'
		and hazard.code = 'heavy_rain_flash_flooding'
		and profile.relevance_rank = 1
		and profile.is_active;

	if jeddah_profile_count <> 1 then
		raise exception
			'Final V1 catalogue expected exactly one active Jeddah flood override but found %.',
			jeddah_profile_count;
	end if;

	select count(*)
	into resource_supported_count
	from public.location_hazard_profiles as profile
	join public.hazards as hazard
		on hazard.id = profile.hazard_id
	where hazard.classification = 'resource_supported';

	if resource_supported_count <> 0 then
		raise exception
			'Final V1 catalogue expected no resource-supported hazard profiles but found %.',
			resource_supported_count;
	end if;
end;
$$;


commit;
