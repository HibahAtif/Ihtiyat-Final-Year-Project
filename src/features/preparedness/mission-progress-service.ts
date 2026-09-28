import {
    supabaseClient,
} from '@/lib/supabase-config';

import type {
    MissionTaskProgress,
} from './mission-progress-types';


/**
 * WHAT:
 * Lists only the mission-progress columns required by the preparedness
 * application layer.
 *
 * WHY:
 * The database controls progress ownership and timestamps. Explicit selection
 * keeps the client contract narrow while still returning the canonical row
 * produced after an insert or update.
 *
 * HOW:
 * Supabase returns the user/task identity, completion state and
 * database-managed timestamps required by later progress and synchronisation
 * layers.
 */
const MISSION_TASK_PROGRESS_COLUMNS = `
    user_id,
    task_id,
    is_completed,
    completed_at,
    created_at,
    updated_at
` as const;


/**
 * WHAT:
 * Loads the persisted mission-task progress belonging to one authenticated
 * Ihtiyat account.
 *
 * WHY:
 * Mission catalogue content is public, but personal completion state is
 * private account data. Keeping that read in a dedicated service separates
 * authenticated progress from the public preparedness-content pipeline.
 *
 * HOW:
 * The request explicitly filters by the expected authenticated user ID and
 * returns rows in deterministic task order. PostgreSQL Row Level Security
 * remains the authoritative ownership boundary.
 */
export async function loadMissionTaskProgress(
    userId: string,
): Promise<MissionTaskProgress[]> {
    const {
        data,
        error,
    } = await supabaseClient
        .from(
            'user_mission_task_progress',
        )
        .select(
            MISSION_TASK_PROGRESS_COLUMNS,
        )
        .eq(
            'user_id',
            userId,
        )
        .order(
            'task_id',
            {
                ascending: true,
            },
        );


    if (error) {
        throw error;
    }


    return data ?? [];
}


/**
 * WHAT:
 * Sets the authenticated user's completion state for one preparedness task and
 * returns the canonical progress row stored by Supabase.
 *
 * WHY:
 * A task may already have a progress row or may be receiving progress for the
 * first time. The client is permitted to change only is_completed on existing
 * progress while PostgreSQL owns identifiers, timestamps and achievement
 * evaluation.
 *
 * HOW:
 * The service first attempts to update an existing row using only
 * is_completed. If no row exists, it inserts the permitted creation fields:
 * user_id, task_id and is_completed. Both paths request the canonical stored
 * row after PostgreSQL has applied its triggers.
 *
 * Row Level Security and column privileges remain responsible for rejecting
 * cross-account writes and progress against unavailable catalogue tasks.
 */
export async function setMissionTaskCompletion(
    userId: string,
    taskId: number,
    isCompleted: boolean,
): Promise<MissionTaskProgress> {
    const {
        data: updatedProgress,
        error: updateError,
    } = await supabaseClient
        .from(
            'user_mission_task_progress',
        )
        .update({
            is_completed:
                isCompleted,
        })
        .eq(
            'user_id',
            userId,
        )
        .eq(
            'task_id',
            taskId,
        )
        .select(
            MISSION_TASK_PROGRESS_COLUMNS,
        )
        .maybeSingle();


    if (updateError) {
        throw updateError;
    }


    if (updatedProgress) {
        return updatedProgress;
    }


    const {
        data: insertedProgress,
        error: insertError,
    } = await supabaseClient
        .from(
            'user_mission_task_progress',
        )
        .insert({
            user_id:
                userId,
            task_id:
                taskId,
            is_completed:
                isCompleted,
        })
        .select(
            MISSION_TASK_PROGRESS_COLUMNS,
        )
        .single();


    if (insertError) {
        throw insertError;
    }


    return insertedProgress;
}