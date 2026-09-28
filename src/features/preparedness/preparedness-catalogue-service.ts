import {
    supabaseClient,
} from '@/lib/supabase-config';

import type {
    PreparednessMission,
    PreparednessMissionTask,
} from './preparedness-types';


export type PreparednessCatalogue = {
    missions: PreparednessMission[];
    tasks: PreparednessMissionTask[];
};


/**
 * WHAT:
 * Lists only the mission columns required by the preparedness feature.
 *
 * WHY:
 * The public database schema contains implementation metadata that the mobile
 * client does not need. Explicit selection keeps the application boundary
 * narrow and avoids accidentally depending on future database columns.
 *
 * HOW:
 * Supabase returns only these fields and the generated Database type checks
 * them against the current local schema at compile time.
 */
const PREPAREDNESS_MISSION_COLUMNS = `
    id,
    code,
    title_en,
    title_ar,
    description_en,
    description_ar,
    mission_scope,
    sort_order,
    is_active
` as const;


/**
 * WHAT:
 * Lists only the mission-task columns required by the preparedness feature.
 *
 * WHY:
 * Mission tasks are public preparedness content, but the client should still
 * request only the fields it actually consumes. This also makes the future
 * SQLite cache contract easier to keep stable.
 *
 * HOW:
 * The query explicitly requests identifiers, bilingual display content,
 * optional hazard linkage, points and ordering metadata.
 */
const PREPAREDNESS_TASK_COLUMNS = `
    id,
    mission_id,
    hazard_id,
    code,
    title_en,
    title_ar,
    detail_en,
    detail_ar,
    points,
    sort_order,
    is_active
` as const;


/**
 * WHAT:
 * Loads the currently active preparedness mission catalogue from Supabase.
 *
 * WHY:
 * Missions are public safety content and must be available to both guests and
 * authenticated users. Supabase remains the canonical source while the later
 * SQLite layer will provide offline resilience.
 *
 * HOW:
 * The query explicitly selects the app-facing columns, asks only for active
 * rows and applies deterministic catalogue ordering.
 */
export async function loadActivePreparednessMissions():
    Promise<PreparednessMission[]> {
    const {
        data,
        error,
    } = await supabaseClient
        .from(
            'preparedness_missions',
        )
        .select(
            PREPAREDNESS_MISSION_COLUMNS,
        )
        .eq(
            'is_active',
            true,
        )
        .order(
            'sort_order',
            {
                ascending: true,
            },
        )
        .order(
            'id',
            {
                ascending: true,
            },
        );

    if (error) {
        throw new Error(
            `Unable to load preparedness missions: ${error.message}`,
        );
    }

    return data ?? [];
}


/**
 * WHAT:
 * Loads the currently active task catalogue used by preparedness missions.
 *
 * WHY:
 * The adaptive mission resolver needs the complete active task catalogue so it
 * can filter hazard-linked tasks against the selected location. The service
 * does not perform that filtering itself, which keeps data access separate
 * from deterministic domain logic.
 *
 * HOW:
 * Active tasks are fetched once in mission/order sequence. Their hazard_id is
 * preserved so adaptive-mission-resolver.ts can decide which tasks apply.
 */
export async function loadActivePreparednessTasks():
    Promise<PreparednessMissionTask[]> {
    const {
        data,
        error,
    } = await supabaseClient
        .from(
            'mission_tasks',
        )
        .select(
            PREPAREDNESS_TASK_COLUMNS,
        )
        .eq(
            'is_active',
            true,
        )
        .order(
            'mission_id',
            {
                ascending: true,
            },
        )
        .order(
            'sort_order',
            {
                ascending: true,
            },
        )
        .order(
            'id',
            {
                ascending: true,
            },
        );

    if (error) {
        throw new Error(
            `Unable to load preparedness mission tasks: ${error.message}`,
        );
    }

    return data ?? [];
}


/**
 * WHAT:
 * Loads the complete public preparedness catalogue required by the mission
 * experience.
 *
 * WHY:
 * Callers normally need missions and tasks together. Returning one coherent
 * object avoids duplicating fetch orchestration in screens/providers and gives
 * the future SQLite cache a clear payload to persist.
 *
 * HOW:
 * Missions and tasks are independent public reads, so they are requested in
 * parallel. If either request fails, Promise.all rejects and the caller can
 * later fall back to previously cached content rather than using a partial
 * fresh catalogue.
 */
export async function loadPreparednessCatalogue():
    Promise<PreparednessCatalogue> {
    const [
        missions,
        tasks,
    ] = await Promise.all([
        loadActivePreparednessMissions(),
        loadActivePreparednessTasks(),
    ]);

    return {
        missions,
        tasks,
    };
}
