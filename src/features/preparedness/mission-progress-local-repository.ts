import {
    getIhtiyatDatabase,
} from '@/storage/ihtiyat-database';

import type {
    MissionTaskProgress,
} from './mission-progress-types';


/**
 * Represents mission progress as stored in the local SQLite resilience layer.
 *
 * created_at is deliberately omitted because it is authoritative Supabase
 * history rather than information required for local checklist rendering or
 * offline synchronisation.
 */
export type LocalMissionTaskProgress = Pick<
    MissionTaskProgress,
    | 'user_id'
    | 'task_id'
    | 'is_completed'
    | 'completed_at'
    | 'updated_at'
>;


/**
 * Represents the latest local mission-task state waiting to be synchronised
 * with Supabase.
 */
export type MissionTaskProgressOutboxItem = {
    user_id: string;
    task_id: number;
    is_completed: boolean;
    queued_at: string;
};


type MissionTaskProgressCacheRow = {
    user_id: string;
    task_id: number;
    is_completed: number;
    completed_at: string | null;
    updated_at: string;
};


type MissionTaskProgressOutboxRow = {
    user_id: string;
    task_id: number;
    is_completed: number;
    queued_at: string;
};


type CacheMetadataRow = {
    cached_at: string;
};


function getMissionProgressCacheKey(
    userId: string,
): string {
    return `preparedness.mission-progress.${userId}`;
}


function validateUserId(
    userId: string,
): void {
    if (
        userId.trim().length === 0
    ) {
        throw new Error(
            'Mission progress requires a non-empty user ID.',
        );
    }
}


function validateTaskId(
    taskId: number,
): void {
    if (
        !Number.isInteger(
            taskId,
        )
        || taskId <= 0
    ) {
        throw new Error(
            'Mission progress requires a positive integer task ID.',
        );
    }
}


function validateProgressBelongsToUser(
    userId: string,
    progress:
        MissionTaskProgress,
): void {
    if (
        progress.user_id
        !== userId
    ) {
        throw new Error(
            'Mission progress cache cannot store progress belonging to a different user.',
        );
    }


    validateTaskId(
        progress.task_id,
    );
}


function toSQLiteBoolean(
    value: boolean,
): number {
    return value
        ? 1
        : 0;
}


function fromSQLiteBoolean(
    value: number,
): boolean {
    return value === 1;
}


/**
 * WHAT:
 * Replaces the complete cached mission-progress snapshot for one authenticated
 * user.
 *
 * WHY:
 * A successful Supabase progress load represents one coherent canonical
 * snapshot for that account. Replacing only that user's rows prevents stale
 * progress from surviving while keeping other accounts' local data isolated.
 *
 * HOW:
 * Existing cache rows for the requested user are removed and the supplied
 * canonical progress rows are inserted inside one exclusive transaction.
 * Cache metadata is written even when the progress array is empty so null and
 * [] retain different meanings when the cache is read later.
 */
export async function replaceMissionTaskProgressCache(
    userId: string,
    progress:
        MissionTaskProgress[],
    cachedAt:
        string = new Date().toISOString(),
): Promise<void> {
    validateUserId(
        userId,
    );


    for (
        const progressItem of progress
    ) {
        validateProgressBelongsToUser(
            userId,
            progressItem,
        );
    }


    const database =
        await getIhtiyatDatabase();


    await database
        .withExclusiveTransactionAsync(
            async (
                transaction,
            ): Promise<void> => {
                await transaction.runAsync(
                    `
                        DELETE FROM
                            user_mission_task_progress_cache
                        WHERE
                            user_id = ?;
                    `,
                    userId,
                );


                for (
                    const progressItem
                    of progress
                ) {
                    await transaction.runAsync(
                        `
                            INSERT INTO
                                user_mission_task_progress_cache (
                                    user_id,
                                    task_id,
                                    is_completed,
                                    completed_at,
                                    updated_at
                                )
                            VALUES (
                                ?,
                                ?,
                                ?,
                                ?,
                                ?
                            );
                        `,
                        progressItem.user_id,
                        progressItem.task_id,
                        toSQLiteBoolean(
                            progressItem
                                .is_completed,
                        ),
                        progressItem
                            .completed_at,
                        progressItem
                            .updated_at,
                    );
                }


                await transaction.runAsync(
                    `
                        INSERT INTO
                            preparedness_cache_metadata (
                                cache_key,
                                cached_at
                            )
                        VALUES (
                            ?,
                            ?
                        )
                        ON CONFLICT(cache_key)
                        DO UPDATE SET
                            cached_at =
                                excluded.cached_at;
                    `,
                    getMissionProgressCacheKey(
                        userId,
                    ),
                    cachedAt,
                );
            },
        );
}


/**
 * WHAT:
 * Loads the locally cached mission progress belonging to one authenticated
 * account.
 *
 * WHY:
 * Offline mission state must never leak between accounts. The caller also
 * needs to distinguish "never cached" from "successfully cached but empty".
 *
 * HOW:
 * User-specific cache metadata is checked first. Missing metadata returns null.
 * Otherwise only rows matching the requested user are loaded and SQLite
 * integer booleans are restored to application booleans.
 */
export async function loadMissionTaskProgressCache(
    userId: string,
): Promise<
    LocalMissionTaskProgress[]
    | null
> {
    validateUserId(
        userId,
    );


    const database =
        await getIhtiyatDatabase();

    const metadata =
        await database
            .getFirstAsync<CacheMetadataRow>(
                `
                    SELECT
                        cached_at
                    FROM
                        preparedness_cache_metadata
                    WHERE
                        cache_key = ?
                    LIMIT 1;
                `,
                getMissionProgressCacheKey(
                    userId,
                ),
            );


    if (!metadata) {
        return null;
    }


    const rows =
        await database
            .getAllAsync<MissionTaskProgressCacheRow>(
                `
                    SELECT
                        user_id,
                        task_id,
                        is_completed,
                        completed_at,
                        updated_at
                    FROM
                        user_mission_task_progress_cache
                    WHERE
                        user_id = ?
                    ORDER BY
                        task_id ASC;
                `,
                userId,
            );


    return rows.map(
        (
            row,
        ): LocalMissionTaskProgress => ({
            user_id:
                row.user_id,
            task_id:
                row.task_id,
            is_completed:
                fromSQLiteBoolean(
                    row.is_completed,
                ),
            completed_at:
                row.completed_at,
            updated_at:
                row.updated_at,
        }),
    );
}


/**
 * WHAT:
 * Stages the user's latest completion state for one task locally.
 *
 * WHY:
 * An authenticated user must be able to change checklist progress even when
 * Supabase is temporarily unavailable. The visible local state and the pending
 * synchronisation instruction must never diverge.
 *
 * HOW:
 * One exclusive SQLite transaction upserts:
 * 1. the locally visible progress row;
 * 2. the latest desired state in the outbox;
 * 3. user-specific cache metadata.
 *
 * Repeated offline changes replace the existing outbox row for the same
 * user/task pair instead of accumulating redundant history.
 */
export async function stageMissionTaskCompletion(
    userId: string,
    taskId: number,
    isCompleted: boolean,
    queuedAt:
        string = new Date().toISOString(),
): Promise<void> {
    validateUserId(
        userId,
    );

    validateTaskId(
        taskId,
    );


    const database =
        await getIhtiyatDatabase();

    const completedAt =
        isCompleted
            ? queuedAt
            : null;

    const sqliteCompletion =
        toSQLiteBoolean(
            isCompleted,
        );


    await database
        .withExclusiveTransactionAsync(
            async (
                transaction,
            ): Promise<void> => {
                await transaction.runAsync(
                    `
                        INSERT INTO
                            user_mission_task_progress_cache (
                                user_id,
                                task_id,
                                is_completed,
                                completed_at,
                                updated_at
                            )
                        VALUES (
                            ?,
                            ?,
                            ?,
                            ?,
                            ?
                        )
                        ON CONFLICT(user_id, task_id)
                        DO UPDATE SET
                            is_completed =
                                excluded.is_completed,
                            completed_at =
                                excluded.completed_at,
                            updated_at =
                                excluded.updated_at;
                    `,
                    userId,
                    taskId,
                    sqliteCompletion,
                    completedAt,
                    queuedAt,
                );


                await transaction.runAsync(
                    `
                        INSERT INTO
                            user_mission_task_progress_outbox (
                                user_id,
                                task_id,
                                is_completed,
                                queued_at
                            )
                        VALUES (
                            ?,
                            ?,
                            ?,
                            ?
                        )
                        ON CONFLICT(user_id, task_id)
                        DO UPDATE SET
                            is_completed =
                                excluded.is_completed,
                            queued_at =
                                excluded.queued_at;
                    `,
                    userId,
                    taskId,
                    sqliteCompletion,
                    queuedAt,
                );


                await transaction.runAsync(
                    `
                        INSERT INTO
                            preparedness_cache_metadata (
                                cache_key,
                                cached_at
                            )
                        VALUES (
                            ?,
                            ?
                        )
                        ON CONFLICT(cache_key)
                        DO UPDATE SET
                            cached_at =
                                excluded.cached_at;
                    `,
                    getMissionProgressCacheKey(
                        userId,
                    ),
                    queuedAt,
                );
            },
        );
}


/**
 * WHAT:
 * Loads the pending mission-progress changes for one authenticated account.
 *
 * WHY:
 * The later synchronisation layer needs a deterministic queue of only that
 * user's outstanding desired states.
 *
 * HOW:
 * Rows are filtered by user_id and ordered first by queue time and then task
 * ID. SQLite integer booleans are restored before the items leave the
 * repository boundary.
 */
export async function loadMissionTaskProgressOutbox(
    userId: string,
): Promise<
    MissionTaskProgressOutboxItem[]
> {
    validateUserId(
        userId,
    );


    const database =
        await getIhtiyatDatabase();

    const rows =
        await database
            .getAllAsync<MissionTaskProgressOutboxRow>(
                `
                    SELECT
                        user_id,
                        task_id,
                        is_completed,
                        queued_at
                    FROM
                        user_mission_task_progress_outbox
                    WHERE
                        user_id = ?
                    ORDER BY
                        queued_at ASC,
                        task_id ASC;
                `,
                userId,
            );


    return rows.map(
        (
            row,
        ): MissionTaskProgressOutboxItem => ({
            user_id:
                row.user_id,
            task_id:
                row.task_id,
            is_completed:
                fromSQLiteBoolean(
                    row.is_completed,
                ),
            queued_at:
                row.queued_at,
        }),
    );
}


/**
 * WHAT:
 * Commits the canonical Supabase result of one successfully synchronised
 * outbox item.
 *
 * WHY:
 * A network request may complete after the user has already changed the same
 * task again. An older response must never overwrite that newer local intent.
 *
 * HOW:
 * The transaction first deletes the outbox row only when user, task,
 * completion state and queue timestamp still exactly match the item that was
 * sent. If no row is deleted, the pending state has changed and the stale
 * response is ignored locally.
 *
 * When the exact item is still pending, its outbox row is removed and the
 * canonical Supabase progress row replaces the provisional local cache state
 * in the same transaction.
 *
 * Returns true only when the canonical result was committed.
 */
export async function commitSyncedMissionTaskProgress(
    pendingItem:
        MissionTaskProgressOutboxItem,
    syncedProgress:
        MissionTaskProgress,
): Promise<boolean> {
    validateUserId(
        pendingItem.user_id,
    );

    validateTaskId(
        pendingItem.task_id,
    );


    if (
        syncedProgress.user_id
            !== pendingItem.user_id
        || syncedProgress.task_id
            !== pendingItem.task_id
        || syncedProgress.is_completed
            !== pendingItem.is_completed
    ) {
        throw new Error(
            'Synced mission progress does not match the pending outbox item.',
        );
    }


    const database =
        await getIhtiyatDatabase();

    let committed =
        false;


    await database
        .withExclusiveTransactionAsync(
            async (
                transaction,
            ): Promise<void> => {
                const deletionResult =
                    await transaction.runAsync(
                        `
                            DELETE FROM
                                user_mission_task_progress_outbox
                            WHERE
                                user_id = ?
                                AND task_id = ?
                                AND is_completed = ?
                                AND queued_at = ?;
                        `,
                        pendingItem.user_id,
                        pendingItem.task_id,
                        toSQLiteBoolean(
                            pendingItem
                                .is_completed,
                        ),
                        pendingItem.queued_at,
                    );


                if (
                    deletionResult.changes === 0
                ) {
                    return;
                }


                await transaction.runAsync(
                    `
                        INSERT INTO
                            user_mission_task_progress_cache (
                                user_id,
                                task_id,
                                is_completed,
                                completed_at,
                                updated_at
                            )
                        VALUES (
                            ?,
                            ?,
                            ?,
                            ?,
                            ?
                        )
                        ON CONFLICT(user_id, task_id)
                        DO UPDATE SET
                            is_completed =
                                excluded.is_completed,
                            completed_at =
                                excluded.completed_at,
                            updated_at =
                                excluded.updated_at;
                    `,
                    syncedProgress.user_id,
                    syncedProgress.task_id,
                    toSQLiteBoolean(
                        syncedProgress
                            .is_completed,
                    ),
                    syncedProgress.completed_at,
                    syncedProgress.updated_at,
                );


                committed =
                    true;
            },
        );


    return committed;
}