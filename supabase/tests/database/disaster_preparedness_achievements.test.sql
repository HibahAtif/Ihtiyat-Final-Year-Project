begin;

create extension if not exists pgtap
	with schema extensions;

select plan(22);


/* ==========================================================================
 * Achievement structure and security
 * ==========================================================================
 *
 * Achievement definitions are curated application data.
 *
 * user_achievements stores private awards belonging to individual users.
 * Authenticated clients may read their own earned achievements but may not
 * award, modify or delete achievements directly.
 */


/* ==========================================================================
 * Table structure and RLS
 * ========================================================================== */


select is(
	(
		select count(*)
		from information_schema.tables
		where table_schema = 'public'
			and table_name in (
				'achievements',
				'user_achievements'
			)
	),
	2::bigint,
	'both preparedness achievement tables exist'
);


select is(
	(
		select count(*)
		from pg_class
		join pg_namespace
			on pg_namespace.oid = pg_class.relnamespace
		where pg_namespace.nspname = 'public'
			and pg_class.relname in (
				'achievements',
				'user_achievements'
			)
			and pg_class.relrowsecurity
	),
	2::bigint,
	'RLS is enabled on both achievement tables'
);


/* ==========================================================================
 * Curated achievement-definition privileges
 * ========================================================================== */


select ok(
	has_table_privilege(
		'anon',
		'public.achievements',
		'SELECT'
	),
	'guests have SELECT permission on achievement definitions'
);


select ok(
	has_table_privilege(
		'authenticated',
		'public.achievements',
		'SELECT'
	),
	'authenticated users have SELECT permission on achievement definitions'
);


select ok(
	not has_table_privilege(
		'anon',
		'public.achievements',
		'INSERT'
	)
	and not has_table_privilege(
		'anon',
		'public.achievements',
		'UPDATE'
	)
	and not has_table_privilege(
		'anon',
		'public.achievements',
		'DELETE'
	),
	'guests cannot modify achievement definitions'
);


select ok(
	not has_table_privilege(
		'authenticated',
		'public.achievements',
		'INSERT'
	)
	and not has_table_privilege(
		'authenticated',
		'public.achievements',
		'UPDATE'
	)
	and not has_table_privilege(
		'authenticated',
		'public.achievements',
		'DELETE'
	),
	'authenticated users cannot modify achievement definitions'
);


select ok(
	has_table_privilege(
		'service_role',
		'public.achievements',
		'SELECT'
	)
	and has_table_privilege(
		'service_role',
		'public.achievements',
		'INSERT'
	)
	and has_table_privilege(
		'service_role',
		'public.achievements',
		'UPDATE'
	)
	and has_table_privilege(
		'service_role',
		'public.achievements',
		'DELETE'
	),
	'service_role retains management privileges on achievement definitions'
);


/* ==========================================================================
 * Private earned-achievement privileges
 * ========================================================================== */


select ok(
	has_table_privilege(
		'authenticated',
		'public.user_achievements',
		'SELECT'
	),
	'authenticated users have SELECT permission on earned achievements'
);


select ok(
	not has_table_privilege(
		'authenticated',
		'public.user_achievements',
		'INSERT'
	)
	and not has_table_privilege(
		'authenticated',
		'public.user_achievements',
		'UPDATE'
	)
	and not has_table_privilege(
		'authenticated',
		'public.user_achievements',
		'DELETE'
	),
	'authenticated users cannot directly award, modify or delete earned achievements'
);


select ok(
	not has_table_privilege(
		'anon',
		'public.user_achievements',
		'SELECT'
	)
	and not has_table_privilege(
		'anon',
		'public.user_achievements',
		'INSERT'
	)
	and not has_table_privilege(
		'anon',
		'public.user_achievements',
		'UPDATE'
	)
	and not has_table_privilege(
		'anon',
		'public.user_achievements',
		'DELETE'
	),
	'guests have no privileges on private earned achievements'
);


select ok(
	has_table_privilege(
		'service_role',
		'public.user_achievements',
		'SELECT'
	)
	and has_table_privilege(
		'service_role',
		'public.user_achievements',
		'INSERT'
	)
	and has_table_privilege(
		'service_role',
		'public.user_achievements',
		'UPDATE'
	)
	and has_table_privilege(
		'service_role',
		'public.user_achievements',
		'DELETE'
	),
	'service_role retains management privileges on earned achievements'
);


/* ==========================================================================
 * Achievement-definition integrity
 * ========================================================================== */


/*
 * Temporary achievement definition used only by this transaction.
 */
select results_eq(
	$$
		insert into public.achievements (
			code,
			title_en,
			title_ar,
			description_en,
			description_ar,
			criterion_type,
			threshold,
			sort_order
		)
		values (
			'test_first_task',
			'Test First Task',
			'اختبار المهمة الأولى',
			'Temporary achievement used by the pgTAP test suite.',
			'إنجاز مؤقت يستخدم في اختبار قاعدة البيانات.',
			'tasks_completed',
			1,
			1
		)
		returning
			code,
			criterion_type,
			threshold
	$$,
	$$
		values (
			'test_first_task'::text,
			'tasks_completed'::text,
			1::smallint
		)
	$$,
	'a valid preparedness achievement definition can be created'
);


select throws_ok(
	$$
		insert into public.achievements (
			code,
			title_en,
			title_ar,
			description_en,
			description_ar,
			criterion_type,
			threshold
		)
		values (
			'test_invalid_criterion',
			'Invalid Criterion',
			'معيار غير صالح',
			'Temporary invalid criterion test.',
			'اختبار مؤقت لمعيار غير صالح.',
			'leaderboard_position',
			1
		)
	$$,
	'23514',
	null,
	'unsupported achievement criterion types are rejected'
);


select throws_ok(
	$$
		insert into public.achievements (
			code,
			title_en,
			title_ar,
			description_en,
			description_ar,
			criterion_type,
			threshold
		)
		values (
			'test_zero_threshold',
			'Zero Threshold',
			'حد صفري',
			'Temporary invalid threshold test.',
			'اختبار مؤقت لحد غير صالح.',
			'tasks_completed',
			0
		)
	$$,
	'23514',
	null,
	'achievement thresholds must be greater than zero'
);


select throws_ok(
	$$
		insert into public.achievements (
			code,
			title_en,
			title_ar,
			description_en,
			description_ar,
			criterion_type,
			threshold
		)
		values (
			'test_first_task',
			'Duplicate Achievement',
			'إنجاز مكرر',
			'Temporary duplicate achievement test.',
			'اختبار مؤقت لإنجاز مكرر.',
			'tasks_completed',
			2
		)
	$$,
	'23505',
	null,
	'duplicate achievement codes are rejected'
);


/* ==========================================================================
 * Temporary authentication identities
 * ========================================================================== */


insert into auth.users (
	id,
	email,
	aud,
	role
)
values
	(
		'99999999-9999-9999-9999-999999999999',
		'achievement-user-a@example.test',
		'authenticated',
		'authenticated'
	),
	(
		'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
		'achievement-user-b@example.test',
		'authenticated',
		'authenticated'
	);


/*
 * Simulate a trusted reward-engine/backend award.
 *
 * The ordinary database test role is used here because the purpose of this
 * fixture is to create an already-earned achievement before exercising
 * client RLS behaviour.
 */
insert into public.user_achievements (
	user_id,
	achievement_id
)
values (
	'99999999-9999-9999-9999-999999999999',
	(
		select id
		from public.achievements
		where code = 'test_first_task'
	)
);


/* ==========================================================================
 * User A: own achievement visibility and self-award prevention
 * ========================================================================== */


set local role authenticated;

set local request.jwt.claim.sub =
	'99999999-9999-9999-9999-999999999999';


select results_eq(
	$$
		select
			a.code,
			ua.earned_at is not null
		from public.user_achievements as ua
		join public.achievements as a
			on a.id = ua.achievement_id
		order by a.code
	$$,
	$$
		values (
			'test_first_task'::text,
			true
		)
	$$,
	'User A can read their own earned preparedness achievement'
);


/*
 * A user must not be able to grant themselves a badge merely by inserting
 * into user_achievements. Achievement awards are reserved for controlled
 * backend/database reward logic.
 */
select throws_ok(
	$$
		insert into public.user_achievements (
			user_id,
			achievement_id
		)
		values (
			'99999999-9999-9999-9999-999999999999',
			(
				select id
				from public.achievements
				where code = 'test_first_task'
			)
		)
	$$,
	'42501',
	null,
	'authenticated users cannot award achievements to themselves'
);


reset role;


/* ==========================================================================
 * User B: cross-account isolation
 * ========================================================================== */


set local role authenticated;

set local request.jwt.claim.sub =
	'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';


select is(
	(
		select count(*)
		from public.user_achievements
	),
	0::bigint,
	'User B cannot read User A earned achievements'
);


reset role;


/* ==========================================================================
 * Earned-achievement relational integrity
 * ========================================================================== */


/*
 * The composite primary key prevents the same achievement from being awarded
 * twice to the same account.
 */
select throws_ok(
	$$
		insert into public.user_achievements (
			user_id,
			achievement_id
		)
		values (
			'99999999-9999-9999-9999-999999999999',
			(
				select id
				from public.achievements
				where code = 'test_first_task'
			)
		)
	$$,
	'23505',
	null,
	'the same achievement cannot be awarded twice to one user'
);


select throws_ok(
	$$
		insert into public.user_achievements (
			user_id,
			achievement_id
		)
		values (
			'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
			-999
		)
	$$,
	'23503',
	null,
	'earned achievements cannot reference an unknown achievement definition'
);


/* ==========================================================================
 * Anonymous isolation
 * ========================================================================== */


set local role anon;


select throws_ok(
	$$
		select achievement_id
		from public.user_achievements
	$$,
	'42501',
	null,
	'guests cannot read private earned achievements'
);


reset role;


/* ==========================================================================
 * Auth-account deletion cascade
 * ========================================================================== */


/*
 * Give User B an achievement using the trusted test role and then delete the
 * Auth identity. User-owned achievement records must disappear with it.
 */
insert into public.user_achievements (
	user_id,
	achievement_id
)
values (
	'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
	(
		select id
		from public.achievements
		where code = 'test_first_task'
	)
);


delete from auth.users
where id =
	'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';


select is(
	(
		select count(*)
		from public.user_achievements
		where user_id =
			'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
	),
	0::bigint,
	'deleting an Auth user cascades to their earned achievements'
);


select * from finish();

rollback;