import type { Tables } from '@/types/database.types';


export type ResourceHubTopic = Pick<
	Tables<'resource_topics'>,
	| 'id'
	| 'code'
	| 'name_en'
	| 'name_ar'
	| 'description_en'
	| 'description_ar'
	| 'sort_order'
	| 'is_active'
>;


export type SafetyResource = Pick<
	Tables<'safety_resources'>,
	| 'id'
	| 'code'
	| 'title_en'
	| 'title_ar'
	| 'summary_en'
	| 'summary_ar'
	| 'content_en'
	| 'content_ar'
	| 'publication_status'
	| 'sort_order'
	| 'last_reviewed_on'
	| 'published_at'
>;


export type ResourceSource = Pick<
	Tables<'resource_sources'>,
	| 'id'
	| 'resource_id'
	| 'publisher_name_en'
	| 'publisher_name_ar'
	| 'source_title_en'
	| 'source_title_ar'
	| 'source_url'
	| 'source_language_code'
	| 'is_official'
	| 'last_checked_on'
	| 'sort_order'
	| 'is_active'
>;


export type ResourceTopicLink = Pick<
	Tables<'resource_topic_links'>,
	| 'resource_id'
	| 'topic_id'
	| 'is_primary'
	| 'sort_order'
>;


export type ResourceHazardLink = Pick<
	Tables<'resource_hazards'>,
	| 'resource_id'
	| 'hazard_id'
>;


export type ResourceLocationLink = Pick<
	Tables<'resource_locations'>,
	| 'resource_id'
	| 'location_id'
>;


export type ResourceLinkRole =
	| 'primary'
	| 'supporting';


export type MissionTaskResourceLink =
	Omit<
		Pick<
			Tables<'mission_task_resources'>,
			| 'task_id'
			| 'resource_id'
			| 'link_role'
			| 'sort_order'
		>,
		'link_role'
	>
	& {
		link_role: ResourceLinkRole;
	};


export type QuizQuestionResourceLink =
	Omit<
		Pick<
			Tables<'quiz_question_resources'>,
			| 'question_id'
			| 'resource_id'
			| 'link_role'
			| 'sort_order'
		>,
		'link_role'
	>
	& {
		link_role: ResourceLinkRole;
	};


/**
 * One coherent published Resource Hub snapshot.
 *
 * Supabase remains canonical. Later stages persist this same application-facing
 * structure into SQLite so screens and cross-feature integrations do not need
 * separate online and offline data models.
*/
export type ResourceHubCatalogue = {
	topics: ResourceHubTopic[];
	resources: SafetyResource[];
	sources: ResourceSource[];
	topicLinks: ResourceTopicLink[];
	hazardLinks: ResourceHazardLink[];
	locationLinks: ResourceLocationLink[];
	missionTaskLinks: MissionTaskResourceLink[];
	quizQuestionLinks: QuizQuestionResourceLink[];
};