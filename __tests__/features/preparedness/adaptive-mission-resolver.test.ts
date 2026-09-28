/// <reference types="jest" />

import { resolvePreparednessMissionTasks } from '@/features/preparedness/adaptive-mission-resolver';

import type {
    PreparednessMission,
    PreparednessMissionTask,
    PreparednessResolvedHazard,
} from '@/features/preparedness/preparedness-types';


const nationalMission: PreparednessMission = {
    id: 1,
    code: 'prepare_first_aid_kit',
    title_en: 'Prepare a First Aid Kit',
    title_ar: 'جهّز حقيبة إسعافات أولية',
    description_en: 'Test national mission.',
    description_ar: 'مهمة وطنية للاختبار.',
    mission_scope: 'national',
    sort_order: 10,
    is_active: true,
};


const adaptiveMission: PreparednessMission = {
    id: 4,
    code: 'know_your_local_hazards',
    title_en: 'Know Your Local Hazards',
    title_ar: 'تعرّف على المخاطر المحلية في منطقتك',
    description_en: 'Test adaptive mission.',
    description_ar: 'مهمة تكيفية للاختبار.',
    mission_scope: 'adaptive',
    sort_order: 40,
    is_active: true,
};


const tasks: PreparednessMissionTask[] = [
    {
        id: 11,
        mission_id: 1,
        hazard_id: null,
        code: 'national_second',
        title_en: 'Second',
        title_ar: 'الثانية',
        detail_en: null,
        detail_ar: null,
        points: 20,
        sort_order: 20,
        is_active: true,
    },
    {
        id: 10,
        mission_id: 1,
        hazard_id: null,
        code: 'national_first',
        title_en: 'First',
        title_ar: 'الأولى',
        detail_en: null,
        detail_ar: null,
        points: 20,
        sort_order: 10,
        is_active: true,
    },
    {
        id: 12,
        mission_id: 1,
        hazard_id: null,
        code: 'national_inactive',
        title_en: 'Inactive',
        title_ar: 'غير نشطة',
        detail_en: null,
        detail_ar: null,
        points: 20,
        sort_order: 30,
        is_active: false,
    },
    {
        id: 40,
        mission_id: 4,
        hazard_id: null,
        code: 'adaptive_general',
        title_en: 'General',
        title_ar: 'عامة',
        detail_en: null,
        detail_ar: null,
        points: 20,
        sort_order: 5,
        is_active: true,
    },
    {
        id: 41,
        mission_id: 4,
        hazard_id: 1,
        code: 'local_hazard_flood',
        title_en: 'Flood',
        title_ar: 'السيول',
        detail_en: null,
        detail_ar: null,
        points: 20,
        sort_order: 10,
        is_active: true,
    },
    {
        id: 42,
        mission_id: 4,
        hazard_id: 2,
        code: 'local_hazard_heat',
        title_en: 'Heat',
        title_ar: 'الحرارة',
        detail_en: null,
        detail_ar: null,
        points: 20,
        sort_order: 20,
        is_active: true,
    },
    {
        id: 43,
        mission_id: 4,
        hazard_id: 3,
        code: 'local_hazard_dust',
        title_en: 'Dust',
        title_ar: 'الغبار',
        detail_en: null,
        detail_ar: null,
        points: 20,
        sort_order: 30,
        is_active: true,
    },
];


const resolvedHazard = (
    hazardId: number,
    prioritised: boolean,
): PreparednessResolvedHazard => ({
    hazard_id: hazardId,
    hazard_code: `hazard_${hazardId}`,
    hazard_name_en: `Hazard ${hazardId}`,
    hazard_name_ar: `خطر ${hazardId}`,
    classification: 'core',
    hazard_sort_order: hazardId,
    is_prioritised: prioritised,
    relevance_rank: prioritised ? 1 : null as never,
    matched_location_id: prioritised ? 100 : null as never,
    matched_location_code: prioritised ? '0124' : null as never,
    matched_location_type: prioritised ? 'governorate' : null as never,
    matched_location_name_en: prioritised ? 'Jeddah' : null as never,
    matched_location_name_ar: prioritised ? 'جدة' : null as never,
    hierarchy_distance: prioritised ? 0 : null as never,
});


describe('resolvePreparednessMissionTasks', () => {
    test('national missions return all active mission tasks in catalogue order', () => {
        const result = resolvePreparednessMissionTasks(
            nationalMission,
            tasks,
            null,
        );

        expect(
            result.tasks.map(
                (task) => task.code,
            ),
        ).toEqual([
            'national_first',
            'national_second',
        ]);

        expect(
            result.requiresLocation,
        ).toBe(false);
    });


    test('adaptive missions require location when no hazard resolution exists', () => {
        const result = resolvePreparednessMissionTasks(
            adaptiveMission,
            tasks,
            null,
        );

        expect(
            result.tasks.map(
                (task) => task.code,
            ),
        ).toEqual([
            'adaptive_general',
        ]);

        expect(
            result.requiresLocation,
        ).toBe(true);
    });


    test('adaptive missions include general tasks and only prioritised hazard tasks', () => {
        const result = resolvePreparednessMissionTasks(
            adaptiveMission,
            tasks,
            [
                resolvedHazard(
                    1,
                    true,
                ),
                resolvedHazard(
                    2,
                    true,
                ),
                resolvedHazard(
                    3,
                    false,
                ),
            ],
        );

        expect(
            result.tasks.map(
                (task) => task.code,
            ),
        ).toEqual([
            'adaptive_general',
            'local_hazard_flood',
            'local_hazard_heat',
        ]);

        expect(
            result.requiresLocation,
        ).toBe(false);
    });


    test('an explicitly resolved location with no prioritised hazards does not request location again', () => {
        const result = resolvePreparednessMissionTasks(
            adaptiveMission,
            tasks,
            [],
        );

        expect(
            result.tasks.map(
                (task) => task.code,
            ),
        ).toEqual([
            'adaptive_general',
        ]);

        expect(
            result.requiresLocation,
        ).toBe(false);
    });
});
