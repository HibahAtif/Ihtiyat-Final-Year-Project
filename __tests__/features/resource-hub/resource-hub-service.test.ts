/// <reference types="jest" />

jest.mock('@/lib/supabase-config', () => ({
	supabaseClient: {
		from: jest.fn(),
	},
}));


import { supabaseClient } from '@/lib/supabase-config';

import {
	loadActiveResourceSources,
	loadActiveResourceTopics,
	loadMissionTaskResourceLinks,
	loadPublishedSafetyResources,
	loadQuizQuestionResourceLinks,
	loadResourceHazardLinks,
	loadResourceHubCatalogue,
	loadResourceLocationLinks,
	loadResourceTopicLinks,
} from '@/features/resource-hub/resource-hub-service';

import type {
	MissionTaskResourceLink,
	QuizQuestionResourceLink,
	ResourceHazardLink,
	ResourceHubTopic,
	ResourceLocationLink,
	ResourceSource,
	ResourceTopicLink,
	SafetyResource,
} from '@/features/resource-hub/resource-hub-types';


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
			Promise.resolve(result).then(
				onFulfilled,
				onRejected,
			),
	} as MockQueryBuilder<T>;


	builder.select.mockReturnValue(builder);
	builder.eq.mockReturnValue(builder);
	builder.order.mockReturnValue(builder);

	return builder;
}


function expectExplicitColumns(
	selectMock: jest.Mock,
	requiredColumns: string[],
): void {
	const selectedColumns =
		selectMock.mock.calls[0][0] as string;

	expect(selectedColumns).not.toContain('*');

	for (const column of requiredColumns) {
		expect(selectedColumns).toContain(column);
	}
}


const topicRows: ResourceHubTopic[] = [
	{
		id: 1,
		code: 'first_aid',
		name_en: 'First Aid',
		name_ar: 'الإسعافات الأولية',
		description_en: 'First-aid preparation.',
		description_ar: 'الاستعداد للإسعافات الأولية.',
		sort_order: 10,
		is_active: true,
	},
];


const resourceRows: SafetyResource[] = [
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
];


const sourceRows: ResourceSource[] = [
	{
		id: 201,
		resource_id: 101,
		publisher_name_en: 'Saudi Red Crescent Authority',
		publisher_name_ar: 'هيئة الهلال الأحمر السعودي',
		source_title_en: 'First aid guidance',
		source_title_ar: 'إرشادات الإسعافات الأولية',
		source_url: 'https://example.gov.sa/first-aid',
		source_language_code: null,
		is_official: true,
		last_checked_on: '2026-09-22',
		sort_order: 10,
		is_active: true,
	},
];


const topicLinkRows: ResourceTopicLink[] = [
	{
		resource_id: 101,
		topic_id: 1,
		is_primary: true,
		sort_order: 10,
	},
];


const hazardLinkRows: ResourceHazardLink[] = [
	{
		resource_id: 105,
		hazard_id: 11,
	},
];


const locationLinkRows: ResourceLocationLink[] = [];


const missionLinkRows: MissionTaskResourceLink[] = [
	{
		task_id: 1,
		resource_id: 101,
		link_role: 'primary',
		sort_order: 10,
	},
];


const quizLinkRows: QuizQuestionResourceLink[] = [
	{
		question_id: 1,
		resource_id: 101,
		link_role: 'primary',
		sort_order: 10,
	},
];


const fromMock =
	supabaseClient.from as unknown as jest.Mock;


beforeEach(() => {
	jest.clearAllMocks();
});


describe(
	'Resource Hub service',
	() => {
		test(
			'loads active topics using explicit bilingual columns and deterministic ordering',
			async () => {
				const query =
					createQueryBuilder<ResourceHubTopic>({
						data: topicRows,
						error: null,
					});

				fromMock.mockReturnValueOnce(query);


				await expect(
					loadActiveResourceTopics(),
				).resolves.toEqual(topicRows);


				expect(fromMock).toHaveBeenCalledWith(
					'resource_topics',
				);

				expectExplicitColumns(
					query.select,
					[
						'id',
						'code',
						'name_en',
						'name_ar',
						'description_en',
						'description_ar',
						'sort_order',
						'is_active',
					],
				);

				expect(query.eq).toHaveBeenCalledWith(
					'is_active',
					true,
				);

				expect(query.order.mock.calls).toEqual([
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
			'loads only published resources including offline guidance and review metadata',
			async () => {
				const query =
					createQueryBuilder<SafetyResource>({
						data: resourceRows,
						error: null,
					});

				fromMock.mockReturnValueOnce(query);


				await expect(
					loadPublishedSafetyResources(),
				).resolves.toEqual(resourceRows);


				expect(fromMock).toHaveBeenCalledWith(
					'safety_resources',
				);

				expectExplicitColumns(
					query.select,
					[
						'id',
						'code',
						'title_en',
						'title_ar',
						'summary_en',
						'summary_ar',
						'content_en',
						'content_ar',
						'publication_status',
						'sort_order',
						'last_reviewed_on',
						'published_at',
					],
				);

				expect(query.eq).toHaveBeenCalledWith(
					'publication_status',
					'published',
				);
			},
		);


		test(
			'loads active source provenance without select-star access',
			async () => {
				const query =
					createQueryBuilder<ResourceSource>({
						data: sourceRows,
						error: null,
					});

				fromMock.mockReturnValueOnce(query);


				await expect(
					loadActiveResourceSources(),
				).resolves.toEqual(sourceRows);


				expect(fromMock).toHaveBeenCalledWith(
					'resource_sources',
				);

				expectExplicitColumns(
					query.select,
					[
						'id',
						'resource_id',
						'publisher_name_en',
						'publisher_name_ar',
						'source_title_en',
						'source_title_ar',
						'source_url',
						'source_language_code',
						'is_official',
						'last_checked_on',
						'sort_order',
						'is_active',
					],
				);

				expect(query.eq).toHaveBeenCalledWith(
					'is_active',
					true,
				);
			},
		);


		test(
			'loads topic relationships in deterministic topic display order',
			async () => {
				const query =
					createQueryBuilder<ResourceTopicLink>({
						data: topicLinkRows,
						error: null,
					});

				fromMock.mockReturnValueOnce(query);


				await expect(
					loadResourceTopicLinks(),
				).resolves.toEqual(topicLinkRows);


				expect(fromMock).toHaveBeenCalledWith(
					'resource_topic_links',
				);

				expectExplicitColumns(
					query.select,
					[
						'resource_id',
						'topic_id',
						'is_primary',
						'sort_order',
					],
				);

				expect(query.order.mock.calls).toEqual([
					[
						'topic_id',
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
						'resource_id',
						{
							ascending: true,
						},
					],
				]);
			},
		);


		test(
			'loads hazard applicability relationships',
			async () => {
				const query =
					createQueryBuilder<ResourceHazardLink>({
						data: hazardLinkRows,
						error: null,
					});

				fromMock.mockReturnValueOnce(query);


				await expect(
					loadResourceHazardLinks(),
				).resolves.toEqual(hazardLinkRows);

				expect(fromMock).toHaveBeenCalledWith(
					'resource_hazards',
				);
			},
		);


		test(
			'loads optional location applicability relationships including an empty V1 catalogue',
			async () => {
				const query =
					createQueryBuilder<ResourceLocationLink>({
						data: locationLinkRows,
						error: null,
					});

				fromMock.mockReturnValueOnce(query);


				await expect(
					loadResourceLocationLinks(),
				).resolves.toEqual([]);

				expect(fromMock).toHaveBeenCalledWith(
					'resource_locations',
				);
			},
		);


		test(
			'loads mission-task Resource Hub relationships with their primary/supporting role',
			async () => {
				const query =
					createQueryBuilder<MissionTaskResourceLink>({
						data: missionLinkRows,
						error: null,
					});

				fromMock.mockReturnValueOnce(query);


				await expect(
					loadMissionTaskResourceLinks(),
				).resolves.toEqual(missionLinkRows);

				expect(fromMock).toHaveBeenCalledWith(
					'mission_task_resources',
				);

				expectExplicitColumns(
					query.select,
					[
						'task_id',
						'resource_id',
						'link_role',
						'sort_order',
					],
				);
			},
		);


		test(
			'loads quiz-question Resource Hub relationships with their primary/supporting role',
			async () => {
				const query =
					createQueryBuilder<QuizQuestionResourceLink>({
						data: quizLinkRows,
						error: null,
					});

				fromMock.mockReturnValueOnce(query);


				await expect(
					loadQuizQuestionResourceLinks(),
				).resolves.toEqual(quizLinkRows);

				expect(fromMock).toHaveBeenCalledWith(
					'quiz_question_resources',
				);
			},
		);


		test(
			'normalises null public catalogue data to an empty array',
			async () => {
				fromMock.mockReturnValueOnce(
					createQueryBuilder<SafetyResource>({
						data: null,
						error: null,
					}),
				);


				await expect(
					loadPublishedSafetyResources(),
				).resolves.toEqual([]);
			},
		);


		test(
			'throws a clear application error when a Resource Hub query fails',
			async () => {
				fromMock.mockReturnValueOnce(
					createQueryBuilder<SafetyResource>({
						data: null,
						error: {
							message: 'network unavailable',
						},
					}),
				);


				await expect(
					loadPublishedSafetyResources(),
				).rejects.toThrow(
					'Unable to load published Resource Hub resources: network unavailable',
				);
			},
		);


		test(
			'loads one coherent Resource Hub catalogue containing content, provenance and cross-feature relationships',
			async () => {
				fromMock
					.mockReturnValueOnce(
						createQueryBuilder<ResourceHubTopic>({
							data: topicRows,
							error: null,
						}),
					)
					.mockReturnValueOnce(
						createQueryBuilder<SafetyResource>({
							data: resourceRows,
							error: null,
						}),
					)
					.mockReturnValueOnce(
						createQueryBuilder<ResourceSource>({
							data: sourceRows,
							error: null,
						}),
					)
					.mockReturnValueOnce(
						createQueryBuilder<ResourceTopicLink>({
							data: topicLinkRows,
							error: null,
						}),
					)
					.mockReturnValueOnce(
						createQueryBuilder<ResourceHazardLink>({
							data: hazardLinkRows,
							error: null,
						}),
					)
					.mockReturnValueOnce(
						createQueryBuilder<ResourceLocationLink>({
							data: locationLinkRows,
							error: null,
						}),
					)
					.mockReturnValueOnce(
						createQueryBuilder<MissionTaskResourceLink>({
							data: missionLinkRows,
							error: null,
						}),
					)
					.mockReturnValueOnce(
						createQueryBuilder<QuizQuestionResourceLink>({
							data: quizLinkRows,
							error: null,
						}),
					);


				await expect(
					loadResourceHubCatalogue(),
				).resolves.toEqual({
					topics: topicRows,
					resources: resourceRows,
					sources: sourceRows,
					topicLinks: topicLinkRows,
					hazardLinks: hazardLinkRows,
					locationLinks: locationLinkRows,
					missionTaskLinks: missionLinkRows,
					quizQuestionLinks: quizLinkRows,
				});


				expect(fromMock).toHaveBeenCalledTimes(8);
			},
		);
	},
);