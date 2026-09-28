/// <reference types="jest" />


jest.mock(
	'@/lib/supabase-config',
	() => ({
		supabaseClient: {
			from: jest.fn(),
		},
	}),
);


jest.mock(
	'@/features/alerts/alerts-action-cache-repository',
	() => ({
		saveAlertsActionCache:
			jest.fn(),

		loadAlertsActionCache:
			jest.fn(),
	}),
);


import {
	loadAlertsActionFeature,
} from '@/features/alerts/alerts-action-feature-loader';

import type {
	AlertsActionFeatureDependencies,
} from '@/features/alerts/alerts-action-feature-loader';

import type {
	AlertsActionCatalogue,
} from '@/features/alerts/alerts-action-catalogue-service';

import type {
	AlertsActionCacheSnapshot,
} from '@/features/alerts/alerts-action-cache-repository';


const remoteCatalogue:
	AlertsActionCatalogue = {
		alerts: [
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
		],

		alertLocations: [
			{
				alert_id: 101,
				location_id: 201,
			},
		],

		actions: [
			{
				id: 301,
				code: 'follow_official_directions',
				title_en: 'Follow official directions',
				title_ar: 'اتبع التوجيهات الرسمية',
				instruction_en:
					'Follow current official safety directions.',
				instruction_ar:
					'اتبع توجيهات السلامة الرسمية الحالية.',
				sort_order: 10,
				is_active: true,
			},
		],

		rules: [
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
				reason_en:
					'Official directions receive the highest priority.',
				reason_ar:
					'تحظى التوجيهات الرسمية بالأولوية القصوى.',
				sort_order: 10,
				is_active: true,
			},
		],
	};


const cachedCatalogue:
	AlertsActionCacheSnapshot = {
	alerts: [
		{
			...remoteCatalogue.alerts[0],
			code:
				'sim_flood_jeddah_cached',
		},
	],
	alertLocations:
		remoteCatalogue.alertLocations,
	actions:
		remoteCatalogue.actions,
	rules:
		remoteCatalogue.rules,
};


const emptyCatalogue:
	AlertsActionCacheSnapshot = {
	alerts: [],
	alertLocations: [],
	actions: [],
	rules: [],
};


function createDependencies() {
	const loadAlertsActionCatalogue =
		jest.fn()
			.mockResolvedValue(
				remoteCatalogue,
			);

	const saveAlertsActionCache =
		jest.fn()
			.mockResolvedValue(
				undefined,
			);

	const loadAlertsActionCache =
		jest.fn()
			.mockResolvedValue(
				null,
			);


	const dependencies:
		AlertsActionFeatureDependencies = {
		loadAlertsActionCatalogue,
		saveAlertsActionCache,
		loadAlertsActionCache,
	};


	return {
		dependencies,
		loadAlertsActionCatalogue,
		saveAlertsActionCache,
		loadAlertsActionCache,
	};
}


describe(
	'alerts action online-first feature loader',
	() => {
		beforeEach(() => {
			jest.clearAllMocks();
		});


		test(
			'returns fresh remote catalogue and persists it for later offline use',
			async () => {
				const {
					dependencies,
					loadAlertsActionCatalogue,
					saveAlertsActionCache,
					loadAlertsActionCache,
				} =
					createDependencies();


				await expect(
					loadAlertsActionFeature(
						dependencies,
					),
				).resolves.toEqual({
					catalogue:
						remoteCatalogue,
					source:
						'remote',
				});


				expect(
					loadAlertsActionCatalogue,
				).toHaveBeenCalledTimes(
					1,
				);

				expect(
					saveAlertsActionCache,
				).toHaveBeenCalledWith(
					remoteCatalogue,
				);

				expect(
					loadAlertsActionCache,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'preserves a successful remote empty catalogue and caches it as a valid snapshot',
			async () => {
				const {
					dependencies,
					loadAlertsActionCatalogue,
					saveAlertsActionCache,
				} =
					createDependencies();


				loadAlertsActionCatalogue
					.mockResolvedValue(
						{
							alerts: [],
							alertLocations: [],
							actions: [],
							rules: [],
						},
					);


				await expect(
					loadAlertsActionFeature(
						dependencies,
					),
				).resolves.toEqual({
					catalogue:
						emptyCatalogue,
					source:
						'remote',
				});


				expect(
					saveAlertsActionCache,
				).toHaveBeenCalledWith(
					emptyCatalogue,
				);
			},
		);


		test(
			'keeps fresh remote data usable when SQLite cache persistence fails',
			async () => {
				const {
					dependencies,
					saveAlertsActionCache,
					loadAlertsActionCache,
				} =
					createDependencies();


				saveAlertsActionCache
					.mockRejectedValue(
						new Error(
							'cache write failed',
						),
					);


				await expect(
					loadAlertsActionFeature(
						dependencies,
					),
				).resolves.toEqual({
					catalogue:
						remoteCatalogue,
					source:
						'remote',
				});


				expect(
					loadAlertsActionCache,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'falls back to the last coherent SQLite snapshot when the remote catalogue fails',
			async () => {
				const {
					dependencies,
					loadAlertsActionCatalogue,
					loadAlertsActionCache,
					saveAlertsActionCache,
				} =
					createDependencies();


				loadAlertsActionCatalogue
					.mockRejectedValue(
						new Error(
							'network unavailable',
						),
					);

				loadAlertsActionCache
					.mockResolvedValue(
						cachedCatalogue,
					);


				await expect(
					loadAlertsActionFeature(
						dependencies,
					),
				).resolves.toEqual({
					catalogue:
						cachedCatalogue,
					source:
						'cache',
				});


				expect(
					loadAlertsActionCache,
				).toHaveBeenCalledTimes(
					1,
				);

				expect(
					saveAlertsActionCache,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'preserves a cached empty snapshot as valid offline data',
			async () => {
				const {
					dependencies,
					loadAlertsActionCatalogue,
					loadAlertsActionCache,
				} =
					createDependencies();


				loadAlertsActionCatalogue
					.mockRejectedValue(
						new Error(
							'offline',
						),
					);

				loadAlertsActionCache
					.mockResolvedValue(
						emptyCatalogue,
					);


				await expect(
					loadAlertsActionFeature(
						dependencies,
					),
				).resolves.toEqual({
					catalogue:
						emptyCatalogue,
					source:
						'cache',
				});
			},
		);


		test(
			'rethrows the original remote failure when no successful cache exists',
			async () => {
				const onlineError =
					new Error(
						'catalogue unavailable',
					);

				const {
					dependencies,
					loadAlertsActionCatalogue,
					loadAlertsActionCache,
				} =
					createDependencies();


				loadAlertsActionCatalogue
					.mockRejectedValue(
						onlineError,
					);

				loadAlertsActionCache
					.mockResolvedValue(
						null,
					);


				await expect(
					loadAlertsActionFeature(
						dependencies,
					),
				).rejects.toBe(
					onlineError,
				);
			},
		);


		test(
			'rethrows the original remote failure when cache recovery itself cannot be read',
			async () => {
				const onlineError =
					new Error(
						'network unavailable',
					);

				const {
					dependencies,
					loadAlertsActionCatalogue,
					loadAlertsActionCache,
				} =
					createDependencies();


				loadAlertsActionCatalogue
					.mockRejectedValue(
						onlineError,
					);

				loadAlertsActionCache
					.mockRejectedValue(
						new Error(
							'SQLite read failed',
						),
					);


				await expect(
					loadAlertsActionFeature(
						dependencies,
					),
				).rejects.toBe(
					onlineError,
				);
			},
		);
	},
);