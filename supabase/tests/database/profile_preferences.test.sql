begin;

create extension if not exists pgtap
	with schema extensions;

select plan(20);

/*
 * Can an authenticated user's saved profile preferences and household data accept valid states,
 * reject invalid states, preserve ownership isolation,
 * and maintain valid references to configured language/location data?
 */


/* ==========================================================================
 * Profile preference structure and column permissions
 * ========================================================================== */

/*
 * All seven Day-03 profile fields must exist.
 *
 * One structural assertion is preferable to seven nearly identical tests:
 * if the count differs from seven, the failure immediately tells us the
 * profile-preference migration is incomplete.
 */
select is(
	(
		select count(*)
		from information_schema.columns
		where table_schema = 'public'
			and table_name = 'profiles'
			and column_name in (
				'active_location_id',
				'preferred_language_code',
				'text_size_preference',
				'children_count',
				'adults_count',
				'older_adults_count',
				'pets_count'
			)
	),
	7::bigint,
	'all seven Day-03 profile preference fields exist'
);


select ok(
	has_column_privilege(
		'authenticated',
		'public.profiles',
		'active_location_id',
		'UPDATE'
	),
	'authenticated users may update active_location_id'
);


select ok(
	has_column_privilege(
		'authenticated',
		'public.profiles',
		'preferred_language_code',
		'UPDATE'
	),
	'authenticated users may update preferred_language_code'
);


select ok(
	has_column_privilege(
		'authenticated',
		'public.profiles',
		'text_size_preference',
		'UPDATE'
	),
	'authenticated users may update text_size_preference'
);


select ok(
	has_column_privilege(
		'authenticated',
		'public.profiles',
		'children_count',
		'UPDATE'
	)
	and has_column_privilege(
		'authenticated',
		'public.profiles',
		'adults_count',
		'UPDATE'
	)
	and has_column_privilege(
		'authenticated',
		'public.profiles',
		'older_adults_count',
		'UPDATE'
	)
	and has_column_privilege(
		'authenticated',
		'public.profiles',
		'pets_count',
		'UPDATE'
	),
	'authenticated users may update all intended household fields'
);


/* ==========================================================================
 * Temporary users
 * ========================================================================== */

/*
 * Create two temporary Supabase Auth users.
 *
 * The existing auth.users trigger should automatically create their
 * public.profiles rows. The entire test runs inside a transaction and is
 * rolled back at the end, so these identities do not remain in the database.
 */
insert into auth.users (
	id,
	email,
	aud,
	role
)
values
	(
		'33333333-3333-3333-3333-333333333333',
		'preferences-user-a@example.test',
		'authenticated',
		'authenticated'
	),
	(
		'44444444-4444-4444-4444-444444444444',
		'preferences-user-b@example.test',
		'authenticated',
		'authenticated'
	);


/*
 * New users have not yet supplied a cloud language/location preference or
 * household profile. App-level text sizing deliberately begins at 'system'.
 */
select results_eq(
	$$
		select
			active_location_id,
			preferred_language_code,
			text_size_preference,
			children_count,
			adults_count,
			older_adults_count,
			pets_count
		from public.profiles
		where id =
			'33333333-3333-3333-3333-333333333333'
	$$,
	$$
		values (
			null::bigint,
			null::text,
			'system'::text,
			null::smallint,
			null::smallint,
			null::smallint,
			null::smallint
		)
	$$,
	'new profiles begin with the intended preference defaults'
);


/* ==========================================================================
 * Valid owner updates
 * ========================================================================== */

set local role authenticated;

set local request.jwt.claim.sub =
	'33333333-3333-3333-3333-333333333333';


/*
 * A realistic completed profile:
 *
 * - Jeddah Governorate;
 * - Arabic preference;
 * - Ihtiyat large-text preference;
 * - five humans and one pet.
 */
select results_eq(
	$$
		update public.profiles
		set
			active_location_id = (
				select id
				from public.locations
				where official_code = '0124'
			),
			preferred_language_code = 'ar',
			text_size_preference = 'large',
			children_count = 2,
			adults_count = 2,
			older_adults_count = 1,
			pets_count = 1
		where id =
			'33333333-3333-3333-3333-333333333333'
		returning
			active_location_id,
			preferred_language_code,
			text_size_preference,
			children_count,
			adults_count,
			older_adults_count,
			pets_count
	$$,
	$$
		select
			id,
			'ar'::text,
			'large'::text,
			2::smallint,
			2::smallint,
			1::smallint,
			1::smallint
		from public.locations
		where official_code = '0124'
	$$,
	'User A can save a valid location, language, accessibility and household profile'
);


/*
 * The original profile RLS suite already proves the general owner-only rule.
 * This regression assertion confirms the newly editable preference fields do
 * not accidentally weaken that isolation.
 */
select is_empty(
	$$
		update public.profiles
		set
			preferred_language_code = 'ar',
			children_count = 1,
			adults_count = 1,
			older_adults_count = 0,
			pets_count = 0
		where id =
			'44444444-4444-4444-4444-444444444444'
		returning id
	$$,
	'User A cannot update User B profile preferences'
);


/* ==========================================================================
 * Valid household states and boundaries
 * ========================================================================== */

/*
 * All-null is a valid state and means that the user has deliberately not
 * supplied household information.
 */
select results_eq(
	$$
		update public.profiles
		set
			children_count = null,
			adults_count = null,
			older_adults_count = null,
			pets_count = null
		where id =
			'33333333-3333-3333-3333-333333333333'
		returning
			children_count,
			adults_count,
			older_adults_count,
			pets_count
	$$,
	$$
		values (
			null::smallint,
			null::smallint,
			null::smallint,
			null::smallint
		)
	$$,
	'an entirely unsupplied household state is valid'
);


/*
 * Zero means explicitly none, rather than "not answered".
 * A one-adult household is therefore a valid completed profile.
 */
select results_eq(
	$$
		update public.profiles
		set
			children_count = 0,
			adults_count = 1,
			older_adults_count = 0,
			pets_count = 0
		where id =
			'33333333-3333-3333-3333-333333333333'
		returning
			children_count,
			adults_count,
			older_adults_count,
			pets_count
	$$,
	$$
		values (
			0::smallint,
			1::smallint,
			0::smallint,
			0::smallint
		)
	$$,
	'zero-valued categories are valid when the completed household contains a human'
);


/*
 * Exercise the deliberate upper boundary itself.
 *
 * Pets have their own 0-25 bound and are not included in the derived human
 * household total.
 */
select results_eq(
	$$
		update public.profiles
		set
			children_count = 0,
			adults_count = 25,
			older_adults_count = 0,
			pets_count = 10
		where id =
			'33333333-3333-3333-3333-333333333333'
		returning
			children_count,
			adults_count,
			older_adults_count,
			pets_count
	$$,
	$$
		values (
			0::smallint,
			25::smallint,
			0::smallint,
			10::smallint
		)
	$$,
	'the defined maximum household boundaries are accepted'

);

select throws_ok(
    $$
        update public.profiles
        set
            children_count = 0,
            adults_count = 1,
            older_adults_count = 0,
            pets_count = 11
        where id =
            '33333333-3333-3333-3333-333333333333'
    $$,
    '23514',
    null,
    'pet counts above the household-profile limit are rejected'
);


/* ==========================================================================
 * Invalid household states
 * ========================================================================== */

select throws_ok(
	$$
		update public.profiles
		set
			children_count = -1,
			adults_count = 1,
			older_adults_count = 0,
			pets_count = 0
		where id =
			'33333333-3333-3333-3333-333333333333'
	$$,
	'23514',
	null,
	'negative household counts are rejected'
);


select throws_ok(
	$$
		update public.profiles
		set
			children_count = 1,
			adults_count = 1,
			older_adults_count = 0,
			pets_count = null
		where id =
			'33333333-3333-3333-3333-333333333333'
	$$,
	'23514',
	null,
	'partially supplied household information is rejected'
);


select throws_ok(
	$$
		update public.profiles
		set
			children_count = 10,
			adults_count = 10,
			older_adults_count = 6,
			pets_count = 0
		where id =
			'33333333-3333-3333-3333-333333333333'
	$$,
	'23514',
	null,
	'human household totals above 25 are rejected'
);


select throws_ok(
	$$
		update public.profiles
		set
			children_count = 0,
			adults_count = 0,
			older_adults_count = 0,
			pets_count = 1
		where id =
			'33333333-3333-3333-3333-333333333333'
	$$,
	'23514',
	null,
	'a completed household must contain at least one human'
);


/* ==========================================================================
 * Invalid preference references
 * ========================================================================== */

select throws_ok(
	$$
		update public.profiles
		set text_size_preference = 'giant'
		where id =
			'33333333-3333-3333-3333-333333333333'
	$$,
	'23514',
	null,
	'unsupported text-size preferences are rejected'
);


select throws_ok(
	$$
		update public.profiles
		set preferred_language_code = 'fr'
		where id =
			'33333333-3333-3333-3333-333333333333'
	$$,
	'23503',
	null,
	'unsupported language references are rejected'
);


select throws_ok(
	$$
		update public.profiles
		set active_location_id = -999
		where id =
			'33333333-3333-3333-3333-333333333333'
	$$,
	'23503',
	null,
	'unknown location references are rejected'
);


/* ==========================================================================
 * Cross-account regression check
 * ========================================================================== */

reset role;


/*
 * User A's attempted cross-account update returned no row. Verify that the
 * target profile remains in its original unsupplied state.
 */
select results_eq(
	$$
		select
			active_location_id,
			preferred_language_code,
			text_size_preference,
			children_count,
			adults_count,
			older_adults_count,
			pets_count
		from public.profiles
		where id =
			'44444444-4444-4444-4444-444444444444'
	$$,
	$$
		values (
			null::bigint,
			null::text,
			'system'::text,
			null::smallint,
			null::smallint,
			null::smallint,
			null::smallint
		)
	$$,
	'User B profile preferences remain unchanged'
);


select * from finish();

rollback;