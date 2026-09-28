import {
	loadResourceHubCatalogue,
} from './resource-hub-service';

import {
	loadResourceHubCatalogueCache,
	saveResourceHubCatalogueCache,
} from './resource-hub-cache-repository';

import type {
	ResourceHubCatalogue,
} from './resource-hub-types';


export type ResourceHubLoadSource =
	| 'remote'
	| 'cache';


export type ResourceHubLoadResult = {
	catalogue: ResourceHubCatalogue;
	source: ResourceHubLoadSource;
};


/**
 * External operations required by the Resource Hub online-first loader.
 *
 * Dependency injection keeps the fallback policy testable without requiring
 * live Supabase access or an Expo SQLite database.
*/
export type ResourceHubFeatureDependencies = {
	loadResourceHubCatalogue:
		typeof loadResourceHubCatalogue;

	saveResourceHubCatalogueCache:
		typeof saveResourceHubCatalogueCache;

	loadResourceHubCatalogueCache:
		typeof loadResourceHubCatalogueCache;
};


const defaultDependencies:
	ResourceHubFeatureDependencies = {
		loadResourceHubCatalogue,
		saveResourceHubCatalogueCache,
		loadResourceHubCatalogueCache,
	};


/**
 * Attempts to refresh the durable Resource Hub snapshot without allowing a
 * local SQLite failure to invalidate successfully downloaded canonical data.
*/
async function attemptResourceHubCacheWrite(
	catalogue: ResourceHubCatalogue,
	dependencies: ResourceHubFeatureDependencies,
): Promise<void> {
	try {
		await dependencies.saveResourceHubCatalogueCache(
			catalogue,
		);
	} catch {
		/*
		 * Best-effort persistence only.
		 *
		 * Supabase has already returned valid canonical safety content, so a
		 * secondary SQLite failure must not make connected Resource Hub use
		 * fail.
		*/
	}
}


/**
 * Loads the public Resource Hub using Supabase first and the last coherent V5
 * SQLite snapshot as an offline fallback.
 *
 * A successful remote result always wins over cached data. An explicitly empty
 * cached catalogue remains valid because repository metadata distinguishes it
 * from a device that has never successfully cached Resource Hub content.
 *
 * If both the remote operation and fallback cache read fail, the original
 * remote error is preserved because it represents the primary feature failure.
*/
export async function loadResourceHubFeature(
	dependencies:
		ResourceHubFeatureDependencies =
			defaultDependencies,
): Promise<ResourceHubLoadResult> {
	try {
		const remoteCatalogue =
			await dependencies.loadResourceHubCatalogue();

		await attemptResourceHubCacheWrite(
			remoteCatalogue,
			dependencies,
		);

		return {
			catalogue: remoteCatalogue,
			source: 'remote',
		};
	} catch (remoteError: unknown) {
		try {
			const cachedCatalogue =
				await dependencies.loadResourceHubCatalogueCache();

			if (cachedCatalogue !== null) {
				return {
					catalogue: cachedCatalogue,
					source: 'cache',
				};
			}
		} catch {
			/*
			 * Preserve the original remote exception rather than replacing it
			 * with a secondary SQLite recovery error.
			*/
		}

		throw remoteError;
	}
}