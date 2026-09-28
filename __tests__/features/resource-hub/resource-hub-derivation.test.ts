/// <reference types="jest" />

import {
	getContextRelevantResources,
	getPrimaryResourceForMissionTask,
	getPrimaryResourceForQuizQuestion,
	getResourceById,
	getResourcesForHazards,
	getResourcesForLocations,
	getResourcesForMissionTask,
	getResourcesForQuizQuestion,
	getResourcesForTopic,
	getSourcesForResource,
	getTopicsForResource,
	getMissionTaskGuidanceForDisplay,
} from '@/features/resource-hub/resource-hub-derivation';

import type {
	ResourceHubCatalogue,
} from '@/features/resource-hub/resource-hub-types';


const catalogue: ResourceHubCatalogue = {
	topics: [
		{
			id: 2,
			code: 'flood_safety',
			name_en: 'Flood Safety',
			name_ar: 'السلامة من الفيضانات',
			description_en: 'Flood preparedness and response.',
			description_ar: 'الاستعداد للفيضانات والاستجابة لها.',
			sort_order: 20,
			is_active: true,
		},
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
	],

	resources: [
		{
			id: 103,
			code: 'emergency_contacts',
			title_en: 'Emergency contacts',
			title_ar: 'جهات الاتصال في حالات الطوارئ',
			summary_en: 'Know who to contact in an emergency.',
			summary_ar: 'اعرف بمن تتصل في حالة الطوارئ.',
			content_en: 'Reviewed emergency contact guidance.',
			content_ar: 'إرشادات تمت مراجعتها لجهات اتصال الطوارئ.',
			publication_status: 'published',
			sort_order: 30,
			last_reviewed_on: '2026-09-23',
			published_at: '2026-09-23T00:00:00+00:00',
		},
		{
			id: 101,
			code: 'first_aid_kit_basics',
			title_en: 'First aid kit basics',
			title_ar: 'أساسيات حقيبة الإسعافات الأولية',
			summary_en: 'Prepare essential first-aid supplies.',
			summary_ar: 'جهّز مستلزمات الإسعافات الأولية الأساسية.',
			content_en: 'Reviewed first-aid guidance.',
			content_ar: 'إرشادات إسعافات أولية تمت مراجعتها.',
			publication_status: 'published',
			sort_order: 10,
			last_reviewed_on: '2026-09-22',
			published_at: '2026-09-22T00:00:00+00:00',
		},
		{
			id: 102,
			code: 'flood_route_safety',
			title_en: 'Flood route safety',
			title_ar: 'السلامة على الطرق أثناء الفيضانات',
			summary_en: 'Avoid dangerous flooded routes.',
			summary_ar: 'تجنب الطرق الخطرة المغمورة بالمياه.',
			content_en: 'Reviewed flood-route guidance.',
			content_ar: 'إرشادات تمت مراجعتها للطرق أثناء الفيضانات.',
			publication_status: 'published',
			sort_order: 20,
			last_reviewed_on: '2026-09-22',
			published_at: '2026-09-22T00:00:00+00:00',
		},
	],

	sources: [
		{
			id: 203,
			resource_id: 102,
			publisher_name_en: 'National Center for Meteorology',
			publisher_name_ar: 'المركز الوطني للأرصاد',
			source_title_en: 'Flood guidance',
			source_title_ar: 'إرشادات الفيضانات',
			source_url: 'https://example.gov.sa/flood',
			source_language_code: 'ar',
			is_official: true,
			last_checked_on: '2026-09-22',
			sort_order: 10,
			is_active: true,
		},
		{
			id: 202,
			resource_id: 101,
			publisher_name_en: 'Health Guidance Service',
			publisher_name_ar: 'خدمة الإرشادات الصحية',
			source_title_en: 'Additional first-aid guidance',
			source_title_ar: 'إرشادات إضافية للإسعافات الأولية',
			source_url: 'https://example.gov.sa/first-aid-more',
			source_language_code: 'en',
			is_official: true,
			last_checked_on: '2026-09-22',
			sort_order: 20,
			is_active: true,
		},
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
			resource_id: 102,
			topic_id: 2,
			is_primary: true,
			sort_order: 30,
		},
		{
			resource_id: 101,
			topic_id: 1,
			is_primary: false,
			sort_order: 5,
		},
		{
			resource_id: 999,
			topic_id: 1,
			is_primary: false,
			sort_order: 1,
		},
		{
			resource_id: 101,
			topic_id: 2,
			is_primary: true,
			sort_order: 50,
		},
	],

	hazardLinks: [
		{
			resource_id: 103,
			hazard_id: 22,
		},
		{
			resource_id: 102,
			hazard_id: 22,
		},
		{
			resource_id: 101,
			hazard_id: 11,
		},
		{
			resource_id: 102,
			hazard_id: 11,
		},
	],

	locationLinks: [
		{
			resource_id: 103,
			location_id: 202,
		},
		{
			resource_id: 101,
			location_id: 201,
		},
	],

	missionTaskLinks: [
		{
			task_id: 501,
			resource_id: 101,
			link_role: 'supporting',
			sort_order: 5,
		},
		{
			task_id: 777,
			resource_id: 999,
			link_role: 'primary',
			sort_order: 1,
		},
		{
			task_id: 501,
			resource_id: 102,
			link_role: 'primary',
			sort_order: 50,
		},
		{
			task_id: 502,
			resource_id: 103,
			link_role: 'supporting',
			sort_order: 10,
		},
	],

	quizQuestionLinks: [
		{
			question_id: 601,
			resource_id: 101,
			link_role: 'supporting',
			sort_order: 5,
		},
		{
			question_id: 888,
			resource_id: 999,
			link_role: 'primary',
			sort_order: 1,
		},
		{
			question_id: 601,
			resource_id: 103,
			link_role: 'primary',
			sort_order: 50,
		},
		{
			question_id: 602,
			resource_id: 102,
			link_role: 'supporting',
			sort_order: 10,
		},
	],
};


describe(
	'Resource Hub derivation',
	() => {
		test(
			'looks up a resource by canonical ID and returns null for an unknown ID',
			() => {
				expect(
					getResourceById(
						catalogue,
						102,
					),
				).toBe(
					catalogue.resources[2],
				);

				expect(
					getResourceById(
						catalogue,
						9999,
					),
				).toBeNull();
			},
		);


		test(
			'returns only sources for the requested resource in deterministic display order',
			() => {
				const sources =
					getSourcesForResource(
						catalogue,
						101,
					);

				expect(
					sources.map(
						(source) =>
							source.id,
					),
				).toEqual([
					201,
					202,
				]);

				expect(
					sources.every(
						(source) =>
							source.resource_id
							=== 101,
					),
				).toBe(
					true,
				);
			},
		);


		test(
			'resolves topic resources deterministically even when catalogue relationships are unordered',
			() => {
				expect(
					getResourcesForTopic(
						catalogue,
						2,
					).map(
						(resource) =>
							resource.id,
					),
				).toEqual([
					101,
					102,
				]);
			},
		);


		test(
			'returns a primary topic before supporting topics regardless of relationship sort order',
			() => {
				const associations =
					getTopicsForResource(
						catalogue,
						101,
					);

				expect(
					associations.map(
						({
							topic,
							isPrimary,
						}) => ({
							topicId:
								topic.id,
							isPrimary,
						}),
					),
				).toEqual([
					{
						topicId: 2,
						isPrimary: true,
					},
					{
						topicId: 1,
						isPrimary: false,
					},
				]);
			},
		);


		test(
			'returns a de-duplicated deterministic union for multiple hazard IDs',
			() => {
				expect(
					getResourcesForHazards(
						catalogue,
						[
							22,
							11,
							11,
						],
					).map(
						(resource) =>
							resource.id,
					),
				).toEqual([
					101,
					102,
					103,
				]);
			},
		);


		test(
			'returns location-scoped resources and treats an empty location scope as no location-specific result',
			() => {
				expect(
					getResourcesForLocations(
						catalogue,
						[
							202,
							201,
						],
					).map(
						(resource) =>
							resource.id,
					),
				).toEqual([
					101,
					103,
				]);

				expect(
					getResourcesForLocations(
						catalogue,
						[],
					),
				).toEqual([]);
			},
		);


		test(
			'combines hazard and location relevance without returning the same resource twice',
			() => {
				/*
				 * Resource 101 matches both hazard 11 and location 201.
				 * It must appear only once.
				 */
				expect(
					getContextRelevantResources(
						catalogue,
						{
							hazardIds: [
								11,
							],
							locationScopeIds: [
								201,
							],
						},
					).map(
						(resource) =>
							resource.id,
					),
				).toEqual([
					101,
					102,
				]);
			},
		);


		test(
			'orders mission-task guidance with primary resources before supporting resources',
			() => {
				expect(
					getResourcesForMissionTask(
						catalogue,
						501,
					).map(
						(item) => ({
							id:
								item.resource.id,
							role:
								item.linkRole,
						}),
					),
				).toEqual([
					{
						id: 102,
						role: 'primary',
					},
					{
						id: 101,
						role: 'supporting',
					},
				]);
			},
		);


		test(
			'ignores dangling relationship IDs that do not resolve to a cached resource',
			() => {
				expect(
					getResourcesForMissionTask(
						catalogue,
						777,
					),
				).toEqual([]);

				expect(
					getResourcesForQuizQuestion(
						catalogue,
						888,
					),
				).toEqual([]);

				expect(
					getResourcesForTopic(
						catalogue,
						1,
					).map(
						(resource) =>
							resource.id,
					),
				).toEqual([
					101,
				]);
			},
		);


		test(
			'returns the primary mission resource when present and null when only supporting guidance exists',
			() => {
				expect(
					getPrimaryResourceForMissionTask(
						catalogue,
						501,
					)?.id,
				).toBe(
					102,
				);

				expect(
					getPrimaryResourceForMissionTask(
						catalogue,
						502,
					),
				).toBeNull();

				expect(
					getPrimaryResourceForMissionTask(
						catalogue,
						9999,
					),
				).toBeNull();
			},
		);


		test(
			'orders quiz guidance with primary resources before supporting resources',
			() => {
				expect(
					getResourcesForQuizQuestion(
						catalogue,
						601,
					).map(
						(item) => ({
							id:
								item.resource.id,
							role:
								item.linkRole,
						}),
					),
				).toEqual([
					{
						id: 103,
						role: 'primary',
					},
					{
						id: 101,
						role: 'supporting',
					},
				]);
			},
		);


		test(
			'returns the primary quiz resource when present and null when only supporting guidance exists',
			() => {
				expect(
					getPrimaryResourceForQuizQuestion(
						catalogue,
						601,
					)?.id,
				).toBe(
					103,
				);

				expect(
					getPrimaryResourceForQuizQuestion(
						catalogue,
						602,
					),
				).toBeNull();

				expect(
					getPrimaryResourceForQuizQuestion(
						catalogue,
						9999,
					),
				).toBeNull();
			},
		);

		test(
			'collapses the same resource linked to several mission tasks onto the final linked task',
			() => {
				const sharedCatalogue:
					ResourceHubCatalogue = {
						...catalogue,

						missionTaskLinks: [
							{
								task_id: 501,
								resource_id: 102,
								link_role: 'primary',
								sort_order: 10,
							},
							{
								task_id: 502,
								resource_id: 102,
								link_role: 'primary',
								sort_order: 10,
							},
							{
								task_id: 503,
								resource_id: 102,
								link_role: 'primary',
								sort_order: 10,
							},
						],
					};


				const presentation =
					getMissionTaskGuidanceForDisplay(
						sharedCatalogue,
						[
							501,
							502,
							503,
						],
					);


				expect(
					presentation.get(
						501,
					),
				).toBeUndefined();

				expect(
					presentation.get(
						502,
					),
				).toBeUndefined();

				expect(
					presentation.get(
						503,
					)?.map(
						(item) =>
							item.resource.id,
					),
				).toEqual([
					102,
				]);
			},
		);


		test(
			'keeps resources that belong to different mission tasks beside their individual tasks',
			() => {
				const hazardCatalogue:
					ResourceHubCatalogue = {
						...catalogue,

						missionTaskLinks: [
							{
								task_id: 501,
								resource_id: 101,
								link_role: 'primary',
								sort_order: 10,
							},
							{
								task_id: 502,
								resource_id: 102,
								link_role: 'primary',
								sort_order: 10,
							},
							{
								task_id: 503,
								resource_id: 103,
								link_role: 'primary',
								sort_order: 10,
							},
						],
					};


				const presentation =
					getMissionTaskGuidanceForDisplay(
						hazardCatalogue,
						[
							501,
							502,
							503,
						],
					);


				expect(
					presentation.get(
						501,
					)?.map(
						(item) =>
							item.resource.id,
					),
				).toEqual([
					101,
				]);

				expect(
					presentation.get(
						502,
					)?.map(
						(item) =>
							item.resource.id,
					),
				).toEqual([
					102,
				]);

				expect(
					presentation.get(
						503,
					)?.map(
						(item) =>
							item.resource.id,
					),
				).toEqual([
					103,
				]);
			},
		);


		test(
			'uses mission task order rather than numeric task ID to decide where repeated guidance is displayed',
			() => {
				const sharedCatalogue:
					ResourceHubCatalogue = {
						...catalogue,

						missionTaskLinks: [
							{
								task_id: 501,
								resource_id: 102,
								link_role: 'primary',
								sort_order: 10,
							},
							{
								task_id: 502,
								resource_id: 102,
								link_role: 'supporting',
								sort_order: 20,
							},
						],
					};


				const presentation =
					getMissionTaskGuidanceForDisplay(
						sharedCatalogue,

						/*
						* 501 is visually last even though its numeric ID is lower.
						*/
						[
							502,
							501,
						],
					);


				expect(
					presentation.get(
						502,
					),
				).toBeUndefined();

				expect(
					presentation.get(
						501,
					)?.map(
						(item) => ({
							resourceId:
								item.resource.id,

							role:
								item.linkRole,
						}),
					),
				).toEqual([
					{
						resourceId: 102,
						role: 'primary',
					},
				]);
			},
		);
	},
);