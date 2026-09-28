begin;

create extension if not exists pgtap
	with schema extensions;

select plan(39);


/* ==========================================================================
 * Preparedness catalogue structure and RLS
 * ========================================================================== */

select is(
	(
		select count(*)
		from information_schema.tables
		where table_schema = 'public'
			and table_name in (
				'hazards',
				'location_hazard_profiles',
				'preparedness_missions',
				'mission_tasks',
				'quiz_questions',
				'quiz_options'
			)
	),
	6::bigint,
	'all six disaster-preparedness catalogue tables exist'
);

select is(
	(
		select count(*)
		from pg_class
		join pg_namespace
			on pg_namespace.oid = pg_class.relnamespace
		where pg_namespace.nspname = 'public'
			and pg_class.relname in (
				'hazards',
				'location_hazard_profiles',
				'preparedness_missions',
				'mission_tasks',
				'quiz_questions',
				'quiz_options'
			)
			and pg_class.relrowsecurity
	),
	6::bigint,
	'RLS is enabled on all six preparedness catalogue tables'
);


/* ==========================================================================
 * Catalogue read/write privileges
 * ========================================================================== */

select ok(
	(
		select bool_and(
			has_table_privilege('anon', table_name, 'SELECT')
		)
		from (
			values
				('public.hazards'),
				('public.location_hazard_profiles'),
				('public.preparedness_missions'),
				('public.mission_tasks')
		) as catalogue(table_name)
	),
	'guests have SELECT permission on the non-quiz preparedness catalogue'
);

select ok(
	(
		select bool_and(
			has_table_privilege('authenticated', table_name, 'SELECT')
		)
		from (
			values
				('public.hazards'),
				('public.location_hazard_profiles'),
				('public.preparedness_missions'),
				('public.mission_tasks')
		) as catalogue(table_name)
	),
	'authenticated users have SELECT permission on the non-quiz preparedness catalogue'
);

/*
 * Quiz tables deliberately use column-level SELECT grants. Whole-row SELECT
 * would expose post-answer explanations or the correct-answer flag.
 */
select ok(
	not has_table_privilege(
		'anon',
		'public.quiz_questions',
		'SELECT'
	)
	and not has_table_privilege(
		'anon',
		'public.quiz_options',
		'SELECT'
	),
	'guests do not have unrestricted table-level SELECT on quiz content'
);

select ok(
	not has_table_privilege(
		'authenticated',
		'public.quiz_questions',
		'SELECT'
	)
	and not has_table_privilege(
		'authenticated',
		'public.quiz_options',
		'SELECT'
	),
	'authenticated users do not have unrestricted table-level SELECT on quiz content'
);

select ok(
	has_column_privilege('anon', 'public.quiz_questions', 'id', 'SELECT')
	and has_column_privilege('anon', 'public.quiz_questions', 'mission_id', 'SELECT')
	and has_column_privilege('anon', 'public.quiz_questions', 'hazard_id', 'SELECT')
	and has_column_privilege('anon', 'public.quiz_questions', 'code', 'SELECT')
	and has_column_privilege('anon', 'public.quiz_questions', 'question_type', 'SELECT')
	and has_column_privilege('anon', 'public.quiz_questions', 'prompt_en', 'SELECT')
	and has_column_privilege('anon', 'public.quiz_questions', 'prompt_ar', 'SELECT')
	and has_column_privilege('anon', 'public.quiz_questions', 'sort_order', 'SELECT')
	and has_column_privilege('anon', 'public.quiz_questions', 'is_active', 'SELECT')
	and has_column_privilege('anon', 'public.quiz_questions', 'created_at', 'SELECT'),
	'guests can read the intended public quiz-question columns'
);

select ok(
	has_column_privilege('authenticated', 'public.quiz_questions', 'id', 'SELECT')
	and has_column_privilege('authenticated', 'public.quiz_questions', 'mission_id', 'SELECT')
	and has_column_privilege('authenticated', 'public.quiz_questions', 'hazard_id', 'SELECT')
	and has_column_privilege('authenticated', 'public.quiz_questions', 'code', 'SELECT')
	and has_column_privilege('authenticated', 'public.quiz_questions', 'question_type', 'SELECT')
	and has_column_privilege('authenticated', 'public.quiz_questions', 'prompt_en', 'SELECT')
	and has_column_privilege('authenticated', 'public.quiz_questions', 'prompt_ar', 'SELECT')
	and has_column_privilege('authenticated', 'public.quiz_questions', 'sort_order', 'SELECT')
	and has_column_privilege('authenticated', 'public.quiz_questions', 'is_active', 'SELECT')
	and has_column_privilege('authenticated', 'public.quiz_questions', 'created_at', 'SELECT'),
	'authenticated users can read the intended public quiz-question columns'
);

select ok(
	not has_column_privilege('anon', 'public.quiz_questions', 'explanation_en', 'SELECT')
	and not has_column_privilege('anon', 'public.quiz_questions', 'explanation_ar', 'SELECT')
	and not has_column_privilege('authenticated', 'public.quiz_questions', 'explanation_en', 'SELECT')
	and not has_column_privilege('authenticated', 'public.quiz_questions', 'explanation_ar', 'SELECT'),
	'post-answer quiz explanations are hidden from direct client reads'
);

select ok(
	has_column_privilege('anon', 'public.quiz_options', 'id', 'SELECT')
	and has_column_privilege('anon', 'public.quiz_options', 'question_id', 'SELECT')
	and has_column_privilege('anon', 'public.quiz_options', 'option_code', 'SELECT')
	and has_column_privilege('anon', 'public.quiz_options', 'text_en', 'SELECT')
	and has_column_privilege('anon', 'public.quiz_options', 'text_ar', 'SELECT')
	and has_column_privilege('anon', 'public.quiz_options', 'sort_order', 'SELECT')
	and has_column_privilege('anon', 'public.quiz_options', 'created_at', 'SELECT'),
	'guests can read the intended public quiz-option columns'
);

select ok(
	has_column_privilege('authenticated', 'public.quiz_options', 'id', 'SELECT')
	and has_column_privilege('authenticated', 'public.quiz_options', 'question_id', 'SELECT')
	and has_column_privilege('authenticated', 'public.quiz_options', 'option_code', 'SELECT')
	and has_column_privilege('authenticated', 'public.quiz_options', 'text_en', 'SELECT')
	and has_column_privilege('authenticated', 'public.quiz_options', 'text_ar', 'SELECT')
	and has_column_privilege('authenticated', 'public.quiz_options', 'sort_order', 'SELECT')
	and has_column_privilege('authenticated', 'public.quiz_options', 'created_at', 'SELECT'),
	'authenticated users can read the intended public quiz-option columns'
);

select ok(
	not has_column_privilege('anon', 'public.quiz_options', 'is_correct', 'SELECT')
	and not has_column_privilege('authenticated', 'public.quiz_options', 'is_correct', 'SELECT'),
	'the quiz answer key is hidden from direct client reads'
);

select ok(
	(
		select bool_and(
			not has_table_privilege('anon', table_name, 'INSERT')
			and not has_table_privilege('anon', table_name, 'UPDATE')
			and not has_table_privilege('anon', table_name, 'DELETE')
		)
		from (
			values
				('public.hazards'),
				('public.location_hazard_profiles'),
				('public.preparedness_missions'),
				('public.mission_tasks'),
				('public.quiz_questions'),
				('public.quiz_options')
		) as catalogue(table_name)
	),
	'guests have no write privileges on the preparedness catalogue'
);

select ok(
	(
		select bool_and(
			not has_table_privilege('authenticated', table_name, 'INSERT')
			and not has_table_privilege('authenticated', table_name, 'UPDATE')
			and not has_table_privilege('authenticated', table_name, 'DELETE')
		)
		from (
			values
				('public.hazards'),
				('public.location_hazard_profiles'),
				('public.preparedness_missions'),
				('public.mission_tasks'),
				('public.quiz_questions'),
				('public.quiz_options')
		) as catalogue(table_name)
	),
	'authenticated users have no write privileges on the preparedness catalogue'
);

select ok(
	(
		select bool_and(
			has_table_privilege('service_role', table_name, 'SELECT')
			and has_table_privilege('service_role', table_name, 'INSERT')
			and has_table_privilege('service_role', table_name, 'UPDATE')
			and has_table_privilege('service_role', table_name, 'DELETE')
		)
		from (
			values
				('public.hazards'),
				('public.location_hazard_profiles'),
				('public.preparedness_missions'),
				('public.mission_tasks'),
				('public.quiz_questions'),
				('public.quiz_options')
		) as catalogue(table_name)
	),
	'service_role retains management privileges on the preparedness catalogue'
);


/* ==========================================================================
 * Hazard and mission integrity
 * ========================================================================== */

select results_eq(
	$$
		insert into public.hazards (
			code,
			name_en,
			name_ar,
			classification,
			sort_order
		)
		values (
			'test_flood',
			'Test Flood Hazard',
			'خطر فيضان اختباري',
			'core',
			1
		)
		returning code, classification, sort_order
	$$,
	$$
		values ('test_flood'::text, 'core'::text, 1::smallint)
	$$,
	'a valid reusable hazard definition can be created'
);

select throws_ok(
	$$
		insert into public.hazards (
			code,
			name_en,
			name_ar,
			classification
		)
		values (
			'test_invalid_classification',
			'Invalid Classification',
			'تصنيف غير صالح',
			'critical'
		)
	$$,
	'23514',
	null,
	'unsupported hazard classifications are rejected'
);

select throws_ok(
	$$
		insert into public.hazards (
			code,
			name_en,
			name_ar,
			classification
		)
		values (
			'Invalid Hazard Code',
			'Invalid Code',
			'رمز غير صالح',
			'core'
		)
	$$,
	'23514',
	null,
	'hazard codes must follow the canonical lowercase identifier format'
);

select results_eq(
	$$
		insert into public.preparedness_missions (
			code,
			title_en,
			title_ar,
			description_en,
			description_ar,
			mission_scope,
			sort_order
		)
		values (
			'test_local_hazards',
			'Test Local Hazards',
			'اختبار المخاطر المحلية',
			'Temporary adaptive mission used by the pgTAP catalogue suite.',
			'مهمة تكيفية مؤقتة تستخدم في اختبار قاعدة البيانات.',
			'adaptive',
			1
		)
		returning code, mission_scope
	$$,
	$$
		values ('test_local_hazards'::text, 'adaptive'::text)
	$$,
	'a valid adaptive preparedness mission can be created'
);

select throws_ok(
	$$
		insert into public.preparedness_missions (
			code,
			title_en,
			title_ar,
			description_en,
			description_ar,
			mission_scope
		)
		values (
			'test_invalid_scope',
			'Invalid Scope',
			'نطاق غير صالح',
			'Invalid mission scope test.',
			'اختبار نطاق مهمة غير صالح.',
			'regional'
		)
	$$,
	'23514',
	null,
	'unsupported preparedness mission scopes are rejected'
);


/* ==========================================================================
 * Location-hazard relationship integrity
 * ========================================================================== */

select results_eq(
	$$
		insert into public.location_hazard_profiles (
			location_id,
			hazard_id,
			relevance_rank
		)
		values (
			(
				select id
				from public.locations
				where official_code = '0124'
			),
			(
				select id
				from public.hazards
				where code = 'test_flood'
			),
			1
		)
		returning relevance_rank
	$$,
	$$
		values (1::smallint)
	$$,
	'a valid location-hazard preparedness relevance relationship can be created'
);

select throws_ok(
	$$
		insert into public.location_hazard_profiles (
			location_id,
			hazard_id,
			relevance_rank
		)
		values (
			(
				select id
				from public.locations
				where official_code = '0002'
			),
			(
				select id
				from public.hazards
				where code = 'test_flood'
			),
			4
		)
	$$,
	'23514',
	null,
	'location-hazard relevance ranks outside 1-3 are rejected'
);

select throws_ok(
	$$
		insert into public.location_hazard_profiles (
			location_id,
			hazard_id,
			relevance_rank
		)
		values (
			(
				select id
				from public.locations
				where official_code = '0124'
			),
			(
				select id
				from public.hazards
				where code = 'test_flood'
			),
			2
		)
	$$,
	'23505',
	null,
	'duplicate location-hazard profile relationships are rejected'
);


/* ==========================================================================
 * Mission-task integrity
 * ========================================================================== */

select results_eq(
	$$
		insert into public.mission_tasks (
			mission_id,
			hazard_id,
			code,
			title_en,
			title_ar,
			detail_en,
			detail_ar,
			points,
			sort_order
		)
		values (
			(
				select id
				from public.preparedness_missions
				where code = 'test_local_hazards'
			),
			null,
			'test_general_task',
			'Complete a test preparedness task',
			'أكمل مهمة استعداد اختبارية',
			'Temporary general task for database testing.',
			'مهمة عامة مؤقتة لاختبار قاعدة البيانات.',
			10,
			1
		)
		returning code, hazard_id, points
	$$,
	$$
		values ('test_general_task'::text, null::bigint, 10::smallint)
	$$,
	'general mission tasks may exist without a hazard relationship'
);

select throws_ok(
	$$
		insert into public.mission_tasks (
			mission_id,
			code,
			title_en,
			title_ar,
			points
		)
		values (
			(
				select id
				from public.preparedness_missions
				where code = 'test_local_hazards'
			),
			'test_invalid_points',
			'Invalid Points',
			'نقاط غير صالحة',
			0
		)
	$$,
	'23514',
	null,
	'mission task point values below the permitted range are rejected'
);

select throws_ok(
	$$
		insert into public.mission_tasks (
			mission_id,
			code,
			title_en,
			title_ar,
			points
		)
		values (
			-999,
			'test_unknown_mission',
			'Unknown Mission',
			'مهمة غير معروفة',
			10
		)
	$$,
	'23503',
	null,
	'mission tasks cannot reference an unknown preparedness mission'
);


/* ==========================================================================
 * Quiz catalogue integrity
 * ========================================================================== */

select results_eq(
	$$
		insert into public.quiz_questions (
			mission_id,
			hazard_id,
			code,
			question_type,
			prompt_en,
			prompt_ar,
			explanation_en,
			explanation_ar,
			sort_order
		)
		values (
			(
				select id
				from public.preparedness_missions
				where code = 'test_local_hazards'
			),
			(
				select id
				from public.hazards
				where code = 'test_flood'
			),
			'test_quiz_question',
			'single_select',
			'What should the test user do?',
			'ماذا يجب أن يفعل المستخدم في الاختبار؟',
			'This is a temporary database-test explanation.',
			'هذا شرح مؤقت لاختبار قاعدة البيانات.',
			1
		)
		returning code, question_type
	$$,
	$$
		values ('test_quiz_question'::text, 'single_select'::text)
	$$,
	'a valid hazard-linked quiz question can be created'
);

select throws_ok(
	$$
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
			(
				select id
				from public.preparedness_missions
				where code = 'test_local_hazards'
			),
			'test_invalid_quiz_type',
			'free_text',
			'Invalid question type?',
			'نوع سؤال غير صالح؟',
			'Invalid question type test.',
			'اختبار نوع سؤال غير صالح.'
		)
	$$,
	'23514',
	null,
	'unsupported quiz question types are rejected'
);

select results_eq(
	$$
		insert into public.quiz_options (
			question_id,
			option_code,
			text_en,
			text_ar,
			is_correct,
			sort_order
		)
		values (
			(
				select id
				from public.quiz_questions
				where code = 'test_quiz_question'
			),
			'option_a',
			'Test answer A',
			'إجابة الاختبار أ',
			true,
			1
		)
		returning option_code, is_correct
	$$,
	$$
		values ('option_a'::text, true)
	$$,
	'a valid quiz answer option can be created'
);

select throws_ok(
	$$
		insert into public.quiz_options (
			question_id,
			option_code,
			text_en,
			text_ar,
			is_correct
		)
		values (
			(
				select id
				from public.quiz_questions
				where code = 'test_quiz_question'
			),
			'option_a',
			'Duplicate answer code',
			'رمز إجابة مكرر',
			false
		)
	$$,
	'23505',
	null,
	'duplicate option codes within the same quiz question are rejected'
);

select throws_ok(
	$$
		insert into public.quiz_options (
			question_id,
			option_code,
			text_en,
			text_ar,
			is_correct
		)
		values (
			-999,
			'unknown_question_option',
			'Unknown question',
			'سؤال غير معروف',
			false
		)
	$$,
	'23503',
	null,
	'quiz options cannot reference an unknown quiz question'
);


/* ==========================================================================
 * Restricted client reads
 * ========================================================================== */

set local role anon;

select results_eq(
	$$
		select
			q.code,
			q.prompt_en,
			o.option_code,
			o.text_en
		from public.quiz_questions as q
		join public.quiz_options as o
			on o.question_id = q.id
		where q.code = 'test_quiz_question'
			and o.option_code = 'option_a'
	$$,
	$$
		values (
			'test_quiz_question'::text,
			'What should the test user do?'::text,
			'option_a'::text,
			'Test answer A'::text
		)
	$$,
	'guests can read quiz prompts and answer text without hidden answer data'
);

select throws_ok(
	$$
		select explanation_en
		from public.quiz_questions
		where code = 'test_quiz_question'
	$$,
	'42501',
	null,
	'guests cannot read post-answer quiz explanations directly'
);

reset role;

set local role authenticated;

select throws_ok(
	$$
		select is_correct
		from public.quiz_options
		where option_code = 'option_a'
	$$,
	'42501',
	null,
	'authenticated users cannot read the quiz answer key directly'
);

select throws_ok(
	$$
		select *
		from public.quiz_questions
		where code = 'test_quiz_question'
	$$,
	'42501',
	null,
	'whole-row quiz-question reads are rejected because explanations are protected'
);

reset role;


/* ==========================================================================
 * Catalogue write protection and deletion behaviour
 * ========================================================================== */

set local role authenticated;

select throws_ok(
	$$
		update public.hazards
		set name_en = 'Client Modified Hazard'
		where code = 'test_flood'
	$$,
	'42501',
	null,
	'authenticated clients cannot modify curated hazard definitions'
);

reset role;

set local role anon;

select throws_ok(
	$$
		insert into public.hazards (
			code,
			name_en,
			name_ar,
			classification
		)
		values (
			'guest_hazard',
			'Guest Hazard',
			'خطر ضيف',
			'core'
		)
	$$,
	'42501',
	null,
	'guests cannot insert curated hazard definitions'
);

reset role;

select throws_ok(
	$$
		delete from public.hazards
		where code = 'test_flood'
	$$,
	'23503',
	null,
	'referenced hazards cannot be deleted while preparedness catalogue rows depend on them'
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
	(
		select id
		from public.preparedness_missions
		where code = 'test_local_hazards'
	),
	'test_quiz_cascade',
	'single_select',
	'Temporary cascade question?',
	'سؤال مؤقت لاختبار الحذف؟',
	'Temporary cascade explanation.',
	'شرح مؤقت لاختبار الحذف.'
);

insert into public.quiz_options (
	question_id,
	option_code,
	text_en,
	text_ar,
	is_correct
)
values (
	(
		select id
		from public.quiz_questions
		where code = 'test_quiz_cascade'
	),
	'cascade_option',
	'Temporary answer',
	'إجابة مؤقتة',
	true
);

delete from public.quiz_questions
where code = 'test_quiz_cascade';

select is(
	(
		select count(*)
		from public.quiz_options
		where option_code = 'cascade_option'
	),
	0::bigint,
	'deleting a quiz question cascades to its owned quiz options'
);


select * from finish();

rollback;
