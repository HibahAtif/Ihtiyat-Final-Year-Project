/// <reference types="jest" />


jest.mock(
    '@/storage/ihtiyat-database',
    () => ({
        getIhtiyatDatabase:
            jest.fn(),
    }),
);


import {
    getIhtiyatDatabase,
} from '@/storage/ihtiyat-database';

import {
    commitSyncedMissionTaskProgress,
    loadMissionTaskProgressCache,
    loadMissionTaskProgressOutbox,
    replaceMissionTaskProgressCache,
    stageMissionTaskCompletion,
} from '@/features/preparedness/mission-progress-local-repository';

import type {
    MissionTaskProgress,
} from '@/features/preparedness/mission-progress-types';


const getIhtiyatDatabaseMock =
    getIhtiyatDatabase as jest.MockedFunction<
        typeof getIhtiyatDatabase
    >;


const USER_A =
    '11111111-1111-1111-1111-111111111111';

const USER_B =
    '22222222-2222-2222-2222-222222222222';


const completedProgress:
    MissionTaskProgress = {
        user_id:
            USER_A,
        task_id:
            1,
        is_completed:
            true,
        completed_at:
            '2026-09-24T10:00:00.000Z',
        created_at:
            '2026-09-24T09:00:00.000Z',
        updated_at:
            '2026-09-24T10:00:00.000Z',
    };


const incompleteProgress:
    MissionTaskProgress = {
        user_id:
            USER_A,
        task_id:
            2,
        is_completed:
            false,
        completed_at:
            null,
        created_at:
            '2026-09-24T09:05:00.000Z',
        updated_at:
            '2026-09-24T10:05:00.000Z',
    };


type MockRunResult = {
    changes: number;
    lastInsertRowId: number;
};


type MockTransaction = {
    runAsync: jest.Mock<
        Promise<MockRunResult>
    >;
};


function createDatabaseMock() {
    const transaction:
        MockTransaction = {
            runAsync:
                jest.fn()
                    .mockResolvedValue({
                        changes: 1,
                        lastInsertRowId: 0,
                    }),
        };


    const database = {
        withExclusiveTransactionAsync:
            jest.fn(
                async (
                    callback: (
                        transaction:
                            MockTransaction,
                    ) => Promise<void>,
                ): Promise<void> => {
                    await callback(
                        transaction,
                    );
                },
            ),

        getFirstAsync:
            jest.fn(),

        getAllAsync:
            jest.fn(),
    };


    return {
        database,
        transaction,
    };
}

/**
 * WHAT:
 * Normalises SQL formatting before assertions.
 *
 * WHY:
 * Repository SQL is intentionally formatted across multiple lines for
 * readability. Tests should verify the SQL operation and parameters rather
 * than depend on insignificant spaces or line breaks.
 *
 * HOW:
 * Consecutive whitespace is collapsed into one space and surrounding
 * whitespace is removed.
 */
function normaliseSql(
    value: unknown,
): string {
    if (
        typeof value !== 'string'
    ) {
        throw new Error(
            'Expected the mocked SQLite SQL argument to be a string.',
        );
    }


    return value
        .replace(
            /\s+/g,
            ' ',
        )
        .trim();
}


/**
 * WHAT:
 * Verifies one mocked SQLite call by its meaningful SQL fragments and bound
 * parameters.
 *
 * WHY:
 * SQL formatting should remain free to change without breaking behavioural
 * repository tests.
 *
 * HOW:
 * The SQL argument is normalised first, each required fragment is checked,
 * and the remaining call arguments are compared with the expected parameters.
 */
function expectSqlCall(
    call: readonly unknown[],
    expectedSqlFragments:
        readonly string[],
    expectedParameters:
        readonly unknown[],
): void {
    const [
        sql,
        ...parameters
    ] = call;

    const normalisedSql =
        normaliseSql(
            sql,
        );


    for (
        const fragment
        of expectedSqlFragments
    ) {
        expect(
            normalisedSql,
        ).toContain(
            fragment,
        );
    }


    expect(
        parameters,
    ).toEqual(
        expectedParameters,
    );
}


describe(
    'mission progress local repository',
    () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });


        test(
            'atomically replaces only the requested user progress cache and records metadata',
            async () => {
                const {
                    database,
                    transaction,
                } =
                    createDatabaseMock();


                getIhtiyatDatabaseMock
                    .mockResolvedValue(
                        database as unknown as Awaited<
                            ReturnType<
                                typeof getIhtiyatDatabase
                            >
                        >,
                    );


                await replaceMissionTaskProgressCache(
                    USER_A,
                    [
                        completedProgress,
                        incompleteProgress,
                    ],
                    '2026-09-24T11:00:00.000Z',
                );


                expect(
                    database
                        .withExclusiveTransactionAsync,
                ).toHaveBeenCalledTimes(
                    1,
                );


                expect(
                    transaction.runAsync,
                ).toHaveBeenCalledTimes(
                    4,
                );

                expectSqlCall(
                    transaction
                        .runAsync
                        .mock.calls[0],
                    [
                        'DELETE FROM user_mission_task_progress_cache',
                        'WHERE user_id = ?',
                    ],
                    [
                        USER_A,
                    ],
                );


                expectSqlCall(
                    transaction
                        .runAsync
                        .mock.calls[1],
                    [
                        'INSERT INTO user_mission_task_progress_cache',
                    ],
                    [
                        USER_A,
                        1,
                        1,
                        '2026-09-24T10:00:00.000Z',
                        '2026-09-24T10:00:00.000Z',
                    ],
                );


                expectSqlCall(
                    transaction
                        .runAsync
                        .mock.calls[2],
                    [
                        'INSERT INTO user_mission_task_progress_cache',
                    ],
                    [
                        USER_A,
                        2,
                        0,
                        null,
                        '2026-09-24T10:05:00.000Z',
                    ],
                );


                expectSqlCall(
                    transaction
                        .runAsync
                        .mock.calls[3],
                    [
                        'preparedness_cache_metadata',
                    ],
                    [
                        `preparedness.mission-progress.${USER_A}`,
                        '2026-09-24T11:00:00.000Z',
                    ],
                );
            },
        );


        test(
            'rejects progress belonging to another user before accessing SQLite',
            async () => {
                await expect(
                    replaceMissionTaskProgressCache(
                        USER_A,
                        [
                            {
                                ...completedProgress,
                                user_id:
                                    USER_B,
                            },
                        ],
                    ),
                ).rejects.toThrow(
                    'Mission progress cache cannot store progress belonging to a different user.',
                );


                expect(
                    getIhtiyatDatabaseMock,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'returns null when the requested user has never had progress cached',
            async () => {
                const {
                    database,
                } =
                    createDatabaseMock();


                database
                    .getFirstAsync
                    .mockResolvedValue(
                        null,
                    );


                getIhtiyatDatabaseMock
                    .mockResolvedValue(
                        database as unknown as Awaited<
                            ReturnType<
                                typeof getIhtiyatDatabase
                            >
                        >,
                    );


                await expect(
                    loadMissionTaskProgressCache(
                        USER_A,
                    ),
                ).resolves.toBeNull();


                expect(
                    database
                        .getAllAsync,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'preserves an explicitly cached empty progress result',
            async () => {
                const {
                    database,
                } =
                    createDatabaseMock();


                database
                    .getFirstAsync
                    .mockResolvedValue({
                        cached_at:
                            '2026-09-24T11:00:00.000Z',
                    });

                database
                    .getAllAsync
                    .mockResolvedValue(
                        [],
                    );


                getIhtiyatDatabaseMock
                    .mockResolvedValue(
                        database as unknown as Awaited<
                            ReturnType<
                                typeof getIhtiyatDatabase
                            >
                        >,
                    );


                await expect(
                    loadMissionTaskProgressCache(
                        USER_A,
                    ),
                ).resolves.toEqual(
                    [],
                );
            },
        );


        test(
            'loads only the requested user cached progress and restores SQLite booleans',
            async () => {
                const {
                    database,
                } =
                    createDatabaseMock();


                database
                    .getFirstAsync
                    .mockResolvedValue({
                        cached_at:
                            '2026-09-24T11:00:00.000Z',
                    });

                database
                    .getAllAsync
                    .mockResolvedValue([
                        {
                            user_id:
                                USER_A,
                            task_id:
                                1,
                            is_completed:
                                1,
                            completed_at:
                                '2026-09-24T10:00:00.000Z',
                            updated_at:
                                '2026-09-24T10:00:00.000Z',
                        },
                        {
                            user_id:
                                USER_A,
                            task_id:
                                2,
                            is_completed:
                                0,
                            completed_at:
                                null,
                            updated_at:
                                '2026-09-24T10:05:00.000Z',
                        },
                    ]);


                getIhtiyatDatabaseMock
                    .mockResolvedValue(
                        database as unknown as Awaited<
                            ReturnType<
                                typeof getIhtiyatDatabase
                            >
                        >,
                    );


                await expect(
                    loadMissionTaskProgressCache(
                        USER_A,
                    ),
                ).resolves.toEqual([
                    {
                        user_id:
                            USER_A,
                        task_id:
                            1,
                        is_completed:
                            true,
                        completed_at:
                            '2026-09-24T10:00:00.000Z',
                        updated_at:
                            '2026-09-24T10:00:00.000Z',
                    },
                    {
                        user_id:
                            USER_A,
                        task_id:
                            2,
                        is_completed:
                            false,
                        completed_at:
                            null,
                        updated_at:
                            '2026-09-24T10:05:00.000Z',
                    },
                ]);


                expectSqlCall(
                    database
                        .getAllAsync
                        .mock.calls[0],
                    [
                        'FROM user_mission_task_progress_cache',
                        'WHERE user_id = ?',
                        'ORDER BY task_id ASC',
                    ],
                    [
                        USER_A,
                    ],
                );
            },
        );


        test(
            'atomically stages a completed task in local progress and the sync outbox',
            async () => {
                const {
                    database,
                    transaction,
                } =
                    createDatabaseMock();


                getIhtiyatDatabaseMock
                    .mockResolvedValue(
                        database as unknown as Awaited<
                            ReturnType<
                                typeof getIhtiyatDatabase
                            >
                        >,
                    );


                await stageMissionTaskCompletion(
                    USER_A,
                    5,
                    true,
                    '2026-09-24T12:00:00.000Z',
                );


                expect(
                    database
                        .withExclusiveTransactionAsync,
                ).toHaveBeenCalledTimes(
                    1,
                );


                expect(
                    transaction.runAsync,
                ).toHaveBeenCalledTimes(
                    3,
                );


                expectSqlCall(
                    transaction
                        .runAsync
                        .mock.calls[0],
                    [
                        'INSERT INTO user_mission_task_progress_cache',
                        'ON CONFLICT(user_id, task_id)',
                    ],
                    [
                        USER_A,
                        5,
                        1,
                        '2026-09-24T12:00:00.000Z',
                        '2026-09-24T12:00:00.000Z',
                    ],
                );

                expectSqlCall(
                    transaction
                        .runAsync
                        .mock.calls[1],
                    [
                        'INSERT INTO user_mission_task_progress_outbox',
                        'ON CONFLICT(user_id, task_id)',
                        'is_completed = excluded.is_completed',
                        'queued_at = excluded.queued_at',
                    ],
                    [
                        USER_A,
                        5,
                        1,
                        '2026-09-24T12:00:00.000Z',
                    ],
                );

                expectSqlCall(
                    transaction
                        .runAsync
                        .mock.calls[2],
                    [
                        'preparedness_cache_metadata',
                    ],
                    [
                        `preparedness.mission-progress.${USER_A}`,
                        '2026-09-24T12:00:00.000Z',
                    ],
                );
            },
        );


        test(
            'staging an incomplete task clears the local completion timestamp and replaces the pending desired state',
            async () => {
                const {
                    database,
                    transaction,
                } =
                    createDatabaseMock();


                getIhtiyatDatabaseMock
                    .mockResolvedValue(
                        database as unknown as Awaited<
                            ReturnType<
                                typeof getIhtiyatDatabase
                            >
                        >,
                    );


                await stageMissionTaskCompletion(
                    USER_A,
                    5,
                    false,
                    '2026-09-24T12:05:00.000Z',
                );

                expectSqlCall(
                    transaction
                        .runAsync
                        .mock.calls[0],
                    [
                        'INSERT INTO user_mission_task_progress_cache',
                        'ON CONFLICT(user_id, task_id)',
                    ],
                    [
                        USER_A,
                        5,
                        0,
                        null,
                        '2026-09-24T12:05:00.000Z',
                    ],
                );


                expectSqlCall(
                    transaction
                        .runAsync
                        .mock.calls[1],
                    [
                        'INSERT INTO user_mission_task_progress_outbox',
                        'ON CONFLICT(user_id, task_id)',
                    ],
                    [
                        USER_A,
                        5,
                        0,
                        '2026-09-24T12:05:00.000Z',
                    ],
                );
            },
        );


        test(
            'loads only the requested user pending outbox in deterministic queue order',
            async () => {
                const {
                    database,
                } =
                    createDatabaseMock();


                database
                    .getAllAsync
                    .mockResolvedValue([
                        {
                            user_id:
                                USER_A,
                            task_id:
                                2,
                            is_completed:
                                1,
                            queued_at:
                                '2026-09-24T12:00:00.000Z',
                        },
                        {
                            user_id:
                                USER_A,
                            task_id:
                                5,
                            is_completed:
                                0,
                            queued_at:
                                '2026-09-24T12:05:00.000Z',
                        },
                    ]);


                getIhtiyatDatabaseMock
                    .mockResolvedValue(
                        database as unknown as Awaited<
                            ReturnType<
                                typeof getIhtiyatDatabase
                            >
                        >,
                    );


                await expect(
                    loadMissionTaskProgressOutbox(
                        USER_A,
                    ),
                ).resolves.toEqual([
                    {
                        user_id:
                            USER_A,
                        task_id:
                            2,
                        is_completed:
                            true,
                        queued_at:
                            '2026-09-24T12:00:00.000Z',
                    },
                    {
                        user_id:
                            USER_A,
                        task_id:
                            5,
                        is_completed:
                            false,
                        queued_at:
                            '2026-09-24T12:05:00.000Z',
                    },
                ]);

                expectSqlCall(
                    database
                        .getAllAsync
                        .mock.calls[0],
                    [
                        'FROM user_mission_task_progress_outbox',
                        'WHERE user_id = ?',
                        'queued_at ASC',
                        'task_id ASC',
                    ],
                    [
                        USER_A,
                    ],
                );
            },
        );


        test(
            'commits a synced canonical row only when the exact queued state is still pending',
            async () => {
                const {
                    database,
                    transaction,
                } =
                    createDatabaseMock();


                getIhtiyatDatabaseMock
                    .mockResolvedValue(
                        database as unknown as Awaited<
                            ReturnType<
                                typeof getIhtiyatDatabase
                            >
                        >,
                    );


                const committed =
                    await commitSyncedMissionTaskProgress(
                        {
                            user_id:
                                USER_A,
                            task_id:
                                1,
                            is_completed:
                                true,
                            queued_at:
                                '2026-09-24T12:00:00.000Z',
                        },
                        completedProgress,
                    );


                expect(
                    committed,
                ).toBe(
                    true,
                );


                expect(
                    database
                        .withExclusiveTransactionAsync,
                ).toHaveBeenCalledTimes(
                    1,
                );

                expectSqlCall(
                    transaction
                        .runAsync
                        .mock.calls[0],
                    [
                        'DELETE FROM user_mission_task_progress_outbox',
                        'WHERE user_id = ?',
                        'task_id = ?',
                        'is_completed = ?',
                        'queued_at = ?',
                    ],
                    [
                        USER_A,
                        1,
                        1,
                        '2026-09-24T12:00:00.000Z',
                    ],
                );

                expectSqlCall(
                    transaction
                        .runAsync
                        .mock.calls[1],
                    [
                        'INSERT INTO user_mission_task_progress_cache',
                        'ON CONFLICT(user_id, task_id)',
                    ],
                    [
                        USER_A,
                        1,
                        1,
                        '2026-09-24T10:00:00.000Z',
                        '2026-09-24T10:00:00.000Z',
                    ],
                ); 
            },
        );


        test(
            'does not overwrite newer local progress when a stale sync result completes late',
            async () => {
                const {
                    database,
                    transaction,
                } =
                    createDatabaseMock();


                transaction
                    .runAsync
                    .mockResolvedValueOnce({
                        changes: 0,
                        lastInsertRowId: 0,
                    });


                getIhtiyatDatabaseMock
                    .mockResolvedValue(
                        database as unknown as Awaited<
                            ReturnType<
                                typeof getIhtiyatDatabase
                            >
                        >,
                    );


                const committed =
                    await commitSyncedMissionTaskProgress(
                        {
                            user_id:
                                USER_A,
                            task_id:
                                1,
                            is_completed:
                                true,
                            queued_at:
                                '2026-09-24T12:00:00.000Z',
                        },
                        completedProgress,
                    );


                expect(
                    committed,
                ).toBe(
                    false,
                );


                /*
                 * A zero-row delete means this exact pending state no longer
                 * exists. A newer local toggle may already have replaced it,
                 * so the older server response must not touch the cache.
                 */
                expect(
                    transaction.runAsync,
                ).toHaveBeenCalledTimes(
                    1,
                );
            },
        );


        test(
            'rejects a synced result that does not belong to the queued user and task',
            async () => {
                await expect(
                    commitSyncedMissionTaskProgress(
                        {
                            user_id:
                                USER_A,
                            task_id:
                                1,
                            is_completed:
                                true,
                            queued_at:
                                '2026-09-24T12:00:00.000Z',
                        },
                        {
                            ...completedProgress,
                            task_id:
                                99,
                        },
                    ),
                ).rejects.toThrow(
                    'Synced mission progress does not match the pending outbox item.',
                );


                expect(
                    getIhtiyatDatabaseMock,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'rejects invalid local mission-progress identifiers before accessing SQLite',
            async () => {
                await expect(
                    stageMissionTaskCompletion(
                        '',
                        1,
                        true,
                    ),
                ).rejects.toThrow(
                    'Mission progress requires a non-empty user ID.',
                );


                await expect(
                    stageMissionTaskCompletion(
                        USER_A,
                        0,
                        true,
                    ),
                ).rejects.toThrow(
                    'Mission progress requires a positive integer task ID.',
                );


                expect(
                    getIhtiyatDatabaseMock,
                ).not.toHaveBeenCalled();
            },
        );
    },
);