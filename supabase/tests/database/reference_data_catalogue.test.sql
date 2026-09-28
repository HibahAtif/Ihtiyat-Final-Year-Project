begin;

create extension if not exists pgtap
	with schema extensions;

select plan(34);


/* ==========================================================================
 * Supported-language reference data
 * ========================================================================== */

select has_table(
	'public',
	'supported_languages',
	'supported_languages table exists'
);


select ok(
	(
		select relrowsecurity
		from pg_class
		where oid = 'public.supported_languages'::regclass
	),
	'RLS is enabled on supported_languages'
);


select ok(
	has_table_privilege(
		'anon',
		'public.supported_languages',
		'SELECT'
	),
	'guests have SELECT permission on supported_languages'
);


select ok(
	has_table_privilege(
		'authenticated',
		'public.supported_languages',
		'SELECT'
	),
	'authenticated users have SELECT permission on supported_languages'
);


select ok(
	not has_table_privilege(
		'anon',
		'public.supported_languages',
		'INSERT'
	)
	and not has_table_privilege(
		'anon',
		'public.supported_languages',
		'UPDATE'
	)
	and not has_table_privilege(
		'anon',
		'public.supported_languages',
		'DELETE'
	),
	'guests have no write privileges on supported_languages'
);


select ok(
	not has_table_privilege(
		'authenticated',
		'public.supported_languages',
		'INSERT'
	)
	and not has_table_privilege(
		'authenticated',
		'public.supported_languages',
		'UPDATE'
	)
	and not has_table_privilege(
		'authenticated',
		'public.supported_languages',
		'DELETE'
	),
	'authenticated users have no write privileges on supported_languages'
);


select ok(
	has_table_privilege(
		'service_role',
		'public.supported_languages',
		'SELECT'
	)
	and has_table_privilege(
		'service_role',
		'public.supported_languages',
		'INSERT'
	)
	and has_table_privilege(
		'service_role',
		'public.supported_languages',
		'UPDATE'
	)
	and has_table_privilege(
		'service_role',
		'public.supported_languages',
		'DELETE'
	),
	'service_role retains management privileges on supported_languages'
);


/*
 * Test actual guest reads rather than relying only on privilege metadata.
 *
 * The two rows here are the deliberately implemented language catalogue.
 */
set local role anon;

select results_eq(
	$$
		select
			code,
			name_en,
			native_name,
			layout_direction,
			is_active
		from public.supported_languages
		order by code
	$$,
	$$
		values
			(
				'ar'::text,
				'Arabic'::text,
				'العربية'::text,
				'rtl'::text,
				true
			),
			(
				'en'::text,
				'English'::text,
				'English'::text,
				'ltr'::text,
				true
			)
	$$,
	'guests can read the expected Arabic and English configuration'
);

reset role;


set local role authenticated;

select is(
	(
		select count(*)
		from public.supported_languages
		where is_active
	),
	2::bigint,
	'authenticated users can read both active supported languages'
);

reset role;


/* ==========================================================================
 * Supported-language integrity constraints
 * ========================================================================== */

select throws_ok(
	$$
		insert into public.supported_languages (
			code,
			name_en,
			native_name,
			layout_direction
		)
		values (
			'EN',
			'Test Language',
			'Test Language',
			'ltr'
		)
	$$,
	'23514',
	null,
	'language codes must follow the canonical lowercase format'
);


select throws_ok(
	$$
		insert into public.supported_languages (
			code,
			name_en,
			native_name,
			layout_direction
		)
		values (
			'zz',
			'Test Language',
			'Test Language',
			'centre'
		)
	$$,
	'23514',
	null,
	'unsupported language alignment directions are rejected'
);


select throws_ok(
	$$
		insert into public.supported_languages (
			code,
			name_en,
			native_name,
			layout_direction
		)
		values (
			'zz',
			' Test Language',
			'Test Language',
			'ltr'
		)
	$$,
	'23514',
	null,
	'language names with surrounding whitespace are rejected'
);


/* ==========================================================================
 * Supported-language client write protection
 * ========================================================================== */

set local role anon;

select throws_ok(
	$$
		insert into public.supported_languages (
			code,
			name_en,
			native_name,
			layout_direction
		)
		values (
			'zz',
			'Test Language',
			'Test Language',
			'ltr'
		)
	$$,
	'42501',
	null,
	'guests cannot insert supported-language configuration'
);

reset role;


set local role authenticated;

select throws_ok(
	$$
		update public.supported_languages
		set name_en = 'Changed'
		where code = 'en'
	$$,
	'42501',
	null,
	'authenticated users cannot modify supported-language configuration'
);

reset role;


/* ==========================================================================
 * Saudi location reference data
 * ========================================================================== */

select has_table(
	'public',
	'locations',
	'locations table exists'
);


select ok(
	(
		select relrowsecurity
		from pg_class
		where oid = 'public.locations'::regclass
	),
	'RLS is enabled on locations'
);


select ok(
	has_table_privilege(
		'anon',
		'public.locations',
		'SELECT'
	),
	'guests have SELECT permission on locations'
);


select ok(
	has_table_privilege(
		'authenticated',
		'public.locations',
		'SELECT'
	),
	'authenticated users have SELECT permission on locations'
);


select ok(
	not has_table_privilege(
		'anon',
		'public.locations',
		'INSERT'
	)
	and not has_table_privilege(
		'anon',
		'public.locations',
		'UPDATE'
	)
	and not has_table_privilege(
		'anon',
		'public.locations',
		'DELETE'
	),
	'guests have no write privileges on locations'
);


select ok(
	not has_table_privilege(
		'authenticated',
		'public.locations',
		'INSERT'
	)
	and not has_table_privilege(
		'authenticated',
		'public.locations',
		'UPDATE'
	)
	and not has_table_privilege(
		'authenticated',
		'public.locations',
		'DELETE'
	),
	'authenticated users have no write privileges on locations'
);


select ok(
	has_table_privilege(
		'service_role',
		'public.locations',
		'SELECT'
	)
	and has_table_privilege(
		'service_role',
		'public.locations',
		'INSERT'
	)
	and has_table_privilege(
		'service_role',
		'public.locations',
		'UPDATE'
	)
	and has_table_privilege(
		'service_role',
		'public.locations',
		'DELETE'
	),
	'service_role retains management privileges on locations'
);


/* ==========================================================================
 * Saudi location seed integrity
 * ========================================================================== */

select is(
	(
		select count(*)
		from public.locations
		where location_type = 'region'
	),
	13::bigint,
	'the catalogue contains all 13 Saudi administrative regions'
);


select results_eq(
	$$
		select official_code
		from public.locations
		where location_type = 'region'
		order by official_code
	$$,
	$$
		values
			('0001'::text),
			('0002'::text),
			('0003'::text),
			('0004'::text),
			('0005'::text),
			('0006'::text),
			('0007'::text),
			('0008'::text),
			('0009'::text),
			('0010'::text),
			('0011'::text),
			('0012'::text),
			('0013'::text)
	$$,
	'the expected Saudi region codes are seeded'
);


/*
 * Exercise the public read policy while also confirming the first
 * governorate-level record is linked to its intended parent.
 */
set local role anon;

select results_eq(
	$$
		select
			child.official_code,
			child.name_en,
			child.location_type,
			parent.official_code,
			parent.name_en
		from public.locations as child
		join public.locations as parent
			on parent.id = child.parent_id
		where child.official_code = '0124'
	$$,
	$$
		values (
			'0124'::text,
			'Jeddah'::text,
			'governorate'::text,
			'0002'::text,
			'Makkah Region'::text
		)
	$$,
	'guests can resolve Jeddah Governorate beneath Makkah Region'
);

reset role;


/*
 * Current hierarchy invariant:
 *
 * - regions are top-level rows;
 * - every more-granular administrative location requires a parent.
 */
select ok(
	not exists (
		select 1
		from public.locations
		where
			(
				location_type = 'region'
				and parent_id is not null
			)
			or
			(
				location_type <> 'region'
				and parent_id is null
			)
	),
	'the seeded location hierarchy obeys the parent relationship rules'
);


/* ==========================================================================
 * Saudi location integrity constraints
 * ========================================================================== */

select throws_ok(
	$$
		insert into public.locations (
			parent_id,
			official_code,
			location_type,
			name_en,
			name_ar
		)
		values (
			null,
			'9001',
			'governorate',
			'Test Governorate',
			'محافظة اختبار'
		)
	$$,
	'23514',
	null,
	'non-region locations cannot exist without a parent'
);


select throws_ok(
	$$
		insert into public.locations (
			parent_id,
			official_code,
			location_type,
			name_en,
			name_ar
		)
		values (
			(
				select id
				from public.locations
				where official_code = '0002'
			),
			'9002',
			'region',
			'Test Region',
			'منطقة اختبار'
		)
	$$,
	'23514',
	null,
	'regions cannot be assigned a parent location'
);


select throws_ok(
	$$
		insert into public.locations (
			parent_id,
			official_code,
			location_type,
			name_en,
			name_ar
		)
		values (
			null,
			'999',
			'region',
			'Test Region',
			'منطقة اختبار'
		)
	$$,
	'23514',
	null,
	'location official codes must contain exactly four digits'
);


select throws_ok(
	$$
		insert into public.locations (
			parent_id,
			official_code,
			location_type,
			name_en,
			name_ar
		)
		values (
			null,
			'9003',
			'city',
			'Test City',
			'مدينة اختبار'
		)
	$$,
	'23514',
	null,
	'unsupported location types are rejected'
);


select throws_ok(
	$$
		insert into public.locations (
			parent_id,
			official_code,
			location_type,
			name_en,
			name_ar
		)
		values (
			null,
			'0001',
			'region',
			'Duplicate Region',
			'منطقة مكررة'
		)
	$$,
	'23505',
	null,
	'duplicate official location codes are rejected'
);


/*
 * A self-referencing foreign key can otherwise be structurally possible,
 * so the explicit no-self-parent check is tested independently.
 */
select throws_ok(
	$$
		insert into public.locations (
			id,
			parent_id,
			official_code,
			location_type,
			name_en,
			name_ar
		)
		values (
			900000,
			900000,
			'9004',
			'governorate',
			'Self Parent Test',
			'اختبار الأصل الذاتي'
		)
	$$,
	'23514',
	null,
	'a location cannot be its own parent'
);


select throws_ok(
	$$
		insert into public.locations (
			parent_id,
			official_code,
			location_type,
			name_en,
			name_ar
		)
		values (
			null,
			'9005',
			'region',
			' Test Region',
			'منطقة اختبار'
		)
	$$,
	'23514',
	null,
	'location names with surrounding whitespace are rejected'
);


/* ==========================================================================
 * Saudi location client write protection
 * ========================================================================== */

set local role anon;

select throws_ok(
	$$
		insert into public.locations (
			parent_id,
			official_code,
			location_type,
			name_en,
			name_ar
		)
		values (
			null,
			'9006',
			'region',
			'Guest Region',
			'منطقة ضيف'
		)
	$$,
	'42501',
	null,
	'guests cannot insert curated Saudi locations'
);

reset role;


set local role authenticated;

select throws_ok(
	$$
		update public.locations
		set name_en = 'Changed'
		where official_code = '0001'
	$$,
	'42501',
	null,
	'authenticated users cannot modify curated Saudi locations'
);

reset role;


select * from finish();

rollback;