begin;

create extension if not exists pgtap
	with schema extensions;

select plan(17);


/* ==========================================================================
 * Alert and explainable-action table structure
 * ==========================================================================
 *
 * WHAT:
 * Defines the structural contract for Ihtiyat's public alert catalogue and
 * deterministic emergency action engine.
 *
 * WHY:
 * Alerts, actions and ranking rules are curated safety content. The mobile
 * client may read them, but ordinary users must never create or alter them.
 *
 * HOW:
 * These tests intentionally describe the expected final schema before the
 * migration exists. They therefore form the RED stage of the database TDD
 * cycle.
*/


/* --------------------------------------------------------------------------
 * Tables
 * -------------------------------------------------------------------------- */

select is(
	(
		select count(*)
		from information_schema.tables
		where table_schema = 'public'
			and table_name in (
				'alerts',
				'alert_locations',
				'actions',
				'action_rules'
			)
	),
	4::bigint,
	'all four alert and action-engine tables exist'
);


/* --------------------------------------------------------------------------
 * Expected application-facing columns
 * -------------------------------------------------------------------------- */

select is(
	(
		select count(*)
		from information_schema.columns
		where table_schema = 'public'
			and table_name = 'alerts'
			and column_name in (
				'id',
				'code',
				'hazard_id',
				'origin_type',
				'external_alert_id',
				'severity',
				'title_en',
				'title_ar',
				'message_en',
				'message_ar',
				'starts_at',
				'published_at',
				'expires_at',
				'publication_status',
				'sort_order',
				'created_at',
				'updated_at'
			)
	),
	17::bigint,
	'alerts exposes the expected seventeen columns'
);


select is(
	(
		select count(*)
		from information_schema.columns
		where table_schema = 'public'
			and table_name = 'alert_locations'
			and column_name in (
				'alert_id',
				'location_id'
			)
	),
	2::bigint,
	'alert_locations exposes the expected relationship columns'
);


select is(
	(
		select count(*)
		from information_schema.columns
		where table_schema = 'public'
			and table_name = 'actions'
			and column_name in (
				'id',
				'code',
				'title_en',
				'title_ar',
				'instruction_en',
				'instruction_ar',
				'sort_order',
				'is_active',
				'created_at',
				'updated_at'
			)
	),
	10::bigint,
	'actions exposes the expected ten columns'
);


select is(
	(
		select count(*)
		from information_schema.columns
		where table_schema = 'public'
			and table_name = 'action_rules'
			and column_name in (
				'id',
				'code',
				'action_id',
				'hazard_id',
				'location_id',
				'linked_task_id',
				'min_severity',
				'base_priority',
				'incomplete_task_boost',
				'safety_override',
				'safety_override_min_severity',
				'min_children_count',
				'min_older_adults_count',
				'reason_en',
				'reason_ar',
				'sort_order',
				'is_active',
				'created_at',
				'updated_at'
			)
	),
	19::bigint,
	'action_rules exposes the expected deterministic ranking and household-condition columns'
);


/* --------------------------------------------------------------------------
 * Primary keys and uniqueness
 * -------------------------------------------------------------------------- */

select is(
	(
		select count(*)
		from information_schema.table_constraints
		where table_schema = 'public'
			and table_name in (
				'alerts',
				'alert_locations',
				'actions',
				'action_rules'
			)
			and constraint_type = 'PRIMARY KEY'
	),
	4::bigint,
	'all four alert/action-engine tables expose primary keys'
);


select is(
	(
		select count(*)
		from information_schema.table_constraints
		where table_schema = 'public'
			and table_name in (
				'alerts',
				'actions',
				'action_rules'
			)
			and constraint_type = 'UNIQUE'
	),
	3::bigint,
	'alerts actions and action rules each expose a unique code constraint'
);


/* --------------------------------------------------------------------------
 * Row Level Security
 * -------------------------------------------------------------------------- */

select is(
	(
		select count(*)
		from pg_class
		join pg_namespace
			on pg_namespace.oid = pg_class.relnamespace
		where pg_namespace.nspname = 'public'
			and pg_class.relname in (
				'alerts',
				'alert_locations',
				'actions',
				'action_rules'
			)
			and pg_class.relrowsecurity
	),
	4::bigint,
	'RLS is enabled on all alert and action-engine tables'
);


/* --------------------------------------------------------------------------
 * Client privileges
 * -------------------------------------------------------------------------- */

select is(
	(
		select count(*)
		from information_schema.role_table_grants
		where grantee = 'anon'
			and table_schema = 'public'
			and table_name in (
				'alerts',
				'alert_locations',
				'actions',
				'action_rules'
			)
			and privilege_type = 'SELECT'
	),
	4::bigint,
	'guests receive SELECT permission on all four public safety catalogue tables'
);


select is(
	(
		select count(*)
		from information_schema.role_table_grants
		where grantee = 'authenticated'
			and table_schema = 'public'
			and table_name in (
				'alerts',
				'alert_locations',
				'actions',
				'action_rules'
			)
			and privilege_type = 'SELECT'
	),
	4::bigint,
	'authenticated users receive SELECT permission on all four public safety catalogue tables'
);


select is(
	(
		select count(*)
		from information_schema.role_table_grants
		where grantee = 'anon'
			and table_schema = 'public'
			and table_name in (
				'alerts',
				'alert_locations',
				'actions',
				'action_rules'
			)
			and privilege_type in (
				'INSERT',
				'UPDATE',
				'DELETE'
			)
	),
	0::bigint,
	'guests receive no direct write privileges on curated alert or action content'
);


select is(
	(
		select count(*)
		from information_schema.role_table_grants
		where grantee = 'authenticated'
			and table_schema = 'public'
			and table_name in (
				'alerts',
				'alert_locations',
				'actions',
				'action_rules'
			)
			and privilege_type in (
				'INSERT',
				'UPDATE',
				'DELETE'
			)
	),
	0::bigint,
	'authenticated users receive no direct write privileges on curated alert or action content'
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
				('public.alerts'),
				('public.alert_locations'),
				('public.actions'),
				('public.action_rules')
		) as alert_tables(table_name)
	),
	'service_role retains full catalogue management privileges'
);


/* --------------------------------------------------------------------------
 * Foreign-key structure
 * -------------------------------------------------------------------------- */

select is(
	(
		select count(*)
		from information_schema.table_constraints
		where table_schema = 'public'
			and table_name in (
				'alerts',
				'alert_locations',
				'action_rules'
			)
			and constraint_type = 'FOREIGN KEY'
	),
	7::bigint,
	'the alert and action-engine relationships expose seven foreign keys'
);


/* --------------------------------------------------------------------------
 * Core validation constraints
 * -------------------------------------------------------------------------- */

select is(
	(
		select count(*)
		from pg_constraint
		join pg_class
			on pg_class.oid = pg_constraint.conrelid
		join pg_namespace
			on pg_namespace.oid = pg_class.relnamespace
		where pg_namespace.nspname = 'public'
			and pg_constraint.conname in (
				'alerts_code_format',
				'alerts_origin_type_valid',
				'alerts_severity_valid',
				'alerts_publication_status_valid',
				'alerts_time_window_valid',
				'alerts_published_at_state',
				'alerts_sort_order_non_negative',

				'actions_code_format',
				'actions_sort_order_non_negative',

				'action_rules_code_format',
				'action_rules_min_severity_valid',
				'action_rules_base_priority_non_negative',
				'action_rules_incomplete_task_boost_non_negative',
				'action_rules_safety_override_non_negative',
				'action_rules_override_min_severity_valid',
				'action_rules_children_threshold_valid',
				'action_rules_older_adults_threshold_valid',
				'action_rules_sort_order_non_negative'
			)
	),
	18::bigint,
	'the expected alert and deterministic-rule validation constraints exist'
);


/* --------------------------------------------------------------------------
 * Query-supporting indexes
 * -------------------------------------------------------------------------- */

select is(
	(
		select count(*)
		from pg_indexes
		where schemaname = 'public'
			and indexname in (
				'alerts_publication_window_idx',
				'alerts_hazard_id_idx',
				'alerts_external_alert_id_unique_idx',
				'alert_locations_location_id_idx',
				'actions_active_sort_idx',
				'action_rules_hazard_severity_idx',
				'action_rules_location_id_idx',
				'action_rules_linked_task_id_idx',
				'action_rules_active_sort_idx'
			)
	),
	9::bigint,
	'all nine explicit alert and action-engine indexes exist'
);


/* --------------------------------------------------------------------------
 * Database-controlled updated_at fields
 * -------------------------------------------------------------------------- */

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
				'on_alert_updated',
				'on_action_updated',
				'on_action_rule_updated'
			)
			and not pg_trigger.tgisinternal
	),
	3::bigint,
	'alerts actions and action rules have database-controlled updated_at triggers'
);


select * from finish();

rollback;