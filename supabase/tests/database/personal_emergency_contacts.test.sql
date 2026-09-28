begin;

create extension if not exists pgtap
	with schema extensions;

select plan(32);


/* ==========================================================================
 * Table structure, RLS and client privileges
 * ========================================================================== */

select has_table(
	'public',
	'personal_emergency_contacts',
	'personal_emergency_contacts table exists'
);


select ok(
	(
		select relrowsecurity
		from pg_class
		where oid =
			'public.personal_emergency_contacts'::regclass
	),
	'RLS is enabled on personal_emergency_contacts'
);


select ok(
	has_table_privilege(
		'authenticated',
		'public.personal_emergency_contacts',
		'SELECT'
	),
	'authenticated users have SELECT permission on personal contacts'
);


select ok(
	has_table_privilege(
		'authenticated',
		'public.personal_emergency_contacts',
		'DELETE'
	),
	'authenticated users have DELETE permission on personal contacts'
);


/*
 * INSERT is deliberately column-restricted.
 *
 * Clients provide ownership and user-editable contact information.
 * Database-managed identifiers and timestamps are not client inputs.
 */
select ok(
	has_column_privilege(
		'authenticated',
		'public.personal_emergency_contacts',
		'user_id',
		'INSERT'
	)
	and has_column_privilege(
		'authenticated',
		'public.personal_emergency_contacts',
		'name',
		'INSERT'
	)
	and has_column_privilege(
		'authenticated',
		'public.personal_emergency_contacts',
		'relationship_label',
		'INSERT'
	)
	and has_column_privilege(
		'authenticated',
		'public.personal_emergency_contacts',
		'phone_number',
		'INSERT'
	)
	and has_column_privilege(
		'authenticated',
		'public.personal_emergency_contacts',
		'email',
		'INSERT'
	)
	and has_column_privilege(
		'authenticated',
		'public.personal_emergency_contacts',
		'is_primary',
		'INSERT'
	),
	'authenticated users may insert the intended contact fields'
);


/*
 * UPDATE deliberately excludes user_id so ownership cannot be reassigned.
 */
select ok(
	has_column_privilege(
		'authenticated',
		'public.personal_emergency_contacts',
		'name',
		'UPDATE'
	)
	and has_column_privilege(
		'authenticated',
		'public.personal_emergency_contacts',
		'relationship_label',
		'UPDATE'
	)
	and has_column_privilege(
		'authenticated',
		'public.personal_emergency_contacts',
		'phone_number',
		'UPDATE'
	)
	and has_column_privilege(
		'authenticated',
		'public.personal_emergency_contacts',
		'email',
		'UPDATE'
	)
	and has_column_privilege(
		'authenticated',
		'public.personal_emergency_contacts',
		'is_primary',
		'UPDATE'
	),
	'authenticated users may update the intended editable contact fields'
);


select ok(
	not has_column_privilege(
		'authenticated',
		'public.personal_emergency_contacts',
		'user_id',
		'UPDATE'
	),
	'authenticated users cannot reassign contact ownership'
);


/*
 * id, created_at and updated_at are database-controlled.
 */
select ok(
	not has_column_privilege(
		'authenticated',
		'public.personal_emergency_contacts',
		'id',
		'INSERT'
	)
	and not has_column_privilege(
		'authenticated',
		'public.personal_emergency_contacts',
		'created_at',
		'INSERT'
	)
	and not has_column_privilege(
		'authenticated',
		'public.personal_emergency_contacts',
		'updated_at',
		'INSERT'
	)
	and not has_column_privilege(
		'authenticated',
		'public.personal_emergency_contacts',
		'id',
		'UPDATE'
	)
	and not has_column_privilege(
		'authenticated',
		'public.personal_emergency_contacts',
		'created_at',
		'UPDATE'
	)
	and not has_column_privilege(
		'authenticated',
		'public.personal_emergency_contacts',
		'updated_at',
		'UPDATE'
	),
	'server-managed contact fields cannot be inserted or updated by authenticated clients'
);


select ok(
	not has_table_privilege(
		'anon',
		'public.personal_emergency_contacts',
		'SELECT'
	)
	and not has_table_privilege(
		'anon',
		'public.personal_emergency_contacts',
		'INSERT'
	)
	and not has_table_privilege(
		'anon',
		'public.personal_emergency_contacts',
		'UPDATE'
	)
	and not has_table_privilege(
		'anon',
		'public.personal_emergency_contacts',
		'DELETE'
	),
	'guests have no privileges on personal emergency contacts'
);


select ok(
	has_table_privilege(
		'service_role',
		'public.personal_emergency_contacts',
		'SELECT'
	)
	and has_table_privilege(
		'service_role',
		'public.personal_emergency_contacts',
		'INSERT'
	)
	and has_table_privilege(
		'service_role',
		'public.personal_emergency_contacts',
		'UPDATE'
	)
	and has_table_privilege(
		'service_role',
		'public.personal_emergency_contacts',
		'DELETE'
	),
	'service_role retains management privileges on personal emergency contacts'
);


/*
 * Structural safeguards are checked here and exercised behaviourally below.
 */
select ok(
	exists (
		select 1
		from pg_indexes
		where schemaname = 'public'
			and tablename = 'personal_emergency_contacts'
			and indexname =
				'personal_emergency_contacts_one_primary_per_user'
	),
	'one-primary-contact-per-user index exists'
);


select ok(
	exists (
		select 1
		from pg_trigger
		where tgrelid =
			'public.personal_emergency_contacts'::regclass
			and tgname =
				'on_personal_emergency_contact_updated'
			and not tgisinternal
	),
	'personal contact updated_at trigger exists'
);


/* ==========================================================================
 * Temporary authentication identities
 * ========================================================================== */

/*
 * These users and all contacts created below exist only inside this test
 * transaction and disappear when the final rollback executes.
 */
insert into auth.users (
	id,
	email,
	aud,
	role
)
values
	(
		'55555555-5555-5555-5555-555555555555',
		'contacts-user-a@example.test',
		'authenticated',
		'authenticated'
	),
	(
		'66666666-6666-6666-6666-666666666666',
		'contacts-user-b@example.test',
		'authenticated',
		'authenticated'
	);


/* ==========================================================================
 * User A: valid creation and owner visibility
 * ========================================================================== */

set local role authenticated;

set local request.jwt.claim.sub =
	'55555555-5555-5555-5555-555555555555';


/*
 * Valid Saudi mobile number in the canonical stored +966 form.
 */
select results_eq(
	$$
		insert into public.personal_emergency_contacts (
			user_id,
			name,
			relationship_label,
			phone_number,
			email,
			is_primary
		)
		values (
			'55555555-5555-5555-5555-555555555555',
			'Maha',
			'Sister',
			'+966551234567',
			'maha@example.test',
			true
		)
		returning
			user_id,
			phone_number,
			is_primary
	$$,
	$$
		values (
			'55555555-5555-5555-5555-555555555555'
				::uuid,
			'+966551234567'::text,
			true
		)
	$$,
	'User A can create their own valid primary mobile contact'
);


select is(
	(
		select count(*)
		from public.personal_emergency_contacts
	),
	1::bigint,
	'User A can read their own personal contact'
);


/*
 * Saudi geographic fixed-line numbers are also valid personal contact
 * numbers. Email is optional and may remain NULL.
 */
select results_eq(
	$$
		insert into public.personal_emergency_contacts (
			user_id,
			name,
			relationship_label,
			phone_number,
			email,
			is_primary
		)
		values (
			'55555555-5555-5555-5555-555555555555',
			'Family Home',
			'Household',
			'+966121234567',
			null,
			false
		)
		returning
			phone_number,
			email,
			is_primary
	$$,
	$$
		values (
			'+966121234567'::text,
			null::text,
			false
		)
	$$,
	'valid Saudi fixed-line contacts and NULL email values are accepted'
);


select is(
	(
		select count(*)
		from public.personal_emergency_contacts
	),
	2::bigint,
	'User A can store multiple personal contacts'
);


/* ==========================================================================
 * Ownership protection
 * ========================================================================== */

/*
 * A signed-in user cannot create a row owned by another account even though
 * user_id is necessarily an INSERT field.
 */
select throws_ok(
	$$
		insert into public.personal_emergency_contacts (
			user_id,
			name,
			relationship_label,
			phone_number,
			is_primary
		)
		values (
			'66666666-6666-6666-6666-666666666666',
			'Unauthorised Contact',
			'Friend',
			'+966531234567',
			false
		)
	$$,
	'42501',
	null,
	'User A cannot create a contact owned by User B'
);


/* ==========================================================================
 * Primary-contact integrity
 * ========================================================================== */

/*
 * User A already has one primary contact. A second primary contact for the
 * same account must violate the partial unique index.
 */
select throws_ok(
	$$
		insert into public.personal_emergency_contacts (
			user_id,
			name,
			relationship_label,
			phone_number,
			is_primary
		)
		values (
			'55555555-5555-5555-5555-555555555555',
			'Second Primary',
			'Friend',
			'+966561234567',
			true
		)
	$$,
	'23505',
	null,
	'an account cannot have two primary personal contacts'
);


/* ==========================================================================
 * Saudi telephone validation
 * ========================================================================== */

/*
 * Friendly/local formatting belongs to the application normalisation layer.
 * The database stores only the canonical +966 representation.
 */
select throws_ok(
	$$
		insert into public.personal_emergency_contacts (
			user_id,
			name,
			relationship_label,
			phone_number,
			is_primary
		)
		values (
			'55555555-5555-5555-5555-555555555555',
			'Local Format',
			'Friend',
			'0551234567',
			false
		)
	$$,
	'23514',
	null,
	'non-canonical local Saudi phone formatting is rejected'
);


/*
 * +966 does not make an otherwise unsupported subscriber prefix valid.
 */
select throws_ok(
	$$
		insert into public.personal_emergency_contacts (
			user_id,
			name,
			relationship_label,
			phone_number,
			is_primary
		)
		values (
			'55555555-5555-5555-5555-555555555555',
			'Invalid Prefix',
			'Friend',
			'+966521234567',
			false
		)
	$$,
	'23514',
	null,
	'unsupported Saudi subscriber prefixes are rejected'
);


/* ==========================================================================
 * Email and text-field validation
 * ========================================================================== */

select throws_ok(
	$$
		insert into public.personal_emergency_contacts (
			user_id,
			name,
			relationship_label,
			phone_number,
			email,
			is_primary
		)
		values (
			'55555555-5555-5555-5555-555555555555',
			'Invalid Email',
			'Friend',
			'+966581234567',
			'not-an-email',
			false
		)
	$$,
	'23514',
	null,
	'invalid optional email syntax is rejected'
);


select throws_ok(
	$$
		insert into public.personal_emergency_contacts (
			user_id,
			name,
			relationship_label,
			phone_number,
			is_primary
		)
		values (
			'55555555-5555-5555-5555-555555555555',
			' Leading Space',
			'Friend',
			'+966581234567',
			false
		)
	$$,
	'23514',
	null,
	'contact names with surrounding whitespace are rejected'
);


select throws_ok(
	$$
		insert into public.personal_emergency_contacts (
			user_id,
			name,
			relationship_label,
			phone_number,
			is_primary
		)
		values (
			'55555555-5555-5555-5555-555555555555',
			'Valid Name',
			'Friend ',
			'+966581234567',
			false
		)
	$$,
	'23514',
	null,
	'relationship labels with surrounding whitespace are rejected'
);


/* ==========================================================================
 * User A: permitted update and ownership immutability
 * ========================================================================== */

select results_eq(
	$$
		update public.personal_emergency_contacts
		set
			name = 'Family Landline',
			relationship_label = 'Home'
		where user_id =
				'55555555-5555-5555-5555-555555555555'
			and phone_number = '+966121234567'
		returning
			name,
			relationship_label
	$$,
	$$
		values (
			'Family Landline'::text,
			'Home'::text
		)
	$$,
	'User A can update permitted fields on their own contact'
);


/*
 * user_id is deliberately not included in the authenticated UPDATE grant.
 * This prevents a client from transferring ownership of an existing row.
 */
select throws_ok(
	$$
		update public.personal_emergency_contacts
		set user_id =
			'66666666-6666-6666-6666-666666666666'
		where user_id =
			'55555555-5555-5555-5555-555555555555'
	$$,
	'42501',
	null,
	'authenticated users cannot reassign personal contact ownership'
);


/* ==========================================================================
 * User B: cross-account isolation
 * ========================================================================== */

set local request.jwt.claim.sub =
	'66666666-6666-6666-6666-666666666666';


select is(
	(
		select count(*)
		from public.personal_emergency_contacts
	),
	0::bigint,
	'User B cannot read User A personal contacts'
);


/*
 * The primary-contact uniqueness rule is per account, not global.
 * User B may therefore have their own primary contact.
 */
select results_eq(
	$$
		insert into public.personal_emergency_contacts (
			user_id,
			name,
			relationship_label,
			phone_number,
			is_primary
		)
		values (
			'66666666-6666-6666-6666-666666666666',
			'Ahmed',
			'Brother',
			'+966541234567',
			true
		)
		returning
			user_id,
			is_primary
	$$,
	$$
		values (
			'66666666-6666-6666-6666-666666666666'
				::uuid,
			true
		)
	$$,
	'User B can create their own primary personal contact'
);


select is(
	(
		select count(*)
		from public.personal_emergency_contacts
	),
	1::bigint,
	'User B can read only their own personal contact'
);


/*
 * RLS hides User A rows from User B for UPDATE and DELETE as well as SELECT.
 */
select is_empty(
	$$
		update public.personal_emergency_contacts
		set name = 'Unauthorised Change'
		where user_id =
			'55555555-5555-5555-5555-555555555555'
		returning id
	$$,
	'User B cannot update User A personal contacts'
);


select is_empty(
	$$
		delete from public.personal_emergency_contacts
		where user_id =
			'55555555-5555-5555-5555-555555555555'
		returning id
	$$,
	'User B cannot delete User A personal contacts'
);


reset role;


/* ==========================================================================
 * Account-deletion cascade
 * ========================================================================== */

/*
 * Personal contacts are user-owned data. Deleting the owning auth identity
 * must remove its contact rows through the foreign-key ON DELETE CASCADE.
 */
delete from auth.users
where id =
	'66666666-6666-6666-6666-666666666666';


select is(
	(
		select count(*)
		from public.personal_emergency_contacts
		where user_id =
			'66666666-6666-6666-6666-666666666666'
	),
	0::bigint,
	'deleting an Auth user cascades to their personal emergency contacts'
);


/* ==========================================================================
 * Anonymous isolation
 * ========================================================================== */

set local role anon;


select throws_ok(
	$$
		select id
		from public.personal_emergency_contacts
	$$,
	'42501',
	null,
	'guests cannot read personal emergency contacts'
);


reset role;


select * from finish();

rollback;