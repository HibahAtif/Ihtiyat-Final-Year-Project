import type {
    PreparednessMissionResolution,
    PreparednessMissionTask,
} from './preparedness-types';

import type {
    LocalMissionTaskProgress,
} from './mission-progress-local-repository';


/**
 * One mission task enriched with the authenticated user's current progress
 * state for presentation by the Missions UI.
 */
export type DerivedMissionTask =
    PreparednessMissionTask
    & {
        isCompleted:
            boolean;

        isPendingSync:
            boolean;
    };


/**
 * UI-ready progress summary for one already-resolved preparedness mission.
 *
 * The adaptive mission resolver remains responsible for deciding which tasks
 * belong to the mission. This module only derives progress information from
 * that resolved task set.
 */
export type DerivedMissionProgress = {
    missionId:
        number;

    tasks:
        DerivedMissionTask[];

    totalTasks:
        number;

    completedTasks:
        number;

    remainingTasks:
        number;

    completionPercentage:
        number;

    totalAvailablePoints:
        number;

    earnedPoints:
        number;

    isComplete:
        boolean;

    pendingTaskIds:
        number[];

    pendingTaskCount:
        number;
};


/**
 * WHAT:
 * Derives presentation-ready completion, points and synchronisation state for
 * one resolved preparedness mission.
 *
 * WHY:
 * Mission screens should not repeatedly implement progress calculations.
 * Keeping the calculations in a pure function provides one deterministic and
 * independently testable source of truth for mission progress.
 *
 * HOW:
 * - only tasks already present in the PreparednessMissionResolution are used;
 * - persisted progress is indexed by task ID for efficient lookup;
 * - unresolved/filtered-out task progress is ignored;
 * - pending IDs are reduced to tasks belonging to this resolved mission;
 * - points are earned only for completed resolved tasks;
 * - task order is preserved exactly as supplied by the mission resolver.
 */
export function deriveMissionProgress(
    resolution:
        PreparednessMissionResolution,
    progress:
        LocalMissionTaskProgress[],
    pendingTaskIds:
        number[],
): DerivedMissionProgress {
    /*
     * The progress table has one canonical row per user/task combination.
     * Indexing by task ID lets each resolved mission task obtain its current
     * completion state without repeatedly scanning the progress array.
     */
    const progressByTaskId =
        new Map<
            number,
            LocalMissionTaskProgress
        >();


    for (
        const progressItem
        of progress
    ) {
        progressByTaskId.set(
            progressItem.task_id,
            progressItem,
        );
    }


    /*
     * Set semantics collapse duplicate pending IDs naturally. Membership is
     * later checked only while iterating resolved mission tasks, so pending
     * entries belonging to other missions cannot leak into this result.
     */
    const pendingTaskIdSet =
        new Set(
            pendingTaskIds,
        );


    const derivedTasks:
        DerivedMissionTask[] =
        resolution.tasks.map(
            (
                task,
            ) => {
                const taskProgress =
                    progressByTaskId.get(
                        task.id,
                    );


                return {
                    ...task,

                    isCompleted:
                        taskProgress
                            ?.is_completed
                        ?? false,

                    isPendingSync:
                        pendingTaskIdSet.has(
                            task.id,
                        ),
                };
            },
        );


    const totalTasks =
        derivedTasks.length;


    const completedTasks =
        derivedTasks.reduce(
            (
                total,
                task,
            ) =>
                task.isCompleted
                    ? total + 1
                    : total,
            0,
        );


    const remainingTasks =
        totalTasks
        - completedTasks;


    /*
     * An empty mission is deliberately represented as 0% rather than 100%.
     * Having no currently resolved tasks does not mean the user completed a
     * mission.
     */
    const completionPercentage =
        totalTasks === 0
            ? 0
            : Math.round(
                (
                    completedTasks
                    / totalTasks
                )
                * 100,
            );


    const totalAvailablePoints =
        derivedTasks.reduce(
            (
                total,
                task,
            ) =>
                total
                + task.points,
            0,
        );


    const earnedPoints =
        derivedTasks.reduce(
            (
                total,
                task,
            ) =>
                task.isCompleted
                    ? total
                        + task.points
                    : total,
            0,
        );


    /*
     * Derive pending IDs from resolved task order rather than directly from
     * the incoming pending array. This simultaneously:
     *
     * - removes duplicates;
     * - ignores tasks outside this mission;
     * - keeps deterministic mission-task ordering.
     */
    const resolvedPendingTaskIds =
        derivedTasks
            .filter(
                (
                    task,
                ) =>
                    task.isPendingSync,
            )
            .map(
                (
                    task,
                ) =>
                    task.id,
            );


    return {
        missionId:
            resolution.mission.id,

        tasks:
            derivedTasks,

        totalTasks,

        completedTasks,

        remainingTasks,

        completionPercentage,

        totalAvailablePoints,

        earnedPoints,

        /*
         * Zero resolved tasks must never be interpreted as mission
         * completion.
         */
        isComplete:
            totalTasks > 0
            && completedTasks
                === totalTasks,

        pendingTaskIds:
            resolvedPendingTaskIds,

        pendingTaskCount:
            resolvedPendingTaskIds.length,
    };
}