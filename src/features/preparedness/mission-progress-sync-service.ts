import {
    setMissionTaskCompletion,
} from './mission-progress-service';

import {
    commitSyncedMissionTaskProgress,
    loadMissionTaskProgressOutbox,
    stageMissionTaskCompletion,
} from './mission-progress-local-repository';

import type {
    MissionTaskProgressOutboxItem,
} from './mission-progress-local-repository';


/**
 * Summarises one attempt to synchronise the authenticated user's pending
 * mission-progress outbox.
 */
export type MissionProgressSyncSummary = {
    attempted: number;
    synced: number;
    pending: number;
};


/**
 * WHAT:
 * Persists one authenticated mission-task change locally first and then
 * immediately attempts to synchronise that exact change with Supabase.
 *
 * WHY:
 * A checklist interaction should remain durable even when connectivity fails
 * immediately after the user changes it. SQLite therefore records the user's
 * latest intent before any network operation is attempted.
 *
 * HOW:
 * - the desired completion state is staged atomically in the local progress
 *   cache and outbox;
 * - Supabase is then asked to persist the same completion state;
 * - a successful remote result is committed locally only if the exact outbox
 *   item is still pending;
 * - a remote failure leaves the locally staged state and outbox untouched;
 * - false is also returned when a newer local change replaced this exact
 *   outbox item while the network request was in flight.
 *
 * Returns true only when this exact task change has been synchronised and
 * canonicalised locally. Returns false when the change remains pending.
 */
export async function setResilientMissionTaskCompletion(
    userId: string,
    taskId: number,
    isCompleted: boolean,
    queuedAt:
        string = new Date().toISOString(),
): Promise<boolean> {
    /*
     * Local staging deliberately happens before Supabase. If this fails, the
     * user's change was not safely persisted and the error must propagate.
     */
    await stageMissionTaskCompletion(
        userId,
        taskId,
        isCompleted,
        queuedAt,
    );


    const pendingItem:
        MissionTaskProgressOutboxItem = {
            user_id:
                userId,
            task_id:
                taskId,
            is_completed:
                isCompleted,
            queued_at:
                queuedAt,
        };


    try {
        const syncedProgress =
            await setMissionTaskCompletion(
                userId,
                taskId,
                isCompleted,
            );


        /*
         * This repository call performs the stale-response guard. A false
         * result means a newer local state replaced the exact item sent above,
         * so the newer state remains pending and must not be overwritten.
         */
        return await commitSyncedMissionTaskProgress(
            pendingItem,
            syncedProgress,
        );
    } catch (
        error
    ) {
        /*
         * Remote persistence failure is an expected resilience case.
         *
         * Do not undo the SQLite state and do not remove the outbox item.
         * It can be retried by syncPendingMissionTaskProgress().
         *
         * Local repository integrity failures must not be hidden here. They
         * originate after Supabase succeeds and indicate an inconsistent
         * canonical result rather than ordinary remote unavailability.
         */
        if (
            error instanceof Error
            && error.message
                === 'Synced mission progress does not match the pending outbox item.'
        ) {
            throw error;
        }


        return false;
    }
}


/**
 * WHAT:
 * Attempts to synchronise all currently pending mission-progress changes for
 * one authenticated user.
 *
 * WHY:
 * Changes made while Supabase was unavailable remain in the SQLite outbox.
 * They need a deterministic replay path when synchronisation is attempted
 * again.
 *
 * HOW:
 * Pending rows are supplied by the local repository in queue order. Each item
 * is independently sent to Supabase:
 *
 * - a successful remote write is committed only if that exact local outbox
 *   item is still current;
 * - a remote write failure leaves that item pending but does not prevent later
 *   tasks from being attempted;
 * - a false commit result means a newer local state replaced the item while
 *   its request was in flight, so it remains counted as pending;
 * - local integrity failures are propagated rather than disguised as network
 *   failures.
 */
export async function syncPendingMissionTaskProgress(
    userId: string,
): Promise<MissionProgressSyncSummary> {
    const pendingItems =
        await loadMissionTaskProgressOutbox(
            userId,
        );


    let synced =
        0;

    let pending =
        0;


    for (
        const pendingItem of pendingItems
    ) {
        let syncedProgress;


        try {
            syncedProgress =
                await setMissionTaskCompletion(
                    pendingItem.user_id,
                    pendingItem.task_id,
                    pendingItem.is_completed,
                );
        } catch {
            /*
             * The local outbox remains authoritative for this unsynchronised
             * change. Continue with later tasks rather than allowing one
             * remote failure to block the whole queue.
             */
            pending += 1;

            continue;
        }


        /*
         * Deliberately outside the remote-write catch.
         *
         * Repository failures here represent local/canonical consistency
         * problems and must be visible to the caller rather than being treated
         * as ordinary connectivity failures.
         */
        const committed =
            await commitSyncedMissionTaskProgress(
                pendingItem,
                syncedProgress,
            );


        if (committed) {
            synced += 1;
        } else {
            /*
             * The exact queued state disappeared while its request was in
             * flight, normally because the user made a newer change to the
             * same task. That newer state remains pending.
             */
            pending += 1;
        }
    }


    return {
        attempted:
            pendingItems.length,
        synced,
        pending,
    };
}