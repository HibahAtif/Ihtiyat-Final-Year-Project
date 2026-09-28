begin;

create extension if not exists pgtap
	with schema extensions;

select plan(13);

select has_table(
	'public',
	'profiles',
	'profiles table exists'
);

select ok(
	(
		select relrowsecurity
		from pg_class
		where oid = 'public.profiles'::regclass
	),
	'RLS is enabled on public.profiles'
);

select ok(
	has_table_privilege(
		'authenticated',
		'public.profiles',
		'SELECT'
	),
	'authenticated users have SELECT permission'
);

select ok(
	has_column_privilege(
		'authenticated',
		'public.profiles',
		'display_name',
		'UPDATE'
	),
	'authenticated users may update display_name'
);

select ok(
	not has_column_privilege(
		'authenticated',
		'public.profiles',
		'id',
		'UPDATE'
	),
	'authenticated users cannot update profile IDs'
);

select ok(
	not has_table_privilege(
		'authenticated',
		'public.profiles',
		'INSERT'
	),
	'authenticated users cannot directly insert profiles'
);

select ok(
	not has_table_privilege(
		'authenticated',
		'public.profiles',
		'DELETE'
	),
	'authenticated users cannot delete profiles'
);

/*
 * Create two temporary Supabase Auth users.
 *
 * Ihtiyat's auth.users trigger should create the corresponding
 * public.profiles rows automatically, just as it does for real accounts.
 * The surrounding transaction is rolled back when this test finishes.
 */
insert into auth.users (
	id,
	email,
	aud,
	role
)
values
	(
		'11111111-1111-1111-1111-111111111111',
		'rls-user-a@example.test',
		'authenticated',
		'authenticated'
	),
	(
		'22222222-2222-2222-2222-222222222222',
		'rls-user-b@example.test',
		'authenticated',
		'authenticated'
	);

update public.profiles
set display_name = 'RLS User A'
where id =
	'11111111-1111-1111-1111-111111111111';

update public.profiles
set display_name = 'RLS User B'
where id =
	'22222222-2222-2222-2222-222222222222';


set local role authenticated;
set local request.jwt.claim.sub =
	'11111111-1111-1111-1111-111111111111';

select results_eq(
	$$
		select id
		from public.profiles
		order by id
	$$,
	$$
		values (
			'11111111-1111-1111-1111-111111111111'
				::uuid
		)
	$$,
	'User A can read only their own profile'
);

select results_eq(
	$$
		update public.profiles
		set display_name = 'User A Updated'
		where id =
			'11111111-1111-1111-1111-111111111111'
		returning id
	$$,
	$$
		values (
			'11111111-1111-1111-1111-111111111111'
				::uuid
		)
	$$,
	'User A can update their own profile'
);

select is_empty(
	$$
		update public.profiles
		set display_name = 'Unauthorised change'
		where id =
			'22222222-2222-2222-2222-222222222222'
		returning id
	$$,
	'User A cannot update User B profile'
);

reset role;

select is(
	(
		select display_name
		from public.profiles
		where id =
			'22222222-2222-2222-2222-222222222222'
	),
	'RLS User B',
	'User B profile remains unchanged'
);

set local role authenticated;
set local request.jwt.claim.sub =
	'22222222-2222-2222-2222-222222222222';

select results_eq(
	$$
		select id
		from public.profiles
		order by id
	$$,
	$$
		values (
			'22222222-2222-2222-2222-222222222222'
				::uuid
		)
	$$,
	'User B can read only their own profile'
);

reset role;

set local role anon;

select throws_ok(
	$$
		select id
		from public.profiles
	$$,
	'42501',
	null,
	'anonymous users cannot read private profiles'
);

select * from finish();

rollback;