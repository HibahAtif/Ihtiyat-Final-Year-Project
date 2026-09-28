begin;

create extension if not exists pgtap
	with schema extensions;

select plan(25);


/* ==========================================================================
 * submit_quiz_answer() RPC structure and privileges
 * ========================================================================== */

select ok(
	to_regprocedure(
		'public.submit_quiz_answer(bigint,bigint[])'
	) is not null,
	'submit_quiz_answer RPC exists'
);

select ok(
	(
		select prosecdef
		from pg_proc
		where oid =
			'public.submit_quiz_answer(bigint,bigint[])'::regprocedure
	),
	'submit_quiz_answer is SECURITY DEFINER'
);

select ok(
	exists (
		select 1
		from pg_proc
		cross join lateral unnest(
			coalesce(pg_proc.proconfig, '{}'::text[])
		) as config(setting)
		where pg_proc.oid =
				'public.submit_quiz_answer(bigint,bigint[])'::regprocedure
			and config.setting like 'search_path=%'
	),
	'submit_quiz_answer pins its search_path'
);

select ok(
	has_function_privilege(
		'anon',
		'public.submit_quiz_answer(bigint,bigint[])',
		'EXECUTE'
	),
	'guests may execute submit_quiz_answer for immediate learning feedback'
);

select ok(
	has_function_privilege(
		'authenticated',
		'public.submit_quiz_answer(bigint,bigint[])',
		'EXECUTE'
	),
	'authenticated users may execute submit_quiz_answer'
);


/* ==========================================================================
 * Temporary catalogue fixtures
 * ========================================================================== */

insert into public.preparedness_missions (
	code,
	title_en,
	title_ar,
	description_en,
	description_ar,
	mission_scope,
	is_active
)
values (
	'test_quiz_rpc_mission',
	'Quiz RPC Test Mission',
	'مهمة اختبار واجهة الاختبار',
	'Temporary mission for quiz RPC tests.',
	'مهمة مؤقتة لاختبارات واجهة الاختبار.',
	'national',
	true
);

insert into public.quiz_questions (
	mission_id,
	code,
	question_type,
	prompt_en,
	prompt_ar,
	explanation_en,
	explanation_ar,
	is_active
)
values
	(
		(select id from public.preparedness_missions where code = 'test_quiz_rpc_mission'),
		'test_single_quiz',
		'single_select',
		'Choose the correct temporary answer.',
		'اختر الإجابة المؤقتة الصحيحة.',
		'Temporary single-select explanation.',
		'شرح مؤقت لسؤال اختيار واحد.',
		true
	),
	(
		(select id from public.preparedness_missions where code = 'test_quiz_rpc_mission'),
		'test_multi_quiz',
		'multi_select',
		'Choose all correct temporary answers.',
		'اختر جميع الإجابات المؤقتة الصحيحة.',
		'Temporary multi-select explanation.',
		'شرح مؤقت لسؤال متعدد الاختيارات.',
		true
	),
	(
		(select id from public.preparedness_missions where code = 'test_quiz_rpc_mission'),
		'test_inactive_quiz',
		'single_select',
		'Inactive temporary question.',
		'سؤال مؤقت غير نشط.',
		'Inactive explanation.',
		'شرح غير نشط.',
		false
	),
	(
		(select id from public.preparedness_missions where code = 'test_quiz_rpc_mission'),
		'test_malformed_single_quiz',
		'single_select',
		'Malformed temporary question.',
		'سؤال مؤقت ذو إعداد غير صالح.',
		'Malformed explanation.',
		'شرح إعداد غير صالح.',
		true
	);

insert into public.quiz_options (
	question_id,
	option_code,
	text_en,
	text_ar,
	is_correct,
	sort_order
)
values
	(
		(select id from public.quiz_questions where code = 'test_single_quiz'),
		'single_a',
		'Single answer A',
		'الإجابة المفردة أ',
		true,
		1
	),
	(
		(select id from public.quiz_questions where code = 'test_single_quiz'),
		'single_b',
		'Single answer B',
		'الإجابة المفردة ب',
		false,
		2
	),
	(
		(select id from public.quiz_questions where code = 'test_single_quiz'),
		'single_c',
		'Single answer C',
		'الإجابة المفردة ج',
		false,
		3
	),
	(
		(select id from public.quiz_questions where code = 'test_multi_quiz'),
		'multi_a',
		'Multi answer A',
		'الإجابة المتعددة أ',
		true,
		1
	),
	(
		(select id from public.quiz_questions where code = 'test_multi_quiz'),
		'multi_b',
		'Multi answer B',
		'الإجابة المتعددة ب',
		true,
		2
	),
	(
		(select id from public.quiz_questions where code = 'test_multi_quiz'),
		'multi_c',
		'Multi answer C',
		'الإجابة المتعددة ج',
		false,
		3
	),
	(
		(select id from public.quiz_questions where code = 'test_inactive_quiz'),
		'inactive_a',
		'Inactive answer A',
		'إجابة غير نشطة أ',
		true,
		1
	),
	(
		(select id from public.quiz_questions where code = 'test_inactive_quiz'),
		'inactive_b',
		'Inactive answer B',
		'إجابة غير نشطة ب',
		false,
		2
	),
	(
		(select id from public.quiz_questions where code = 'test_malformed_single_quiz'),
		'malformed_a',
		'Malformed answer A',
		'إجابة غير صالحة أ',
		true,
		1
	),
	(
		(select id from public.quiz_questions where code = 'test_malformed_single_quiz'),
		'malformed_b',
		'Malformed answer B',
		'إجابة غير صالحة ب',
		true,
		2
	);


/* ==========================================================================
 * Authenticated quiz submission and progress recording
 * ========================================================================== */

insert into auth.users (
	id,
	email,
	aud,
	role
)
values (
	'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
	'quiz-rpc-user@example.test',
	'authenticated',
	'authenticated'
);

set local role authenticated;
set local request.jwt.claim.sub =
	'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

select is(
	(select count(*) from public.user_quiz_progress),
	0::bigint,
	'authenticated quiz user begins with no progress rows'
);

select results_eq(
	$$
		select
			is_correct,
			progress_recorded,
			has_correct_answer,
			attempt_count,
			explanation_en,
			correct_option_ids = array[
				(
					select id
					from public.quiz_options
					where option_code = 'single_a'
				)
			]::bigint[]
		from public.submit_quiz_answer(
			(
				select id
				from public.quiz_questions
				where code = 'test_single_quiz'
			),
			array[
				(
					select id
					from public.quiz_options
					where option_code = 'single_b'
				)
			]::bigint[]
		)
	$$,
	$$
		values (
			false,
			true,
			false,
			1::smallint,
			'Temporary single-select explanation.'::text,
			true
		)
	$$,
	'an incorrect answer is validated server-side and returns post-answer feedback'
);

select results_eq(
	$$
		select
			has_correct_answer,
			attempt_count,
			first_attempted_at is not null,
			last_attempted_at is not null
		from public.user_quiz_progress
		where question_id = (
			select id
			from public.quiz_questions
			where code = 'test_single_quiz'
		)
	$$,
	$$
		values (
			false,
			1::smallint,
			true,
			true
		)
	$$,
	'the first authenticated quiz attempt is recorded by the RPC'
);

reset role;

create temporary table first_attempt_snapshot as
select
	user_id,
	question_id,
	first_attempted_at
from public.user_quiz_progress
where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

set local role authenticated;
set local request.jwt.claim.sub =
	'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

select results_eq(
	$$
		select
			is_correct,
			progress_recorded,
			has_correct_answer,
			attempt_count
		from public.submit_quiz_answer(
			(
				select id
				from public.quiz_questions
				where code = 'test_single_quiz'
			),
			array[
				(
					select id
					from public.quiz_options
					where option_code = 'single_a'
				)
			]::bigint[]
		)
	$$,
	$$
		values (
			true,
			true,
			true,
			2::smallint
		)
	$$,
	'a correct retry marks the question as successfully completed and increments attempts'
);

reset role;

select is(
	(
		select progress.first_attempted_at
		from public.user_quiz_progress as progress
		where progress.user_id =
			'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
			and progress.question_id = (
				select id
				from public.quiz_questions
				where code = 'test_single_quiz'
			)
	),
	(
		select snapshot.first_attempted_at
		from first_attempt_snapshot as snapshot
		where snapshot.user_id =
			'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
			and snapshot.question_id = (
				select id
				from public.quiz_questions
				where code = 'test_single_quiz'
			)
	),
	'the original first-attempt timestamp is preserved across retries'
);

set local role authenticated;
set local request.jwt.claim.sub =
	'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

select results_eq(
	$$
		select
			is_correct,
			has_correct_answer,
			attempt_count
		from public.submit_quiz_answer(
			(
				select id
				from public.quiz_questions
				where code = 'test_single_quiz'
			),
			array[
				(
					select id
					from public.quiz_options
					where option_code = 'single_c'
				)
			]::bigint[]
		)
	$$,
	$$
		values (
			false,
			true,
			3::smallint
		)
	$$,
	'a later incorrect retry does not erase an earlier correct result'
);


/* ==========================================================================
 * RPC input and catalogue validation
 * ========================================================================== */

select throws_ok(
	$$
		select *
		from public.submit_quiz_answer(
			(
				select id
				from public.quiz_questions
				where code = 'test_single_quiz'
			),
			array[]::bigint[]
		)
	$$,
	'22023',
	'At least one quiz option must be submitted.',
	'empty quiz submissions are rejected'
);

select throws_ok(
	$$
		select *
		from public.submit_quiz_answer(
			(
				select id
				from public.quiz_questions
				where code = 'test_single_quiz'
			),
			array[null::bigint]
		)
	$$,
	'22023',
	'Quiz option identifiers cannot contain NULL values.',
	'NULL quiz option identifiers are rejected'
);

select throws_ok(
	$$
		select *
		from public.submit_quiz_answer(
			(
				select id
				from public.quiz_questions
				where code = 'test_single_quiz'
			),
			array[
				(select id from public.quiz_options where option_code = 'single_a'),
				(select id from public.quiz_options where option_code = 'single_a')
			]::bigint[]
		)
	$$,
	'22023',
	'Duplicate quiz option identifiers are not allowed.',
	'duplicate submitted quiz option identifiers are rejected'
);

select throws_ok(
	$$
		select *
		from public.submit_quiz_answer(
			(
				select id
				from public.quiz_questions
				where code = 'test_single_quiz'
			),
			array[
				(select id from public.quiz_options where option_code = 'multi_a')
			]::bigint[]
		)
	$$,
	'22023',
	'Every submitted quiz option must belong to the selected question.',
	'options from another quiz question are rejected'
);

select throws_ok(
	$$
		select *
		from public.submit_quiz_answer(
			(
				select id
				from public.quiz_questions
				where code = 'test_single_quiz'
			),
			array[
				(select id from public.quiz_options where option_code = 'single_a'),
				(select id from public.quiz_options where option_code = 'single_b')
			]::bigint[]
		)
	$$,
	'22023',
	'Single-select quiz questions accept exactly one submitted option.',
	'single-select quiz questions reject multiple submitted options'
);

select throws_ok(
	$$
		select *
		from public.submit_quiz_answer(
			-999,
			array[1::bigint]
		)
	$$,
	'22023',
	'Quiz question is unavailable.',
	'unknown quiz questions are rejected'
);

select throws_ok(
	$$
		select *
		from public.submit_quiz_answer(
			(
				select id
				from public.quiz_questions
				where code = 'test_inactive_quiz'
			),
			array[
				(select id from public.quiz_options where option_code = 'inactive_a')
			]::bigint[]
		)
	$$,
	'22023',
	'Quiz question is unavailable.',
	'inactive quiz questions cannot be submitted'
);

select throws_ok(
	$$
		select *
		from public.submit_quiz_answer(
			(
				select id
				from public.quiz_questions
				where code = 'test_malformed_single_quiz'
			),
			array[
				(select id from public.quiz_options where option_code = 'malformed_a')
			]::bigint[]
		)
	$$,
	'23514',
	'Single-select quiz questions require exactly one correct option.',
	'malformed single-select answer configurations are rejected'
);


/* ==========================================================================
 * Multi-select exact-set validation
 * ========================================================================== */

select results_eq(
	$$
		select is_correct, has_correct_answer, attempt_count
		from public.submit_quiz_answer(
			(
				select id
				from public.quiz_questions
				where code = 'test_multi_quiz'
			),
			array[
				(select id from public.quiz_options where option_code = 'multi_a')
			]::bigint[]
		)
	$$,
	$$
		values (false, false, 1::smallint)
	$$,
	'a partial multi-select answer is not accepted as correct'
);

select results_eq(
	$$
		select is_correct, has_correct_answer, attempt_count
		from public.submit_quiz_answer(
			(
				select id
				from public.quiz_questions
				where code = 'test_multi_quiz'
			),
			array[
				(select id from public.quiz_options where option_code = 'multi_a'),
				(select id from public.quiz_options where option_code = 'multi_b')
			]::bigint[]
		)
	$$,
	$$
		values (true, true, 2::smallint)
	$$,
	'the exact correct multi-select answer set is accepted'
);

select results_eq(
	$$
		select is_correct, has_correct_answer, attempt_count
		from public.submit_quiz_answer(
			(
				select id
				from public.quiz_questions
				where code = 'test_multi_quiz'
			),
			array[
				(select id from public.quiz_options where option_code = 'multi_a'),
				(select id from public.quiz_options where option_code = 'multi_b'),
				(select id from public.quiz_options where option_code = 'multi_c')
			]::bigint[]
		)
	$$,
	$$
		values (false, true, 3::smallint)
	$$,
	'adding an incorrect option makes an otherwise complete multi-select answer incorrect'
);

select results_eq(
	$$
		select has_correct_answer, attempt_count
		from public.user_quiz_progress
		where question_id = (
			select id
			from public.quiz_questions
			where code = 'test_multi_quiz'
		)
	$$,
	$$
		values (true, 3::smallint)
	$$,
	'multi-select progress preserves successful completion while counting every attempt'
);


/* ==========================================================================
 * Anonymous feedback without private progress
 * ========================================================================== */

reset role;
set local role anon;
set local request.jwt.claim.sub = '';

select results_eq(
	$$
		select
			is_correct,
			progress_recorded,
			has_correct_answer is null,
			attempt_count is null,
			explanation_en
		from public.submit_quiz_answer(
			(
				select id
				from public.quiz_questions
				where code = 'test_single_quiz'
			),
			array[
				(select id from public.quiz_options where option_code = 'single_a')
			]::bigint[]
		)
	$$,
	$$
		values (
			true,
			false,
			true,
			true,
			'Temporary single-select explanation.'::text
		)
	$$,
	'guests receive quiz feedback without creating private progress'
);

reset role;

select is(
	(
		select count(*)
		from public.user_quiz_progress
		where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
	),
	2::bigint,
	'an anonymous quiz submission does not create an additional private progress row'
);


select * from finish();

rollback;
