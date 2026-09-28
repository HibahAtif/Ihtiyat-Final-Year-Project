begin;

create extension if not exists pgtap
	with schema extensions;

select plan(21);


/* ==========================================================================
 * Location-hazard resolver: function structure and access
 * ========================================================================== */

select ok(
	to_regprocedure(
		'public.resolve_location_hazards(bigint)'
	) is not null,
	'location-hazard resolver function exists'
);

select ok(
	not (
		select prosecdef
		from pg_proc
		where oid =
			'public.resolve_location_hazards(bigint)'::regprocedure
	),
	'location-hazard resolver uses SECURITY INVOKER'
);

select is(
	(
		select provolatile
		from pg_proc
		where oid =
			'public.resolve_location_hazards(bigint)'::regprocedure
	),
	's'::"char",
	'location-hazard resolver is declared STABLE'
);

select ok(
	exists (
		select 1
		from pg_proc
		cross join lateral unnest(
			coalesce(pg_proc.proconfig, '{}'::text[])
		) as config(setting)
		where pg_proc.oid =
				'public.resolve_location_hazards(bigint)'::regprocedure
			and config.setting like 'search_path=%'
	),
	'location-hazard resolver pins its search_path'
);

select ok(
	has_function_privilege(
		'anon',
		'public.resolve_location_hazards(bigint)',
		'EXECUTE'
	),
	'guests may execute the location-hazard resolver'
);

select ok(
	has_function_privilege(
		'authenticated',
		'public.resolve_location_hazards(bigint)',
		'EXECUTE'
	),
	'authenticated users may execute the location-hazard resolver'
);

select ok(
	has_function_privilege(
		'service_role',
		'public.resolve_location_hazards(bigint)',
		'EXECUTE'
	),
	'service_role may execute the location-hazard resolver'
);


/* ==========================================================================
 * Controlled fictional fixtures
 * --------------------------------------------------------------------------
 *
 * These rows exist only inside this rolled-back pgTAP transaction.
 * They do not describe real Saudi hazard relevance.
 * ========================================================================== */

insert into public.locations (
	parent_id,
	official_code,
	location_type,
	name_en,
	name_ar,
	is_active
)
values (
	null,
	'9901',
	'region',
	'Test Region',
	'منطقة اختبارية',
	true
);

insert into public.locations (
	parent_id,
	official_code,
	location_type,
	name_en,
	name_ar,
	is_active
)
values (
	(
		select id
		from public.locations
		where official_code = '9901'
	),
	'9902',
	'governorate',
	'Test Governorate',
	'محافظة اختبارية',
	true
);

insert into public.locations (
	parent_id,
	official_code,
	location_type,
	name_en,
	name_ar,
	is_active
)
values (
	(
		select id
		from public.locations
		where official_code = '9902'
	),
	'9903',
	'administrative_centre',
	'Test Administrative Centre',
	'مركز إداري اختباري',
	true
);

insert into public.locations (
	parent_id,
	official_code,
	location_type,
	name_en,
	name_ar,
	is_active
)
values (
	(
		select id
		from public.locations
		where official_code = '9901'
	),
	'9904',
	'governorate',
	'Inactive Test Governorate',
	'محافظة اختبارية غير نشطة',
	false
);

insert into public.hazards (
	code,
	name_en,
	name_ar,
	classification,
	sort_order,
	is_active
)
values
	(
		'test_local_override_hazard',
		'Test Local Override Hazard',
		'خطر اختباري للتجاوز المحلي',
		'core',
		910,
		true
	),
	(
		'test_parent_fallback_hazard',
		'Test Parent Fallback Hazard',
		'خطر اختباري للرجوع إلى الموقع الأب',
		'core',
		920,
		true
	),
	(
		'test_inactive_local_mapping_hazard',
		'Test Inactive Local Mapping Hazard',
		'خطر اختباري لتجاهل الارتباط غير النشط',
		'core',
		930,
		true
	),
	(
		'test_unmapped_hazard',
		'Test Unmapped Hazard',
		'خطر اختباري غير مرتبط',
		'core',
		940,
		true
	),
	(
		'test_inactive_hazard',
		'Test Inactive Hazard',
		'خطر اختباري غير نشط',
		'core',
		950,
		false
	);

insert into public.location_hazard_profiles (
	location_id,
	hazard_id,
	relevance_rank,
	is_active
)
values
	(
		(select id from public.locations where official_code = '9901'),
		(select id from public.hazards where code = 'test_local_override_hazard'),
		3,
		true
	),
	(
		(select id from public.locations where official_code = '9902'),
		(select id from public.hazards where code = 'test_local_override_hazard'),
		1,
		true
	),
	(
		(select id from public.locations where official_code = '9901'),
		(select id from public.hazards where code = 'test_parent_fallback_hazard'),
		2,
		true
	),
	(
		(select id from public.locations where official_code = '9901'),
		(select id from public.hazards where code = 'test_inactive_local_mapping_hazard'),
		2,
		true
	),
	(
		(select id from public.locations where official_code = '9902'),
		(select id from public.hazards where code = 'test_inactive_local_mapping_hazard'),
		1,
		false
	);


/* ==========================================================================
 * Input validation
 * ========================================================================== */

select throws_ok(
	$$
		select *
		from public.resolve_location_hazards(null)
	$$,
	'22023',
	'A location must be selected.',
	'NULL location input is rejected'
);

select throws_ok(
	$$
		select *
		from public.resolve_location_hazards(-999)
	$$,
	'22023',
	'Selected location is unavailable.',
	'unknown locations are rejected'
);

select throws_ok(
	$$
		select *
		from public.resolve_location_hazards(
			(
				select id
				from public.locations
				where official_code = '9904'
			)
		)
	$$,
	'22023',
	'Selected location is unavailable.',
	'inactive selected locations are rejected'
);


/* ==========================================================================
 * Nearest-location resolution and ancestor fallback
 * ========================================================================== */

select results_eq(
	$$
		select
			is_prioritised,
			relevance_rank,
			matched_location_code,
			hierarchy_distance
		from public.resolve_location_hazards(
			(
				select id
				from public.locations
				where official_code = '9903'
			)
		)
		where hazard_code = 'test_local_override_hazard'
	$$,
	$$
		values (
			true,
			1::smallint,
			'9902'::text,
			1
		)
	$$,
	'the closest active mapping overrides a more distant parent mapping'
);

select results_eq(
	$$
		select
			is_prioritised,
			relevance_rank,
			matched_location_code,
			matched_location_type,
			hierarchy_distance
		from public.resolve_location_hazards(
			(
				select id
				from public.locations
				where official_code = '9903'
			)
		)
		where hazard_code = 'test_parent_fallback_hazard'
	$$,
	$$
		values (
			true,
			2::smallint,
			'9901'::text,
			'region'::text,
			2
		)
	$$,
	'a child location falls back through multiple parent levels when needed'
);

select results_eq(
	$$
		select
			is_prioritised,
			relevance_rank,
			matched_location_code,
			hierarchy_distance
		from public.resolve_location_hazards(
			(
				select id
				from public.locations
				where official_code = '9902'
			)
		)
		where hazard_code = 'test_inactive_local_mapping_hazard'
	$$,
	$$
		values (
			true,
			2::smallint,
			'9901'::text,
			1
		)
	$$,
	'an inactive local mapping is ignored and the resolver falls back to an active parent mapping'
);

select results_eq(
	$$
		select
			is_prioritised,
			relevance_rank,
			matched_location_id is null,
			matched_location_code is null,
			hierarchy_distance is null
		from public.resolve_location_hazards(
			(
				select id
				from public.locations
				where official_code = '9903'
			)
		)
		where hazard_code = 'test_unmapped_hazard'
	$$,
	$$
		values (
			false,
			null::smallint,
			true,
			true,
			true
		)
	$$,
	'unmapped active hazards remain available but are not prioritised'
);

select is(
	(
		select count(*)
		from public.resolve_location_hazards(
			(
				select id
				from public.locations
				where official_code = '9903'
			)
		)
		where hazard_code = 'test_inactive_hazard'
	),
	0::bigint,
	'inactive hazards are excluded from resolver results'
);

select is(
	(
		select count(*)
		from public.resolve_location_hazards(
			(
				select id
				from public.locations
				where official_code = '9903'
			)
		)
		where hazard_code in (
			'test_local_override_hazard',
			'test_parent_fallback_hazard',
			'test_inactive_local_mapping_hazard',
			'test_unmapped_hazard'
		)
	),
	4::bigint,
	'all active test hazards remain available regardless of whether they have a location mapping'
);


/* ==========================================================================
 * Output meaning and metadata
 * ========================================================================== */

select results_eq(
	$$
		select
			hazard_code,
			hazard_name_en,
			classification,
			hazard_sort_order
		from public.resolve_location_hazards(
			(
				select id
				from public.locations
				where official_code = '9903'
			)
		)
		where hazard_code = 'test_local_override_hazard'
	$$,
	$$
		values (
			'test_local_override_hazard'::text,
			'Test Local Override Hazard'::text,
			'core'::text,
			910::smallint
		)
	$$,
	'resolver preserves reusable hazard metadata in its output'
);

select results_eq(
	$$
		select
			matched_location_name_en,
			matched_location_name_ar
		from public.resolve_location_hazards(
			(
				select id
				from public.locations
				where official_code = '9903'
			)
		)
		where hazard_code = 'test_local_override_hazard'
	$$,
	$$
		values (
			'Test Governorate'::text,
			'محافظة اختبارية'::text
		)
	$$,
	'resolver reports the location that supplied the selected relevance mapping'
);


/* ==========================================================================
 * Real client execution through RLS
 * ========================================================================== */

set local role anon;

select results_eq(
	$$
		select
			hazard_code,
			is_prioritised,
			relevance_rank,
			matched_location_code,
			hierarchy_distance
		from public.resolve_location_hazards(
			(
				select id
				from public.locations
				where official_code = '9903'
			)
		)
		where hazard_code = 'test_parent_fallback_hazard'
	$$,
	$$
		values (
			'test_parent_fallback_hazard'::text,
			true,
			2::smallint,
			'9901'::text,
			2
		)
	$$,
	'guest clients can resolve location hazards through catalogue RLS'
);

reset role;

set local role authenticated;

select results_eq(
	$$
		select
			hazard_code,
			is_prioritised,
			relevance_rank,
			matched_location_code,
			hierarchy_distance
		from public.resolve_location_hazards(
			(
				select id
				from public.locations
				where official_code = '9903'
			)
		)
		where hazard_code = 'test_local_override_hazard'
	$$,
	$$
		values (
			'test_local_override_hazard'::text,
			true,
			1::smallint,
			'9902'::text,
			1
		)
	$$,
	'authenticated clients can resolve nearest location hazard relevance through catalogue RLS'
);

reset role;


/* ==========================================================================
 * No real location-hazard claims are introduced by this test
 * ========================================================================== */

select is(
	(
		select count(*)
		from public.location_hazard_profiles
		where location_id in (
			select id
			from public.locations
			where official_code not in (
				'9901',
				'9902',
				'9903',
				'9904'
			)
		)
			and hazard_id in (
				select id
				from public.hazards
				where code like 'test\_%' escape '\'
			)
	),
	0::bigint,
	'test-only hazard mappings are confined to fictional test locations'
);


select * from finish();

rollback;
