import {
	supabaseClient,
} from '@/lib/supabase-config';

import type { Tables } from '@/types/database.types';

import type {
	ActionPlanAction,
	ActionPlanRule,
} from './action-plan-types';


/**
 * Public alert fields required by the Alerts experience and Action Plan.
 *
 * Backend audit timestamps are deliberately excluded from the mobile
 * application contract.
*/
export type AlertsActionAlert = Pick<
	Tables<'alerts'>,
	| 'id'
	| 'code'
	| 'hazard_id'
	| 'origin_type'
	| 'external_alert_id'
	| 'severity'
	| 'title_en'
	| 'title_ar'
	| 'message_en'
	| 'message_ar'
	| 'starts_at'
	| 'published_at'
	| 'expires_at'
	| 'publication_status'
	| 'sort_order'
>;


/**
 * Public relationship between an alert and an affected curated location.
 *
 * An alert with no relationship rows remains nationally applicable.
*/
export type AlertsActionLocation =
	Tables<'alert_locations'>;


/**
 * Complete canonical public input required by the alert feed and deterministic
 * Action Plan engine.
*/
export type AlertsActionCatalogue = {
	alerts: AlertsActionAlert[];
	alertLocations: AlertsActionLocation[];
	actions: ActionPlanAction[];
	rules: ActionPlanRule[];
};


/**
 * Explicit alert projection used by the mobile application.
 *
 * Avoiding SELECT * keeps the client boundary stable if backend-only columns
 * are added later.
*/
const ALERT_COLUMNS = `
	id,
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
` as const;


/**
 * Alert-location relationships contain only canonical identifiers.
 */
const ALERT_LOCATION_COLUMNS = `
	alert_id,
	location_id
` as const;


/**
 * Reusable action projection consumed by the deterministic evaluator and UI.
*/
const ACTION_COLUMNS = `
	id,
	code,
	title_en,
	title_ar,
	instruction_en,
	instruction_ar,
	sort_order,
	is_active
` as const;


/**
 * Complete rule projection required by evaluateActionPlan().
 *
 * Every condition that can affect eligibility, score or explanation is
 * explicitly requested so the online and SQLite-backed evaluator receive the
 * same application-facing rule structure.
*/
const ACTION_RULE_COLUMNS = `
	id,
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
` as const;


/**
 * Loads currently published alert records.
 *
 * WHAT:
 * Retrieves the canonical alert rows that may appear in Ihtiyat's alert feed.
 *
 * WHY:
 * Draft and retired records must not enter the mobile catalogue. Published
 * simulated alerts remain clearly identified through origin_type and their
 * bilingual content.
 *
 * HOW:
 * Only app-facing columns are selected and results are deterministically
 * ordered for stable online/offline behaviour and reproducible tests.
*/
export async function loadPublishedAlerts():
	Promise<AlertsActionAlert[]> {
	const {
		data,
		error,
	} = await supabaseClient
		.from(
			'alerts',
		)
		.select(
			ALERT_COLUMNS,
		)
		.eq(
			'publication_status',
			'published',
		)
		.order(
			'sort_order',
			{
				ascending: true,
			},
		)
		.order(
			'id',
			{
				ascending: true,
			},
		);


	if (error) {
		throw new Error(
			`Unable to load published alerts: ${error.message}`,
		);
	}


	return data ?? [];
}


/**
 * Loads the public relationships between alerts and curated locations.
 *
 * No relationship rows for an alert means national applicability, so the
 * service returns the relationship table independently rather than forcing a
 * location onto every alert.
*/
export async function loadAlertLocations():
	Promise<AlertsActionLocation[]> {
	const {
		data,
		error,
	} = await supabaseClient
		.from(
			'alert_locations',
		)
		.select(
			ALERT_LOCATION_COLUMNS,
		)
		.order(
			'alert_id',
			{
				ascending: true,
			},
		)
		.order(
			'location_id',
			{
				ascending: true,
			},
		);


	if (error) {
		throw new Error(
			`Unable to load alert locations: ${error.message}`,
		);
	}


	return data ?? [];
}


/**
 * Loads active reusable bilingual safety actions.
 *
 * Hazard ownership deliberately belongs to action_rules rather than actions in
 * the implemented schema. This allows one action definition to be reused by
 * more than one reviewed hazard rule without duplicating its display content.
*/
export async function loadActiveActions():
	Promise<ActionPlanAction[]> {
	const {
		data,
		error,
	} = await supabaseClient
		.from(
			'actions',
		)
		.select(
			ACTION_COLUMNS,
		)
		.eq(
			'is_active',
			true,
		)
		.order(
			'sort_order',
			{
				ascending: true,
			},
		)
		.order(
			'id',
			{
				ascending: true,
			},
		);


	if (error) {
		throw new Error(
			`Unable to load active actions: ${error.message}`,
		);
	}


	return data ?? [];
}


/**
 * Loads active deterministic Action Plan rules.
 *
 * The service performs data access only. It does not rank actions or interpret
 * household/task conditions; those decisions remain inside the already-tested
 * pure evaluator.
*/
export async function loadActiveActionRules():
	Promise<ActionPlanRule[]> {
	const {
		data,
		error,
	} = await supabaseClient
		.from(
			'action_rules',
		)
		.select(
			ACTION_RULE_COLUMNS,
		)
		.eq(
			'is_active',
			true,
		)
		.order(
			'hazard_id',
			{
				ascending: true,
			},
		)
		.order(
			'sort_order',
			{
				ascending: true,
			},
		)
		.order(
			'id',
			{
				ascending: true,
			},
		);


	if (error) {
		throw new Error(
			`Unable to load active action rules: ${error.message}`,
		);
	}


	return data ?? [];
}


/**
 * Loads one coherent public alert/action catalogue from Supabase.
 *
 * WHAT:
 * Fetches published alerts, their location relationships, active reusable
 * actions and active deterministic rules.
 *
 * WHY:
 * These four datasets collectively form the canonical input required by the
 * Alerts feature and offline Action Plan cache. Returning them together keeps
 * screens and providers from orchestrating independent database reads.
 *
 * HOW:
 * The four public reads are independent and therefore run in parallel.
 * Promise.all deliberately rejects if any one read fails. The caller can then
 * fall back to one previously cached coherent SQLite snapshot instead of
 * combining fresh and stale catalogue fragments.
*/
export async function loadAlertsActionCatalogue():
	Promise<AlertsActionCatalogue> {
	const [
		alerts,
		alertLocations,
		actions,
		rules,
	] = await Promise.all([
		loadPublishedAlerts(),
		loadAlertLocations(),
		loadActiveActions(),
		loadActiveActionRules(),
	]);


	return {
		alerts,
		alertLocations,
		actions,
		rules,
	};
}