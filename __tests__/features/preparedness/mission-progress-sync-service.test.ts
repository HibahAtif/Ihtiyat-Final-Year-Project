/// <reference types="jest" />


jest.mock(
    '@/features/preparedness/mission-progress-service',
    () => ({
        setMissionTaskCompletion:
            jest.fn(),
    }),
);


jest.mock(
    '@/features/preparedness/mission-progress-local-repository',
    () => ({
        stageMissionTaskCompletion:
            jest.fn(),

        loadMissionTaskProgressOutbox:
            jest.fn(),

        commitSyncedMissionTaskProgress:
            jest.fn(),
    }),
);


import {
    setMissionTaskCompletion,
} from '@/features/preparedness/mission-progress-service';

import {
    commitSyncedMissionTaskProgress,
    loadMissionTaskProgressOutbox,
    stageMissionTaskCompletion,
} from '@/features/preparedness/mission-progress-local-repository';

import {
    setResilientMissionTaskCompletion,
    syncPendingMissionTaskProgress,
} from '@/features/preparedness/mission-progress-sync-service';

import type {
    MissionTaskProgress,
} from '@/features/preparedness/mission-progress-types';

import type {
    MissionTaskProgressOutboxItem,
} from '@/features/preparedness/mission-progress-local-repository';


const USER_ID =
    '11111111-1111-1111-1111-111111111111';


const completedProgress:
    MissionTaskProgress = {
        user_id:
            USER_ID,
        task_id:
            1,
        is_completed:
            true,
        completed_at:
            '2026-09-24T12:00:01.000Z',
        created_at:
            '2026-09-24T09:00:00.000Z',
        updated_at:
            '2026-09-24T12:00:01.000Z',
    };


const incompleteProgress:
    MissionTaskProgress = {
        ...completedProgress,
        task_id:
            2,
        is_completed:
            false,
        completed_at:
            null,
        updated_at:
            '2026-09-24T12:05:01.000Z',
    };


const firstPendingItem:
    MissionTaskProgressOutboxItem = {
        user_id:
            USER_ID,
        task_id:
            1,
        is_completed:
            true,
        queued_at:
            '2026-09-24T12:00:00.000Z',
    };


const secondPendingItem:
    MissionTaskProgressOutboxItem = {
        user_id:
            USER_ID,
        task_id:
            2,
        is_completed:
            false,
        queued_at:
            '2026-09-24T12:05:00.000Z',
    };


const setMissionTaskCompletionMock =
    setMissionTaskCompletion as jest.MockedFunction<
        typeof setMissionTaskCompletion
    >;

const stageMissionTaskCompletionMock =
    stageMissionTaskCompletion as jest.MockedFunction<
        typeof stageMissionTaskCompletion
    >;

const loadMissionTaskProgressOutboxMock =
    loadMissionTaskProgressOutbox as jest.MockedFunction<
        typeof loadMissionTaskProgressOutbox
    >;

const commitSyncedMissionTaskProgressMock =
    commitSyncedMissionTaskProgress as jest.MockedFunction<
        typeof commitSyncedMissionTaskProgress
    >;


describe(
    'mission progress sync service',
    () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });


        test(
            'stages a task change locally before attempting Supabase synchronisation',
            async () => {
                const callOrder:
                    string[] = [];


                stageMissionTaskCompletionMock
                    .mockImplementation(
                        async () => {
                            callOrder.push(
                                'local',
                            );
                        },
                    );

                setMissionTaskCompletionMock
                    .mockImplementation(
                        async () => {
                            callOrder.push(
                                'remote',
                            );

                            return completedProgress;
                        },
                    );

                commitSyncedMissionTaskProgressMock
                    .mockImplementation(
                        async () => {
                            callOrder.push(
                                'commit',
                            );

                            return true;
                        },
                    );


                await expect(
                    setResilientMissionTaskCompletion(
                        USER_ID,
                        1,
                        true,
                        '2026-09-24T12:00:00.000Z',
                    ),
                ).resolves.toBe(
                    true,
                );


                expect(
                    callOrder,
                ).toEqual([
                    'local',
                    'remote',
                    'commit',
                ]);


                expect(
                    stageMissionTaskCompletionMock,
                ).toHaveBeenCalledWith(
                    USER_ID,
                    1,
                    true,
                    '2026-09-24T12:00:00.000Z',
                );


                expect(
                    setMissionTaskCompletionMock,
                ).toHaveBeenCalledWith(
                    USER_ID,
                    1,
                    true,
                );


                expect(
                    commitSyncedMissionTaskProgressMock,
                ).toHaveBeenCalledWith(
                    firstPendingItem,
                    completedProgress,
                );
            },
        );


        test(
            'keeps a locally staged change pending when the Supabase write fails',
            async () => {
                const remoteError =
                    new Error(
                        'network unavailable',
                    );


                stageMissionTaskCompletionMock
                    .mockResolvedValue();

                setMissionTaskCompletionMock
                    .mockRejectedValue(
                        remoteError,
                    );


                await expect(
                    setResilientMissionTaskCompletion(
                        USER_ID,
                        1,
                        true,
                        '2026-09-24T12:00:00.000Z',
                    ),
                ).resolves.toBe(
                    false,
                );


                expect(
                    stageMissionTaskCompletionMock,
                ).toHaveBeenCalledTimes(
                    1,
                );

                expect(
                    commitSyncedMissionTaskProgressMock,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'reports the task change as still pending when a newer local state replaces it during synchronisation',
            async () => {
                stageMissionTaskCompletionMock
                    .mockResolvedValue();

                setMissionTaskCompletionMock
                    .mockResolvedValue(
                        completedProgress,
                    );

                commitSyncedMissionTaskProgressMock
                    .mockResolvedValue(
                        false,
                    );


                await expect(
                    setResilientMissionTaskCompletion(
                        USER_ID,
                        1,
                        true,
                        '2026-09-24T12:00:00.000Z',
                    ),
                ).resolves.toBe(
                    false,
                );


                expect(
                    commitSyncedMissionTaskProgressMock,
                ).toHaveBeenCalledWith(
                    firstPendingItem,
                    completedProgress,
                );
            },
        );


        test(
            'propagates a local staging failure without attempting Supabase',
            async () => {
                const localError =
                    new Error(
                        'SQLite unavailable',
                    );


                stageMissionTaskCompletionMock
                    .mockRejectedValue(
                        localError,
                    );


                await expect(
                    setResilientMissionTaskCompletion(
                        USER_ID,
                        1,
                        true,
                        '2026-09-24T12:00:00.000Z',
                    ),
                ).rejects.toBe(
                    localError,
                );


                expect(
                    setMissionTaskCompletionMock,
                ).not.toHaveBeenCalled();

                expect(
                    commitSyncedMissionTaskProgressMock,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'replays pending mission progress in deterministic outbox order',
            async () => {
                loadMissionTaskProgressOutboxMock
                    .mockResolvedValue([
                        firstPendingItem,
                        secondPendingItem,
                    ]);

                setMissionTaskCompletionMock
                    .mockResolvedValueOnce(
                        completedProgress,
                    )
                    .mockResolvedValueOnce(
                        incompleteProgress,
                    );

                commitSyncedMissionTaskProgressMock
                    .mockResolvedValue(
                        true,
                    );


                await expect(
                    syncPendingMissionTaskProgress(
                        USER_ID,
                    ),
                ).resolves.toEqual({
                    attempted:
                        2,
                    synced:
                        2,
                    pending:
                        0,
                });


                expect(
                    setMissionTaskCompletionMock
                        .mock.calls,
                ).toEqual([
                    [
                        USER_ID,
                        1,
                        true,
                    ],
                    [
                        USER_ID,
                        2,
                        false,
                    ],
                ]);


                expect(
                    commitSyncedMissionTaskProgressMock
                        .mock.calls,
                ).toEqual([
                    [
                        firstPendingItem,
                        completedProgress,
                    ],
                    [
                        secondPendingItem,
                        incompleteProgress,
                    ],
                ]);
            },
        );


        test(
            'continues synchronising later tasks when one pending Supabase write fails',
            async () => {
                const remoteError =
                    new Error(
                        'temporary remote failure',
                    );


                loadMissionTaskProgressOutboxMock
                    .mockResolvedValue([
                        firstPendingItem,
                        secondPendingItem,
                    ]);

                setMissionTaskCompletionMock
                    .mockRejectedValueOnce(
                        remoteError,
                    )
                    .mockResolvedValueOnce(
                        incompleteProgress,
                    );

                commitSyncedMissionTaskProgressMock
                    .mockResolvedValue(
                        true,
                    );


                await expect(
                    syncPendingMissionTaskProgress(
                        USER_ID,
                    ),
                ).resolves.toEqual({
                    attempted:
                        2,
                    synced:
                        1,
                    pending:
                        1,
                });


                expect(
                    commitSyncedMissionTaskProgressMock,
                ).toHaveBeenCalledTimes(
                    1,
                );

                expect(
                    commitSyncedMissionTaskProgressMock,
                ).toHaveBeenCalledWith(
                    secondPendingItem,
                    incompleteProgress,
                );
            },
        );


        test(
            'counts a stale successful response as pending when the exact outbox state was replaced',
            async () => {
                loadMissionTaskProgressOutboxMock
                    .mockResolvedValue([
                        firstPendingItem,
                    ]);

                setMissionTaskCompletionMock
                    .mockResolvedValue(
                        completedProgress,
                    );

                commitSyncedMissionTaskProgressMock
                    .mockResolvedValue(
                        false,
                    );


                await expect(
                    syncPendingMissionTaskProgress(
                        USER_ID,
                    ),
                ).resolves.toEqual({
                    attempted:
                        1,
                    synced:
                        0,
                    pending:
                        1,
                });
            },
        );


        test(
            'returns an empty sync summary when the authenticated user has no pending progress',
            async () => {
                loadMissionTaskProgressOutboxMock
                    .mockResolvedValue(
                        [],
                    );


                await expect(
                    syncPendingMissionTaskProgress(
                        USER_ID,
                    ),
                ).resolves.toEqual({
                    attempted:
                        0,
                    synced:
                        0,
                    pending:
                        0,
                });


                expect(
                    setMissionTaskCompletionMock,
                ).not.toHaveBeenCalled();

                expect(
                    commitSyncedMissionTaskProgressMock,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'does not hide an invalid canonical sync result rejected by the local repository',
            async () => {
                const integrityError =
                    new Error(
                        'Synced mission progress does not match the pending outbox item.',
                    );


                loadMissionTaskProgressOutboxMock
                    .mockResolvedValue([
                        firstPendingItem,
                    ]);

                setMissionTaskCompletionMock
                    .mockResolvedValue(
                        completedProgress,
                    );

                commitSyncedMissionTaskProgressMock
                    .mockRejectedValue(
                        integrityError,
                    );


                await expect(
                    syncPendingMissionTaskProgress(
                        USER_ID,
                    ),
                ).rejects.toBe(
                    integrityError,
                );
            },
        );
    },
);