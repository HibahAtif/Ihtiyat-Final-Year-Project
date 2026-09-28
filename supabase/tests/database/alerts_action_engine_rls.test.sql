begin;

create extension if not exists pgtap
	with schema extensions;

select plan(8);


/* ==========================================================================
 * Alert and action-engine RLS fixtures
 * ==========================================================================
 *
 * Public safety catalogue rows are readable by both guests and signed-in
 * users only when they are active/published.
 *
 * Ordinary application roles remain read-only.
 */


/* --------------------------------------------------------------------------
 * Test-only inactive hazard
 * -------------------------------------------------------------------------- */

insert into public.hazards (
	code,
	name_en,
	name_ar,
	classification,
	sort_order,
	is_active
)
values (
	'test_alert_inactive_hazard',
	'Inactive Alert Hazard',
	'خطر تنبيه غير نشط',
	'core',
	999,
	false
);


/* --------------------------------------------------------------------------
 * Alert fixtures
 * -------------------------------------------------------------------------- */

insert into public.alerts (
	code,
	hazard_id,
	origin_type,
	external_alert_id,
	severity,
	title_en,
	title_ar,
	message_en,
	message_ar,
	starts_at,
	published_at,
	expires_at,
	publication_status,
	sort_order
)
values
	(
		'test_alert_visible',
		(
			select id
			from public.hazards
			where code = 'heavy_rain_flash_flooding'
		),
		'simulated',
		null,
		3,
		'Visible Simulated Alert',
		'تنبيه محاكاة ظاهر',
		'Published simulated alert used to verify public catalogue access.',
		'تنبيه محاكاة منشور يستخدم للتحقق من الوصول العام.',
		timestamptz '2038-04-17 03:26:41+00',
		timestamptz '2038-04-17 03:20:00+00',
		timestamptz '2038-04-17 08:26:41+00',
		'published',
		10
	),
	(
		'test_alert_draft',
		(
			select id
			from public.hazards
			where code = 'heavy_rain_flash_flooding'
		),
		'simulated',
		null,
		2,
		'Hidden Draft Alert',
		'تنبيه مسودة مخفي',
		'Draft alert that ordinary application clients must not read.',
		'تنبيه مسودة يجب ألا يراه مستخدمو التطبيق العاديون.',
		timestamptz '2038-04-17 03:26:41+00',
		null,
		timestamptz '2038-04-17 08:26:41+00',
		'draft',
		20
	),
	(
		'test_alert_retired',
		(
			select id
			from public.hazards
			where code = 'heavy_rain_flash_flooding'
		),
		'simulated',
		null,
		1,
		'Hidden Retired Alert',
		'تنبيه متقاعد مخفي',
		'Retired alert preserved in the backend but hidden from application clients.',
		'تنبيه متقاعد محفوظ في الخلفية ولكنه مخفي عن مستخدمي التطبيق.',
		timestamptz '2038-04-17 03:26:41+00',
		timestamptz '2038-04-17 03:20:00+00',
		timestamptz '2038-04-17 08:26:41+00',
		'retired',
		30
	),
	(
		'test_alert_inactive_hazard',
		(
			select id
			from public.hazards
			where code = 'test_alert_inactive_hazard'
		),
		'simulated',
		null,
		2,
		'Hidden Inactive Hazard Alert',
		'تنبيه خطر غير نشط مخفي',
		'Published row whose hazard is inactive and must therefore remain hidden.',
		'صف منشور لخطر غير نشط ويجب أن يظل مخفياً.',
		timestamptz '2038-04-17 03:26:41+00',
		timestamptz '2038-04-17 03:20:00+00',
		timestamptz '2038-04-17 08:26:41+00',
		'published',
		40
	);


/* --------------------------------------------------------------------------
 * Alert-location fixtures
 * -------------------------------------------------------------------------- */

insert into public.alert_locations (
	alert_id,
	location_id
)
values
	(
		(
			select id
			from public.alerts
			where code = 'test_alert_visible'
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
			from public.alerts
			where code = 'test_alert_draft'
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
			from public.alerts
			where code = 'test_alert_inactive_hazard'
		),
		(
			select id
			from public.locations
			where official_code = '0124'
		)
	);


/* --------------------------------------------------------------------------
 * Action fixtures
 * -------------------------------------------------------------------------- */

insert into public.actions (
	code,
	title_en,
	title_ar,
	instruction_en,
	instruction_ar,
	sort_order,
	is_active
)
values
	(
		'test_action_visible',
		'Visible Safety Action',
		'إجراء سلامة ظاهر',
		'Follow the visible test safety action.',
		'اتبع إجراء السلامة الاختباري الظاهر.',
		10,
		true
	),
	(
		'test_action_inactive',
		'Inactive Safety Action',
		'إجراء سلامة غير نشط',
		'Inactive action that application clients must not display.',
		'إجراء غير نشط يجب ألا يعرضه التطبيق.',
		20,
		false
	);


/* --------------------------------------------------------------------------
 * Action-rule fixtures
 * -------------------------------------------------------------------------- */

insert into public.action_rules (
	code,
	action_id,
	hazard_id,
	location_id,
	linked_task_id,
	min_severity,
	base_priority,
	incomplete_task_boost,
	safety_override,
	safety_override_min_severity,
	min_children_count,
	min_older_adults_count,
	reason_en,
	reason_ar,
	sort_order,
	is_active
)
values
	(
		'test_rule_visible',
		(
			select id
			from public.actions
			where code = 'test_action_visible'
		),
		(
			select id
			from public.hazards
			where code = 'heavy_rain_flash_flooding'
		),
		(
			select id
			from public.locations
			where official_code = '0124'
		),
		(
			select id
			from public.mission_tasks
			where code = 'kit_phone_backup_power'
		),
		2,
		100,
		25,
		500,
		3,
		null,
		null,
		'Visible deterministic rule used for RLS testing.',
		'قاعدة حتمية ظاهرة تستخدم لاختبار أمان الصفوف.',
		10,
		true
	),
	(
		'test_rule_inactive',
		(
			select id
			from public.actions
			where code = 'test_action_visible'
		),
		(
			select id
			from public.hazards
			where code = 'heavy_rain_flash_flooding'
		),
		null,
		null,
		1,
		50,
		0,
		0,
		null,
		null,
		null,
		'Inactive rule that must remain hidden.',
		'قاعدة غير نشطة يجب أن تظل مخفية.',
		20,
		false
	),
	(
		'test_rule_inactive_action',
		(
			select id
			from public.actions
			where code = 'test_action_inactive'
		),
		(
			select id
			from public.hazards
			where code = 'heavy_rain_flash_flooding'
		),
		null,
		null,
		1,
		50,
		0,
		0,
		null,
		null,
		null,
		'Rule whose action is inactive.',
		'قاعدة مرتبطة بإجراء غير نشط.',
		30,
		true
	),
	(
		'test_rule_inactive_hazard',
		(
			select id
			from public.actions
			where code = 'test_action_visible'
		),
		(
			select id
			from public.hazards
			where code = 'test_alert_inactive_hazard'
		),
		null,
		null,
		1,
		50,
		0,
		0,
		null,
		null,
		null,
		'Rule whose hazard is inactive.',
		'قاعدة مرتبطة بخطر غير نشط.',
		40,
		true
	);


/*
 * Store fixture identifiers before changing role so the relationship-table
 * policy can be tested directly rather than being hidden indirectly by a join.
 */
select set_config(
	'ihtiyat_test.visible_alert_id',
	(
		select id::text
		from public.alerts
		where code = 'test_alert_visible'
	),
	true
);

select set_config(
	'ihtiyat_test.draft_alert_id',
	(
		select id::text
		from public.alerts
		where code = 'test_alert_draft'
	),
	true
);

select set_config(
	'ihtiyat_test.inactive_hazard_alert_id',
	(
		select id::text
		from public.alerts
		where code = 'test_alert_inactive_hazard'
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
		from public.alerts
		where code like 'test_alert_%'
		order by code
	$$,
	$$
		values ('test_alert_visible'::text)
	$$,
	'guests see only published alerts attached to active hazards'
);


select is(
	(
		select count(*)
		from public.alert_locations
		where alert_id in (
			current_setting(
				'ihtiyat_test.visible_alert_id'
			)::bigint,
			current_setting(
				'ihtiyat_test.draft_alert_id'
			)::bigint,
			current_setting(
				'ihtiyat_test.inactive_hazard_alert_id'
			)::bigint
		)
	),
	1::bigint,
	'guests see location links only for publicly visible alerts'
);


select results_eq(
	$$
		select code
		from public.actions
		where code like 'test_action_%'
		order by code
	$$,
	$$
		values ('test_action_visible'::text)
	$$,
	'guests see active safety actions but not inactive actions'
);


select results_eq(
	$$
		select code
		from public.action_rules
		where code like 'test_rule_%'
		order by code
	$$,
	$$
		values ('test_rule_visible'::text)
	$$,
	'guests see only active rules whose referenced safety catalogue rows are active'
);


reset role;


/* ==========================================================================
 * Authenticated visibility
 * ========================================================================== */

set local role authenticated;


select results_eq(
	$$
		select code
		from public.alerts
		where code like 'test_alert_%'
		order by code
	$$,
	$$
		values ('test_alert_visible'::text)
	$$,
	'authenticated users see only published alerts attached to active hazards'
);


select is(
	(
		select count(*)
		from public.alert_locations
		where alert_id in (
			current_setting(
				'ihtiyat_test.visible_alert_id'
			)::bigint,
			current_setting(
				'ihtiyat_test.draft_alert_id'
			)::bigint,
			current_setting(
				'ihtiyat_test.inactive_hazard_alert_id'
			)::bigint
		)
	),
	1::bigint,
	'authenticated users see location links only for publicly visible alerts'
);


select results_eq(
	$$
		select code
		from public.actions
		where code like 'test_action_%'
		order by code
	$$,
	$$
		values ('test_action_visible'::text)
	$$,
	'authenticated users see active safety actions but not inactive actions'
);


select results_eq(
	$$
		select code
		from public.action_rules
		where code like 'test_rule_%'
		order by code
	$$,
	$$
		values ('test_rule_visible'::text)
	$$,
	'authenticated users see only active rules whose referenced safety catalogue rows are active'
);


reset role;


select * from finish();

rollback;