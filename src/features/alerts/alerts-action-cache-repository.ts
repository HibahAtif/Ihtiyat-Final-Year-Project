import type { Tables } from '@/types/database.types';

import {
	getIhtiyatDatabase,
} from '@/storage/ihtiyat-database';

import type {
	ActionPlanAction,
	ActionPlanRule,
} from './action-plan-types';


const ALERTS_ACTION_CACHE_KEY =
	'alerts.actions.catalogue';


/**
 * Public alert fields persisted in SQLite V4.
 *
 * Supabase remains canonical. Backend audit timestamps are deliberately
 * excluded because the device cache only needs fields required to identify,
 * display and evaluate an alert.
*/
export type CachedAlert = Pick<
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
 * Alert-to-location relationship retained locally.
 *
 * An alert with no relationship rows is interpreted as nationally applicable.
*/
export type CachedAlertLocation =
	Tables<'alert_locations'>;


/**
 * One coherent public snapshot required to reconstruct alert-aware Action
 * Plans offline.
 *
 * Generated rankings and private user state are intentionally excluded. They
 * are combined with this canonical snapshot when evaluateActionPlan() runs.
*/
export type AlertsActionCacheSnapshot = {
	alerts: readonly CachedAlert[];
	alertLocations: readonly CachedAlertLocation[];
	actions: readonly ActionPlanAction[];
	rules: readonly ActionPlanRule[];
};


type CacheMetadataRow = {
	cached_at: string;
};


/**
 * SQLite stores booleans as INTEGER values.
 *
 * Keeping the row type separate prevents SQLite's representation from leaking
 * into the application-facing ActionPlanAction contract.
*/
type CachedActionRow =
	Omit<
		ActionPlanAction,
		'is_active'
	>
	& {
		is_active: number;
	};


/**
 * SQLite representation of one deterministic action rule.
 *
 * Only is_active differs from the application-facing type; nullable condition
 * fields preserve their Supabase meaning unchanged.
*/
type CachedActionRuleRow =
	Omit<
		ActionPlanRule,
		'is_active'
	>
	& {
		is_active: number;
	};


/**
 * Converts application booleans into SQLite INTEGER values.
*/
function toSQLiteBoolean(
	value: boolean,
): number {
	return value
		? 1
		: 0;
}


/**
 * Restores a SQLite INTEGER boolean to the application representation.
*/
function fromSQLiteBoolean(
	value: number,
): boolean {
	return value === 1;
}


/**
 * Replaces the complete public alert/action snapshot atomically.
 *
 * WHAT:
 * Stores alerts, their location relationships, reusable safety actions and
 * deterministic rules as one coherent local catalogue.
 *
 * WHY:
 * A partial replacement could combine new alerts with stale rules or vice
 * versa, producing an internally inconsistent offline Action Plan.
 *
 * HOW:
 * Child rows are deleted before parent rows, the complete replacement is
 * inserted, and cache metadata is written last inside one exclusive
 * transaction. If any operation fails, SQLite can roll back the transaction
 * rather than recognising a partial snapshot as successfully cached.
*/
export async function saveAlertsActionCache(
	snapshot: AlertsActionCacheSnapshot,
	cachedAt: string = new Date().toISOString(),
): Promise<void> {
	const database =
		await getIhtiyatDatabase();


	await database.withExclusiveTransactionAsync(
		async (
			transaction,
		): Promise<void> => {
			/*
			 * Delete dependent rows before their parents so foreign-key
			 * enforcement remains valid throughout snapshot replacement.
			*/
			await transaction.runAsync(
				'DELETE FROM action_rule_cache;',
			);

			await transaction.runAsync(
				'DELETE FROM action_cache;',
			);

			await transaction.runAsync(
				'DELETE FROM alert_location_cache;',
			);

			await transaction.runAsync(
				'DELETE FROM alert_cache;',
			);


			for (
				const alert
				of snapshot.alerts
			) {
				await transaction.runAsync(
					`
						INSERT INTO alert_cache (
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
						)
						VALUES (
							?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
						);
					`,
					alert.id,
					alert.code,
					alert.hazard_id,
					alert.origin_type,
					alert.external_alert_id,
					alert.severity,
					alert.title_en,
					alert.title_ar,
					alert.message_en,
					alert.message_ar,
					alert.starts_at,
					alert.published_at,
					alert.expires_at,
					alert.publication_status,
					alert.sort_order,
				);
			}


			for (
				const alertLocation
				of snapshot.alertLocations
			) {
				await transaction.runAsync(
					`
						INSERT INTO alert_location_cache (
							alert_id,
							location_id
						)
						VALUES (?, ?);
					`,
					alertLocation.alert_id,
					alertLocation.location_id,
				);
			}


			for (
				const action
				of snapshot.actions
			) {
				await transaction.runAsync(
					`
						INSERT INTO action_cache (
							id,
							code,
							title_en,
							title_ar,
							instruction_en,
							instruction_ar,
							sort_order,
							is_active
						)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?);
					`,
					action.id,
					action.code,
					action.title_en,
					action.title_ar,
					action.instruction_en,
					action.instruction_ar,
					action.sort_order,
					toSQLiteBoolean(
						action.is_active,
					),
				);
			}


			for (
				const rule
				of snapshot.rules
			) {
				await transaction.runAsync(
					`
						INSERT INTO action_rule_cache (
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
						)
						VALUES (
							?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
						);
					`,
					rule.id,
					rule.code,
					rule.action_id,
					rule.hazard_id,
					rule.location_id,
					rule.linked_task_id,
					rule.min_severity,
					rule.base_priority,
					rule.incomplete_task_boost,
					rule.safety_override,
					rule.safety_override_min_severity,
					rule.min_children_count,
					rule.min_older_adults_count,
					rule.reason_en,
					rule.reason_ar,
					rule.sort_order,
					toSQLiteBoolean(
						rule.is_active,
					),
				);
			}


			/*
			 * Metadata is intentionally written last.
			 *
			 * Its presence means a complete snapshot was successfully cached,
			 * including the legitimate case where all four arrays were empty.
			*/
			await transaction.runAsync(
				`
					INSERT INTO alert_action_cache_metadata (
						cache_key,
						cached_at
					)
					VALUES (?, ?)
					ON CONFLICT(cache_key)
					DO UPDATE SET
						cached_at = excluded.cached_at;
				`,
				ALERTS_ACTION_CACHE_KEY,
				cachedAt,
			);
		},
	);
}


/**
 * Restores the last successful public alert/action snapshot.
 *
 * `null` means no successful snapshot has ever been cached.
 *
 * An object containing four empty arrays has a different meaning: a successful
 * snapshot was cached and legitimately contained no catalogue rows.
*/
export async function loadAlertsActionCache():
	Promise<AlertsActionCacheSnapshot | null> {
	const database =
		await getIhtiyatDatabase();


	const metadata =
		await database.getFirstAsync<CacheMetadataRow>(
			`
				SELECT
					cached_at
				FROM alert_action_cache_metadata
				WHERE cache_key = ?
				LIMIT 1;
			`,
			ALERTS_ACTION_CACHE_KEY,
		);


	if (!metadata) {
		return null;
	}


	const alertRows =
		await database.getAllAsync<CachedAlert>(
			`
				SELECT
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
				FROM alert_cache
				ORDER BY
					sort_order ASC,
					id ASC;
			`,
		);


	const alertLocationRows =
		await database.getAllAsync<CachedAlertLocation>(
			`
				SELECT
					alert_id,
					location_id
				FROM alert_location_cache
				ORDER BY
					alert_id ASC,
					location_id ASC;
			`,
		);


	const actionRows =
		await database.getAllAsync<CachedActionRow>(
			`
				SELECT
					id,
					code,
					title_en,
					title_ar,
					instruction_en,
					instruction_ar,
					sort_order,
					is_active
				FROM action_cache
				ORDER BY
					sort_order ASC,
					id ASC;
			`,
		);


	const ruleRows =
		await database.getAllAsync<CachedActionRuleRow>(
			`
				SELECT
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
				FROM action_rule_cache
				ORDER BY
					hazard_id ASC,
					sort_order ASC,
					id ASC;
			`,
		);


	const actions: ActionPlanAction[] =
		actionRows.map(
			(row) => ({
				...row,
				is_active:
					fromSQLiteBoolean(
						row.is_active,
					),
			}),
		);


	const rules: ActionPlanRule[] =
		ruleRows.map(
			(row) => ({
				...row,
				is_active:
					fromSQLiteBoolean(
						row.is_active,
					),
			}),
		);


	return {
		alerts:
			alertRows,
		alertLocations:
			alertLocationRows,
		actions,
		rules,
	};
}