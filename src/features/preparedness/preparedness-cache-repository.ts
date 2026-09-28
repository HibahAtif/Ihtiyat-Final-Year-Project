import type {
    PreparednessCatalogue,
} from './preparedness-catalogue-service';

import type {
    PreparednessMission,
    PreparednessMissionTask,
    PreparednessResolvedHazard,
} from './preparedness-types';

import {
    getIhtiyatDatabase,
} from '@/storage/ihtiyat-database';


const PREPAREDNESS_CATALOGUE_CACHE_KEY =
    'preparedness.catalogue';


type CacheMetadataRow = {
    cached_at: string;
};


type CachedPreparednessMissionRow = {
    id: number;
    code: string;
    title_en: string;
    title_ar: string;
    description_en: string;
    description_ar: string;
    mission_scope: string;
    sort_order: number;
    is_active: number;
};


type CachedPreparednessTaskRow = {
    id: number;
    mission_id: number;
    hazard_id: number | null;
    code: string;
    title_en: string;
    title_ar: string;
    detail_en: string | null;
    detail_ar: string | null;
    points: number;
    sort_order: number;
    is_active: number;
};


type CachedPreparednessHazardRow = {
    hazard_id: number;
    hazard_code: string;
    hazard_name_en: string;
    hazard_name_ar: string;
    classification: string;
    hazard_sort_order: number;
    is_prioritised: number;
    relevance_rank: number | null;
    matched_location_id: number | null;
    matched_location_code: string | null;
    matched_location_type: string | null;
    matched_location_name_en: string | null;
    matched_location_name_ar: string | null;
    hierarchy_distance: number | null;
};


/**
 * Produces the metadata key belonging to one location's cached hazard result.
 *
 * The metadata row is required even when the resolver legitimately returned
 * zero rows. Its presence therefore distinguishes an empty cached result from
 * a location that has never been cached.
 */
function getLocationHazardCacheKey(
    locationId: number,
): string {
    return `preparedness.location-hazards.${locationId}`;
}


/**
 * Guards location-scoped cache operations against invalid identifiers.
 */
function assertValidLocationId(
    locationId: number,
): void {
    if (
        !Number.isInteger(
            locationId,
        )
        || locationId <= 0
    ) {
        throw new Error(
            'Preparedness cache requires a positive integer location ID.',
        );
    }
}


/**
 * Replaces the locally cached preparedness catalogue atomically.
 *
 * Supabase remains canonical. A successful online catalogue load can call this
 * function to retain the same app-facing mission/task payload for later
 * offline use.
 */
export async function savePreparednessCatalogueCache(
    catalogue: PreparednessCatalogue,
    cachedAt:
        string = new Date().toISOString(),
): Promise<void> {
    const database =
        await getIhtiyatDatabase();


    await database.withExclusiveTransactionAsync(
        async (
            transaction,
        ): Promise<void> => {
            /*
             * Tasks must be removed before missions because the local task
             * table has a foreign key to the mission cache.
             */
            await transaction.runAsync(
                'DELETE FROM preparedness_task_cache;',
            );

            await transaction.runAsync(
                'DELETE FROM preparedness_mission_cache;',
            );


            for (
                const mission
                of catalogue.missions
            ) {
                await transaction.runAsync(
                    `
                        INSERT INTO preparedness_mission_cache (
                            id,
                            code,
                            title_en,
                            title_ar,
                            description_en,
                            description_ar,
                            mission_scope,
                            sort_order,
                            is_active
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                    `,
                    mission.id,
                    mission.code,
                    mission.title_en,
                    mission.title_ar,
                    mission.description_en,
                    mission.description_ar,
                    mission.mission_scope,
                    mission.sort_order,
                    mission.is_active
                        ? 1
                        : 0,
                );
            }


            for (
                const task
                of catalogue.tasks
            ) {
                await transaction.runAsync(
                    `
                        INSERT INTO preparedness_task_cache (
                            id,
                            mission_id,
                            hazard_id,
                            code,
                            title_en,
                            title_ar,
                            detail_en,
                            detail_ar,
                            points,
                            sort_order,
                            is_active
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                    `,
                    task.id,
                    task.mission_id,
                    task.hazard_id,
                    task.code,
                    task.title_en,
                    task.title_ar,
                    task.detail_en,
                    task.detail_ar,
                    task.points,
                    task.sort_order,
                    task.is_active
                        ? 1
                        : 0,
                );
            }


            await transaction.runAsync(
                `
                    INSERT INTO preparedness_cache_metadata (
                        cache_key,
                        cached_at
                    )
                    VALUES (?, ?)
                    ON CONFLICT(cache_key)
                    DO UPDATE SET
                        cached_at = excluded.cached_at;
                `,
                PREPAREDNESS_CATALOGUE_CACHE_KEY,
                cachedAt,
            );
        },
    );
}


/**
 * Restores the previously cached preparedness catalogue.
 *
 * null means no successful catalogue has ever been cached. An object containing
 * empty arrays is different: it represents a successfully cached empty
 * catalogue.
 */
export async function loadPreparednessCatalogueCache():
    Promise<PreparednessCatalogue | null> {
    const database =
        await getIhtiyatDatabase();


    const metadata =
        await database.getFirstAsync<CacheMetadataRow>(
            `
                SELECT cached_at
                FROM preparedness_cache_metadata
                WHERE cache_key = ?;
            `,
            PREPAREDNESS_CATALOGUE_CACHE_KEY,
        );


    if (!metadata) {
        return null;
    }


    const missionRows =
        await database.getAllAsync<CachedPreparednessMissionRow>(
            `
                SELECT
                    id,
                    code,
                    title_en,
                    title_ar,
                    description_en,
                    description_ar,
                    mission_scope,
                    sort_order,
                    is_active
                FROM preparedness_mission_cache
                ORDER BY
                    sort_order ASC,
                    id ASC;
            `,
        );


    const taskRows =
        await database.getAllAsync<CachedPreparednessTaskRow>(
            `
                SELECT
                    id,
                    mission_id,
                    hazard_id,
                    code,
                    title_en,
                    title_ar,
                    detail_en,
                    detail_ar,
                    points,
                    sort_order,
                    is_active
                FROM preparedness_task_cache
                ORDER BY
                    mission_id ASC,
                    sort_order ASC,
                    id ASC;
            `,
        );


    const missions:
        PreparednessMission[] =
            missionRows.map(
                (row) => ({
                    ...row,
                    is_active:
                        row.is_active === 1,
                }),
            );


    const tasks:
        PreparednessMissionTask[] =
            taskRows.map(
                (row) => ({
                    ...row,
                    is_active:
                        row.is_active === 1,
                }),
            );


    return {
        missions,
        tasks,
    };
}


/**
 * Replaces the cached hazard resolution for one requested location.
 *
 * Each location is isolated so switching location never destroys a previously
 * cached result belonging to another location.
 */
export async function savePreparednessLocationHazardCache(
    locationId: number,
    hazards: PreparednessResolvedHazard[],
    cachedAt:
        string = new Date().toISOString(),
): Promise<void> {
    assertValidLocationId(
        locationId,
    );


    const database =
        await getIhtiyatDatabase();

    const metadataKey =
        getLocationHazardCacheKey(
            locationId,
        );


    await database.withExclusiveTransactionAsync(
        async (
            transaction,
        ): Promise<void> => {
            await transaction.runAsync(
                `
                    DELETE FROM preparedness_location_hazard_cache
                    WHERE requested_location_id = ?;
                `,
                locationId,
            );


            for (
                const hazard
                of hazards
            ) {
                await transaction.runAsync(
                    `
                        INSERT INTO preparedness_location_hazard_cache (
                            requested_location_id,
                            hazard_id,
                            hazard_code,
                            hazard_name_en,
                            hazard_name_ar,
                            classification,
                            hazard_sort_order,
                            is_prioritised,
                            relevance_rank,
                            matched_location_id,
                            matched_location_code,
                            matched_location_type,
                            matched_location_name_en,
                            matched_location_name_ar,
                            hierarchy_distance
                        )
                        VALUES (
                            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                        );
                    `,
                    locationId,
                    hazard.hazard_id,
                    hazard.hazard_code,
                    hazard.hazard_name_en,
                    hazard.hazard_name_ar,
                    hazard.classification,
                    hazard.hazard_sort_order,
                    hazard.is_prioritised
                        ? 1
                        : 0,
                    hazard.relevance_rank,
                    hazard.matched_location_id,
                    hazard.matched_location_code,
                    hazard.matched_location_type,
                    hazard.matched_location_name_en,
                    hazard.matched_location_name_ar,
                    hazard.hierarchy_distance,
                );
            }


            await transaction.runAsync(
                `
                    INSERT INTO preparedness_cache_metadata (
                        cache_key,
                        cached_at
                    )
                    VALUES (?, ?)
                    ON CONFLICT(cache_key)
                    DO UPDATE SET
                        cached_at = excluded.cached_at;
                `,
                metadataKey,
                cachedAt,
            );
        },
    );
}


/**
 * Restores the cached hazard resolution for one location.
 *
 * null means that location has never been successfully cached. [] means the
 * location was successfully resolved and its cached result contained no rows.
 */
export async function loadPreparednessLocationHazardCache(
    locationId: number,
): Promise<PreparednessResolvedHazard[] | null> {
    assertValidLocationId(
        locationId,
    );


    const database =
        await getIhtiyatDatabase();

    const metadataKey =
        getLocationHazardCacheKey(
            locationId,
        );


    const metadata =
        await database.getFirstAsync<CacheMetadataRow>(
            `
                SELECT cached_at
                FROM preparedness_cache_metadata
                WHERE cache_key = ?;
            `,
            metadataKey,
        );


    if (!metadata) {
        return null;
    }


    const rows =
        await database.getAllAsync<CachedPreparednessHazardRow>(
            `
                SELECT
                    hazard_id,
                    hazard_code,
                    hazard_name_en,
                    hazard_name_ar,
                    classification,
                    hazard_sort_order,
                    is_prioritised,
                    relevance_rank,
                    matched_location_id,
                    matched_location_code,
                    matched_location_type,
                    matched_location_name_en,
                    matched_location_name_ar,
                    hierarchy_distance
                FROM preparedness_location_hazard_cache
                WHERE requested_location_id = ?
                ORDER BY
                    is_prioritised DESC,
                    relevance_rank ASC,
                    hierarchy_distance ASC,
                    hazard_sort_order ASC,
                    hazard_id ASC;
            `,
            locationId,
        );


    return rows.map(
        (row) => ({
            ...row,
            is_prioritised:
                row.is_prioritised === 1,
        }),
    );
}