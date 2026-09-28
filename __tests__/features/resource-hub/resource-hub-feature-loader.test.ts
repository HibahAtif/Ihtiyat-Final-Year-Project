/// <reference types="jest" />

jest.mock(
	'@/features/resource-hub/resource-hub-service',
	() => ({
		loadResourceHubCatalogue: jest.fn(),
	}),
);

jest.mock(
	'@/features/resource-hub/resource-hub-cache-repository',
	() => ({
		saveResourceHubCatalogueCache: jest.fn(),
		loadResourceHubCatalogueCache: jest.fn(),
	}),
);


import {
	loadResourceHubFeature,
} from '@/features/resource-hub/resource-hub-feature-loader';

import type {
	ResourceHubFeatureDependencies,
} from '@/features/resource-hub/resource-hub-feature-loader';

import type {
	ResourceHubCatalogue,
} from '@/features/resource-hub/resource-hub-types';


const remoteCatalogue: ResourceHubCatalogue = {
	topics: [
		{
			id: 1,
			code: 'first_aid',
			name_en: 'First Aid',
			name_ar: 'الإسعافات الأولية',
			description_en: 'Reviewed first-aid guidance.',
			description_ar: 'إرشادات إسعافات أولية تمت مراجعتها.',
			sort_order: 10,
			is_active: true,
		},
	],

	resources: [
		{
			id: 101,
			code: 'first_aid_kit_basics',
			title_en: 'First aid kit basics',
			title_ar: 'أساسيات حقيبة الإسعافات الأولية',
			summary_en: 'Prepare essential first-aid supplies.',
			summary_ar: 'جهّز مستلزمات الإسعافات الأولية الأساسية.',
			content_en: 'Reviewed English guidance.',
			content_ar: 'إرشادات عربية تمت مراجعتها.',
			publication_status: 'published',
			sort_order: 10,
			last_reviewed_on: '2026-09-22',
			published_at: '2026-09-22T00:00:00+00:00',
		},
	],

	sources: [
		{
			id: 201,
			resource_id: 101,
			publisher_name_en: 'Saudi Red Crescent Authority',
			publisher_name_ar: 'هيئة الهلال الأحمر السعودي',
			source_title_en: 'First aid guidance',
			source_title_ar: 'إرشادات الإسعافات الأولية',
			source_url: 'https://example.gov.sa/first-aid',
			source_language_code: 'ar',
			is_official: true,
			last_checked_on: '2026-09-22',
			sort_order: 10,
			is_active: true,
		},
	],

	topicLinks: [
		{
			resource_id: 101,
			topic_id: 1,
			is_primary: true,
			sort_order: 10,
		},
	],

	hazardLinks: [
		{
			resource_id: 101,
			hazard_id: 11,
		},
	],

	locationLinks: [],

	missionTaskLinks: [
		{
			task_id: 1,
			resource_id: 101,
			link_role: 'primary',
			sort_order: 10,
		},
	],

	quizQuestionLinks: [
		{
			question_id: 1,
			resource_id: 101,
			link_role: 'supporting',
			sort_order: 10,
		},
	],
};


const cachedCatalogue: ResourceHubCatalogue = {
	...remoteCatalogue,

	resources: [
		{
			...remoteCatalogue.resources[0],
			code: 'cached_first_aid_kit_basics',
		},
	],
};


const emptyCatalogue: ResourceHubCatalogue = {
	topics: [],
	resources: [],
	sources: [],
	topicLinks: [],
	hazardLinks: [],
	locationLinks: [],
	missionTaskLinks: [],
	quizQuestionLinks: [],
};


function createDependencies() {
	const loadResourceHubCatalogue =
		jest.fn().mockResolvedValue(
			remoteCatalogue,
		);

	const saveResourceHubCatalogueCache =
		jest.fn().mockResolvedValue(
			undefined,
		);

	const loadResourceHubCatalogueCache =
		jest.fn().mockResolvedValue(
			null,
		);

	const dependencies:
		ResourceHubFeatureDependencies = {
			loadResourceHubCatalogue,
			saveResourceHubCatalogueCache,
			loadResourceHubCatalogueCache,
		};

	return {
		dependencies,
		loadResourceHubCatalogue,
		saveResourceHubCatalogueCache,
		loadResourceHubCatalogueCache,
	};
}


describe(
	'Resource Hub online-first feature loader',
	() => {
		beforeEach(() => {
			jest.clearAllMocks();
		});


		test(
			'returns fresh remote catalogue and persists it for later offline use',
			async () => {
				const {
					dependencies,
					loadResourceHubCatalogue,
					saveResourceHubCatalogueCache,
					loadResourceHubCatalogueCache,
				} = createDependencies();

				await expect(
					loadResourceHubFeature(
						dependencies,
					),
				).resolves.toEqual({
					catalogue: remoteCatalogue,
					source: 'remote',
				});

				expect(
					loadResourceHubCatalogue,
				).toHaveBeenCalledTimes(1);

				expect(
					saveResourceHubCatalogueCache,
				).toHaveBeenCalledWith(
					remoteCatalogue,
				);

				expect(
					loadResourceHubCatalogueCache,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'preserves a successful remote empty catalogue and caches it as a valid snapshot',
			async () => {
				const {
					dependencies,
					loadResourceHubCatalogue,
					saveResourceHubCatalogueCache,
				} = createDependencies();

				loadResourceHubCatalogue.mockResolvedValue(
					emptyCatalogue,
				);

				await expect(
					loadResourceHubFeature(
						dependencies,
					),
				).resolves.toEqual({
					catalogue: emptyCatalogue,
					source: 'remote',
				});

				expect(
					saveResourceHubCatalogueCache,
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
					saveResourceHubCatalogueCache,
					loadResourceHubCatalogueCache,
				} = createDependencies();

				saveResourceHubCatalogueCache.mockRejectedValue(
					new Error(
						'SQLite write failed',
					),
				);

				await expect(
					loadResourceHubFeature(
						dependencies,
					),
				).resolves.toEqual({
					catalogue: remoteCatalogue,
					source: 'remote',
				});

				expect(
					loadResourceHubCatalogueCache,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'falls back to the last coherent SQLite snapshot when the remote catalogue fails',
			async () => {
				const {
					dependencies,
					loadResourceHubCatalogue,
					saveResourceHubCatalogueCache,
					loadResourceHubCatalogueCache,
				} = createDependencies();

				loadResourceHubCatalogue.mockRejectedValue(
					new Error(
						'network unavailable',
					),
				);

				loadResourceHubCatalogueCache.mockResolvedValue(
					cachedCatalogue,
				);

				await expect(
					loadResourceHubFeature(
						dependencies,
					),
				).resolves.toEqual({
					catalogue: cachedCatalogue,
					source: 'cache',
				});

				expect(
					loadResourceHubCatalogueCache,
				).toHaveBeenCalledTimes(1);

				expect(
					saveResourceHubCatalogueCache,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'preserves a cached empty snapshot as valid offline Resource Hub data',
			async () => {
				const {
					dependencies,
					loadResourceHubCatalogue,
					loadResourceHubCatalogueCache,
				} = createDependencies();

				loadResourceHubCatalogue.mockRejectedValue(
					new Error(
						'offline',
					),
				);

				loadResourceHubCatalogueCache.mockResolvedValue(
					emptyCatalogue,
				);

				await expect(
					loadResourceHubFeature(
						dependencies,
					),
				).resolves.toEqual({
					catalogue: emptyCatalogue,
					source: 'cache',
				});
			},
		);


		test(
			'rethrows the original remote failure when no successful cache exists',
			async () => {
				const {
					dependencies,
					loadResourceHubCatalogue,
					loadResourceHubCatalogueCache,
				} = createDependencies();

				const remoteError =
					new Error(
						'Resource Hub unavailable',
					);

				loadResourceHubCatalogue.mockRejectedValue(
					remoteError,
				);

				loadResourceHubCatalogueCache.mockResolvedValue(
					null,
				);

				await expect(
					loadResourceHubFeature(
						dependencies,
					),
				).rejects.toBe(
					remoteError,
				);
			},
		);


		test(
			'preserves the original remote failure when the fallback cache cannot be read',
			async () => {
				const {
					dependencies,
					loadResourceHubCatalogue,
					loadResourceHubCatalogueCache,
				} = createDependencies();

				const remoteError =
					new Error(
						'Remote Resource Hub load failed',
					);

				loadResourceHubCatalogue.mockRejectedValue(
					remoteError,
				);

				loadResourceHubCatalogueCache.mockRejectedValue(
					new Error(
						'SQLite read failed',
					),
				);

				await expect(
					loadResourceHubFeature(
						dependencies,
					),
				).rejects.toBe(
					remoteError,
				);
			},
		);
	},
);