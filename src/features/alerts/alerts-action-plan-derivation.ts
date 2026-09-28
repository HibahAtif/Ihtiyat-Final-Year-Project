import {
	evaluateActionPlan,
} from './action-plan-evaluator';

import type {
	AlertsActionAlert,
	AlertsActionCatalogue,
} from './alerts-action-catalogue-service';

import type {
	ActionPlanHouseholdContext,
	ActionPlanSeverity,
	EvaluatedActionPlanItem,
} from './action-plan-types';


/**
 * Inputs used to determine which published catalogue alerts currently apply.
 *
 * locationScopeIds contains the selected location plus any trusted ancestor
 * locations supplied by the coordination layer. An empty array represents no
 * resolved location and therefore allows only nationally applicable alerts.
 *
 * `at` is injected rather than read from Date.now() so applicability remains
 * deterministic and independently testable.
*/
export type AlertApplicabilityInput = {
	catalogue: AlertsActionCatalogue;
	locationScopeIds: readonly number[];
	at: string;
};


/**
 * Dynamic user/application state required to derive one Action Plan.
 *
 * The catalogue remains canonical and immutable. Simulation severity,
 * preparedness progress and household information are runtime inputs and are
 * therefore deliberately not written back into the catalogue.
*/
export type DeriveActionPlanForAlertInput = {
	catalogue: AlertsActionCatalogue;
	alertId: number;
	locationScopeIds: readonly number[];
	activeLocationId: number | null;
	at: string;
	simulationSeverity: ActionPlanSeverity | null;
	completedTaskIds: readonly number[];
	household: ActionPlanHouseholdContext | null;
};


/**
 * Complete result for one selected alert.
 *
 * effectiveSeverity records the severity actually supplied to the evaluator.
 * For simulations this may be the user's explicit Level 1/2/3 choice. For
 * non-simulated alerts it remains the canonical stored alert severity.
*/
export type DerivedActionPlan = {
	alert: AlertsActionAlert;
	effectiveSeverity: ActionPlanSeverity;
	items: EvaluatedActionPlanItem[];
};


/**
 * Runtime guard for values that cross database, cache or route boundaries.
 *
 * TypeScript can describe the supported domain, but it cannot guarantee that
 * data received at runtime still satisfies that domain.
*/
function isActionPlanSeverity(
	value: number,
): value is ActionPlanSeverity {
	return value === 1
		|| value === 2
		|| value === 3;
}


/**
 * Converts an ISO timestamp into a comparable numeric value.
 *
 * Canonical Supabase data should always contain valid timestamps, but keeping
 * the guard here prevents malformed cached data from silently being treated as
 * currently applicable.
*/
function parseAlertTimestamp(
	value: string,
	fieldName: string,
): number {
	const timestamp =
		Date.parse(
			value,
		);


	if (
		Number.isNaN(
			timestamp,
		)
	) {
		throw new Error(
			`Invalid alert ${fieldName} timestamp: ${value}`,
		);
	}


	return timestamp;
}


/**
 * Creates an alert-to-location lookup without changing the canonical
 * relationship array.
*/
function buildAlertLocationLookup(
	catalogue: AlertsActionCatalogue,
): Map<number, Set<number>> {
	const locationIdsByAlertId =
		new Map<
			number,
			Set<number>
		>();


	for (
		const relationship
		of catalogue.alertLocations
	) {
		let locationIds =
			locationIdsByAlertId.get(
				relationship.alert_id,
			);


		if (
			locationIds === undefined
		) {
			locationIds =
				new Set<number>();

			locationIdsByAlertId.set(
				relationship.alert_id,
				locationIds,
			);
		}


		locationIds.add(
			relationship.location_id,
		);
	}


	return locationIdsByAlertId;
}


/**
 * Determines whether one alert is geographically applicable.
 *
 * No alert_locations rows means national applicability. When relationships do
 * exist, at least one of them must appear in the trusted location scope
 * supplied by the caller.
*/
function isAlertApplicableToLocationScope(
	alert: AlertsActionAlert,
	locationIdsByAlertId: ReadonlyMap<
		number,
		ReadonlySet<number>
	>,
	locationScopeIds: ReadonlySet<number>,
): boolean {
	const configuredLocationIds =
		locationIdsByAlertId.get(
			alert.id,
		);


	if (
		configuredLocationIds === undefined
		|| configuredLocationIds.size === 0
	) {
		return true;
	}


	if (
		locationScopeIds.size === 0
	) {
		return false;
	}


	for (
		const configuredLocationId
		of configuredLocationIds
	) {
		if (
			locationScopeIds.has(
				configuredLocationId,
			)
		) {
			return true;
		}
	}


	return false;
}


/**
 * Returns alerts that are currently valid for the supplied location scope.
 *
 * Applicability combines three independent conditions:
 *
 * 1. the alert is still published;
 * 2. the current deterministic time falls within its validity window;
 * 3. its configured location is in scope, or it has no location links and is
 *    therefore national.
 *
 * Results are sorted independently of input order so remote and cached
 * catalogues produce the same stable feed ordering.
*/
export function getApplicableAlerts(
	input: AlertApplicabilityInput,
): AlertsActionAlert[] {
	const at =
		parseAlertTimestamp(
			input.at,
			'evaluation',
		);

	const locationScopeIds =
		new Set(
			input.locationScopeIds,
		);

	const locationIdsByAlertId =
		buildAlertLocationLookup(
			input.catalogue,
		);


	return input.catalogue.alerts
		.filter(
			(alert) => {
				if (
					alert.publication_status
					!== 'published'
				) {
					return false;
				}


				const startsAt =
					parseAlertTimestamp(
						alert.starts_at,
						'starts_at',
					);

				const expiresAt =
					parseAlertTimestamp(
						alert.expires_at,
						'expires_at',
					);


				/*
				 * starts_at is inclusive while expires_at is exclusive.
				 * Once expiry is reached, the alert is no longer current.
				*/
				if (
					at < startsAt
					|| at >= expiresAt
				) {
					return false;
				}


				return isAlertApplicableToLocationScope(
					alert,
					locationIdsByAlertId,
					locationScopeIds,
				);
			},
		)
		.sort(
			(
				left,
				right,
			) => {
				if (
					left.sort_order
					!== right.sort_order
				) {
					return left.sort_order
						- right.sort_order;
				}


				return left.id
					- right.id;
			},
		);
}


/**
 * Resolves the severity that must be supplied to the Action Plan evaluator.
 *
 * Simulated alerts may use an explicit Level 1/2/3 selected by the user. This
 * is a runtime scenario input only; the canonical alert row is never mutated.
 *
 * Non-simulated alerts ignore simulation controls completely and retain their
 * backend severity.
*/
export function resolveEffectiveAlertSeverity(
	alert: AlertsActionAlert,
	simulationSeverity: ActionPlanSeverity | null,
): ActionPlanSeverity {
	if (
		!isActionPlanSeverity(
			alert.severity,
		)
	) {
		throw new Error(
			'Alert severity must be 1, 2 or 3.',
		);
	}


	if (
		alert.origin_type
		!== 'simulated'
	) {
		return alert.severity;
	}


	if (
		simulationSeverity === null
	) {
		return alert.severity;
	}


	if (
		!isActionPlanSeverity(
			simulationSeverity,
		)
	) {
		throw new Error(
			'Simulation severity must be 1, 2 or 3.',
		);
	}


	return simulationSeverity;
}


/**
 * Derives one explainable Action Plan from a selected applicable alert.
 *
 * WHAT:
 * Connects alert applicability and effective severity to the already-tested
 * deterministic Action Plan evaluator.
 *
 * WHY:
 * Screens and React providers should not reproduce location checks, simulation
 * rules or evaluator input construction. Keeping those decisions in one pure
 * function also guarantees that online and SQLite-backed catalogues behave the
 * same way.
 *
 * HOW:
 * - locate the requested canonical alert;
 * - verify that it is currently applicable;
 * - resolve the effective scenario severity;
 * - pass the alert's hazard together with current progress and household state
 *   to evaluateActionPlan();
 * - return the canonical alert, effective severity and ordered evaluation.
 *
 * No input catalogue rows are mutated and no generated plan is persisted.
*/
export function deriveActionPlanForAlert(
	input: DeriveActionPlanForAlertInput,
): DerivedActionPlan {
	const alert =
		input.catalogue.alerts.find(
			(candidate) =>
				candidate.id
				=== input.alertId,
		);


	if (
		alert === undefined
	) {
		throw new Error(
			`Alert ${input.alertId} is not present in the loaded alert/action catalogue.`,
		);
	}


	const applicableAlerts =
		getApplicableAlerts({
			catalogue:
				input.catalogue,
			locationScopeIds:
				input.locationScopeIds,
			at:
				input.at,
		});


	const isApplicable =
		applicableAlerts.some(
			(candidate) =>
				candidate.id
					=== alert.id,
		);


	if (
		!isApplicable
	) {
		throw new Error(
			`Alert ${alert.id} is not applicable to the current location and time.`,
		);
	}


	const effectiveSeverity =
		resolveEffectiveAlertSeverity(
			alert,
			input.simulationSeverity,
		);


	const items =
		evaluateActionPlan({
			hazardId:
				alert.hazard_id,
			locationId:
				input.activeLocationId,
			severity:
				effectiveSeverity,
			actions:
				input.catalogue.actions,
			rules:
				input.catalogue.rules,
			completedTaskIds:
				input.completedTaskIds,
			household:
				input.household,
		});


	return {
		alert,
		effectiveSeverity,
		items,
	};
}