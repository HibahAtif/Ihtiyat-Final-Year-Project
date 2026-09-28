import { supabaseClient } from '@/lib/supabase-config';

import type {
	MissionTaskResourceLink,
	QuizQuestionResourceLink,
	ResourceHazardLink,
	ResourceHubCatalogue,
	ResourceHubTopic,
	ResourceLocationLink,
	ResourceSource,
	ResourceTopicLink,
	SafetyResource,
} from './resource-hub-types';


const RESOURCE_TOPIC_COLUMNS = `
	id,
	code,
	name_en,
	name_ar,
	description_en,
	description_ar,
	sort_order,
	is_active
` as const;


const SAFETY_RESOURCE_COLUMNS = `
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
` as const;


const RESOURCE_SOURCE_COLUMNS = `
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
` as const;


const RESOURCE_TOPIC_LINK_COLUMNS = `
	resource_id,
	topic_id,
	is_primary,
	sort_order
` as const;


const RESOURCE_HAZARD_LINK_COLUMNS = `
	resource_id,
	hazard_id
` as const;


const RESOURCE_LOCATION_LINK_COLUMNS = `
	resource_id,
	location_id
` as const;


const MISSION_TASK_RESOURCE_LINK_COLUMNS = `
	task_id,
	resource_id,
	link_role,
	sort_order
` as const;


const QUIZ_QUESTION_RESOURCE_LINK_COLUMNS = `
	question_id,
	resource_id,
	link_role,
	sort_order
` as const;


/**
 * Loads the active user-facing Resource Hub topics.
*/
export async function loadActiveResourceTopics():
	Promise<ResourceHubTopic[]> {
	const { data, error } = await supabaseClient
		.from('resource_topics')
		.select(RESOURCE_TOPIC_COLUMNS)
		.eq('is_active', true)
		.order('sort_order', {
			ascending: true,
		})
		.order('id', {
			ascending: true,
		});


	if (error) {
		throw new Error(
			`Unable to load Resource Hub topics: ${error.message}`,
		);
	}


	return data ?? [];
}


/**
 * Loads only published Resource Hub guidance.
 *
 * Draft and retired safety content must never become part of the public mobile
 * catalogue or its later offline cache.
*/
export async function loadPublishedSafetyResources():
	Promise<SafetyResource[]> {
	const { data, error } = await supabaseClient
		.from('safety_resources')
		.select(SAFETY_RESOURCE_COLUMNS)
		.eq('publication_status', 'published')
		.order('sort_order', {
			ascending: true,
		})
		.order('id', {
			ascending: true,
		});


	if (error) {
		throw new Error(
			`Unable to load published Resource Hub resources: ${error.message}`,
		);
	}


	return data ?? [];
}


/**
 * Loads active provenance records for published Resource Hub guidance.
 *
 * RLS already prevents ordinary clients from seeing source relationships for
 * content that is not publicly readable.
*/
export async function loadActiveResourceSources():
	Promise<ResourceSource[]> {
	const { data, error } = await supabaseClient
		.from('resource_sources')
		.select(RESOURCE_SOURCE_COLUMNS)
		.eq('is_active', true)
		.order('resource_id', {
			ascending: true,
		})
		.order('sort_order', {
			ascending: true,
		})
		.order('id', {
			ascending: true,
		});


	if (error) {
		throw new Error(
			`Unable to load Resource Hub sources: ${error.message}`,
		);
	}


	return data ?? [];
}


export async function loadResourceTopicLinks():
	Promise<ResourceTopicLink[]> {
	const { data, error } = await supabaseClient
		.from('resource_topic_links')
		.select(RESOURCE_TOPIC_LINK_COLUMNS)
		.order('topic_id', {
			ascending: true,
		})
		.order('sort_order', {
			ascending: true,
		})
		.order('resource_id', {
			ascending: true,
		});


	if (error) {
		throw new Error(
			`Unable to load Resource Hub topic relationships: ${error.message}`,
		);
	}


	return data ?? [];
}


export async function loadResourceHazardLinks():
	Promise<ResourceHazardLink[]> {
	const { data, error } = await supabaseClient
		.from('resource_hazards')
		.select(RESOURCE_HAZARD_LINK_COLUMNS)
		.order('resource_id', {
			ascending: true,
		})
		.order('hazard_id', {
			ascending: true,
		});


	if (error) {
		throw new Error(
			`Unable to load Resource Hub hazard relationships: ${error.message}`,
		);
	}


	return data ?? [];
}


export async function loadResourceLocationLinks():
	Promise<ResourceLocationLink[]> {
	const { data, error } = await supabaseClient
		.from('resource_locations')
		.select(RESOURCE_LOCATION_LINK_COLUMNS)
		.order('resource_id', {
			ascending: true,
		})
		.order('location_id', {
			ascending: true,
		});


	if (error) {
		throw new Error(
			`Unable to load Resource Hub location relationships: ${error.message}`,
		);
	}


	return data ?? [];
}


export async function loadMissionTaskResourceLinks():
	Promise<MissionTaskResourceLink[]> {
	const { data, error } = await supabaseClient
		.from('mission_task_resources')
		.select(MISSION_TASK_RESOURCE_LINK_COLUMNS)
		.order('task_id', {
			ascending: true,
		})
		.order('sort_order', {
			ascending: true,
		})
		.order('resource_id', {
			ascending: true,
		});


	if (error) {
		throw new Error(
			`Unable to load mission Resource Hub relationships: ${error.message}`,
		);
	}


	return (data ?? []) as MissionTaskResourceLink[];
}


export async function loadQuizQuestionResourceLinks():
	Promise<QuizQuestionResourceLink[]> {
	const { data, error } = await supabaseClient
		.from('quiz_question_resources')
		.select(QUIZ_QUESTION_RESOURCE_LINK_COLUMNS)
		.order('question_id', {
			ascending: true,
		})
		.order('sort_order', {
			ascending: true,
		})
		.order('resource_id', {
			ascending: true,
		});


	if (error) {
		throw new Error(
			`Unable to load quiz Resource Hub relationships: ${error.message}`,
		);
	}


	return (data ?? []) as QuizQuestionResourceLink[];
}


/**
 * Loads one coherent public Resource Hub snapshot.
 *
 * Every dataset is independently readable public catalogue data, so the
 * requests can run in parallel. If any required piece fails, this operation
 * fails as a whole. The later feature loader can then use one complete cached
 * SQLite snapshot rather than mixing fresh and stale relationships.
*/
export async function loadResourceHubCatalogue():
	Promise<ResourceHubCatalogue> {
	const [
		topics,
		resources,
		sources,
		topicLinks,
		hazardLinks,
		locationLinks,
		missionTaskLinks,
		quizQuestionLinks,
	] = await Promise.all([
		loadActiveResourceTopics(),
		loadPublishedSafetyResources(),
		loadActiveResourceSources(),
		loadResourceTopicLinks(),
		loadResourceHazardLinks(),
		loadResourceLocationLinks(),
		loadMissionTaskResourceLinks(),
		loadQuizQuestionResourceLinks(),
	]);


	return {
		topics,
		resources,
		sources,
		topicLinks,
		hazardLinks,
		locationLinks,
		missionTaskLinks,
		quizQuestionLinks,
	};
}