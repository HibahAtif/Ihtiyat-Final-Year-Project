import type {
    PreparednessMission,
    PreparednessMissionResolution,
    PreparednessMissionTask,
    PreparednessResolvedHazard,
} from './preparedness-types';


const sortTasks = (
    tasks: PreparednessMissionTask[],
): PreparednessMissionTask[] =>
    [...tasks].sort(
        (left, right) =>
            left.sort_order - right.sort_order
            || left.id - right.id,
    );


/**
 * Resolves the mission tasks that are relevant to the current location.
 *
 * National missions expose all of their active tasks.
 *
 * Adaptive missions expose general tasks plus hazard-linked tasks whose
 * hazards were prioritised by Supabase's canonical location-hazard resolver.
 * If no location has been selected/resolved yet, only general tasks are
 * returned and the UI is told that location selection is still required.
 */
export function resolvePreparednessMissionTasks(
    mission: PreparednessMission,
    allTasks: PreparednessMissionTask[],
    resolvedHazards: PreparednessResolvedHazard[] | null,
): PreparednessMissionResolution {
    const missionTasks = allTasks.filter(
        (task) =>
            task.mission_id === mission.id
            && task.is_active,
    );

    if (mission.mission_scope !== 'adaptive') {
        return {
            mission,
            tasks: sortTasks(missionTasks),
            requiresLocation: false,
        };
    }

    if (resolvedHazards === null) {
        return {
            mission,
            tasks: sortTasks(
                missionTasks.filter(
                    (task) => task.hazard_id === null,
                ),
            ),
            requiresLocation: true,
        };
    }

    const prioritisedHazardIds = new Set(
        resolvedHazards
            .filter(
                (hazard) => hazard.is_prioritised,
            )
            .map(
                (hazard) => hazard.hazard_id,
            ),
    );

    const relevantTasks = missionTasks.filter(
        (task) =>
            task.hazard_id === null
            || prioritisedHazardIds.has(
                task.hazard_id,
            ),
    );

    return {
        mission,
        tasks: sortTasks(relevantTasks),
        requiresLocation: false,
    };
}
