/// <reference types="jest" />


jest.mock('@/storage/ihtiyat-database', () => ({
	getIhtiyatDatabase: jest.fn(),
}));


import { getIhtiyatDatabase } from '@/storage/ihtiyat-database';

import {
	loadResourceHubCatalogueCache,
	saveResourceHubCatalogueCache,
} from '@/features/resource-hub/resource-hub-cache-repository';

import type {
	ResourceHubCatalogue,
} from '@/features/resource-hub/resource-hub-types';


const getIhtiyatDatabaseMock =
	jest.mocked(getIhtiyatDatabase);


type MockRunResult = {
	changes: number;
	lastInsertRowId: number;
};


type MockTransaction = {
	runAsync: jest.Mock<Promise<MockRunResult>>;
};


function createDatabaseMock() {
	const transaction: MockTransaction = {
		runAsync: jest.fn().mockResolvedValue({
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


const catalogue: ResourceHubCatalogue = {
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
			content_en: 'Reviewed English safety guidance.',
			content_ar: 'إرشادات سلامة عربية تمت مراجعتها.',
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

	locationLinks: [
		{
			resource_id: 101,
			location_id: 1,
		},
	],

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
			sort_order: 20,
		},
	],
};


describe(
	'Resource Hub cache repository',
	() => {
		beforeEach(() => {
			jest.clearAllMocks();
		});


		test(
			'atomically replaces the complete Resource Hub snapshot and records metadata last',
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

				await saveResourceHubCatalogueCache(
					catalogue,
					'2026-09-27T03:00:00.000Z',
				);


				expect(
					database.withExclusiveTransactionAsync,
				).toHaveBeenCalledTimes(1);


				/*
				 * 8 DELETEs
				 * 8 fixture INSERTs
				 * 1 metadata write
				 */
				expect(
					transaction.runAsync,
				).toHaveBeenCalledTimes(17);


				const deletionTables = [
					'mission_task_resource_cache',
					'quiz_question_resource_cache',
					'resource_location_cache',
					'resource_hazard_cache',
					'resource_topic_link_cache',
					'resource_source_cache',
					'safety_resource_cache',
					'resource_topic_cache',
				];

				deletionTables.forEach(
					(table, index) => {
						expect(
							transaction.runAsync
								.mock.calls[index][0],
						).toContain(
							`DELETE FROM ${table}`,
						);
					},
				);


				expect(
					transaction.runAsync.mock.calls[8],
				).toEqual([
					expect.stringContaining(
						'INSERT INTO resource_topic_cache',
					),
					1,
					'first_aid',
					'First Aid',
					'الإسعافات الأولية',
					'Reviewed first-aid guidance.',
					'إرشادات إسعافات أولية تمت مراجعتها.',
					10,
					1,
				]);


				expect(
					transaction.runAsync.mock.calls[9],
				).toEqual([
					expect.stringContaining(
						'INSERT INTO safety_resource_cache',
					),
					101,
					'first_aid_kit_basics',
					'First aid kit basics',
					'أساسيات حقيبة الإسعافات الأولية',
					'Prepare essential first-aid supplies.',
					'جهّز مستلزمات الإسعافات الأولية الأساسية.',
					'Reviewed English safety guidance.',
					'إرشادات سلامة عربية تمت مراجعتها.',
					'published',
					10,
					'2026-09-22',
					'2026-09-22T00:00:00+00:00',
				]);


				expect(
					transaction.runAsync.mock.calls[10],
				).toEqual([
					expect.stringContaining(
						'INSERT INTO resource_source_cache',
					),
					201,
					101,
					'Saudi Red Crescent Authority',
					'هيئة الهلال الأحمر السعودي',
					'First aid guidance',
					'إرشادات الإسعافات الأولية',
					'https://example.gov.sa/first-aid',
					'ar',
					1,
					'2026-09-22',
					10,
					1,
				]);


				expect(
					transaction.runAsync.mock.calls[16],
				).toEqual([
					expect.stringContaining(
						'resource_hub_cache_metadata',
					),
					'resource-hub.catalogue',
					'2026-09-27T03:00:00.000Z',
				]);
			},
		);


		test(
			'stores a valid empty Resource Hub snapshot with metadata',
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

				const emptyCatalogue:
					ResourceHubCatalogue = {
						topics: [],
						resources: [],
						sources: [],
						topicLinks: [],
						hazardLinks: [],
						locationLinks: [],
						missionTaskLinks: [],
						quizQuestionLinks: [],
					};


				await saveResourceHubCatalogueCache(
					emptyCatalogue,
					'2026-09-27T03:30:00.000Z',
				);


				expect(
					transaction.runAsync,
				).toHaveBeenCalledTimes(9);

				expect(
					transaction.runAsync.mock.calls[8],
				).toEqual([
					expect.stringContaining(
						'resource_hub_cache_metadata',
					),
					'resource-hub.catalogue',
					'2026-09-27T03:30:00.000Z',
				]);
			},
		);


		test(
			'returns null when the device has never cached a Resource Hub catalogue',
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
					loadResourceHubCatalogueCache(),
				).resolves.toBeNull();

				expect(
					database.getAllAsync,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'restores one coherent cached Resource Hub catalogue and converts SQLite booleans',
			async () => {
				const {
					database,
				} = createDatabaseMock();

				database.getFirstAsync.mockResolvedValue({
					cached_at:
						'2026-09-27T03:00:00.000Z',
				});

				database.getAllAsync
					.mockResolvedValueOnce([
						{
							...catalogue.topics[0],
							is_active: 1,
						},
					])
					.mockResolvedValueOnce(
						catalogue.resources,
					)
					.mockResolvedValueOnce([
						{
							...catalogue.sources[0],
							is_official: 1,
							is_active: 1,
						},
					])
					.mockResolvedValueOnce([
						{
							...catalogue.topicLinks[0],
							is_primary: 1,
						},
					])
					.mockResolvedValueOnce(
						catalogue.hazardLinks,
					)
					.mockResolvedValueOnce(
						catalogue.locationLinks,
					)
					.mockResolvedValueOnce(
						catalogue.missionTaskLinks,
					)
					.mockResolvedValueOnce(
						catalogue.quizQuestionLinks,
					);

				getIhtiyatDatabaseMock.mockResolvedValue(
					database as unknown as Awaited<
						ReturnType<typeof getIhtiyatDatabase>
					>,
				);


				await expect(
					loadResourceHubCatalogueCache(),
				).resolves.toEqual(catalogue);

				expect(
					database.getAllAsync,
				).toHaveBeenCalledTimes(8);
			},
		);


		test(
			'rejects an unsupported cached mission-resource link role',
			async () => {
				const {
					database,
				} = createDatabaseMock();

				database.getFirstAsync.mockResolvedValue({
					cached_at:
						'2026-09-27T03:00:00.000Z',
				});

				database.getAllAsync
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([])
					.mockResolvedValueOnce([
						{
							task_id: 1,
							resource_id: 101,
							link_role: 'unexpected',
							sort_order: 10,
						},
					])
					.mockResolvedValueOnce([]);


				getIhtiyatDatabaseMock.mockResolvedValue(
					database as unknown as Awaited<
						ReturnType<typeof getIhtiyatDatabase>
					>,
				);


				await expect(
					loadResourceHubCatalogueCache(),
				).rejects.toThrow(
					'Resource Hub cache contains unsupported link role: unexpected.',
				);
			},
		);
	},
);