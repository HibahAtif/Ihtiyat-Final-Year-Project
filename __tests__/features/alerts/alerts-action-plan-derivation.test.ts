/// <reference types="jest" />


import {
	deriveActionPlanForAlert,
	getApplicableAlerts,
	resolveEffectiveAlertSeverity,
} from '@/features/alerts/alerts-action-plan-derivation';

import type {
	AlertsActionAlert,
	AlertsActionCatalogue,
	AlertsActionLocation,
} from '@/features/alerts/alerts-action-catalogue-service';

import type {
	ActionPlanAction,
	ActionPlanRule,
	ActionPlanSeverity,
} from '@/features/alerts/action-plan-types';


const AT =
	'2050-06-01T12:00:00.000Z';


const JEDDAH_ID =
	201;

const MAKKAH_REGION_ID =
	200;

const EASTERN_REGION_ID =
	300;

const BACKUP_POWER_TASK_ID =
	900;


const floodAlert: AlertsActionAlert = {
	id: 101,
	code: 'sim_flood_jeddah_severe',
	hazard_id: 11,
	origin_type: 'simulated',
	external_alert_id: null,
	severity: 3,
	title_en: '[SIMULATION] Severe flood scenario',
	title_ar: '[محاكاة] سيناريو سيول شديدة',
	message_en: 'A severe flood scenario is being simulated.',
	message_ar: 'تتم محاكاة سيناريو سيول شديدة.',
	starts_at: '2040-01-01T00:00:00.000Z',
	published_at: '2040-01-01T00:00:00.000Z',
	expires_at: '2099-12-31T23:59:59.000Z',
	publication_status: 'published',
	sort_order: 10,
};


const regionalHeatAlert: AlertsActionAlert = {
	id: 102,
	code: 'sim_heat_eastern_severe',
	hazard_id: 12,
	origin_type: 'simulated',
	external_alert_id: null,
	severity: 3,
	title_en: '[SIMULATION] Severe heat scenario',
	title_ar: '[محاكاة] سيناريو حر شديد',
	message_en: 'A severe heat scenario is being simulated.',
	message_ar: 'تتم محاكاة سيناريو حر شديد.',
	starts_at: '2040-01-01T00:00:00.000Z',
	published_at: '2040-01-01T00:00:00.000Z',
	expires_at: '2099-12-31T23:59:59.000Z',
	publication_status: 'published',
	sort_order: 20,
};


const nationalWildfireAlert: AlertsActionAlert = {
	id: 103,
	code: 'sim_wildfire_national_severe',
	hazard_id: 13,
	origin_type: 'simulated',
	external_alert_id: null,
	severity: 3,
	title_en: '[SIMULATION] National wildfire scenario',
	title_ar: '[محاكاة] سيناريو حريق وطني',
	message_en: 'A national wildfire scenario is being simulated.',
	message_ar: 'تتم محاكاة سيناريو حريق وطني.',
	starts_at: '2040-01-01T00:00:00.000Z',
	published_at: '2040-01-01T00:00:00.000Z',
	expires_at: '2099-12-31T23:59:59.000Z',
	publication_status: 'published',
	sort_order: 30,
};


const expiredAlert: AlertsActionAlert = {
	...floodAlert,
	id: 104,
	code: 'expired_flood_alert',
	expires_at: '2049-12-31T23:59:59.000Z',
	sort_order: 40,
};


const futureAlert: AlertsActionAlert = {
	...floodAlert,
	id: 105,
	code: 'future_flood_alert',
	starts_at: '2051-01-01T00:00:00.000Z',
	sort_order: 50,
};


const officialFloodAlert: AlertsActionAlert = {
	...floodAlert,
	id: 106,
	code: 'official_external_flood',
	origin_type: 'official_external',
	severity: 2,
	title_en: 'Flood alert',
	title_ar: 'تنبيه سيول',
	sort_order: 60,
};


const alertLocations: AlertsActionLocation[] = [
	{
		alert_id: floodAlert.id,
		location_id: JEDDAH_ID,
	},
	{
		alert_id: regionalHeatAlert.id,
		location_id: EASTERN_REGION_ID,
	},
	{
		alert_id: expiredAlert.id,
		location_id: JEDDAH_ID,
	},
	{
		alert_id: futureAlert.id,
		location_id: JEDDAH_ID,
	},
	{
		alert_id: officialFloodAlert.id,
		location_id: JEDDAH_ID,
	},
];


const checkOfficialUpdates: ActionPlanAction = {
	id: 301,
	code: 'check_official_updates',
	title_en: 'Check official updates',
	title_ar: 'تحقق من التحديثات الرسمية',
	instruction_en: 'Check current official information.',
	instruction_ar: 'تحقق من المعلومات الرسمية الحالية.',
	sort_order: 10,
	is_active: true,
};


const prepareBackupPower: ActionPlanAction = {
	id: 302,
	code: 'prepare_backup_power',
	title_en: 'Prepare backup phone power',
	title_ar: 'جهّز طاقة احتياطية للهاتف',
	instruction_en: 'Keep backup phone power available.',
	instruction_ar: 'احتفظ بطاقة احتياطية للهاتف.',
	sort_order: 20,
	is_active: true,
};


const checkChildDuringHeat: ActionPlanAction = {
	id: 303,
	code: 'check_child_during_heat',
	title_en: 'Check children during extreme heat',
	title_ar: 'تفقد الأطفال أثناء الحر الشديد',
	instruction_en: 'Pay additional attention to children during extreme heat.',
	instruction_ar: 'أعط اهتماماً إضافياً للأطفال أثناء الحر الشديد.',
	sort_order: 30,
	is_active: true,
};


const checkOfficialUpdatesRule: ActionPlanRule = {
	id: 401,
	code: 'flood_check_official_updates',
	action_id: checkOfficialUpdates.id,
	hazard_id: floodAlert.hazard_id,
	location_id: null,
	linked_task_id: null,
	min_severity: 1,
	base_priority: 90,
	incomplete_task_boost: 0,
	safety_override: 500,
	safety_override_min_severity: 1,
	min_children_count: null,
	min_older_adults_count: null,
	reason_en: 'Current official updates are important during flooding.',
	reason_ar: 'التحديثات الرسمية الحالية مهمة أثناء السيول.',
	sort_order: 10,
	is_active: true,
};


const backupPowerRule: ActionPlanRule = {
	id: 402,
	code: 'flood_prepare_backup_phone_power',
	action_id: prepareBackupPower.id,
	hazard_id: floodAlert.hazard_id,
	location_id: null,
	linked_task_id: BACKUP_POWER_TASK_ID,
	min_severity: 1,
	base_priority: 70,
	incomplete_task_boost: 25,
	safety_override: 0,
	safety_override_min_severity: null,
	min_children_count: null,
	min_older_adults_count: null,
	reason_en: 'Backup phone power supports communication during disruption.',
	reason_ar: 'تدعم طاقة الهاتف الاحتياطية التواصل أثناء الانقطاع.',
	sort_order: 20,
	is_active: true,
};


const heatChildRule: ActionPlanRule = {
	id: 403,
	code: 'heat_check_children',
	action_id: checkChildDuringHeat.id,
	hazard_id: regionalHeatAlert.hazard_id,
	location_id: null,
	linked_task_id: null,
	min_severity: 1,
	base_priority: 100,
	incomplete_task_boost: 0,
	safety_override: 0,
	safety_override_min_severity: null,
	min_children_count: 1,
	min_older_adults_count: null,
	reason_en: 'The saved household includes a child.',
	reason_ar: 'تتضمن الأسرة المحفوظة طفلاً.',
	sort_order: 10,
	is_active: true,
};


const catalogue: AlertsActionCatalogue = {
	alerts: [
		floodAlert,
		regionalHeatAlert,
		nationalWildfireAlert,
		expiredAlert,
		futureAlert,
		officialFloodAlert,
	],

	alertLocations,

	actions: [
		checkOfficialUpdates,
		prepareBackupPower,
		checkChildDuringHeat,
	],

	rules: [
		checkOfficialUpdatesRule,
		backupPowerRule,
		heatChildRule,
	],
};


describe(
	'alert applicability and Action Plan derivation',
	() => {
		test(
			'includes a location-specific alert when its location matches the selected scope',
			() => {
				const alerts =
					getApplicableAlerts({
						catalogue,
						locationScopeIds: [
							JEDDAH_ID,
							MAKKAH_REGION_ID,
						],
						at: AT,
					});


				expect(
					alerts.map(
						(alert) =>
							alert.id,
					),
				).toContain(
					floodAlert.id,
				);
			},
		);


		test(
			'includes a regional alert when an ancestor location is present in the supplied location scope',
			() => {
				const alerts =
					getApplicableAlerts({
						catalogue,
						locationScopeIds: [
							501,
							EASTERN_REGION_ID,
						],
						at: AT,
					});


				expect(
					alerts.map(
						(alert) =>
							alert.id,
					),
				).toContain(
					regionalHeatAlert.id,
				);
			},
		);


		test(
			'excludes a location-specific alert from an unrelated location scope',
			() => {
				const alerts =
					getApplicableAlerts({
						catalogue,
						locationScopeIds: [
							999,
						],
						at: AT,
					});


				expect(
					alerts.map(
						(alert) =>
							alert.id,
					),
				).not.toContain(
					floodAlert.id,
				);
			},
		);


		test(
			'treats an alert with no location relationships as nationally applicable even without a selected location',
			() => {
				const alerts =
					getApplicableAlerts({
						catalogue,
						locationScopeIds: [],
						at: AT,
					});


				expect(
					alerts,
				).toEqual([
					nationalWildfireAlert,
				]);
			},
		);


		test(
			'excludes alerts that have not started or have already expired',
			() => {
				const alerts =
					getApplicableAlerts({
						catalogue,
						locationScopeIds: [
							JEDDAH_ID,
						],
						at: AT,
					});

				const alertIds =
					alerts.map(
						(alert) =>
							alert.id,
					);


				expect(
					alertIds,
				).not.toContain(
					expiredAlert.id,
				);

				expect(
					alertIds,
				).not.toContain(
					futureAlert.id,
				);
			},
		);


		test(
			'uses the explicitly selected Level 1, Level 2 and Level 3 severity for a simulated alert',
			() => {
				const expectations: Array<{
					severity: ActionPlanSeverity;
					expectedScores: number[];
				}> = [
					{
						severity: 1,
						expectedScores: [
							600,
							105,
						],
					},
					{
						severity: 2,
						expectedScores: [
							610,
							115,
						],
					},
					{
						severity: 3,
						expectedScores: [
							620,
							125,
						],
					},
				];


				for (
					const {
						severity,
						expectedScores,
					}
					of expectations
				) {
					const result =
						deriveActionPlanForAlert({
							catalogue,
							alertId:
								floodAlert.id,
							locationScopeIds: [
								JEDDAH_ID,
								MAKKAH_REGION_ID,
							],
							activeLocationId:
								JEDDAH_ID,
							at: AT,
							simulationSeverity:
								severity,
							completedTaskIds: [],
							household: null,
						});


					expect(
						result.effectiveSeverity,
					).toBe(
						severity,
					);

					expect(
						result.items.map(
							(item) =>
								item.score,
						),
					).toEqual(
						expectedScores,
					);
				}
			},
		);


		test(
			'uses the stored severity when a simulated alert has no explicit override',
			() => {
				expect(
					resolveEffectiveAlertSeverity(
						floodAlert,
						null,
					),
				).toBe(
					3,
				);
			},
		);


		test(
			'ignores a simulation override for a non-simulated alert',
			() => {
				expect(
					resolveEffectiveAlertSeverity(
						officialFloodAlert,
						1,
					),
				).toBe(
					2,
				);
			},
		);


		test(
			'passes completed preparedness tasks into the evaluator so a linked action is removed',
			() => {
				const result =
					deriveActionPlanForAlert({
						catalogue,
						alertId:
							floodAlert.id,
						locationScopeIds: [
							JEDDAH_ID,
						],
						activeLocationId:
							JEDDAH_ID,
						at: AT,
						simulationSeverity: 3,
						completedTaskIds: [
							BACKUP_POWER_TASK_ID,
						],
						household: null,
					});


				expect(
					result.items.map(
						(item) =>
							item.action.code,
					),
				).toEqual([
					'check_official_updates',
				]);
			},
		);


		test(
			'passes household context into the evaluator for household-conditioned actions',
			() => {
				const result =
					deriveActionPlanForAlert({
						catalogue,
						alertId:
							regionalHeatAlert.id,
						locationScopeIds: [
							501,
							EASTERN_REGION_ID,
						],
						activeLocationId: 501,
						at: AT,
						simulationSeverity: 3,
						completedTaskIds: [],
						household: {
							childrenCount: 1,
							olderAdultsCount: 0,
						},
					});


				expect(
					result.items.map(
						(item) =>
							item.action.code,
					),
				).toEqual([
					'check_child_during_heat',
				]);

				expect(
					result.items[0].rule.reason_en,
				).toBe(
					'The saved household includes a child.',
				);
			},
		);


		test(
			'rejects an alert ID that is absent from the loaded catalogue',
			() => {
				expect(
					() =>
						deriveActionPlanForAlert({
							catalogue,
							alertId: 99999,
							locationScopeIds: [
								JEDDAH_ID,
							],
							activeLocationId:
								JEDDAH_ID,
							at: AT,
							simulationSeverity: 3,
							completedTaskIds: [],
							household: null,
						}),
				).toThrow(
					'Alert 99999 is not present in the loaded alert/action catalogue.',
				);
			},
		);


		test(
			'rejects a known alert when it is not applicable to the current location and time',
			() => {
				expect(
					() =>
						deriveActionPlanForAlert({
							catalogue,
							alertId:
								floodAlert.id,
							locationScopeIds: [
								999,
							],
							activeLocationId: 999,
							at: AT,
							simulationSeverity: 3,
							completedTaskIds: [],
							household: null,
						}),
				).toThrow(
					`Alert ${floodAlert.id} is not applicable to the current location and time.`,
				);
			},
		);


		test(
			'rejects an invalid runtime simulation severity',
			() => {
				expect(
					() =>
						resolveEffectiveAlertSeverity(
							floodAlert,
							4 as ActionPlanSeverity,
						),
				).toThrow(
					'Simulation severity must be 1, 2 or 3.',
				);
			},
		);


		test(
			'derives alerts and Action Plans without mutating the canonical catalogue',
			() => {
				const before =
					JSON.stringify(
						catalogue,
					);


				getApplicableAlerts({
					catalogue,
					locationScopeIds: [
						JEDDAH_ID,
						MAKKAH_REGION_ID,
					],
					at: AT,
				});

				deriveActionPlanForAlert({
					catalogue,
					alertId:
						floodAlert.id,
					locationScopeIds: [
						JEDDAH_ID,
						MAKKAH_REGION_ID,
					],
					activeLocationId:
						JEDDAH_ID,
					at: AT,
					simulationSeverity: 2,
					completedTaskIds: [],
					household: null,
				});


				expect(
					JSON.stringify(
						catalogue,
					),
				).toBe(
					before,
				);
			},
		);
	},
);