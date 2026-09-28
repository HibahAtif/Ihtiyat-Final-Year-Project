begin;

create extension if not exists pgtap
	with schema extensions;

select plan(20);


/* ==========================================================================
 * Expanded Saudi location catalogue — production seed verification
 * ========================================================================== */

select is(
	(select count(*) from public.locations),
	166::bigint,
	'V1 location catalogue contains exactly 166 locations'
);

select is(
	(
		select count(*)
		from public.locations
		where location_type = 'region'
	),
	13::bigint,
	'V1 location catalogue contains exactly 13 regions'
);

select is(
	(
		select count(*)
		from public.locations
		where location_type = 'emirate_headquarters'
	),
	13::bigint,
	'V1 location catalogue contains exactly 13 emirate headquarters'
);

select is(
	(
		select count(*)
		from public.locations
		where location_type = 'governorate'
	),
	140::bigint,
	'V1 location catalogue contains exactly 140 governorates'
);

select is(
	(
		select count(*)
		from public.locations
		where location_type = 'administrative_centre'
	),
	0::bigint,
	'V1 location catalogue deliberately contains no administrative centres'
);

select is(
	(
		select count(distinct official_code)
		from public.locations
	),
	166::bigint,
	'every V1 location has a unique official code'
);

select is(
	(
		select count(*)
		from public.locations
		where is_active
	),
	166::bigint,
	'all V1 catalogue locations are active'
);

select is(
	(
		select count(*)
		from public.locations
		where char_length(btrim(name_en)) > 0
			and char_length(btrim(name_ar)) > 0
			and name_en = btrim(name_en)
			and name_ar = btrim(name_ar)
	),
	166::bigint,
	'every V1 location has non-empty trimmed English and Arabic names'
);

select is(
	(
		select count(*)
		from public.locations
		where location_type = 'region'
			and parent_id is null
	),
	13::bigint,
	'all 13 regions remain top-level locations with no parent'
);

select is(
	(
		select count(*)
		from public.locations as child_location
		left join public.locations as parent_region
			on parent_region.id = child_location.parent_id
		where child_location.location_type <> 'region'
			and (
				parent_region.id is null
				or parent_region.location_type <> 'region'
			)
	),
	0::bigint,
	'every granular V1 location has a valid region parent'
);


/* ==========================================================================
 * Exact regional baseline
 * ========================================================================== */

select results_eq(
	$$
		select
			official_code,
			name_en
		from public.locations
		where location_type = 'region'
		order by official_code
	$$,
	$$
		values
			('0001'::text, 'Riyadh Region'::text),
			('0002'::text, 'Makkah Region'::text),
			('0003'::text, 'Madinah Region'::text),
			('0004'::text, 'Qassim Region'::text),
			('0005'::text, 'Eastern Region'::text),
			('0006'::text, 'Asir Region'::text),
			('0007'::text, 'Tabuk Region'::text),
			('0008'::text, 'Hail Region'::text),
			('0009'::text, 'Northern Borders Region'::text),
			('0010'::text, 'Jazan Region'::text),
			('0011'::text, 'Najran Region'::text),
			('0012'::text, 'Al-Baha Region'::text),
			('0013'::text, 'Al-Jouf Region'::text)
	$$,
	'the 13 expected regional codes and English names are present'
);


/* ==========================================================================
 * Emirate-headquarters hierarchy
 * ========================================================================== */

select results_eq(
	$$
		select
			parent_region.official_code as parent_region_code,
			headquarters.official_code as headquarters_code,
			headquarters.name_en
		from public.locations as headquarters
		join public.locations as parent_region
			on parent_region.id = headquarters.parent_id
		where headquarters.location_type = 'emirate_headquarters'
		order by parent_region.official_code
	$$,
	$$
		values
			('0001'::text, '0100'::text, 'Riyadh'::text),
			('0002'::text, '0123'::text, 'Makkah'::text),
			('0003'::text, '0140'::text, 'Madinah'::text),
			('0004'::text, '0149'::text, 'Buraydah'::text),
			('0005'::text, '0162'::text, 'Dammam'::text),
			('0006'::text, '0175'::text, 'Abha'::text),
			('0007'::text, '0193'::text, 'Tabuk'::text),
			('0008'::text, '0200'::text, 'Hail'::text),
			('0009'::text, '0209'::text, 'Arar'::text),
			('0010'::text, '0213'::text, 'Jazan'::text),
			('0011'::text, '0230'::text, 'Najran'::text),
			('0012'::text, '0237'::text, 'Al-Baha'::text),
			('0013'::text, '0247'::text, 'Sakaka'::text)
	$$,
	'each region has the expected emirate-headquarters location'
);


/* ==========================================================================
 * Governorate distribution
 * ========================================================================== */

select results_eq(
	$$
		select
			parent_region.official_code as parent_region_code,
			count(*)::bigint as governorate_count
		from public.locations as governorate
		join public.locations as parent_region
			on parent_region.id = governorate.parent_id
		where governorate.location_type = 'governorate'
		group by parent_region.official_code
		order by parent_region.official_code
	$$,
	$$
		values
			('0001'::text, 22::bigint),
			('0002'::text, 16::bigint),
			('0003'::text, 8::bigint),
			('0004'::text, 13::bigint),
			('0005'::text, 12::bigint),
			('0006'::text, 18::bigint),
			('0007'::text, 6::bigint),
			('0008'::text, 8::bigint),
			('0009'::text, 3::bigint),
			('0010'::text, 16::bigint),
			('0011'::text, 6::bigint),
			('0012'::text, 9::bigint),
			('0013'::text, 3::bigint)
	$$,
	'governorate counts match the audited V1 catalogue for all 13 regions'
);


/* ==========================================================================
 * Existing Jeddah row and selected audited records
 * ========================================================================== */

select results_eq(
	$$
		select
			location.official_code,
			location.location_type,
			location.name_en,
			location.name_ar,
			parent_region.official_code as parent_region_code
		from public.locations as location
		join public.locations as parent_region
			on parent_region.id = location.parent_id
		where location.official_code = '0124'
	$$,
	$$
		values (
			'0124'::text,
			'governorate'::text,
			'Jeddah'::text,
			'جدة'::text,
			'0002'::text
		)
	$$,
	'Jeddah 0124 exists exactly once as a Makkah Region governorate'
);

select results_eq(
	$$
		select
			official_code,
			name_en
		from public.locations
		where official_code in (
			'0115',
			'0153',
			'0171',
			'0179',
			'0186',
			'0225',
			'0228',
			'0236'
		)
		order by official_code
	$$,
	$$
		values
			('0115'::text, 'Ramah'::text),
			('0153'::text, 'Al-Bukayriyyah'::text),
			('0171'::text, 'Al-Nuayriyah'::text),
			('0179'::text, 'Mahayil Asir'::text),
			('0186'::text, 'Al-Majaridah'::text),
			('0225'::text, 'Al-Aridah'::text),
			('0228'::text, 'Fayfa'::text),
			('0236'::text, 'Khibash'::text)
	$$,
	'the eight English labels from the final consistency audit are seeded'
);

select results_eq(
	$$
		select
			location.official_code,
			location.name_en,
			parent_region.official_code as parent_region_code
		from public.locations as location
		join public.locations as parent_region
			on parent_region.id = location.parent_id
		where location.official_code = '0251'
	$$,
	$$
		values (
			'0251'::text,
			'Abanat'::text,
			'0004'::text
		)
	$$,
	'Abanat 0251 is present under Qassim Region'
);

select results_eq(
	$$
		select
			location.official_code,
			location.name_en,
			parent_region.official_code as parent_region_code
		from public.locations as location
		join public.locations as parent_region
			on parent_region.id = location.parent_id
		where location.official_code = '0253'
	$$,
	$$
		values (
			'0253'::text,
			'Al-Farshah'::text,
			'0006'::text
		)
	$$,
	'Al-Farshah 0253 is present under Asir Region'
);

select is(
	(
		select count(*)
		from public.locations
		where official_code = '0252'
	),
	0::bigint,
	'official code 0252 is intentionally absent from the audited V1 catalogue'
);


/* ==========================================================================
 * Client-readable production catalogue
 * ========================================================================== */

set local role anon;

select is(
	(select count(*) from public.locations),
	166::bigint,
	'guest clients can read the complete active V1 location catalogue'
);

reset role;

set local role authenticated;

select is(
	(select count(*) from public.locations),
	166::bigint,
	'authenticated clients can read the complete active V1 location catalogue'
);

reset role;


select * from finish();

rollback;
