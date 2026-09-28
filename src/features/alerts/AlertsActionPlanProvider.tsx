import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';

import type {
	ReactNode,
} from 'react';

import {
	useMissionProgress,
} from '@/features/preparedness/MissionProgressProvider';

import {
	useActiveLocation,
} from '@/location/ActiveLocationProvider';

import {
	useProfilePreferences,
} from '@/profile/ProfilePreferencesProvider';

import type {
	LocationRecord,
} from '@/profile/profile-types';

import type {
	AlertsActionAlert,
	AlertsActionCatalogue,
} from './alerts-action-catalogue-service';

import {
	loadAlertsActionFeature,
} from './alerts-action-feature-loader';

import type {
	AlertsActionLoadResult,
	AlertsActionLoadSource,
} from './alerts-action-feature-loader';

import {
	deriveActionPlanForAlert,
	getApplicableAlerts,
} from './alerts-action-plan-derivation';

import type {
	DerivedActionPlan,
} from './alerts-action-plan-derivation';

import type {
	ActionPlanHouseholdContext,
	ActionPlanSeverity,
} from './action-plan-types';


export type AlertsActionPlanStatus =
	| 'loading'
	| 'ready'
	| 'error';


export type AlertsActionPlanContextValue = {
	activeLocation: LocationRecord | null;
	applicableAlerts: AlertsActionAlert[];
	source: AlertsActionLoadSource | null;

	status: AlertsActionPlanStatus;
	isLoading: boolean;

	/*
	 * Public alert data may be ready while authenticated mission progress or
	 * household profile state is still restoring. Alert browsing can continue,
	 * but personalised Action Plan derivation must wait for that state.
	 */
	isActionPlanContextLoading: boolean;

	simulationSeverity: ActionPlanSeverity;

	setSimulationSeverity: (
		severity: ActionPlanSeverity,
	) => void;

	getActionPlan: (
		alertId: number,
	) => DerivedActionPlan;

	refresh: () => Promise<void>;
};


type AlertsActionPlanProviderProps = {
	children: ReactNode;

	/*
	 * Production uses the real current time. Tests inject a deterministic clock
	 * so alert validity never depends on when Jest happens to run.
	 */
	now?: () => string;
};


type LoadedAlertsActionPlanSnapshot = {
	catalogue: AlertsActionCatalogue;
	source: AlertsActionLoadSource;
	applicabilityAt: string;
};


const AlertsActionPlanContext =
	createContext<AlertsActionPlanContextValue | null>(
		null,
	);


/**
 * Production clock used only when a deterministic clock has not been supplied.
 *
 * Keeping the clock outside the component gives useCallback() a stable default
 * dependency and avoids accidental catalogue reload loops.
 */
function getCurrentIsoTime(): string {
	return new Date()
		.toISOString();
}


/**
 * Converts the loader's immutable cache-compatible snapshot into the catalogue
 * contract consumed by the alert applicability and Action Plan domain layer.
 *
 * The values are copied only at this coordination boundary. No domain content
 * is changed.
 */
function toAlertsActionCatalogue(
	loadResult: AlertsActionLoadResult,
): AlertsActionCatalogue {
	return {
		alerts: [
			...loadResult.catalogue.alerts,
		],

		alertLocations: [
			...loadResult.catalogue.alertLocations,
		],

		actions: [
			...loadResult.catalogue.actions,
		],

		rules: [
			...loadResult.catalogue.rules,
		],
	};
}


/**
 * Builds the active location scope used by alert applicability.
 *
 * WHAT:
 * Returns the selected location followed by each known ancestor.
 *
 * WHY:
 * Alerts may be associated with either a granular location such as Jeddah or a
 * wider administrative parent such as Makkah Region.
 *
 * HOW:
 * The active location itself supplies the immediate parent ID. When the public
 * location catalogue is available, the function walks further ancestors. If a
 * guest has only the persisted active LocationRecord, its immediate parent can
 * still safely remain in scope.
 *
 * A visited set prevents malformed hierarchy cycles from causing an infinite
 * loop.
 */
function buildLocationScopeIds(
	activeLocation: LocationRecord | null,
	locations: readonly LocationRecord[],
): number[] {
	if (
		activeLocation === null
	) {
		return [];
	}


	const scopeIds: number[] = [];
	const visitedIds =
		new Set<number>();

	let currentLocation:
		LocationRecord | null =
			activeLocation;


	while (
		currentLocation !== null
	) {
		if (
			visitedIds.has(
				currentLocation.id,
			)
		) {
			break;
		}


		visitedIds.add(
			currentLocation.id,
		);

		scopeIds.push(
			currentLocation.id,
		);


		const parentId: number | null =
			currentLocation.parent_id;


		if (
			parentId === null
			|| visitedIds.has(
				parentId,
			)
		) {
			break;
		}


		const parentLocation: LocationRecord | null =
			locations.find(
				(location) =>
					location.id
					=== parentId,
			)
			?? null;


		if (
			parentLocation === null
		) {
			/*
			 * Guest location restoration may know the immediate parent ID even
			 * when the authenticated profile location catalogue is unavailable.
			 */
			scopeIds.push(
				parentId,
			);

			break;
		}


		currentLocation =
			parentLocation;
	}


	return scopeIds;
}


/**
 * Provides the public alert catalogue together with the current runtime state
 * required to derive explainable Action Plans.
 *
 * WHAT:
 * Coordinates the already-tested alert loader, applicability derivation,
 * mission progress, profile household context and active location.
 *
 * WHY:
 * Screens should not independently repeat network/cache loading, hierarchy
 * resolution or personalisation assembly. Equally, React should not contain the
 * deterministic scoring algorithm itself.
 *
 * HOW:
 * - waits for ActiveLocationProvider restoration before initial catalogue load;
 * - loads through the online-first Supabase/SQLite feature loader;
 * - records whether the accepted catalogue came from remote or cache;
 * - rejects stale asynchronous catalogue requests;
 * - derives location-applicable alerts from the current location scope;
 * - exposes a non-persistent Level 3 simulation default;
 * - combines completed mission tasks and household counts only when a screen
 *   requests an Action Plan;
 * - allows the public alert feed to remain usable while private account state
 *   is still restoring.
 */
export function AlertsActionPlanProvider({
	children,
	now,
}: AlertsActionPlanProviderProps): ReactNode {
	const {
		activeLocation,
		isLoading:
			isActiveLocationLoading,
	} = useActiveLocation();


	const {
		progress,
		isLoading:
			isMissionProgressLoading,
	} = useMissionProgress();


	const {
		profile,
		locations,
		isLoading:
			isProfilePreferencesLoading,
	} = useProfilePreferences();


	const clock =
		now
		?? getCurrentIsoTime;


	const [
		snapshot,
		setSnapshot,
	] = useState<LoadedAlertsActionPlanSnapshot | null>(
		null,
	);


	const [
		status,
		setStatus,
	] = useState<AlertsActionPlanStatus>(
		'loading',
	);


	const [
		simulationSeverity,
		setSimulationSeverityState,
	] = useState<ActionPlanSeverity>(
		3,
	);


	/*
	 * Each catalogue request receives a monotonically increasing identifier.
	 *
	 * A refresh can begin before an earlier request has completed. Only the
	 * latest request may write React state.
	 */
	const loadRequestRef =
		useRef(
			0,
		);


	const loadCurrentCatalogue =
		useCallback(
			async (
				clearExistingData: boolean,
			): Promise<void> => {
				const requestId =
					loadRequestRef.current
					+ 1;

				loadRequestRef.current =
					requestId;


				if (
					clearExistingData
				) {
					setSnapshot(
						null,
					);
				}


				setStatus(
					'loading',
				);


				try {
					const loadResult =
						await loadAlertsActionFeature();


					if (
						loadRequestRef.current
						!== requestId
					) {
						return;
					}


					/*
					 * Evaluate applicability against one consistent timestamp for
					 * this accepted catalogue snapshot. refresh() deliberately
					 * obtains a new timestamp.
					 */
					const applicabilityAt =
						clock();


					setSnapshot({
						catalogue:
							toAlertsActionCatalogue(
								loadResult,
							),

						source:
							loadResult.source,

						applicabilityAt,
					});


					setStatus(
						'ready',
					);
				} catch {
					if (
						loadRequestRef.current
						!== requestId
					) {
						return;
					}


					/*
					 * loadAlertsActionFeature() has already exhausted both its
					 * Supabase and coherent SQLite fallback paths. Do not expose
					 * an older catalogue as though it were the current result.
					 */
					setSnapshot(
						null,
					);

					setStatus(
						'error',
					);
				}
			},
			[
				clock,
			],
		);


	/**
	 * Initial loading waits only for shared active-location restoration.
	 *
	 * The catalogue itself is public. Authenticated progress/profile restoration
	 * must therefore not delay the alert feed.
	 */
	useEffect(() => {
		if (
			isActiveLocationLoading
		) {
			/*
			 * Invalidate any older request if location restoration starts again.
			 */
			loadRequestRef.current +=
				1;

			setSnapshot(
				null,
			);

			setStatus(
				'loading',
			);

			return;
		}


		void loadCurrentCatalogue(
			true,
		);


		return () => {
			/*
			 * A request completing after unmount or dependency replacement must
			 * not write stale state.
			 */
			loadRequestRef.current +=
				1;
		};
	}, [
		isActiveLocationLoading,
		loadCurrentCatalogue,
	]);


	const locationScopeIds =
		useMemo(
			() =>
				buildLocationScopeIds(
					activeLocation,
					locations,
				),
			[
				activeLocation,
				locations,
			],
		);


	/**
	 * Alert applicability remains a pure derived value.
	 *
	 * Changing the active location or receiving a fuller ancestor catalogue can
	 * therefore update the feed without re-downloading the global alert/action
	 * catalogue.
	 */
	const applicableAlerts =
		useMemo<AlertsActionAlert[]>(
			() => {
				if (
					snapshot === null
				) {
					return [];
				}


				return getApplicableAlerts({
					catalogue:
						snapshot.catalogue,

					locationScopeIds,

					at:
						snapshot.applicabilityAt,
				});
			},
			[
				snapshot,
				locationScopeIds,
			],
		);


	/**
	 * MissionProgressProvider already resolves resilient local intent.
	 *
	 * The Action Plan only needs IDs currently represented as complete. An
	 * explicit false or missing progress row remains conservatively incomplete.
	 */
	const completedTaskIds =
		useMemo<number[]>(
			() => {
				const completedIds =
					new Set<number>();


				for (
					const item
					of progress
				) {
					if (
						item.is_completed
					) {
						completedIds.add(
							item.task_id,
						);
					}
				}


				return [
					...completedIds,
				];
			},
			[
				progress,
			],
		);


	/**
	 * V1 household-conditioned rules use only child and older-adult counts.
	 *
	 * null remains semantically important: it means the user has not supplied
	 * that household fact, so the evaluator must not assume the condition.
	 */
	const household =
		useMemo<ActionPlanHouseholdContext | null>(
			() => {
				if (
					profile === null
				) {
					return null;
				}


				return {
					childrenCount:
						profile.children_count,

					olderAdultsCount:
						profile.older_adults_count,
				};
			},
			[
				profile,
			],
		);


	const isActionPlanContextLoading =
		isMissionProgressLoading
		|| isProfilePreferencesLoading;


	const setSimulationSeverity =
		useCallback(
			(
				severity: ActionPlanSeverity,
			): void => {
				setSimulationSeverityState(
					severity,
				);
			},
			[],
		);


	/**
	 * Produces one current Action Plan on demand rather than storing a generated
	 * ranking in React state or SQLite.
	 *
	 * The already-tested derivation layer remains responsible for validating
	 * applicability, handling simulated-vs-real severity and invoking the pure
	 * evaluator.
	 */
	const getActionPlan =
		useCallback(
			(
				alertId: number,
			): DerivedActionPlan => {
				if (
					isActionPlanContextLoading
				) {
					throw new Error(
						'Action Plan context is still loading.',
					);
				}


				if (
					snapshot === null
				) {
					throw new Error(
						'Alert/action catalogue is not ready.',
					);
				}


				return deriveActionPlanForAlert({
					catalogue:
						snapshot.catalogue,

					alertId,

					locationScopeIds,

					activeLocationId:
						activeLocation?.id
						?? null,

					at:
						snapshot.applicabilityAt,

					simulationSeverity,

					completedTaskIds,

					household,
				});
			},
			[
				isActionPlanContextLoading,
				snapshot,
				locationScopeIds,
				activeLocation?.id,
				simulationSeverity,
				completedTaskIds,
				household,
			],
		);


	const refresh =
		useCallback(
			async (): Promise<void> => {
				/*
				 * Location restoration owns the canonical location boundary.
				 * Starting a catalogue refresh before it finishes would create
				 * unnecessary work for data that cannot yet be presented.
				 */
				if (
					isActiveLocationLoading
				) {
					return;
				}


				await loadCurrentCatalogue(
					false,
				);
			},
			[
				isActiveLocationLoading,
				loadCurrentCatalogue,
			],
		);


	const contextValue =
		useMemo<AlertsActionPlanContextValue>(
			() => ({
				activeLocation,

				applicableAlerts,

				source:
					snapshot?.source
					?? null,

				status,

				isLoading:
					status
					=== 'loading',

				isActionPlanContextLoading,

				simulationSeverity,

				setSimulationSeverity,

				getActionPlan,

				refresh,
			}),
			[
				activeLocation,
				applicableAlerts,
				snapshot?.source,
				status,
				isActionPlanContextLoading,
				simulationSeverity,
				setSimulationSeverity,
				getActionPlan,
				refresh,
			],
		);


	return (
		<AlertsActionPlanContext.Provider
			value={contextValue}
		>
			{children}
		</AlertsActionPlanContext.Provider>
	);
}


/**
 * Provides the current shared Alerts + Action Plan coordination state.
 *
 * The explicit guard catches incorrect provider placement immediately rather
 * than allowing screens to fail later with undefined state.
 */
export function useAlertsActionPlan():
	AlertsActionPlanContextValue {
	const context =
		useContext(
			AlertsActionPlanContext,
		);


	if (
		context === null
	) {
		throw new Error(
			'useAlertsActionPlan must be used within an AlertsActionPlanProvider.',
		);
	}


	return context;
}