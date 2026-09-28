import type {
	ActionPlanEvaluationInput,
	ActionPlanRule,
	EvaluatedActionPlanItem,
} from './action-plan-types';


/**
 * Returns true when the supplied runtime value is one of Ihtiyat's three
 * supported deterministic scenario-severity levels.
 *
 * TypeScript protects normal callers at compile time, but alert metadata and
 * cached/network data ultimately cross runtime boundaries. Keeping this guard
 * inside the pure evaluator prevents an invalid severity from silently
 * producing safety guidance.
 */
function isValidSeverity(
	severity: number,
): severity is 1 | 2 | 3 {
	return severity === 1 || severity === 2 || severity === 3;
}


/**
 * Checks optional household thresholds against explicitly supplied profile
 * information.
 *
 * NULL household data means "unknown", not zero. A household-conditioned rule
 * therefore applies only when every household value required by that rule is
 * actually known and satisfies its configured threshold.
 */
function matchesHouseholdConditions(
	rule: ActionPlanRule,
	household: ActionPlanEvaluationInput['household'],
): boolean {
	if (rule.min_children_count !== null) {
		if (
			household === null
			|| household.childrenCount === null
			|| household.childrenCount < rule.min_children_count
		) {
			return false;
		}
	}

	if (rule.min_older_adults_count !== null) {
		if (
			household === null
			|| household.olderAdultsCount === null
			|| household.olderAdultsCount < rule.min_older_adults_count
		) {
			return false;
		}
	}

	return true;
}


/**
 * Provides a stable text comparison without depending on the device locale.
 *
 * Codes are controlled ASCII identifiers, so direct lexical comparison gives
 * deterministic ordering on every supported device and in automated tests.
 */
function compareCodes(
	left: string,
	right: string,
): number {
	if (left < right) {
		return -1;
	}

	if (left > right) {
		return 1;
	}

	return 0;
}


/**
 * Orders two evaluated candidates deterministically.
 *
 * Score is the meaningful ranking criterion. The remaining fields are only
 * stable tie-breakers so equal scores cannot produce different plans because
 * Supabase, SQLite or JavaScript returned records in a different order.
 */
function compareEvaluatedItems(
	left: EvaluatedActionPlanItem,
	right: EvaluatedActionPlanItem,
): number {
	if (left.score !== right.score) {
		return right.score - left.score;
	}

	if (left.rule.sort_order !== right.rule.sort_order) {
		return left.rule.sort_order - right.rule.sort_order;
	}

	if (left.action.sort_order !== right.action.sort_order) {
		return left.action.sort_order - right.action.sort_order;
	}

	const ruleCodeComparison = compareCodes(
		left.rule.code,
		right.rule.code,
	);

	if (ruleCodeComparison !== 0) {
		return ruleCodeComparison;
	}

	const actionCodeComparison = compareCodes(
		left.action.code,
		right.action.code,
	);

	if (actionCodeComparison !== 0) {
		return actionCodeComparison;
	}

	if (left.rule.id !== right.rule.id) {
		return left.rule.id - right.rule.id;
	}

	return left.action.id - right.action.id;
}


/**
 * Evaluates canonical safety rules against one hazard scenario and returns an
 * ordered, explainable Action Plan.
 *
 * The evaluator is intentionally pure:
 *
 * - it performs no Supabase calls;
 * - it performs no SQLite reads;
 * - it holds no React state;
 * - it does not manufacture user-facing reasons independently of the rule.
 *
 * This lets the same deterministic behaviour operate on either remotely
 * loaded or locally cached catalogue data.
 */
export function evaluateActionPlan(
	input: ActionPlanEvaluationInput,
): EvaluatedActionPlanItem[] {
	if (!isValidSeverity(input.severity)) {
		throw new Error(
			'Action-plan severity must be 1, 2 or 3.',
		);
	}

	const activeActionsById = new Map(
		input.actions
			.filter(
				(action) => action.is_active,
			)
			.map(
				(action) => [
					action.id,
					action,
				] as const,
			),
	);

	const completedTaskIds = new Set(
		input.completedTaskIds,
	);

	const candidates: EvaluatedActionPlanItem[] = [];

	for (const rule of input.rules) {
		/*
		 * Catalogue visibility is enforced by RLS as well, but retaining these
		 * checks locally protects cached data and keeps evaluator behaviour
		 * correct independently of where the catalogue came from.
		 */
		if (!rule.is_active) {
			continue;
		}

		if (rule.hazard_id !== input.hazardId) {
			continue;
		}

		if (rule.min_severity > input.severity) {
			continue;
		}

		if (
			rule.location_id !== null
			&& rule.location_id !== input.locationId
		) {
			continue;
		}

		const action = activeActionsById.get(
			rule.action_id,
		);

		if (action === undefined) {
			continue;
		}

		/*
		 * A completed linked preparedness task removes the corresponding
		 * response action entirely. An unfinished linked task remains eligible
		 * and may receive its configured preparedness-state boost.
		*/
		if (
			rule.linked_task_id !== null
			&& completedTaskIds.has(rule.linked_task_id)
		) {
			continue;
		}

		if (
			!matchesHouseholdConditions(
				rule,
				input.household,
			)
		) {
			continue;
		}

		const severityContribution =
			10 * input.severity;

		const incompleteTaskBoost =
			rule.linked_task_id !== null
				? rule.incomplete_task_boost
				: 0;

		const safetyOverride =
			rule.safety_override_min_severity !== null
			&& input.severity >= rule.safety_override_min_severity
				? rule.safety_override
				: 0;

		const total =
			rule.base_priority
			+ severityContribution
			+ incompleteTaskBoost
			+ safetyOverride;

		candidates.push({
			action,
			rule,
			score: total,
			scoreBreakdown: {
				basePriority: rule.base_priority,
				severityContribution,
				incompleteTaskBoost,
				safetyOverride,
				total,
			},
		});
	}

	/*
	 * More than one rule may deliberately point to the same user-facing action.
	 *
	 * The heat catalogue is the current example: separate child and
	 * older-adult conditions can both become true. The user should see one
	 * action card, backed by whichever matching rule ranks highest according
	 * to the same deterministic comparison used for the final plan.
	 */
	const winningItemByActionId = new Map<
		number,
		EvaluatedActionPlanItem
	>();

	for (const candidate of candidates) {
		const currentWinner = winningItemByActionId.get(
			candidate.action.id,
		);

		if (
			currentWinner === undefined
			|| compareEvaluatedItems(
				candidate,
				currentWinner,
			) < 0
		) {
			winningItemByActionId.set(
				candidate.action.id,
				candidate,
			);
		}
	}

	return [
		...winningItemByActionId.values(),
	].sort(
		compareEvaluatedItems,
	);
}