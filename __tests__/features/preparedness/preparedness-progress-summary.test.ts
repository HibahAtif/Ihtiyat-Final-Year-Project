/// <reference types="jest" />

import {
	derivePreparednessProgressSummary,
} from '@/features/preparedness/preparedness-progress-summary';

import type {
	LocalMissionTaskProgress,
} from '@/features/preparedness/mission-progress-local-repository';

import type {
	PreparednessMissionResolution,
} from '@/features/preparedness/preparedness-types';


const USER_ID =
	'11111111-1111-1111-1111-111111111111';


const missions: PreparednessMissionResolution[] = [
	{
		mission: {
			id: 10,
			code: 'household_emergency_kit',
			title_en: 'Household Emergency Kit',
			title_ar: 'حقيبة الطوارئ المنزلية',
			description_en: 'Prepare essential emergency supplies.',
			description_ar: 'جهّز مستلزمات الطوارئ الأساسية.',
			mission_scope: 'national',
			sort_order: 10,
			is_active: true,
		},

		tasks: [
			{
				id: 101,
				mission_id: 10,
				hazard_id: null,
				code: 'store_drinking_water',
				title_en: 'Store drinking water',
				title_ar: 'خزّن مياه الشرب',
				detail_en: null,
				detail_ar: null,
				points: 10,
				sort_order: 10,
				is_active: true,
			},
			{
				id: 102,
				mission_id: 10,
				hazard_id: null,
				code: 'prepare_flashlight',
				title_en: 'Prepare a flashlight',
				title_ar: 'جهّز مصباحاً يدوياً',
				detail_en: null,
				detail_ar: null,
				points: 20,
				sort_order: 20,
				is_active: true,
			},
		],

		requiresLocation: false,
	},
	{
		mission: {
			id: 20,
			code: 'know_local_hazards',
			title_en: 'Know Your Local Hazards',
			title_ar: 'تعرّف على المخاطر المحلية',
			description_en: 'Learn about hazards relevant to you.',
			description_ar: 'تعرّف على المخاطر ذات الصلة بك.',
			mission_scope: 'adaptive',
			sort_order: 20,
			is_active: true,
		},

		tasks: [
			{
				id: 201,
				mission_id: 20,
				hazard_id: null,
				code: 'know_official_sources',
				title_en: 'Know official warning sources',
				title_ar: 'تعرّف على مصادر التحذير الرسمية',
				detail_en: null,
				detail_ar: null,
				points: 30,
				sort_order: 10,
				is_active: true,
			},
		],

		requiresLocation: false,
	},
];


function createProgress(
	taskId: number,
	isCompleted: boolean,
): LocalMissionTaskProgress {
	return {
		user_id: USER_ID,
		task_id: taskId,
		is_completed: isCompleted,

		completed_at:
			isCompleted
				? '2026-09-25T10:30:00.000Z'
				: null,

		updated_at:
			'2026-09-25T10:30:00.000Z',
	};
}


describe(
	'derivePreparednessProgressSummary',
	() => {
		test(
			'aggregates mission, task, point and pending-sync progress across resolved missions',
			() => {
				const summary =
					derivePreparednessProgressSummary(
						missions,
						[
							createProgress(101, true),
							createProgress(102, false),
							createProgress(201, true),

							/*
							 * Progress outside the current resolved catalogue
							 * must not influence the summary.
							 */
							createProgress(999, true),
						],
						[
							102,
							102,
							999,
						],
					);

				expect(summary).toEqual({
					totalMissions: 2,
					completedMissions: 1,

					totalTasks: 3,
					completedTasks: 2,

					totalAvailablePoints: 60,
					earnedPoints: 40,

					completionPercentage: 67,

					pendingTaskCount: 1,
				});
			},
		);


		test(
			'derives zero earned progress when no resolved tasks have been completed',
			() => {
				const summary =
					derivePreparednessProgressSummary(
						missions,
						[],
						[],
					);

				expect(summary.totalMissions).toBe(2);
				expect(summary.completedMissions).toBe(0);

				expect(summary.totalTasks).toBe(3);
				expect(summary.completedTasks).toBe(0);

				expect(summary.totalAvailablePoints).toBe(60);
				expect(summary.earnedPoints).toBe(0);

				expect(summary.completionPercentage).toBe(0);
				expect(summary.pendingTaskCount).toBe(0);
			},
		);


		test(
			'returns one hundred percent only when all available task points are completed',
			() => {
				const summary =
					derivePreparednessProgressSummary(
						missions,
						[
							createProgress(101, true),
							createProgress(102, true),
							createProgress(201, true),
						],
						[],
					);

				expect(summary.completedTasks).toBe(3);
				expect(summary.completedMissions).toBe(2);

				expect(summary.earnedPoints).toBe(60);
				expect(summary.totalAvailablePoints).toBe(60);

				expect(summary.completionPercentage).toBe(100);
			},
		);


		test(
			'returns a coherent all-zero summary when no missions are currently resolved',
			() => {
				expect(
					derivePreparednessProgressSummary(
						[],
						[
							createProgress(999, true),
						],
						[999],
					),
				).toEqual({
					totalMissions: 0,
					completedMissions: 0,

					totalTasks: 0,
					completedTasks: 0,

					totalAvailablePoints: 0,
					earnedPoints: 0,

					completionPercentage: 0,

					pendingTaskCount: 0,
				});
			},
		);


		test(
			'does not treat a mission with zero resolved tasks as completed',
			() => {
				const emptyMission:
					PreparednessMissionResolution = {
						mission: {
							id: 30,
							code: 'empty_adaptive_mission',
							title_en: 'Adaptive Mission',
							title_ar: 'مهمة تكيفية',
							description_en: 'An adaptive preparedness mission.',
							description_ar: 'مهمة استعداد تكيفية.',
							mission_scope: 'adaptive',
							sort_order: 30,
							is_active: true,
						},

						tasks: [],
						requiresLocation: true,
					};

				const summary =
					derivePreparednessProgressSummary(
						[
							emptyMission,
						],
						[],
						[],
					);

				expect(summary.totalMissions).toBe(1);
				expect(summary.completedMissions).toBe(0);

				expect(summary.totalTasks).toBe(0);
				expect(summary.completedTasks).toBe(0);

				expect(summary.completionPercentage).toBe(0);
			},
		);
	},
);