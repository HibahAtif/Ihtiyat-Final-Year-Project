begin;

create extension if not exists pgtap
	with schema extensions;

select plan(13);


/* ==========================================================================
 * Fixtures
 * ========================================================================== */

insert into public.resource_topics (
	code,
	name_en,
	name_ar,
	is_active,
	sort_order
)
values
	(
		'test_visible_topic',
		'Visible Test Topic',
		'موضوع اختباري ظاهر',
		true,
		1
	),
	(
		'test_hidden_topic',
		'Hidden Test Topic',
		'موضوع اختباري مخفي',
		false,
		2
	);


insert into public.safety_resources (
	code,
	title_en,
	title_ar,
	summary_en,
	summary_ar,
	content_en,
	content_ar,
	publication_status,
	last_reviewed_on,
	published_at,
	sort_order
)
values
	(
		'test_visible_resource',
		'Visible Published Resource',
		'مورد منشور ظاهر',
		'Published resource used to test Resource Hub RLS.',
		'مورد منشور يستخدم لاختبار أمان مركز الموارد.',
		'Visible published safety guidance for the Resource Hub RLS test.',
		'إرشادات سلامة منشورة وظاهرة لاختبار أمان مركز الموارد.',
		'published',
		date '2026-09-22',
		timestamptz '2026-09-22 12:00:00+00',
		1
	),
	(
		'test_draft_hidden_resource',
		'Hidden Draft Resource',
		'مورد مسودة مخفي',
		'Draft resource used to verify that unpublished content is hidden.',
		'مورد مسودة يستخدم للتحقق من إخفاء المحتوى غير المنشور.',
		'Draft safety guidance that ordinary application clients must not see.',
		'إرشادات سلامة مسودة يجب ألا يراها مستخدمو التطبيق العاديون.',
		'draft',
		null,
		null,
		2
	),
	(
		'test_retired_hidden_resource',
		'Hidden Retired Resource',
		'مورد متقاعد مخفي',
		'Retired resource used to verify catalogue visibility.',
		'مورد متقاعد يستخدم للتحقق من رؤية الفهرس.',
		'Retired safety guidance that is preserved but not publicly exposed.',
		'إرشادات سلامة متقاعدة محفوظة ولكنها غير معروضة للعامة.',
		'retired',
		date '2026-09-20',
		timestamptz '2026-09-20 12:00:00+00',
		3
	);


insert into public.resource_sources (
	resource_id,
	publisher_name_en,
	publisher_name_ar,
	source_title_en,
	source_title_ar,
	source_url,
	is_official,
	last_checked_on,
	is_active,
	sort_order
)
values
	(
		(
			select id
			from public.safety_resources
			where code = 'test_visible_resource'
		),
		'Visible Test Authority',
		'هيئة اختبار ظاهرة',
		'Visible Source',
		'مصدر ظاهر',
		'https://example.test/visible-source',
		true,
		date '2026-09-22',
		true,
		1
	),
	(
		(
			select id
			from public.safety_resources
			where code = 'test_visible_resource'
		),
		'Inactive Test Authority',
		'هيئة اختبار غير نشطة',
		'Inactive Source',
		'مصدر غير نشط',
		'https://example.test/inactive-source',
		true,
		date '2026-09-22',
		false,
		2
	),
	(
		(
			select id
			from public.safety_resources
			where code = 'test_draft_hidden_resource'
		),
		'Draft Test Authority',
		'هيئة اختبار المسودة',
		'Draft Source',
		'مصدر المسودة',
		'https://example.test/draft-source',
		true,
		date '2026-09-22',
		true,
		1
	);


insert into public.resource_topic_links (
	resource_id,
	topic_id,
	is_primary,
	sort_order
)
values
	(
		(
			select id
			from public.safety_resources
			where code = 'test_visible_resource'
		),
		(
			select id
			from public.resource_topics
			where code = 'test_visible_topic'
		),
		true,
		1
	),
	(
		(
			select id
			from public.safety_resources
			where code = 'test_visible_resource'
		),
		(
			select id
			from public.resource_topics
			where code = 'test_hidden_topic'
		),
		false,
		2
	),
	(
		(
			select id
			from public.safety_resources
			where code = 'test_draft_hidden_resource'
		),
		(
			select id
			from public.resource_topics
			where code = 'test_visible_topic'
		),
		true,
		1
	);


insert into public.hazards (
	code,
	name_en,
	name_ar,
	classification,
	sort_order,
	is_active
)
values (
	'test_inactive_resource_hazard',
	'Inactive Resource Hazard',
	'خطر مورد غير نشط',
	'core',
	999,
	false
);


insert into public.resource_hazards (
	resource_id,
	hazard_id
)
values
	(
		(
			select id
			from public.safety_resources
			where code = 'test_visible_resource'
		),
		(
			select id
			from public.hazards
			where code = 'heavy_rain_flash_flooding'
		)
	),
	(
		(
			select id
			from public.safety_resources
			where code = 'test_visible_resource'
		),
		(
			select id
			from public.hazards
			where code = 'test_inactive_resource_hazard'
		)
	),
	(
		(
			select id
			from public.safety_resources
			where code = 'test_draft_hidden_resource'
		),
		(
			select id
			from public.hazards
			where code = 'heavy_rain_flash_flooding'
		)
	);


insert into public.resource_locations (
	resource_id,
	location_id
)
values
	(
		(
			select id
			from public.safety_resources
			where code = 'test_visible_resource'
		),
		(
			select id
			from public.locations
			where official_code = '0124'
		)
	),
	(
		(
			select id
			from public.safety_resources
			where code = 'test_draft_hidden_resource'
		),
		(
			select id
			from public.locations
			where official_code = '0002'
		)
	);


insert into public.mission_tasks (
	mission_id,
	code,
	title_en,
	title_ar,
	detail_en,
	detail_ar,
	points,
	sort_order,
	is_active
)
values
	(
		(
			select id
			from public.preparedness_missions
			where code = 'household_emergency_kit'
		),
		'test_visible_resource_task',
		'Visible Resource Task',
		'مهمة مورد ظاهرة',
		'Temporary active task for Resource Hub RLS testing.',
		'مهمة نشطة مؤقتة لاختبار أمان مركز الموارد.',
		10,
		1,
		true
	),
	(
		(
			select id
			from public.preparedness_missions
			where code = 'household_emergency_kit'
		),
		'test_hidden_resource_task',
		'Hidden Resource Task',
		'مهمة مورد مخفية',
		'Temporary inactive task for Resource Hub RLS testing.',
		'مهمة غير نشطة مؤقتة لاختبار أمان مركز الموارد.',
		10,
		2,
		false
	);


insert into public.mission_task_resources (
	task_id,
	resource_id,
	link_role,
	sort_order
)
values
	(
		(
			select id
			from public.mission_tasks
			where code = 'test_visible_resource_task'
		),
		(
			select id
			from public.safety_resources
			where code = 'test_visible_resource'
		),
		'primary',
		1
	),
	(
		(
			select id
			from public.mission_tasks
			where code = 'test_hidden_resource_task'
		),
		(
			select id
			from public.safety_resources
			where code = 'test_visible_resource'
		),
		'primary',
		1
	),
	(
		(
			select id
			from public.mission_tasks
			where code = 'test_visible_resource_task'
		),
		(
			select id
			from public.safety_resources
			where code = 'test_draft_hidden_resource'
		),
		'supporting',
		2
	);


insert into public.quiz_questions (
	mission_id,
	code,
	question_type,
	prompt_en,
	prompt_ar,
	explanation_en,
	explanation_ar,
	sort_order,
	is_active
)
values
	(
		(
			select id
			from public.preparedness_missions
			where code = 'know_your_local_hazards'
		),
		'test_visible_resource_question',
		'single_select',
		'Visible Resource Hub question?',
		'سؤال مركز موارد ظاهر؟',
		'Temporary visible explanation.',
		'شرح ظاهر مؤقت.',
		1,
		true
	),
	(
		(
			select id
			from public.preparedness_missions
			where code = 'know_your_local_hazards'
		),
		'test_hidden_resource_question',
		'single_select',
		'Hidden Resource Hub question?',
		'سؤال مركز موارد مخفي؟',
		'Temporary hidden explanation.',
		'شرح مخفي مؤقت.',
		2,
		false
	);


insert into public.quiz_question_resources (
	question_id,
	resource_id,
	link_role,
	sort_order
)
values
	(
		(
			select id
			from public.quiz_questions
			where code = 'test_visible_resource_question'
		),
		(
			select id
			from public.safety_resources
			where code = 'test_visible_resource'
		),
		'primary',
		1
	),
	(
		(
			select id
			from public.quiz_questions
			where code = 'test_hidden_resource_question'
		),
		(
			select id
			from public.safety_resources
			where code = 'test_visible_resource'
		),
		'primary',
		1
	),
	(
		(
			select id
			from public.quiz_questions
			where code = 'test_visible_resource_question'
		),
		(
			select id
			from public.safety_resources
			where code = 'test_draft_hidden_resource'
		),
		'supporting',
		2
	);



/*
 * Capture fixture identifiers before switching into application roles.
 * This lets the RLS assertions query the relationship tables directly,
 * including rows whose parent resource/task/question should be hidden.
 */
select set_config(
	'ihtiyat_test.visible_resource_id',
	(
		select id::text
		from public.safety_resources
		where code = 'test_visible_resource'
	),
	true
);

select set_config(
	'ihtiyat_test.draft_resource_id',
	(
		select id::text
		from public.safety_resources
		where code = 'test_draft_hidden_resource'
	),
	true
);

select set_config(
	'ihtiyat_test.visible_task_id',
	(
		select id::text
		from public.mission_tasks
		where code = 'test_visible_resource_task'
	),
	true
);

select set_config(
	'ihtiyat_test.hidden_task_id',
	(
		select id::text
		from public.mission_tasks
		where code = 'test_hidden_resource_task'
	),
	true
);

select set_config(
	'ihtiyat_test.visible_question_id',
	(
		select id::text
		from public.quiz_questions
		where code = 'test_visible_resource_question'
	),
	true
);

select set_config(
	'ihtiyat_test.hidden_question_id',
	(
		select id::text
		from public.quiz_questions
		where code = 'test_hidden_resource_question'
	),
	true
);


/* ==========================================================================
 * Guest visibility
 * ========================================================================== */

set local role anon;


select results_eq(
	$$
		select code
		from public.resource_topics
		where code like 'test_%'
		order by code
	$$,
	$$
		values ('test_visible_topic'::text)
	$$,
	'guests can read active Resource Hub topics but not inactive topics'
);


select results_eq(
	$$
		select code
		from public.safety_resources
		where code like 'test_%'
		order by code
	$$,
	$$
		values ('test_visible_resource'::text)
	$$,
	'guests can read published safety resources but not draft or retired resources'
);


select results_eq(
	$$
		select source_url
		from public.resource_sources
		where source_url like 'https://example.test/%'
		order by source_url
	$$,
	$$
		values (
			'https://example.test/visible-source'::text
		)
	$$,
	'guests see only active sources attached to published resources'
);


select is(
	(
		select count(*)
		from public.resource_topic_links
		where resource_id in (
			current_setting(
				'ihtiyat_test.visible_resource_id'
			)::bigint,
			current_setting(
				'ihtiyat_test.draft_resource_id'
			)::bigint
		)
	),
	1::bigint,
	'guests see only published-resource links to active Resource Hub topics'
);


select is(
	(
		select count(*)
		from public.resource_hazards
		where resource_id in (
			current_setting(
				'ihtiyat_test.visible_resource_id'
			)::bigint,
			current_setting(
				'ihtiyat_test.draft_resource_id'
			)::bigint
		)
	),
	1::bigint,
	'guests see only published-resource links to active hazards'
);


select is(
	(
		select count(*)
		from public.resource_locations
		where resource_id in (
			current_setting(
				'ihtiyat_test.visible_resource_id'
			)::bigint,
			current_setting(
				'ihtiyat_test.draft_resource_id'
			)::bigint
		)
	),
	1::bigint,
	'guests see location links only for published resources'
);


select is(
	(
		select count(*)
		from public.mission_task_resources
		where task_id in (
			current_setting(
				'ihtiyat_test.visible_task_id'
			)::bigint,
			current_setting(
				'ihtiyat_test.hidden_task_id'
			)::bigint
		)
	),
	1::bigint,
	'guests see mission-resource links only for active tasks and published resources'
);


select is(
	(
		select count(*)
		from public.quiz_question_resources
		where question_id in (
			current_setting(
				'ihtiyat_test.visible_question_id'
			)::bigint,
			current_setting(
				'ihtiyat_test.hidden_question_id'
			)::bigint
		)
	),
	1::bigint,
	'guests see quiz-resource links only for active questions and published resources'
);


select throws_ok(
	$$
		insert into public.resource_topics (
			code,
			name_en,
			name_ar
		)
		values (
			'guest_resource_topic',
			'Guest Topic',
			'موضوع ضيف'
		)
	$$,
	'42501',
	null,
	'guests cannot create curated Resource Hub topics'
);


select throws_ok(
	$$
		update public.safety_resources
		set title_en = 'Guest Modified Resource'
		where code = 'test_visible_resource'
	$$,
	'42501',
	null,
	'guests cannot modify curated safety resources'
);


reset role;


/* ==========================================================================
 * Authenticated-client visibility
 * ========================================================================== */

set local role authenticated;


select results_eq(
	$$
		select code
		from public.safety_resources
		where code like 'test_%'
		order by code
	$$,
	$$
		values ('test_visible_resource'::text)
	$$,
	'authenticated users also see only published Resource Hub guidance'
);


select results_eq(
	$$
		select source_url
		from public.resource_sources
		where source_url like 'https://example.test/%'
		order by source_url
	$$,
	$$
		values (
			'https://example.test/visible-source'::text
		)
	$$,
	'authenticated users also see only active sources for published resources'
);


select throws_ok(
	$$
		delete from public.safety_resources
		where code = 'test_visible_resource'
	$$,
	'42501',
	null,
	'authenticated users cannot delete curated Resource Hub guidance'
);


reset role;


select * from finish();

rollback;
