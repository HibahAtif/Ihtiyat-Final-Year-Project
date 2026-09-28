begin;

create extension if not exists pgtap
	with schema extensions;

select plan(13);


/* ==========================================================================
 * Resource Hub table structure and RLS
 * ========================================================================== */

select is(
	(
		select count(*)
		from information_schema.tables
		where table_schema = 'public'
			and table_name in (
				'resource_topics',
				'safety_resources',
				'resource_sources',
				'resource_topic_links',
				'resource_hazards',
				'resource_locations',
				'mission_task_resources',
				'quiz_question_resources'
			)
	),
	8::bigint,
	'all eight Resource Hub tables exist'
);


select is(
	(
		select count(*)
		from pg_class
		join pg_namespace
			on pg_namespace.oid = pg_class.relnamespace
		where pg_namespace.nspname = 'public'
			and pg_class.relname in (
				'resource_topics',
				'safety_resources',
				'resource_sources',
				'resource_topic_links',
				'resource_hazards',
				'resource_locations',
				'mission_task_resources',
				'quiz_question_resources'
			)
			and pg_class.relrowsecurity
	),
	8::bigint,
	'RLS is enabled on all eight Resource Hub tables'
);


/* ==========================================================================
 * Client and service-role privileges
 * ========================================================================== */

select ok(
	(
		select bool_and(
			has_table_privilege(
				'anon',
				table_name,
				'SELECT'
			)
		)
		from (
			values
				('public.resource_topics'),
				('public.safety_resources'),
				('public.resource_sources'),
				('public.resource_topic_links'),
				('public.resource_hazards'),
				('public.resource_locations'),
				('public.mission_task_resources'),
				('public.quiz_question_resources')
		) as resource_tables(table_name)
	),
	'guests have SELECT permission on Resource Hub catalogue tables'
);


select ok(
	(
		select bool_and(
			has_table_privilege(
				'authenticated',
				table_name,
				'SELECT'
			)
		)
		from (
			values
				('public.resource_topics'),
				('public.safety_resources'),
				('public.resource_sources'),
				('public.resource_topic_links'),
				('public.resource_hazards'),
				('public.resource_locations'),
				('public.mission_task_resources'),
				('public.quiz_question_resources')
		) as resource_tables(table_name)
	),
	'authenticated users have SELECT permission on Resource Hub catalogue tables'
);


select ok(
	(
		select bool_and(
			not has_table_privilege(
				'anon',
				table_name,
				'INSERT'
			)
			and not has_table_privilege(
				'anon',
				table_name,
				'UPDATE'
			)
			and not has_table_privilege(
				'anon',
				table_name,
				'DELETE'
			)
		)
		from (
			values
				('public.resource_topics'),
				('public.safety_resources'),
				('public.resource_sources'),
				('public.resource_topic_links'),
				('public.resource_hazards'),
				('public.resource_locations'),
				('public.mission_task_resources'),
				('public.quiz_question_resources')
		) as resource_tables(table_name)
	),
	'guests have no write privileges on Resource Hub catalogue tables'
);


select ok(
	(
		select bool_and(
			not has_table_privilege(
				'authenticated',
				table_name,
				'INSERT'
			)
			and not has_table_privilege(
				'authenticated',
				table_name,
				'UPDATE'
			)
			and not has_table_privilege(
				'authenticated',
				table_name,
				'DELETE'
			)
		)
		from (
			values
				('public.resource_topics'),
				('public.safety_resources'),
				('public.resource_sources'),
				('public.resource_topic_links'),
				('public.resource_hazards'),
				('public.resource_locations'),
				('public.mission_task_resources'),
				('public.quiz_question_resources')
		) as resource_tables(table_name)
	),
	'authenticated users have no write privileges on Resource Hub catalogue tables'
);


select ok(
	(
		select bool_and(
			has_table_privilege(
				'service_role',
				table_name,
				'SELECT'
			)
			and has_table_privilege(
				'service_role',
				table_name,
				'INSERT'
			)
			and has_table_privilege(
				'service_role',
				table_name,
				'UPDATE'
			)
			and has_table_privilege(
				'service_role',
				table_name,
				'DELETE'
			)
		)
		from (
			values
				('public.resource_topics'),
				('public.safety_resources'),
				('public.resource_sources'),
				('public.resource_topic_links'),
				('public.resource_hazards'),
				('public.resource_locations'),
				('public.mission_task_resources'),
				('public.quiz_question_resources')
		) as resource_tables(table_name)
	),
	'service_role retains management privileges on Resource Hub catalogue tables'
);


/* ==========================================================================
 * Identity-sequence privileges
 * ========================================================================== */

select ok(
	not has_sequence_privilege(
		'anon',
		'public.resource_topics_id_seq',
		'USAGE'
	)
	and not has_sequence_privilege(
		'anon',
		'public.safety_resources_id_seq',
		'USAGE'
	)
	and not has_sequence_privilege(
		'anon',
		'public.resource_sources_id_seq',
		'USAGE'
	),
	'guests cannot consume curated Resource Hub identity sequences'
);


select ok(
	not has_sequence_privilege(
		'authenticated',
		'public.resource_topics_id_seq',
		'USAGE'
	)
	and not has_sequence_privilege(
		'authenticated',
		'public.safety_resources_id_seq',
		'USAGE'
	)
	and not has_sequence_privilege(
		'authenticated',
		'public.resource_sources_id_seq',
		'USAGE'
	),
	'authenticated users cannot consume curated Resource Hub identity sequences'
);


select ok(
	has_sequence_privilege(
		'service_role',
		'public.resource_topics_id_seq',
		'USAGE'
	)
	and has_sequence_privilege(
		'service_role',
		'public.safety_resources_id_seq',
		'USAGE'
	)
	and has_sequence_privilege(
		'service_role',
		'public.resource_sources_id_seq',
		'USAGE'
	),
	'service_role can consume curated Resource Hub identity sequences'
);


/* ==========================================================================
 * Indexes, triggers and foreign-key structure
 * ========================================================================== */

select is(
	(
		select count(*)
		from pg_indexes
		where schemaname = 'public'
			and indexname in (
				'resource_topic_links_one_primary_idx',
				'mission_task_resources_one_primary_idx',
				'quiz_question_resources_one_primary_idx',
				'resource_topic_links_topic_id_idx',
				'resource_hazards_hazard_id_idx',
				'resource_locations_location_id_idx',
				'mission_task_resources_resource_id_idx',
				'quiz_question_resources_resource_id_idx',
				'safety_resources_publication_sort_idx'
			)
	),
	9::bigint,
	'all nine explicit Resource Hub indexes exist'
);


select is(
	(
		select count(*)
		from pg_trigger
		join pg_class
			on pg_class.oid = pg_trigger.tgrelid
		join pg_namespace
			on pg_namespace.oid = pg_class.relnamespace
		where pg_namespace.nspname = 'public'
			and pg_trigger.tgname in (
				'on_resource_topic_updated',
				'on_safety_resource_updated',
				'on_resource_source_updated'
			)
			and not pg_trigger.tgisinternal
	),
	3::bigint,
	'all three Resource Hub updated_at triggers exist'
);


select is(
	(
		select count(*)
		from information_schema.table_constraints
		where table_schema = 'public'
			and constraint_type = 'FOREIGN KEY'
			and table_name in (
				'resource_sources',
				'resource_topic_links',
				'resource_hazards',
				'resource_locations',
				'mission_task_resources',
				'quiz_question_resources'
			)
	),
	12::bigint,
	'the Resource Hub relationship tables expose the expected twelve foreign keys'
);


select * from finish();

rollback;
