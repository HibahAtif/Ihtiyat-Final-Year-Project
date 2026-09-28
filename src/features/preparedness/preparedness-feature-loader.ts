import type {
    LocationRecord,
} from '@/profile/profile-types';

import {
    resolveLocationHazards,
} from '@/location/location-hazard-service';

import {
    resolvePreparednessMissionTasks,
} from './adaptive-mission-resolver';

import {
    loadPreparednessCatalogue,
} from './preparedness-catalogue-service';

import {
    loadPreparednessCatalogueCache,
    loadPreparednessLocationHazardCache,
    savePreparednessCatalogueCache,
    savePreparednessLocationHazardCache,
} from './preparedness-cache-repository';

import type {
    PreparednessCatalogue,
} from './preparedness-catalogue-service';

import type {
    PreparednessMissionResolution,
    PreparednessResolvedHazard,
} from './preparedness-types';



export type PreparednessFeatureSnapshot = {
    activeLocation: LocationRecord | null;
    resolvedHazards: PreparednessResolvedHazard[] | null;
    missions: PreparednessMissionResolution[];
};


/**
 * WHAT:
 * Lists the external data operations used by the preparedness orchestrator.
 *
 * WHY:
 * The orchestration rules should be testable without Supabase or device
 * services. Dependency injection also keeps this layer independent from React,
 * so a future provider can call it using ActiveLocationProvider state.
 *
 * HOW:
 * Production defaults to the real preparedness catalogue, location-hazard and
 * SQLite cache services. Focused Jest tests can substitute deterministic
 * implementations for every external operation.
 */
export type PreparednessFeatureDependencies = {
    loadPreparednessCatalogue:
        typeof loadPreparednessCatalogue;

    resolveLocationHazards:
        typeof resolveLocationHazards;

    savePreparednessCatalogueCache:
        typeof savePreparednessCatalogueCache;

    loadPreparednessCatalogueCache:
        typeof loadPreparednessCatalogueCache;

    savePreparednessLocationHazardCache:
        typeof savePreparednessLocationHazardCache;

    loadPreparednessLocationHazardCache:
        typeof loadPreparednessLocationHazardCache;
};


const defaultDependencies:
    PreparednessFeatureDependencies = {
        loadPreparednessCatalogue,
        resolveLocationHazards,
        savePreparednessCatalogueCache,
        loadPreparednessCatalogueCache,
        savePreparednessLocationHazardCache,
        loadPreparednessLocationHazardCache,
    };

/**
 * WHAT:
 * Builds one preparedness feature snapshot from already-loaded catalogue and
 * location-hazard data.
 *
 * WHY:
 * Online Supabase data and offline SQLite data must pass through the same
 * adaptive mission logic. Keeping snapshot construction here prevents the
 * offline path from reimplementing preparedness rules.
 *
 * HOW:
 * The supplied catalogue is resolved mission-by-mission using the existing
 * deterministic adaptive mission resolver.
*/
export function buildPreparednessFeatureSnapshot(
    activeLocation: LocationRecord | null,
    catalogue: PreparednessCatalogue,
    resolvedHazards: PreparednessResolvedHazard[] | null,
): PreparednessFeatureSnapshot {
    if (
        activeLocation
        && !activeLocation.is_active
    ) {
        throw new Error(
            'Preparedness content cannot be resolved for an inactive Ihtiyat location.',
        );
    }


    if (
        !activeLocation
        && resolvedHazards !== null
    ) {
        throw new Error(
            'Preparedness hazards cannot be supplied without an active Ihtiyat location.',
        );
    }


    const missions =
        catalogue.missions.map(
            (mission) =>
                resolvePreparednessMissionTasks(
                    mission,
                    catalogue.tasks,
                    resolvedHazards,
                ),
        );


    return {
        activeLocation,
        resolvedHazards,
        missions,
    };
}

type PreparednessFeatureData = {
    catalogue: PreparednessCatalogue;
    resolvedHazards:
        PreparednessResolvedHazard[] | null;
};


/**
 * Loads the canonical preparedness data from the online services.
 */
async function loadOnlinePreparednessData(
    activeLocation: LocationRecord | null,
    dependencies:
        PreparednessFeatureDependencies,
): Promise<PreparednessFeatureData> {
    const cataloguePromise =
        dependencies
            .loadPreparednessCatalogue();


    if (!activeLocation) {
        return {
            catalogue:
                await cataloguePromise,

            resolvedHazards:
                null,
        };
    }


    const [
        catalogue,
        resolvedHazards,
    ] = await Promise.all([
        cataloguePromise,

        dependencies
            .resolveLocationHazards(
                activeLocation.id,
            ),
    ]);


    return {
        catalogue,
        resolvedHazards,
    };
}


/**
 * Attempts to restore one coherent preparedness payload from SQLite.
 *
 * null means that the cache is not sufficient to reproduce the requested
 * online result safely.
 */
async function loadCachedPreparednessData(
    activeLocation: LocationRecord | null,
    dependencies:
        PreparednessFeatureDependencies,
): Promise<PreparednessFeatureData | null> {
    const catalogue =
        await dependencies
            .loadPreparednessCatalogueCache();


    if (catalogue === null) {
        return null;
    }


    if (!activeLocation) {
        return {
            catalogue,
            resolvedHazards:
                null,
        };
    }


    const resolvedHazards =
        await dependencies
            .loadPreparednessLocationHazardCache(
                activeLocation.id,
            );


    /*
     * null means this particular location has never been cached.
     *
     * [] is deliberately valid and means the location was successfully
     * resolved with zero prioritised hazards.
     */
    if (resolvedHazards === null) {
        return null;
    }


    return {
        catalogue,
        resolvedHazards,
    };
}


/**
 * Runs one local cache write without allowing SQLite persistence failure to
 * invalidate an otherwise successful online preparedness load.
 */
async function attemptPreparednessCacheWrite(
    operation:
        () => Promise<void>,
): Promise<void> {
    try {
        await operation();
    } catch {
        /*
         * The fresh online result remains valid.
         *
         * Offline persistence is best-effort here and must not become a
         * prerequisite for normal connected use.
         */
    }
}


/**
 * Stores the raw online preparedness payload for later offline use.
 */
async function cachePreparednessData(
    activeLocation: LocationRecord | null,
    catalogue: PreparednessCatalogue,
    resolvedHazards:
        PreparednessResolvedHazard[] | null,
    dependencies:
        PreparednessFeatureDependencies,
): Promise<void> {
    const writes: Promise<void>[] = [
        attemptPreparednessCacheWrite(
            () =>
                dependencies
                    .savePreparednessCatalogueCache(
                        catalogue,
                    ),
        ),
    ];


    if (
        activeLocation
        && resolvedHazards !== null
    ) {
        writes.push(
            attemptPreparednessCacheWrite(
                () =>
                    dependencies
                        .savePreparednessLocationHazardCache(
                            activeLocation.id,
                            resolvedHazards,
                        ),
            ),
        );
    }


    await Promise.all(
        writes,
    );
}


/**
 * WHAT:
 * Builds the location-aware preparedness snapshot consumed by the React
 * provider and Missions UI.
 *
 * WHY:
 * Preparedness guidance should use the canonical Supabase-backed data when
 * available while remaining usable from previously cached SQLite data during
 * temporary network or backend failure.
 *
 * HOW:
 * - the active preparedness catalogue and, when applicable, location hazards
 *   are requested from the online services;
 * - a successful online payload is resolved through the shared adaptive
 *   mission logic and then persisted to SQLite on a best-effort basis;
 * - if the online data load fails, one coherent cached catalogue and
 *   location-hazard result are requested instead;
 * - cached null means the required data has never been stored and the original
 *   online failure is rethrown;
 * - cached [] remains a valid resolved location with zero prioritised hazards;
 * - both online and cached data pass through
 *   buildPreparednessFeatureSnapshot(), preventing different preparedness
 *   rules from emerging between connected and offline operation.
 *
 * Snapshot construction deliberately remains outside the online-loading catch
 * so domain or programming failures are not mistaken for connectivity
 * failures and hidden by stale cached data.
*/
export async function loadPreparednessFeatureSnapshot(
    activeLocation: LocationRecord | null,
    dependencies:
        PreparednessFeatureDependencies =
            defaultDependencies,
): Promise<PreparednessFeatureSnapshot> {
    if (
        activeLocation
        && !activeLocation.is_active
    ) {
        throw new Error(
            'Preparedness content cannot be resolved for an inactive Ihtiyat location.',
        );
    }


    let onlineData:
        PreparednessFeatureData;


    try {
        onlineData =
            await loadOnlinePreparednessData(
                activeLocation,
                dependencies,
            );
    } catch (onlineError) {
        const cachedData =
            await loadCachedPreparednessData(
                activeLocation,
                dependencies,
            );


        if (cachedData === null) {
            throw onlineError;
        }


        return buildPreparednessFeatureSnapshot(
            activeLocation,
            cachedData.catalogue,
            cachedData.resolvedHazards,
        );
    }


    /*
     * Snapshot construction deliberately happens outside the online-load
     * catch. A domain-logic/programming error must not be mistaken for a
     * connectivity failure and silently hidden by stale cached data.
     */
    const snapshot =
        buildPreparednessFeatureSnapshot(
            activeLocation,
            onlineData.catalogue,
            onlineData.resolvedHazards,
        );


    await cachePreparednessData(
        activeLocation,
        onlineData.catalogue,
        onlineData.resolvedHazards,
        dependencies,
    );


    return snapshot;
}