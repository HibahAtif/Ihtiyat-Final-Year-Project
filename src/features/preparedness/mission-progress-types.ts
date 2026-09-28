import type {
    Tables,
} from '@/types/database.types';


/**
 * WHAT:
 * Represents the authenticated user's persisted completion state for one
 * preparedness mission task.
 *
 * WHY:
 * Mission-progress consumers should depend on the small application contract
 * they actually use rather than the complete generated database row type.
 *
 * HOW:
 * The type remains tied to Supabase's generated schema while explicitly
 * selecting the canonical progress fields returned by the application
 * service.
 */
export type MissionTaskProgress = Pick<
    Tables<'user_mission_task_progress'>,
    | 'user_id'
    | 'task_id'
    | 'is_completed'
    | 'completed_at'
    | 'created_at'
    | 'updated_at'
>;