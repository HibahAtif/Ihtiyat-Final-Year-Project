/// <reference types="jest" />


jest.mock(
    '@/features/preparedness/mission-progress-service',
    () => ({
        loadMissionTaskProgress:
            jest.fn(),
    }),
);


jest.mock(
    '@/features/preparedness/mission-progress-local-repository',
    () => ({
        loadMissionTaskProgressCache:
            jest.fn(),

        loadMissionTaskProgressOutbox:
            jest.fn(),

        replaceMissionTaskProgressCache:
            jest.fn(),
    }),
);


jest.mock(
    '@/features/preparedness/mission-progress-sync-service',
    () => ({
        syncPendingMissionTaskProgress:
            jest.fn(),
    }),
);


import {
    loadMissionTaskProgress,
} from '@/features/preparedness/mission-progress-service';

import {
    loadMissionTaskProgressCache,
    loadMissionTaskProgressOutbox,
    replaceMissionTaskProgressCache,
} from '@/features/preparedness/mission-progress-local-repository';

import {
    syncPendingMissionTaskProgress,
} from '@/features/preparedness/mission-progress-sync-service';

import {
    loadResilientMissionTaskProgress,
} from '@/features/preparedness/mission-progress-loader';

import type {
    MissionTaskProgress,
} from '@/features/preparedness/mission-progress-types';

import type {
    LocalMissionTaskProgress,
    MissionTaskProgressOutboxItem,
} from '@/features/preparedness/mission-progress-local-repository';


const USER_ID =
    '11111111-1111-1111-1111-111111111111';


const remoteCompletedProgress:
    MissionTaskProgress = {
        user_id:
            USER_ID,
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


const remoteIncompleteProgress:
    MissionTaskProgress = {
        user_id:
            USER_ID,
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


const cachedCompletedProgress:
    LocalMissionTaskProgress = {
        user_id:
            USER_ID,
        task_id:
            1,
        is_completed:
            true,
        completed_at:
            '2026-09-24T10:00:00.000Z',
        updated_at:
            '2026-09-24T10:00:00.000Z',
    };


const pendingIncompleteTask:
    MissionTaskProgressOutboxItem = {
        user_id:
            USER_ID,
        task_id:
            1,
        is_completed:
            false,
        queued_at:
            '2026-09-24T12:00:00.000Z',
    };


const pendingNewCompletedTask:
    MissionTaskProgressOutboxItem = {
        user_id:
            USER_ID,
        task_id:
            3,
        is_completed:
            true,
        queued_at:
            '2026-09-24T12:05:00.000Z',
    };


const loadMissionTaskProgressMock =
    loadMissionTaskProgress as jest.MockedFunction<
        typeof loadMissionTaskProgress
    >;

const loadMissionTaskProgressCacheMock =
    loadMissionTaskProgressCache as jest.MockedFunction<
        typeof loadMissionTaskProgressCache
    >;

const loadMissionTaskProgressOutboxMock =
    loadMissionTaskProgressOutbox as jest.MockedFunction<
        typeof loadMissionTaskProgressOutbox
    >;

const replaceMissionTaskProgressCacheMock =
    replaceMissionTaskProgressCache as jest.MockedFunction<
        typeof replaceMissionTaskProgressCache
    >;

const syncPendingMissionTaskProgressMock =
    syncPendingMissionTaskProgress as jest.MockedFunction<
        typeof syncPendingMissionTaskProgress
    >;


describe(
    'mission progress loader',
    () => {
        beforeEach(() => {
            jest.clearAllMocks();

            syncPendingMissionTaskProgressMock
                .mockResolvedValue({
                    attempted:
                        0,
                    synced:
                        0,
                    pending:
                        0,
                });

            loadMissionTaskProgressOutboxMock
                .mockResolvedValue(
                    [],
                );

            replaceMissionTaskProgressCacheMock
                .mockResolvedValue();
        });


        test(
            'replays pending changes before loading fresh Supabase progress and refreshes the local cache',
            async () => {
                const callOrder:
                    string[] = [];


                syncPendingMissionTaskProgressMock
                    .mockImplementation(
                        async () => {
                            callOrder.push(
                                'sync',
                            );

                            return {
                                attempted:
                                    0,
                                synced:
                                    0,
                                pending:
                                    0,
                            };
                        },
                    );

                loadMissionTaskProgressOutboxMock
                    .mockImplementation(
                        async () => {
                            callOrder.push(
                                'outbox',
                            );

                            return [];
                        },
                    );

                loadMissionTaskProgressMock
                    .mockImplementation(
                        async () => {
                            callOrder.push(
                                'remote',
                            );

                            return [
                                remoteCompletedProgress,
                                remoteIncompleteProgress,
                            ];
                        },
                    );


                await expect(
                    loadResilientMissionTaskProgress(
                        USER_ID,
                    ),
                ).resolves.toEqual({
                    progress: [
                        {
                            user_id:
                                USER_ID,
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
                                USER_ID,
                            task_id:
                                2,
                            is_completed:
                                false,
                            completed_at:
                                null,
                            updated_at:
                                '2026-09-24T10:05:00.000Z',
                        },
                    ],
                    pendingTaskIds:
                        [],
                });


                expect(
                    callOrder,
                ).toEqual([
                    'sync',
                    'outbox',
                    'remote',
                ]);


                expect(
                    replaceMissionTaskProgressCacheMock,
                ).toHaveBeenCalledWith(
                    USER_ID,
                    [
                        remoteCompletedProgress,
                        remoteIncompleteProgress,
                    ],
                );
            },
        );


        test(
            'preserves newer pending local intentions over older Supabase progress',
            async () => {
                loadMissionTaskProgressOutboxMock
                    .mockResolvedValue([
                        pendingIncompleteTask,
                        pendingNewCompletedTask,
                    ]);

                loadMissionTaskProgressMock
                    .mockResolvedValue([
                        remoteCompletedProgress,
                        remoteIncompleteProgress,
                    ]);


                await expect(
                    loadResilientMissionTaskProgress(
                        USER_ID,
                    ),
                ).resolves.toEqual({
                    progress: [
                        {
                            user_id:
                                USER_ID,
                            task_id:
                                1,
                            is_completed:
                                false,
                            completed_at:
                                null,
                            updated_at:
                                '2026-09-24T12:00:00.000Z',
                        },
                        {
                            user_id:
                                USER_ID,
                            task_id:
                                2,
                            is_completed:
                                false,
                            completed_at:
                                null,
                            updated_at:
                                '2026-09-24T10:05:00.000Z',
                        },
                        {
                            user_id:
                                USER_ID,
                            task_id:
                                3,
                            is_completed:
                                true,
                            completed_at:
                                '2026-09-24T12:05:00.000Z',
                            updated_at:
                                '2026-09-24T12:05:00.000Z',
                        },
                    ],
                    pendingTaskIds: [
                        1,
                        3,
                    ],
                });


                /*
                 * A complete remote snapshot must not replace SQLite while
                 * unsynchronised local intentions still exist, because that
                 * would destroy the newer local state.
                 */
                expect(
                    replaceMissionTaskProgressCacheMock,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'falls back to cached progress when the Supabase progress load fails',
            async () => {
                const onlineError =
                    new Error(
                        'Supabase unavailable',
                    );


                loadMissionTaskProgressMock
                    .mockRejectedValue(
                        onlineError,
                    );

                loadMissionTaskProgressCacheMock
                    .mockResolvedValue([
                        cachedCompletedProgress,
                    ]);


                await expect(
                    loadResilientMissionTaskProgress(
                        USER_ID,
                    ),
                ).resolves.toEqual({
                    progress: [
                        cachedCompletedProgress,
                    ],
                    pendingTaskIds:
                        [],
                });


                expect(
                    loadMissionTaskProgressCacheMock,
                ).toHaveBeenCalledWith(
                    USER_ID,
                );
            },
        );


        test(
            'preserves pending-task information when falling back to cached progress',
            async () => {
                loadMissionTaskProgressOutboxMock
                    .mockResolvedValue([
                        pendingIncompleteTask,
                    ]);

                loadMissionTaskProgressMock
                    .mockRejectedValue(
                        new Error(
                            'offline',
                        ),
                    );

                loadMissionTaskProgressCacheMock
                    .mockResolvedValue([
                        {
                            user_id:
                                USER_ID,
                            task_id:
                                1,
                            is_completed:
                                false,
                            completed_at:
                                null,
                            updated_at:
                                '2026-09-24T12:00:00.000Z',
                        },
                    ]);


                await expect(
                    loadResilientMissionTaskProgress(
                        USER_ID,
                    ),
                ).resolves.toEqual({
                    progress: [
                        {
                            user_id:
                                USER_ID,
                            task_id:
                                1,
                            is_completed:
                                false,
                            completed_at:
                                null,
                            updated_at:
                                '2026-09-24T12:00:00.000Z',
                        },
                    ],
                    pendingTaskIds: [
                        1,
                    ],
                });
            },
        );


        test(
            'preserves an explicitly cached empty progress result during offline fallback',
            async () => {
                loadMissionTaskProgressMock
                    .mockRejectedValue(
                        new Error(
                            'offline',
                        ),
                    );

                loadMissionTaskProgressCacheMock
                    .mockResolvedValue(
                        [],
                    );


                await expect(
                    loadResilientMissionTaskProgress(
                        USER_ID,
                    ),
                ).resolves.toEqual({
                    progress:
                        [],
                    pendingTaskIds:
                        [],
                });
            },
        );


        test(
            'rethrows the original Supabase error when no progress cache exists',
            async () => {
                const onlineError =
                    new Error(
                        'Supabase progress unavailable',
                    );


                loadMissionTaskProgressMock
                    .mockRejectedValue(
                        onlineError,
                    );

                loadMissionTaskProgressCacheMock
                    .mockResolvedValue(
                        null,
                    );


                await expect(
                    loadResilientMissionTaskProgress(
                        USER_ID,
                    ),
                ).rejects.toBe(
                    onlineError,
                );
            },
        );


        test(
            'does not discard fresh progress when refreshing the local cache fails',
            async () => {
                loadMissionTaskProgressMock
                    .mockResolvedValue([
                        remoteCompletedProgress,
                    ]);

                replaceMissionTaskProgressCacheMock
                    .mockRejectedValue(
                        new Error(
                            'SQLite cache write failed',
                        ),
                    );


                await expect(
                    loadResilientMissionTaskProgress(
                        USER_ID,
                    ),
                ).resolves.toEqual({
                    progress: [
                        {
                            user_id:
                                USER_ID,
                            task_id:
                                1,
                            is_completed:
                                true,
                            completed_at:
                                '2026-09-24T10:00:00.000Z',
                            updated_at:
                                '2026-09-24T10:00:00.000Z',
                        },
                    ],
                    pendingTaskIds:
                        [],
                });
            },
        );


        test(
            'does not hide a mission-progress synchronisation integrity failure',
            async () => {
                const integrityError =
                    new Error(
                        'mission progress sync integrity failure',
                    );


                syncPendingMissionTaskProgressMock
                    .mockRejectedValue(
                        integrityError,
                    );


                await expect(
                    loadResilientMissionTaskProgress(
                        USER_ID,
                    ),
                ).rejects.toBe(
                    integrityError,
                );


                expect(
                    loadMissionTaskProgressMock,
                ).not.toHaveBeenCalled();

                expect(
                    loadMissionTaskProgressCacheMock,
                ).not.toHaveBeenCalled();
            },
        );
    },
);