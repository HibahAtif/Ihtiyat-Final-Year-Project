import {
    loadMissionTaskProgress,
} from './mission-progress-service';

import {
    loadMissionTaskProgressCache,
    loadMissionTaskProgressOutbox,
    replaceMissionTaskProgressCache,
} from './mission-progress-local-repository';

import {
    syncPendingMissionTaskProgress,
} from './mission-progress-sync-service';

import type {
    MissionTaskProgress,
} from './mission-progress-types';

import type {
    LocalMissionTaskProgress,
    MissionTaskProgressOutboxItem,
} from './mission-progress-local-repository';


/**
 * Represents the best currently available authenticated mission-progress state.
 *
 * progress contains the state that should be presented to the application.
 * pendingTaskIds identifies tasks whose latest local state has not yet been
 * confirmed and canonicalised by Supabase.
*/
export type ResilientMissionTaskProgress = {
    progress:
        LocalMissionTaskProgress[];

    pendingTaskIds:
        number[];
};


/**
 * WHAT:
 * Converts one canonical Supabase mission-progress row into the smaller local
 * progress representation used by the application.
 *
 * WHY:
 * created_at is authoritative server history but is not required for
 * checklist rendering, offline progress or conflict handling.
 *
 * HOW:
 * The fields shared with LocalMissionTaskProgress are copied directly from the
 * canonical row.
 */
function toLocalMissionTaskProgress(
    progress:
        MissionTaskProgress,
): LocalMissionTaskProgress {
    return {
        user_id:
            progress.user_id,
        task_id:
            progress.task_id,
        is_completed:
            progress.is_completed,
        completed_at:
            progress.completed_at,
        updated_at:
            progress.updated_at,
    };
}


/**
 * WHAT:
 * Converts one pending outbox item into the locally visible progress state it
 * represents.
 *
 * WHY:
 * A pending item is the user's newest unsynchronised intention and therefore
 * takes precedence over an older Supabase value for the same task.
 *
 * HOW:
 * queued_at acts as the provisional local update time. Completed tasks use it
 * as their provisional completion timestamp, while incomplete tasks have no
 * completion timestamp.
 */
function pendingItemToLocalProgress(
    pendingItem:
        MissionTaskProgressOutboxItem,
): LocalMissionTaskProgress {
    return {
        user_id:
            pendingItem.user_id,
        task_id:
            pendingItem.task_id,
        is_completed:
            pendingItem.is_completed,
        completed_at:
            pendingItem.is_completed
                ? pendingItem.queued_at
                : null,
        updated_at:
            pendingItem.queued_at,
    };
}


/**
 * WHAT:
 * Applies any still-pending local mission changes over a base progress
 * snapshot.
 *
 * WHY:
 * Fresh Supabase data may still be older than a local action that has not yet
 * synchronised. The latest local intention must not be overwritten merely
 * because the remote read succeeded.
 *
 * HOW:
 * Progress is indexed by task ID, then each pending outbox item replaces or
 * adds that task's locally visible state. The final array is sorted by task ID
 * for deterministic consumers and tests.
 */
function mergePendingMissionTaskProgress(
    baseProgress:
        LocalMissionTaskProgress[],
    pendingItems:
        MissionTaskProgressOutboxItem[],
): LocalMissionTaskProgress[] {
    const progressByTaskId =
        new Map<
            number,
            LocalMissionTaskProgress
        >();


    for (
        const progressItem
        of baseProgress
    ) {
        progressByTaskId.set(
            progressItem.task_id,
            progressItem,
        );
    }


    for (
        const pendingItem
        of pendingItems
    ) {
        progressByTaskId.set(
            pendingItem.task_id,
            pendingItemToLocalProgress(
                pendingItem,
            ),
        );
    }


    return Array
        .from(
            progressByTaskId.values(),
        )
        .sort(
            (
                first,
                second,
            ) =>
                first.task_id
                - second.task_id,
        );
}


/**
 * WHAT:
 * Refreshes the local canonical progress cache without allowing a local cache
 * write failure to invalidate successfully loaded Supabase data.
 *
 * WHY:
 * Supabase remains the canonical backend. SQLite is the resilience layer, so a
 * failed cache refresh must not turn a successful online read into an
 * application-level failure.
 *
 * HOW:
 * Cache persistence is attempted and deliberately treated as best-effort.
 */
async function attemptMissionProgressCacheRefresh(
    userId: string,
    progress:
        MissionTaskProgress[],
): Promise<void> {
    try {
        await replaceMissionTaskProgressCache(
            userId,
            progress,
        );
    } catch {
        /*
         * Fresh remote progress remains valid even when the local resilience
         * layer cannot currently be refreshed.
         */
    }
}


/**
 * WHAT:
 * Loads the best currently available mission-task progress for one
 * authenticated Ihtiyat user.
 *
 * WHY:
 * Mission progress must remain usable during temporary network failure while
 * also protecting newer local changes from being overwritten by older server
 * state.
 *
 * HOW:
 * The loader:
 *
 * 1. attempts to replay pending local progress first;
 * 2. reloads the outbox to discover which changes still remain pending;
 * 3. requests the canonical Supabase progress snapshot;
 * 4. when the remote request succeeds:
 *    - refreshes SQLite only when no pending local intentions remain;
 *    - overlays remaining pending intentions over the remote snapshot;
 * 5. when the remote request fails:
 *    - requests the user's cached SQLite progress;
 *    - preserves cached [] as a valid successfully cached empty result;
 *    - overlays any remaining pending intentions over the cached state;
 *    - rethrows the original remote error when no cache exists.
 *
 * Synchronisation and local repository integrity failures occur outside the
 * remote-loading fallback boundary and are therefore not disguised as ordinary
 * connectivity failures.
 */
export async function loadResilientMissionTaskProgress(
    userId: string,
): Promise<ResilientMissionTaskProgress> {
    /*
     * Any pending progress is given an opportunity to reach Supabase before a
     * fresh canonical snapshot is requested.
     *
     * Integrity failures from this operation deliberately propagate.
     */
    await syncPendingMissionTaskProgress(
        userId,
    );


    /*
     * Reload after synchronisation rather than relying on the sync summary.
     *
     * Some items may have been committed successfully while others may still
     * be pending, and a newer state may also have replaced an in-flight item.
     * The outbox itself is therefore the authoritative source of what remains.
     */
    const pendingItems =
        await loadMissionTaskProgressOutbox(
            userId,
        );

    const pendingTaskIds =
        pendingItems.map(
            (
                pendingItem,
            ) =>
                pendingItem.task_id,
        );


    let remoteProgress:
        MissionTaskProgress[];


    try {
        /*
         * Only the canonical remote read belongs inside this catch.
         *
         * Local repository or merge failures must not accidentally be
         * interpreted as connectivity failures and hidden by stale cache.
         */
        remoteProgress =
            await loadMissionTaskProgress(
                userId,
            );
    } catch (
        onlineError
    ) {
        const cachedProgress =
            await loadMissionTaskProgressCache(
                userId,
            );


        if (
            cachedProgress === null
        ) {
            /*
             * Preserve the exact original Supabase failure so callers retain
             * the meaningful reason that progress could not be loaded.
             */
            throw onlineError;
        }


        return {
            progress:
                mergePendingMissionTaskProgress(
                    cachedProgress,
                    pendingItems,
                ),

            pendingTaskIds,
        };
    }


    const localRemoteProgress =
        remoteProgress.map(
            toLocalMissionTaskProgress,
        );


    if (
        pendingItems.length === 0
    ) {
        /*
         * With no outstanding local intentions, the remote snapshot is safe to
         * treat as the complete canonical cache replacement.
         */
        await attemptMissionProgressCacheRefresh(
            userId,
            remoteProgress,
        );


        return {
            progress:
                localRemoteProgress,

            pendingTaskIds:
                [],
        };
    }


    /*
     * Do not replace the complete SQLite cache while pending local intentions
     * remain. A whole-cache replacement could erase states that are newer than
     * the Supabase snapshot.
     *
     * The returned view can still safely combine fresh remote rows with those
     * pending local intentions.
     */
    return {
        progress:
            mergePendingMissionTaskProgress(
                localRemoteProgress,
                pendingItems,
            ),

        pendingTaskIds,
    };
}