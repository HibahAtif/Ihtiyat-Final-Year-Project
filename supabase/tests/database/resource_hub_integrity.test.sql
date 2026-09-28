begin;

create extension if not exists pgtap
	with schema extensions;

select plan(21);


/* ==========================================================================
 * Resource topic integrity
 * ========================================================================== */

select results_eq(
	$$
		insert into public.resource_topics (
			code,
			name_en,
			name_ar,
			description_en,
			description_ar,
			sort_order
		)
		values (
			'test_emergency_preparedness',
			'Test Emergency Preparedness',
			'اختبار الاستعداد للطوارئ',
			'Temporary Resource Hub topic used by the pgTAP suite.',
			'موضوع مؤقت لمركز الموارد يستخدم في اختبار قاعدة البيانات.',
			1
		)
		returning code, sort_order
	$$,
	$$
		values (
			'test_emergency_preparedness'::text,
			1::smallint
		)
	$$,
	'a valid Resource Hub topic can be created'
);


insert into public.resource_topics (
	code,
	name_en,
	name_ar,
	sort_order
)
values
	(
		'test_first_aid',
		'Test First Aid',
		'اختبار الإسعافات الأولية',
		2
	),
	(
		'test_hazard_safety',
		'Test Hazard Safety',
		'اختبار سلامة المخاطر',
		3
	);


select throws_ok(
	$$
		insert into public.resource_topics (
			code,
			name_en,
			name_ar
		)
		values (
			'Invalid Topic Code',
			'Invalid Topic',
			'موضوع غير صالح'
		)
	$$,
	'23514',
	null,
	'Resource Hub topic codes must use the canonical lowercase identifier format'
);


/* ==========================================================================
 * Safety-resource integrity
 * ========================================================================== */

select results_eq(
	$$
		insert into public.safety_resources (
			code,
			title_en,
			title_ar,
			summary_en,
			summary_ar,
			content_en,
			content_ar,
			publication_status,
			sort_order
		)
		values (
			'test_draft_resource',
			'Test Draft Safety Resource',
			'مورد سلامة تجريبي مسودة',
			'Temporary draft summary for database testing.',
			'ملخص مسودة مؤقت لاختبار قاعدة البيانات.',
			'Temporary draft safety guidance used by the Resource Hub pgTAP suite.',
			'إرشادات سلامة مؤقتة تستخدم في اختبار قاعدة بيانات مركز الموارد.',
			'draft',
			1
		)
		returning
			code,
			publication_status,
			last_reviewed_on,
			published_at
	$$,
	$$
		values (
			'test_draft_resource'::text,
			'draft'::text,
			null::date,
			null::timestamptz
		)
	$$,
	'draft resources may exist before review and publication metadata is available'
);


select throws_ok(
	$$
		insert into public.safety_resources (
			code,
			title_en,
			title_ar,
			summary_en,
			summary_ar,
			content_en,
			content_ar,
			publication_status
		)
		values (
			'test_unreviewed_published_resource',
			'Unreviewed Published Resource',
			'مورد منشور غير مراجع',
			'Invalid published-resource metadata test.',
			'اختبار بيانات وصفية غير صالحة لمورد منشور.',
			'Published resources must carry review and publication metadata.',
			'يجب أن تحتوي الموارد المنشورة على بيانات المراجعة والنشر.',
			'published'
		)
	$$,
	'23514',
	null,
	'published resources require both review and publication metadata'
);


select throws_ok(
	$$
		insert into public.safety_resources (
			code,
			title_en,
			title_ar,
			summary_en,
			summary_ar,
			content_en,
			content_ar,
			publication_status
		)
		values (
			'test_invalid_resource_status',
			'Invalid Resource Status',
			'حالة مورد غير صالحة',
			'Invalid status test.',
			'اختبار حالة غير صالحة.',
			'Temporary content for an invalid publication-status test.',
			'محتوى مؤقت لاختبار حالة نشر غير صالحة.',
			'archived'
		)
	$$,
	'23514',
	null,
	'unsupported Resource Hub publication states are rejected'
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
	sort_order,
	last_reviewed_on,
	published_at
)
values
	(
		'test_published_resource',
		'Test Published Safety Resource',
		'مورد سلامة تجريبي منشور',
		'Temporary published summary for database testing.',
		'ملخص منشور مؤقت لاختبار قاعدة البيانات.',
		'Temporary reviewed guidance used to exercise Resource Hub relationships.',
		'إرشادات مؤقتة ومراجعة لاختبار علاقات مركز الموارد.',
		'published',
		2,
		date '2026-09-22',
		timestamptz '2026-09-22 12:00:00+00'
	),
	(
		'test_supporting_resource',
		'Test Supporting Safety Resource',
		'مورد سلامة تجريبي داعم',
		'Second temporary published summary for relationship testing.',
		'ملخص منشور مؤقت ثان لاختبار العلاقات.',
		'Second reviewed resource used to test primary-resource constraints.',
		'مورد مراجع ثان يستخدم لاختبار قيود المورد الأساسي.',
		'published',
		3,
		date '2026-09-22',
		timestamptz '2026-09-22 12:00:00+00'
	);


/* ==========================================================================
 * Resource-source integrity
 * ========================================================================== */

select results_eq(
	$$
		insert into public.resource_sources (
			resource_id,
			publisher_name_en,
			publisher_name_ar,
			source_title_en,
			source_title_ar,
			source_url,
			source_language_code,
			is_official,
			last_checked_on,
			sort_order
		)
		values (
			(
				select id
				from public.safety_resources
				where code = 'test_published_resource'
			),
			'Test Safety Authority',
			'هيئة السلامة الاختبارية',
			'Test Official Guidance',
			'إرشادات رسمية اختبارية',
			'https://example.test/resource-hub-guidance',
			'en',
			true,
			date '2026-09-22',
			1
		)
		returning
			source_language_code,
			is_official,
			sort_order
	$$,
	$$
		values (
			'en'::text,
			true,
			1::smallint
		)
	$$,
	'a valid reviewed Resource Hub source can be created'
);


select throws_ok(
	$$
		insert into public.resource_sources (
			resource_id,
			publisher_name_en,
			publisher_name_ar,
			source_url,
			last_checked_on
		)
		values (
			(
				select id
				from public.safety_resources
				where code = 'test_published_resource'
			),
			'Test Publisher',
			'ناشر اختباري',
			'https://example.test/missing-title',
			date '2026-09-22'
		)
	$$,
	'23514',
	null,
	'a Resource Hub source must contain at least one source title'
);


select throws_ok(
	$$
		insert into public.resource_sources (
			resource_id,
			publisher_name_en,
			publisher_name_ar,
			source_title_en,
			source_url,
			last_checked_on
		)
		values (
			(
				select id
				from public.safety_resources
				where code = 'test_published_resource'
			),
			'Test Publisher',
			'ناشر اختباري',
			'Insecure URL Test',
			'http://example.test/insecure-source',
			date '2026-09-22'
		)
	$$,
	'23514',
	null,
	'Resource Hub sources require HTTPS URLs'
);


select throws_ok(
	$$
		insert into public.resource_sources (
			resource_id,
			publisher_name_en,
			publisher_name_ar,
			source_title_en,
			source_url,
			source_language_code,
			last_checked_on
		)
		values (
			(
				select id
				from public.safety_resources
				where code = 'test_published_resource'
			),
			'Test Publisher',
			'ناشر اختباري',
			'Unknown Language Test',
			'https://example.test/unknown-language',
			'zz',
			date '2026-09-22'
		)
	$$,
	'23503',
	null,
	'Resource Hub sources cannot reference an unsupported language'
);


select throws_ok(
	$$
		insert into public.resource_sources (
			resource_id,
			publisher_name_en,
			publisher_name_ar,
			source_title_en,
			source_url,
			last_checked_on
		)
		values (
			(
				select id
				from public.safety_resources
				where code = 'test_published_resource'
			),
			'Duplicate Publisher',
			'ناشر مكرر',
			'Duplicate URL',
			'https://example.test/resource-hub-guidance',
			date '2026-09-22'
		)
	$$,
	'23505',
	null,
	'the same source URL cannot be attached twice to one resource'
);


/* ==========================================================================
 * Resource topic, hazard and location relationships
 * ========================================================================== */

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
			where code = 'test_published_resource'
		),
		(
			select id
			from public.resource_topics
			where code = 'test_emergency_preparedness'
		),
		true,
		1
	),
	(
		(
			select id
			from public.safety_resources
			where code = 'test_published_resource'
		),
		(
			select id
			from public.resource_topics
			where code = 'test_first_aid'
		),
		false,
		2
	);


select is(
	(
		select count(*)
		from public.resource_topic_links
		where resource_id = (
			select id
			from public.safety_resources
			where code = 'test_published_resource'
		)
	),
	2::bigint,
	'a resource may be discoverable through more than one Resource Hub topic'
);


select throws_ok(
	$$
		update public.resource_topic_links
		set is_primary = true
		where resource_id = (
				select id
				from public.safety_resources
				where code = 'test_published_resource'
			)
			and topic_id = (
				select id
				from public.resource_topics
				where code = 'test_first_aid'
			)
	$$,
	'23505',
	null,
	'a resource may have at most one primary Resource Hub topic'
);


select results_eq(
	$$
		insert into public.resource_hazards (
			resource_id,
			hazard_id
		)
		values (
			(
				select id
				from public.safety_resources
				where code = 'test_published_resource'
			),
			(
				select id
				from public.hazards
				where code = 'heavy_rain_flash_flooding'
			)
		)
		returning hazard_id is not null
	$$,
	$$
		values (true)
	$$,
	'a Resource Hub resource can be linked to a reusable hazard'
);


select results_eq(
	$$
		insert into public.resource_locations (
			resource_id,
			location_id
		)
		values (
			(
				select id
				from public.safety_resources
				where code = 'test_published_resource'
			),
			(
				select id
				from public.locations
				where official_code = '0124'
			)
		)
		returning location_id is not null
	$$,
	$$
		values (true)
	$$,
	'a Resource Hub resource can be limited to a curated Saudi location'
);


select throws_ok(
	$$
		insert into public.resource_hazards (
			resource_id,
			hazard_id
		)
		values (
			(
				select id
				from public.safety_resources
				where code = 'test_supporting_resource'
			),
			-999
		)
	$$,
	'23503',
	null,
	'Resource Hub resources cannot reference unknown hazards'
);


/* ==========================================================================
 * Mission and quiz integration
 * ========================================================================== */

insert into public.mission_tasks (
	mission_id,
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
		where code = 'household_emergency_kit'
	),
	'test_resource_hub_task',
	'Test Resource Hub Task',
	'مهمة اختبار مركز الموارد',
	'Temporary task used to test mission-to-resource links.',
	'مهمة مؤقتة لاختبار ربط المهام بالموارد.',
	10,
	1
);


select results_eq(
	$$
		insert into public.mission_task_resources (
			task_id,
			resource_id,
			link_role,
			sort_order
		)
		values (
			(
				select id
				from public.mission_tasks
				where code = 'test_resource_hub_task'
			),
			(
				select id
				from public.safety_resources
				where code = 'test_published_resource'
			),
			'primary',
			1
		)
		returning link_role
	$$,
	$$
		values ('primary'::text)
	$$,
	'a mission task can designate one primary Resource Hub guide'
);


select throws_ok(
	$$
		insert into public.mission_task_resources (
			task_id,
			resource_id,
			link_role,
			sort_order
		)
		values (
			(
				select id
				from public.mission_tasks
				where code = 'test_resource_hub_task'
			),
			(
				select id
				from public.safety_resources
				where code = 'test_supporting_resource'
			),
			'primary',
			2
		)
	$$,
	'23505',
	null,
	'a mission task cannot designate two primary Resource Hub guides'
);


insert into public.quiz_questions (
	mission_id,
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
		where code = 'know_your_local_hazards'
	),
	'test_resource_hub_question',
	'single_select',
	'What is the safest test response?',
	'ما الاستجابة الاختبارية الأكثر أمانًا؟',
	'Temporary explanation used for Resource Hub relationship testing.',
	'شرح مؤقت يستخدم لاختبار علاقة مركز الموارد.',
	1
);


select results_eq(
	$$
		insert into public.quiz_question_resources (
			question_id,
			resource_id,
			link_role,
			sort_order
		)
		values (
			(
				select id
				from public.quiz_questions
				where code = 'test_resource_hub_question'
			),
			(
				select id
				from public.safety_resources
				where code = 'test_published_resource'
			),
			'primary',
			1
		)
		returning link_role
	$$,
	$$
		values ('primary'::text)
	$$,
	'a quiz question can designate one primary follow-up Resource Hub guide'
);


select throws_ok(
	$$
		insert into public.quiz_question_resources (
			question_id,
			resource_id,
			link_role,
			sort_order
		)
		values (
			(
				select id
				from public.quiz_questions
				where code = 'test_resource_hub_question'
			),
			(
				select id
				from public.safety_resources
				where code = 'test_supporting_resource'
			),
			'primary',
			2
		)
	$$,
	'23505',
	null,
	'a quiz question cannot designate two primary follow-up Resource Hub guides'
);


/* ==========================================================================
 * Database-controlled timestamps and cascade behaviour
 * ========================================================================== */

update public.safety_resources
set
	title_en = 'Updated Test Published Safety Resource',
	updated_at = timestamptz '2000-01-01 00:00:00+00'
where code = 'test_published_resource';


select ok(
	(
		select updated_at > timestamptz '2000-01-01 00:00:00+00'
		from public.safety_resources
		where code = 'test_published_resource'
	),
	'safety-resource updated_at is controlled by the database trigger'
);


delete from public.safety_resources
where code = 'test_published_resource';


select is(
	(
		select
			(
				select count(*)
				from public.resource_sources
				where source_url =
					'https://example.test/resource-hub-guidance'
			)
			+
			(
				select count(*)
				from public.resource_topic_links
				where resource_id not in (
					select id
					from public.safety_resources
				)
			)
			+
			(
				select count(*)
				from public.resource_hazards
				where resource_id not in (
					select id
					from public.safety_resources
				)
			)
			+
			(
				select count(*)
				from public.resource_locations
				where resource_id not in (
					select id
					from public.safety_resources
				)
			)
			+
			(
				select count(*)
				from public.mission_task_resources
				where resource_id not in (
					select id
					from public.safety_resources
				)
			)
			+
			(
				select count(*)
				from public.quiz_question_resources
				where resource_id not in (
					select id
					from public.safety_resources
				)
			)
	),
	0::bigint,
	'deleting a safety resource cascades to its owned sources and relationship rows'
);


select * from finish();

rollback;
