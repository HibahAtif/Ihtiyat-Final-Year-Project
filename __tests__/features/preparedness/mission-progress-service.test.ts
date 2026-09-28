/// <reference types="jest" />


jest.mock(
    '@/lib/supabase-config',
    () => ({
        supabaseClient: {
            from: jest.fn(),
        },
    }),
);


import {
    supabaseClient,
} from '@/lib/supabase-config';

import {
    loadMissionTaskProgress,
    setMissionTaskCompletion,
} from '@/features/preparedness/mission-progress-service';

import type {
    Tables,
} from '@/types/database.types';


type MissionTaskProgress =
    Tables<'user_mission_task_progress'>;


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
            '2026-09-24T10:00:00.000Z',
        created_at:
            '2026-09-24T09:00:00.000Z',
        updated_at:
            '2026-09-24T10:00:00.000Z',
    };


const incompleteProgress:
    MissionTaskProgress = {
        ...completedProgress,
        is_completed:
            false,
        completed_at:
            null,
        updated_at:
            '2026-09-24T11:00:00.000Z',
    };


const fromMock =
    supabaseClient.from as unknown as jest.Mock;


beforeEach(() => {
    jest.clearAllMocks();
});


describe(
    'mission progress service',
    () => {
        test(
            'loads only the requested authenticated user task progress in task order',
            async () => {
                const orderMock =
                    jest.fn()
                        .mockResolvedValue({
                            data: [
                                completedProgress,
                                incompleteProgress,
                            ],
                            error:
                                null,
                        });

                const eqMock =
                    jest.fn()
                        .mockReturnValue({
                            order:
                                orderMock,
                        });

                const selectMock =
                    jest.fn()
                        .mockReturnValue({
                            eq:
                                eqMock,
                        });

                fromMock.mockReturnValue({
                    select:
                        selectMock,
                });


                await expect(
                    loadMissionTaskProgress(
                        USER_ID,
                    ),
                ).resolves.toEqual([
                    completedProgress,
                    incompleteProgress,
                ]);


                expect(
                    fromMock,
                ).toHaveBeenCalledWith(
                    'user_mission_task_progress',
                );


                expect(
                    selectMock,
                ).toHaveBeenCalledTimes(
                    1,
                );


                const selectedColumns =
                    selectMock
                        .mock
                        .calls[0][0] as string;


                expect(
                    selectedColumns,
                ).not.toContain(
                    '*',
                );


                for (
                    const requiredColumn of [
                        'user_id',
                        'task_id',
                        'is_completed',
                        'completed_at',
                        'created_at',
                        'updated_at',
                    ]
                ) {
                    expect(
                        selectedColumns,
                    ).toContain(
                        requiredColumn,
                    );
                }


                expect(
                    eqMock,
                ).toHaveBeenCalledWith(
                    'user_id',
                    USER_ID,
                );


                expect(
                    orderMock,
                ).toHaveBeenCalledWith(
                    'task_id',
                    {
                        ascending:
                            true,
                    },
                );
            },
        );


        test(
            'propagates an error when mission progress cannot be loaded',
            async () => {
                const progressError = {
                    code:
                        'TEST_PROGRESS_READ',
                    message:
                        'Unable to load mission progress',
                };


                const orderMock =
                    jest.fn()
                        .mockResolvedValue({
                            data:
                                null,
                            error:
                                progressError,
                        });

                const eqMock =
                    jest.fn()
                        .mockReturnValue({
                            order:
                                orderMock,
                        });

                const selectMock =
                    jest.fn()
                        .mockReturnValue({
                            eq:
                                eqMock,
                        });

                fromMock.mockReturnValue({
                    select:
                        selectMock,
                });


                await expect(
                    loadMissionTaskProgress(
                        USER_ID,
                    ),
                ).rejects.toBe(
                    progressError,
                );
            },
        );


        test(
            'updates only completion state when progress already exists',
            async () => {
                const maybeSingleMock =
                    jest.fn()
                        .mockResolvedValue({
                            data:
                                completedProgress,
                            error:
                                null,
                        });

                const selectMock =
                    jest.fn()
                        .mockReturnValue({
                            maybeSingle:
                                maybeSingleMock,
                        });

                const taskEqMock =
                    jest.fn()
                        .mockReturnValue({
                            select:
                                selectMock,
                        });

                const userEqMock =
                    jest.fn()
                        .mockReturnValue({
                            eq:
                                taskEqMock,
                        });

                const updateMock =
                    jest.fn()
                        .mockReturnValue({
                            eq:
                                userEqMock,
                        });

                const insertMock =
                    jest.fn();


                fromMock.mockReturnValue({
                    update:
                        updateMock,
                    insert:
                        insertMock,
                });


                await expect(
                    setMissionTaskCompletion(
                        USER_ID,
                        1,
                        true,
                    ),
                ).resolves.toEqual(
                    completedProgress,
                );


                expect(
                    updateMock,
                ).toHaveBeenCalledWith({
                    is_completed:
                        true,
                });


                expect(
                    userEqMock,
                ).toHaveBeenCalledWith(
                    'user_id',
                    USER_ID,
                );


                expect(
                    taskEqMock,
                ).toHaveBeenCalledWith(
                    'task_id',
                    1,
                );


                expect(
                    insertMock,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'creates progress when no row exists for the authenticated user and task',
            async () => {
                const maybeSingleMock =
                    jest.fn()
                        .mockResolvedValue({
                            data:
                                null,
                            error:
                                null,
                        });

                const updateSelectMock =
                    jest.fn()
                        .mockReturnValue({
                            maybeSingle:
                                maybeSingleMock,
                        });

                const taskEqMock =
                    jest.fn()
                        .mockReturnValue({
                            select:
                                updateSelectMock,
                        });

                const userEqMock =
                    jest.fn()
                        .mockReturnValue({
                            eq:
                                taskEqMock,
                        });

                const updateMock =
                    jest.fn()
                        .mockReturnValue({
                            eq:
                                userEqMock,
                        });


                const singleMock =
                    jest.fn()
                        .mockResolvedValue({
                            data:
                                completedProgress,
                            error:
                                null,
                        });

                const insertSelectMock =
                    jest.fn()
                        .mockReturnValue({
                            single:
                                singleMock,
                        });

                const insertMock =
                    jest.fn()
                        .mockReturnValue({
                            select:
                                insertSelectMock,
                        });


                fromMock.mockReturnValue({
                    update:
                        updateMock,
                    insert:
                        insertMock,
                });


                await expect(
                    setMissionTaskCompletion(
                        USER_ID,
                        1,
                        true,
                    ),
                ).resolves.toEqual(
                    completedProgress,
                );


                expect(
                    insertMock,
                ).toHaveBeenCalledWith({
                    user_id:
                        USER_ID,
                    task_id:
                        1,
                    is_completed:
                        true,
                });
            },
        );


        test(
            'does not attempt an insert when updating existing progress fails',
            async () => {
                const updateError = {
                    code:
                        'TEST_PROGRESS_UPDATE',
                    message:
                        'Unable to update mission progress',
                };


                const maybeSingleMock =
                    jest.fn()
                        .mockResolvedValue({
                            data:
                                null,
                            error:
                                updateError,
                        });

                const selectMock =
                    jest.fn()
                        .mockReturnValue({
                            maybeSingle:
                                maybeSingleMock,
                        });

                const taskEqMock =
                    jest.fn()
                        .mockReturnValue({
                            select:
                                selectMock,
                        });

                const userEqMock =
                    jest.fn()
                        .mockReturnValue({
                            eq:
                                taskEqMock,
                        });

                const updateMock =
                    jest.fn()
                        .mockReturnValue({
                            eq:
                                userEqMock,
                        });

                const insertMock =
                    jest.fn();


                fromMock.mockReturnValue({
                    update:
                        updateMock,
                    insert:
                        insertMock,
                });


                await expect(
                    setMissionTaskCompletion(
                        USER_ID,
                        1,
                        true,
                    ),
                ).rejects.toBe(
                    updateError,
                );


                expect(
                    insertMock,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'propagates an error when new mission progress cannot be created',
            async () => {
                const insertError = {
                    code:
                        'TEST_PROGRESS_INSERT',
                    message:
                        'Unable to create mission progress',
                };


                const maybeSingleMock =
                    jest.fn()
                        .mockResolvedValue({
                            data:
                                null,
                            error:
                                null,
                        });

                const updateSelectMock =
                    jest.fn()
                        .mockReturnValue({
                            maybeSingle:
                                maybeSingleMock,
                        });

                const taskEqMock =
                    jest.fn()
                        .mockReturnValue({
                            select:
                                updateSelectMock,
                        });

                const userEqMock =
                    jest.fn()
                        .mockReturnValue({
                            eq:
                                taskEqMock,
                        });

                const updateMock =
                    jest.fn()
                        .mockReturnValue({
                            eq:
                                userEqMock,
                        });


                const singleMock =
                    jest.fn()
                        .mockResolvedValue({
                            data:
                                null,
                            error:
                                insertError,
                        });

                const insertSelectMock =
                    jest.fn()
                        .mockReturnValue({
                            single:
                                singleMock,
                        });

                const insertMock =
                    jest.fn()
                        .mockReturnValue({
                            select:
                                insertSelectMock,
                        });


                fromMock.mockReturnValue({
                    update:
                        updateMock,
                    insert:
                        insertMock,
                });


                await expect(
                    setMissionTaskCompletion(
                        USER_ID,
                        1,
                        true,
                    ),
                ).rejects.toBe(
                    insertError,
                );
            },
        );
    },
);