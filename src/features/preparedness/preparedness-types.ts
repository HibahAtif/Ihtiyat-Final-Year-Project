import type {
    Database,
    Tables,
} from '@/types/database.types';


/**
 * Public mission data required by the preparedness application layer.
 *
 * Using Pick keeps the application contract deliberately smaller than the
 * physical database row while remaining tied to generated Supabase types.
*/
export type PreparednessMission = Pick<
    Tables<'preparedness_missions'>,
    | 'id'
    | 'code'
    | 'title_en'
    | 'title_ar'
    | 'description_en'
    | 'description_ar'
    | 'mission_scope'
    | 'sort_order'
    | 'is_active'
>;


/**
 * Public mission-task data required to build the mission experience.
 */
export type PreparednessMissionTask = Pick<
    Tables<'mission_tasks'>,
    | 'id'
    | 'mission_id'
    | 'hazard_id'
    | 'code'
    | 'title_en'
    | 'title_ar'
    | 'detail_en'
    | 'detail_ar'
    | 'points'
    | 'sort_order'
    | 'is_active'
>;


/**
 * Typed result row returned by the existing location-hazard RPC.
*/
export type PreparednessResolvedHazardRpcRow =
    Database['public']['Functions']['resolve_location_hazards']['Returns'][number];

/**
 * Public location-hazard result consumed by the preparedness application layer.
 *
 * Supabase's generated function type does not express the nullable columns
 * produced by the resolver's LEFT JOIN for hazards without a matching location
 * profile. Those hazards remain valid catalogue entries but are not prioritised.
*/
export type PreparednessResolvedHazard =
    Omit<
        PreparednessResolvedHazardRpcRow,
        | 'relevance_rank'
        | 'matched_location_id'
        | 'matched_location_code'
        | 'matched_location_type'
        | 'matched_location_name_en'
        | 'matched_location_name_ar'
        | 'hierarchy_distance'
    >
    & {
        relevance_rank: number | null;
        matched_location_id: number | null;
        matched_location_code: string | null;
        matched_location_type: string | null;
        matched_location_name_en: string | null;
        matched_location_name_ar: string | null;
        hierarchy_distance: number | null;
    };


/**
 * Result consumed by the future Missions UI.
 *
 * resolvedHazards === null means there is currently no selected/resolved
 * location. An empty array is different: a location was resolved but no
 * hazards were prioritised for it.
*/
export type PreparednessMissionResolution = {
    mission: PreparednessMission;
    tasks: PreparednessMissionTask[];
    requiresLocation: boolean;
};
