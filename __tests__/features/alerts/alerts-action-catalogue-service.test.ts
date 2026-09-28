/// <reference types="jest" />

jest.mock(
	'@/lib/supabase-config',
	() => ({
		supabaseClient: {
			from: jest.fn(),
		},
	}),
);


import {
	supabaseClient,
} from '@/lib/supabase-config';

import {
	loadActiveActionRules,
	loadActiveActions,
	loadAlertLocations,
	loadAlertsActionCatalogue,
	loadPublishedAlerts,
} from '@/features/alerts/alerts-action-catalogue-service';

import type {
	AlertsActionAlert,
	AlertsActionLocation,
} from '@/features/alerts/alerts-action-catalogue-service';

import type {
	ActionPlanAction,
	ActionPlanRule,
} from '@/features/alerts/action-plan-types';


type MockQueryResult<T> = {
	data: T[] | null;
	error: {
		message: string;
	} | null;
};


type MockQueryBuilder<T> = {
	select: jest.Mock;
	eq: jest.Mock;
	order: jest.Mock;
	then: (
		onFulfilled?: (
			value: MockQueryResult<T>,
		) => unknown,
		onRejected?: (
			reason: unknown,
		) => unknown,
	) => Promise<unknown>;
};


function createQueryBuilder<T>(
	result: MockQueryResult<T>,
): MockQueryBuilder<T> {
	const builder = {
		select: jest.fn(),
		eq: jest.fn(),
		order: jest.fn(),
		then: (
			onFulfilled?: (
				value: MockQueryResult<T>,
			) => unknown,
			onRejected?: (
				reason: unknown,
			) => unknown,
		) =>
			Promise.resolve(
				result,
			).then(
				onFulfilled,
				onRejected,
			),
	} as MockQueryBuilder<T>;


	builder.select.mockReturnValue(
		builder,
	);

	builder.eq.mockReturnValue(
		builder,
	);

	builder.order.mockReturnValue(
		builder,
	);


	return builder;
}


const alertRows: AlertsActionAlert[] = [
	{
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
		starts_at: '2041-01-01T00:00:00.000Z',
		published_at: '2041-01-01T00:00:00.000Z',
		expires_at: '2099-12-31T23:59:59.000Z',
		publication_status: 'published',
		sort_order: 10,
	},
];


const alertLocationRows: AlertsActionLocation[] = [
	{
		alert_id: 101,
		location_id: 201,
	},
];


const actionRows: ActionPlanAction[] = [
	{
		id: 301,
		code: 'follow_official_directions',
		title_en: 'Follow official directions',
		title_ar: 'اتبع التوجيهات الرسمية',
		instruction_en: 'Follow current official safety directions.',
		instruction_ar: 'اتبع توجيهات السلامة الرسمية الحالية.',
		sort_order: 10,
		is_active: true,
	},
];


const ruleRows: ActionPlanRule[] = [
	{
		id: 401,
		code: 'flood_follow_official_directions',
		action_id: 301,
		hazard_id: 11,
		location_id: null,
		linked_task_id: null,
		min_severity: 3,
		base_priority: 130,
		incomplete_task_boost: 0,
		safety_override: 1000,
		safety_override_min_severity: 3,
		min_children_count: null,
		min_older_adults_count: null,
		reason_en: 'Official directions receive the highest priority.',
		reason_ar: 'تحظى التوجيهات الرسمية بالأولوية القصوى.',
		sort_order: 10,
		is_active: true,
	},
];


const fromMock =
	supabaseClient.from as unknown as jest.Mock;


beforeEach(() => {
	jest.clearAllMocks();
});


describe(
	'alerts action catalogue service',
	() => {
		test(
			'loads published alerts using explicit app-facing columns and deterministic ordering',
			async () => {
				const query =
					createQueryBuilder<AlertsActionAlert>({
						data: alertRows,
						error: null,
					});

				fromMock.mockReturnValueOnce(
					query,
				);


				await expect(
					loadPublishedAlerts(),
				).resolves.toEqual(
					alertRows,
				);


				expect(
					fromMock,
				).toHaveBeenCalledWith(
					'alerts',
				);


				const selectedColumns =
					query.select.mock.calls[0][0] as string;

				expect(
					selectedColumns,
				).not.toContain(
					'*',
				);

				for (
					const requiredColumn of [
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
					]
				) {
					expect(
						selectedColumns,
					).toContain(
						requiredColumn,
					);
				}


				expect(
					query.eq,
				).toHaveBeenCalledWith(
					'publication_status',
					'published',
				);

				expect(
					query.order.mock.calls,
				).toEqual([
					[
						'sort_order',
						{
							ascending: true,
						},
					],
					[
						'id',
						{
							ascending: true,
						},
					],
				]);
			},
		);


		test(
			'loads alert-location relationships without broad select-star access',
			async () => {
				const query =
					createQueryBuilder<AlertsActionLocation>({
						data: alertLocationRows,
						error: null,
					});

				fromMock.mockReturnValueOnce(
					query,
				);


				await expect(
					loadAlertLocations(),
				).resolves.toEqual(
					alertLocationRows,
				);


				expect(
					fromMock,
				).toHaveBeenCalledWith(
					'alert_locations',
				);

				const selectedColumns =
					query.select.mock.calls[0][0] as string;

				expect(
					selectedColumns,
				).not.toContain(
					'*',
				);

				expect(
					selectedColumns,
				).toContain(
					'alert_id',
				);

				expect(
					selectedColumns,
				).toContain(
					'location_id',
				);

				expect(
					query.order.mock.calls,
				).toEqual([
					[
						'alert_id',
						{
							ascending: true,
						},
					],
					[
						'location_id',
						{
							ascending: true,
						},
					],
				]);
			},
		);


		test(
			'loads active reusable actions in deterministic order',
			async () => {
				const query =
					createQueryBuilder<ActionPlanAction>({
						data: actionRows,
						error: null,
					});

				fromMock.mockReturnValueOnce(
					query,
				);


				await expect(
					loadActiveActions(),
				).resolves.toEqual(
					actionRows,
				);


				expect(
					fromMock,
				).toHaveBeenCalledWith(
					'actions',
				);

				expect(
					query.eq,
				).toHaveBeenCalledWith(
					'is_active',
					true,
				);

				expect(
					query.order.mock.calls,
				).toEqual([
					[
						'sort_order',
						{
							ascending: true,
						},
					],
					[
						'id',
						{
							ascending: true,
						},
					],
				]);
			},
		);


		test(
			'loads active deterministic rules with all evaluator inputs',
			async () => {
				const query =
					createQueryBuilder<ActionPlanRule>({
						data: ruleRows,
						error: null,
					});

				fromMock.mockReturnValueOnce(
					query,
				);


				await expect(
					loadActiveActionRules(),
				).resolves.toEqual(
					ruleRows,
				);


				expect(
					fromMock,
				).toHaveBeenCalledWith(
					'action_rules',
				);

				const selectedColumns =
					query.select.mock.calls[0][0] as string;

				for (
					const requiredColumn of [
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
					]
				) {
					expect(
						selectedColumns,
					).toContain(
						requiredColumn,
					);
				}

				expect(
					query.eq,
				).toHaveBeenCalledWith(
					'is_active',
					true,
				);

				expect(
					query.order.mock.calls,
				).toEqual([
					[
						'hazard_id',
						{
							ascending: true,
						},
					],
					[
						'sort_order',
						{
							ascending: true,
						},
					],
					[
						'id',
						{
							ascending: true,
						},
					],
				]);
			},
		);


		test(
			'loads all four public datasets as one coherent catalogue',
			async () => {
				const alertQuery =
					createQueryBuilder<AlertsActionAlert>({
						data: alertRows,
						error: null,
					});

				const alertLocationQuery =
					createQueryBuilder<AlertsActionLocation>({
						data: alertLocationRows,
						error: null,
					});

				const actionQuery =
					createQueryBuilder<ActionPlanAction>({
						data: actionRows,
						error: null,
					});

				const ruleQuery =
					createQueryBuilder<ActionPlanRule>({
						data: ruleRows,
						error: null,
					});


				fromMock.mockImplementation(
					(
						tableName: string,
					) => {
						switch (
							tableName
						) {
							case 'alerts':
								return alertQuery;

							case 'alert_locations':
								return alertLocationQuery;

							case 'actions':
								return actionQuery;

							case 'action_rules':
								return ruleQuery;

							default:
								throw new Error(
									`Unexpected table: ${tableName}`,
								);
						}
					},
				);


				await expect(
					loadAlertsActionCatalogue(),
				).resolves.toEqual({
					alerts: alertRows,
					alertLocations: alertLocationRows,
					actions: actionRows,
					rules: ruleRows,
				});

				expect(
					fromMock,
				).toHaveBeenCalledTimes(
					4,
				);
			},
		);


		test(
			'normalises null table results to empty catalogue arrays',
			async () => {
				fromMock.mockImplementation(
					() =>
						createQueryBuilder({
							data: null,
							error: null,
						}),
				);


				await expect(
					loadAlertsActionCatalogue(),
				).resolves.toEqual({
					alerts: [],
					alertLocations: [],
					actions: [],
					rules: [],
				});
			},
		);


		test(
			'surfaces alert query failure with feature-specific context',
			async () => {
				fromMock.mockReturnValueOnce(
					createQueryBuilder<AlertsActionAlert>({
						data: null,
						error: {
							message:
								'alert read failed',
						},
					}),
				);


				await expect(
					loadPublishedAlerts(),
				).rejects.toThrow(
					'Unable to load published alerts: alert read failed',
				);
			},
		);
	},
);