/// <reference types="jest" />

import {
    deriveMissionProgress,
} from '@/features/preparedness/mission-progress-derivation';

import type {
    PreparednessMissionResolution,
    PreparednessMissionTask,
} from '@/features/preparedness/preparedness-types';

import type {
    LocalMissionTaskProgress,
} from '@/features/preparedness/mission-progress-local-repository';


const USER_ID =
    '11111111-1111-1111-1111-111111111111';


const tasks:
    PreparednessMissionTask[] = [
        {
            id:
                1,
            mission_id:
                10,
            hazard_id:
                null,
            code:
                'TASK_ONE',
            title_en:
                'Task one',
            title_ar:
                'المهمة الأولى',
            detail_en:
                'First task detail',
            detail_ar:
                'تفاصيل المهمة الأولى',
            points:
                10,
            sort_order:
                1,
            is_active:
                true,
        },
        {
            id:
                2,
            mission_id:
                10,
            hazard_id:
                null,
            code:
                'TASK_TWO',
            title_en:
                'Task two',
            title_ar:
                'المهمة الثانية',
            detail_en:
                'Second task detail',
            detail_ar:
                'تفاصيل المهمة الثانية',
            points:
                20,
            sort_order:
                2,
            is_active:
                true,
        },
        {
            id:
                3,
            mission_id:
                10,
            hazard_id:
                1,
            code:
                'TASK_THREE',
            title_en:
                'Task three',
            title_ar:
                'المهمة الثالثة',
            detail_en:
                'Third task detail',
            detail_ar:
                'تفاصيل المهمة الثالثة',
            points:
                30,
            sort_order:
                3,
            is_active:
                true,
        },
    ];


const missionResolution:
    PreparednessMissionResolution = {
        mission: {
            id:
                10,
            code:
                'TEST_MISSION',
            title_en:
                'Test mission',
            title_ar:
                'مهمة اختبار',
            description_en:
                'Mission used by derivation tests.',
            description_ar:
                'مهمة مستخدمة في اختبارات الاشتقاق.',
            mission_scope:
                'adaptive',
            sort_order:
                1,
            is_active:
                true,
        },
        tasks,
        requiresLocation:
            false,
    };


function createProgress(
    taskId: number,
    isCompleted: boolean,
): LocalMissionTaskProgress {
    return {
        user_id:
            USER_ID,
        task_id:
            taskId,
        is_completed:
            isCompleted,
        completed_at:
            isCompleted
                ? '2026-09-24T12:00:00.000Z'
                : null,
        updated_at:
            '2026-09-24T12:00:00.000Z',
    };
}


describe(
    'mission progress derivations',
    () => {
        test(
            'derives an untouched mission with zero completed tasks and zero earned points',
            () => {
                const result =
                    deriveMissionProgress(
                        missionResolution,
                        [],
                        [],
                    );


                expect(
                    result,
                ).toEqual(
                    expect.objectContaining({
                        missionId:
                            10,
                        totalTasks:
                            3,
                        completedTasks:
                            0,
                        remainingTasks:
                            3,
                        completionPercentage:
                            0,
                        totalAvailablePoints:
                            60,
                        earnedPoints:
                            0,
                        isComplete:
                            false,
                        pendingTaskIds:
                            [],
                        pendingTaskCount:
                            0,
                    }),
                );


                expect(
                    result.tasks.map(
                        (
                            task,
                        ) => ({
                            id:
                                task.id,
                            isCompleted:
                                task.isCompleted,
                            isPendingSync:
                                task.isPendingSync,
                        }),
                    ),
                ).toEqual([
                    {
                        id:
                            1,
                        isCompleted:
                            false,
                        isPendingSync:
                            false,
                    },
                    {
                        id:
                            2,
                        isCompleted:
                            false,
                        isPendingSync:
                            false,
                    },
                    {
                        id:
                            3,
                        isCompleted:
                            false,
                        isPendingSync:
                            false,
                    },
                ]);
            },
        );


        test(
            'calculates completed tasks percentage and earned points from relevant completed progress',
            () => {
                const result =
                    deriveMissionProgress(
                        missionResolution,
                        [
                            createProgress(
                                1,
                                true,
                            ),
                            createProgress(
                                2,
                                false,
                            ),
                            createProgress(
                                3,
                                true,
                            ),
                        ],
                        [],
                    );


                expect(
                    result.completedTasks,
                ).toBe(
                    2,
                );

                expect(
                    result.remainingTasks,
                ).toBe(
                    1,
                );

                expect(
                    result.completionPercentage,
                ).toBe(
                    67,
                );

                expect(
                    result.totalAvailablePoints,
                ).toBe(
                    60,
                );

                expect(
                    result.earnedPoints,
                ).toBe(
                    40,
                );

                expect(
                    result.isComplete,
                ).toBe(
                    false,
                );
            },
        );


        test(
            'marks a mission complete only when every resolved task is completed',
            () => {
                const result =
                    deriveMissionProgress(
                        missionResolution,
                        [
                            createProgress(
                                1,
                                true,
                            ),
                            createProgress(
                                2,
                                true,
                            ),
                            createProgress(
                                3,
                                true,
                            ),
                        ],
                        [],
                    );


                expect(
                    result.completedTasks,
                ).toBe(
                    3,
                );

                expect(
                    result.remainingTasks,
                ).toBe(
                    0,
                );

                expect(
                    result.completionPercentage,
                ).toBe(
                    100,
                );

                expect(
                    result.earnedPoints,
                ).toBe(
                    60,
                );

                expect(
                    result.isComplete,
                ).toBe(
                    true,
                );
            },
        );


        test(
            'does not treat a mission with no resolved tasks as completed',
            () => {
                const emptyResolution:
                    PreparednessMissionResolution = {
                        ...missionResolution,
                        tasks:
                            [],
                    };


                const result =
                    deriveMissionProgress(
                        emptyResolution,
                        [],
                        [],
                    );


                expect(
                    result.totalTasks,
                ).toBe(
                    0,
                );

                expect(
                    result.completedTasks,
                ).toBe(
                    0,
                );

                expect(
                    result.remainingTasks,
                ).toBe(
                    0,
                );

                expect(
                    result.completionPercentage,
                ).toBe(
                    0,
                );

                expect(
                    result.totalAvailablePoints,
                ).toBe(
                    0,
                );

                expect(
                    result.earnedPoints,
                ).toBe(
                    0,
                );

                expect(
                    result.isComplete,
                ).toBe(
                    false,
                );
            },
        );


        test(
            'ignores progress for tasks that are not part of the resolved mission',
            () => {
                const adaptiveResolution:
                    PreparednessMissionResolution = {
                        ...missionResolution,
                        tasks: [
                            tasks[0],
                            tasks[1],
                        ],
                    };


                const result =
                    deriveMissionProgress(
                        adaptiveResolution,
                        [
                            createProgress(
                                1,
                                true,
                            ),
                            createProgress(
                                3,
                                true,
                            ),
                            createProgress(
                                999,
                                true,
                            ),
                        ],
                        [],
                    );


                expect(
                    result.totalTasks,
                ).toBe(
                    2,
                );

                expect(
                    result.completedTasks,
                ).toBe(
                    1,
                );

                expect(
                    result.earnedPoints,
                ).toBe(
                    10,
                );

                expect(
                    result.completionPercentage,
                ).toBe(
                    50,
                );

                expect(
                    result.isComplete,
                ).toBe(
                    false,
                );
            },
        );


        test(
            'marks only resolved tasks with pending synchronisation state',
            () => {
                const result =
                    deriveMissionProgress(
                        missionResolution,
                        [
                            createProgress(
                                1,
                                true,
                            ),
                            createProgress(
                                3,
                                true,
                            ),
                        ],
                        [
                            3,
                            999,
                            1,
                            3,
                        ],
                    );


                expect(
                    result.pendingTaskIds,
                ).toEqual([
                    1,
                    3,
                ]);

                expect(
                    result.pendingTaskCount,
                ).toBe(
                    2,
                );


                expect(
                    result.tasks.map(
                        (
                            task,
                        ) => ({
                            id:
                                task.id,
                            isPendingSync:
                                task.isPendingSync,
                        }),
                    ),
                ).toEqual([
                    {
                        id:
                            1,
                        isPendingSync:
                            true,
                    },
                    {
                        id:
                            2,
                        isPendingSync:
                            false,
                    },
                    {
                        id:
                            3,
                        isPendingSync:
                            true,
                    },
                ]);
            },
        );


        test(
            'does not award points for incomplete task progress',
            () => {
                const result =
                    deriveMissionProgress(
                        missionResolution,
                        [
                            createProgress(
                                1,
                                false,
                            ),
                            createProgress(
                                2,
                                false,
                            ),
                            createProgress(
                                3,
                                false,
                            ),
                        ],
                        [],
                    );


                expect(
                    result.completedTasks,
                ).toBe(
                    0,
                );

                expect(
                    result.earnedPoints,
                ).toBe(
                    0,
                );

                expect(
                    result.totalAvailablePoints,
                ).toBe(
                    60,
                );
            },
        );


        test(
            'preserves the resolved task order while attaching completion and pending state',
            () => {
                const reorderedResolution:
                    PreparednessMissionResolution = {
                        ...missionResolution,
                        tasks: [
                            tasks[2],
                            tasks[0],
                            tasks[1],
                        ],
                    };


                const result =
                    deriveMissionProgress(
                        reorderedResolution,
                        [
                            createProgress(
                                1,
                                true,
                            ),
                            createProgress(
                                3,
                                true,
                            ),
                        ],
                        [
                            1,
                        ],
                    );


                expect(
                    result.tasks.map(
                        (
                            task,
                        ) =>
                            task.id,
                    ),
                ).toEqual([
                    3,
                    1,
                    2,
                ]);


                expect(
                    result.tasks.map(
                        (
                            task,
                        ) => ({
                            id:
                                task.id,
                            completed:
                                task.isCompleted,
                            pending:
                                task.isPendingSync,
                        }),
                    ),
                ).toEqual([
                    {
                        id:
                            3,
                        completed:
                            true,
                        pending:
                            false,
                    },
                    {
                        id:
                            1,
                        completed:
                            true,
                        pending:
                            true,
                    },
                    {
                        id:
                            2,
                        completed:
                            false,
                        pending:
                            false,
                    },
                ]);
            },
        );
    },
);