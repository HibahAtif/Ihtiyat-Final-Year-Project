begin;

create extension if not exists pgtap
	with schema extensions;

select plan(42);


/* ==========================================================================
 * Private preparedness-progress structure and privileges
 * ========================================================================== */

select is(
	(
		select count(*)
		from information_schema.tables
		where table_schema = 'public'
			and table_name in (
				'user_mission_task_progress',
				'user_quiz_progress'
			)
	),
	2::bigint,
	'both private preparedness-progress tables exist'
);

select is(
	(
		select count(*)
		from pg_class
		join pg_namespace
			on pg_namespace.oid = pg_class.relnamespace
		where pg_namespace.nspname = 'public'
			and pg_class.relname in (
				'user_mission_task_progress',
				'user_quiz_progress'
			)
			and pg_class.relrowsecurity
	),
	2::bigint,
	'RLS is enabled on both private preparedness-progress tables'
);

select ok(
	has_table_privilege(
		'authenticated',
		'public.user_mission_task_progress',
		'SELECT'
	)
	and has_table_privilege(
		'authenticated',
		'public.user_quiz_progress',
		'SELECT'
	),
	'authenticated users have SELECT permission on both progress tables'
);

select ok(
	has_column_privilege(
		'authenticated',
		'public.user_mission_task_progress',
		'user_id',
		'INSERT'
	)
	and has_column_privilege(
		'authenticated',
		'public.user_mission_task_progress',
		'task_id',
		'INSERT'
	)
	and has_column_privilege(
		'authenticated',
		'public.user_mission_task_progress',
		'is_completed',
		'INSERT'
	),
	'authenticated users may insert the intended mission-task progress fields'
);

select ok(
	has_column_privilege(
		'authenticated',
		'public.user_mission_task_progress',
		'is_completed',
		'UPDATE'
	),
	'authenticated users may update mission-task completion state'
);

select ok(
	not has_column_privilege(
		'authenticated',
		'public.user_mission_task_progress',
		'user_id',
		'UPDATE'
	)
	and not has_column_privilege(
		'authenticated',
		'public.user_mission_task_progress',
		'task_id',
		'UPDATE'
	)
	and not has_column_privilege(
		'authenticated',
		'public.user_mission_task_progress',
		'completed_at',
		'INSERT'
	)
	and not has_column_privilege(
		'authenticated',
		'public.user_mission_task_progress',
		'completed_at',
		'UPDATE'
	)
	and not has_column_privilege(
		'authenticated',
		'public.user_mission_task_progress',
		'created_at',
		'INSERT'
	)
	and not has_column_privilege(
		'authenticated',
		'public.user_mission_task_progress',
		'updated_at',
		'UPDATE'
	),
	'mission-task ownership, references and timestamps remain database-controlled'
);

select ok(
	not has_table_privilege(
		'authenticated',
		'public.user_quiz_progress',
		'INSERT'
	)
	and not has_table_privilege(
		'authenticated',
		'public.user_quiz_progress',
		'UPDATE'
	),
	'authenticated users have no direct INSERT or UPDATE privilege on quiz progress'
);

select ok(
	not has_column_privilege(
		'authenticated',
		'public.user_quiz_progress',
		'has_correct_answer',
		'INSERT'
	)
	and not has_column_privilege(
		'authenticated',
		'public.user_quiz_progress',
		'has_correct_answer',
		'UPDATE'
	)
	and not has_column_privilege(
		'authenticated',
		'public.user_quiz_progress',
		'attempt_count',
		'INSERT'
	)
	and not has_column_privilege(
		'authenticated',
		'public.user_quiz_progress',
		'attempt_count',
		'UPDATE'
	),
	'authenticated clients cannot directly forge quiz correctness or attempt counts'
);

select ok(
	not has_table_privilege(
		'authenticated',
		'public.user_mission_task_progress',
		'DELETE'
	)
	and not has_table_privilege(
		'authenticated',
		'public.user_quiz_progress',
		'DELETE'
	),
	'authenticated users do not have direct DELETE access to preparedness progress'
);

select ok(
	not has_table_privilege(
		'anon',
		'public.user_mission_task_progress',
		'SELECT'
	)
	and not has_table_privilege(
		'anon',
		'public.user_quiz_progress',
		'SELECT'
	)
	and not has_table_privilege(
		'anon',
		'public.user_quiz_progress',
		'INSERT'
	)
	and not has_table_privilege(
		'anon',
		'public.user_quiz_progress',
		'UPDATE'
	),
	'guests have no direct privileges on private preparedness progress'
);

select ok(
	has_table_privilege(
		'service_role',
		'public.user_mission_task_progress',
		'SELECT'
	)
	and has_table_privilege(
		'service_role',
		'public.user_mission_task_progress',
		'INSERT'
	)
	and has_table_privilege(
		'service_role',
		'public.user_mission_task_progress',
		'UPDATE'
	)
	and has_table_privilege(
		'service_role',
		'public.user_mission_task_progress',
		'DELETE'
	)
	and has_table_privilege(
		'service_role',
		'public.user_quiz_progress',
		'SELECT'
	)
	and has_table_privilege(
		'service_role',
		'public.user_quiz_progress',
		'INSERT'
	)
	and has_table_privilege(
		'service_role',
		'public.user_quiz_progress',
		'UPDATE'
	)
	and has_table_privilege(
		'service_role',
		'public.user_quiz_progress',
		'DELETE'
	),
	'service_role retains management privileges on both progress tables'
);

select ok(
	exists (
		select 1
		from pg_trigger
		where tgrelid =
				'public.user_mission_task_progress'::regclass
			and tgname =
				'on_user_mission_task_progress_changed'
			and not tgisinternal
	),
	'mission-task progress timestamp trigger exists'
);

select ok(
	exists (
		select 1
		from pg_trigger
		where tgrelid =
				'public.user_quiz_progress'::regclass
			and tgname =
				'on_user_quiz_progress_updated'
			and not tgisinternal
	),
	'quiz progress updated_at trigger exists'
);


/* ==========================================================================
 * Temporary catalogue fixtures
 * ========================================================================== */

insert into public.hazards (
	code,
	name_en,
	name_ar,
	classification,
	is_active
)
values
	(
		'test_progress_hazard',
		'Progress Test Hazard',
		'خطر اختبار التقدم',
		'core',
		true
	),
	(
		'test_inactive_progress_hazard',
		'Inactive Progress Test Hazard',
		'خطر اختبار تقدم غير نشط',
		'core',
		false
	);

insert into public.preparedness_missions (
	code,
	title_en,
	title_ar,
	description_en,
	description_ar,
	mission_scope,
	is_active
)
values
	(
		'test_progress_mission',
		'Progress Test Mission',
		'مهمة اختبار التقدم',
		'Temporary mission for progress database tests.',
		'مهمة مؤقتة لاختبارات تقدم قاعدة البيانات.',
		'national',
		true
	),
	(
		'test_inactive_progress_mission',
		'Inactive Progress Test Mission',
		'مهمة اختبار تقدم غير نشطة',
		'Temporary inactive mission for progress database tests.',
		'مهمة مؤقتة غير نشطة لاختبارات تقدم قاعدة البيانات.',
		'national',
		false
	);

insert into public.mission_tasks (
	mission_id,
	hazard_id,
	code,
	title_en,
	title_ar,
	points,
	sort_order,
	is_active
)
values
	(
		(select id from public.preparedness_missions where code = 'test_progress_mission'),
		null,
		'test_progress_task_one',
		'Progress Test Task One',
		'مهمة اختبار التقدم الأولى',
		10,
		1,
		true
	),
	(
		(select id from public.preparedness_missions where code = 'test_progress_mission'),
		null,
		'test_progress_task_two',
		'Progress Test Task Two',
		'مهمة اختبار التقدم الثانية',
		10,
		2,
		true
	),
	(
		(select id from public.preparedness_missions where code = 'test_progress_mission'),
		null,
		'test_inactive_task',
		'Inactive Test Task',
		'مهمة اختبار غير نشطة',
		10,
		3,
		false
	),
	(
		(select id from public.preparedness_missions where code = 'test_inactive_progress_mission'),
		null,
		'test_task_in_inactive_mission',
		'Task In Inactive Mission',
		'مهمة ضمن مهمة رئيسية غير نشطة',
		10,
		4,
		true
	),
	(
		(select id from public.preparedness_missions where code = 'test_progress_mission'),
		(select id from public.hazards where code = 'test_inactive_progress_hazard'),
		'test_task_in_inactive_hazard',
		'Task In Inactive Hazard',
		'مهمة مرتبطة بخطر غير نشط',
		10,
		5,
		true
	),
	(
		(select id from public.preparedness_missions where code = 'test_progress_mission'),
		null,
		'test_progress_freeze_task',
		'Progress Freeze Test Task',
		'مهمة اختبار تجميد التقدم',
		10,
		6,
		true
	);

insert into public.quiz_questions (
	mission_id,
	code,
	question_type,
	prompt_en,
	prompt_ar,
	explanation_en,
	explanation_ar
)
values (
	(select id from public.preparedness_missions where code = 'test_progress_mission'),
	'test_progress_quiz',
	'single_select',
	'Temporary progress question?',
	'سؤال تقدم مؤقت؟',
	'Temporary progress explanation.',
	'شرح تقدم مؤقت.'
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
		'77777777-7777-7777-7777-777777777777',
		'preparedness-progress-user-a@example.test',
		'authenticated',
		'authenticated'
	),
	(
		'88888888-8888-8888-8888-888888888888',
		'preparedness-progress-user-b@example.test',
		'authenticated',
		'authenticated'
	);


/* ==========================================================================
 * User A: mission-task progress
 * ========================================================================== */

set local role authenticated;
set local request.jwt.claim.sub =
	'77777777-7777-7777-7777-777777777777';

select results_eq(
	$$
		insert into public.user_mission_task_progress (
			user_id,
			task_id,
			is_completed
		)
		values (
			'77777777-7777-7777-7777-777777777777',
			(select id from public.mission_tasks where code = 'test_progress_task_one'),
			false
		)
		returning is_completed, completed_at is null
	$$,
	$$
		values (false, true)
	$$,
	'User A can create their own incomplete mission-task progress'
);

select results_eq(
	$$
		insert into public.user_mission_task_progress (
			user_id,
			task_id,
			is_completed
		)
		values (
			'77777777-7777-7777-7777-777777777777',
			(select id from public.mission_tasks where code = 'test_progress_task_two'),
			true
		)
		returning is_completed, completed_at is not null
	$$,
	$$
		values (true, true)
	$$,
	'completed mission-task progress receives a database-managed completion timestamp'
);

select throws_ok(
	$$
		insert into public.user_mission_task_progress (
			user_id,
			task_id,
			is_completed
		)
		values (
			'77777777-7777-7777-7777-777777777777',
			(select id from public.mission_tasks where code = 'test_progress_task_one'),
			false
		)
	$$,
	'23505',
	null,
	'a user cannot have duplicate progress rows for the same mission task'
);

select throws_ok(
	$$
		insert into public.user_mission_task_progress (
			user_id,
			task_id,
			is_completed
		)
		values (
			'88888888-8888-8888-8888-888888888888',
			(select id from public.mission_tasks where code = 'test_progress_task_one'),
			true
		)
	$$,
	'42501',
	null,
	'User A cannot create mission-task progress owned by User B'
);

select results_eq(
	$$
		update public.user_mission_task_progress
		set is_completed = true
		where user_id = '77777777-7777-7777-7777-777777777777'
			and task_id = (
				select id
				from public.mission_tasks
				where code = 'test_progress_task_one'
			)
		returning is_completed, completed_at is not null
	$$,
	$$
		values (true, true)
	$$,
	'completing an existing task automatically sets completed_at'
);

select results_eq(
	$$
		update public.user_mission_task_progress
		set is_completed = false
		where user_id = '77777777-7777-7777-7777-777777777777'
			and task_id = (
				select id
				from public.mission_tasks
				where code = 'test_progress_task_two'
			)
		returning is_completed, completed_at is null
	$$,
	$$
		values (false, true)
	$$,
	'uncompleting a mission task automatically clears completed_at'
);

select throws_ok(
	$$
		insert into public.user_mission_task_progress (
			user_id,
			task_id,
			is_completed
		)
		values (
			'77777777-7777-7777-7777-777777777777',
			-999,
			false
		)
	$$,
	'42501',
	null,
	'authenticated clients cannot create progress for an unknown or unavailable mission task'
);


/*
 * The RLS policy deliberately masks unknown/unavailable tasks from ordinary
 * clients. A trusted write still reaches the foreign key, proving that the
 * relational constraint remains a second integrity layer.
 */
reset role;

select throws_ok(
	$$
		insert into public.user_mission_task_progress (
			user_id,
			task_id,
			is_completed
		)
		values (
			'77777777-7777-7777-7777-777777777777',
			-999,
			false
		)
	$$,
	'23503',
	null,
	'trusted writes still cannot reference an unknown mission task'
);

set local role authenticated;
set local request.jwt.claim.sub =
	'77777777-7777-7777-7777-777777777777';

select throws_ok(
	$$
		insert into public.user_mission_task_progress (
			user_id,
			task_id,
			is_completed
		)
		values (
			'77777777-7777-7777-7777-777777777777',
			(select id from public.mission_tasks where code = 'test_inactive_task'),
			true
		)
	$$,
	'42501',
	null,
	'new progress cannot be created for an inactive mission task'
);

select throws_ok(
	$$
		insert into public.user_mission_task_progress (
			user_id,
			task_id,
			is_completed
		)
		values (
			'77777777-7777-7777-7777-777777777777',
			(select id from public.mission_tasks where code = 'test_task_in_inactive_mission'),
			true
		)
	$$,
	'42501',
	null,
	'new progress cannot be created for a task whose mission is inactive'
);

select throws_ok(
	$$
		insert into public.user_mission_task_progress (
			user_id,
			task_id,
			is_completed
		)
		values (
			'77777777-7777-7777-7777-777777777777',
			(select id from public.mission_tasks where code = 'test_task_in_inactive_hazard'),
			true
		)
	$$,
	'42501',
	null,
	'new progress cannot be created for a task whose linked hazard is inactive'
);

select results_eq(
	$$
		insert into public.user_mission_task_progress (
			user_id,
			task_id,
			is_completed
		)
		values (
			'77777777-7777-7777-7777-777777777777',
			(select id from public.mission_tasks where code = 'test_progress_freeze_task'),
			false
		)
		returning is_completed
	$$,
	$$
		values (false)
	$$,
	'progress can be created while its mission task is active'
);

reset role;

update public.mission_tasks
set is_active = false
where code = 'test_progress_freeze_task';

set local role authenticated;
set local request.jwt.claim.sub =
	'77777777-7777-7777-7777-777777777777';

select is_empty(
	$$
		update public.user_mission_task_progress
		set is_completed = true
		where user_id = '77777777-7777-7777-7777-777777777777'
			and task_id = (
				select id
				from public.mission_tasks
				where code = 'test_progress_freeze_task'
			)
		returning task_id
	$$,
	'inactive catalogue tasks cannot have their historical progress mutated'
);


/* ==========================================================================
 * Quiz-progress direct-write protection and state integrity
 * ========================================================================== */

select throws_ok(
	$$
		insert into public.user_quiz_progress (
			user_id,
			question_id,
			has_correct_answer,
			attempt_count,
			first_attempted_at,
			last_attempted_at
		)
		values (
			'77777777-7777-7777-7777-777777777777',
			(select id from public.quiz_questions where code = 'test_progress_quiz'),
			true,
			1,
			now(),
			now()
		)
	$$,
	'42501',
	null,
	'authenticated clients cannot directly insert quiz progress'
);

select throws_ok(
	$$
		update public.user_quiz_progress
		set has_correct_answer = true
		where user_id = '77777777-7777-7777-7777-777777777777'
	$$,
	'42501',
	null,
	'authenticated clients cannot directly update quiz progress'
);

reset role;

select throws_ok(
	$$
		insert into public.user_quiz_progress (
			user_id,
			question_id,
			has_correct_answer,
			attempt_count,
			first_attempted_at,
			last_attempted_at
		)
		values (
			'77777777-7777-7777-7777-777777777777',
			(select id from public.quiz_questions where code = 'test_progress_quiz'),
			true,
			0,
			null,
			null
		)
	$$,
	'23514',
	null,
	'zero quiz attempts cannot already be marked correct'
);

select throws_ok(
	$$
		insert into public.user_quiz_progress (
			user_id,
			question_id,
			has_correct_answer,
			attempt_count,
			first_attempted_at,
			last_attempted_at
		)
		values (
			'77777777-7777-7777-7777-777777777777',
			(select id from public.quiz_questions where code = 'test_progress_quiz'),
			false,
			1,
			null,
			null
		)
	$$,
	'23514',
	null,
	'positive quiz attempt counts require attempt timestamps'
);

select throws_ok(
	$$
		insert into public.user_quiz_progress (
			user_id,
			question_id,
			has_correct_answer,
			attempt_count,
			first_attempted_at,
			last_attempted_at
		)
		values (
			'77777777-7777-7777-7777-777777777777',
			(select id from public.quiz_questions where code = 'test_progress_quiz'),
			false,
			1,
			'2026-09-20 12:00:00+00',
			'2026-09-20 11:00:00+00'
		)
	$$,
	'23514',
	null,
	'quiz first-attempt timestamps cannot be later than last-attempt timestamps'
);

insert into public.user_quiz_progress (
	user_id,
	question_id,
	has_correct_answer,
	attempt_count,
	first_attempted_at,
	last_attempted_at
)
values (
	'77777777-7777-7777-7777-777777777777',
	(select id from public.quiz_questions where code = 'test_progress_quiz'),
	false,
	1,
	'2026-09-20 10:00:00+00',
	'2026-09-20 10:00:00+00'
);

select throws_ok(
	$$
		insert into public.user_quiz_progress (
			user_id,
			question_id,
			has_correct_answer,
			attempt_count,
			first_attempted_at,
			last_attempted_at
		)
		values (
			'77777777-7777-7777-7777-777777777777',
			(select id from public.quiz_questions where code = 'test_progress_quiz'),
			false,
			1,
			'2026-09-20 10:00:00+00',
			'2026-09-20 10:00:00+00'
		)
	$$,
	'23505',
	null,
	'a user cannot have duplicate progress rows for the same quiz question'
);

select throws_ok(
	$$
		insert into public.user_quiz_progress (
			user_id,
			question_id,
			has_correct_answer,
			attempt_count,
			first_attempted_at,
			last_attempted_at
		)
		values (
			'77777777-7777-7777-7777-777777777777',
			-999,
			false,
			1,
			'2026-09-20 10:00:00+00',
			'2026-09-20 10:00:00+00'
		)
	$$,
	'23503',
	null,
	'quiz progress cannot reference an unknown official quiz question'
);


/* ==========================================================================
 * Cross-account isolation
 * ========================================================================== */

set local role authenticated;
set local request.jwt.claim.sub =
	'88888888-8888-8888-8888-888888888888';

select is(
	(select count(*) from public.user_mission_task_progress),
	0::bigint,
	'User B cannot read User A mission-task progress'
);

select is(
	(select count(*) from public.user_quiz_progress),
	0::bigint,
	'User B cannot read User A quiz progress'
);

select is_empty(
	$$
		update public.user_mission_task_progress
		set is_completed = true
		where user_id = '77777777-7777-7777-7777-777777777777'
		returning task_id
	$$,
	'User B cannot update User A mission-task progress'
);

reset role;

select results_eq(
	$$
		select
			count(*) filter (
				where user_id = '77777777-7777-7777-7777-777777777777'
			),
			count(*) filter (
				where user_id = '88888888-8888-8888-8888-888888888888'
			)
		from public.user_mission_task_progress
	$$,
	$$
		values (3::bigint, 0::bigint)
	$$,
	'mission-task progress ownership remains unchanged after cross-account attempts'
);

select results_eq(
	$$
		select
			count(*) filter (
				where user_id = '77777777-7777-7777-7777-777777777777'
			),
			count(*) filter (
				where user_id = '88888888-8888-8888-8888-888888888888'
			)
		from public.user_quiz_progress
	$$,
	$$
		values (1::bigint, 0::bigint)
	$$,
	'quiz progress ownership remains unchanged after cross-account access attempts'
);


/* ==========================================================================
 * Anonymous isolation
 * ========================================================================== */

set local role anon;
set local request.jwt.claim.sub = '';

select throws_ok(
	$$
		select task_id
		from public.user_mission_task_progress
	$$,
	'42501',
	null,
	'guests cannot read private mission-task progress'
);

select throws_ok(
	$$
		select question_id
		from public.user_quiz_progress
	$$,
	'42501',
	null,
	'guests cannot read private quiz progress'
);

reset role;


/* ==========================================================================
 * Auth-account deletion cascade
 * ========================================================================== */

insert into public.user_mission_task_progress (
	user_id,
	task_id,
	is_completed
)
values (
	'88888888-8888-8888-8888-888888888888',
	(select id from public.mission_tasks where code = 'test_progress_task_one'),
	true
);

insert into public.user_quiz_progress (
	user_id,
	question_id,
	has_correct_answer,
	attempt_count,
	first_attempted_at,
	last_attempted_at
)
values (
	'88888888-8888-8888-8888-888888888888',
	(select id from public.quiz_questions where code = 'test_progress_quiz'),
	false,
	1,
	'2026-09-20 11:00:00+00',
	'2026-09-20 11:00:00+00'
);

delete from auth.users
where id =
	'88888888-8888-8888-8888-888888888888';

select is(
	(
		select count(*)
		from public.user_mission_task_progress
		where user_id = '88888888-8888-8888-8888-888888888888'
	),
	0::bigint,
	'deleting an Auth user cascades to their mission-task progress'
);

select is(
	(
		select count(*)
		from public.user_quiz_progress
		where user_id = '88888888-8888-8888-8888-888888888888'
	),
	0::bigint,
	'deleting an Auth user cascades to their quiz progress'
);


select * from finish();

rollback;