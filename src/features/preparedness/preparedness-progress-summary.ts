import {
	deriveMissionProgress,
} from './mission-progress-derivation';

import type {
	LocalMissionTaskProgress,
} from './mission-progress-local-repository';

import type {
	PreparednessMissionResolution,
} from './preparedness-types';


export type PreparednessProgressSummary = {
	totalMissions: number;
	completedMissions: number;

	totalTasks: number;
	completedTasks: number;

	totalAvailablePoints: number;
	earnedPoints: number;

	completionPercentage: number;

	pendingTaskCount: number;
};


/**
 * Produces one account-level preparedness progress summary from the currently
 * resolved public missions and the authenticated user's private task state.
 *
 * The percentage is point-weighted because Ihtiyat's preparedness reward
 * model assigns points to completed practical tasks. It is presented as
 * mission completion, never as a measure of household safety.
*/
export function derivePreparednessProgressSummary(
	missions: PreparednessMissionResolution[],
	progress: LocalMissionTaskProgress[],
	pendingTaskIds: number[],
): PreparednessProgressSummary {
	const derivedMissions = missions.map(
		(mission) => deriveMissionProgress(
				mission,
				progress,
				pendingTaskIds,
			),
	);

	const totalMissions = derivedMissions.length;

	const completedMissions =
		derivedMissions.filter( (mission) => mission.isComplete,).length;

	const totalTasks =
		derivedMissions.reduce(
			(total, mission) => total + mission.totalTasks, 0,
		);

	const completedTasks =
		derivedMissions.reduce(
			(total, mission) => total + mission.completedTasks, 0,
		);

	const totalAvailablePoints =
		derivedMissions.reduce(
			(total, mission) => total + mission.totalAvailablePoints, 0,
		);

	const earnedPoints =
		derivedMissions.reduce(
			(total, mission) => total + mission.earnedPoints, 0,
		);

	const pendingTaskCount =
		derivedMissions.reduce(
			(total, mission) => total + mission.pendingTaskCount, 0,
		);

	const completionPercentage =
		totalAvailablePoints === 0
			? 0
			: Math.round(
				(
					earnedPoints
					/ totalAvailablePoints
				) * 100,
			);

	return {
		totalMissions,
		completedMissions,
		totalTasks,
		completedTasks,
		totalAvailablePoints,
		earnedPoints,
		completionPercentage,
		pendingTaskCount,
	};
}