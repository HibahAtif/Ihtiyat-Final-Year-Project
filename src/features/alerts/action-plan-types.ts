import type {
	Tables,
} from '@/types/database.types';


/**
 * Ihtiyat uses three discrete scenario-severity levels.
 *
 * The type intentionally mirrors the database constraint while remaining
 * independent of any external warning system. For simulated alerts, the
 * application may supply one of these levels as the effective scenario
 * severity. It must not present the value as an official warning level.
 */
export type ActionPlanSeverity = 1 | 2 | 3;


/**
 * Public action fields required by the deterministic action-plan evaluator
 * and, later, the Action Plan UI.
 *
 * Pick keeps the application contract tied to the generated Supabase schema
 * without coupling this pure evaluator to timestamps or other unused columns.
 */
export type ActionPlanAction = Pick<
	Tables<'actions'>,
	| 'id'
	| 'code'
	| 'title_en'
	| 'title_ar'
	| 'instruction_en'
	| 'instruction_ar'
	| 'sort_order'
	| 'is_active'
>;


/**
 * Public rule fields required to decide whether an action applies and how it
 * should be ranked.
 *
 * The evaluator consumes canonical rule data; it does not fetch Supabase
 * records itself. This keeps the decision logic independently testable and
 * reusable when the same catalogue is later loaded from SQLite.
 */
export type ActionPlanRule = Pick<
	Tables<'action_rules'>,
	| 'id'
	| 'code'
	| 'action_id'
	| 'hazard_id'
	| 'location_id'
	| 'linked_task_id'
	| 'min_severity'
	| 'base_priority'
	| 'incomplete_task_boost'
	| 'safety_override'
	| 'safety_override_min_severity'
	| 'min_children_count'
	| 'min_older_adults_count'
	| 'reason_en'
	| 'reason_ar'
	| 'sort_order'
	| 'is_active'
>;


/**
 * Household information that is allowed to influence V1 action ranking.
 *
 * NULL means that the value is unknown because household information has not
 * been supplied. It is deliberately different from zero, which means the user
 * explicitly supplied that there are no household members in that category.
 */
export type ActionPlanHouseholdContext = {
	childrenCount: number | null;
	olderAdultsCount: number | null;
};


/**
 * Complete deterministic input for one Action Plan evaluation.
 *
 * locationId remains part of the contract even though the current baseline
 * seed rules are hazard-wide. This lets future reviewed location-specific
 * rules use the same evaluator without changing its API.
 */
export type ActionPlanEvaluationInput = {
	hazardId: number;
	locationId: number | null;
	severity: ActionPlanSeverity;
	actions: readonly ActionPlanAction[];
	rules: readonly ActionPlanRule[];
	completedTaskIds: readonly number[];
	household: ActionPlanHouseholdContext | null;
};


/**
 * Inspectable contribution of one winning rule to an action's final score.
 *
 * Keeping the components exposes exactly how the deterministic total was
 * produced, which supports debugging, evaluation and explainability without
 * making the UI recalculate the ranking independently.
 */
export type ActionPlanScoreBreakdown = {
	basePriority: number;
	severityContribution: number;
	incompleteTaskBoost: number;
	safetyOverride: number;
	total: number;
};


/**
 * One action selected by the deterministic evaluator.
 *
 * The exact winning rule is preserved with the action. The UI can therefore
 * display reason_en/reason_ar from the same rule that actually produced the
 * rank instead of manufacturing a separate explanation.
 */
export type EvaluatedActionPlanItem = {
	action: ActionPlanAction;
	rule: ActionPlanRule;
	score: number;
	scoreBreakdown: ActionPlanScoreBreakdown;
};