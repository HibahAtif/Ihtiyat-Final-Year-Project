import {
	loadAlertsActionCatalogue,
} from './alerts-action-catalogue-service';

import {
	loadAlertsActionCache,
	saveAlertsActionCache,
} from './alerts-action-cache-repository';

import type {
	AlertsActionCacheSnapshot,
} from './alerts-action-cache-repository';


/**
 * Identifies whether the current canonical alert/action snapshot came directly
 * from Supabase or from the last successful SQLite cache.
 *
 * This is deliberately kept outside the catalogue itself so local delivery
 * state does not contaminate canonical safety content.
 */
export type AlertsActionLoadSource =
	| 'remote'
	| 'cache';


/**
 * Result returned by the online-first alert/action loader.
 *
 * Both sources expose the same catalogue structure. Downstream derivation and
 * evaluation therefore do not need separate online and offline code paths.
 */
export type AlertsActionLoadResult = {
	catalogue: AlertsActionCacheSnapshot;
	source: AlertsActionLoadSource;
};


/**
 * External operations required by the online-first loader.
 *
 * Dependency injection keeps fallback behaviour independently testable and
 * avoids requiring live Supabase or Expo SQLite during focused unit tests.
 */
export type AlertsActionFeatureDependencies = {
	loadAlertsActionCatalogue:
		typeof loadAlertsActionCatalogue;

	saveAlertsActionCache:
		typeof saveAlertsActionCache;

	loadAlertsActionCache:
		typeof loadAlertsActionCache;
};


const defaultDependencies:
	AlertsActionFeatureDependencies = {
		loadAlertsActionCatalogue,
		saveAlertsActionCache,
		loadAlertsActionCache,
	};


/**
 * Attempts to persist a successful online catalogue without allowing a local
 * SQLite failure to invalidate fresh remote data.
 *
 * Supabase remains canonical. Offline persistence improves resilience but is
 * not a prerequisite for successful connected use.
 */
async function attemptCacheWrite(
	catalogue: AlertsActionCacheSnapshot,
	dependencies: AlertsActionFeatureDependencies,
): Promise<void> {
	try {
		await dependencies
			.saveAlertsActionCache(
				catalogue,
			);
	} catch {
		/*
		 * Intentionally ignored.
		 *
		 * The remote catalogue has already loaded successfully. Reporting the
		 * feature as failed because the optional resilience cache could not be
		 * updated would discard otherwise valid fresh safety content.
		 */
	}
}


/**
 * Loads the canonical public alert/action catalogue using an online-first
 * strategy with SQLite fallback.
 *
 * WHAT:
 * Attempts Supabase first and falls back to the last coherent V4 SQLite
 * snapshot only when the remote catalogue cannot be loaded.
 *
 * WHY:
 * Ihtiyat should prefer current canonical public safety content while still
 * remaining useful during temporary network disruption.
 *
 * HOW:
 * - successful remote data is returned immediately as source='remote';
 * - the same successful snapshot is persisted to SQLite on a best-effort basis;
 * - a remote failure triggers one SQLite recovery attempt;
 * - a cached empty snapshot remains valid because repository metadata
 *   distinguishes it from a cache that has never been populated;
 * - if no usable cache exists, the original remote error is rethrown.
 *
 * The loader deliberately does not perform location matching, severity
 * override, task-progress inspection, household evaluation or action ranking.
 */
export async function loadAlertsActionFeature(
	dependencies:
		AlertsActionFeatureDependencies =
			defaultDependencies,
): Promise<AlertsActionLoadResult> {
	try {
		const remoteCatalogue =
			await dependencies
				.loadAlertsActionCatalogue();


		await attemptCacheWrite(
			remoteCatalogue,
			dependencies,
		);


		return {
			catalogue:
				remoteCatalogue,
			source:
				'remote',
		};
	} catch (
		remoteError
	) {
		/*
		 * Cache recovery itself is protected separately.
		 *
		 * If SQLite cannot be read, the remote failure remains the meaningful
		 * feature-level cause and should be preserved rather than replaced by
		 * an implementation-specific local storage error.
		 */
		try {
			const cachedCatalogue =
				await dependencies
					.loadAlertsActionCache();


			if (
				cachedCatalogue !== null
			) {
				return {
					catalogue:
						cachedCatalogue,
					source:
						'cache',
				};
			}
		} catch {
			/*
			 * Ignore the secondary cache-recovery failure and preserve the
			 * original remote exception below.
			 */
		}


		throw remoteError;
	}
}