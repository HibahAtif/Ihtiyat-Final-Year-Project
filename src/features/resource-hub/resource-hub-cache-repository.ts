import { getIhtiyatDatabase } from '@/storage/ihtiyat-database';

import type {
	MissionTaskResourceLink,
	QuizQuestionResourceLink,
	ResourceHazardLink,
	ResourceHubCatalogue,
	ResourceHubTopic,
	ResourceLinkRole,
	ResourceLocationLink,
	ResourceSource,
	ResourceTopicLink,
	SafetyResource,
} from './resource-hub-types';


const RESOURCE_HUB_CACHE_KEY = 'resource-hub.catalogue';


type CacheMetadataRow = {
	cached_at: string;
};


type ResourceHubTopicCacheRow =
	Omit<ResourceHubTopic, 'is_active'>
	& {
		is_active: number;
	};


type ResourceSourceCacheRow =
	Omit<
		ResourceSource,
		| 'is_official'
		| 'is_active'
	>
	& {
		is_official: number;
		is_active: number;
	};


type ResourceTopicLinkCacheRow =
	Omit<ResourceTopicLink, 'is_primary'>
	& {
		is_primary: number;
	};


type MissionTaskResourceCacheRow =
	Omit<MissionTaskResourceLink, 'link_role'>
	& {
		link_role: string;
	};


type QuizQuestionResourceCacheRow =
	Omit<QuizQuestionResourceLink, 'link_role'>
	& {
		link_role: string;
	};


function toSQLiteBoolean(value: boolean): number {
	return value ? 1 : 0;
}


function fromSQLiteBoolean(value: number): boolean {
	return value === 1;
}


function fromSQLiteResourceLinkRole(
	value: string,
): ResourceLinkRole {
	if (
		value === 'primary'
		|| value === 'supporting'
	) {
		return value;
	}

	throw new Error(
		`Resource Hub cache contains unsupported link role: ${value}.`,
	);
}


/**
 * Atomically replaces the complete public Resource Hub snapshot.
 *
 * Supabase remains canonical. SQLite stores the complete public catalogue
 * required for offline Resource Hub browsing and mission/quiz resource links.
 *
 * Metadata is written last so a partially failed transaction can never be
 * mistaken for a successfully cached snapshot.
 */
export async function saveResourceHubCatalogueCache(
	catalogue: ResourceHubCatalogue,
	cachedAt: string = new Date().toISOString(),
): Promise<void> {
	const database = await getIhtiyatDatabase();

	await database.withExclusiveTransactionAsync(
		async (transaction): Promise<void> => {
			/*
			 * Delete dependent rows before their Resource Hub parents while
			 * foreign-key enforcement remains enabled.
			 */
			await transaction.runAsync(
				'DELETE FROM mission_task_resource_cache;',
			);

			await transaction.runAsync(
				'DELETE FROM quiz_question_resource_cache;',
			);

			await transaction.runAsync(
				'DELETE FROM resource_location_cache;',
			);

			await transaction.runAsync(
				'DELETE FROM resource_hazard_cache;',
			);

			await transaction.runAsync(
				'DELETE FROM resource_topic_link_cache;',
			);

			await transaction.runAsync(
				'DELETE FROM resource_source_cache;',
			);

			await transaction.runAsync(
				'DELETE FROM safety_resource_cache;',
			);

			await transaction.runAsync(
				'DELETE FROM resource_topic_cache;',
			);


			for (const topic of catalogue.topics) {
				await transaction.runAsync(
					`
						INSERT INTO resource_topic_cache (
							id,
							code,
							name_en,
							name_ar,
							description_en,
							description_ar,
							sort_order,
							is_active
						)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?);
					`,
					topic.id,
					topic.code,
					topic.name_en,
					topic.name_ar,
					topic.description_en,
					topic.description_ar,
					topic.sort_order,
					toSQLiteBoolean(topic.is_active),
				);
			}


			for (const resource of catalogue.resources) {
				await transaction.runAsync(
					`
						INSERT INTO safety_resource_cache (
							id,
							code,
							title_en,
							title_ar,
							summary_en,
							summary_ar,
							content_en,
							content_ar,
							publication_status,
							sort_order,
							last_reviewed_on,
							published_at
						)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
					`,
					resource.id,
					resource.code,
					resource.title_en,
					resource.title_ar,
					resource.summary_en,
					resource.summary_ar,
					resource.content_en,
					resource.content_ar,
					resource.publication_status,
					resource.sort_order,
					resource.last_reviewed_on,
					resource.published_at,
				);
			}


			for (const source of catalogue.sources) {
				await transaction.runAsync(
					`
						INSERT INTO resource_source_cache (
							id,
							resource_id,
							publisher_name_en,
							publisher_name_ar,
							source_title_en,
							source_title_ar,
							source_url,
							source_language_code,
							is_official,
							last_checked_on,
							sort_order,
							is_active
						)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
					`,
					source.id,
					source.resource_id,
					source.publisher_name_en,
					source.publisher_name_ar,
					source.source_title_en,
					source.source_title_ar,
					source.source_url,
					source.source_language_code,
					toSQLiteBoolean(source.is_official),
					source.last_checked_on,
					source.sort_order,
					toSQLiteBoolean(source.is_active),
				);
			}


			for (const link of catalogue.topicLinks) {
				await transaction.runAsync(
					`
						INSERT INTO resource_topic_link_cache (
							resource_id,
							topic_id,
							is_primary,
							sort_order
						)
						VALUES (?, ?, ?, ?);
					`,
					link.resource_id,
					link.topic_id,
					toSQLiteBoolean(link.is_primary),
					link.sort_order,
				);
			}


			for (const link of catalogue.hazardLinks) {
				await transaction.runAsync(
					`
						INSERT INTO resource_hazard_cache (
							resource_id,
							hazard_id
						)
						VALUES (?, ?);
					`,
					link.resource_id,
					link.hazard_id,
				);
			}


			for (const link of catalogue.locationLinks) {
				await transaction.runAsync(
					`
						INSERT INTO resource_location_cache (
							resource_id,
							location_id
						)
						VALUES (?, ?);
					`,
					link.resource_id,
					link.location_id,
				);
			}


			for (const link of catalogue.missionTaskLinks) {
				await transaction.runAsync(
					`
						INSERT INTO mission_task_resource_cache (
							task_id,
							resource_id,
							link_role,
							sort_order
						)
						VALUES (?, ?, ?, ?);
					`,
					link.task_id,
					link.resource_id,
					link.link_role,
					link.sort_order,
				);
			}


			for (const link of catalogue.quizQuestionLinks) {
				await transaction.runAsync(
					`
						INSERT INTO quiz_question_resource_cache (
							question_id,
							resource_id,
							link_role,
							sort_order
						)
						VALUES (?, ?, ?, ?);
					`,
					link.question_id,
					link.resource_id,
					link.link_role,
					link.sort_order,
				);
			}


			await transaction.runAsync(
				`
					INSERT INTO resource_hub_cache_metadata (
						cache_key,
						cached_at
					)
					VALUES (?, ?)
					ON CONFLICT(cache_key)
					DO UPDATE SET
						cached_at = excluded.cached_at;
				`,
				RESOURCE_HUB_CACHE_KEY,
				cachedAt,
			);
		},
	);
}


/**
 * Loads the last successfully cached Resource Hub catalogue.
 *
 * null means the device has never successfully cached this catalogue.
 * An object containing empty arrays is a valid cached empty snapshot.
 */
export async function loadResourceHubCatalogueCache():
	Promise<ResourceHubCatalogue | null> {
	const database = await getIhtiyatDatabase();

	const metadata =
		await database.getFirstAsync<CacheMetadataRow>(
			`
				SELECT cached_at
				FROM resource_hub_cache_metadata
				WHERE cache_key = ?
				LIMIT 1;
			`,
			RESOURCE_HUB_CACHE_KEY,
		);

	if (!metadata) {
		return null;
	}


	const topicRows =
		await database.getAllAsync<ResourceHubTopicCacheRow>(
			`
				SELECT
					id,
					code,
					name_en,
					name_ar,
					description_en,
					description_ar,
					sort_order,
					is_active
				FROM resource_topic_cache
				ORDER BY
					sort_order ASC,
					id ASC;
			`,
		);


	const resourceRows =
		await database.getAllAsync<SafetyResource>(
			`
				SELECT
					id,
					code,
					title_en,
					title_ar,
					summary_en,
					summary_ar,
					content_en,
					content_ar,
					publication_status,
					sort_order,
					last_reviewed_on,
					published_at
				FROM safety_resource_cache
				ORDER BY
					sort_order ASC,
					id ASC;
			`,
		);


	const sourceRows =
		await database.getAllAsync<ResourceSourceCacheRow>(
			`
				SELECT
					id,
					resource_id,
					publisher_name_en,
					publisher_name_ar,
					source_title_en,
					source_title_ar,
					source_url,
					source_language_code,
					is_official,
					last_checked_on,
					sort_order,
					is_active
				FROM resource_source_cache
				ORDER BY
					resource_id ASC,
					sort_order ASC,
					id ASC;
			`,
		);


	const topicLinkRows =
		await database.getAllAsync<ResourceTopicLinkCacheRow>(
			`
				SELECT
					resource_id,
					topic_id,
					is_primary,
					sort_order
				FROM resource_topic_link_cache
				ORDER BY
					topic_id ASC,
					sort_order ASC,
					resource_id ASC;
			`,
		);


	const hazardLinkRows =
		await database.getAllAsync<ResourceHazardLink>(
			`
				SELECT
					resource_id,
					hazard_id
				FROM resource_hazard_cache
				ORDER BY
					resource_id ASC,
					hazard_id ASC;
			`,
		);


	const locationLinkRows =
		await database.getAllAsync<ResourceLocationLink>(
			`
				SELECT
					resource_id,
					location_id
				FROM resource_location_cache
				ORDER BY
					resource_id ASC,
					location_id ASC;
			`,
		);


	const missionTaskLinkRows =
		await database.getAllAsync<MissionTaskResourceCacheRow>(
			`
				SELECT
					task_id,
					resource_id,
					link_role,
					sort_order
				FROM mission_task_resource_cache
				ORDER BY
					task_id ASC,
					sort_order ASC,
					resource_id ASC;
			`,
		);


	const quizQuestionLinkRows =
		await database.getAllAsync<QuizQuestionResourceCacheRow>(
			`
				SELECT
					question_id,
					resource_id,
					link_role,
					sort_order
				FROM quiz_question_resource_cache
				ORDER BY
					question_id ASC,
					sort_order ASC,
					resource_id ASC;
			`,
		);


	return {
		topics:
			topicRows.map(
				(row): ResourceHubTopic => ({
					...row,
					is_active:
						fromSQLiteBoolean(
							row.is_active,
						),
				}),
			),

		resources:
			resourceRows,

		sources:
			sourceRows.map(
				(row): ResourceSource => ({
					...row,
					is_official:
						fromSQLiteBoolean(
							row.is_official,
						),
					is_active:
						fromSQLiteBoolean(
							row.is_active,
						),
				}),
			),

		topicLinks:
			topicLinkRows.map(
				(row): ResourceTopicLink => ({
					...row,
					is_primary:
						fromSQLiteBoolean(
							row.is_primary,
						),
				}),
			),

		hazardLinks:
			hazardLinkRows,

		locationLinks:
			locationLinkRows,

		missionTaskLinks:
			missionTaskLinkRows.map(
				(row): MissionTaskResourceLink => ({
					...row,
					link_role:
						fromSQLiteResourceLinkRole(
							row.link_role,
						),
				}),
			),

		quizQuestionLinks:
			quizQuestionLinkRows.map(
				(row): QuizQuestionResourceLink => ({
					...row,
					link_role:
						fromSQLiteResourceLinkRole(
							row.link_role,
						),
				}),
			),
	};
}