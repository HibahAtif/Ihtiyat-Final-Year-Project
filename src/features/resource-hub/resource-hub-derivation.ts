import type {
	ResourceHubCatalogue,
	ResourceHubTopic,
	ResourceLinkRole,
	ResourceSource,
	SafetyResource,
} from './resource-hub-types';


export type ResourceHubLinkedResource = {
	resource: SafetyResource;
	linkRole: ResourceLinkRole;
	sortOrder: number;
};


export type ResourceHubTopicAssociation = {
	topic: ResourceHubTopic;
	isPrimary: boolean;
	sortOrder: number;
};


function compareResources(
	left: SafetyResource,
	right: SafetyResource,
): number {
	return left.sort_order - right.sort_order
		|| left.id - right.id;
}


function buildResourceMap(
	catalogue: ResourceHubCatalogue,
): Map<number, SafetyResource> {
	return new Map(
		catalogue.resources.map(
			(resource) => [
				resource.id,
				resource,
			],
		),
	);
}


function resolveResourceIds(
	catalogue: ResourceHubCatalogue,
	resourceIds: Iterable<number>,
): SafetyResource[] {
	const resourcesById = buildResourceMap(catalogue);
	const uniqueIds = new Set(resourceIds);

	return Array.from(uniqueIds)
		.map((resourceId) => resourcesById.get(resourceId))
		.filter(
			(resource): resource is SafetyResource =>
				resource !== undefined,
		)
		.sort(compareResources);
}


/**
 * Finds one canonical public Resource Hub entry.
 */
export function getResourceById(
	catalogue: ResourceHubCatalogue,
	resourceId: number,
): SafetyResource | null {
	return catalogue.resources.find(
		(resource) => resource.id === resourceId,
	) ?? null;
}


/**
 * Returns source provenance for one Resource Hub entry in canonical display
 * order.
 */
export function getSourcesForResource(
	catalogue: ResourceHubCatalogue,
	resourceId: number,
): ResourceSource[] {
	return catalogue.sources
		.filter((source) => source.resource_id === resourceId)
		.sort(
			(left, right) =>
				left.sort_order - right.sort_order
				|| left.id - right.id,
		);
}


/**
 * Returns the topics assigned to one resource. The primary topic is returned
 * first, followed by the configured relationship order.
 */
export function getTopicsForResource(
	catalogue: ResourceHubCatalogue,
	resourceId: number,
): ResourceHubTopicAssociation[] {
	const topicsById = new Map(
		catalogue.topics.map(
			(topic) => [
				topic.id,
				topic,
			],
		),
	);

	return catalogue.topicLinks
		.filter((link) => link.resource_id === resourceId)
		.map((link) => {
			const topic = topicsById.get(link.topic_id);

			if (!topic) {
				return null;
			}

			return {
				topic,
				isPrimary: link.is_primary,
				sortOrder: link.sort_order,
			};
		})
		.filter(
			(
				association,
			): association is ResourceHubTopicAssociation =>
				association !== null,
		)
		.sort(
			(left, right) =>
				Number(right.isPrimary) - Number(left.isPrimary)
				|| left.sortOrder - right.sortOrder
				|| left.topic.sort_order - right.topic.sort_order
				|| left.topic.id - right.topic.id,
		);
}


/**
 * Returns all resources belonging to one Resource Hub topic.
 */
export function getResourcesForTopic(
	catalogue: ResourceHubCatalogue,
	topicId: number,
): SafetyResource[] {
	return resolveResourceIds(
		catalogue,
		catalogue.topicLinks
			.filter((link) => link.topic_id === topicId)
			.map((link) => link.resource_id),
	);
}


/**
 * Returns resources explicitly associated with any supplied hazard.
 *
 * An empty hazard list deliberately returns no context-specific resources.
 * General resources remain available through catalogue.resources.
 */
export function getResourcesForHazards(
	catalogue: ResourceHubCatalogue,
	hazardIds: readonly number[],
): SafetyResource[] {
	if (hazardIds.length === 0) {
		return [];
	}

	const hazardIdSet = new Set(hazardIds);

	return resolveResourceIds(
		catalogue,
		catalogue.hazardLinks
			.filter((link) => hazardIdSet.has(link.hazard_id))
			.map((link) => link.resource_id),
	);
}


/**
 * Returns resources explicitly associated with the supplied active-location
 * scope. Callers may supply the selected location plus trusted ancestors.
 */
export function getResourcesForLocations(
	catalogue: ResourceHubCatalogue,
	locationScopeIds: readonly number[],
): SafetyResource[] {
	if (locationScopeIds.length === 0) {
		return [];
	}

	const locationIdSet = new Set(locationScopeIds);

	return resolveResourceIds(
		catalogue,
		catalogue.locationLinks
			.filter((link) => locationIdSet.has(link.location_id))
			.map((link) => link.resource_id),
	);
}


/**
 * Returns resources explicitly relevant to the current preparedness context.
 *
 * Hazard and location relationships are combined as a union. A resource linked
 * through both routes appears only once.
 *
 * General unscoped resources are intentionally not included here; they remain
 * available in the complete Resource Hub catalogue.
 */
export function getContextRelevantResources(
	catalogue: ResourceHubCatalogue,
	input: {
		hazardIds: readonly number[];
		locationScopeIds: readonly number[];
	},
): SafetyResource[] {
	const hazardIdSet = new Set(input.hazardIds);
	const locationIdSet = new Set(input.locationScopeIds);

	const resourceIds = new Set<number>();

	for (const link of catalogue.hazardLinks) {
		if (hazardIdSet.has(link.hazard_id)) {
			resourceIds.add(link.resource_id);
		}
	}

	for (const link of catalogue.locationLinks) {
		if (locationIdSet.has(link.location_id)) {
			resourceIds.add(link.resource_id);
		}
	}

	return resolveResourceIds(
		catalogue,
		resourceIds,
	);
}


function resolveLinkedResources(
	catalogue: ResourceHubCatalogue,
	links: Array<{
		resource_id: number;
		link_role: ResourceLinkRole;
		sort_order: number;
	}>,
): ResourceHubLinkedResource[] {
	const resourcesById = buildResourceMap(catalogue);

	return links
		.map((link) => {
			const resource = resourcesById.get(link.resource_id);

			if (!resource) {
				return null;
			}

			return {
				resource,
				linkRole: link.link_role,
				sortOrder: link.sort_order,
			};
		})
		.filter(
			(
				item,
			): item is ResourceHubLinkedResource =>
				item !== null,
		)
		.sort(
			(left, right) =>
				Number(right.linkRole === 'primary')
					- Number(left.linkRole === 'primary')
				|| left.sortOrder - right.sortOrder
				|| compareResources(left.resource, right.resource),
		);
}


/**
 * Returns reviewed guidance linked to one preparedness mission task.
 *
 * Primary guidance is always returned before supporting guidance.
 */
export function getResourcesForMissionTask(
	catalogue: ResourceHubCatalogue,
	taskId: number,
): ResourceHubLinkedResource[] {
	return resolveLinkedResources(
		catalogue,
		catalogue.missionTaskLinks.filter(
			(link) => link.task_id === taskId,
		),
	);
}

/**
 * Produces mission-task guidance for presentation without repeatedly showing
 * the same resource beneath several checklist tasks in one mission.
 *
 * A resource linked to only one task remains with that task. When the same
 * resource is linked to multiple tasks in the supplied mission order, it is
 * retained only beneath the final linked task.
 *
 * The canonical task/resource relationship itself is not changed.
*/
export function getMissionTaskGuidanceForDisplay(
	catalogue: ResourceHubCatalogue,
	taskIds: readonly number[],
): Map<number, ResourceHubLinkedResource[]> {
	const uniqueTaskIds = Array.from(
		new Set(taskIds),
	);

	const canonicalByTaskId =
		new Map<
			number,
			ResourceHubLinkedResource[]
		>();

	const resourceTaskCounts =
		new Map<number, number>();

	const lastTaskIndexByResourceId =
		new Map<number, number>();


	uniqueTaskIds.forEach(
		(taskId, taskIndex) => {
			const linkedResources =
				getResourcesForMissionTask(
					catalogue,
					taskId,
				);

			canonicalByTaskId.set(
				taskId,
				linkedResources,
			);

			/*
			 * Count a resource at most once per task. This keeps malformed
			 * duplicate relationship rows from falsely making a resource
			 * appear shared across several tasks.
			*/
			const resourceIdsSeenForTask =
				new Set<number>();

			for (
				const linkedResource
					of linkedResources
			) {
				const resourceId =
					linkedResource.resource.id;

				if (
					resourceIdsSeenForTask.has(
						resourceId,
					)
				) {
					continue;
				}

				resourceIdsSeenForTask.add(
					resourceId,
				);

				resourceTaskCounts.set(
					resourceId,
					(
						resourceTaskCounts.get(
							resourceId,
						)
						?? 0
					) + 1,
				);

				lastTaskIndexByResourceId.set(
					resourceId,
					taskIndex,
				);
			}
		},
	);


	const displayByTaskId =
		new Map<
			number,
			ResourceHubLinkedResource[]
		>();


	uniqueTaskIds.forEach(
		(taskId, taskIndex) => {
			const canonicalResources =
				canonicalByTaskId.get(
					taskId,
				) ?? [];

			const displayResources =
				canonicalResources.filter(
					(linkedResource) => {
						const resourceId =
							linkedResource.resource.id;

						const occurrenceCount =
							resourceTaskCounts.get(
								resourceId,
							) ?? 0;

						if (
							occurrenceCount <= 1
						) {
							return true;
						}

						return (
							lastTaskIndexByResourceId.get(
								resourceId,
							)
							=== taskIndex
						);
					},
				);

			if (
				displayResources.length > 0
			) {
				displayByTaskId.set(
					taskId,
					displayResources,
				);
			}
		},
	);


	return displayByTaskId;
}


export function getPrimaryResourceForMissionTask(
	catalogue: ResourceHubCatalogue,
	taskId: number,
): SafetyResource | null {
	const linkedResources =
		getResourcesForMissionTask(catalogue, taskId);

	return linkedResources.find(
		(item) => item.linkRole === 'primary',
	)?.resource ?? null;
}


/**
 * Returns reviewed guidance linked to one preparedness quiz question.
 *
 * The UI will expose these after question feedback rather than before answer
 * submission.
 */
export function getResourcesForQuizQuestion(
	catalogue: ResourceHubCatalogue,
	questionId: number,
): ResourceHubLinkedResource[] {
	return resolveLinkedResources(
		catalogue,
		catalogue.quizQuestionLinks.filter(
			(link) => link.question_id === questionId,
		),
	);
}


export function getPrimaryResourceForQuizQuestion(
	catalogue: ResourceHubCatalogue,
	questionId: number,
): SafetyResource | null {
	const linkedResources =
		getResourcesForQuizQuestion(catalogue, questionId);

	return linkedResources.find(
		(item) => item.linkRole === 'primary',
	)?.resource ?? null;
}