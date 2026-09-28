import {
	evaluateActionPlan,
} from '@/features/alerts/action-plan-evaluator';

import type {
	ActionPlanAction,
	ActionPlanEvaluationInput,
	ActionPlanRule,
	ActionPlanSeverity,
} from '@/features/alerts/action-plan-types';


const FLOOD_HAZARD_ID = 101;
const HEAT_HAZARD_ID = 102;
const DUST_HAZARD_ID = 103;

const JEDDAH_LOCATION_ID = 201;
const OTHER_LOCATION_ID = 202;

const BACKUP_POWER_TASK_ID = 301;


/**
 * Creates concise deterministic action fixtures while preserving the exact
 * application-facing shape used by the evaluator.
 */
function makeAction(
	overrides: Partial<ActionPlanAction> = {},
): ActionPlanAction {
	return {
		id: 1,
		code: 'test_action',
		title_en: 'Test action',
		title_ar: 'إجراء اختباري',
		instruction_en: 'Follow the test action.',
		instruction_ar: 'اتبع الإجراء الاختباري.',
		sort_order: 10,
		is_active: true,
		...overrides,
	};
}


/**
 * Creates deterministic rule fixtures.
 *
 * Individual tests override only the condition being exercised so failures
 * remain attributable to one evaluator responsibility.
 */
function makeRule(
	overrides: Partial<ActionPlanRule> = {},
): ActionPlanRule {
	return {
		id: 1,
		code: 'test_rule',
		action_id: 1,
		hazard_id: FLOOD_HAZARD_ID,
		location_id: null,
		linked_task_id: null,
		min_severity: 1,
		base_priority: 50,
		incomplete_task_boost: 0,
		safety_override: 0,
		safety_override_min_severity: null,
		min_children_count: null,
		min_older_adults_count: null,
		reason_en: 'Test ranking reason.',
		reason_ar: 'سبب ترتيب اختباري.',
		sort_order: 10,
		is_active: true,
		...overrides,
	};
}


const followOfficialDirections = makeAction({
	id: 1,
	code: 'follow_official_directions',
	sort_order: 10,
});

const avoidFloodedRoutes = makeAction({
	id: 2,
	code: 'avoid_flooded_routes',
	sort_order: 20,
});

const checkOfficialUpdates = makeAction({
	id: 3,
	code: 'check_official_updates',
	sort_order: 30,
});

const avoidWetElectricalHazards = makeAction({
	id: 4,
	code: 'avoid_wet_electrical_hazards',
	sort_order: 40,
});

const prepareBackupPhonePower = makeAction({
	id: 5,
	code: 'prepare_backup_phone_power',
	sort_order: 50,
});

const checkVulnerableHouseholdHeat = makeAction({
	id: 6,
	code: 'check_vulnerable_household_heat',
	sort_order: 60,
});


const floodFollowOfficialDirections = makeRule({
	id: 101,
	code: 'flood_follow_official_directions',
	action_id: followOfficialDirections.id,
	min_severity: 3,
	base_priority: 130,
	safety_override: 1000,
	safety_override_min_severity: 3,
	reason_en: 'Follow official directions at severe flood severity.',
	reason_ar: 'اتبع التوجيهات الرسمية عند شدة السيول العالية.',
	sort_order: 10,
});

const floodAvoidFloodedRoutes = makeRule({
	id: 102,
	code: 'flood_avoid_flooded_routes',
	action_id: avoidFloodedRoutes.id,
	min_severity: 2,
	base_priority: 110,
	safety_override: 800,
	safety_override_min_severity: 2,
	reason_en: 'Avoid floodwater and flooded routes.',
	reason_ar: 'تجنب مياه السيول والطرق المغمورة.',
	sort_order: 20,
});

const floodAvoidWetElectricalHazards = makeRule({
	id: 103,
	code: 'flood_avoid_wet_electrical_hazards',
	action_id: avoidWetElectricalHazards.id,
	min_severity: 2,
	base_priority: 85,
	safety_override: 400,
	safety_override_min_severity: 2,
	reason_en: 'Keep away from wet electrical hazards.',
	reason_ar: 'ابتعد عن مخاطر الكهرباء المبتلة.',
	sort_order: 30,
});

const floodCheckOfficialUpdates = makeRule({
	id: 104,
	code: 'flood_check_official_updates',
	action_id: checkOfficialUpdates.id,
	min_severity: 1,
	base_priority: 90,
	safety_override: 500,
	safety_override_min_severity: 1,
	reason_en: 'Check current official flood updates.',
	reason_ar: 'تابع تحديثات السيول الرسمية الحالية.',
	sort_order: 40,
});

const floodPrepareBackupPhonePower = makeRule({
	id: 105,
	code: 'flood_prepare_backup_phone_power',
	action_id: prepareBackupPhonePower.id,
	linked_task_id: BACKUP_POWER_TASK_ID,
	min_severity: 1,
	base_priority: 70,
	incomplete_task_boost: 25,
	reason_en: 'Backup phone power is still an unfinished preparedness task.',
	reason_ar: 'لا تزال الطاقة الاحتياطية للهاتف مهمة استعداد غير مكتملة.',
	sort_order: 50,
});


const heatCheckChildren = makeRule({
	id: 201,
	code: 'heat_check_children',
	action_id: checkVulnerableHouseholdHeat.id,
	hazard_id: HEAT_HAZARD_ID,
	min_severity: 2,
	base_priority: 110,
	safety_override: 450,
	safety_override_min_severity: 2,
	min_children_count: 1,
	reason_en: 'The household includes at least one child.',
	reason_ar: 'يتضمن المنزل طفلاً واحداً على الأقل.',
	sort_order: 30,
});

const heatCheckOlderAdults = makeRule({
	id: 202,
	code: 'heat_check_older_adults',
	action_id: checkVulnerableHouseholdHeat.id,
	hazard_id: HEAT_HAZARD_ID,
	min_severity: 2,
	base_priority: 110,
	safety_override: 450,
	safety_override_min_severity: 2,
	min_older_adults_count: 1,
	reason_en: 'The household includes at least one older adult.',
	reason_ar: 'يتضمن المنزل شخصاً واحداً على الأقل من كبار السن.',
	sort_order: 40,
});


const floodActions: ActionPlanAction[] = [
	followOfficialDirections,
	avoidFloodedRoutes,
	checkOfficialUpdates,
	avoidWetElectricalHazards,
	prepareBackupPhonePower,
];

const floodRules: ActionPlanRule[] = [
	floodFollowOfficialDirections,
	floodAvoidFloodedRoutes,
	floodAvoidWetElectricalHazards,
	floodCheckOfficialUpdates,
	floodPrepareBackupPhonePower,
];


function makeFloodInput(
	severity: ActionPlanSeverity,
	overrides: Partial<ActionPlanEvaluationInput> = {},
): ActionPlanEvaluationInput {
	return {
		hazardId: FLOOD_HAZARD_ID,
		locationId: JEDDAH_LOCATION_ID,
		severity,
		actions: floodActions,
		rules: floodRules,
		completedTaskIds: [],
		household: null,
		...overrides,
	};
}


describe(
	'action-plan evaluator',
	() => {
		it(
			'rejects a runtime severity outside the supported 1 to 3 range',
			() => {
				expect(
					() => evaluateActionPlan({
						...makeFloodInput(3),
						severity: 4 as unknown as ActionPlanSeverity,
					}),
				).toThrow(
					'Action-plan severity must be 1, 2 or 3.',
				);
			},
		);


		it(
			'keeps only active rules and actions for the requested hazard',
			() => {
				const inactiveAction = makeAction({
					id: 20,
					code: 'inactive_action',
					is_active: false,
				});

				const wrongHazardRule = makeRule({
					id: 301,
					code: 'wrong_hazard_rule',
					action_id: checkOfficialUpdates.id,
					hazard_id: DUST_HAZARD_ID,
				});

				const inactiveRule = makeRule({
					id: 302,
					code: 'inactive_rule',
					action_id: checkOfficialUpdates.id,
					is_active: false,
				});

				const inactiveActionRule = makeRule({
					id: 303,
					code: 'inactive_action_rule',
					action_id: inactiveAction.id,
				});

				const result = evaluateActionPlan({
					...makeFloodInput(1),
					actions: [
						...floodActions,
						inactiveAction,
					],
					rules: [
						floodCheckOfficialUpdates,
						wrongHazardRule,
						inactiveRule,
						inactiveActionRule,
					],
				});

				expect(
					result.map(
						(item) => item.rule.code,
					),
				).toEqual([
					'flood_check_official_updates',
				]);
			},
		);


		it(
			'at severity 1 includes only rules whose minimum severity is 1',
			() => {
				const result = evaluateActionPlan(
					makeFloodInput(1),
				);

				expect(
					result.map(
						(item) => [
							item.action.code,
							item.score,
						],
					),
				).toEqual([
					[
						'check_official_updates',
						600,
					],
					[
						'prepare_backup_phone_power',
						105,
					],
				]);
			},
		);


		it(
			'at severity 2 adds the level-2 flood actions while excluding the level-3 rule',
			() => {
				const result = evaluateActionPlan(
					makeFloodInput(2),
				);

				expect(
					result.map(
						(item) => [
							item.action.code,
							item.score,
						],
					),
				).toEqual([
					[
						'avoid_flooded_routes',
						930,
					],
					[
						'check_official_updates',
						610,
					],
					[
						'avoid_wet_electrical_hazards',
						505,
					],
					[
						'prepare_backup_phone_power',
						115,
					],
				]);
			},
		);


		it(
			'at severity 3 preserves the documented severe Jeddah ranking trace',
			() => {
				const result = evaluateActionPlan(
					makeFloodInput(3),
				);

				expect(
					result.slice(
						0,
						4,
					).map(
						(item) => [
							item.action.code,
							item.score,
						],
					),
				).toEqual([
					[
						'follow_official_directions',
						1160,
					],
					[
						'avoid_flooded_routes',
						940,
					],
					[
						'check_official_updates',
						620,
					],
					[
						'avoid_wet_electrical_hazards',
						515,
					],
				]);
			},
		);


		it(
			'applies the incomplete-task boost while the linked preparedness task remains unfinished',
			() => {
				const result = evaluateActionPlan(
					makeFloodInput(3),
				);

				const backupPowerItem = result.find(
					(item) =>
						item.action.code ===
						'prepare_backup_phone_power',
				);

				expect(
					backupPowerItem,
				).toMatchObject({
					score: 125,
					scoreBreakdown: {
						basePriority: 70,
						severityContribution: 30,
						incompleteTaskBoost: 25,
						safetyOverride: 0,
						total: 125,
					},
				});
			},
		);


		it(
			'removes a task-linked action entirely after its preparedness task is completed',
			() => {
				const result = evaluateActionPlan(
					makeFloodInput(
						3,
						{
							completedTaskIds: [
								BACKUP_POWER_TASK_ID,
							],
						},
					),
				);

				expect(
					result.some(
						(item) =>
							item.action.code ===
							'prepare_backup_phone_power',
					),
				).toBe(
					false,
				);
			},
		);


		it(
			'applies the heat household action when the saved profile contains a child',
			() => {
				const result = evaluateActionPlan({
					hazardId: HEAT_HAZARD_ID,
					locationId: OTHER_LOCATION_ID,
					severity: 2,
					actions: [
						checkVulnerableHouseholdHeat,
					],
					rules: [
						heatCheckChildren,
						heatCheckOlderAdults,
					],
					completedTaskIds: [],
					household: {
						childrenCount: 1,
						olderAdultsCount: 0,
					},
				});

				expect(
					result,
				).toHaveLength(
					1,
				);

				expect(
					result[0].rule.code,
				).toBe(
					'heat_check_children',
				);
			},
		);


		it(
			'applies the heat household action when the saved profile contains an older adult',
			() => {
				const result = evaluateActionPlan({
					hazardId: HEAT_HAZARD_ID,
					locationId: OTHER_LOCATION_ID,
					severity: 2,
					actions: [
						checkVulnerableHouseholdHeat,
					],
					rules: [
						heatCheckChildren,
						heatCheckOlderAdults,
					],
					completedTaskIds: [],
					household: {
						childrenCount: 0,
						olderAdultsCount: 1,
					},
				});

				expect(
					result,
				).toHaveLength(
					1,
				);

				expect(
					result[0].rule.code,
				).toBe(
					'heat_check_older_adults',
				);
			},
		);


		it(
			'does not infer household conditions when household information is unknown',
			() => {
				const result = evaluateActionPlan({
					hazardId: HEAT_HAZARD_ID,
					locationId: OTHER_LOCATION_ID,
					severity: 2,
					actions: [
						checkVulnerableHouseholdHeat,
					],
					rules: [
						heatCheckChildren,
						heatCheckOlderAdults,
					],
					completedTaskIds: [],
					household: null,
				});

				expect(
					result,
				).toEqual(
					[],
				);
			},
		);


		it(
			'deduplicates two matching household rules that reference the same action',
			() => {
				const result = evaluateActionPlan({
					hazardId: HEAT_HAZARD_ID,
					locationId: OTHER_LOCATION_ID,
					severity: 2,
					actions: [
						checkVulnerableHouseholdHeat,
					],
					rules: [
						heatCheckChildren,
						heatCheckOlderAdults,
					],
					completedTaskIds: [],
					household: {
						childrenCount: 2,
						olderAdultsCount: 1,
					},
				});

				expect(
					result,
				).toHaveLength(
					1,
				);

				expect(
					result[0],
				).toMatchObject({
					action: {
						code:
							'check_vulnerable_household_heat',
					},
					rule: {
						code:
							'heat_check_children',
						reason_en:
							'The household includes at least one child.',
						reason_ar:
							'يتضمن المنزل طفلاً واحداً على الأقل.',
					},
					score: 580,
				});
			},
		);


		it(
			'applies a location-specific rule only when its configured location matches the scenario',
			() => {
				const locationAction = makeAction({
					id: 30,
					code: 'location_specific_action',
				});

				const matchingRule = makeRule({
					id: 401,
					code: 'jeddah_specific_rule',
					action_id: locationAction.id,
					location_id: JEDDAH_LOCATION_ID,
					base_priority: 75,
				});

				const otherLocationRule = makeRule({
					id: 402,
					code: 'other_location_rule',
					action_id: locationAction.id,
					location_id: OTHER_LOCATION_ID,
					base_priority: 500,
				});

				const result = evaluateActionPlan({
					...makeFloodInput(1),
					actions: [
						locationAction,
					],
					rules: [
						matchingRule,
						otherLocationRule,
					],
				});

				expect(
					result,
				).toHaveLength(
					1,
				);

				expect(
					result[0].rule.code,
				).toBe(
					'jeddah_specific_rule',
				);
			},
		);


		it(
			'uses deterministic tie-breaking and preserves the exact winning-rule explanation',
			() => {
				const firstAction = makeAction({
					id: 40,
					code: 'first_equal_action',
					sort_order: 20,
				});

				const secondAction = makeAction({
					id: 41,
					code: 'second_equal_action',
					sort_order: 10,
				});

				const firstRule = makeRule({
					id: 501,
					code: 'first_equal_rule',
					action_id: firstAction.id,
					base_priority: 100,
					reason_en:
						'Explanation from first equal rule.',
					reason_ar:
						'تفسير من القاعدة المتساوية الأولى.',
					sort_order: 20,
				});

				const secondRule = makeRule({
					id: 502,
					code: 'second_equal_rule',
					action_id: secondAction.id,
					base_priority: 100,
					reason_en:
						'Explanation from second equal rule.',
					reason_ar:
						'تفسير من القاعدة المتساوية الثانية.',
					sort_order: 10,
				});

				const result = evaluateActionPlan({
					...makeFloodInput(1),
					actions: [
						firstAction,
						secondAction,
					],
					rules: [
						firstRule,
						secondRule,
					],
				});

				expect(
					result.map(
						(item) => item.rule.code,
					),
				).toEqual([
					'second_equal_rule',
					'first_equal_rule',
				]);

				expect(
					result[0].rule.reason_en,
				).toBe(
					'Explanation from second equal rule.',
				);

				expect(
					result[0].rule.reason_ar,
				).toBe(
					'تفسير من القاعدة المتساوية الثانية.',
				);
			},
		);
	},
);