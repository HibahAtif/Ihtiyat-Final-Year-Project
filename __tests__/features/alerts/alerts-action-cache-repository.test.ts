/// <reference types="jest" />

jest.mock(
	'@/storage/ihtiyat-database',
	() => ({
		getIhtiyatDatabase: jest.fn(),
	}),
);


import {
	getIhtiyatDatabase,
} from '@/storage/ihtiyat-database';

import {
	loadAlertsActionCache,
	saveAlertsActionCache,
} from '@/features/alerts/alerts-action-cache-repository';

import type {
	AlertsActionCacheSnapshot,
	CachedAlert,
	CachedAlertLocation,
} from '@/features/alerts/alerts-action-cache-repository';

import type {
	ActionPlanAction,
	ActionPlanRule,
} from '@/features/alerts/action-plan-types';


const getIhtiyatDatabaseMock =
	getIhtiyatDatabase as jest.MockedFunction<
		typeof getIhtiyatDatabase
	>;


const CACHED_AT =
	'2042-01-15T12:00:00.000Z';


const floodAlert: CachedAlert = {
	id: 101,
	code: 'sim_flood_jeddah_severe',
	hazard_id: 11,
	origin_type: 'simulated',
	external_alert_id: null,
	severity: 3,
	title_en: '[SIMULATION] Severe flood scenario',
	title_ar: '[محاكاة] سيناريو سيول شديدة',
	message_en: 'Severe flood conditions are being simulated.',
	message_ar: 'تتم محاكاة ظروف سيول شديدة.',
	starts_at: '2041-01-01T00:00:00.000Z',
	published_at: '2041-01-01T00:00:00.000Z',
	expires_at: '2099-12-31T23:59:59.000Z',
	publication_status: 'published',
	sort_order: 10,
};


const floodAlertLocation: CachedAlertLocation = {
	alert_id: floodAlert.id,
	location_id: 201,
};


const followOfficialDirections: ActionPlanAction = {
	id: 301,
	code: 'follow_official_directions',
	title_en: 'Follow official directions',
	title_ar: 'اتبع التوجيهات الرسمية',
	instruction_en: 'Follow current official safety directions.',
	instruction_ar: 'اتبع توجيهات السلامة الرسمية الحالية.',
	sort_order: 10,
	is_active: true,
};


const floodFollowOfficialDirections: ActionPlanRule = {
	id: 401,
	code: 'flood_follow_official_directions',
	action_id: followOfficialDirections.id,
	hazard_id: floodAlert.hazard_id,
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
};


const populatedSnapshot: AlertsActionCacheSnapshot = {
	alerts: [
		floodAlert,
	],
	alertLocations: [
		floodAlertLocation,
	],
	actions: [
		followOfficialDirections,
	],
	rules: [
		floodFollowOfficialDirections,
	],
};


type MockRunResult = {
	changes: number;
	lastInsertRowId: number;
};


type MockTransaction = {
	runAsync: jest.Mock<
		Promise<MockRunResult>
	>;
};


function createDatabaseMock() {
	const transaction: MockTransaction = {
		runAsync: jest.fn()
			.mockResolvedValue({
				changes: 1,
				lastInsertRowId: 0,
			}),
	};

	const database = {
		withExclusiveTransactionAsync: jest.fn(
			async (
				callback: (
					transaction: MockTransaction,
				) => Promise<void>,
			): Promise<void> => {
				await callback(transaction);
			},
		),

		getFirstAsync: jest.fn(),
		getAllAsync: jest.fn(),
	};

	return {
		database,
		transaction,
	};
}


describe(
	'alerts action cache repository',
	() => {
		beforeEach(() => {
			jest.clearAllMocks();
		});


		test(
			'atomically replaces the complete public alert/action snapshot and records metadata',
			async () => {
				const {
					database,
					transaction,
				} = createDatabaseMock();

				getIhtiyatDatabaseMock.mockResolvedValue(
					database as unknown as Awaited<
						ReturnType<typeof getIhtiyatDatabase>
					>,
				);


				await saveAlertsActionCache(
					populatedSnapshot,
					CACHED_AT,
				);


				expect(
					database.withExclusiveTransactionAsync,
				).toHaveBeenCalledTimes(1);

				expect(
					transaction.runAsync,
				).toHaveBeenCalledTimes(9);


				/*
				 * Child rows are removed before their parent rows so SQLite
				 * foreign-key enforcement remains valid during replacement.
				 */
				expect(
					transaction.runAsync.mock.calls[0][0],
				).toContain(
					'DELETE FROM action_rule_cache',
				);

				expect(
					transaction.runAsync.mock.calls[1][0],
				).toContain(
					'DELETE FROM action_cache',
				);

				expect(
					transaction.runAsync.mock.calls[2][0],
				).toContain(
					'DELETE FROM alert_location_cache',
				);

				expect(
					transaction.runAsync.mock.calls[3][0],
				).toContain(
					'DELETE FROM alert_cache',
				);


				expect(
					transaction.runAsync.mock.calls[4],
				).toEqual([
					expect.stringContaining(
						'INSERT INTO alert_cache',
					),
					101,
					'sim_flood_jeddah_severe',
					11,
					'simulated',
					null,
					3,
					'[SIMULATION] Severe flood scenario',
					'[محاكاة] سيناريو سيول شديدة',
					'Severe flood conditions are being simulated.',
					'تتم محاكاة ظروف سيول شديدة.',
					'2041-01-01T00:00:00.000Z',
					'2041-01-01T00:00:00.000Z',
					'2099-12-31T23:59:59.000Z',
					'published',
					10,
				]);


				expect(
					transaction.runAsync.mock.calls[5],
				).toEqual([
					expect.stringContaining(
						'INSERT INTO alert_location_cache',
					),
					101,
					201,
				]);


				expect(
					transaction.runAsync.mock.calls[6],
				).toEqual([
					expect.stringContaining(
						'INSERT INTO action_cache',
					),
					301,
					'follow_official_directions',
					'Follow official directions',
					'اتبع التوجيهات الرسمية',
					'Follow current official safety directions.',
					'اتبع توجيهات السلامة الرسمية الحالية.',
					10,
					1,
				]);


				expect(
					transaction.runAsync.mock.calls[7],
				).toEqual([
					expect.stringContaining(
						'INSERT INTO action_rule_cache',
					),
					401,
					'flood_follow_official_directions',
					301,
					11,
					null,
					null,
					3,
					130,
					0,
					1000,
					3,
					null,
					null,
					'Official directions receive the highest priority.',
					'تحظى التوجيهات الرسمية بالأولوية القصوى.',
					10,
					1,
				]);


				expect(
					transaction.runAsync.mock.calls[8],
				).toEqual([
					expect.stringContaining(
						'alert_action_cache_metadata',
					),
					'alerts.actions.catalogue',
					CACHED_AT,
				]);
			},
		);


		test(
			'records metadata for a successfully cached empty snapshot',
			async () => {
				const {
					database,
					transaction,
				} = createDatabaseMock();

				getIhtiyatDatabaseMock.mockResolvedValue(
					database as unknown as Awaited<
						ReturnType<typeof getIhtiyatDatabase>
					>,
				);


				await saveAlertsActionCache(
					{
						alerts: [],
						alertLocations: [],
						actions: [],
						rules: [],
					},
					CACHED_AT,
				);


				/*
				 * Four deletes plus metadata. No catalogue inserts are needed.
				 */
				expect(
					transaction.runAsync,
				).toHaveBeenCalledTimes(5);

				expect(
					transaction.runAsync.mock.calls[4],
				).toEqual([
					expect.stringContaining(
						'alert_action_cache_metadata',
					),
					'alerts.actions.catalogue',
					CACHED_AT,
				]);
			},
		);


		test(
			'returns null when no successful alert/action snapshot has ever been cached',
			async () => {
				const {
					database,
				} = createDatabaseMock();

				database.getFirstAsync.mockResolvedValue(
					null,
				);

				getIhtiyatDatabaseMock.mockResolvedValue(
					database as unknown as Awaited<
						ReturnType<typeof getIhtiyatDatabase>
					>,
				);


				await expect(
					loadAlertsActionCache(),
				).resolves.toBeNull();

				expect(
					database.getAllAsync,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'preserves a successfully cached empty snapshot as four empty arrays',
			async () => {
				const {
					database,
				} = createDatabaseMock();

				database.getFirstAsync.mockResolvedValue({
					cached_at: CACHED_AT,
				});

				database.getAllAsync
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([]);

				getIhtiyatDatabaseMock.mockResolvedValue(
					database as unknown as Awaited<
						ReturnType<typeof getIhtiyatDatabase>
					>,
				);


				await expect(
					loadAlertsActionCache(),
				).resolves.toEqual({
					alerts: [],
					alertLocations: [],
					actions: [],
					rules: [],
				});
			},
		);


		test(
			'loads one coherent snapshot and restores SQLite booleans to application booleans',
			async () => {
				const {
					database,
				} = createDatabaseMock();

				database.getFirstAsync.mockResolvedValue({
					cached_at: CACHED_AT,
				});

				database.getAllAsync
					.mockResolvedValueOnce([
						floodAlert,
					])
					.mockResolvedValueOnce([
						floodAlertLocation,
					])
					.mockResolvedValueOnce([
						{
							...followOfficialDirections,
							is_active: 1,
						},
					])
					.mockResolvedValueOnce([
						{
							...floodFollowOfficialDirections,
							is_active: 1,
						},
					]);

				getIhtiyatDatabaseMock.mockResolvedValue(
					database as unknown as Awaited<
						ReturnType<typeof getIhtiyatDatabase>
					>,
				);


				await expect(
					loadAlertsActionCache(),
				).resolves.toEqual(
					populatedSnapshot,
				);


				expect(
					database.getAllAsync.mock.calls[0][0],
				).toContain(
					'FROM alert_cache',
				);

				expect(
					database.getAllAsync.mock.calls[1][0],
				).toContain(
					'FROM alert_location_cache',
				);

				expect(
					database.getAllAsync.mock.calls[2][0],
				).toContain(
					'FROM action_cache',
				);

				expect(
					database.getAllAsync.mock.calls[3][0],
				).toContain(
					'FROM action_rule_cache',
				);
			},
		);
	},
);