/// <reference types="jest" />


import {
	useState,
} from 'react';

import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react-native';

import {
	Pressable,
	Text,
	View,
} from 'react-native';


jest.mock(
	'@/location/ActiveLocationProvider',
	() => ({
		useActiveLocation:
			jest.fn(),
	}),
);


jest.mock(
	'@/features/preparedness/MissionProgressProvider',
	() => ({
		useMissionProgress:
			jest.fn(),
	}),
);


jest.mock(
	'@/profile/ProfilePreferencesProvider',
	() => ({
		useProfilePreferences:
			jest.fn(),
	}),
);


jest.mock(
	'@/features/alerts/alerts-action-feature-loader',
	() => ({
		loadAlertsActionFeature:
			jest.fn(),
	}),
);


jest.mock(
	'@/features/alerts/alerts-action-plan-derivation',
	() => ({
		getApplicableAlerts:
			jest.fn(),

		deriveActionPlanForAlert:
			jest.fn(),
	}),
);


import {
	AlertsActionPlanProvider,
	useAlertsActionPlan,
} from '@/features/alerts/AlertsActionPlanProvider';

import {
	useActiveLocation,
} from '@/location/ActiveLocationProvider';

import {
	useMissionProgress,
} from '@/features/preparedness/MissionProgressProvider';

import {
	useProfilePreferences,
} from '@/profile/ProfilePreferencesProvider';

import {
	loadAlertsActionFeature,
} from '@/features/alerts/alerts-action-feature-loader';

import type {
	AlertsActionLoadResult,
} from '@/features/alerts/alerts-action-feature-loader';

import {
	deriveActionPlanForAlert,
	getApplicableAlerts,
} from '@/features/alerts/alerts-action-plan-derivation';

import type {
	DerivedActionPlan,
} from '@/features/alerts/alerts-action-plan-derivation';

import type {
	AlertsActionAlert,
	AlertsActionCatalogue,
} from '@/features/alerts/alerts-action-catalogue-service';

import type {
	LocalMissionTaskProgress,
} from '@/features/preparedness/mission-progress-local-repository';

import type {
	LocationRecord,
	ProfilePreferences,
} from '@/profile/profile-types';


const useActiveLocationMock =
	useActiveLocation as jest.MockedFunction<
		typeof useActiveLocation
	>;

const useMissionProgressMock =
	useMissionProgress as jest.MockedFunction<
		typeof useMissionProgress
	>;

const useProfilePreferencesMock =
	useProfilePreferences as jest.MockedFunction<
		typeof useProfilePreferences
	>;

const loadAlertsActionFeatureMock =
	loadAlertsActionFeature as jest.MockedFunction<
		typeof loadAlertsActionFeature
	>;

const getApplicableAlertsMock =
	getApplicableAlerts as jest.MockedFunction<
		typeof getApplicableAlerts
	>;

const deriveActionPlanForAlertMock =
	deriveActionPlanForAlert as jest.MockedFunction<
		typeof deriveActionPlanForAlert
	>;


const AT =
	'2050-06-01T12:00:00.000Z';

const LATER_AT =
	'2050-06-01T13:00:00.000Z';

const USER_ID =
	'11111111-1111-1111-1111-111111111111';

const JEDDAH_ID =
	201;

const MAKKAH_REGION_ID =
	200;

const BACKUP_POWER_TASK_ID =
	900;


const jeddahLocation: LocationRecord = {
	id: JEDDAH_ID,
	parent_id: MAKKAH_REGION_ID,
	official_code: '0124',
	location_type: 'governorate',
	name_en: 'Jeddah',
	name_ar: 'جدة',
	is_active: true,
};


const makkahRegion: LocationRecord = {
	id: MAKKAH_REGION_ID,
	parent_id: null,
	official_code: '0002',
	location_type: 'region',
	name_en: 'Makkah Region',
	name_ar: 'منطقة مكة المكرمة',
	is_active: true,
};


const floodAlert: AlertsActionAlert = {
	id: 101,
	code: 'sim_flood_jeddah_severe',
	hazard_id: 11,
	origin_type: 'simulated',
	external_alert_id: null,
	severity: 3,
	title_en: '[SIMULATION] Severe flood scenario',
	title_ar: '[محاكاة] سيناريو سيول شديدة',
	message_en: 'A severe flood scenario is being simulated.',
	message_ar: 'تتم محاكاة سيناريو سيول شديدة.',
	starts_at: '2040-01-01T00:00:00.000Z',
	published_at: '2040-01-01T00:00:00.000Z',
	expires_at: '2099-12-31T23:59:59.000Z',
	publication_status: 'published',
	sort_order: 10,
};


const catalogue: AlertsActionCatalogue = {
	alerts: [
		floodAlert,
	],
	alertLocations: [
		{
			alert_id:
				floodAlert.id,
			location_id:
				JEDDAH_ID,
		},
	],
	actions: [],
	rules: [],
};


const remoteLoadResult: AlertsActionLoadResult = {
	catalogue,
	source: 'remote',
};


const cacheLoadResult: AlertsActionLoadResult = {
	catalogue,
	source: 'cache',
};


const profile: ProfilePreferences = {
	id: USER_ID,
	active_location_id: JEDDAH_ID,
	preferred_language_code: 'en',
	text_size_preference: 'system',
	children_count: 2,
	adults_count: 2,
	older_adults_count: 1,
	pets_count: 0,
};


const completedProgress: LocalMissionTaskProgress = {
	user_id: USER_ID,
	task_id: BACKUP_POWER_TASK_ID,
	is_completed: true,
	completed_at: '2050-05-01T10:00:00.000Z',
	updated_at: '2050-05-01T10:00:00.000Z',
};


const incompleteProgress: LocalMissionTaskProgress = {
	user_id: USER_ID,
	task_id: 901,
	is_completed: false,
	completed_at: null,
	updated_at: '2050-05-01T10:05:00.000Z',
};


const derivedPlan: DerivedActionPlan = {
	alert:
		floodAlert,
	effectiveSeverity:
		3,
	items: [],
};


function ProviderConsumer() {
	const context =
		useAlertsActionPlan();

	const [
		planText,
		setPlanText,
	] = useState(
		'none',
	);


	const derivePlan =
		(): void => {
			try {
				const plan =
					context.getActionPlan(
						floodAlert.id,
					);

				setPlanText(
					`${plan.alert.id}:${plan.effectiveSeverity}`,
				);
			} catch (
				error
			) {
				setPlanText(
					error instanceof Error
						? `error:${error.message}`
						: 'error',
				);
			}
		};


	return (
		<View>
			<Text testID="status">
				{context.status}
			</Text>

			<Text testID="source">
				{context.source ?? 'none'}
			</Text>

			<Text testID="alerts">
				{context.applicableAlerts
					.map(
						(alert) =>
							alert.code,
					)
					.join(',')}
			</Text>

			<Text testID="severity">
				{context.simulationSeverity}
			</Text>

			<Text testID="action-context-loading">
				{String(
					context.isActionPlanContextLoading,
				)}
			</Text>

			<Text testID="plan">
				{planText}
			</Text>

			<Pressable
				testID="severity-two"
				onPress={() =>
					context.setSimulationSeverity(
						2,
					)
				}
			>
				<Text>
					Severity two
				</Text>
			</Pressable>

			<Pressable
				testID="derive-plan"
				onPress={derivePlan}
			>
				<Text>
					Derive plan
				</Text>
			</Pressable>

			<Pressable
				testID="refresh"
				onPress={() => {
					void context.refresh();
				}}
			>
				<Text>
					Refresh
				</Text>
			</Pressable>
		</View>
	);
}


async function renderProvider(
	now:
		() => string =
			() => AT,
) {
	return render(
		<AlertsActionPlanProvider
			now={now}
		>
			<ProviderConsumer />
		</AlertsActionPlanProvider>,
	);
}


function createDeferred<T>() {
	let resolve:
		(value: T) => void =
			() => undefined;

	let reject:
		(reason?: unknown) => void =
			() => undefined;


	const promise =
		new Promise<T>(
			(
				resolvePromise,
				rejectPromise,
			) => {
				resolve =
					resolvePromise;

				reject =
					rejectPromise;
			},
		);


	return {
		promise,
		resolve,
		reject,
	};
}


beforeEach(() => {
	jest.clearAllMocks();


	useActiveLocationMock.mockReturnValue({
		activeLocation:
			jeddahLocation,
		status:
			'ready',
		isLoading:
			false,
		confirmLocation:
			jest.fn(),
	} as ReturnType<
		typeof useActiveLocation
	>);


	useMissionProgressMock.mockReturnValue({
		progress: [
			completedProgress,
			incompleteProgress,
		],
		pendingTaskIds: [],
		status:
			'ready',
		isLoading:
			false,
		refresh:
			jest.fn()
				.mockResolvedValue(
					undefined,
				),
		setTaskCompletion:
			jest.fn()
				.mockResolvedValue(
					true,
				),
	} as ReturnType<
		typeof useMissionProgress
	>);


	useProfilePreferencesMock.mockReturnValue({
		profile,
		locations: [
			jeddahLocation,
			makkahRegion,
		],
		supportedLanguages: [],
		status:
			'ready',
		isLoading:
			false,
		refresh:
			jest.fn()
				.mockResolvedValue(
					undefined,
				),
		savePreferences:
			jest.fn()
				.mockResolvedValue(
					profile,
				),
	} as ReturnType<
		typeof useProfilePreferences
	>);


	loadAlertsActionFeatureMock
		.mockResolvedValue(
			remoteLoadResult,
		);


	getApplicableAlertsMock
		.mockReturnValue([
			floodAlert,
		]);


	deriveActionPlanForAlertMock
		.mockReturnValue(
			derivedPlan,
		);
});


describe(
	'AlertsActionPlanProvider',
	() => {
		test(
			'waits for active-location restoration before loading the alert catalogue',
			async () => {
				useActiveLocationMock.mockReturnValue({
					activeLocation:
						null,
					status:
						'loading',
					isLoading:
						true,
					confirmLocation:
						jest.fn(),
				} as ReturnType<
					typeof useActiveLocation
				>);


				await renderProvider();


				expect(
					screen.getByTestId(
						'status',
					).props.children,
				).toBe(
					'loading',
				);

				expect(
					loadAlertsActionFeatureMock,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'loads one catalogue and exposes location-applicable alerts with its remote source',
			async () => {
				await renderProvider();


				await waitFor(() => {
					expect(
						screen.getByTestId(
							'status',
						).props.children,
					).toBe(
						'ready',
					);
				});


				expect(
					screen.getByTestId(
						'source',
					).props.children,
				).toBe(
					'remote',
				);

				expect(
					screen.getByTestId(
						'alerts',
					).props.children,
				).toBe(
					floodAlert.code,
				);


				expect(
					getApplicableAlertsMock,
				).toHaveBeenCalledWith({
					catalogue,
					locationScopeIds: [
						JEDDAH_ID,
						MAKKAH_REGION_ID,
					],
					at:
						AT,
				});
			},
		);


		test(
			'exposes when the catalogue was recovered from SQLite',
			async () => {
				loadAlertsActionFeatureMock
					.mockResolvedValueOnce(
						cacheLoadResult,
					);


				await renderProvider();


				await waitFor(() => {
					expect(
						screen.getByTestId(
							'source',
						).props.children,
					).toBe(
						'cache',
					);
				});
			},
		);


		test(
			'defaults simulation severity to Level 3 and allows an explicit Level 2 selection',
			async () => {
				await renderProvider();


				await waitFor(() => {
					expect(
						screen.getByTestId(
							'status',
						).props.children,
					).toBe(
						'ready',
					);
				});


				expect(
					screen.getByTestId(
						'severity',
					).props.children,
				).toBe(
					3,
				);


				await fireEvent.press(
					screen.getByTestId(
						'severity-two',
					),
				);


				expect(
					screen.getByTestId(
						'severity',
					).props.children,
				).toBe(
					2,
				);
			},
		);


		test(
			'derives an Action Plan from current mission progress, household context and location scope',
			async () => {
				await renderProvider();


				await waitFor(() => {
					expect(
						screen.getByTestId(
							'status',
						).props.children,
					).toBe(
						'ready',
					);
				});


				await fireEvent.press(
					screen.getByTestId(
						'derive-plan',
					),
				);


				expect(
					deriveActionPlanForAlertMock,
				).toHaveBeenCalledWith({
					catalogue,
					alertId:
						floodAlert.id,
					locationScopeIds: [
						JEDDAH_ID,
						MAKKAH_REGION_ID,
					],
					activeLocationId:
						JEDDAH_ID,
					at:
						AT,
					simulationSeverity:
						3,
					completedTaskIds: [
						BACKUP_POWER_TASK_ID,
					],
					household: {
						childrenCount:
							2,
						olderAdultsCount:
							1,
					},
				});


				expect(
					screen.getByTestId(
						'plan',
					).props.children,
				).toBe(
					'101:3',
				);
			},
		);


		test(
			'keeps the alert feed ready but blocks personalised plan derivation while private context is still loading',
			async () => {
				useMissionProgressMock.mockReturnValue({
					progress: [],
					pendingTaskIds: [],
					status:
						'loading',
					isLoading:
						true,
					refresh:
						jest.fn(),
					setTaskCompletion:
						jest.fn(),
				} as ReturnType<
					typeof useMissionProgress
				>);


				await renderProvider();


				await waitFor(() => {
					expect(
						screen.getByTestId(
							'status',
						).props.children,
					).toBe(
						'ready',
					);
				});


				expect(
					screen.getByTestId(
						'action-context-loading',
					).props.children,
				).toBe(
					'true',
				);


				await fireEvent.press(
					screen.getByTestId(
						'derive-plan',
					),
				);


				expect(
					screen.getByTestId(
						'plan',
					).props.children,
				).toBe(
					'error:Action Plan context is still loading.',
				);

				expect(
					deriveActionPlanForAlertMock,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'uses conservative guest defaults while retaining the active location parent scope',
			async () => {
				useMissionProgressMock.mockReturnValue({
					progress: [],
					pendingTaskIds: [],
					status:
						'idle',
					isLoading:
						false,
					refresh:
						jest.fn(),
					setTaskCompletion:
						jest.fn(),
				} as ReturnType<
					typeof useMissionProgress
				>);

				useProfilePreferencesMock.mockReturnValue({
					profile:
						null,
					locations: [],
					supportedLanguages: [],
					status:
						'idle',
					isLoading:
						false,
					refresh:
						jest.fn(),
					savePreferences:
						jest.fn(),
				} as ReturnType<
					typeof useProfilePreferences
				>);


				await renderProvider();


				await waitFor(() => {
					expect(
						screen.getByTestId(
							'status',
						).props.children,
					).toBe(
						'ready',
					);
				});


				await fireEvent.press(
					screen.getByTestId(
						'derive-plan',
					),
				);


				expect(
					deriveActionPlanForAlertMock,
				).toHaveBeenCalledWith({
					catalogue,
					alertId:
						floodAlert.id,
					locationScopeIds: [
						JEDDAH_ID,
						MAKKAH_REGION_ID,
					],
					activeLocationId:
						JEDDAH_ID,
					at:
						AT,
					simulationSeverity:
						3,
					completedTaskIds: [],
					household:
						null,
				});
			},
		);


		test(
			'refreshes the catalogue source and uses a new deterministic applicability time',
			async () => {
				const now =
					jest.fn()
						.mockReturnValueOnce(
							AT,
						)
						.mockReturnValueOnce(
							LATER_AT,
						);

				loadAlertsActionFeatureMock
					.mockReset()
					.mockResolvedValueOnce(
						remoteLoadResult,
					)
					.mockResolvedValueOnce(
						cacheLoadResult,
					);


				await renderProvider(
					now,
				);


				await waitFor(() => {
					expect(
						screen.getByTestId(
							'source',
						).props.children,
					).toBe(
						'remote',
					);
				});


				await fireEvent.press(
					screen.getByTestId(
						'refresh',
					),
				);


				await waitFor(() => {
					expect(
						screen.getByTestId(
							'source',
						).props.children,
					).toBe(
						'cache',
					);
				});


				expect(
					loadAlertsActionFeatureMock,
				).toHaveBeenCalledTimes(
					2,
				);

				expect(
					getApplicableAlertsMock,
				).toHaveBeenLastCalledWith({
					catalogue,
					locationScopeIds: [
						JEDDAH_ID,
						MAKKAH_REGION_ID,
					],
					at:
						LATER_AT,
				});
			},
		);


		test(
			'ignores an older catalogue request that finishes after a newer refresh',
			async () => {
				const firstRequest =
					createDeferred<AlertsActionLoadResult>();


				loadAlertsActionFeatureMock
					.mockReset()
					.mockImplementationOnce(
						() =>
							firstRequest.promise,
					)
					.mockResolvedValueOnce(
						cacheLoadResult,
					);


				await renderProvider();


				expect(
					screen.getByTestId(
						'status',
					).props.children,
				).toBe(
					'loading',
				);


				await fireEvent.press(
					screen.getByTestId(
						'refresh',
					),
				);


				await waitFor(() => {
					expect(
						screen.getByTestId(
							'source',
						).props.children,
					).toBe(
						'cache',
					);
				});


				await act(
					async () => {
						firstRequest.resolve(
							remoteLoadResult,
						);

						await Promise.resolve();
					},
				);


				expect(
					screen.getByTestId(
						'source',
					).props.children,
				).toBe(
					'cache',
				);
			},
		);


		test(
			'exposes an error state and no stale alerts when catalogue loading has no remote or cache result',
			async () => {
				loadAlertsActionFeatureMock
					.mockRejectedValueOnce(
						new Error(
							'catalogue unavailable',
						),
					);


				await renderProvider();


				await waitFor(() => {
					expect(
						screen.getByTestId(
							'status',
						).props.children,
					).toBe(
						'error',
					);
				});


				expect(
					screen.getByTestId(
						'source',
					).props.children,
				).toBe(
					'none',
				);

				expect(
					screen.getByTestId(
						'alerts',
					).props.children,
				).toBe(
					'',
				);

				expect(
					getApplicableAlertsMock,
				).not.toHaveBeenCalled();
			},
		);
	},
);